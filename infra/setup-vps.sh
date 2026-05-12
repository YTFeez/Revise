#!/usr/bin/env bash
# Revise+ -- script d'init pour un VPS Ubuntu 22.04 (Hostinger)
# Usage : ssh root@TON_IP, puis :
#   wget -O setup-vps.sh https://raw.githubusercontent.com/<TON_USER>/<TON_REPO>/main/revise-plus/infra/setup-vps.sh
#   chmod +x setup-vps.sh
#   ./setup-vps.sh

set -euo pipefail

DOMAIN="${DOMAIN:-revise-plus.exemple.fr}"
DB_USER="${DB_USER:-reviseplus}"
DB_PASS="${DB_PASS:-$(openssl rand -hex 16)}"
DB_NAME="${DB_NAME:-reviseplus}"
APP_DIR="${APP_DIR:-/opt/revise-plus}"

echo "==> Mise a jour du systeme"
apt-get update -y
apt-get upgrade -y

echo "==> Outils de base"
apt-get install -y curl git build-essential ufw nginx certbot python3-certbot-nginx

echo "==> Node.js 20 (NodeSource)"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "==> pnpm + pm2"
npm install -g pnpm@9 pm2

echo "==> PostgreSQL 16"
if ! command -v psql >/dev/null 2>&1; then
  apt-get install -y postgresql postgresql-contrib
fi
systemctl enable --now postgresql

echo "==> Creation user/base PostgreSQL"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

echo "==> Firewall"
ufw allow OpenSSH
ufw allow 'Nginx Full'
yes | ufw enable || true

echo "==> Repertoire de l'app"
mkdir -p "${APP_DIR}"
mkdir -p "${APP_DIR}/car-game"

cat > "${APP_DIR}/.env.api" <<EOF
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}?schema=public"
JWT_SECRET="$(openssl rand -hex 32)"
COOKIE_SECRET="$(openssl rand -hex 32)"
PORT=4000
HOST=127.0.0.1
WEB_ORIGIN="https://${DOMAIN}"
NODE_ENV=production
EOF
chmod 600 "${APP_DIR}/.env.api"

echo "==> Configuration nginx"
cat > /etc/nginx/sites-available/revise-plus <<EOF
server {
    server_name ${DOMAIN};

    root ${APP_DIR}/web-dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }

    location = /jeu {
        return 302 /jeu/;
    }

    location /jeu/ {
        alias ${APP_DIR}/car-game/;
        index index.html;
    }

    location / {
        try_files \$uri /index.html;
    }

    listen 80;
}
EOF
ln -sf /etc/nginx/sites-available/revise-plus /etc/nginx/sites-enabled/revise-plus
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "==> HTTPS via Let's Encrypt"
echo "Pense a faire pointer ${DOMAIN} sur l'IP de ce serveur AVANT de lancer la commande suivante :"
echo "  certbot --nginx -d ${DOMAIN} --redirect --agree-tos -m admin@${DOMAIN} --non-interactive"

echo "==> Termine. Recap :"
echo "  DB_USER=${DB_USER}"
echo "  DB_NAME=${DB_NAME}"
echo "  DB_PASS=(stocke dans ${APP_DIR}/.env.api)"
echo "  APP_DIR=${APP_DIR}"
echo
echo "Etape suivante : cloner le repo dans ${APP_DIR}/src puis lancer ./infra/deploy.sh"
