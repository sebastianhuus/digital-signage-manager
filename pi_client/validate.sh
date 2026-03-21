#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "=== Syntax Check ==="
python -m py_compile pi_client.py
echo "OK"

echo ""
echo "=== Lint (ruff) ==="
uv run ruff check pi_client.py
echo "OK"

echo ""
echo "=== Tests ==="
uv run pytest tests/ -v

echo ""
echo "All checks passed."
