#!/bin/sh
set -eu
cd /workspace
if [ ! -d node_modules ]; then
  bash scripts/cloud-agent-install.sh
fi
node scripts/preview.mjs stop || true
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
npm run dev >>/tmp/app-startup.log 2>&1 &
