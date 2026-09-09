const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const walk = dir => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(item => item.isDirectory() ? walk(path.join(dir, item.name)) : [path.join(dir, item.name)]) : [];
assert.equal(walk(path.join(root, 'public')).filter(file => /\.php$/i.test(file)).length, 0, 'PHP must not be publicly served');
for (const file of walk(path.join(root, 'src')).filter(file => /\.[jt]sx?$/.test(file))) {
  assert(!/\/api\/[^\s'"`]*\.php/.test(fs.readFileSync(file, 'utf8')), `Frontend PHP dependency: ${path.relative(root, file)}`);
}
assert(!fs.existsSync(path.join(root, 'public/data/users.json')), 'Legacy user records must not be public');
assert(!require('../package.json').scripts['build:static'], 'Retired static build must not be advertised');
const aliases = require('../deployment/cpanel/node-api-aliases.json');
assert.equal(new Set(aliases.map(item => item.source)).size, aliases.length, 'Duplicate API aliases');
for (const { source, destination } of aliases) {
  assert(source.startsWith('/api/') && source.endsWith('.php') && destination.startsWith('/api/'));
  const base = path.join(root, 'pages', destination);
  assert(fs.existsSync(base + '.js') || fs.existsSync(path.join(base, 'index.js')), `No Node handler for ${source}`);
}
for (const route of ['contact','inquiry','register','hr/notify-admin','hr/share-files','admin/hr/send-jd','admin/hr/reject','admin/hr/finalize','blog/delete']) {
  assert(aliases.some(item => item.source === `/api/${route}.php`), `Missing compatibility alias: ${route}`);
}
for (const file of walk(path.join(root, '.github/workflows'))) {
  assert(!/build:static|scripts\/deploy\.sh/.test(fs.readFileSync(file, 'utf8')), 'Retired deploy workflow remains active');
}
console.log(`Node-only checks passed: ${aliases.length} API aliases resolve, no public PHP or frontend PHP dependency.`);
