# NEAR Tap Contract

This directory contains the initial NEAR smart contract source.

## Status

The contract is source-only at this stage. It has not yet been compiled, tested, or deployed. The root README tracks the project-wide implementation status.

## Check the Rust source

From this directory, run:

```bash
cargo check
```

A successful `cargo check` validates Rust compilation for the host target. It is not a NEAR WASM build and does not deploy the contract.

Next steps are to add contract unit tests, build the WASM artifact using the NEAR toolchain, and deploy to NEAR testnet.
