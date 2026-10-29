# NEAR Tap

A minimal ESP32 button-triggered NEAR **testnet** transfer prototype.

Press the ESP32's onboard BOOT button. The board sends an authenticated request to a Node.js relay, which submits a fixed-size testnet transfer to a configured `.testnet` account.

## Safety and scope

- Testnet only. This is not for mainnet or real funds.
- The recipient and amount are configured on the relay, not supplied by the ESP32.
- Keep the NEAR private key on the relay host. Never put it in firmware or commit it to GitHub.
- The relay requires a shared device token and applies a cooldown to reduce accidental repeated transfers.
- Verify the transaction hash on the NEAR testnet explorer before claiming payment success.
- This first version does not deploy a smart contract. It demonstrates a real NEAR testnet transfer triggered by physical hardware.

## Repository layout

- `server.js`: authenticated Node.js relay using `near-api-js`
- `firmware/`: ESP32 firmware for PlatformIO
- `.github/workflows/near-tap.yml`: automated syntax checks

## Configuration

Set these environment variables on the machine hosting the relay:

- `NEAR_ACCOUNT_ID`: funded NEAR testnet account, e.g. `yourname.testnet`
- `NEAR_PRIVATE_KEY`: private key for that testnet account, format `ed25519:...`
- `NEAR_RECIPIENT_ID`: destination account ending in `.testnet`
- `TAP_DEVICE_TOKEN`: long random secret shared with the ESP32 firmware

The transfer amount is fixed at **0.001 NEAR** in code. The relay rejects non-testnet account IDs and does not accept a destination or amount from the ESP32.

## Important limitation

GitHub stores the source and runs checks, but it cannot flash firmware to your physical ESP32 by itself. The firmware must eventually be compiled and uploaded to the board from a computer using PlatformIO or another ESP32 toolchain. The relay must also run on a reachable computer or host with its secrets configured.

## Development status

Scaffold only. Not yet compiled against hardware or verified with a successful onchain transaction.
