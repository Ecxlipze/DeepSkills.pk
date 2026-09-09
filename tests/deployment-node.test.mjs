import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import health from '../pages/api/health.js';
const script = path.resolve('scripts/deploy-node-remote.sh');

function fixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'deepskills-release-test-'));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const root = path.join(base, 'app'), bin = path.join(base, 'bin');
  fs.mkdirSync(path.join(root, 'shared'), { recursive: true });
  fs.mkdirSync(path.join(root, 'releases', 'previous'), { recursive: true });
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(root, 'shared', '.env.local'), 'fixture only');
  fs.writeFileSync(path.join(root, 'app.js'), '// fixture');
  fs.symlinkSync('current/public', path.join(root, 'public'));
  fs.symlinkSync('releases/previous', path.join(root, 'current'));
  const write = (name, source) => fs.writeFileSync(path.join(bin, name), source, { mode: 0o755 });
  write('node', `#!/bin/bash\nif [[ "$1" == -p ]]; then echo 22; else exec '${process.execPath.replace(/'/g, "'\\''")}' "$@"; fi\n`);
  write('npm', '#!/bin/bash\nprintf "%s\\n" "$*" >> "$FIXTURE_NPM_LOG"\n[[ "$*" != "$FIXTURE_NPM_FAIL" ]]\n');
  write('curl', '#!/bin/bash\nprintf \'{"status":"ok","runtime":"node","release":"%s"}\\n\' "$FIXTURE_HEALTH_RELEASE"\n');
  write('sleep', '#!/bin/bash\nexit 0\n');
  // Production targets GNU/Linux; model its atomic rename on macOS too.
  write('mv', `#!${process.execPath}\nconst fs=require('fs');const a=process.argv.slice(2);if(a[0]!=='-Tf')process.exit(9);fs.renameSync(a[1],a[2]);\n`);
  const stage = path.join(base, 'stage');
  fs.mkdirSync(path.join(stage, 'deepskills-app'), { recursive: true });
  fs.writeFileSync(path.join(stage, 'deepskills-app', 'server.js'), '// fixture');
  const zip = spawnSync('zip', ['-qr', path.join(root, 'incoming-test-release.zip'), 'deepskills-app'], { cwd: stage });
  assert.equal(zip.status, 0);
  const run = (mode, extra = {}) => spawnSync('bash', [script, mode, root, bin, 'test-release', 'https://deepskills.pk/api/health/'], {
    encoding: 'utf8', env: { ...process.env, FIXTURE_NPM_LOG: path.join(base, 'npm.log'), FIXTURE_NPM_FAIL: 'none', FIXTURE_HEALTH_RELEASE: 'test-release', ...extra }
  });
  return { root, base, bin, run };
}

test('deployment preflight fails without Node, before changing the current release', t => {
  const f = fixture(t); fs.unlinkSync(path.join(f.bin, 'node'));
  const r = f.run('preflight'); assert.notEqual(r.status, 0); assert.match(r.stderr, /Node\/npm are unavailable/);
  assert.equal(fs.readlinkSync(path.join(f.root, 'current')), 'releases/previous');
  assert.equal(fs.existsSync(path.join(f.root, '.deploy-lock')), false);
});
test('build failure keeps the old release running and releases the lock', t => {
  const f = fixture(t); const r = f.run('deploy', { FIXTURE_NPM_FAIL: 'run build' });
  assert.notEqual(r.status, 0); assert.equal(fs.readlinkSync(path.join(f.root, 'current')), 'releases/previous');
  assert.equal(fs.existsSync(path.join(f.root, '.deploy-lock')), false);
  assert.equal(fs.existsSync(path.join(f.root, 'tmp', 'restart.txt')), false);
});
test('SMTP verification failure prevents release activation', t => {
  const f = fixture(t); const r = f.run('deploy', { FIXTURE_NPM_FAIL: 'run check:smtp' });
  assert.notEqual(r.status, 0); assert.equal(fs.readlinkSync(path.join(f.root, 'current')), 'releases/previous');
});
test('healthy deployment switches to the exact release and retains the prior release', t => {
  const f = fixture(t); const r = f.run('deploy'); assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.readlinkSync(path.join(f.root, 'current')), 'releases/test-release/deepskills-app');
  assert(fs.existsSync(path.join(f.root, 'releases/previous')));
  assert(fs.existsSync(path.join(f.root, 'tmp/restart.txt')));
  assert.equal(fs.existsSync(path.join(f.root, '.deploy-lock')), false);
  assert.equal(fs.readFileSync(path.join(f.root, 'current/.release-id'), 'utf8').trim(), 'test-release');
});
test('wrong release health response triggers rollback and reports failure', t => {
  const f = fixture(t); const r = f.run('deploy', { FIXTURE_HEALTH_RELEASE: 'old-release' });
  assert.notEqual(r.status, 0); assert.match(r.stderr, /Rollback requested/);
  assert.equal(fs.readlinkSync(path.join(f.root, 'current')), 'releases/previous');
  assert.equal(fs.existsSync(path.join(f.root, '.deploy-lock')), false);
});
test('health endpoint is read-only, uncached and identifies the running release', () => {
  const original = process.cwd(); const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deepskills-health-'));
  try {
    process.chdir(dir); fs.writeFileSync('.release-id', 'fixture-release\n');
    const res = { headers: {}, setHeader(k,v) { this.headers[k]=v; }, status(code) { this.code=code;return this; }, json(body) { this.body=body;return this; } };
    health({ method:'GET' },res); assert.equal(res.code,200); assert.equal(res.body.release,'fixture-release');assert.match(res.headers['Cache-Control'],/no-store/);
    health({ method:'POST' },res);assert.equal(res.code,405);
  } finally { process.chdir(original); fs.rmSync(dir,{recursive:true,force:true}); }
});
test('first activation failure removes current without inventing a rollback release', t => {
  const f = fixture(t); fs.unlinkSync(path.join(f.root, 'current'));
  const r = f.run('deploy', { FIXTURE_HEALTH_RELEASE: 'old-site' });
  assert.notEqual(r.status, 0); assert.match(r.stderr, /no previous Node release exists/);
  assert.equal(fs.existsSync(path.join(f.root, 'current')), false);
  assert.equal(fs.existsSync(path.join(f.root, '.deploy-lock')), false);
});
test('existing deployment lock prevents concurrent release changes', t => {
  const f = fixture(t); fs.mkdirSync(path.join(f.root, '.deploy-lock'));
  const r = f.run('deploy'); assert.notEqual(r.status,0);assert.match(r.stderr,/Another deploy is running/);
  assert.equal(fs.readlinkSync(path.join(f.root,'current')),'releases/previous');
});
test('Passenger bootstrap starts the selected release in its own production directory', t => {
  const f = fixture(t); fs.copyFileSync('deployment/github-actions/app.cjs',path.join(f.root,'app.js'));
  fs.writeFileSync(path.join(f.root,'releases/previous/server.js'),'console.log(JSON.stringify({cwd:process.cwd(),mode:process.env.NODE_ENV}));');
  const r=spawnSync(process.execPath,[path.join(f.root,'app.js')],{encoding:'utf8',cwd:f.base,env:{...process.env,NODE_ENV:'development'}});
  assert.equal(r.status,0,r.stderr);const result=JSON.parse(r.stdout);assert.equal(fs.realpathSync(result.cwd),fs.realpathSync(path.join(f.root,'releases/previous')));assert.equal(result.mode,'production');
});
