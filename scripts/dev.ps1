# Lance Postgres (docker), installe les deps si besoin et lance dev (web + api)
$ErrorActionPreference = "Stop"

Push-Location $PSScriptRoot\..

if (-not (Test-Path "node_modules")) {
  Write-Host "Installation des dependances..."
  pnpm install
}

if (Test-Path "infra/docker-compose.yml") {
  Write-Host "Demarrage de PostgreSQL via Docker..."
  docker compose -f infra/docker-compose.yml up -d
}

if (-not (Test-Path "apps/api/.env")) {
  Copy-Item "apps/api/.env.example" "apps/api/.env"
}

Write-Host "Generation Prisma + migration + seed..."
pnpm db:generate
pnpm db:migrate
pnpm db:seed

Write-Host "Lancement dev (Ctrl+C pour quitter)..."
pnpm dev

Pop-Location
