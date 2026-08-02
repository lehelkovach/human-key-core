# HumanKey 2.0 — Coding Agent Kickstart

Status: clean restart required  
Repository: `lehelkovach/human-key-core`

## Mission

Build a small, transport-independent human-authority adapter that lets a person issue a root mandate or approve one exact agent action using a human-controlled authenticator.

HumanKey 2.0 is not proof of unique humanity and is not an identity blockchain.

## Repository warning

- `main` is a placeholder README.
- current `dev` contains an unrelated Intuit/QuickBooks card-preauthorization application.
- do not merge, copy, or branch product code from `dev`.
- first maintainer action: quarantine/rename that branch and audit it for secrets/licenses.
- create the implementation branch from clean `main` only.

## Boundaries

HumanKey owns:

- human authenticator registration and recovery metadata;
- signing a bounded root mandate or proposal digest;
- clear action/target/cost/effect preview outside the LLM context;
- conspicuous-use events and rapid revocation;
- an adapter interface for passkeys/WebAuthn first, OIDC second.

HumanKey does not own:

- IAC message delivery, task queues, or leases;
- agent grant-chain storage and delegation logic (KeyChain);
- KSG semantic truth;
- private third-party service credentials;
- public personhood claims or biometric uniqueness.

Core must not depend on IAC Bus. Put IAC translation in an adapter package.

## MVP modules

```text
src/
  core/              # transport-neutral mandates, approvals, recovery policy
  canonical/         # canonical bytes and digest binding
  authenticators/    # WebAuthn/passkey interface and implementation
  status/            # revocation/status provider
  adapters/iac/      # maps core records to IAC schemas
tests/
  unit/
  integration/
docs/
  THREAT_MODEL.md
  RECOVERY_MODEL.md
  CODING-AGENT-KICKSTART.md
```

## First public contracts

- `HumanPrincipal`
- `AuthenticatorBinding`
- `RootMandateRequest`
- `RootMandateRecord`
- `ActionApprovalRequest`
- `ActionApprovalRecord`
- `RevocationRecord`
- `RecoveryPolicy`
- `ConspicuousUseEvent`

An approval request must include proposal digest, normalized action, canonical resource, material parameters/effects, risk, cost bound, requesting agent, expiry, and nonce.

## Work packages

1. Repository repair: clean branch, license, `AGENTS.md`, threat model, CI, secret scan.
2. Canonical domain records: immutable types, serialization, digest vectors, versioning.
3. Test authenticator: deterministic local signer behind an interface; never production default.
4. WebAuthn/passkey adapter: register, challenge, verify, counter/replay handling, user verification required for consequential actions.
5. Revocation/status: short-lived records, fail-closed protected decisions, recovery events.
6. IAC adapter: translate root mandate and exact approval into IAC grants/approvals without importing IAC transport.
7. Minimal approval surface: display normalized facts; no arbitrary agent HTML; return signed record only.

## Security tests

- approval cannot be reused for another proposal digest;
- altered action/resource/parameters invalidate approval;
- expired/revoked authenticator and stale challenge are rejected;
- replayed nonce/signature counter is rejected;
- unknown algorithm/version fails closed;
- private key bytes never appear in API payloads or logs;
- recovery cannot silently expand authority;
- compromised agent cannot approve through the same agent conversation.

## Definition of done

- a passkey-backed human signs one five-minute, one-use IAC action approval;
- verification succeeds without HumanKey depending on an IAC server;
- altered/replayed/expired/revoked variants fail;
- test vectors and a tiny verifier example are published;
- recovery and threat-model limitations are explicit;
- no code or dependency from the unrelated `dev` application enters the branch.

## Do not build yet

Biometrics, social graph personhood, token economics, global identity directory, custom DID method, chain anchoring, zero-knowledge uniqueness, or autonomous recovery agents.

