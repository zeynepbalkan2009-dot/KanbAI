#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

if pgrep -f "http.server 8080.*investor-demo" >/dev/null 2>&1; then
  echo "KanbAI private investor demo is already running on port 8080."
  exit 0
fi

nohup python3 -m http.server 8080 --bind 0.0.0.0 --directory investor-demo \
  >/tmp/kanbai-private-investor-demo.log 2>&1 &

echo "KanbAI private investor demo started on port 8080."
echo "Codespaces forwards this port privately by default."
