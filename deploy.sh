#!/bin/bash
set -e

APP_DIR="/var/www/payagent"

echo "=== Agora Deploy ==="

cd "$APP_DIR"
git pull origin main

# Install server deps only if package.json changed
cd "$APP_DIR/server"
npm install --omit=dev --prefer-offline 2>/dev/null || npm install --omit=dev

# Restart
pm2 restart all

echo "=== Deploy complete ==="
pm2 status
