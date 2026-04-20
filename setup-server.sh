#!/bin/bash
set -e

echo "=== Agora Server Setup ==="

# 1. System updates
echo ">>> Updating system..."
sudo apt-get update -y
sudo apt-get upgrade -y

# 2. Install Node.js 20
echo ">>> Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install Docker
echo ">>> Installing Docker..."
sudo apt-get install -y docker.io
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ubuntu

# 4. Install PM2
echo ">>> Installing PM2..."
sudo npm install -g pm2

# 5. Install Nginx
echo ">>> Installing Nginx..."
sudo apt-get install -y nginx

# 6. Create swap (prevent OOM)
echo ">>> Creating 1GB swap..."
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 7. Start MySQL in Docker
echo ">>> Starting MySQL 8.4..."
sudo docker run -d \
  --name payagent-mysql \
  --restart=always \
  -e MYSQL_ROOT_PASSWORD=rootpass \
  -e MYSQL_DATABASE=payagent \
  -e MYSQL_USER=payagent \
  -e MYSQL_PASSWORD=payagent123 \
  -p 3307:3306 \
  mysql:8.4 \
  --character-set-server=utf8mb4 \
  --collation-server=utf8mb4_unicode_ci

# Wait for MySQL to be ready
echo ">>> Waiting for MySQL to start..."
for i in {1..30}; do
  if sudo docker exec payagent-mysql mysqladmin ping -h localhost -u root -prootpass 2>/dev/null; then
    echo "MySQL is ready!"
    break
  fi
  echo "Waiting... ($i/30)"
  sleep 2
done

# 8. Clone repo
echo ">>> Cloning Agora..."
sudo mkdir -p /var/www
cd /var/www
sudo git clone https://github.com/BarakJB/Agora.git payagent
sudo chown -R ubuntu:ubuntu /var/www/payagent

# 9. Run all SQL init scripts
echo ">>> Running database migrations..."
cd /var/www/payagent
for f in db/init/01_schema.sql db/init/02_seed.sql db/init/03_commission_schema_v2.sql db/init/04_commission_reports_and_rules.sql db/init/05_commission_rules_seed.sql db/init/06_sales_transactions.sql; do
  echo "  Running $f..."
  sudo docker exec -i payagent-mysql mysql -u payagent -ppayagent123 payagent < "$f"
done

for f in db/migrations/002_add_password_hash.sql db/migrations/007_agent_company_numbers.sql db/migrations/008_agent_commission_rates.sql; do
  echo "  Running $f..."
  sudo docker exec -i payagent-mysql mysql -u payagent -ppayagent123 payagent < "$f" 2>/dev/null || echo "  (already applied or skipped)"
done

# 10. Install server dependencies
echo ">>> Installing server dependencies..."
cd /var/www/payagent/server
npm install --omit=dev

# 11. Create .env
echo ">>> Creating .env..."
cat > /var/www/payagent/server/.env << 'ENVEOF'
DB_HOST=127.0.0.1
DB_PORT=3307
DB_ROOT_PASSWORD=rootpass
DB_USER=payagent
DB_PASSWORD=payagent123
DB_NAME=payagent
DB_CONNECTION_LIMIT=10
JWT_SECRET=agora-production-secret-2026-xK9mP2vL
JWT_EXPIRES_IN=24h
NODE_ENV=production
ENVEOF

# 12. Start app with PM2
echo ">>> Starting app with PM2..."
cd /var/www/payagent/server
pm2 start dist/index.js --name payagent
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | sudo bash

# 13. Configure Nginx
echo ">>> Configuring Nginx..."
sudo tee /etc/nginx/sites-available/agora << 'NGINXEOF'
server {
    listen 80;
    server_name geneai.co.il app.geneai.co.il;

    # Client static files
    root /var/www/payagent/client/dist;
    index index.html;

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINXEOF

sudo ln -sf /etc/nginx/sites-available/agora /etc/nginx/sites-enabled/agora
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# 14. Install SSL with Let's Encrypt
echo ">>> Installing SSL..."
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d geneai.co.il -d app.geneai.co.il --non-interactive --agree-tos -m barak.jacob@cover.co.il || echo "SSL will be configured after DNS propagates"

echo ""
echo "=== Setup Complete ==="
echo "Static IP: 3.69.89.209"
echo "App: http://3.69.89.209 (HTTPS after DNS propagates)"
pm2 status
