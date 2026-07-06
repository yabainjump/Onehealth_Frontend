#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/public_html/onehealthnetwork.yaba-in.com}"
REPO_URL="${REPO_URL:-https://github.com/yabainjump/Onehealth_Frontend.git}"
WEB_DIR="${WEB_DIR:-$HOME/public_html/onehealthnetwork.yaba-in.com}"
BRANCH="${BRANCH:-main}"
NODE_BIN_DIR="${NODE_BIN_DIR:-/opt/cpanel/ea-nodejs18/bin}"
NPM_BIN="${NPM_BIN:-$NODE_BIN_DIR/npm}"
CLEAN_WEB_DIR="${CLEAN_WEB_DIR:-false}"

mkdir -p "$APP_DIR"
cd "$APP_DIR"

if [ ! -d .git ]; then
  if [ -n "$(ls -A "$APP_DIR" 2>/dev/null)" ]; then
    echo "Error: $APP_DIR is not a git repository and is not empty."
    echo "Please clean it or set APP_DIR to an empty directory, then rerun."
    exit 1
  fi
  echo "Git repo not found in $APP_DIR, cloning $REPO_URL"
  git clone "$REPO_URL" .
fi

if git remote get-url origin >/dev/null 2>&1; then
  CURRENT_ORIGIN="$(git remote get-url origin)"
  if [ "$CURRENT_ORIGIN" != "$REPO_URL" ]; then
    echo "Updating origin remote to $REPO_URL"
    git remote set-url origin "$REPO_URL"
  fi
else
  git remote add origin "$REPO_URL"
fi

# Force the working tree to match origin exactly. This deploy target should
# never carry local edits, so we discard any to avoid "local changes would be
# overwritten by merge" failures on pull.
git fetch origin "$BRANCH"
git checkout -f "$BRANCH"
git reset --hard "origin/$BRANCH"

if [ -f package-lock.json ]; then
  "$NPM_BIN" ci
else
  "$NPM_BIN" install
fi

"$NPM_BIN" run build

mkdir -p "$WEB_DIR"

if [ "$CLEAN_WEB_DIR" = "true" ]; then
  case "$WEB_DIR" in
    "$HOME"/public_html/*)
      find "$WEB_DIR" -mindepth 1 \
        ! -name ".htaccess" \
        ! -name ".well-known" \
        -exec rm -rf {} +
      ;;
    *)
      echo "Refusing to clean WEB_DIR outside public_html: $WEB_DIR"
      exit 1
      ;;
  esac
fi

cp -a www/. "$WEB_DIR"/

# `src/.htaccess` est l'unique source de verite. `install` remplace le fichier
# entier afin qu'aucune ancienne regle ne survive entre deux deploiements.
install -m 0644 "$APP_DIR/src/.htaccess" "$WEB_DIR/.htaccess"

if ! grep -q "api/share/post" "$WEB_DIR/.htaccess"; then
  echo "Error: social sharing rules are missing from .htaccess"
  exit 1
fi

if ! cmp -s "$APP_DIR/src/.htaccess" "$WEB_DIR/.htaccess"; then
  echo "Error: deployed .htaccess differs from the versioned source"
  exit 1
fi

echo "OneHealth frontend deployment completed."
