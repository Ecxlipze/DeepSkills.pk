// cPanel Passenger's default entry point. Keep secrets in the app environment.
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
require('./server.js');
