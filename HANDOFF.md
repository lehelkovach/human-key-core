# Handoff

The requested handoff file was not present when this work began. This file
captures the current state for the next agent or developer.

## Repository state found

- Current remote: `https://github.com/lehelkovach/human-key-core`.
- Default branch: `main`.
- No existing `dev` branch was present locally or on origin.
- The checkout contained only `README.md`; no prior QuickBooks Payments library,
  npm project, or deployment scripts were available.

## Work added on `dev`

- Node/Express web service serving `public/index.html`.
- CSV upload endpoint at `POST /api/jobs`.
- Job status endpoint at `GET /api/jobs/:id`.
- Server-sent event stream at `GET /api/jobs/:id/events`.
- Reusable QuickBooks Payments client in `src/quickbooksPayments.js`.
- Shared row processor in `src/processor.js`.
- Dry-run CLI: `npm run preauth -- --input examples/cards.example.csv --output dry-run.results.csv`.
- Structured redacting logger controlled by `LOG_LEVEL`.
- Oracle Cloud OCI CLI provisioning script and VM bootstrap scripts.
- GitHub Actions workflow for `dev` branch deployment.
- systemd service/timer files for hot reload and polling-based deployment.

## Known blockers

- Terraform/OpenTofu were unavailable in the agent image. OCI CLI was installed locally and `scripts/oci/ensure-dev-vm.sh` found an existing running `intuit-card-dev` VM.
- The VM responded on port 3000 with an older Intuit Card page, but `/api/health` returned 404. GitHub Actions skipped the SSH deploy step because `DEV_VM_HOST`/`DEV_VM_SSH_KEY` secrets were not configured, and OCI Run Command remained `ACCEPTED` during polling. Live update verification still needs VM SSH access or a functioning OCI agent.
- Intuit OAuth client ID/secret were available, but `INTUIT_REDIRECT_URI`,
  `INTUIT_ACCESS_TOKEN`, and `INTUIT_REFRESH_TOKEN` were not. Live QuickBooks
  calls therefore remain blocked until OAuth credentials are supplied.
- The user-provided expiration format `mm/ds` is ambiguous. The app keeps this
  loose in dry-run mode and requires `mm/yy` or `mm/yyyy` for live calls.

## Verification commands

```bash
npm test
npm run preauth -- --input examples/cards.example.csv --output dry-run.results.csv
bash -n scripts/*.sh scripts/oci/*.sh scripts/vm/*.sh
```
