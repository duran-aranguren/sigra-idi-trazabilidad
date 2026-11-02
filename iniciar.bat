@echo off
chcp 65001 >nul
title Trazabilidad I+D+i
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instala Node.js 24 LTS desde https://nodejs.org y vuelve a abrir este archivo.
  pause
  exit /b
)
start "" cmd /c "timeout /t 2 >nul & start http://localhost:3000"
node --disable-warning=ExperimentalWarning server.js
pause
