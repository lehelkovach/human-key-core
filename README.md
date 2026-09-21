# human-key-core

**HumanKey** is a design for consent-first, biometric-anchored, soulbound
identity infrastructure — real-time proof that a specific human is present and
approves a specific action, without a central party that can impersonate them.

This repository holds the design record. **There is no implementation yet.**

## Documents

| Document | What it covers |
| --- | --- |
| [`docs/TECHNICAL-DESIGN.md`](docs/TECHNICAL-DESIGN.md) | HumanKey v0.9 Technical Design Document — components, data flows, authentication protocol, cryptographic choices, risk analysis, open R&D questions |
| [`docs/WHITEPAPER.md`](docs/WHITEPAPER.md) | Short whitepaper summary, plus a mapping from whitepaper terminology to the technical design |

## The idea in one pass

A person registers once: live face and voice capture under liveness conditions,
a spoken randomized passphrase, and live challenge questions. The captured
biometrics become embeddings that are hashed, encrypted, and stored off-chain in
a vault the user holds the keys to. A non-transferable (soulbound) token is
minted and anchored to a slow Layer 1 chain as the durable identity record.

Afterwards, every use of that identity runs through a local **Guardian Agent**
that the user controls. The Guardian prompts for live capture, forwards the
result to decentralized verification nodes, and — only with the user's explicit
approval — signs the request. Fast authentication traffic settles on a Layer 2
DAG; only identity creation, revocation and attestation events reach Layer 1.

Biometrics drift as people age, so the design treats rebinding as a first-class
operation rather than an exception: a user can update their biometric anchor
through a multi-factor recovery protocol without losing the identity link.

## Design status

Everything here is a draft at the design stage. The technical design names the
parts that are still unresolved, notably:

- How to encode and match biometric features with minimum leakage.
- How to generate challenge questions without a central dataset.
- Where the Guardian Agent should live (mobile OS, browser extension, HSM).
- Whether zkSNARK-based biometric proofs are fast enough for real-time use.

## Related projects

HumanKey is one piece of a wider set of designs. The ones it touches most
directly:

- [`knowshowgo`](https://github.com/lehelkovach/knowshowgo) — semantic memory
  substrate; a natural home for provenance-bearing identity assertions.
- [`truth-app`](https://github.com/lehelkovach/truth-app) — reasoning workbench
  built on provenance and attribution, where "who asserted this" matters.
- [`key-chain-network`](https://github.com/lehelkovach/key-chain-network) — key
  management, adjacent to the vault and recovery protocol described here.
