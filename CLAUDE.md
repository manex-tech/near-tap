# Claude Code Guide

Before reviewing or changing this repository, read:

1. `AGENTS.md`
2. `README.md`
3. `docs/ARCHITECTURE.md`
4. `SECURITY.md`
5. `docs/TESTING.md`

Treat `AGENTS.md` as the primary repository guide. Keep all implementation and documentation claims aligned with the source code.

Important project facts:
- An ESP32 request creates a pending relay event; it does not directly write to NEAR.
- An operator enters the participant name and explicitly publishes the event.
- The relay account signs the NEAR transaction.
- A button press and an operator-entered name do not establish identity or prove physical presence.
- Participant names stored on-chain are public and persistent.
- The current prototype has security and persistence limitations documented in `SECURITY.md`.

Never expose or ask for secrets. Do not describe planned features as implemented. If tests cannot be executed, report that limitation clearly.
