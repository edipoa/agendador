// Restaura sessão WhatsApp de um Gist privado → baileys-auth/
require('dotenv').config();
const fs   = require('fs');
const path = require('path');

const AUTH_DIR = path.join(__dirname, '..', 'baileys-auth');
const { GIST_ID, GH_PAT } = process.env;

async function main() {
  if (!GIST_ID || !GH_PAT) {
    console.log('GIST_ID/GH_PAT não configurados, pulando restauração');
    return;
  }

  const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    headers: { Authorization: `Bearer ${GH_PAT}`, Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`Gist não encontrado: ${res.status}`);

  const gist = await res.json();
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  for (const [filename, filedata] of Object.entries(gist.files || {})) {
    fs.writeFileSync(path.join(AUTH_DIR, filename), filedata.content);
  }

  console.log(`Sessão restaurada (${Object.keys(gist.files).length} arquivos)`);
}

main().catch(e => { console.error('Erro ao restaurar sessão:', e.message); process.exit(1); });
