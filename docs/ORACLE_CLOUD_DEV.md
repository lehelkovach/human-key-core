# Oracle Cloud dev VM

This project uses the stable dev VM handle `intuit-card-dev`. The VM should be
tagged with `repo=intuit-card` and `environment=dev` so future agents can find
and reuse it instead of creating duplicates.

## Current credential findings

At the start of this run, the environment exposed these secret families:

- Present: `OCI_*`, `INTUIT_CLIENT_ID`, `INTUIT_CLIENT_SECRET`.
- Missing: `INTUIT_REDIRECT_URI`, `INTUIT_ACCESS_TOKEN`, `INTUIT_REFRESH_TOKEN`.

The agent image did not have Terraform/OpenTofu or OCI CLI installed. Because of
that, live Oracle Cloud provisioning was not executed from the agent. The
repeatable OCI CLI path below is ready to run once `oci` is available.

## Required Oracle Cloud inputs

Set these as Cursor secrets, GitHub Actions secrets, or local environment
variables. Do not commit them.

- `OCI_TENANCY_OCID`
- `OCI_USER_OCID`
- `OCI_COMPARTMENT_OCID`
- `OCI_REGION`
- `OCI_FINGERPRINT`
- `OCI_PRIVATE_KEY_B64` - base64-encoded OCI API private key.

Optional:

- `OCI_SHAPE` - defaults to `VM.Standard.E2.1.Micro`.
- `OCI_IMAGE_OCID` - overrides automatic Ubuntu image lookup.
- `OCI_SSH_PUBLIC_KEY` - public SSH key to inject into the VM. If omitted, the
  script generates an ephemeral key and prints the private key once.
- `OCI_INSTANCE_DISPLAY_NAME` - defaults to `intuit-card-dev`.
- `OCI_PROJECT_REPO` - defaults to `intuit-card`.
- `PORT` - defaults to `3000` and is opened in the generated security list.

## Install OCI CLI

```bash
python3 -m pip install --user oci-cli
export PATH="$HOME/.local/bin:$PATH"
```

## Provision or reuse the VM

```bash
scripts/oci/ensure-dev-vm.sh
```

The script:

1. Builds a temporary OCI config from `OCI_*` secrets.
2. Queries for a running compute instance named `intuit-card-dev`.
3. Reuses it if present.
4. Otherwise creates a VCN, public subnet, route table, security list, and an
   Always Free-eligible compute instance.
5. Sends `infra/cloud-init/dev-vm.yaml` as user data to bootstrap the app.

## VM bootstrap

Cloud-init downloads and runs `scripts/vm/bootstrap-dev.sh`. The script installs
Node.js 22, npm, git, clones `origin/dev` into `/opt/intuit-card`, runs
`npm ci`, and installs systemd units.

If you need to bootstrap manually:

```bash
sudo REPO_URL=https://github.com/lehelkovach/human-key-core.git BRANCH=dev \
  scripts/vm/bootstrap-dev.sh
```

## App environment on the VM

Runtime secrets belong in:

```text
/etc/intuit-card/intuit-card.env
```

Start with:

```text
HOST=0.0.0.0
PORT=3000
LOG_LEVEL=info
QUICKBOOKS_DRY_RUN=true
INTUIT_ENVIRONMENT=sandbox
INTUIT_CLIENT_ID=...
INTUIT_CLIENT_SECRET=...
INTUIT_REDIRECT_URI=...
INTUIT_REFRESH_TOKEN=...
```

Set `QUICKBOOKS_DRY_RUN=false` only after OAuth credentials are present and the
VM is secured. Full card numbers, CVVs, OAuth tokens, and client secrets must not
be placed in the repo checkout.

## Hot reload

The systemd service runs:

```bash
npm run dev
```

That command uses Node's built-in watcher:

```bash
node --watch src/server.js
```

Restart manually:

```bash
sudo systemctl restart intuit-card-dev.service
```

## Auto delivery from `dev`

Two delivery mechanisms are provided:

1. GitHub Actions: `.github/workflows/deploy-dev.yml` runs on pushes to `dev`
   and SSHes into the VM. Required repository secrets:
   - `DEV_VM_HOST`
   - `DEV_VM_SSH_KEY`
   - optional `DEV_VM_USER` (defaults to `ubuntu`)
   - optional `DEV_VM_SSH_PORT` (defaults to `22`)
2. VM-local polling: `intuit-card-dev-update.timer` runs every minute and calls
   `scripts/vm/update-dev.sh`. The script fetches `origin/dev`, applies changes
   only when the commit changed, runs `npm ci`, runs `npm test`, and restarts the
   app.

## Logs

Application logs are structured JSON lines and respect `LOG_LEVEL`.

```bash
sudo journalctl -u intuit-card-dev.service -f
sudo journalctl -u intuit-card-dev-update.service -n 100 --no-pager
```

## Rollback

```bash
cd /opt/intuit-card
sudo systemctl stop intuit-card-dev.service
git reset --hard <known-good-commit>
npm ci
sudo systemctl start intuit-card-dev.service
sudo journalctl -u intuit-card-dev.service -n 80 --no-pager
```

If the bad commit has reached `origin/dev`, revert it on `dev` and push so the
timer and GitHub Actions converge on the rollback commit.

## Dry-run validation

```bash
npm test
npm run preauth -- --input examples/cards.example.csv --output dry-run.results.csv
bash -n scripts/*.sh scripts/oci/*.sh scripts/vm/*.sh
```
