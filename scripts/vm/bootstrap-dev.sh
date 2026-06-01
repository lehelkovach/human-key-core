#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/intuit-card}"
APP_USER="${APP_USER:-ubuntu}"
REPO_URL="${REPO_URL:-https://github.com/lehelkovach/human-key-core.git}"
BRANCH="${BRANCH:-dev}"
ENV_FILE="${ENV_FILE:-/etc/intuit-card/intuit-card.env}"

echo "[bootstrap] Installing system dependencies"
sudo apt-get update
sudo apt-get install -y ca-certificates curl git

if ! command -v node >/dev/null 2>&1 || ! node --version | grep -Eq '^v(20|22)\.'; then
  echo "[bootstrap] Installing Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "[bootstrap] Preparing app directory ${APP_DIR}"
sudo mkdir -p "${APP_DIR}" "$(dirname "${ENV_FILE}")"
sudo chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

if [ ! -d "${APP_DIR}/.git" ]; then
  sudo -u "${APP_USER}" git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
else
  sudo -u "${APP_USER}" git -C "${APP_DIR}" fetch origin "${BRANCH}"
  sudo -u "${APP_USER}" git -C "${APP_DIR}" checkout "${BRANCH}"
  sudo -u "${APP_USER}" git -C "${APP_DIR}" reset --hard "origin/${BRANCH}"
fi

if [ ! -f "${ENV_FILE}" ]; then
  echo "[bootstrap] Creating ${ENV_FILE}; add live secrets on the VM, not in git"
  sudo tee "${ENV_FILE}" >/dev/null <<'ENV'
HOST=0.0.0.0
PORT=3000
LOG_LEVEL=info
QUICKBOOKS_DRY_RUN=true
INTUIT_ENVIRONMENT=sandbox
ENV
  sudo chmod 600 "${ENV_FILE}"
fi

echo "[bootstrap] Installing npm dependencies"
sudo -u "${APP_USER}" npm --prefix "${APP_DIR}" ci

echo "[bootstrap] Installing systemd units"
sudo cp "${APP_DIR}/scripts/systemd/intuit-card-dev.service" /etc/systemd/system/intuit-card-dev.service
sudo cp "${APP_DIR}/scripts/systemd/intuit-card-dev-update.service" /etc/systemd/system/intuit-card-dev-update.service
sudo cp "${APP_DIR}/scripts/systemd/intuit-card-dev-update.timer" /etc/systemd/system/intuit-card-dev-update.timer
sudo systemctl daemon-reload
sudo systemctl enable --now intuit-card-dev.service
sudo systemctl enable --now intuit-card-dev-update.timer

echo "[bootstrap] Done. Logs: sudo journalctl -u intuit-card-dev.service -f"
