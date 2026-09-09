#!/usr/bin/env bash
# Deploy the static export to the Plesk shared host over SSH.
#
# Usage: ./scripts/deploy.sh
# Requires the deploy key at ~/.ssh/deepskills_deploy (already installed on
# the server's authorized_keys).
set -euo pipefail

HOST="deepskills.pk_244uyeu33k9@deepskills.pk"
SSH=(ssh -i "$HOME/.ssh/deepskills_deploy" -o IdentitiesOnly=yes "$HOST")
SCP=(scp -i "$HOME/.ssh/deepskills_deploy" -o IdentitiesOnly=yes)

cd "$(dirname "$0")/.."

echo "==> Building static export"
npm run build:static
cp .htaccess out/.htaccess

echo "==> Packaging"
# COPYFILE_DISABLE stops macOS tar from embedding ._* AppleDouble entries.
COPYFILE_DISABLE=1 tar czf /tmp/deepskills-deploy.tar.gz -C out .

echo "==> Uploading"
"${SCP[@]}" /tmp/deepskills-deploy.tar.gz "$HOST":~/deploy.tar.gz

echo "==> Extracting on server"
# Extract over httpdocs: server-only files (api/.env.local, root .env.local)
# are preserved because the tarball never contains them.
"${SSH[@]}" 'tar xzf ~/deploy.tar.gz -C ~/httpdocs 2>/dev/null; rm -f ~/deploy.tar.gz; echo DEPLOYED'

echo "==> Verifying"
code=$(curl -s -o /dev/null -w '%{http_code}' https://deepskills.pk/)
lastmod=$(curl -s https://deepskills.pk/sitemap-0.xml | grep -o '<lastmod>[0-9-]*' | head -1)
echo "home: $code, sitemap $lastmod"
[ "$code" = "200" ] || { echo "DEPLOY VERIFICATION FAILED"; exit 1; }
echo "Done: https://deepskills.pk"
