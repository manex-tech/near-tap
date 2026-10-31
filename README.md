# NEAR Tap: Proof of Presence

NEAR Tap is a hardware-powered proof-of-presence prototype. An ESP32 creates a check-in event, a Node.js relay validates the device request, and a NEAR smart contract is intended to anchor the event to NEAR testnet.

## Current implementation status

- ESP32 BOOT-button check-in: implemented
- Authenticated Node.js preview relay: implemented
- NEAR smart contract source: added, not yet compiled or deployed
- Relay-to-contract integration: not implemented yet
- Testnet transaction verification: pending

**Important:** The current relay is preview-only. It stores events in memory and does not write to NEAR. Do not describe a check-in as on-chain until a testnet transaction has been confirmed.

## Repository layout

- `server.js`: authenticated local preview relay
- `firmware/`: ESP32 firmware and example configuration
- `contract/Cargo.toml`: Rust contract package
- `contract/src/lib.rs`: NEAR smart contract source
- `.github/workflows/near-tap.yml`: JavaScript syntax check

## Hardware

- ESP32-WROOM-32 development board
- USB data cable
- Wi-Fi network
- Computer running Node.js to host the relay

The onboard BOOT button is the current check-in trigger. No additional sensors are required for the prototype.

## Run the preview relay

Install Node.js, then from the repository root:

```bash
npm install
```

Set a strong device token before starting the relay.

Windows Command Prompt:

```cmd
set "TAP_DEVICE_TOKEN=YOUR_RANDOM_DEVICE_TOKEN"
npm start
```

PowerShell:

```powershell
$env:TAP_DEVICE_TOKEN="YOUR_RANDOM_DEVICE_TOKEN"
npm start
```

The relay listens on port 8787 by default. Check its health at `http://localhost:8787/health`.

## Configure the ESP32

Copy `firmware/secrets.example.h` to `firmware/secrets.h` locally. Set your Wi-Fi credentials, relay URL, and the same device token used by the relay.

Set `TAP_RELAY_URL` to your computer's LAN address, for example:

```text
http://192.168.1.10:8787/api/presence
```

Do not use `localhost` as the ESP32 destination. Do not commit `secrets.h`, Wi-Fi passwords, or device tokens.

## Build the NEAR contract

The contract source is in `contract/`. With Rust and Cargo installed, enter that directory and run:

```bash
cargo check
```

This checks the Rust contract source. It does not produce a deployable NEAR WASM artifact or deploy the contract. We will add the NEAR build and test workflow after the source compiles successfully.

## Security and verification notes

- A button press demonstrates interaction with the device; by itself it does not prove a person's identity or physical location.
- The contract records the NEAR account that signs the transaction and the blockchain timestamp.
- The relay's shared device token authenticates a device to the preview relay; it is not a substitute for cryptographic hardware attestation.
- Never commit secrets or private keys.
- Do not claim an event is on-chain until its transaction is confirmed on NEAR testnet.

## Development milestones

1. Confirm ESP32-to-relay check-ins.
2. Compile and test the NEAR contract.
3. Deploy the contract to NEAR testnet.
4. Connect the relay or participant client to the contract securely.
5. Verify records through a public testnet explorer and a simple dashboard.
