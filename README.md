# NEAR Tap: Proof of Presence

NEAR Tap is a hardware-powered event check-in prototype. An ESP32 sends a device-authenticated check-in to a Node.js relay. The relay submits a transaction to a NEAR smart contract, which stores a unique event ID, the signing account, and the NEAR block timestamp.

## Current implementation

- ESP32 BOOT-button check-in: implemented
- Authenticated Node.js relay: implemented
- NEAR smart contract: deployed and initialised on NEAR testnet
- Relay-to-contract transaction submission: verified with a successful ESP32-triggered NEAR testnet transaction
- Live dashboard: implemented at the relay root URL
- On-chain event verification: implemented through the contract's `get_presence` view method
- Public testnet record lookup: available through the contract's `get_presence` view method

A check-in is only reported as successful after the relay receives a successful NEAR transaction result. The response includes the transaction hash and testnet explorer URL.

## Repository layout

- `server.js`: authenticated relay and NEAR transaction submission
- `package.json`: Node.js dependencies and scripts
- `firmware/`: ESP32 firmware and example configuration
- `contract/Cargo.toml`: Rust contract package
- `contract/src/lib.rs`: NEAR smart contract source
- `.github/workflows/near-tap.yml`: automated Node.js and contract checks

## Requirements

- Node.js 22 or newer
- ESP32-WROOM-32 development board
- Wi-Fi network
- NEAR testnet account with a function-call access key restricted to the contract's `record_presence` method

## Configure the relay

From the repository root, install dependencies:

```powershell
npm install
```

Create a local `.env` file in the repository root. Do not commit this file.

```env
PORT=8787
TAP_DEVICE_TOKEN=replace_with_your_device_token
NEAR_NETWORK=testnet
NEAR_ACCOUNT_ID=manextech.testnet
NEAR_CONTRACT_ID=manextech.testnet
NEAR_PRIVATE_KEY=replace_with_your_restricted_function_call_private_key
NEAR_RPC_URL=https://rpc.testnet.near.org
```

Use a function-call access key restricted to the deployed contract account and the `record_presence` method. Do not use a full-access key for the relay. Keep the private key, device token, Wi-Fi credentials, and `.env` file out of GitHub.

Start the relay:

```powershell
npm start
```

The relay listens on port 8787 by default. Check `http://localhost:8787/health`. A healthy response should report `onchain: true` and `network: "testnet"`.

## Configure the ESP32

Copy `firmware/secrets.example.h` to `firmware/secrets.h` locally. Set your Wi-Fi credentials, relay URL, and the same device token configured in `.env`.

Set the relay URL to your computer's LAN address, for example:

```text
http://192.168.1.10:8787/api/presence
```

Do not use `localhost` as the ESP32 destination. The computer and ESP32 must be able to reach each other over the local network. Do not commit `secrets.h`.

## Dashboard and verification

Start the relay with `npm start`, then open `http://localhost:8787` in a browser. The dashboard reads the contract's `total_records` value, shows recent check-ins observed during the current relay session, and verifies an event ID directly against `get_presence` on NEAR testnet.

Recent activity is held in relay memory and resets when the process restarts. The contract currently supports lookup by event ID but does not expose a method to enumerate all records. The dashboard therefore does not claim to show a complete historical activity feed.

## Contract methods

- `record_presence(event_id)`: records a unique event ID, the predecessor account ID, and the block timestamp.
- `get_presence(event_id)`: returns a stored record.
- `total_records()`: returns the total number of records.

## Security and trust limitations

- The relay's device token authenticates the ESP32 request to the relay. It is not hardware attestation.
- A button press proves interaction with the device, not a person's identity or physical location.
- The contract records the NEAR account that signs the transaction. It does not independently verify who operated the ESP32.
- The contract method is publicly callable. The restricted relay key limits the relay credential, but does not prevent other accounts from calling the public contract method.
- The current cooldown is in relay memory and resets when the relay restarts.
- Never commit secrets or private keys. Rotate any credential that has been exposed.

## Verification

After a successful check-in, copy the returned transaction hash and open its testnet explorer URL. The relay's response must contain `onchain: true` and a transaction hash before treating the check-in as anchored on NEAR.
