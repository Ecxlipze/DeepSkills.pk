#!/usr/bin/env node
/**
 * Static-export build for PHP-only shared hosting (Mode B).
 *
 * output:'export' hard-fails on pages/api/* and getServerSideProps pages, so
 * this script stashes them, builds with NEXT_OUTPUT=export, regenerates the
 * sitemap into out/, and restores the stashed files even if the build fails.
 * On this deploy target /api/* is served by the PHP files in public/api/,
 * which the export copies into out/api/.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const stashDir = path.join(root, '.export-stash');
const stashTargets = [
  path.join('pages', 'api'),
  path.join('pages', 'server-sitemap.xml.js')
];

function run(cmd) {
  execSync(cmd, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, NEXT_OUTPUT: 'export' }
  });
}

const stashed = [];
fs.rmSync(stashDir, { recursive: true, force: true });
fs.mkdirSync(stashDir, { recursive: true });

try {
  for (const target of stashTargets) {
    const from = path.join(root, target);
    if (!fs.existsSync(from)) continue;
    const to = path.join(stashDir, target);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.renameSync(from, to);
    stashed.push(target);
  }

  run('next build --webpack');
  run('next-sitemap');
} finally {
  for (const target of stashed) {
    fs.renameSync(path.join(stashDir, target), path.join(root, target));
  }
  fs.rmSync(stashDir, { recursive: true, force: true });
}

console.log('\nStatic export complete: deploy the contents of out/ (plus the root .htaccess).');
