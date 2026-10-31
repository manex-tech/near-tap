# Security Policy and Current Limitations

## Scope

NEAR Tap is a testnet prototype. It is not currently suitable for production attendance, identity verification, or the processing of sensitive personal information.

## Implemented safeguards

- The ESP32 sends a shared token in the `x-tap-token` header.
- The relay compares the supplied token using a timing-safe comparison.
- The relay validates the expected device ID and event type.
- The relay applies request-size limits, a cooldown, and a maximum pending-queue size.
- The relay validates event IDs and participant-name length before publishing.
- The NEAR signing key is loaded from local environment configuration and is intended to be a restricted function-call key.
- Local `.env` and `firmware/secrets.h` files are ignored by Git.

These controls reduce some accidental or unauthorized use. They do not constitute a complete production security design.

## Known limitations

1. **No operator authentication on publish:** the current `POST /api/publish` route does not authenticate an operator. Do not expose the relay to an untrusted network.
2. **Public contract method:** the contract's `record_presence` method is publicly callable. Restricting the relay's function-call key does not prevent another NEAR account from calling the method.
3. **Shared device token:** a copied token can be reused by another client. The prototype does not implement hardware-backed attestation, per-device key rotation, or a challenge-response protocol.
4. **No identity proof:** pressing the button only indicates an interaction with the device. The participant name is entered by an operator and is not verified against a person.
5. **Signer attribution:** the contract records `env::predecessor_account_id()`. In this architecture, that identifies the relay's NEAR account, not the ESP32 or participant.
6. **Volatile state:** pending events and recent activity are held in memory and are lost when the relay restarts.
7. **Public permanent data:** participant names written to NEAR are public blockchain data and should be treated as persistent.
8. **Limited event controls:** the current contract does not implement organizer roles, event-scoped authorization, event expiry, or per-device permissions.
9. **Transport security:** the example relay URL may use plain HTTP on a local network. Production deployments require HTTPS and appropriate network protections.
10. **Operational controls:** monitoring, audit procedures, rate limiting at the network edge, backup/recovery, and incident response are not production-complete.

## Recommendations before production

- Add strong operator authentication and authorization to every publishing and administrative route.
- Add organizer-owned events, scoped permissions, event challenges, and expiry.
- Use per-device credentials with rotation and revocation; consider hardware-backed keys and challenge-response.
- Persist pending events in a database with transaction-state reconciliation.
- Add abuse protection, rate limiting, monitoring, audit logs, and operational alerting.
- Serve the relay over HTTPS and apply secure deployment configuration.
- Minimize personal data, provide clear notice and consent, define retention rules, and avoid sensitive information on-chain.
- Evaluate whether names should be stored on-chain at all. Consider storing minimal commitments or references instead, with careful privacy analysis.
- Add contract-level authorization and a reviewed upgrade/access-control strategy if the product requires restricted recording.
- Perform independent security review and test failure/recovery paths.

## Reporting a vulnerability

Do not publish secrets, private keys, seed phrases, or exploitable personal data in an issue. For a real deployment, establish a private security-reporting channel before inviting external use.
