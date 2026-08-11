#!/usr/bin/env bash
# Helper to set (or update) all GitHub Secrets required by the deploy workflow.
#
# Lives in scripts/ so it is tracked in the repo and can be pulled onto any
# device to (re)set secrets. Existing secrets are KEPT by default, so running
# it is always safe; pass --force to overwrite them.
#
# Usage:
#   ./scripts/set_secret.sh [--force]
#
# Requirements: gh CLI installed and authenticated (gh auth login), and the
# repo as the current git remote (or GITHUB_REPOSITORY=owner/repo exported).
#
# Value sources, in priority order:
#   1. An exported env var (e.g.  JWT_SECRET_KEY=abc ./scripts/set_secret.sh)
#   2. A local .env.production file (Google OAuth / Frontend / CORS values)
#   3. The root .env file (fallback)
#   4. Auto-generated (POSTGRES_PASSWORD, JWT_SECRET_KEY)
#
# On a fresh device: create a local .env.production (never commit it — it is
# git-excluded via .git/info/exclude) with your prod values, or export the
# values as env vars, then run this script.

set -euo pipefail

cd "$(dirname "$0")/.."

FORCE=0
case "${1:-}" in
    --force|-f) FORCE=1 ;;
    "") : ;;
    *) echo "Usage: $0 [--force]" >&2; exit 1 ;;
esac

# ---------- Determine the target repository ----------
REPO="${GITHUB_REPOSITORY:-}"
if [ -z "$REPO" ]; then
    REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null || true)"
fi
if [ -z "$REPO" ]; then
    echo "ERROR: could not determine repository." >&2
    echo "       Run inside the repo, or export GITHUB_REPOSITORY=owner/repo." >&2
    exit 1
fi

gh auth status >/dev/null 2>&1 || { echo "ERROR: not authenticated. Run 'gh auth login' first." >&2; exit 1; }

echo "==> Setting GitHub Secrets for: $REPO"

# ---------- Helpers ----------
env_value() { # value of KEY from .env.production, falling back to .env
    local val=""
    val="$(sed -n "s/^${1}=//p" .env.production 2>/dev/null | head -1)"
    if [ -z "$val" ]; then
        val="$(sed -n "s/^${1}=//p" .env 2>/dev/null | head -1)"
    fi
    printf '%s' "$val"
}

secret_set() { # set NAME=value, skipping existing unless --force
    local name="$1" value="$2"
    if [ -z "$value" ]; then
        echo "  - skipped $name (no value provided)"
        return
    fi
    if gh secret list --repo "$REPO" 2>/dev/null | awk '{print $1}' | grep -qx "$name"; then
        if [ "$FORCE" -eq 0 ]; then
            echo "  - kept existing $name"
            return
        fi
        echo "  ! overwriting $name"
    fi
    gh secret set "$name" --repo "$REPO" --body "$value"
    echo "  + set $name"
}

# ---------- App secrets: env var > .env.production > .env > auto-generated ---
# A --force re-run must NOT silently rotate these: the db volume and any
# issued JWTs keep the previous values, so a new random value here would break
# auth on the next deploy. Honor .env.production/.env first, then generate.
JWT_SECRET_KEY="${JWT_SECRET_KEY:-$(env_value JWT_SECRET_KEY || true)}"
JWT_SECRET_KEY="${JWT_SECRET_KEY:-$(openssl rand -hex 32)}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(env_value POSTGRES_PASSWORD || true)}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(openssl rand -hex 24)}"

# ---------- Non-secret defaults from .env ----------
GOOGLE_REDIRECT_URI_DEFAULT="$(env_value GOOGLE_REDIRECT_URI || true)"
GOOGLE_REDIRECT_URI_DEFAULT="${GOOGLE_REDIRECT_URI_DEFAULT:-http://localhost:8000/api/v1/auth/google/callback}"
FRONTEND_URL_DEFAULT="$(env_value FRONTEND_URL || true)"
FRONTEND_URL_DEFAULT="${FRONTEND_URL_DEFAULT:-http://localhost:8000}"
BACKEND_CORS_ORIGINS_DEFAULT="$(env_value BACKEND_CORS_ORIGINS || true)"
BACKEND_CORS_ORIGINS_DEFAULT="${BACKEND_CORS_ORIGINS_DEFAULT:-[\"*\"]}"

echo ""
echo "--- Infrastructure secrets (tailscale + server) ---"
echo "  (existing values kept unless --force; override via env vars)"
secret_set "TS_CLIENT_ID"     "${TS_CLIENT_ID:-}"
secret_set "TS_AUDIENCE"      "${TS_AUDIENCE:-}"
secret_set "SERVER_HOST"      "${SERVER_HOST:-}"
secret_set "SERVER_USERNAME"  "${SERVER_USERNAME:-}"

echo ""
echo "--- Deploy script ---"
secret_set "DEPLOY_SCRIPT_PATH"  "${DEPLOY_SCRIPT_PATH:-/usr/local/sbin/melora-deploy}"
secret_set "MELORA_PROJECT_DIR"  "${MELORA_PROJECT_DIR:-$(env_value MELORA_PROJECT_DIR || true)}"

echo ""
echo "--- App config (stored as secrets per request; default fallbacks) ---"
secret_set "PORT"               "${PORT:-$(env_value PORT || true)}"
secret_set "DEBUG"              "${DEBUG:-$(env_value DEBUG || true)}"
# REGISTRY_IMAGE is the image repo:tag (e.g. melora-fullstack:latest). The
# workflow derives REGISTRY_NAMESPACE (REGISTRY_HOST/REGISTRY_IMAGE) for the
# server from this + REGISTRY_HOST, so there is no separate REGISTRY_NAMESPACE
# secret. REGISTRY_HOST is the registry hostname served by the homelab caddy
# (HTTPS); MELORA_DOMAIN feeds the caddy reverse-proxy label in the compose file.
secret_set "REGISTRY_IMAGE"     "${REGISTRY_IMAGE:-$(env_value REGISTRY_IMAGE || true)}"
secret_set "REGISTRY_HOST"      "${REGISTRY_HOST:-$(env_value REGISTRY_HOST || true)}"
secret_set "MELORA_DOMAIN"      "${MELORA_DOMAIN:-$(env_value MELORA_DOMAIN || true)}"
secret_set "REDIS_PORT"         "${REDIS_PORT:-$(env_value REDIS_PORT || true)}"
secret_set "POSTGRES_USER"      "${POSTGRES_USER:-$(env_value POSTGRES_USER || true)}"
secret_set "POSTGRES_DB"        "${POSTGRES_DB:-$(env_value POSTGRES_DB || true)}"

echo ""
echo "--- App secrets (auto-generated unless overridden) ---"
echo "  (generated POSTGRES_PASSWORD: $POSTGRES_PASSWORD)"
echo "  (generated JWT_SECRET_KEY:    $JWT_SECRET_KEY)"
secret_set "POSTGRES_PASSWORD" "$POSTGRES_PASSWORD"
secret_set "JWT_SECRET_KEY"    "$JWT_SECRET_KEY"

echo ""
echo "--- Google OAuth (from local .env unless overridden) ---"
secret_set "GOOGLE_CLIENT_ID"       "${GOOGLE_CLIENT_ID:-$(env_value GOOGLE_CLIENT_ID)}"
secret_set "GOOGLE_CLIENT_SECRET"   "${GOOGLE_CLIENT_SECRET:-$(env_value GOOGLE_CLIENT_SECRET)}"
secret_set "GOOGLE_REDIRECT_URI"    "${GOOGLE_REDIRECT_URI:-$GOOGLE_REDIRECT_URI_DEFAULT}"

echo ""
echo "--- App URLs / CORS ---"
secret_set "FRONTEND_URL"           "${FRONTEND_URL:-$FRONTEND_URL_DEFAULT}"
secret_set "BACKEND_CORS_ORIGINS"   "${BACKEND_CORS_ORIGINS:-$BACKEND_CORS_ORIGINS_DEFAULT}"

echo ""
echo "==> Done. All required secrets set for $REPO"
