# NEAR Tap Roadmap

This roadmap separates the current prototype from possible future work. Items below are proposals unless explicitly marked implemented.

## Implemented in the prototype

- ESP32-WROOM-32 BOOT-button interaction.
- Wi-Fi communication from the device to the Node.js relay.
- Shared-token validation for device check-in requests.
- Pending check-in queue in relay memory.
- Dashboard workflow for operator-entered participant names.
- Operator-triggered publication to a NEAR smart contract.
- On-chain event record and participant-name storage.
- Read methods for event record, participant name, and total record count.
- Dashboard verification flow and NEAR testnet transaction links.

## Planned improvements

### Security and access control
- Operator authentication and role-based authorization.
- Organizer-owned events and event-scoped permissions.
- Contract-level authorization where required by the product model.
- Per-device credentials, revocation, rotation, and stronger device authentication.
- HTTPS deployment and production-grade rate limiting.

### Reliability
- Persistent pending-event storage.
- Transaction state reconciliation and safe retry handling.
- Durable audit logs, monitoring, and alerting.
- Multi-device support and device registration.

### Privacy and product design
- Data minimization and explicit participant notice/consent.
- Retention and deletion policy for off-chain personal data.
- Evaluate privacy-preserving on-chain references instead of storing names directly.
- Organizer management and event reporting.

### Deployment and commercial readiness
- Hosted deployment with operational monitoring.
- Event packages and transparent service pricing.
- Payment and billing integration only after product, legal, and operational requirements are defined.
- Independent security review and production testing.

## Non-goals of the current prototype

The current implementation does not provide biometric identity verification, proof of a participant's exact physical location, anti-tailgating, production-grade organizer authentication, or a guarantee that an operator-entered name matches the person who interacted with the device.
