// Install once as app.js in the panel's stable application root.
// Passenger watches that root's tmp/restart.txt across release switches.
const path = require('node:path');
const fs = require('node:fs');
const release = fs.realpathSync(path.join(__dirname, 'current'));
process.env.NODE_ENV = 'production';
process.chdir(release);
require(path.join(release, 'server.js'));
