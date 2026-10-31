# NEAR Tap: Proof of Presence

NEAR Tap is an ESP32-powered attendance prototype that turns a physical check-in into a publicly verifiable record on **NEAR Protocol**.

At the check-in point, an ESP32 sends a device-authenticated event to a Node.js relay. An operator reviews the pending event, enters the participant's name, and explicitly publishes it to a NEAR smart contract. The contract stores the event ID and participant name on-chain, while the dashboard provides a transaction link for independent verification.

> **Prototype status:** NEAR Tap is a testnet demonstration, not a production attendance or identity-verification system.

## How attendance works

1. A participant presses the BOOT button on the ESP32 at the check-in point.
2. The ESP32 sends a check-in request to the relay using a shared device token.
3. The relay validates the token and creates a pending event. **No blockchain transaction is sent at this stage.**
4. An operator opens the dashboard, reviews the pending event, and enters the participant's name.
5. The operator selects **Publish to NEAR**.
6. The relay calls the NEAR smart contract with the event ID and participant name.
7. After NEAR confirms the transaction, the dashboard displays the published record and its testnet explorer link.

Participant names are stored in NEAR contract storage and can be retrieved with `get_presence_name(event_id)`. They are public blockchain data. Do not enter sensitive personal information, and obtain appropriate notice and consent before recording names.

## Features

- ESP32 BOOT-button check-in over Wi-Fi
- Shared-token authentication between the device and relay
- Pending check-in queue for operator review
- Dashboard workflow for entering a participant name and publishing attendance
- NEAR smart contract storage for event IDs and participant names
- On-chain record lookup by event ID
- Transaction hash and NEAR testnet explorer link after successful publication
- Responsive dashboard for monitoring and verification

## Architecture

```text
ESP32 device
    |
    | HTTPS/HTTP request + device token
    v
Node.js relay
    |
    | Pending event
    v
Operator dashboard
    |
    | Participant name + Publish
    v
NEAR smart contract
    |
    | On-chain record
    v
Dashboard verification
```

The relay uses a NEAR function-call access key to submit contract calls. The contract records the NEAR account that signed the transaction. In this setup, that is the relay account, not the ESP32 or the participant.

## Current implementation status

| Component | Status |
|---|---|
| ESP32 check-in firmware | Implemented |
| Device-token validation in relay | Implemented |
| Pending event queue | Implemented in relay memory |
| Participant name entry in dashboard | Implemented |
| Operator-triggered publish workflow | Implemented in source |
| Contract storage for participant names | Implemented in contract source |
| Record and name lookup | Implemented in contract source and relay |
| Dashboard transaction confirmation | Implemented in source |

**Deployment note:** The currently deployed NEAR testnet contract may still be the earlier version without participant-name support. Deploy the updated contract WASM before using the new name-and-publish workflow. Deploy the updated WASM to the existing contract account without calling the initializer again. The existing contract state should be preserved; do not reinitialize the contract.

Older records remain readable through `get_presence(event_id)`. They will not have participant names, so `get_presence_name(event_id)` returns no name for those records.

## Requirements

- Node.js 22 or newer
- An ESP32-WROOM-32 development board
- A Wi-Fi network accessible to both the ESP32 and the computer running the relay
- A NEAR testnet account
- A NEAR function-call access key scoped to the contract account and the `record_presence` method

## Run the relay

Clone the repository and install dependencies from the project root:

```powershell
git clone https://github.com/manex-tech/near-tap.git
cd near-tap
npm install
```

Create a local `.env` file in the project root. Do not commit this file.

```env
PORT=8787
TAP_DEVICE_TOKEN=replace_with_a_long_random_device_token
NEAR_NETWORK=testnet
NEAR_ACCOUNT_ID=your_testnet_account.testnet
NEAR_CONTRACT_ID=your_contract_account.testnet
NEAR_PRIVATE_KEY=your_restricted_function_call_private_key
NEAR_RPC_URL=https://rpc.testnet.near.org
```

Use a restricted function-call key that can call only `record_presence` on the intended contract. Keep the private key and device token secret. Never place them in source files committed to GitHub.

Check the relay source and start it:

```powershell
npm run check
npm start
```

Open [http://localhost:8787](http://localhost:8787) on the computer running the relay.

The dashboard and API are served by the Node.js process. The pending queue and recent activity are currently held in memory and are cleared when the relay restarts.

## Configure the ESP32

1. Copy `firmware/secrets.example.h` to `firmware/secrets.h`.
2. Set your Wi-Fi SSID and password.
3. Set `TAP_DEVICE_TOKEN` to the same random token configured as `TAP_DEVICE_TOKEN` in the relay's `.env` file.
4. Set `TAP_RELAY_URL` to the relay computer's LAN IP address and port, for example `http://192.168.1.100:8787/api/presence`.
5. Build and upload the firmware using the project's configured ESP32 toolchain.

Do not use `localhost` as the relay host in the ESP32 configuration. On the ESP32, `localhost` refers to the ESP32 itself, not the computer running the relay.

Keep `firmware/secrets.h` private. It contains Wi-Fi credentials and the device token and must not be committed.

## Smart contract interface

| Method | Purpose |
|---|---|
| `record_presence(event_id, participant_name)` | Records a unique event, participant name, predecessor account, and block timestamp. |
| `get_presence(event_id)` | Returns the attendance record for an event ID. |
| `get_presence_name(event_id)` | Returns the participant name associated with an event ID, or no value if none is stored. |
| `total_records()` | Returns the total number of records. |

The contract records the transaction predecessor account. Because the relay submits the transaction, the predecessor is the relay's NEAR account.

## Trust, security, and privacy limitations

NEAR Tap demonstrates a hardware-triggered attendance workflow. It does **not** independently establish a participant's identity or prove that a named person was physically present.

- **A button press is not identity verification.** It proves only that someone interacted with the device.
- **A typed name is an operator-entered label.** The contract does not verify that the name belongs to the person who pressed the button.
- **The relay signs the transaction.** The on-chain predecessor account identifies the relay account, not the ESP32 or participant.
- **The contract is publicly callable.** Restricting the relay's function-call key limits that key; it does not prevent other accounts from calling a public contract method.
- **The queue is temporary.** Pending events and recent activity are stored in relay memory and are lost when the relay restarts.
- **The publish route needs operator access control.** The current prototype does not provide production-grade operator authentication or event-level permissions. Do not expose it publicly without adding these controls.
- **Names are public and persistent.** Anyone may be able to read on-chain names, and blockchain data should not be treated as confidential or reliably erasable.

Before production use, add operator authentication, event-specific authorization and expiry, durable queue storage, stronger device authentication, abuse controls, and a privacy-conscious participant consent process. Consider NFC or another appropriate verification factor if the use case requires stronger evidence than a button press.

## Verify an attendance record

After a successful publication:

1. Copy the event ID from the dashboard.
2. Enter it in the dashboard's **Verify record** field.
3. The relay queries NEAR testnet for the record and its participant name.
4. Open the transaction link to inspect the transaction on the NEAR testnet explorer.

A record should be described as published only after the transaction has succeeded on NEAR. A pending event is not yet an on-chain attendance record.

## Project

- Repository: [manex-tech/near-tap](https://github.com/manex-tech/near-tap)
- Network: NEAR testnet
- Purpose: IoT-powered, blockchain-based proof-of-presence prototype
