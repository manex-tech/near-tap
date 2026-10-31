# NEAR Tap Architecture

## Overview

NEAR Tap connects a physical ESP32 interaction to an operator-reviewed attendance workflow and a NEAR testnet record.

## Data flow

```text
 ESP32-WROOM-32
      |
      | POST /api/presence
      | x-tap-token + event payload
      v
 Node.js relay
      |
      | Validates device token
      | Creates pending event in memory
      v
 Browser dashboard
      |
      | Operator enters participant name
      | POST /api/publish
      v
 Node.js relay
      |
      | Function call: record_presence
      v
 NEAR smart contract
      |
      | Stores event record and participant name
      v
 NEAR testnet
      |
      | Transaction hash
      v
 Dashboard / NEAR Explorer
```

## Components

### ESP32 firmware
The firmware connects to Wi-Fi, monitors the onboard BOOT button (GPIO 0), and sends a JSON presence event to the configured relay URL. It supplies the shared device token in the `x-tap-token` header. Configuration is held in the ignored local file `firmware/secrets.h`.

### Node.js relay
`server.js` exposes the dashboard and API routes. The device endpoint authenticates the shared token and creates a pending event. The publish endpoint validates the event ID and participant name, then calls the contract using a NEAR function-call key.

The pending-event map and recent-event list are process memory, not durable storage. They are cleared on restart.

### Dashboard
`index.html` presents relay status, pending check-ins, publishing controls, recent activity, and record verification. The operator supplies the participant name before a pending event is sent to the contract.

### NEAR contract
`contract/src/lib.rs` exposes:
- `record_presence(event_id, participant_name)`
- `get_presence(event_id)`
- `get_presence_name(event_id)`
- `total_records()`

The record stores the event ID, transaction predecessor account, and block timestamp. Participant names are stored under a separate storage key derived from the event ID.

## Trust boundaries and attribution

The shared device token authenticates possession of a configured secret; it does not provide hardware attestation. The operator-entered name is not independently authenticated. The contract's predecessor account is the account signing the NEAR transaction. In the demonstrated relay architecture, this is the relay account, not the device or attendee.

A successful contract transaction proves that the contract call was executed on NEAR. It does not prove that the named participant personally interacted with the ESP32 or was physically present.

## Network and configuration

The relay reads configuration from a local `.env` file. The firmware reads local Wi-Fi, relay URL, and token settings from `firmware/secrets.h`. Neither secrets file should be committed.

See the root README for setup instructions and `SECURITY.md` for current risks and mitigations.
