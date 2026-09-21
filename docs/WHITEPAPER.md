# HumanKey — Whitepaper Summary

**Source:** `HumanKey_Whitepaper.md` from the *AI Whitepaper Bundle*
(generated 2026-05-17). Preserved verbatim below; see
[`TECHNICAL-DESIGN.md`](TECHNICAL-DESIGN.md) for the full v0.9 architecture.

---

## Purpose

Consent-first decentralized identity infrastructure for a human-verified
internet.

## Core Features

- Biometric-assisted identity
- Consent-gated verification
- Privacy-preserving credentials
- Anti-bot identity graph

## Technical Components

- Credential attestations
- Trust graphs
- Cryptographic verification
- Selective disclosure

## Use Cases

- Authentication
- Reputation systems
- Human verification for AI platforms
- Secure identity portability

---

## Relationship to the technical design

The whitepaper summary above and the v0.9 Technical Design Document describe the
same system at two levels of detail. Where the two use different language for
the same idea:

| Whitepaper term | Technical Design equivalent |
| --- | --- |
| Biometric-assisted identity | Biometric Capture Module + Liveness Verification Engine (§3.1) |
| Consent-gated verification | Client-Side Guardian Agent consent confirmation (§3.1, §4.1) |
| Privacy-preserving credentials | zkSNARK proof-of-ownership + Encrypted Biometric Vault (§5) |
| Credential attestations | HumanKey Token (Soulbound NFT) anchored to L1 (§3.1) |
| Selective disclosure | Zero-knowledge proofs without revealing biometrics (§5) |
| Anti-bot identity graph | Proof-of-personhood / Sybil resistance (§8) |
| Trust graphs | Decentralized Verification Node consensus (§3.1) |

Terms that appear only in the whitepaper — *trust graphs* as a first-class
structure, and *selective disclosure* as a user-facing control surface — are not
yet specified in the technical design. They are open design work, tracked
alongside the R&D questions in §9 of that document.
