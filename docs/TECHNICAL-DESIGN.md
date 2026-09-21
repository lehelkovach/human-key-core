# HumanKey v0.9 — Technical Design Document

**Version:** 0.9 (July 2025 draft)
**Status:** Design draft — not implemented
**Source:** Transcribed from an architecture design session with Lehel Kovach.
No content has been added or removed; formatting, tables and headings have been
normalized for the repository.

---

## 1. Purpose

HumanKey is a decentralized, biometric-anchored, soulbound identity
authentication system designed to provide unforgeable, real-time, human
presence verification for Web3, identity-bound access control, and digital
ownership systems.

It integrates biometrics, passphrases, challenge-response security, and
liveness verification into an auditable, consent-based architecture resistant
to identity theft, spoofing, and Sybil attacks.

## 2. System Goals

Primary goals:

- Ensure unambiguous identity binding between a human and their cryptographic
  key/token.
- Provide strong multi-factor authentication (MFA) with liveness and biometric
  entropy.
- Enable user-controlled consent for all usages of the HumanKey identity.
- Support immutable audit trails with revocation, challenge logs, and recovery
  capabilities.
- Ensure biometric updateability (aging voice, facial changes) without breaking
  the link.

## 3. Architectural Overview

### 3.1 Components

| Component | Description |
| --- | --- |
| **HumanKey Token (Soulbound NFT)** | Non-transferable, identity-bound token issued once per human. Anchors cryptographic proofs. |
| **Biometric Capture Module** | Gathers face, voice, gait, lip-sync, and passphrase under liveness conditions. |
| **Liveness Verification Engine** | Analyzes video + audio input against spoofing using adversarial ML and multi-angle checks. |
| **Randomized Challenge Generator** | Issues user-specific cognitive or preference-based security questions live. |
| **Client-Side Guardian Agent** | Local AI app mediating requests, signs/approves token use, handles secure UI and consent. |
| **Decentralized Verification Nodes (DVNs)** | Compute nodes running verifiable ML models to verify liveness and match biometrics. |
| **DAG / Layer 2 Auth Chain** | Fast, scalable consensus layer to process auth attempts in real time. |
| **Immutable Event Anchor Chain (Layer 1)** | Slow, final chain for logging identity creation, revocation, and attestation events. |
| **Encrypted Biometric Vault (Off-Chain)** | Storage for biometric embeddings, encrypted with user keys and zk-access control. |
| **Key Update & Recovery Protocol** | Mechanism for controlled key recovery or biometric rebind based on multi-factor proof. |

### 3.2 Data Flow Overview

**Registration phase**

```
User ⇨ Biometric Capture ⇨ Liveness Engine ⇨ Challenge Response ⇨ Hash & Sign ⇨ Mint HumanKey NFT ⇨ Anchor to L1
                                                  ⇩
                                        Encrypted Embedding ⇨ Vault (off-chain)
```

**Authentication phase**

```
Request ⇨ Client-Side Guardian ⇨ Prompt Liveness Video & Passphrase ⇨
   ⇨ Biometric Match & Challenge ⇨ DVNs ⇨ Consensus ⇨ DAG-L2 Anchor ⇨ L1 Audit Log (optional)
```

**Revocation / update**

```
Guardian Agent ⇨ Verify User + Secondary MFA ⇨ Rebind biometrics ⇨ DVN Review ⇨ Log to L1
```

## 4. Authentication Protocol

### 4.1 Multi-Factor Requirements

- ✅ Live face + voice capture (low-latency streaming)
- ✅ Randomized passphrase spoken
- ✅ Live challenge questions (e.g. "What's your sister's middle name?")
- ✅ Secure enclave or passkey for cryptographic signing
- ✅ User consent confirmation via Guardian Agent UI

### 4.2 Verification Conditions

- ⛔ No headless replayed video/audio accepted
- ⛔ No biometric match without valid liveness consensus
- ⛔ No identity use without user approval (via Guardian Agent)

## 5. Cryptographic Considerations

| Item | Tech |
| --- | --- |
| Biometric hashing | Deep embedding + SHA-3 / Poseidon hashing |
| Signature scheme | ECDSA + Ed25519 (optional zk proof integration) |
| Secure comms | E2EE between capture device and Guardian + DVNs |
| Zero-knowledge proofs | zkSNARKs for proof-of-ownership without revealing biometrics |
| Data vault encryption | AES-256-GCM per-record encryption + off-chain access control |
| Recovery split | Shamir Secret Sharing for trusted biometric recovery consortium |

## 6. System Strengths

- **Non-spoofable** due to multimodal liveness and challenge logic.
- **Decentralized trust** via distributed consensus on identity verification.
- **Revocable and updatable** identity with strong controls.
- **Interoperable** with DID/WebAuthn, zk-ID, and decentralized reputation
  systems.
- **User-centric:** no central controller can impersonate the user.

## 7. Risk Analysis & Limitations

| Risk | Mitigation |
| --- | --- |
| Deepfake / replay spoofing | Liveness detection across multiple modes; randomized, spoken passphrase |
| Model spoofing | Multi-party verification and adversarial model training |
| UX fatigue | Adaptive auth levels based on request type |
| Guardian Agent compromise | HSM integration; remote revoke via trusted second factor |
| Key loss | Decentralized recovery using known-trusted peer witnesses |
| Latency / cost | Layer 2 / DAG for auth fast paths; minimal Layer 1 writes |

## 8. Use Cases

- Web3 login / DAO voting
- Token signing & access control
- Proof-of-personhood (Sybil resistance)
- On-chain credential attestation
- KYC-compliant DeFi access (if opted in)
- Reputation systems and anti-abuse enforcement

## 9. Open R&D Questions

1. How best to encode and match biometric features with minimum leak?
2. Optimal challenge-question generation without a central dataset?
3. Ideal Guardian Agent implementation (mobile OS, browser extension, HSM
   device)?
4. zkSNARK-based biometric proof model — feasibility for real-time use?

## 10. Next Steps

- ✳️ Prototype biometric capture, liveness + passphrase challenge
- ✳️ MVP Guardian Agent client with challenge/approval system
- ✳️ Layer 2 DAG with DVN nodes verifying live biometric hashes
- ✳️ Define NFT minting spec + metadata schema
- ✳️ Establish zk-hash pipeline for secure identity proofing
- ✳️ Draft UX workflow for registration, use, and revocation
- ✳️ Publish whitepaper and threat model audit draft
