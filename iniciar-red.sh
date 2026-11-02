#!/usr/bin/env bash
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Instala Node.js 24 LTS"; exit 1; }
IDI_RED=1 exec node --disable-warning=ExperimentalWarning server.js
