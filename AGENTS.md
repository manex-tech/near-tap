# Repository Guide for AI Coding Agents

## Project
NEAR Tap is a hardware-triggered proof-of-presence prototype using an ESP32, a Node.js relay, a dashboard, and a NEAR Protocol smart contract.

## Read first
1. `README.md` for setup, workflow, and known limitations.
2. `docs/ARCHITECTURE.md` for component boundaries and data flow.
3. `SECURITY.md` for the threat model and current security gaps.
4. `docs/TESTING.md` for reproducible checks and manual verification.

## Repository map
- `firmware/src/main.cpp`: ESP32 BOOT-button and Wi-Fi HTTP client.
- `firmware/secrets.example.h`: configuration template; never put real credentials here.
- `server.js`: Node.js HTTP relay, pending queue, dashboard API, and NEAR calls.
- `index.html`: browser dashboard.
- `contract/src/lib.rs`: NEAR smart contract.
- `contract/`: Rust contract project and build configuration.
- `README.md`: project overview and setup.

## Actual workflow
1. ESP32 sends `POST /api/presence` with `x-tap-token`.
2. Relay validates the shared token and creates an in-memory pending event.
3. Operator supplies a participant name through the dashboard.
4. Dashboard calls `POST /api/publish`.
5. Relay invokes contract method `record_presence(event_id, participant_name)`.
6. Dashboard can query `get_presence` and `get_presence_name`, and link to the NEAR testnet transaction.

A device check-in is pending until the operator publishes it. Do not describe the initial ESP32 request as an on-chain transaction.

## Review and change guidance
- Trace behavior through firmware, relay, dashboard, and contract before changing a workflow.
- Preserve the distinction between pending events and confirmed on-chain records.
- Do not claim that a button press proves identity or physical location.
- The contract predecessor identifies the transaction signer (the relay account in the demonstrated setup), not the ESP32 or attendee.
- Participant names written to the contract are public, persistent blockchain data.
- Do not claim production readiness. Consult `SECURITY.md` before making security claims.
- Do not invent test results, deployment status, transaction hashes, or features.
- Keep secrets out of tracked files. Never request or print seed phrases, private keys, Wi-Fi passwords, or device tokens.
- Keep documentation consistent with implemented code. Label proposed work as planned.

## Checks
- JavaScript syntax: `npm run check`
- Contract unit tests: run `cargo test` from `contract/` when the Rust toolchain and dependencies are available.
- Manual hardware-to-chain verification: follow `docs/TESTING.md`.

If a check cannot be run in the current environment, say so explicitly rather than reporting it as passed.
