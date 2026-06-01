#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/intuit-card}"
BRANCH="${BRANCH:-dev}"

cd "${APP_DIR}"

current_commit="$(git rev-parse HEAD)"
git fetch origin "${BRANCH}"
next_commit="$(git rev-parse "origin/${BRANCH}")"

if [ "${current_commit}" = "${next_commit}" ]; then
  echo "[update] Already at ${current_commit}"
  exit 0
fi

echo "[update] Updating ${BRANCH}: ${current_commit} -> ${next_commit}"
git checkout "${BRANCH}"
git reset --hard "origin/${BRANCH}"
npm ci
npm test
systemctl restart intuit-card-dev.service
echo "[update] Deployed ${next_commit}"
