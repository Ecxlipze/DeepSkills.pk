// Creates a source package. Install dependencies and build on the Linux host.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'deepskills-cpanel-'));
const app = path.join(staging, 'deepskills-app');
const web = path.join(staging, 'document-root');
fs.mkdirSync(app);
fs.mkdirSync(web);
const blocked = /^(?:\.env(?:\..*)?|\.DS_Store|node_modules|next-build|out|\.git|\.export-stash)$/;
const filter = file => file !== path.join(root, 'scripts/deploy.sh') && !file.startsWith(path.join(root, 'public/data')) && !blocked.test(path.basename(file)) && !/\.(?:log|zip|sql|pem|key)$/.test(file);
for (const name of ['app.js','server.js','package.json','package-lock.json','next.config.js','next-sitemap.config.js','jsconfig.json','pages','src','lib','components','data','public','scripts','deployment','tests']) {
  const source = path.join(root, name);
  if (fs.existsSync(source)) fs.cpSync(source, path.join(app, name), { recursive: true, filter });
}
fs.copyFileSync(path.join(root, '.env.example'), path.join(app, '.env.example'));
const aliases = require('../deployment/cpanel/node-api-aliases.json');
const nodePaths = new Set(aliases.map(route => route.source.slice('/api/'.length)));
const legacy = path.join(web, 'legacy-api');
fs.mkdirSync(legacy);
const phpRoutes = [];
function copyPhp(dir, prefix = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix + entry.name;
    if (entry.isDirectory()) { copyPhp(path.join(dir, entry.name), rel + '/'); continue; }
    if (!entry.name.endsWith('.php') || nodePaths.has(rel)) continue;
    // Node handles blog CRUD; do not expose the separate PHP implementation.
    if (rel.startsWith('blog/') || ['admin/get-applications.php', 'admin/process-application.php'].includes(rel)) continue;
    const target = path.join(legacy, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(dir, entry.name), target);
    if (!entry.name.startsWith('_')) phpRoutes.push(rel);
  }
}
copyPhp(path.join(root, 'public/api'));
// PHP must execute in Apache, never be served as source by Next's static server.
fs.rmSync(path.join(app, 'public/api'), { recursive: true, force: true });
const rules = [
  '# Merge BEFORE the cPanel-managed Passenger block; keep that block intact.',
  'Options -Indexes -MultiViews',
  'RewriteEngine On',
  'RewriteRule (^|/)\\.(?!well-known/) - [F]',
  'RewriteRule \\.(?:env|log|sql|zip|pem|key)$ - [F,NC]',
  ...phpRoutes.map(rel => `RewriteRule ^api/${rel.replace(/\./g, '\\.')}$$ /legacy-api/${rel} [L]`.replace('$$', '$'))
];
fs.writeFileSync(path.join(web, 'cpanel-routes.htaccess'), rules.join('\n')+'\n');
fs.writeFileSync(path.join(legacy, '.htaccess'), 'PassengerEnabled off\nOptions -Indexes\nRewriteEngine On\nRewriteRule (^|/)\\. - [F]\nRewriteRule (^|/)_ - [F]\n');
fs.copyFileSync(path.join(root, 'deployment/cpanel/README.md'), path.join(staging, 'START-HERE.md'));
fs.writeFileSync(path.join(staging, 'php-routes.json'), JSON.stringify(phpRoutes, null, 2)+'\n');
const artifact = path.join(root, 'deepskills-cpanel-node.zip');
if (fs.existsSync(artifact)) fs.unlinkSync(artifact);
execFileSync('zip', ['-q', '-r', artifact, '.'], { cwd: staging });
console.log(`Created ${artifact}. Secrets and local dependencies excluded. Build on the host.`);
fs.rmSync(staging, { recursive: true, force: true });
