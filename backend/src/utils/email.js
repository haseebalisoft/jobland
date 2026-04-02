import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

export async function sendEmail({ to, subject, html }) {
  console.log('Sending email via SMTP:', {
    host: config.email.host,
    port: config.email.port,
    from: config.email.from,
    to,
    subject,
  });

  try {
    const info = await transporter.sendMail({
      from: config.email.from,
      to,
      subject,
      html,
    });
    console.log('Email sent successfully:', info.messageId, info.response);
    return info;
  } catch (err) {
    console.error('Error in sendEmail:', err?.message || err);
    throw err;
  }
}

