#!/usr/bin/env bash
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Instala Node.js 24 LTS desde https://nodejs.org"; exit 1; }
( sleep 2; (xdg-open http://localhost:3000 || open http://localhost:3000) >/dev/null 2>&1 ) &
exec node --disable-warning=ExperimentalWarning server.js
