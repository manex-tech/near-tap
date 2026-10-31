import "dotenv/config";
import http from "node:http";
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
  if (NETWORK_ID !== "testnet") {
    throw new Error("This prototype is configured for NEAR testnet only.");
  }
  if (!DEVICE_TOKEN || !ACCOUNT_ID || !CONTRACT_ID || !PRIVATE_KEY) {
    throw new Error("Missing required environment configuration. Check .env.");
  }

  const keyStore = new keyStores.InMemoryKeyStore();
  await keyStore.setKey(NETWORK_ID, ACCOUNT_ID, KeyPair.fromString(PRIVATE_KEY));

  const near = await connect({
    networkId: NETWORK_ID,
    nodeUrl: RPC_URL,
    keyStore
  });
  nearAccount = await near.account(ACCOUNT_ID);
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    return send(res, 200, {
      name: "NEAR Tap",
      mode: "near-testnet",
      onchain: Boolean(nearAccount),
      network: NETWORK_ID,
      contractId: CONTRACT_ID,
      eventCount
    });
  }

  if (req.method !== "POST" || req.url !== "/api/presence") {
    return send(res, 404, { error: "Not found" });
  }

  if (!equalSecret(req.headers["x-tap-token"] || "", DEVICE_TOKEN)) {
    return send(res, 401, { error: "Unauthorized device" });
  }

  if (!nearAccount) {
    return send(res, 503, { error: "NEAR relay is not initialised." });
  }

  if (requestInFlight) {
    return send(res, 429, { error: "A check-in is already being submitted." });
  }

  let body = "";
  try {
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 2048) {
        return send(res, 413, { error: "Request too large" });
      }
    }
  } catch {
    return send(res, 400, { error: "Could not read request body." });
  }

  let payload;
  try {
    payload = JSON.parse(body || "{}");
  } catch {
    return send(res, 400, { error: "Invalid JSON" });
  }

  if (payload.deviceId !== "near-tap-esp32" || payload.event !== "presence") {
    return send(res, 400, { error: "Unexpected presence event" });
  }

  const now = Date.now();
  if (now - lastAcceptedAt < COOLDOWN_MS) {
    return send(res, 429, { error: "Cooldown active. Wait before checking in again." });
  }

  requestInFlight = true;
  const eventId = randomUUID();
  try {
    const result = await nearAccount.functionCall({
      contractId: CONTRACT_ID,
      methodName: "record_presence",
      args: { event_id: eventId },
      gas: GAS,
      attachedDeposit: BigInt(0)
    });

    lastAcceptedAt = Date.now();
    eventCount += 1;
    const record = {
      status: "recorded",
      network: NETWORK_ID,
      onchain: true,
      event: "presence",
      deviceId: "near-tap-esp32",
      eventId,
      eventNumber: eventCount,
      transactionHash: result.transaction.hash,
      explorerUrl: `https://explorer.testnet.near.org/transactions/${result.transaction.hash}`,
      recordedAt: new Date(lastAcceptedAt).toISOString()
    };
    console.log(JSON.stringify(record));
    return send(res, 200, record);
  } catch (error) {
    console.error("NEAR transaction failed:", error?.message || error);
    return send(res, 502, {
      error: "The presence event could not be confirmed on NEAR testnet. No successful check-in was reported."
    });
  } finally {
    requestInFlight = false;
  }
});

initialiseNear()
  .then(() => {
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`NEAR Tap relay listening on port ${PORT}`);
      console.log(`Submitting record_presence transactions to ${CONTRACT_ID} on ${NETWORK_ID}.`);
    });
  })
  .catch((error) => {
    console.error("NEAR Tap startup failed:", error.message);
    process.exitCode = 1;
  });
