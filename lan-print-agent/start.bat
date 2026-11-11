@echo off
title Aivola LAN Print Agent
color 0A
echo ====================================================
echo        Memulai Aivola LAN Print Agent...
echo ====================================================
cd /d "%~dp0"
node server.js
pause

