require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs   = require('fs');
const path = require('path');

const AUTH_DIR = path.join(__dirname, 'baileys-auth');

async function sendWhatsApp(message) {
  const recipient = process.env.RECIPIENT_PHONE;
  if (!recipient) throw new Error('RECIPIENT_PHONE não configurado no .env');

  if (!fs.existsSync(AUTH_DIR) || fs.readdirSync(AUTH_DIR).length === 0) {
    throw new Error('Sessão não encontrada. Execute: node setup-whatsapp.js');
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    auth:              state,
    printQRInTerminal: false,
    logger:            pino({ level: 'silent' }),
    browser:           ['Agendador Barbeiro', 'Chrome', '120.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      try { sock.end(); } catch (_) {}
      reject(new Error('Timeout 30s ao conectar ao WhatsApp'));
    }, 30000);

    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
      if (connection === 'open') {
        try {
          await sock.sendMessage(`${recipient}@s.whatsapp.net`, { text: message });
          clearTimeout(timer);
          try { sock.end(); } catch (_) {}
          resolve();
        } catch (e) {
          clearTimeout(timer);
          reject(e);
        }
      }

      if (connection === 'close') {
        clearTimeout(timer);
        const code = lastDisconnect?.error?.output?.statusCode;
        if (code === DisconnectReason.loggedOut) {
          reject(new Error('Sessão expirada — execute: node setup-whatsapp.js'));
        } else {
          reject(new Error(`WA conexão fechada: ${lastDisconnect?.error?.message}`));
        }
      }
    });
  });
}

module.exports = { sendWhatsApp };
