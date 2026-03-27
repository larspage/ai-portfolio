# How to Deploy a New Subdomain to mrbrooks.biz

This guide covers adding a new app as a subdomain on the existing DigitalOcean droplet (167.71.96.57).

The droplet runs:
- **Nginx** as reverse proxy (one config file per subdomain)
- **PM2** (run as root, via `pm2-root.service`) as the process manager
- **Certbot** for SSL (Let's Encrypt, auto-renews via cron)

Existing example: `lawrencefarrell.mrbrooks.biz` → port 3000

---

## Step 1 — Point DNS at the droplet

In your DNS provider, add an A record:

```
Type: A
Name: <subdomain>        (e.g. myapp)
Value: 167.71.96.57
TTL: 3600
```

Wait for it to propagate before continuing (use `dig <subdomain>.mrbrooks.biz` to verify).

---

## Step 2 — Deploy the app to the droplet

SSH in:

```bash
ssh root@167.71.96.57
```

Clone the repo and install runtime deps only. **Do not build on the server** — the droplet's QEMU CPU causes a SIGBUS crash in the SWC Rust compiler. Builds happen in CI (see Step 6).

```bash
mkdir -p /var/www/<appname>
cd /var/www/<appname>
git clone <repo-url> .
npm install --omit=dev
```

Set any required env vars in `/var/www/<appname>/.env.local` (or export to shell before starting PM2).

---

## Step 3 — Start the app with PM2

Pick a port not already in use (aiportfolio = 3000, so use 3001, 3002, etc.).

```bash
# For a Next.js app:
PORT=3001 pm2 start npm --name "<appname>" -- start

# For a Node/Express app:
pm2 start server.js --name "<appname>"

pm2 save
```

Verify it's running:

```bash
pm2 list
curl http://localhost:3001   # should return HTML
```

---

## Step 4 — Configure Nginx

Create a new site config:

```bash
nano /etc/nginx/sites-available/<subdomain>.mrbrooks.biz
```

Paste this (replace `<subdomain>` and `<port>`):

```nginx
server {
    server_name <subdomain>.mrbrooks.biz;

    location / {
        proxy_pass http://localhost:<port>;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    listen 80;
}
```

Enable it and reload:

```bash
ln -s /etc/nginx/sites-available/<subdomain>.mrbrooks.biz /etc/nginx/sites-enabled/
nginx -t   # must say "syntax is ok"
systemctl reload nginx
```

---

## Step 5 — Add SSL with Certbot

```bash
certbot --nginx -d <subdomain>.mrbrooks.biz
```

Certbot will modify the nginx config automatically to add HTTPS and an HTTP→HTTPS redirect.

Verify:

```bash
curl -I https://<subdomain>.mrbrooks.biz
```

---

## Step 6 — Set up CI/CD (optional)

In the app's GitHub repo:

1. Add secrets (Settings → Secrets → Actions):
   - `DO_HOST` = `167.71.96.57`
   - `DO_USER` = `root`
   - `DO_SSH_PRIVATE_KEY` = contents of the deploy private key

   > The deploy public key is already in `/root/.ssh/authorized_keys`:
   > `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIOxCMMPsF+6VhFq7HmZDN6DIUPUcPNymDiHDbikMnSU github-actions-deploy`

2. Add `.github/workflows/deploy.yml`:

```yaml
name: Deploy to MrBrooks Server

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Update server code and runtime deps
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.DO_HOST }}
          username: ${{ secrets.DO_USER }}
          key: ${{ secrets.DO_SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/<appname>
            git fetch origin main
            git reset --hard origin/main
            npm install --omit=dev

      - name: Setup SSH for rsync
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.DO_SSH_PRIVATE_KEY }}" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan -H ${{ secrets.DO_HOST }} >> ~/.ssh/known_hosts

      - name: Sync build artifact to server
        run: |
          rsync -az --delete \
            -e "ssh -i ~/.ssh/deploy_key" \
            .next/ \
            ${{ secrets.DO_USER }}@${{ secrets.DO_HOST }}:/var/www/<appname>/.next/

      - name: Restart app
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.DO_HOST }}
          username: ${{ secrets.DO_USER }}
          key: ${{ secrets.DO_SSH_PRIVATE_KEY }}
          script: |
            pm2 restart <appname>
            pm2 save
```

> **Why rsync instead of building on the server:** The droplet is a QEMU VM whose CPU doesn't support the AVX instructions required by Next.js's SWC compiler. Building on the GitHub Actions runner (ubuntu-latest) works fine; the compiled `.next/` artifact is then transferred to the server.

---

## Port assignments

| App | Port |
|-----|------|
| aiportfolio | 3000 |

Add new apps here as you deploy them.

---

## Useful commands on the droplet

```bash
pm2 list                        # all running apps
pm2 logs <appname>              # tail logs
pm2 restart <appname>           # restart an app
nginx -t                        # test nginx config
systemctl reload nginx          # apply nginx changes
certbot renew --dry-run         # test SSL renewal
```
