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

- Terraform/OpenTofu and OCI CLI were unavailable in the agent image, so live VM
  provisioning was not run here.
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
