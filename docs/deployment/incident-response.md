# Incident Response

## Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| SEV1 | Complete outage, data loss, security breach | Immediate |
| SEV2 | Partial outage, degraded perf for some users | < 1 hour |
| SEV3 | Minor bug, cosmetic issue | Next business day |

## Common Incidents

### 502 Bad Gateway (App Down)
```bash
# Check app health
docker compose ps
docker compose logs app --tail=50

# Restart app
docker compose restart app

# Check nginx upstream
docker compose exec nginx cat /etc/nginx/conf.d/upstream.conf
```

### Database Connection Issues
```bash
# Check if DB is reachable
docker compose exec db pg_isready -U aiportfolio

# Check DB logs
docker compose logs db --tail=50

# Check disk space
df -h /var/lib/docker/volumes/
```

### SSL Certificate Expired
```bash
# Manual renewal
docker compose run --rm certbot renew

# Check expiry
openssl s_client -connect yourapp.com:443 -servername yourapp.com < /dev/null 2>/dev/null | openssl x509 -noout -dates
```

### Rate Limiting Issues
- Check `lib/security/rate-limit.ts` for current thresholds
- In-memory: restart clears all rate limit counters
- For persistent issues, reduce `max` in the rate limit config

## Security Incidents

### Suspected Data Breach
1. Isolate the affected service: `docker compose stop app`
2. Check logs: `docker compose logs app --tail=200`
3. Check database access: `docker compose logs db --tail=100`
4. Rotate all secrets (API keys, DB passwords, AUTH_SECRET)
5. Notify affected users if personal data exposed

### Cross-Tenant Access Detected
1. Verify RLS is active: `\d+ users` should show "RLS: FORCE"
2. Check repository layer: ensure `TenantContext.requireTenantId()` is called
3. Review recent logs for 404 responses to known resource IDs
4. Run tenant isolation tests

## Rollback

### Rollback to Previous Docker Image
```bash
# List available images
docker images | grep aiportfolio-app

# Tag previous version
docker tag aiportfolio-app:latest aiportfolio-app:rollback-bad
docker tag aiportfolio-app:previous aiportfolio-app:latest

# Re-deploy
docker compose up -d app
```

### Rollback Database Migration
```bash
# WARNING: Destructive — only if absolutely necessary
# 1. Restore from backup
gunzip -c /backups/aiportfolio-2026-05-09.sql.gz | psql $DATABASE_URL

# 2. Or manually revert
# psql $DATABASE_URL -c "DROP TABLE IF EXISTS ..."
```

## Monitoring

### Health Check
```
GET /api/health
→ { status: "ok", timestamp: "...", uptime: 12345, version: "0.1.0" }
```

### Key Metrics to Watch
- Container restarts: `docker compose ps`
- Disk usage: `df -h`
- DB connections: `docker compose exec db psql -U aiportfolio -c "SELECT count(*) FROM pg_stat_activity;"`
- API response times: nginx access log
