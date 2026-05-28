#!/usr/bin/env node

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { sendWhatsApp } = require('./notify');

// ─── Fixos: Silo Studio + Gabw + Combo corte + barba ─────────────────────────
const ESTABLISHMENT = '25897608';
const PROFESSIONAL  = 25931137;
const SERVICE       = 1219346;
const DURATION      = 60;

const LOGS = path.join(__dirname, 'logs');

// Ordem de preferência dentro da janela 13h
const SLOTS = ['13:30:00', '13:00:00', '13:20:00', '13:40:00', '13:10:00', '13:50:00'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.mkdirSync(LOGS, { recursive: true });
  fs.appendFileSync(path.join(LOGS, 'book.log'), line + '\n');
}

async function notificar(msg) {
  try {
    await notificar(msg);
    log('WA enviado');
  } catch (e) {
    log(`WA erro: ${e.message}`);
  }
}

// Próxima sexta a partir de hoje (se hoje é domingo, retorna a sexta em 5 dias)
function nextFriday() {
  const d = new Date();
  const diff = ((5 - d.getDay() + 7) % 7) || 7;
  const fri = new Date(d);
  fri.setDate(d.getDate() + diff);
  return fri;
}

function toApiDate(date, time) {
  const dd   = String(date.getDate()).padStart(2, '0');
  const mm   = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy} ${time}`;
}

function headers() {
  return {
    Authorization:  process.env.APPBARBER_AUTH,
    'client-id':    process.env.APPBARBER_CLIENT_ID,
    'device-id':    process.env.APPBARBER_DEVICE_ID,
    'client-code':  process.env.APPBARBER_CLIENT_CODE,
    lang:           'en',
    'Content-Type': 'application/json',
    Accept:         'application/json, text/plain, */*',
    Origin:         'https://sites.appbarber.com.br',
    Referer:        'https://sites.appbarber.com.br/',
  };
}

// ─── Booking ──────────────────────────────────────────────────────────────────

async function tryBook(startDate) {
  const body = JSON.stringify({
    client_code:        parseInt(process.env.APPBARBER_CLIENT_CODE, 10),
    client_person_code: '',
    observation:        '',
    schedule_origin:    4,
    start_date:         startDate,
    professional:       PROFESSIONAL,
    item_quantity:      1,
    item_type:          '1',
    item:               SERVICE,
    duration:           DURATION,
    silence_chat:       0,
  });

  const res  = await fetch(
    `https://apiclient.appbarber.com.br/v2/${ESTABLISHMENT}/appointments/schedule`,
    { method: 'POST', headers: headers(), body }
  );
  const data = await res.json();
  return { httpStatus: res.status, data };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const friday = nextFriday();
  const label  = friday.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  log(`===== Agendamento para ${label} =====`);

  for (const slot of SLOTS) {
    const startDate = toApiDate(friday, slot);
    log(`Tentando ${startDate}...`);

    let httpStatus, data;
    try {
      ({ httpStatus, data } = await tryBook(startDate));
    } catch (e) {
      log(`Erro de rede: ${e.message}`);
      await notificar(`❌ Erro de rede ao agendar: ${e.message}`);
      return;
    }

    log(`HTTP ${httpStatus} | ${JSON.stringify(data).slice(0, 300)}`);

    if (httpStatus === 401) {
      log('Token expirado — atualize APPBARBER_AUTH no .env');
      await notificar(
        '❌ Token AppBarber expirado! Abra o site, vá em DevTools → Network → ' +
        'clique em qualquer req para apiclient.appbarber.com.br → Request Headers → ' +
        'copie o valor de "Authorization" → atualize APPBARBER_AUTH no .env'
      );
      return;
    }

    const appt = data?.appointments?.[0];
    if (!data?.error && appt?.error === 0) {
      const time = slot.slice(0, 5);
      log(`Agendado! ${appt.result} | código ${appt.scheduling_code}`);
      await notificar(`✅ Agendado! Combo corte+barba com Gabw | Sexta ${label} às ${time} | Silo Studio 💈`);
      return;
    }

    const reason = appt?.result ?? data?.message ?? 'indisponível';
    log(`Slot ${slot} recusado: ${reason}`);
  }

  log('Sem horários 13h-14h disponíveis');
  await notificar(
    `⚠️ Nenhum horário 13h-14h com Gabw para ${label}. ` +
    'Agende manualmente: https://sites.appbarber.com.br/silostudio'
  );
}

main().catch(err => { log(`FATAL: ${err.message}`); process.exit(1); });
