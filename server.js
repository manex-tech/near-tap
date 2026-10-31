import "dotenv/config";
import http from "node:http";
import { readFile } from "node:fs/promises";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { connect, keyStores, KeyPair } from "near-api-js";

const PORT = Number(process.env.PORT || 8787);
const DEVICE_TOKEN = process.env.TAP_DEVICE_TOKEN || "";
const NETWORK_ID = process.env.NEAR_NETWORK || "testnet";
const ACCOUNT_ID = process.env.NEAR_ACCOUNT_ID || "";
const CONTRACT_ID = process.env.NEAR_CONTRACT_ID || "";
const PRIVATE_KEY = process.env.NEAR_PRIVATE_KEY || "";
const RPC_URL = process.env.NEAR_RPC_URL || "https://rpc.testnet.near.org";
const COOLDOWN_MS = 30_000;
const GAS = BigInt("100000000000000");
const recentEvents = [];
const pendingEvents = new Map();
let lastAcceptedAt = 0;
let eventCount = 0;
let requestInFlight = false;
let nearAccount;

function send(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function equalSecret(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length > 0 && left.length === right.length && timingSafeEqual(left, right);
}

async function initialiseNear() {
  if (NETWORK_ID !== "testnet") throw new Error("This prototype is configured for NEAR testnet only.");
  if (!DEVICE_TOKEN || !ACCOUNT_ID || !CONTRACT_ID || !PRIVATE_KEY) throw new Error("Missing required environment configuration. Check .env.");
  const keyStore = new keyStores.InMemoryKeyStore();
  await keyStore.setKey(NETWORK_ID, ACCOUNT_ID, KeyPair.fromString(PRIVATE_KEY));
  const near = await connect({ networkId: NETWORK_ID, nodeUrl: RPC_URL, keyStore });
  nearAccount = await near.account(ACCOUNT_ID);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/") {
    try {
      const page = await readFile(new URL("./index.html", import.meta.url));
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      return res.end(page);
    } catch {
      return send(res, 500, { error: "Dashboard file could not be loaded." });
    }
  }

  if (req.method === "GET" && url.pathname === "/health") {
    return send(res, 200, {
      name: "NEAR Tap", mode: "near-testnet", onchain: Boolean(nearAccount),
      network: NETWORK_ID, contractId: CONTRACT_ID, eventCount
    });
  }

  if (req.method === "GET" && url.pathname === "/api/dashboard") {
    if (!nearAccount) return send(res, 503, { error: "NEAR relay is not initialised." });
    try {
      const totalRecords = await nearAccount.viewFunction({
        contractId: CONTRACT_ID, methodName: "total_records", args: {}
      });
      return send(res, 200, {
        relayReady: true, network: NETWORK_ID, contractId: CONTRACT_ID,
        totalRecords: Number(totalRecords), recent: recentEvents,
        pending: [...pendingEvents.values()]
      });
    } catch (error) {
      console.error("Dashboard query failed:", error?.message || error);
      return send(res, 502, { error: "Could not read dashboard data from NEAR." });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/verify") {
    const eventId = (url.searchParams.get("eventId") || "").trim();
    if (!eventId || eventId.length > 128) return send(res, 400, { error: "Enter a valid event ID." });
    if (!nearAccount) return send(res, 503, { error: "NEAR relay is not initialised." });
    try {
      const record = await nearAccount.viewFunction({
        contractId: CONTRACT_ID, methodName: "get_presence", args: { event_id: eventId }
      });
      const participantName = record ? await nearAccount.viewFunction({ contractId: CONTRACT_ID, methodName: "get_presence_name", args: { event_id: eventId } }) : null;
      return send(res, 200, { found: Boolean(record), record: record || null, participantName: participantName || null });
    } catch (error) {
      console.error("Record verification failed:", error?.message || error);
      return send(res, 502, { error: "Could not verify this record on NEAR testnet." });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/publish") {
    if (!nearAccount) return send(res, 503, { error: "NEAR relay is not initialised." });
    if (requestInFlight) return send(res, 429, { error: "A transaction is already being submitted." });
    let raw = "";
    try {
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 2048) return send(res, 413, { error: "Request too large." });
      }
    } catch { return send(res, 400, { error: "Could not read request body." }); }
    let data;
    try { data = JSON.parse(raw || "{}"); }
    catch { return send(res, 400, { error: "Invalid JSON." }); }
    const eventId = String(data.eventId || "").trim();
    const participantName = String(data.participantName || "").trim();
    if (!eventId || eventId.length > 128) return send(res, 400, { error: "Invalid event ID." });
    if (!participantName || participantName.length > 80) return send(res, 400, { error: "Enter a name of 1 to 80 characters." });
    if (!pendingEvents.has(eventId)) return send(res, 404, { error: "This check-in is no longer pending. Refresh the dashboard." });
    requestInFlight = true;
    try {
      const result = await nearAccount.functionCall({
        contractId: CONTRACT_ID, methodName: "record_presence",
        args: { event_id: eventId, participant_name: participantName },
        gas: GAS, attachedDeposit: BigInt(0)
      });
      const pending = pendingEvents.get(eventId);
      pendingEvents.delete(eventId);
      eventCount += 1;
      const record = {
        status: "recorded", network: NETWORK_ID, onchain: true,
        event: "presence", deviceId: "near-tap-esp32", eventId, participantName,
        eventNumber: eventCount, transactionHash: result.transaction.hash,
        explorerUrl: `https://explorer.testnet.near.org/transactions/${result.transaction.hash}`,
        recordedAt: new Date().toISOString(), detectedAt: pending.detectedAt
      };
      recentEvents.unshift(record);
      if (recentEvents.length > 8) recentEvents.pop();
      console.log(JSON.stringify(record));
      return send(res, 200, record);
    } catch (error) {
      console.error("NEAR publish failed:", error?.message || error);
      return send(res, 502, { error: "NEAR did not confirm this attendance record. It remains pending; you can retry." });
    } finally { requestInFlight = false; }
  }

  if (req.method !== "POST" || url.pathname !== "/api/presence") {
    return send(res, 404, { error: "Not found" });
  }
  if (!equalSecret(req.headers["x-tap-token"] || "", DEVICE_TOKEN)) return send(res, 401, { error: "Unauthorized device" });
  if (!nearAccount) return send(res, 503, { error: "NEAR relay is not initialised." });
  if (requestInFlight) return send(res, 429, { error: "A check-in is already being submitted." });

  let body = "";
  try {
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 2048) return send(res, 413, { error: "Request too large" });
    }
  } catch {
    return send(res, 400, { error: "Could not read request body." });
  }

  let payload;
  try { payload = JSON.parse(body || "{}"); }
  catch { return send(res, 400, { error: "Invalid JSON" }); }

  if (payload.deviceId !== "near-tap-esp32" || payload.event !== "presence") {
    return send(res, 400, { error: "Unexpected presence event" });
  }
  const now = Date.now();
  if (now - lastAcceptedAt < COOLDOWN_MS) return send(res, 429, { error: "Cooldown active. Wait before checking in again." });
  if (pendingEvents.size >= 10) return send(res, 429, { error: "Pending attendance queue is full. Publish or clear a pending check-in first." });
  lastAcceptedAt = now;
  const eventId = randomUUID();
  const pending = { eventId, detectedAt: new Date(now).toISOString(), status: "pending" };
  pendingEvents.set(eventId, pending);
  console.log("Physical check-in awaiting participant name:", eventId);
  return send(res, 202, { status: "pending", onchain: false, ...pending, message: "Check-in received. Add the participant name on the dashboard before publishing to NEAR." });

});

initialiseNear()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`NEAR Tap relay listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("NEAR relay initialisation failed:", error?.message || error);
    process.exitCode = 1;
  });
