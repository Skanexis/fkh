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
git clone git@github.com:YOUR_GITHUB_USER/fkh.git
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

Seed starter catalog, contacts, shipping methods, and admin users from env:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend npm run db:seed
```

The seed uses upsert for starter data. It archives the old demo products and keeps existing orders intact.

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
sudo nano /etc/nginx/sites-available/fkh.your-domain.com
```

Paste:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name fkh.your-domain.com;

    client_max_body_size 25m;

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
sudo ln -s /etc/nginx/sites-available/fkh.your-domain.com /etc/nginx/sites-enabled/fkh.your-domain.com
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
sudo certbot --nginx -d fkh.your-domain.com
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
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend npm run db:seed
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

## 31. Production Checklist

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
- Admin user can see `Admin` badge and `Admin Panel` in profile.
