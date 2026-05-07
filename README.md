# Revise+ -- plateforme de revision pour le college

Site web pour reviser ses cours, faire des **quiz** et **evaluations chronometrees**, gagner de l'**XP**, monter en **niveau (1 -> 1000)**, recevoir des **Revise coins**, et debloquer des **cosmetiques** (cadres d'avatar, chapeaux, fonds, badges) et des **grades** avec contour d'avatar special.

> **Faisabilite GitHub Pages** : non. GitHub Pages ne peut pas heberger un backend, des comptes et du temps reel. La solution retenue est de tout heberger sur ton **VPS Hostinger** : le frontend (statique), l'API Node.js, la base PostgreSQL et les WebSockets, le tout derriere nginx + HTTPS.

## Architecture

```
+-------------+   HTTPS  +-----------+    127.0.0.1    +----------+
|  navigateur |  ----->  |   nginx   |  -------------> | Node API |
+-------------+          +-----------+                 +----------+
                            |   |  \                       |
                            |   |   \-- /ws -> Socket.io   |
                            |   \------ /api -> Fastify    |
                            \---------- / -> dist/web      v
                                                       PostgreSQL
```

- **Frontend** : React 18 + Vite + TypeScript + TailwindCSS + Zustand + react-router + socket.io-client.
- **Backend** : Node.js 20 + Fastify + Prisma + Socket.io + Zod + bcryptjs.
- **Base** : PostgreSQL 16.
- **Auth** : email + mot de passe (bcrypt) + JWT en cookie httpOnly.
- **Realtime** : level-up et classement push via Socket.io.

## Structure du repo

```
revise-plus/
  apps/
    api/                 # Fastify + Prisma
    web/                 # React + Vite
  packages/
    shared/              # types, courbes XP, grades, schemas Zod
  infra/
    setup-vps.sh         # provisioning Ubuntu 22.04 (Hostinger)
    deploy.sh            # deploiement (sur le VPS)
    ecosystem.config.cjs # PM2
    nginx.conf           # exemple nginx
    docker-compose.yml   # postgres local pour dev
  .github/workflows/deploy.yml  # CI -> SSH deploy
```

## Comptes de demonstration (apres seed)

- Admin : `admin@revise-plus.local` / `admin1234`
- Eleve : `lea@revise-plus.local` / `demo1234`

## Demarrage local (Windows / macOS / Linux)

### 1. Prerequis

- [Node.js 20](https://nodejs.org/)
- [pnpm](https://pnpm.io/) (`npm i -g pnpm`)
- [Docker Desktop](https://www.docker.com/) **ou** un PostgreSQL 14+ deja installe

### 2. Lancer Postgres

Avec Docker :

```bash
cd revise-plus
docker compose -f infra/docker-compose.yml up -d
```

### 3. Installer + initialiser

```bash
cd revise-plus
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### 4. Lancer en dev (deux terminaux ou un seul)

```bash
pnpm dev
# -> Frontend : http://localhost:5173
# -> API      : http://localhost:4000
```

Le frontend proxifie automatiquement `/api` et `/ws` vers le backend pendant le dev (`vite.config.ts`).

## Deploiement sur Hostinger VPS (production)

> **Action attendue de ta part** :
> 1. Recupere l'**IP publique** du VPS, et un **utilisateur SSH** (root ou sudo) avec ta cle.
> 2. Choisis un **nom de domaine** (ex. `revise-plus.fr`) et fais pointer ses enregistrements `A`/`AAAA` sur l'IP du VPS.
> 3. Push ce repo sur GitHub (le sous-dossier `revise-plus/` peut rester dans `Veragrow`).

### 1. Provisioning

Sur le VPS (en root) :

```bash
DOMAIN=revise-plus.exemple.fr bash <(curl -s https://raw.githubusercontent.com/<USER>/<REPO>/main/revise-plus/infra/setup-vps.sh)
```

Ce script installe : Node 20, pnpm, PM2, PostgreSQL 16, nginx, certbot, et configure :
- l'utilisateur Postgres + base
- le fichier `.env.api` (avec secrets generes aleatoirement)
- la conf nginx (`/api`, `/ws`, frontend statique)
- le firewall UFW

Active ensuite HTTPS (apres que le DNS pointe bien sur ton IP) :

```bash
certbot --nginx -d revise-plus.exemple.fr --redirect --agree-tos -m admin@revise-plus.exemple.fr --non-interactive
```

### 2. Cloner le code et deployer

```bash
mkdir -p /opt/revise-plus/src
git clone https://github.com/<USER>/<REPO>.git /opt/revise-plus/src
cd /opt/revise-plus/src/revise-plus
bash infra/deploy.sh
```

### 3. CI auto sur push (optionnel)

Configure 3 secrets GitHub : `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`. Le workflow `.github/workflows/deploy.yml` se charge ensuite de tirer + deployer a chaque push sur `main`.

### 4. Mises a jour

```bash
cd /opt/revise-plus/src/revise-plus
bash infra/deploy.sh
```

## Gameplay (regles V1)

- **Quiz** : entrainement, faible XP par defaut.
- **Eval** : controle (timer strict, x1.5 XP), score qui compte dans le classement de la semaine.
- **XP / niveaux** : courbe `floor(50 * n^1.5)` jusqu'au niveau **1000**. Voir `packages/shared/src/xp.ts`.
- **Coins** : `xpGagne x 0.3` + 10 coins par niveau gagne.
- **Grades** (cadre d'avatar) : Debutant -> Curieux -> Chercheur -> Savant -> Genie -> Erudit -> Sage -> Maitre -> Cosmique -> Legende. Voir `packages/shared/src/ranks.ts`.

## Roadmap V1.1 (apres)

- Reset de mot de passe par email
- Mode lycee (filieres + nouvelles matieres)
- Amis et classement entre amis
- Quetes journalieres / streak rewards
- Succes (badges)
- Mode "fiche audio" (TTS) pour reviser sans lire
- Sauvegardes Postgres automatiques (`pg_dump` cron)

## Aide / actions a fournir pour aller plus vite

Voir le plan : tu auras juste besoin de :
- l'IP du VPS + un acces SSH
- un nom de domaine (ou on commence avec l'IP)
- (optionnel) un compte SMTP pour les emails de reset
- valider les contenus pedagogiques (cours/quiz) -- la page `/admin` permet de les creer en ligne
