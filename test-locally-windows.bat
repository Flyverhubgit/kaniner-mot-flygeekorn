@echo off
title Kaniner mot Flygeekorn - server
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js mangler.
  echo  1. Last ned "LTS" fra https://nodejs.org og installer.
  echo  2. Kjor denne filen igjen.
  echo.
  start https://nodejs.org
  pause
  exit /b
)

if not exist node_modules (
  echo  Installerer ^(bare forste gang, tar ca. 30 sek^)...
  call npm install --omit=dev
  if errorlevel 1 (
    echo  Installasjonen feilet. Sjekk internett og prov igjen.
    pause
    exit /b
  )
)

echo.
echo  ==============================================
echo   KANINER MOT FLYGEEKORN
echo  ==============================================
echo   Pa denne PC-en:   http://localhost:3000
echo.
echo   Andre pa samme WiFi skriver inn en av disse:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do for /f "tokens=*" %%b in ("%%a") do echo      http://%%b:3000
echo.
echo   (Spor Windows om brannmur: trykk "Tillat".)
echo   Lukk dette vinduet for a stoppe spillet.
echo  ==============================================
echo.

start "" cmd /c "timeout /t 2 >nul & start http://localhost:3000"
node server.js
echo.
echo  Serveren stoppet.
pause
