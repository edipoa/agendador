// Salva sessão WhatsApp de baileys-auth/ → Gist privado
require('dotenv').config();
const fs   = require('fs');
const path = require('path');

const AUTH_DIR = path.join(__dirname, '..', 'baileys-auth');
const { GIST_ID, GH_PAT } = process.env;

async function main() {
  if (!GIST_ID || !GH_PAT) {
    console.log('GIST_ID/GH_PAT não configurados, pulando salvamento');
    return;
  }
  if (!fs.existsSync(AUTH_DIR)) {
    console.log('baileys-auth/ não existe, nada para salvar');
    return;
  }

  const files = {};
  for (const filename of fs.readdirSync(AUTH_DIR)) {
    files[filename] = { content: fs.readFileSync(path.join(AUTH_DIR, filename), 'utf8') };
  }
  if (!Object.keys(files).length) { console.log('Nenhum arquivo de sessão'); return; }

  const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method:  'PATCH',
    headers: { Authorization: `Bearer ${GH_PAT}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body:    JSON.stringify({ files }),
  });
  if (!res.ok) throw new Error(`Erro ao salvar no Gist: ${res.status}`);

  console.log(`Sessão salva (${Object.keys(files).length} arquivos)`);
}

main().catch(e => { console.error('Erro ao salvar sessão:', e.message); process.exit(1); });
