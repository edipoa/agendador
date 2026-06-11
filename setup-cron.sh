#!/usr/bin/env bash
# Instala os cron jobs: sexta 00:01 (principal) e sexta 12:00 (retry se a primeira falhou)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NODE_BIN="$(which node)"

CRON_MAIN="1 0 * * 5 cd $SCRIPT_DIR && $NODE_BIN book.js >> $SCRIPT_DIR/logs/cron.log 2>&1"
CRON_RETRY="0 12 * * 5 cd $SCRIPT_DIR && $NODE_BIN book.js >> $SCRIPT_DIR/logs/cron.log 2>&1"

# Remove entradas anteriores desse projeto e adiciona as novas
(crontab -l 2>/dev/null | grep -v "agendador-barbeiro"; echo "$CRON_MAIN"; echo "$CRON_RETRY") | crontab -

echo "Cron instalado:"
crontab -l | grep "agendador-barbeiro"
echo ""
echo "Principal: sexta 00:01 | Retry: sexta 12:00 (só agenda se a primeira execução falhou)"
echo "Logs em:   $SCRIPT_DIR/logs/cron.log"
