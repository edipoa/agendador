require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');

async function sendWhatsApp(message) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(__dirname, 'send-whatsapp.js')],
      {
        env: { ...process.env, WA_MESSAGE: message },
        stdio: 'inherit',
      }
    );

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('Timeout 60s ao enviar WhatsApp'));
    }, 60000);

    child.on('close', code => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else if (code === 2) reject(new Error('Sessão expirada — execute: node setup-whatsapp.js'));
      else reject(new Error(`WhatsApp script falhou (exit ${code})`));
    });

    child.on('error', err => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

module.exports = { sendWhatsApp };
