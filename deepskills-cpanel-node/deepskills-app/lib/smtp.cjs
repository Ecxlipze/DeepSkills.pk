const nodemailer = require('nodemailer');

function smtpConfig(env = process.env) {
  for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM']) {
    if (!env[key]?.trim()) throw new Error(`Email service is not configured: ${key} is missing.`);
  }
  const port = Number(env.SMTP_PORT || 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid SMTP_PORT.');
  return {
    host: env.SMTP_HOST, port, secure: port === 465, requireTLS: port !== 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000
  };
}

async function sendEmail(message, createTransport = nodemailer.createTransport) {
  const transport = createTransport(smtpConfig());
  try {
    const result = await transport.sendMail({ ...message, from: process.env.SMTP_FROM });
    if (!result.accepted?.length || result.rejected?.length) throw new Error('Mail server did not accept the recipient.');
    return { accepted: true };
  } finally {
    transport.close();
  }
}

module.exports = { smtpConfig, sendEmail };
