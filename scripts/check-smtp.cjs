// Connection/authentication check only; this does not send an email.
require('@next/env').loadEnvConfig(process.cwd(), false);
const nodemailer = require('nodemailer');
const { smtpConfig } = require('../lib/smtp.cjs');

(async () => {
  let transport;
  try {
    transport = nodemailer.createTransport(smtpConfig());
    await transport.verify();
    console.log('SMTP connection, TLS, and authentication passed. Inbox delivery is not yet verified.');
  } catch (error) {
    console.error(`SMTP check failed (${error.code || 'configuration/connection error'}). Check SMTP settings and host outbound-mail access.`);
    process.exitCode = 1;
  } finally {
    transport?.close();
  }
})();
