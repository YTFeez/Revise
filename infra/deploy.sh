#!/usr/bin/env bash
# Revise+ deploy script (a lancer sur le VPS, depuis le checkout du repo)
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/revise-plus}"
SRC_DIR="${SRC_DIR:-${APP_DIR}/src}"
ENV_FILE="${ENV_FILE:-${APP_DIR}/.env.api}"

echo "==> git pull"
if [ -d "${SRC_DIR}/.git" ]; then
  cd "${SRC_DIR}"
elif [ -d "${SRC_DIR}/revise-plus/.git" ]; then
  cd "${SRC_DIR}/revise-plus"
else
  echo "ERREUR: repo git introuvable dans ${SRC_DIR} ou ${SRC_DIR}/revise-plus" >&2
  exit 1
fi
git pull --ff-only || true

REPO_DIR="$(pwd)"

echo "==> Install"
pnpm install --frozen-lockfile=false

echo "==> Prisma generate + db push + seed"
cp "${ENV_FILE}" apps/api/.env
pnpm --filter @revise-plus/api db:generate
pnpm --filter @revise-plus/api db:push
pnpm --filter @revise-plus/api db:seed || true

echo "==> Build web + api"
pnpm build:web
pnpm build:api

echo "==> Sync static frontend vers ${APP_DIR}/web-dist"
mkdir -p "${APP_DIR}/web-dist"
rsync -a --delete apps/web/dist/ "${APP_DIR}/web-dist/"

echo "==> (Re)demarrage de l'API avec PM2"
cd apps/api
pm2 startOrReload "${REPO_DIR}/infra/ecosystem.config.cjs" --update-env
pm2 save

echo "==> reload nginx"
systemctl reload nginx
echo "Deploiement termine."
