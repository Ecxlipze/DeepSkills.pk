// Source-only release: install dependencies and build on the Linux host.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const root = path.resolve(__dirname, '..');
execFileSync(process.execPath, [path.join(__dirname, 'check-node-only.cjs')], { stdio: 'inherit' });
const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'deepskills-cpanel-'));
const app = path.join(staging, 'deepskills-app');
const blocked = /^(?:\.env(?:\..*)?|\.DS_Store|node_modules|next-build|out|\.git|legacy|\.export-stash)$/;
const filter = file => !file.startsWith(path.join(root, 'public/data')) && !blocked.test(path.basename(file)) && !/\.(?:php|log|zip|sql|pem|key)$/.test(file);
try {
  fs.mkdirSync(app);
  for (const name of ['app.js','server.js','package.json','package-lock.json','next.config.js','next-sitemap.config.js','jsconfig.json','README.md','pages','src','lib','components','data','public','scripts','deployment','tests']) {
    const source = path.join(root, name);
    if (fs.existsSync(source)) fs.cpSync(source, path.join(app, name), { recursive: true, filter });
  }
  fs.copyFileSync(path.join(root, '.env.example'), path.join(app, '.env.example'));
  fs.copyFileSync(path.join(root, 'deployment/cpanel/README.md'), path.join(staging, 'START-HERE.md'));
  const artifact = path.join(root, 'deepskills-cpanel-node.zip');
  const temporary = path.join(staging, 'release.zip');
  execFileSync('zip', ['-q', '-r', temporary, 'deepskills-app', 'START-HERE.md'], { cwd: staging });
  fs.copyFileSync(temporary, artifact);
  console.log(`Created ${artifact}. No PHP, secrets, local dependencies, or builds. Build on the host.`);
} finally {
  fs.rmSync(staging, { recursive: true, force: true });
}
