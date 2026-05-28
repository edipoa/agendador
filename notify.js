require('dotenv').config();

async function sendWhatsApp(message) {
  const apiKey = process.env.RESEND_API_KEY;
  const to     = process.env.RECIPIENT_EMAIL;

  if (!apiKey) throw new Error('RESEND_API_KEY não configurado');
  if (!to)     throw new Error('RECIPIENT_EMAIL não configurado');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:    'Agendador Barbeiro <onboarding@resend.dev>',
      to:      [to],
      subject: 'Agendador Barbeiro 💈',
      text:    message,
      headers: {
        'X-Priority':        '1',
        'X-MSMail-Priority': 'High',
        'Importance':        'High',
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Resend erro ${res.status}: ${err.message ?? res.statusText}`);
  }
}

module.exports = { sendWhatsApp };
