// Script standalone — chamado por notify.js via child_process
// Roda em processo isolado para evitar conflito de stack com o processo principal

require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');

async function main() {
  const message   = process.env.WA_MESSAGE;
  const recipient = process.env.RECIPIENT_PHONE;
  const AUTH_DIR  = path.join(__dirname, 'baileys-auth');

  if (!message)   { console.error('WA_MESSAGE não definido');   process.exit(1); }
  if (!recipient) { console.error('RECIPIENT_PHONE não definido'); process.exit(1); }

  const { version }          = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    version,
    auth:              state,
    printQRInTerminal: false,
    logger:            pino({ level: 'silent' }),
    browser:           ['Agendador Barbeiro', 'Chrome', '120.0'],
    connectTimeoutMs:  30000,
  });

  sock.ev.on('creds.update', saveCreds);

  // Timeout de segurança
  setTimeout(() => { console.error('Timeout 30s'); process.exit(1); }, 30000);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      try {
        await sock.sendMessage(`${recipient}@s.whatsapp.net`, { text: message });
        console.log('Mensagem enviada!');
        setTimeout(() => process.exit(0), 500); // aguarda saveCreds
      } catch (e) {
        console.error('Erro ao enviar:', e.message);
        process.exit(1);
      }
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.error('SESSAO_EXPIRADA');
        process.exit(2);
      }
      console.error(`Conexão fechada (${code}): ${lastDisconnect?.error?.message}`);
      process.exit(1);
    }
  });
}

main().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
