# ======================================================================
# Omega Prime X — Windows 11 / PowerShell setup
# ----------------------------------------------------------------------
# Usage:  Right-click > Run with PowerShell, or:  ./setup.ps1
# Prereqs: Node.js >= 20, npm. (Docker Desktop optional, for full stack.)
# ======================================================================
$ErrorActionPreference = "Stop"
Write-Host "=== Omega Prime X setup ===" -ForegroundColor Cyan

function Require-Cmd($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    Write-Host "Missing required command: $name" -ForegroundColor Red
    exit 1
  }
}
Require-Cmd node
Require-Cmd npm

$nodeVersion = (node --version)
Write-Host "Node: $nodeVersion"

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example" -ForegroundColor Green
}

Write-Host "Installing backend/core dependencies..." -ForegroundColor Cyan
npm install

Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
Push-Location frontend
npm install
Pop-Location

Write-Host "Running smoke test (intelligence cycle)..." -ForegroundColor Cyan
npm run seed

Write-Host ""
Write-Host "=== Setup complete ===" -ForegroundColor Green
Write-Host "Run the platform locally (two terminals):"
Write-Host "  1) Backend API :  npm run dev            (http://localhost:8080)"
Write-Host "  2) Cockpit UI  :  cd frontend; npm run dev   (http://localhost:3000)"
Write-Host ""
Write-Host "Or run the full stack with Docker Desktop:"
Write-Host "  docker compose up --build"
