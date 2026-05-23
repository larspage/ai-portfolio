#!/usr/bin/env bash
# ─── Database Backup Script ─────────────────────────────────────────────
# Usage: ./scripts/backup-db.sh [output-dir]
#
# Creates a timestamped pg_dump of the aiportfolio database.
# Intended to be run as a cron job on the DO droplet.
#
# Cron example (daily at 2 AM):
#   0 2 * * * /var/www/aiportfolio/scripts/backup-db.sh /backups
#
# With DO Spaces sync:
#   0 2 * * * /var/www/aiportfolio/scripts/backup-db.sh /backups && \
#     s3cmd sync /backups/ s3://your-bucket/backups/

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/.."
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUTPUT_DIR="${1:-/backups}"
FILENAME="aiportfolio-${TIMESTAMP}.sql.gz"
RETENTION_DAYS=30

# Source environment
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
fi

mkdir -p "$OUTPUT_DIR"

echo "[$(date)] Starting backup..."

# Dump database
if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not set"
  exit 1
fi

pg_dump "$DATABASE_URL" | gzip > "$OUTPUT_DIR/$FILENAME"
echo "[$(date)] Backup created: $OUTPUT_DIR/$FILENAME ($(du -h "$OUTPUT_DIR/$FILENAME" | cut -f1))"

# Cleanup old backups
find "$OUTPUT_DIR" -name "aiportfolio-*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "[$(date)] Cleaned up backups older than ${RETENTION_DAYS} days"

echo "[$(date)] Backup complete"
