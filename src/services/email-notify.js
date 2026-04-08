const nodemailer = require('nodemailer');

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_TO } = require('../config/env');

function buildFaultEmail(light) {
  const faults = [];
  if (light.lampFail) faults.push('Lamp Failure');
  if (light.gearFail) faults.push('Gear Failure');
  if (light.lightOpenCircuit) faults.push('Open Circuit');
  if (light.lightShortCircuit) faults.push('Short Circuit');

  return {
    subject: `⚠️ DALI Light Fault — Light ${light.addr}`,
    text: [
      `DALI Light Fault Detected`,
      ``,
      `Light: ${light.addr}`,
      `Status: ${light.online ? 'Online' : 'Offline'}`,
      `Level: ${Math.round((light.level / 254) * 100)}%`,
      `Faults: ${faults.join(', ')}`,
      ``,
      `Time: ${new Date().toLocaleString()}`,
    ].join('\n'),
  };
}

function sendEmail(subject, text, smtpConfig) {
  const host = smtpConfig?.host || SMTP_HOST;
  const port = smtpConfig?.port || SMTP_PORT || 587;
  const user = smtpConfig?.user || SMTP_USER;
  const pass = smtpConfig?.pass || SMTP_PASS;
  const to = smtpConfig?.to || SMTP_TO;

  if (!host || !user || !pass || !to) {
    return Promise.reject(new Error('SMTP host, user, pass, and to are required'));
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter
    .sendMail({
      from: `"SpiderWeb Alerts" <${user}>`,
      to,
      subject,
      text,
    })
    .then(() => ({ ok: true }))
    .catch((err) => {
      throw new Error(`Email send failed: ${err.message}`);
    });
}

function sendFaultAlertEmail(light, smtpConfig) {
  const { subject, text } = buildFaultEmail(light);
  return sendEmail(subject, text, smtpConfig);
}

module.exports = { sendEmail, sendFaultAlertEmail };
