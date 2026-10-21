import nodemailer from 'nodemailer';

// Configure with SMTP_URL (smtps://user:pass@host:465) or the separate
// SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS variables.
function makeTransport() {
  if (process.env.SMTP_URL) return nodemailer.createTransport(process.env.SMTP_URL);
  if (!process.env.SMTP_HOST) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

const transport = makeTransport();
export const mailConfigured = () => !!(transport && process.env.CONTACT_TO);

// Sends a contact-form message to Leya's inbox. Returns false instead of
// throwing: the message is already saved in the admin inbox either way.
export async function sendContactEmail(m) {
  if (!mailConfigured()) return false;
  const lines = [
    `Name: ${m.name}`,
    `Email: ${m.email}`,
    `Topic: ${m.topic}`,
    `Newsletter opt-in: ${m.newsletter ? 'yes' : 'no'}`,
    '',
    m.message,
  ];
  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM || process.env.CONTACT_TO,
      to: process.env.CONTACT_TO,
      replyTo: { name: m.name, address: m.email },
      subject: `New message: ${m.topic} (from ${m.name})`.replace(/[\r\n]+/g, ' '),
      text: lines.join('\n'),
    });
    return true;
  } catch (err) {
    console.error('Contact email failed:', err.message);
    return false;
  }
}
