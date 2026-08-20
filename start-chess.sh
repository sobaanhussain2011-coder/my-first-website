#!/usr/bin/env bash
# Starts Walnut & Brass so you can open it in Chrome.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
  echo "Pehle Node.js install karo: https://nodejs.org"
  exit 1
fi

cd "$ROOT/backend"
if [ ! -f .env ]; then
  cp .env.example .env
fi
npm install
npx prisma generate
npx prisma migrate deploy

cd "$ROOT/frontend"
npm install

echo
echo "Chrome kholo aur yeh likho:"
echo "  http://localhost:5173/play"
echo

cd "$ROOT/backend"
npm run dev &
BACK_PID=$!
trap 'kill $BACK_PID 2>/dev/null || true' EXIT

cd "$ROOT/frontend"
npm run dev -- --host 127.0.0.1 --port 5173
