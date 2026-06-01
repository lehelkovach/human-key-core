# intuit-card

Development web service and CLI for testing QuickBooks Payments card tokenization and
`$1.00` preauthorization flows from comma-delimited CSV input.

> Repository note: this checkout was named `human-key-core` and did not contain the
> requested `HANDOFF.md` or `PROJECT_PROMPT.md` when this work began. The project
> files added here use the requested stable service handle `intuit-card-dev`.

## What the app does

- Serves a browser UI from the Node app.
- Accepts a CSV upload without persisting the raw file.
- Treats CSV cells as text and maps rows by position:
  1. card number
  2. CVV
  3. expiration text
  4. reserved
  5. reserved
  6. ZIP code
- Reuses the shared QuickBooks Payments client from both the web path and CLI.
- Streams row-by-row progress to the browser with server-sent events.
- Displays only safe fields: last four digits, expiration text, processor status
  code, decline reason, and error/failure messages.
- Redacts card numbers, CVV/CVC, OAuth tokens, client secrets, private keys, and
  Authorization headers from structured logs.

The user-provided expiration format was written as `mm/ds`. The app does not
strictly enforce that ambiguous text. Live QuickBooks calls require `mm/yy` or
`mm/yyyy`; dry-run mode records a warning and continues.

## Local setup

```bash
npm ci
cp .env.example .env
npm test
npm run preauth -- --input examples/cards.example.csv --output dry-run.results.csv
npm run dev
```

Open the local server in your browser on the configured port and upload a normal comma-delimited CSV.

## Environment variables

Runtime:

- `HOST` / `PORT` - bind address and port, default `0.0.0.0:3000`.
- `LOG_LEVEL` - `debug`, `info`, `warn`, or `error`.
- `UPLOAD_LIMIT` - upload size limit, default `1mb`.
- `QUICKBOOKS_DRY_RUN` - defaults to `true`; set `false` only on a secured VM.
- `INTUIT_ENVIRONMENT` - `sandbox` or `production`.
- `INTUIT_CLIENT_ID`, `INTUIT_CLIENT_SECRET`, `INTUIT_REDIRECT_URI`.
- `INTUIT_ACCESS_TOKEN` or `INTUIT_REFRESH_TOKEN` for live QuickBooks calls.
- `PREAUTH_AMOUNT` / `PREAUTH_CURRENCY` - defaults `1.00` / `USD`.

Oracle Cloud provisioning inputs are documented in
[`docs/ORACLE_CLOUD_DEV.md`](docs/ORACLE_CLOUD_DEV.md).

## Deployment overview

Development deployment runs from the `dev` branch.

1. Provision or reuse the Oracle Cloud VM named `intuit-card-dev`.
2. Bootstrap the VM with `scripts/vm/bootstrap-dev.sh`.
3. The app runs under systemd with hot reload: `npm run dev` uses
   `node --watch src/server.js`.
4. Updates are delivered by either:
   - GitHub Actions on `dev` pushes, SSHing into the VM and running
     `scripts/vm/update-dev.sh`, or
   - the VM-local systemd timer polling `origin/dev` every minute.

View app logs:

```bash
sudo journalctl -u intuit-card-dev.service -f
```

View update logs:

```bash
sudo journalctl -u intuit-card-dev-update.service -n 100 --no-pager
```

Rollback a bad dev deployment:

```bash
cd /opt/intuit-card
sudo systemctl stop intuit-card-dev.service
git fetch origin dev
git reset --hard <known-good-commit>
npm ci
sudo systemctl start intuit-card-dev.service
```
