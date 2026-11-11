@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Falta Node.js 20 o posterior. Ejecuta Instalar-Sommelier.bat.
  pause
  exit /b 1
)
curl.exe -fsS --max-time 2 http://localhost:4173/api/status >nul 2>nul
if errorlevel 1 start "Sommelier servidor" /min /D "%~dp0" node server.js
for /L %%i in (1,1,12) do (
  curl.exe -fsS --max-time 2 http://localhost:4173/api/status >nul 2>nul
  if not errorlevel 1 goto openkiosk
  timeout /t 1 /nobreak >nul
)
echo No se pudo iniciar el servidor local del Sommelier.
pause
exit /b 1
:openkiosk
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if exist "%EDGE%" (
  start "" "%EDGE%" --kiosk http://localhost:4173 --edge-kiosk-type=fullscreen --no-first-run
) else (
  start "" msedge --kiosk http://localhost:4173 --edge-kiosk-type=fullscreen --no-first-run
)
