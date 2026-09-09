#!/usr/bin/env bash
# GitHub runner entry point. All production writes are in deploy-node-remote.sh.
set -euo pipefail
: "${DEPLOY_HOST:?}" "${DEPLOY_USER:?}" "${DEPLOY_PORT:?}"
: "${DEPLOY_APP_ROOT:?Set the private Node application root in repository variables}"
: "${DEPLOY_NODE_BIN:?Set the host Node 22 bin directory in repository variables}"
: "${DEPLOY_SSH_KEY:?Existing deployment key is required}" "${RELEASE_ID:?}" "${DEPLOY_HEALTH_URL:?}"
[[ "$DEPLOY_HOST" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]]
[[ "$DEPLOY_USER" =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]*$ ]]
[[ "$DEPLOY_PORT" =~ ^[0-9]+$ && "$RELEASE_ID" =~ ^[a-zA-Z0-9-]+$ ]]
for value in "$DEPLOY_APP_ROOT" "$DEPLOY_NODE_BIN"; do
  [[ "$value" =~ ^/[a-zA-Z0-9_./-]+$ && "$value" != *..* && "$value" != / ]]
done
[[ "$DEPLOY_HEALTH_URL" == 'https://deepskills.pk/api/health/' ]]
secret_dir=$(mktemp -d)
trap 'rm -rf -- "$secret_dir"' EXIT
chmod 700 "$secret_dir"
printf '%s\n' "$DEPLOY_SSH_KEY" > "$secret_dir/key"
chmod 600 "$secret_dir/key"
unset DEPLOY_SSH_KEY
ssh_opts=(-i "$secret_dir/key" -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=deployment/github-actions/known_hosts -o ConnectTimeout=15)
remote="$DEPLOY_USER@$DEPLOY_HOST"
# Preflight runs before uploading, extracting or modifying the application.
ssh "${ssh_opts[@]}" -p "$DEPLOY_PORT" "$remote" "bash -s -- preflight '$DEPLOY_APP_ROOT' '$DEPLOY_NODE_BIN' '$RELEASE_ID' '$DEPLOY_HEALTH_URL'" < scripts/deploy-node-remote.sh
scp "${ssh_opts[@]}" -P "$DEPLOY_PORT" deepskills-cpanel-node.zip "$remote:$DEPLOY_APP_ROOT/incoming-$RELEASE_ID.zip"
ssh "${ssh_opts[@]}" -p "$DEPLOY_PORT" "$remote" "bash -s -- deploy '$DEPLOY_APP_ROOT' '$DEPLOY_NODE_BIN' '$RELEASE_ID' '$DEPLOY_HEALTH_URL'" < scripts/deploy-node-remote.sh
