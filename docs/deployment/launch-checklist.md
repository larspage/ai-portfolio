# Multi-Tenant SaaS Launch Checklist

## Pre-Launch

### DNS & Networking
- [ ] Configure DNS A record pointing to DO droplet IP
- [ ] Set up SSL with certbot: `docker compose run --rm certbot certonly --webroot -w /var/www/certbot -d yourapp.com`
- [ ] Verify SSL auto-renewal (certbot systemd timer or cron)

### Database
- [ ] Run `npm run db:migrate` against production database
- [ ] Run `npm run db:seed` to create default tenant
- [ ] Run `psql $DATABASE_URL -f lib/db/migrations/0001_rls_policies.sql`
- [ ] Verify RLS policies active: `\d+ users` should show "RLS: FORCE"
- [ ] Enable automated backups: `scripts/backup-db.sh` in cron

### Storage (DO Spaces)
- [ ] Create Spaces bucket in `nyc3` region
- [ ] Generate Spaces access key and secret
- [ ] Configure CORS on bucket for your domain
- [ ] Verify presigned URL upload workflow

### Auth
- [ ] Generate AUTH_SECRET: `openssl rand -base64 32`
- [ ] Configure Google OAuth credentials (redirect URI: https://yourapp.com/api/auth/callback/google)
- [ ] Test signup flow end-to-end
- [ ] Test Google OAuth login
- [ ] Test password reset flow (if enabled)

### Environment
- [ ] Create `.env` file with all required variables
- [ ] Verify all secrets are set (not using defaults)
- [ ] Check OPENAI_API_KEY is valid and has credits

### Security
- [ ] Run security audit: `npm audit`
- [ ] Verify CSP headers with securityheaders.com
- [ ] Verify HSTS header
- [ ] Test rate limiting: `curl -X POST https://yourapp.com/api/analyze` x 25
- [ ] Verify 404 returned for cross-tenant resource access
- [ ] Check no secrets in .gitignore / committed files

## Launch

### Deployment
- [ ] Push to main → verify GitHub Actions build passes
- [ ] SSH into droplet: `docker compose ps` — all services healthy
- [ ] Verify health endpoint: `curl https://yourapp.com/api/health`
- [ ] Test login flow
- [ ] Test resume upload flow
- [ ] Test AI analysis flow

### Monitoring
- [ ] Verify docker container restart policies
- [ ] Set up UptimeRobot or similar heartbeat on /api/health
- [ ] Configure log rotation for Docker containers
- [ ] Set up alert for 5xx rate > 1%

### Backup
- [ ] Verify database backup cron is working
- [ ] Test restore from backup in staging
- [ ] Document backup location and retention

## Post-Launch (First Week)

### Day 1
- [ ] Monitor error rates
- [ ] Check database connection pool usage
- [ ] Verify all auth flows work

### Day 3
- [ ] Review rate limit thresholds
- [ ] Check DO Spaces storage usage
- [ ] Review logs for suspicious activity

### Day 7
- [ ] Performance review — DB query times, API response times
- [ ] Review tenant signup rate
- [ ] Plan for scaling if needed
