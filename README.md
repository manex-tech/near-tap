# NEAR Tap: Proof of Presence

NEAR Tap is a hardware-powered attendance prototype. An ESP32 sends a device-authenticated check-in to a Node.js relay. The operator adds the participant's name in the dashboard and explicitly publishes the attendance record to a NEAR smart contract.

## Attendance workflow

1. A participant presses the ESP32 BOOT button at the check-in point.
2. The authenticated relay creates a pending event. No blockchain transaction is sent yet.
3. An operator enters the participant's name in the dashboard.
4. The operator selects **Publish to NEAR**.
5. The relay submits the event ID and participant name to the smart contract.
6. The dashboard confirms only after NEAR returns a successful transaction, with an explorer link.

Participant names are stored on-chain in NEAR contract storage and can be retrieved using `get_presence_name(event_id)`. Names are public blockchain data. Do not use sensitive personal information or collect names without appropriate notice and consent.

## Current implementation

- ESP32 BOOT-button check-in: implemented
- Device-token authenticated Node.js relay: implemented
- Pending attendance queue: implemented in relay memory
- Operator name entry and publish action: implemented in dashboard
- NEAR smart contract name storage and lookup: implemented in source
- On-chain verification of event ID, participant name, signing account and block timestamp: implemented in relay
- Light responsive dashboard: implemented

The currently deployed testnet contract predates participant-name support. Deploy the updated WASM before using the new publish workflow. Existing on-chain records remain readable, but naturally have no participant name.

## Requirements

- Node.js 22 or newer
- ESP32-WROOM-32 development board
- Wi-Fi network
- NEAR testnet account with a function-call access key restricted to `record_presence`

## Configure the relay

Install dependencies from the repository root:

```powershell
npm install
```

Create a local `.env` file. Do not commit it.

```env
PORT=8787
TAP_DEVICE_TOKEN=replace_with_your_device_token
NEAR_NETWORK=testnet
NEAR_ACCOUNT_ID=manextech.testnet
NEAR_CONTRACT_ID=manextech.testnet
NEAR_PRIVATE_KEY=replace_with_your_restricted_function_call_private_key
NEAR_RPC_URL=https://rpc.testnet.near.org
```

The relay key must be restricted to the contract account and `record_presence` method. Keep private keys, device tokens and Wi-Fi credentials out of GitHub.

Start the relay:

```powershell
npm start
```

Open `http://localhost:8787`.

## Configure the ESP32

Copy `firmware/secrets.example.h` to `firmware/secrets.h` locally. Set the Wi-Fi credentials, relay URL and same device token as the relay. Use the computer's LAN IP in the ESP32 URL, not `localhost`.

## Contract methods

- `record_presence(event_id, participant_name)`: stores the unique event, participant name, transaction predecessor and block timestamp.
- `get_presence(event_id)`: returns the event record.
- `get_presence_name(event_id)`: returns the participant name, or `null` for older records.
- `total_records()`: returns the number of records.

## Important trust and privacy limitations

- A typed name is an operator-entered label, not cryptographic identity verification.
- A button press proves interaction with the device, not the participant's physical identity or location.
- The contract records the NEAR account signing the transaction. In this relay architecture that is the relay account, not the ESP32 or participant.
- Contract calls are public. The restricted relay key does not prevent other accounts from calling the contract.
- Pending events and recent activity are held in relay memory and are lost when the relay restarts.
- The publish endpoint is intended for a controlled local demo, not public internet deployment. Add operator authentication and event-level permissions before production use.
- On-chain names are publicly readable and cannot be treated as confidential or reliably erased.

## Verification

Use the dashboard's **Verify record** field to query a published event ID. The relay reads the record and participant name directly from NEAR testnet. Each successful publish includes a transaction hash and testnet explorer URL.
