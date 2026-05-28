// Rode UMA VEZ para autenticar o número dedicado via QR code
// node setup-whatsapp.js

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino   = require('pino');
const path   = require('path');
const fs     = require('fs');

const AUTH_DIR = path.join(__dirname, 'baileys-auth');

async function main() {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    version,
    auth:                   state,
    printQRInTerminal:      false,
    logger:                 pino({ level: 'silent' }),
    browser:                ['Agendador Barbeiro', 'Chrome', '120.0'],
    connectTimeoutMs:       60000,
    defaultQueryTimeoutMs:  60000,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.clear();
      console.log('Escaneie com o WhatsApp do número dedicado:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      console.log('\n✅ WhatsApp conectado! Sessão salva em baileys-auth/');
      console.log('\nPróximos passos para o GitHub Actions:');
      console.log('  1. Crie um Gist PRIVADO em https://gist.github.com');
      console.log('  2. Crie um PAT em https://github.com/settings/tokens com escopo "gist"');
      console.log('  3. Preencha GIST_ID e GH_PAT no .env');
      console.log('  4. Execute: node scripts/save-wa-session.js\n');
      setTimeout(() => process.exit(0), 2000);
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      console.error(`\n❌ Conexão falhou (código ${code})`);
      if (code === DisconnectReason.connectionFailure || code === 503) {
        console.error('WhatsApp recusou a conexão. Aguarde 5 minutos e tente de novo.');
      } else if (code === DisconnectReason.loggedOut) {
        console.error('Sessão expirada. Delete baileys-auth/ e rode novamente.');
      }
      process.exit(1);
    }
  });
}

main().catch(e => { console.error('Erro:', e.message); process.exit(1); });
