#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/intuit-card}"
BRANCH="${BRANCH:-dev}"

if [ ! -d "${APP_DIR}/.git" ]; then
  echo "App directory ${APP_DIR} is not a git checkout. Run scripts/vm/bootstrap-dev.sh first." >&2
  exit 1
fi

"${APP_DIR}/scripts/vm/update-dev.sh"
journalctl -u intuit-card-dev.service -n 80 --no-pager
