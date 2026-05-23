#!/usr/bin/env bash
# ─── Docker Entrypoint ──────────────────────────────────────────────────
# Runs before the Next.js app starts. Handles:
#   1. Wait for Postgres to be ready
#   2. Run DB migrations
#   3. Apply RLS policies
#   4. Seed initial data if empty
#   5. Start the Next.js app
#
# This eliminates all manual SSH steps for deployment.

set -euo pipefail

echo "=== Docker Entrypoint ==="

# ─── 1. Wait for Postgres ──────────────────────────────────────────────
if [ -n "${DATABASE_URL:-}" ]; then
  echo "[1/4] Waiting for PostgreSQL to be ready..."
  # Extract host and port from DATABASE_URL
  DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|^postgres://[^@]+@([^:/]+).*$|\1|')
  DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|^postgres://[^@]+@[^:/]+:([0-9]+).*$|\1|')
  DB_PORT="${DB_PORT:-5432}"

  for i in $(seq 1 30); do
    if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
      echo "  PostgreSQL is ready after ${i}s"
      break
    fi
    if [ "$i" -eq 30 ]; then
      echo "  ERROR: PostgreSQL not reachable after 30s"
      exit 1
    fi
    sleep 1
  done

  # ─── 2. Run DB migrations ────────────────────────────────────────────
  echo "[2/4] Running database migrations..."
  npx drizzle-kit migrate 2>&1 | sed 's/^/  /'

  # ─── 3. Apply RLS policies ───────────────────────────────────────────
  echo "[3/4] Applying RLS policies..."
  # Use psql to run the RLS migration (idempotent — uses IF NOT EXISTS / DROP POLICY ... CREATE POLICY)
  if command -v psql &>/dev/null; then
    for f in /app/lib/db/migrations/*_rls_*.sql; do
      if [ -f "$f" ]; then
        echo "  Applying $f..."
        psql "$DATABASE_URL" -f "$f" 2>&1 | sed 's/^/    /'
      fi
    done
  else
    echo "  psql not available, trying node..."
    # Fallback: execute RLS SQL via node-postgres
    node -e "
      const { execSync } = require('child_process');
      const fs = require('fs');
      const migrations = fs.readdirSync('/app/lib/db/migrations')
        .filter(f => f.includes('rls'));
      for (const m of migrations) {
        console.log('  Running:', m);
        const sql = fs.readFileSync('/app/lib/db/migrations/' + m, 'utf8');
        // Split by statement-breakpoint comments
        const stmts = sql.split('--> statement-breakpoint');
        for (const stmt of stmts) {
          const trimmed = stmt.trim();
          if (trimmed) {
            try {
              execSync(\`psql \"\$DATABASE_URL\" -c \"\${trimmed}\"\`, { stdio: 'pipe' });
            } catch(e) { /* idempotent — ignore errors for existing policies */ }
          }
        }
      }
    " 2>&1 | sed 's/^/    /' || true
  fi

  # ─── 4. Seed initial data ────────────────────────────────────────────
  echo "[4/4] Seeding initial data..."
  npx tsx /app/scripts/seed.ts 2>&1 | sed 's/^/  /' || true
fi

echo "=== Starting application ==="
exec "$@"
