# Kasa Cue Production Deploy

Target domain: `cue.getkasa.in`

## GitHub Secrets

Add these in GitHub repo settings:

- `DEPLOY_HOST`: `13.206.210.16`
- `DEPLOY_USER`: `ubuntu`
- `DEPLOY_SSH_KEY`: private key contents from `kasa-key/kasa.pem`
- `DEPLOY_PATH`: `/var/www/kasa-cue`
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `PRODUCTION_ENV`: full `.env.production` content

Example `PRODUCTION_ENV`:

```env
AUTH_SECRET=replace-with-long-random-secret
AUTH_URL=https://cue.getkasa.in
NEXTAUTH_URL=https://cue.getkasa.in
NEXT_PUBLIC_APP_URL=https://cue.getkasa.in
DATABASE_URL=mysql://user:password@host:3306/database
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

### Add Secrets in GitHub

Open the repo, then go to:

`Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`

No GitHub personal access token is required for this workflow. GitHub provides `GITHUB_TOKEN` automatically for checkout. The only private credential needed by the deploy job is the VPS SSH key in `DEPLOY_SSH_KEY`.

For `DEPLOY_SSH_KEY`, copy the full PEM content:

```bash
pbcopy < ../kasa-key/kasa.pem
```

For `PRODUCTION_ENV`, copy the production env from local `.env` plus the public URLs:

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
5. Write `.env.production`
6. Install/build on the server
7. Restart `kasa-cue`

## Local PEM Key

Do not commit `kasa-key/kasa.pem`. Copy its contents into `DEPLOY_SSH_KEY`.
