# NEAR Tap: Proof of Presence

NEAR Tap is an ESP32 proof-of-presence prototype. Press the onboard BOOT button to create a check-in event. The ESP32 sends that event to a small Node.js relay, which records a timestamp in preview mode.

## Current status

**Preview only. Not yet on-chain.** The relay currently logs presence events in memory. It does not send NEAR tokens, deploy a smart contract, or write data to NEAR testnet. The next development milestone is to anchor presence events to NEAR testnet without introducing any payment behavior.

## Hardware

- ESP32-WROOM-32 development board
- USB data cable
- Wi-Fi network
- Computer running Node.js to host the relay

No extra sensors are required. The onboard BOOT button is used as the check-in trigger.

## Safety

- No payment code or wallet private key is required for the preview.
- Never commit Wi-Fi passwords or device tokens.
- A button press demonstrates an event, not a person's verified identity or physical location.
- Do not claim an event is on-chain until a transaction has been confirmed on NEAR testnet.

## Repository layout

- `server.js`: authenticated preview relay that logs presence events
- `firmware/`: ESP32 firmware for PlatformIO
- `.github/workflows/near-tap.yml`: automated JavaScript syntax check

## Relay configuration

Set `TAP_DEVICE_TOKEN` on the computer running the relay. The same token goes in your local `firmware/secrets.h`, which is ignored by Git.

The relay listens on port 8787 by default. In `firmware/secrets.h`, set `TAP_RELAY_URL` to `http://YOUR_COMPUTER_LAN_IP:8787/api/presence`. Do not use `localhost` as the ESP32's destination.

## Firmware setup

Copy `firmware/secrets.example.h` to `firmware/secrets.h` locally and enter your Wi-Fi name, Wi-Fi password, relay URL, and shared device token. Do not commit the real file.

GitHub can store code and run checks, but it cannot flash firmware to the physical ESP32. Firmware upload will require a local ESP32 toolchain such as PlatformIO in VS Code.

## Planned milestones

1. Detect the BOOT button and log a presence event.
2. Confirm the ESP32 can reach the preview relay.
3. Add NEAR testnet anchoring for presence events.
4. Verify the resulting transaction on a public testnet explorer.
