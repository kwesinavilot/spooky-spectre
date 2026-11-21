# Specter documentation

Documentation for people building or evaluating Specter. It describes what exists in the code
today; plans live in `.kiro/specs/`, and user-facing help lives in `packages/help`.

| Page | What it covers |
| --- | --- |
| [Architecture](architecture.md) | Packages, surfaces, how data moves, and the rules between packages |
| [Detection and extraction](detection-extraction.md) | How Specter finds agreements and reads them (Spec 2) |
| [Effects and scares](effects.md) | Ghosts, Possession, Resurrection and their limits |
| [Privacy model](privacy.md) | What is read, what is stored, what leaves the device |
| [Development](development.md) | Setup, commands, tests, demo pages and known tooling issues |

Status: Spec 1 (Foundation) is done at v0.6.0. Spec 2 core detection and extraction are built and
tested; wiring them into the extension is next. See [CHANGELOG.md](../CHANGELOG.md) for the full
history.
