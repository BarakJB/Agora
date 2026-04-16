#!/bin/bash
set -e

APP_DIR="/var/www/payagent"
BRANCH="main"

echo "=== Agora Deploy ==="

# 1. Pull latest code
cd "$APP_DIR"
git pull origin "$BRANCH"

# 2. Server dependencies
cd "$APP_DIR/server"
npm ci --omit=dev

# 3. Build client
cd "$APP_DIR/client"
npm ci
npm run build

# 4. Restart server
pm2 restart all

echo "=== Deploy complete ==="
pm2 status
