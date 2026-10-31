# Testing and Verification Guide

This guide distinguishes automated checks, contract unit tests, relay checks, and the full hardware-to-chain demonstration. A successful syntax check alone does not prove the complete system works.

## 1. JavaScript syntax check

From the repository root:

```bash
npm install
npm run check
```

**Expected result:** Node.js exits without a syntax error for `server.js`.

This is a syntax check only. It does not exercise HTTP routes, NEAR RPC calls, the dashboard, or the ESP32.

## 2. Smart contract unit tests

With Rust and the contract's declared dependencies installed:

```bash
cd contract
cargo test
```

**Expected result:** the contract test suite completes successfully. The current test suite covers the cases implemented in `contract/src/lib.rs`. Consult the test names in that file for the exact coverage; do not infer coverage from this guide.

If the Rust toolchain or dependencies are unavailable, record the test as not run. Do not report it as passing.

## 3. Continuous integration

GitHub Actions runs the repository workflow in `.github/workflows/near-tap.yml` on pushes, pull requests, and manual dispatch. It checks the Node.js relay syntax, runs the Rust contract unit tests, checks the WebAssembly target, builds the release Wasm artifact, and uploads that artifact.

Review the Actions run for the commit being evaluated. The presence of a workflow file alone is not evidence that a run passed.

## 4. Relay and dashboard smoke test

1. Configure a local `.env` using the root README.
2. Start the relay with `npm start`.
3. Open `http://localhost:8787`.
4. Request `http://localhost:8787/health`.

**Expected result:** the dashboard loads, and the health endpoint returns JSON identifying NEAR Tap and its configured network and contract. A healthy HTTP response does not by itself prove that a transaction can be submitted.

## 5. Device authentication check

With the relay running, send a request to `POST /api/presence` without the correct `x-tap-token`.

**Expected result:** the relay responds with HTTP 401 and an unauthorized-device error.

Then send the expected JSON payload with the configured token:

```json
{
  "deviceId": "near-tap-esp32",
  "event": "presence"
}
```

**Expected result:** the relay responds with HTTP 202 and a pending event ID. This creates a pending event only; it does not submit a blockchain transaction.

## 6. Operator authentication check

Send `GET /api/dashboard` without the `x-operator-secret` header.

**Expected result:** HTTP 401. Repeat with the configured operator secret in the `x-operator-secret` header.

**Expected result:** the dashboard data endpoint responds successfully when the relay is initialised. The dashboard sends the operator secret with each protected API request; the old `/api/session` check is not an authentication session.

## 7. Full hardware-to-chain demonstration

Prerequisites: ESP32 firmware configured with the same device token, the relay reachable over the local network, a configured NEAR testnet account, a restricted function-call key with sufficient allowance, and the contract deployed and initialized.

1. Start the relay.
2. Open the dashboard and provide the operator secret when prompted.
3. Press the ESP32 BOOT button once.
4. Confirm a pending event appears.
5. Enter a participant name in the dashboard.
6. Select the publish action.
7. Wait for the relay to report successful transaction confirmation.
8. Open the returned NEAR testnet Explorer transaction link.
9. Use the dashboard verification field with the event ID to query the contract record and name.

**Expected result:** the pending event becomes a published record only after NEAR confirms the contract call. The transaction should be inspectable on NEAR Explorer, and the contract lookup should return the event record and participant name.

## 8. Manual acceptance checklist

| Scenario | Expected behavior |
|---|---|
| Missing or incorrect device token | HTTP 401; no pending event created |
| Unexpected device ID or event type | HTTP 400 |
| Valid device request | HTTP 202; pending event created |
| Request during cooldown | HTTP 429 |
| Pending queue at capacity | HTTP 429 |
| Missing or incorrect operator secret on protected routes | HTTP 401 |
| Valid operator secret on protected routes | Request proceeds to route handling |
| Empty or overlong participant name | HTTP 400 |
| Event ID not in pending queue | HTTP 404 |
| NEAR transaction succeeds | Published record and transaction hash returned |
| NEAR transaction fails | Error returned; pending item remains available for retry |
| Existing event ID submitted directly to contract again | Contract rejects duplicate event ID |
| Existing on-chain event queried | Contract returns stored record |

## 9. Evidence to attach to a submission

For a reproducible judging review, provide:
- A short video showing the ESP32 button press, pending dashboard event, operator name entry, successful publication, and Explorer transaction.
- A real successful testnet transaction URL.
- The event ID used for the corresponding contract lookup.
- The exact commands and environment prerequisites used for the demo.

Never include `.env`, private keys, seed phrases, Wi-Fi passwords, or device tokens in evidence.

## Important interpretation

A successful transaction proves that a NEAR account submitted a successful contract call. In this architecture the relay account signs the transaction. The transaction does not independently prove the participant's identity or physical presence.
