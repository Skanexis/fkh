# F.K.H VPS Ubuntu Deployment Runbook

This runbook describes a full deployment from an empty local Git repository to a running production service on an Ubuntu VPS.

The production setup is intentionally isolated from other sites:

- Frontend container is bound to `127.0.0.1:18480`.
- Backend API container is bound to `127.0.0.1:18481`.
- PostgreSQL and Redis are not published to the host.
- Public traffic should go through your existing host Nginx using a domain-specific server block.

Replace every placeholder such as `your-domain.com`, `YOUR_GITHUB_USER`, and `CHANGE_ME...` before running production commands.

## 1. What Will Run On The VPS

Production containers:

- `fkh-frontend`: static Vite build served by Nginx inside Docker.
- `fkh-backend`: Fastify API on internal container port `4000`.
- `fkh-postgres`: PostgreSQL 16.
- `fkh-redis`: Redis 7.

Host ports:

- `127.0.0.1:18480` -> frontend container port `80`.
- `127.0.0.1:18481` -> backend container port `4000`.

The host Nginx will proxy:

- `https://your-domain.com/` -> `http://127.0.0.1:18480/`
- `https://your-domain.com/api/` -> `http://127.0.0.1:18481/api/`
- `https://your-domain.com/uploads/` -> `http://127.0.0.1:18481/uploads/`
- `https://your-domain.com/health` -> `http://127.0.0.1:18481/health`

## 2. Files Added For Deployment

These files are part of the deployment setup:

- `Dockerfile`: builds and serves the frontend.
- `backend/Dockerfile`: builds and runs the Fastify backend.
- `deploy/nginx.frontend.conf`: Nginx config inside the frontend container for SPA fallback.
- `docker-compose.prod.yml`: production Docker Compose stack.
- `.env.production.example`: production environment template.
- `.dockerignore`: keeps local dependencies, logs, and secrets out of Docker build context.
- `runbook.md`: this deployment guide.

## 3. Local Pre-Flight Checks

Run from the project root on your local machine:

```bash
npm run build
cd backend
npm run build
cd ..
```

Expected result:

- Frontend build succeeds.
- Backend TypeScript build succeeds.
- Vite may warn about a large chunk. That is not a deployment blocker.

Make sure secrets are ignored:

```bash
git status --short
```

Files named `.env`, `.env.production`, and other real env files must not be committed.

## 4. Create The Git Repository Locally

If the folder is not yet a Git repository, initialize it:

```bash
git init
git status --short
```

Add files:

```bash
git add .
git status --short
```

Check that these files are not staged:

```bash
git status --short | grep -E '\.env$|\.env\.production$'
```

If the command prints a real secret env file, stop and unstage it:

```bash
git restore --staged .env .env.production backend/.env
```

Commit:

```bash
git commit -m "Prepare production deployment"
```

## 5. Create A Remote Repository

Example with GitHub:

1. Open GitHub.
2. Create a new private repository, for example `fkh`.
3. Do not initialize it with README, license, or `.gitignore` if the local repo already has files.
4. Copy the SSH remote URL, for example:

```text
git@github.com:YOUR_GITHUB_USER/fkh.git
```

Connect local repository:

```bash
git remote add origin git@github.com:YOUR_GITHUB_USER/fkh.git
git branch -M main    
git push -u origin main
```

If you already have a remote:

```bash
git remote -v
git remote set-url origin git@github.com:YOUR_GITHUB_USER/fkh.git
git push -u origin main
```

## 6. Prepare DNS

Create a DNS record for the site.

Example:

```text
Type: A
Name: fkh
Value: YOUR_VPS_PUBLIC_IP
TTL: 300
```

This gives:

```text
fkh.your-domain.com
```

You can also use the root domain if it is not already used by another site.

Wait until DNS resolves:

```bash
dig +short fkh.your-domain.com
```

Expected output:

```text
YOUR_VPS_PUBLIC_IP
```

## 7. SSH Into The VPS

From your local machine:

```bash
ssh root@YOUR_VPS_PUBLIC_IP
```

Update packages:

```bash
apt update
apt upgrade -y
```

Install basic tools:

```bash
apt install -y ca-certificates curl gnupg git ufw nginx
```

## 8. Create A Deploy User

Create a non-root user:

```bash
adduser deploy
usermod -aG sudo deploy
```

Copy your SSH key to the deploy user:

```bash
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

Switch to deploy:

```bash
su - deploy
```

Check:

```bash
whoami
pwd
```

Expected:

```text
deploy
/home/deploy
```

## 9. Install Docker And Compose Plugin

Run as `deploy` if the user has sudo:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

Add Docker repository:

```bash
. /etc/os-release
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  ${VERSION_CODENAME} stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

Install Docker:

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Allow `deploy` to run Docker:

```bash
sudo usermod -aG docker deploy
```

Log out and log back in:

```bash
exit
ssh deploy@YOUR_VPS_PUBLIC_IP
```

Verify:

```bash
docker --version
docker compose version
docker ps
```

## 10. Give The VPS Access To The Git Repository

On the VPS as `deploy`, create an SSH key:

```bash
ssh-keygen -t ed25519 -C "deploy@fkh-vps"
```

Print the public key:

```bash
cat ~/.ssh/id_ed25519.pub
```

Add this key to GitHub:

1. Open the repository.
2. Go to `Settings`.
3. Open `Deploy keys`.
4. Add deploy key.
5. Name it `fkh-vps`.
6. Paste the public key.
7. Leave write access disabled unless you need the server to push.

Test access:

```bash
ssh -T git@github.com
```

Clone the repo:

```bash
mkdir -p ~/apps
cd ~/apps
git clone git@github.com:Skanexis/fkh.git
cd fkh
```

## 11. Create Production Environment File

Copy the template:

```bash
cp .env.production.example .env.production
chmod 600 .env.production
```

Generate secrets:

```bash
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
openssl rand -base64 24
```

Edit:

```bash
nano .env.production
```

Minimum required values:

```env
FRONTEND_BIND_HOST=127.0.0.1
FRONTEND_PORT=18480
BACKEND_BIND_HOST=127.0.0.1
BACKEND_PORT=18481

VITE_API_BASE_URL=https://fkh.your-domain.com

NODE_ENV=production
PORT=4000
HOST=0.0.0.0
DATABASE_URL=postgresql://fkh:YOUR_DB_PASSWORD@postgres:5432/fkh
JWT_ACCESS_SECRET=YOUR_LONG_RANDOM_ACCESS_SECRET
JWT_REFRESH_SECRET=YOUR_LONG_RANDOM_REFRESH_SECRET
CORS_ORIGINS=https://fkh.your-domain.com
PUBLIC_API_URL=https://fkh.your-domain.com

POSTGRES_DB=fkh
POSTGRES_USER=fkh
POSTGRES_PASSWORD=YOUR_DB_PASSWORD

TELEGRAM_WEBHOOK_SECRET=YOUR_LONG_RANDOM_TELEGRAM_WEBHOOK_SECRET
```

Important:

- `POSTGRES_PASSWORD` must match the password inside `DATABASE_URL`.
- `VITE_API_BASE_URL` is used when building the frontend image.
- If you use same-domain Nginx proxy, set `VITE_API_BASE_URL` to `https://fkh.your-domain.com`, not to port `18481`.
- `CORS_ORIGINS` must include the exact browser origin.

## 12. Optional Telegram Values

If Telegram login is required, fill:

```env
TELEGRAM_BOT_TOKEN=123456:telegram-token
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_WEBHOOK_URL=https://fkh.your-domain.com/api/v1/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=YOUR_LONG_RANDOM_TELEGRAM_WEBHOOK_SECRET
TELEGRAM_ADMIN_IDS=123456789,987654321
ORDER_NOTIFICATIONS_ENABLED=false
```

If you only want to test the public site, Telegram values can stay empty. Login and admin access will not work until Telegram is configured.

## 13. Build Images On The VPS

From `~/apps/fkh`:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build
```

This builds:

- frontend image with `VITE_API_BASE_URL`.
- backend image with Prisma client and TypeScript build.

## 14. Start Database Services First

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d postgres redis
```

Check:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Postgres should become `healthy`.

## 15. Start Backend And Frontend

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d backend frontend
```

Check containers:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Expected:

- `frontend` running.
- `backend` running or healthy.
- `postgres` healthy.
- `redis` running.

## 16. Initialize Database Schema

Because this project currently uses Prisma `db push` rather than committed migration files, initialize the schema with:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend npm run db:push
```

Seed initial catalog data:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend npm run db:seed
```

Use seed only when you want the demo catalog/admin seed data. If the database already contains production data, do not re-run seed unless you understand what it upserts.

## 17. Verify Local Container Ports On VPS

Run on the VPS:

```bash
curl -I http://127.0.0.1:18480/
curl http://127.0.0.1:18481/health
curl http://127.0.0.1:18481/api/v1/products
```

Expected:

- Frontend returns HTTP 200.
- `/health` returns JSON with `status: ok`.
- products endpoint returns JSON with `data`.

If this works, Docker is good. Next step is host Nginx.

## 18. Configure Host Nginx Reverse Proxy

Create a new Nginx site. Do not edit existing sites unless you know they are unused.

```bash
sudo nano /etc/nginx/sites-available/the-fkh.eu
```

Paste:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name the-fkh.eu;

    client_max_body_size 110m;

    location /api/ {
        proxy_pass http://127.0.0.1:18481/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:18481/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /health {
        proxy_pass http://127.0.0.1:18481/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:18480;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/the-fkh.eu /etc/nginx/sites-enabled/the-fkh.eu
```

Test Nginx:

```bash
sudo nginx -t
```

Reload:

```bash
sudo systemctl reload nginx
```

Verify:

```bash
curl -I http://fkh.your-domain.com/
curl http://fkh.your-domain.com/health
curl http://fkh.your-domain.com/api/v1/products
```

## 19. Enable HTTPS With Certbot

Install Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Issue certificate:

```bash
sudo certbot --nginx -d the-fkh.eu
```

Choose redirect HTTP to HTTPS when prompted.

Test renewal:

```bash
sudo certbot renew --dry-run
```

Verify HTTPS:

```bash
curl -I https://fkh.your-domain.com/
curl https://fkh.your-domain.com/health
curl https://fkh.your-domain.com/api/v1/products
```

## 20. Firewall

If you use UFW:

```bash
sudo ufw status
```

Allow SSH and Nginx:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

Do not open `18480`, `18481`, `5432`, or `6379` publicly.

The compose file binds `18480` and `18481` to `127.0.0.1`, so they are not reachable from outside anyway.

## 21. Configure Telegram Webhook

Only do this after HTTPS works and Telegram env values are set.

Set webhook:

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=https://fkh.your-domain.com/api/v1/telegram/webhook" \
  -d "secret_token=${TELEGRAM_WEBHOOK_SECRET}"
```

If you do not have shell env variables set, replace them manually:

```bash
curl -X POST "https://api.telegram.org/bot123456:TOKEN/setWebhook" \
  -d "url=https://fkh.your-domain.com/api/v1/telegram/webhook" \
  -d "secret_token=YOUR_LONG_RANDOM_TELEGRAM_WEBHOOK_SECRET"
```

Check webhook:

```bash
curl "https://api.telegram.org/bot123456:TOKEN/getWebhookInfo"
```

Expected:

- `url` is your webhook URL.
- `last_error_message` is empty.

## 22. Make First Admin User

Recommended path:

1. Set `TELEGRAM_ADMIN_IDS` in `.env.production`.
2. Use your numeric Telegram user ID.
3. Restart backend.
4. Run seed to upsert admin users from `TELEGRAM_ADMIN_IDS`.

Commands:

```bash
nano .env.production
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build backend
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend npm run db:seed
```

Then log in through Telegram. The profile page should show the `Admin` badge and `Admin Panel` button.

## 23. Update Deployment

On VPS:

```bash
cd ~/apps/fkh
git pull --ff-only
docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend npm run db:push
```

If frontend env changed, always rebuild frontend:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build frontend
docker compose --env-file .env.production -f docker-compose.prod.yml up -d frontend
```

## 24. Rollback

Find recent commits:

```bash
git log --oneline -n 10
```

Checkout previous commit:

```bash
git checkout COMMIT_SHA
docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

Return to main later:

```bash
git checkout main
git pull --ff-only
docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

Database rollback is separate and requires backups. Do not assume code rollback rolls back database state.

## 25. Logs

All services:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f
```

Backend only:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f backend
```

Frontend only:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f frontend
```

Postgres:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f postgres
```

Host Nginx:

```bash
sudo journalctl -u nginx -f
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 26. Backups

Create backup directory:

```bash
mkdir -p ~/backups/fkh
```

Manual database backup:

```bash
cd ~/apps/fkh
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U fkh -d fkh > ~/backups/fkh/fkh-$(date +%F-%H%M%S).sql
```

Compress:

```bash
gzip ~/backups/fkh/*.sql
```

Restore example:

```bash
gunzip -c ~/backups/fkh/fkh-YYYY-MM-DD-HHMMSS.sql.gz | \
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres \
  psql -U fkh -d fkh
```

Uploads backup:

```bash
docker run --rm \
  -v fkh_fkh_uploads:/data \
  -v ~/backups/fkh:/backup \
  alpine tar czf /backup/uploads-$(date +%F-%H%M%S).tar.gz -C /data .
```

## 27. Optional Daily Backup Cron

Open crontab:

```bash
crontab -e
```

Add:

```cron
15 3 * * * cd /home/deploy/apps/fkh && docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres pg_dump -U fkh -d fkh | gzip > /home/deploy/backups/fkh/fkh-$(date +\%F-\%H\%M\%S).sql.gz
```

Check backup directory the next day:

```bash
ls -lh ~/backups/fkh
```

## 28. Health Checks

Container health:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Local host:

```bash
curl -I http://127.0.0.1:18480/
curl http://127.0.0.1:18481/health
```

Public:

```bash
curl -I https://fkh.your-domain.com/
curl https://fkh.your-domain.com/health
curl https://fkh.your-domain.com/api/v1/products
```

Browser:

1. Open `https://fkh.your-domain.com`.
2. Open catalog.
3. Check product cards load.
4. Open cart.
5. Open profile.
6. If Telegram is configured, test login.
7. If user is admin, verify the profile shows `Admin` and `Admin Panel`.

## 29. Troubleshooting

### Frontend opens but catalog says `Failed to fetch`

Check API:

```bash
curl https://fkh.your-domain.com/health
curl https://fkh.your-domain.com/api/v1/products
```

If public API fails but localhost works:

```bash
curl http://127.0.0.1:18481/health
sudo nginx -t
sudo tail -n 100 /var/log/nginx/error.log
```

Check `.env.production`:

```env
VITE_API_BASE_URL=https://fkh.your-domain.com
CORS_ORIGINS=https://fkh.your-domain.com
PUBLIC_API_URL=https://fkh.your-domain.com
```

Rebuild frontend after changing `VITE_API_BASE_URL`:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build frontend
docker compose --env-file .env.production -f docker-compose.prod.yml up -d frontend
```

### Backend container restarts

Check logs:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=200 backend
```

Common causes:

- Bad `DATABASE_URL`.
- Postgres password mismatch.
- JWT secret shorter than 16 characters.
- Missing env file.

### Postgres is unhealthy

Check:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=200 postgres
```

Common causes:

- Existing volume created with different username/password.
- Invalid `POSTGRES_PASSWORD`.

If this is a fresh deploy and no data matters, reset volumes:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml down -v
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

Do not run `down -v` on production data unless you have a backup.

### Nginx certificate fails

Check DNS:

```bash
dig +short fkh.your-domain.com
```

Check port 80:

```bash
sudo ufw status
sudo nginx -t
curl -I http://fkh.your-domain.com/
```

### Port collision

Check host ports:

```bash
sudo ss -tulpn | grep -E ':18480|:18481'
```

If another service uses these ports, edit `.env.production`:

```env
FRONTEND_PORT=28480
BACKEND_PORT=28481
```

Then update Nginx proxy targets and restart:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
sudo nginx -t
sudo systemctl reload nginx
```

## 30. Stop And Start

Stop:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml stop
```

Start:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

Full shutdown without deleting volumes:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml down
```

Full shutdown and delete database/uploads volumes:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml down -v
```

Use `down -v` only for disposable environments.

## 31. Configure No-KYC Self-Custody Crypto Payments

This project runs crypto payments without any custodial payment processor.

Important architecture notes:

- The VPS never stores your private keys, seed phrases, or exchange login data.
- You add your own receiving addresses to `.env.production`.
- The site assigns one free receiving address from the configured pool to each active invoice.
- The backend quotes the crypto amount from CoinGecko, adds a tiny unique amount marker, and shows the customer the exact amount/address.
- A backend watcher checks blockchains directly:
  - BTC via mempool.space;
  - USDT ERC-20 and USDC ERC-20 via Etherscan;
  - USDT TRC-20 via TronGrid.
- The backend confirms an order only when the watcher sees enough confirmed funds on that invoice address.
- If the customer sends less than required, the order stays pending and the customer sees the remaining crypto amount to pay.
- For BTC, the watcher can see unconfirmed mempool transactions and show them as pending, but it confirms the order only after the configured confirmation threshold.
- Empty invoices expire automatically after `CRYPTO_PAYMENT_TTL_MINUTES` and release the wallet for future orders.

Official docs:

- CoinGecko Simple Price API: `https://docs.coingecko.com/reference/simple-price`
- mempool.space API: `https://mempool.space/docs/api/rest`
- Etherscan Account API: `https://docs.etherscan.io/api-reference/endpoint/tokentx`
- TronGrid API: `https://developers.tron.network/reference/trc20-transaction-information-by-account-address`

### 31.1 Create Your Wallet Address Pools

Generate receiving addresses in wallets you control.

Use separate address pools per asset/network:

```text
BTC address pool              -> native Bitcoin receive addresses
USDT (ETH) address pool       -> Ethereum addresses that can receive USDT ERC-20
USDT (TRON) address pool      -> TRON addresses that can receive USDT TRC-20
USDC (ETH) address pool       -> Ethereum addresses that can receive USDC ERC-20
```

You can generate these addresses in wallets such as hardware wallets, Electrum for BTC, MetaMask-compatible Ethereum wallets, and TronLink-compatible TRON wallets. Use wallets you control.

Never put private keys or seed phrases on the VPS. Only public receiving addresses go into `.env.production`.

Recommended:

- Generate at least 20 receiving addresses per busy currency.
- For low volume, 3-5 addresses per currency is enough for testing.
- The backend will not reuse an address while there is an active pending invoice on it.
- After the active invoice is paid/confirmed or cancelled, the same address can be reused for a later invoice.
- If you have only one address for a currency, you can accept only one active invoice for that currency at a time.
- If all addresses for a currency are busy, checkout returns an error asking the customer to wait or asking you to add more receiving addresses.

Use the exact network:

- `USDT (ETH)` must be ERC-20 on Ethereum.
- `USDT (TRON)` must be TRC-20 on TRON.
- `USDC (ETH)` must be ERC-20 on Ethereum.
- `BTC` must be Bitcoin mainnet.

### 31.2 Create Explorer API Keys

BTC can be checked through mempool.space without a key.

For ERC-20 tokens, create an Etherscan API key:

```text
https://etherscan.io/apis
```

For TRON TRC-20, TronGrid may work without a key at low volume, but production should use a TronGrid API key:

```text
https://www.trongrid.io/
```

These are explorer API keys, not custodial payment accounts. They do not hold your money.

### 31.3 Configure `.env.production`

On the VPS:

```bash
cd ~/apps/fkh
nano .env.production
```

Set these values:

```env
VITE_API_BASE_URL=https://the-fkh.eu
PUBLIC_API_URL=https://the-fkh.eu
CORS_ORIGINS=https://the-fkh.eu

# Comma-separated address pools. Add your own public receiving addresses.
CRYPTO_BTC_ADDRESSES=bc1qAddress1,bc1qAddress2,bc1qAddress3
CRYPTO_USDT_ERC20_ADDRESSES=0xEthAddress1,0xEthAddress2,0xEthAddress3
CRYPTO_USDT_TRC20_ADDRESSES=TTronAddress1,TTronAddress2,TTronAddress3
CRYPTO_USDC_ERC20_ADDRESSES=0xEthAddress4,0xEthAddress5,0xEthAddress6

CRYPTO_PAYMENT_TTL_MINUTES=120
CRYPTO_BTC_PAYMENT_TTL_MINUTES=360
CRYPTO_ETH_TOKEN_PAYMENT_TTL_MINUTES=90
CRYPTO_TRON_PAYMENT_TTL_MINUTES=45
CRYPTO_POLL_INTERVAL_SECONDS=60
CRYPTO_BTC_CONFIRMATIONS=1
CRYPTO_ETH_CONFIRMATIONS=12
CRYPTO_TRON_CONFIRMATIONS=20

COINGECKO_API_URL=https://api.coingecko.com/api/v3
MEMPOOL_API_URL=https://mempool.space/api
ETHERSCAN_API_URL=https://api.etherscan.io/v2/api
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
TRONGRID_API_URL=https://api.trongrid.io
TRONGRID_API_KEY=YOUR_TRONGRID_API_KEY

ORDER_NOTIFICATIONS_ENABLED=true
TELEGRAM_ADMIN_CHAT_ID=YOUR_ADMIN_CHAT_ID
TELEGRAM_ADMIN_IDS=YOUR_TELEGRAM_USER_ID
```

Notes:

- `PUBLIC_API_URL` must not be `localhost`.
- `PUBLIC_API_URL` must not include `/api`.
- Use HTTPS, not HTTP, in production.
- `ORDER_NOTIFICATIONS_ENABLED=true` is required for admin Telegram order/payment notifications.
- `TELEGRAM_ADMIN_CHAT_ID` is the chat where admin notifications are sent.
- `TELEGRAM_ADMIN_IDS` controls which Telegram users can press admin inline buttons.

### 31.4 Deploy Crypto Payment Changes

From the VPS:

```bash
cd ~/apps/fkh
git pull --ff-only
docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend npm run db:push
```

`db:push` is required because crypto payments add a `CryptoPayment` table.

If you only changed `.env.production` after the containers were already built:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate backend
```

If you changed `VITE_API_BASE_URL`, rebuild frontend too:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build frontend
docker compose --env-file .env.production -f docker-compose.prod.yml up -d frontend
```

### 31.5 Verify Backend Can See Crypto Settings

Check health:

```bash
curl https://the-fkh.eu/health
```

Check public crypto methods:

```bash
curl https://the-fkh.eu/api/v1/payments/crypto/methods
```

Expected response includes:

```json
[
  { "code": "btc", "label": "BTC", "network": "Bitcoin" },
  { "code": "usdt_erc20", "label": "USDT (ETH)", "network": "Ethereum ERC-20" },
  { "code": "usdt_trc20", "label": "USDT (TRON)", "network": "TRON TRC-20" },
  { "code": "usdc_erc20", "label": "USDC (ETH)", "network": "Ethereum ERC-20" }
]
```

Check backend logs:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=200 backend
```

There should be no env validation errors.

### 31.7 Test A Real Order

Use a small product/order amount first.

1. Open the site.
2. Log in with Telegram.
3. Add product to cart.
4. Fill delivery data.
5. Select one crypto method.
6. Confirm order.
7. The site should show:
   - order number,
   - payment status,
   - exact crypto amount,
   - payment address,
   - copy buttons.
8. Send the exact amount from a wallet using the exact selected network.
9. Wait for blockchain confirmations and backend watcher polling.
10. The order should move from `Pending` to `Confirmed`.
11. Admin Telegram chat should receive payment confirmation.

Do not test USDT TRON by sending USDT ERC-20, and do not test USDT ERC-20 by sending USDT TRON. Wrong-network payments may be unrecoverable.

### 31.8 How The System Avoids Mixing Transactions

The system does not match payments by products or by EUR amount.

It matches by self-custody invoice fields:

- `payAddress`: the receiving address assigned to that active invoice.
- `payAmount`: the exact crypto amount with a tiny unique marker.
- `publicId`: our order ID such as `Order#123`.

When the watcher runs:

1. Backend checks active pending invoices.
2. Backend reads confirmed blockchain transfers for the assigned address.
3. Backend compares confirmed received amount with the exact invoice `payAmount`.
4. If confirmed received amount is enough, the order becomes `Confirmed`.
5. If confirmed received amount is lower, the order stays `Pending` and shows the remaining amount.

This means two customers can buy the same products for the same amount at the same time only if your address pool has enough free addresses. They receive different invoice addresses. If you configured only one address for that currency, the second customer must wait until the first invoice is paid/confirmed or cancelled.

Invoices that stay `Waiting` or `Confirming` past their TTL are marked `Expired` automatically by the backend watcher. Expired invoices no longer reserve the address. Invoices with confirmed partial payment stay `Partially paid` and keep reserving the address until the customer pays the remainder or an admin resolves the case manually.

Recommended TTL values:

```env
CRYPTO_BTC_PAYMENT_TTL_MINUTES=360
CRYPTO_ETH_TOKEN_PAYMENT_TTL_MINUTES=90
CRYPTO_TRON_PAYMENT_TTL_MINUTES=45
```

`CRYPTO_PAYMENT_TTL_MINUTES` remains a fallback if a per-currency value is not set.

The watcher records concrete blockchain transfers in the database:

- `chain`
- `asset`
- `txHash`
- `outputIndex` or token log index
- `amount`
- confirmations

The unique database key is:

```text
chain + asset + txHash + outputIndex
```

So if the explorer returns the same transfer on every polling cycle, it is stored only once and cannot be counted twice. If the customer sends two separate identical transactions, they have different transaction hashes and both are counted.

For BTC:

- unconfirmed mempool transactions are stored with `confirmations=0`;
- the invoice status becomes `Confirming` if a BTC transaction is visible but not confirmed yet;
- the order is not moved to `Confirmed` until the transfer reaches `CRYPTO_BTC_CONFIRMATIONS`;
- when the same tx later becomes confirmed, the existing transaction row is updated instead of inserted again.

Residual limitation:

- If a third party sends the correct amount to the exact active invoice address during the invoice window, blockchain data alone cannot prove which human sent it.
- The practical protection is one active invoice per address, exact unique amount markers, short invoice TTL, transaction hash deduplication, and admin review for suspicious cases.

### 31.9 What Happens If Customer Sends Too Little

If blockchain watcher sees a confirmed incoming amount lower than the invoice amount:

```text
received < payAmount
```

then:

- order stays `Pending`;
- customer sees the received amount;
- customer sees the remaining crypto amount to pay;
- admin receives a Telegram warning;
- order is not confirmed until confirmed received amount reaches the invoice amount.

The customer should send the remaining amount using the same asset and network to the same invoice address while the invoice is still valid.

### 31.10 What Happens If Customer Sends Wrong Coin Or Wrong Network

The application cannot recover wrong-chain payments.

Examples:

- customer selected `USDT (TRON)` but sent `USDT ERC-20`;
- customer selected `USDC (ETH)` but sent `USDT ERC-20`;
- customer sent from an exchange that deducted withdrawal fees from the invoice amount.

Expected result:

- the watcher may not see a valid payment for the invoice;
- the order stays pending;
- admin must resolve it manually with the customer and wallet/exchange support.

Operational rule:

- Tell customers to copy the exact amount and exact network from the invoice screen.
- For exchange withdrawals, customer must account for exchange withdrawal fees so the invoice receives the full amount.

### 31.11 Add Or Change Wallets Later

To change receiving addresses:

1. Generate new public receiving addresses in your wallet.
2. Open `.env.production`.
3. Add the addresses to the correct comma-separated env variable.
4. Recreate backend.
5. Create a small test order.
6. Verify that payment detection works.

Example:

```bash
nano .env.production
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate backend
```

No code change is needed if you are still using the supported currencies:

```text
BTC
USDT ERC-20
USDT TRC-20
USDC ERC-20
```

If you want to add a new coin later, code changes are needed in:

- `backend/src/modules/payments/crypto-payments.service.ts`
- `src/app/pages/Cart.tsx` only if you want a frontend fallback before backend loads methods

### 31.12 Crypto Payment Troubleshooting

#### Checkout says payment addresses are not configured or address pool is busy

Check:

```bash
grep CRYPTO_ .env.production
docker compose --env-file .env.production -f docker-compose.prod.yml config | grep CRYPTO_
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate backend
```

At least one address must be set for every currency you want to accept. With one address, only one active invoice for that currency can exist at a time. Add more addresses if you want concurrent orders in the same currency.

#### Payment is created but order never confirms

Check:

```bash
curl https://the-fkh.eu/health
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=300 backend
```

Then check explorer APIs directly for the address shown to the customer.

Common causes:

- `ETHERSCAN_API_KEY` is missing or rate limited for ERC-20.
- `TRONGRID_API_KEY` is missing or rate limited for TRC-20.
- Explorer API is temporarily unavailable.
- The customer paid a different address.
- The customer paid the wrong network.
- The blockchain transaction has not reached the required confirmations.

#### Watcher does not detect ERC-20 payments

Check:

```env
ETHERSCAN_API_KEY=...
ETHERSCAN_API_URL=https://api.etherscan.io/v2/api
CRYPTO_ETH_CONFIRMATIONS=12
```

Then recreate backend.

#### Watcher does not detect TRC-20 payments

Check:

```env
TRONGRID_API_URL=https://api.trongrid.io
TRONGRID_API_KEY=...
CRYPTO_TRON_CONFIRMATIONS=20
```

Then recreate backend.

#### Customer underpaid

Expected behavior:

- order stays pending;
- profile and payment screen show remaining crypto amount;
- admin Telegram receives warning.

Tell customer to send the remaining amount with the same asset/network to the same payment address.

#### Admin notifications do not arrive

Check:

```env
ORDER_NOTIFICATIONS_ENABLED=true
TELEGRAM_BOT_TOKEN=...
TELEGRAM_ADMIN_CHAT_ID=...
TELEGRAM_ADMIN_IDS=...
```

Restart backend:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate backend
```

Check backend logs:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=200 backend
```

## 32. Production Checklist

Before calling deployment complete:

- DNS points to VPS.
- `docker compose ps` shows services running.
- `https://fkh.your-domain.com/` opens.
- `https://fkh.your-domain.com/health` returns `ok`.
- `https://fkh.your-domain.com/api/v1/products` returns products.
- TLS certificate is active.
- UFW allows only SSH and Nginx publicly.
- Real `.env.production` is not committed.
- Database backup command works.
- Telegram webhook works if Telegram login is required.
- Self-custody address pools are configured for BTC, USDT ERC-20, USDT TRC-20, and USDC ERC-20.
- `ETHERSCAN_API_KEY` is set for ERC-20 monitoring.
- `TRONGRID_API_KEY` is set or TronGrid public access is confirmed for TRC-20 monitoring.
- `/api/v1/payments/crypto/methods` returns available crypto methods.
- A small real crypto test order reaches `Confirmed`.
- Admin user can see `Admin` badge and `Admin Panel` in profile.
