#!/usr/bin/env bash
# ─── Switch Nginx upstream between blue and green deployments ──────────
# Usage: ./scripts/switch-upstream.sh [blue|green]
#
# This script updates nginx/conf.d/upstream.conf and reloads nginx
# to point to the specified deployment.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_DIR="$SCRIPT_DIR/../nginx"
CONFD_DIR="$NGINX_DIR/conf.d"
TARGET="${1:-}"

if [ -z "$TARGET" ]; then
  echo "Usage: $0 [blue|green]"
  echo ""
  echo "Switches nginx upstream to the specified deployment."
  echo "Current: $(head -1 "$CONFD_DIR/upstream.conf" 2>/dev/null || echo 'unknown')"
  exit 1
fi

case "$TARGET" in
  blue)
    cp "$NGINX_DIR/nginx-blue.conf" "$CONFD_DIR/upstream.conf"
    echo "✓ Switched upstream to blue (app-blue:3000 active, app-green:3000 backup)"
    ;;
  green)
    cp "$NGINX_DIR/nginx-green.conf" "$CONFD_DIR/upstream.conf"
    echo "✓ Switched upstream to green (app-green:3000 active, app-blue:3000 backup)"
    ;;
  *)
    echo "Error: target must be 'blue' or 'green', got '$TARGET'"
    exit 1
    ;;
esac

# Reload nginx
if docker compose ps nginx &>/dev/null; then
  docker compose exec nginx nginx -s reload
  echo "✓ Nginx reloaded"
else
  echo "⚠ Nginx container not running — reload skipped (config updated for next start)"
fi
