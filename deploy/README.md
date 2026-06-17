# Kasa Cue Production Deploy

Target domain: `cue.getkasa.in`

## GitHub Environment

Create/use this GitHub Actions environment:

- `DEPLOY_SSH_KEY`: private key contents from `kasa-key/kasa.pem`

The workflow uses the GitHub Environment named `KASACUE_DEPLOYMENT`. Host/user/path are fixed in `.github/workflows/deploy.yml`:

- Host: `13.206.210.16`
- User: `ubuntu`
- Path: `/var/www/kasa-cue`

Production env values stay on the VPS at `/var/www/kasa-cue/.env.production`, so GitHub only needs `DEPLOY_SSH_KEY`.

Example `PRODUCTION_ENV`:

```env
AUTH_SECRET=replace-with-long-random-secret
AUTH_URL=https://cue.getkasa.in
NEXTAUTH_URL=https://cue.getkasa.in
NEXT_PUBLIC_APP_URL=https://cue.getkasa.in
DATABASE_URL=mysql://user:password@host:3306/database
KASA_ADMIN_EMAIL=admin@cue.getkasa.in
KASA_ADMIN_NAME=Kasa Cue Admin
KASA_ADMIN_PASSWORD=replace-with-strong-admin-password
OPENAI_API_KEY=sk-...
AWS_REGION=ap-south-1
AWS_S3_BUCKET=your-bucket
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
KASA_DOCUMENTS_S3_PREFIX=kasa-cue-documents
OPENAI_REPLY_MODEL=gpt-4o-mini
OPENAI_SCREEN_ANALYSIS_MODEL=gpt-4o
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-transcribe
```

### Add SSH Key in GitHub

Open the repo, then go to:

`Settings` -> `Environments` -> `KASACUE_DEPLOYMENT` -> `Environment secrets` -> `Add secret`

No GitHub personal access token is required for this workflow. GitHub provides `GITHUB_TOKEN` automatically for checkout. The only private credential needed by the deploy job is the VPS SSH key in `DEPLOY_SSH_KEY`.

For `DEPLOY_SSH_KEY`, copy the full PEM content:

```bash
pbcopy < ../kasa-key/kasa.pem
```

Production env is managed directly on the VPS. To refresh it from local `.env`, SSH into the server or pipe a reviewed env file to `/var/www/kasa-cue/.env.production`.

```bash
{
  grep -Ev '^(AUTH_URL|NEXTAUTH_URL|NEXT_PUBLIC_APP_URL)=' .env
  printf '\nAUTH_URL=https://cue.getkasa.in\nNEXTAUTH_URL=https://cue.getkasa.in\nNEXT_PUBLIC_APP_URL=https://cue.getkasa.in\n'
} | pbcopy
```

## First Server Setup

Run once on the VPS:

```bash
sudo mkdir -p /var/www/kasa-cue
sudo chown -R ubuntu:ubuntu /var/www/kasa-cue

sudo apt-get update
sudo apt-get install -y nginx rsync curl

curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
npm -v
```

Install the systemd service:

```bash
sudo cp /var/www/kasa-cue/deploy/kasa-cue.service /etc/systemd/system/kasa-cue.service
sudo systemctl daemon-reload
sudo systemctl enable kasa-cue
```

Install nginx config:

```bash
sudo cp /var/www/kasa-cue/deploy/nginx-cue.getkasa.in.conf /etc/nginx/sites-available/cue.getkasa.in
sudo ln -sf /etc/nginx/sites-available/cue.getkasa.in /etc/nginx/sites-enabled/cue.getkasa.in
sudo nginx -t
sudo systemctl reload nginx
```

After DNS points `cue.getkasa.in` to the VPS:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d cue.getkasa.in
```

## CI/CD

Push to `master` or `main`. GitHub Actions will:

1. Install dependencies
2. Generate Prisma client
3. Build the app
4. Sync source to the VPS
5. Install dependencies on the server
6. Apply Prisma migrations
7. Seed/update the admin user from server env
8. Build and restart `kasa-cue`

## Local PEM Key

Do not commit `kasa-key/kasa.pem`. Copy its contents into `DEPLOY_SSH_KEY`.
