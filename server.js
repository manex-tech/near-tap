import http from "node:http";
import { timingSafeEqual } from "node:crypto";

const PORT = Number(process.env.PORT || 8787);
const DEVICE_TOKEN = process.env.TAP_DEVICE_TOKEN || "";
const COOLDOWN_MS = 30_000;
let lastAcceptedAt = 0;
let eventCount = 0;

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
  return left.length === right.length && timingSafeEqual(left, right);
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    return send(res, 200, {
      name: "NEAR Tap",
      mode: "proof-of-presence-preview",
      onchain: false,
      eventCount
    });
  }

  if (req.method !== "POST" || req.url !== "/api/presence") {
    return send(res, 404, { error: "Not found" });
  }

  if (!DEVICE_TOKEN || !equalSecret(req.headers["x-tap-token"] || "", DEVICE_TOKEN)) {
    return send(res, 401, { error: "Unauthorized device" });
  }

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

  if (payload.deviceId !== "near-tap-esp32" || payload.event !== "presence") {
    return send(res, 400, { error: "Unexpected presence event" });
  }

  const now = Date.now();
  if (now - lastAcceptedAt < COOLDOWN_MS) {
    return send(res, 429, { error: "Cooldown active. Wait before checking in again." });
  }

  lastAcceptedAt = now;
  eventCount += 1;
  const record = {
    status: "recorded",
    network: "not-yet-onchain",
    event: "presence",
    deviceId: "near-tap-esp32",
    eventNumber: eventCount,
    recordedAt: new Date(now).toISOString()
  };
  console.log(JSON.stringify(record));
  return send(res, 200, record);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`NEAR Tap presence relay listening on port ${PORT}`);
  console.log("Preview mode only: events are logged in memory and are not yet written to NEAR.");
});
