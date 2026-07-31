#!/bin/sh
echo "Starting virtual display (Xvfb)..."
xvfb-run --auto-servernum --server-args="-screen 0 1280x800x24" pnpm exec next start -H 0.0.0.0 -p 41234
