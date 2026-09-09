#!/usr/bin/env bash
# Executed via SSH stdin. Never extracts over the existing public site.
set -euo pipefail
mode=${1:?}; app_root=${2:?}; node_bin=${3:?}; release_id=${4:?}; health_url=${5:?}
fail() { printf '%s\n' "$*" >&2; exit 1; }
[[ "$mode" == preflight || "$mode" == deploy ]] || fail 'Invalid operation'
for value in "$app_root" "$node_bin"; do
  [[ "$value" =~ ^/[a-zA-Z0-9_./-]+$ && "$value" != *..* && "$value" != / ]] || fail 'Invalid absolute path'
done
[[ "$release_id" =~ ^[a-zA-Z0-9-]+$ ]] || fail 'Invalid release ID'
[[ "$health_url" == https://*/api/health/ ]] || fail 'An HTTPS Node health URL is required'
[[ -d "$app_root" && ! -L "$app_root" ]] || fail 'Create the private, stable application root first'
[[ -r "$app_root/shared/.env.local" ]] || fail 'Private shared/.env.local is missing'
[[ -f "$app_root/app.js" && -L "$app_root/public" ]] || fail 'Install the Passenger bootstrap and public symlink first'
[[ $(readlink "$app_root/public") == current/public ]] || fail 'public must link to current/public'
[[ ! -e "$app_root/current" || -L "$app_root/current" ]] || fail 'current must be a managed symlink'
[[ -x "$node_bin/node" && -x "$node_bin/npm" ]] || fail 'Node/npm are unavailable in this SSH account; ask the host to enable Node 22 and shell access'
export PATH="$node_bin:$PATH"
[[ $(node -p 'process.versions.node.split(".")[0]') == 22 ]] || fail 'Select Node 22 for both the SSH build and panel runtime'
for program in unzip curl mv ln mkdir cp chmod rm readlink touch sleep; do command -v "$program" >/dev/null || fail "Required command unavailable: $program"; done
[[ "$mode" == deploy ]] || { printf 'Node deployment preflight passed\n'; exit 0; }
archive="$app_root/incoming-$release_id.zip"
release="$app_root/releases/$release_id"
[[ -f "$archive" && ! -e "$release" ]] || fail 'Release archive missing or release ID already exists'
previous=''; switched=false
if [[ -L "$app_root/current" ]]; then
  previous=$(readlink "$app_root/current")
  [[ "$previous" == releases/* && "$previous" != *..* && -d "$app_root/$previous" ]] || fail 'Unmanaged current release'
fi
mkdir "$app_root/.deploy-lock" || fail 'Another deploy is running; inspect the lock before retrying'
finish() {
  code=$?
  trap - EXIT
  if [[ "$code" != 0 && "$switched" == true ]]; then
    if [[ -n "$previous" ]]; then
      ln -s "$previous" "$app_root/.rollback-$release_id"
      mv -Tf "$app_root/.rollback-$release_id" "$app_root/current"
      printf 'Rollback requested to %s\n' "$previous" >&2
    else
      rm -f "$app_root/current"
      printf 'First activation failed; no previous Node release exists. Restore the prior panel mapping.\n' >&2
    fi
    touch "$app_root/tmp/restart.txt"
  fi
  rm -rf -- "$app_root/.deploy-lock"
  exit "$code"
}
trap finish EXIT
mkdir -p "$release" "$app_root/tmp"
unzip -q "$archive" 'deepskills-app/*' -d "$release"
# Keep the archive's source folder as the real release; paths stay private.
release="$release/deepskills-app"
ln -s "$app_root/shared/.env.local" "$release/.env.local"
printf '%s\n' "$release_id" > "$release/.release-id"
cd "$release"
npm ci
npm run check:node
npm test
npm run build
# Connection/TLS/login verification only; this does not send a test email.
npm run check:smtp
ln -s "releases/$release_id/deepskills-app" "$app_root/.next-$release_id"
mv -Tf "$app_root/.next-$release_id" "$app_root/current"
switched=true
touch "$app_root/tmp/restart.txt"
verified=false
for attempt in {1..12}; do
  if curl --fail --silent --show-error --max-time 10 "$health_url?release=$release_id" > "$release/health-response.json" &&
     node -e 'const fs=require("fs");const r=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(r.status!=="ok"||r.runtime!=="node"||r.release!==process.argv[2])process.exit(1)' "$release/health-response.json" "$release_id"; then
    verified=true; break
  fi
  sleep 5
done
[[ "$verified" == true ]] || fail 'New Node release did not become healthy; requesting rollback'
rm -f "$archive" "$release/health-response.json"
printf 'Verified running Node release: %s\n' "$release_id"
printf 'Previous release retained: %s\n' "${previous:-none}"
