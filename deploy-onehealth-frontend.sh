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

# Keep local deployment script clean to avoid merge conflicts on pull.
git restore deploy-onehealth-frontend.sh >/dev/null 2>&1 || true

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

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

cat > "$WEB_DIR/.htaccess" <<'HTACCESS'
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

<IfModule mod_headers.c>
  <FilesMatch "\.(js|css|png|jpg|jpeg|gif|webp|avif|svg|ico|woff2?)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "^(index\.html|ngsw\.json|ngsw-worker\.js)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
  </FilesMatch>
</IfModule>
HTACCESS

echo "OneHealth frontend deployment completed."
