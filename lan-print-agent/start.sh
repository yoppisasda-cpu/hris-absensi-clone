#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"
echo "===================================================="
echo "       Memulai Aivola LAN Print Agent..."
echo "===================================================="
node server.js

