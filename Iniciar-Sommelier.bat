@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo No se encontro Node.js.
  echo Instala Node.js 20 o posterior desde https://nodejs.org/ y vuelve a abrir este archivo.
  pause
  exit /b 1
)
if not exist data mkdir data
echo Iniciando el servidor local del Sommelier Siñeriz...
start "Sommelier Siñeriz - servidor" /D "%~dp0" cmd /k node server.js
timeout /t 2 /nobreak >nul
start "" http://localhost:4173
echo La aplicacion se abrira en el navegador.
echo Para detenerla, cierra la ventana "Sommelier Siñeriz - servidor".
timeout /t 5
