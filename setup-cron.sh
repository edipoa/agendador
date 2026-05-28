#!/usr/bin/env bash
# Instala o cron job para agendar todo domingo às 18h

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NODE_BIN="$(which node)"

CRON_CMD="0 18 * * 0 cd $SCRIPT_DIR && $NODE_BIN book.js >> $SCRIPT_DIR/logs/cron.log 2>&1"

# Remove entradas anteriores desse projeto e adiciona a nova
(crontab -l 2>/dev/null | grep -v "agendador-barbeiro"; echo "$CRON_CMD") | crontab -

echo "Cron instalado:"
crontab -l | grep "agendador-barbeiro"
echo ""
echo "Vai rodar: Todo domingo às 18h00"
echo "Logs em:   $SCRIPT_DIR/logs/cron.log"
