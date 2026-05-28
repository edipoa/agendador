require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
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

  const { version }        = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    version,
    auth:                  state,
    printQRInTerminal:     false,
    logger:                pino({ level: 'silent' }),
    browser:               ['Agendador Barbeiro', 'Chrome', '120.0'],
    connectTimeoutMs:      30000,
    defaultQueryTimeoutMs: 30000,
  });

  sock.ev.on('creds.update', saveCreds);

  await new Promise((resolve, reject) => {
    let settled = false;

    const done = (fn) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // Fecha o socket fora do call stack atual para evitar recursão
      setImmediate(() => { try { sock.ws?.close(); } catch (_) {} });
      fn();
    };

    const timer = setTimeout(
      () => done(() => reject(new Error('Timeout 30s ao conectar ao WhatsApp'))),
      30000
    );

    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
      if (connection === 'open') {
        try {
          await sock.sendMessage(`${recipient}@s.whatsapp.net`, { text: message });
          done(resolve);
        } catch (e) {
          done(() => reject(e));
        }
      }

      if (connection === 'close' && !settled) {
        const code = lastDisconnect?.error?.output?.statusCode;
        if (code === DisconnectReason.loggedOut) {
          done(() => reject(new Error('Sessão expirada — execute: node setup-whatsapp.js')));
        } else {
          done(() => reject(new Error(`WA conexão fechada (${code}): ${lastDisconnect?.error?.message}`)));
        }
      }
    });
  });
}

module.exports = { sendWhatsApp };
