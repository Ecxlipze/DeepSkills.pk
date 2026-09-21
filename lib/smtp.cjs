const nodemailer = require('nodemailer');

function smtpConfig(env = process.env) {
  const host = env.SMTP_HOST || env.MAIL_HOST;
  const user = env.SMTP_USER || env.MAIL_USERNAME;
  const pass = env.SMTP_PASS || env.MAIL_PASSWORD;
  const from = env.SMTP_FROM || (env.MAIL_FROM_ADDRESS ? (env.MAIL_FROM_NAME ? `"${env.MAIL_FROM_NAME}" <${env.MAIL_FROM_ADDRESS}>` : env.MAIL_FROM_ADDRESS) : undefined);
  const portVal = env.SMTP_PORT || env.MAIL_PORT || 587;

  if (!host?.trim()) throw new Error('Email service is not configured: SMTP_HOST is missing.');
  if (!user?.trim()) throw new Error('Email service is not configured: SMTP_USER is missing.');
  if (!pass?.trim()) throw new Error('Email service is not configured: SMTP_PASS is missing.');
  if (!from?.trim()) throw new Error('Email service is not configured: SMTP_FROM is missing.');

  const port = Number(portVal);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid SMTP_PORT.');
  return {
    host, port, secure: port === 465, requireTLS: port !== 465,
    auth: { user, pass },
    connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000
  };
}

async function sendEmail(message, createTransport = nodemailer.createTransport) {
  const config = smtpConfig();
  const transport = createTransport(config);
  const fromAddress = process.env.SMTP_FROM || (process.env.MAIL_FROM_ADDRESS ? (process.env.MAIL_FROM_NAME ? `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>` : process.env.MAIL_FROM_ADDRESS) : undefined);
  try {
    const result = await transport.sendMail({ ...message, from: fromAddress });
    if (!result.accepted?.length || result.rejected?.length) throw new Error('Mail server did not accept the recipient.');
    return { accepted: true };
  } finally {
    transport.close();
  }
}

module.exports = { smtpConfig, sendEmail };
