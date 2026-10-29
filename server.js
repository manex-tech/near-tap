import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { Account, JsonRpcProvider } from "near-api-js";
import { NEAR } from "near-api-js/tokens";

const PORT = Number(process.env.PORT || 8787);
const ACCOUNT_ID = process.env.NEAR_ACCOUNT_ID || "";
const PRIVATE_KEY = process.env.NEAR_PRIVATE_KEY || "";
const RECIPIENT_ID = process.env.NEAR_RECIPIENT_ID || "";
const DEVICE_TOKEN = process.env.TAP_DEVICE_TOKEN || "";
const COOLDOWN_MS = 30_000;
const TRANSFER_AMOUNT = "0.001";
const RPC_URL = "https://test.rpc.fastnear.com";

let lastAcceptedAt = 0;

function equalSecret(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

function send(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function configError() {
  if (!ACCOUNT_ID || !PRIVATE_KEY || !RECIPIENT_ID || !DEVICE_TOKEN) {
    return "Relay configuration is incomplete. Set the four required environment variables.";
  }
  if (!ACCOUNT_ID.endsWith(".testnet") || !RECIPIENT_ID.endsWith(".testnet")) {
    return "This prototype only permits .testnet accounts.";
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    return send(res, 200, {
      name: "NEAR Tap",
      network: "testnet",
      configured: !configError(),
      transferAmount: TRANSFER_AMOUNT
    });
  }

  if (req.method !== "POST" || req.url !== "/api/trigger") {
    return send(res, 404, { error: "Not found" });
  }

  if (!DEVICE_TOKEN || !equalSecret(req.headers["x-tap-token"] || "", DEVICE_TOKEN)) {
    return send(res, 401, { error: "Unauthorized device" });
  }

  const problem = configError();
  if (problem) return send(res, 503, { error: problem });

  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 2048) {
      return send(res, 413, { error: "Request too large" });
    }
  }

  let payload;
  try {
    payload = JSON.parse(body || "{}");
  } catch {
    return send(res, 400, { error: "Invalid JSON" });
  }

  if (payload.deviceId !== "near-tap-esp32") {
    return send(res, 400, { error: "Unexpected device ID" });
  }

  const now = Date.now();
  if (now - lastAcceptedAt < COOLDOWN_MS) {
    return send(res, 429, {
      error: "Cooldown active. Wait before triggering another transfer."
    });
  }

  // Reserve cooldown before awaiting RPC, preventing concurrent requests.
  lastAcceptedAt = now;

  try {
    const provider = new JsonRpcProvider({ url: RPC_URL });
    const account = new Account(ACCOUNT_ID, provider, PRIVATE_KEY);
    const result = await account.transfer({
      token: NEAR,
      amount: NEAR.toUnits(TRANSFER_AMOUNT),
      receiverId: RECIPIENT_ID
    });

    const transactionHash =
      result?.transaction?.hash ??
      result?.transaction_outcome?.id ??
      result?.transactionOutcome?.id ??
      null;

    return send(res, 200, {
      status: "submitted",
      network: "testnet",
      amount: TRANSFER_AMOUNT,
      receiverId: RECIPIENT_ID,
      transactionHash,
      explorerUrl: transactionHash
        ? `https://testnet.nearblocks.io/txns/${encodeURIComponent(transactionHash)}`
        : null
    });
  } catch (error) {
    console.error("NEAR testnet transfer failed:", error?.message || error);
    return send(res, 502, {
      error: "Transfer failed or result is uncertain. Check the testnet explorer before retrying."
    });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`NEAR Tap relay listening on port ${PORT}`);
  console.log("Network: NEAR testnet; fixed transfer: 0.001 NEAR");
});
