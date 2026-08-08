#!/usr/bin/env bash
# Provisions an Ubuntu server (Oracle Cloud Always Free / any VPS) to run the app.
#
# Usage:
#   git clone https://github.com/mohdabrarbaloch-arch/videology.git
#   cd videology
#   bash deploy-ubuntu.sh
#
# What it does:
#   1. Installs Docker
#   2. Creates .env.production from .env.example (you fill in your API keys)
#   3. Builds the image and starts the app on port 80
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/videology}"
REPO_URL="https://github.com/mohdabrarbaloch-arch/videology.git"

echo "==> Installing Docker..."
if ! command -v docker >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi

echo "==> Getting the app..."
mkdir -p "$APP_DIR"
cd "$APP_DIR"
if [ ! -d videology ]; then
  git clone "$REPO_URL" videology
fi
cd videology
git pull --ff-only || true

echo "==> Environment..."
if [ ! -f .env.production ]; then
  cp .env.example .env.production
  echo ""
  echo "!! First run: edit $APP_DIR/videology/.env.production and fill in:"
  echo "   JWT_SECRET, OPENAI_API_KEY, GROQ_API_KEY"
  echo "   Then re-run: bash deploy-ubuntu.sh"
  exit 1
fi

echo "==> Building and starting (first build takes ~10 minutes)..."
docker compose up -d --build

echo ""
echo "==> Done!"
echo "    App is live on http://$(curl -4 -s https://ifconfig.me)"
echo "    Open port 80 (and 443 if you add a domain) in your server's security list."
echo "    Data lives in $APP_DIR/videology/data"
