import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;
if (env.hasSmtp) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function layout(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,sans-serif;color:#18181b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;padding:32px">
  <tr><td><p style="font-size:20px;font-weight:700;margin:0 0 4px">LocalFix</p>
  <h1 style="font-size:22px;margin:16px 0">${title}</h1>${bodyHtml}
  <p style="font-size:12px;color:#52525b;margin-top:32px">You received this email because of activity on your LocalFix account. If this was not you, you can ignore it.</p>
  </td></tr></table></td></tr></table></body></html>`;
}

function button(rawHref, label) {
  const href = esc(rawHref);
  return `<p style="margin:24px 0"><a href="${href}" style="background:#c2410c;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;display:inline-block">${label}</a></p>
  <p style="font-size:13px;color:#52525b">Or paste this link into your browser:<br><span style="word-break:break-all">${href}</span></p>`;
}

export async function sendMail({ to, subject, text, html }) {
  if (!transporter) {
    if (!env.isTest) console.log(`\n[mail] (no SMTP configured, printing instead)\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
    return { delivered: false };
  }
  try {
    await transporter.sendMail({ from: env.MAIL_FROM, to, subject, text, html });
    return { delivered: true };
  } catch (err) {
    console.error('[mail] failed to send:', err.message);
    return { delivered: false };
  }
}

export function verificationEmail(user, link) {
  return {
    to: user.email,
    subject: 'Confirm your LocalFix email address',
    text: `Hi ${user.name},\n\nConfirm your email address to start using LocalFix:\n${link}\n\nThe link is valid for 24 hours.`,
    html: layout('Confirm your email', `<p>Hi ${esc(user.name)},</p><p>Confirm your email address to start using LocalFix. The link is valid for 24 hours.</p>${button(link, 'Confirm email')}`),
  };
}

export function resetEmail(user, link) {
  return {
    to: user.email,
    subject: 'Reset your LocalFix password',
    text: `Hi ${user.name},\n\nUse this link to choose a new password:\n${link}\n\nThe link is valid for 1 hour. If you did not ask for this, ignore this email.`,
    html: layout('Reset your password', `<p>Hi ${esc(user.name)},</p><p>Use the button below to choose a new password. The link is valid for 1 hour.</p>${button(link, 'Choose a new password')}`),
  };
}
