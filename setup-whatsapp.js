// Rode UMA VEZ para autenticar o número dedicado via QR code
// node setup-whatsapp.js

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const path = require('path');

const AUTH_DIR = path.join(__dirname, 'baileys-auth');

async function main() {
  console.log('Conectando ao WhatsApp...');
  console.log('Escaneie o QR code abaixo com o número dedicado:\n');

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    auth:              state,
    printQRInTerminal: true,
    browser:           ['Agendador Barbeiro', 'Chrome', '120.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      console.log('\n✅ WhatsApp conectado! Sessão salva em baileys-auth/');
      console.log('\n──────────────────────────────────────────────────');
      console.log('Para usar no GitHub Actions:');
      console.log('  1. Crie um Gist PRIVADO em https://gist.github.com');
      console.log('     (qualquer arquivo, ex: session.txt com qualquer texto)');
      console.log('  2. Anote o ID do Gist (parte final da URL)');
      console.log('  3. Crie um PAT em https://github.com/settings/tokens');
      console.log('     com escopo "gist"');
      console.log('  4. Adicione GIST_ID e GH_PAT no .env');
      console.log('  5. Execute: node scripts/save-wa-session.js');
      console.log('──────────────────────────────────────────────────\n');
      setTimeout(() => process.exit(0), 2000);
    }

    if (connection === 'close') {
      const loggedOut = lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut;
      if (!loggedOut) main();
    }
  });
}

main();
