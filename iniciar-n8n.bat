@echo off
chcp 65001 >nul
title n8n (IA para SIGRA Trazabilidad I+D+i)
where node >nul 2>nul
if errorlevel 1 (
  echo Instala Node.js 24 LTS desde https://nodejs.org y vuelve a abrir este archivo.
  pause
  exit /b
)
echo Iniciando n8n... la primera vez descarga el programa y puede tardar varios minutos.
echo Cuando veas "Editor is now accessible via http://localhost:5678" abre esa direccion en el navegador.
echo Deja esta ventana abierta mientras uses la IA.
start "" cmd /c "timeout /t 25 >nul & start http://localhost:5678"
npx --yes n8n
pause
