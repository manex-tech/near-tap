# NEAR Tap Contract

This directory contains the NEAR smart contract for recording and querying unique presence events.

## Current status

The contract source includes unit tests for initial state, record creation, record retrieval, caller attribution, duplicate rejection, empty event IDs, and event ID length limits.

GitHub Actions runs the tests, checks the WebAssembly target, builds a release Wasm binary, and uploads it as the `near-tap-contract-wasm` workflow artifact.

A successful CI build does not mean the contract has been deployed. The contract must still be reviewed, built with the recommended NEAR release tooling if needed, and deployed to NEAR testnet.

## Run tests locally

From this directory:

```bash
cargo test
```

## Check and build WebAssembly

```bash
rustup target add wasm32-unknown-unknown
cargo check --target wasm32-unknown-unknown
cargo build --target wasm32-unknown-unknown --release
```

The release binary is written to:

```
target/wasm32-unknown-unknown/release/near_tap_contract.wasm
```

## Security limitations before production

The current contract accepts any unique event ID from any transaction signer. It does not yet validate an event organizer, device signature, event challenge, attendance window, or device authenticity. Therefore, it records a wallet's claim of presence, not independently verified physical attendance.

Do not put NEAR account private keys in the ESP32 firmware or commit them to this repository. Before a public deployment, add an authorization and event-challenge design, then test it on NEAR testnet.
