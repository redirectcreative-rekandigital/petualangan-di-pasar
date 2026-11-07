@echo off
title Survival Sains - server lokal
cd /d "%~dp0"
echo ==============================================
echo   SURVIVAL SAINS - menjalankan di laptop
echo ==============================================
if not exist node_modules (
  echo Memasang paket pertama kali, mohon tunggu...
  call npm install
)
echo.
echo Membuka server multiplayer (port 8787) di jendela baru...
start "Survival Sains - multiplayer 8787" cmd /k node server/index.mjs
echo.
echo Game  : http://localhost:5173
echo Dari HP (Wi-Fi sama): lihat alamat "Network" di bawah.
echo Tekan Ctrl+C untuk berhenti.
echo.
start "" http://localhost:5173
call npx vite --host --port 5173 --strictPort
pause
