@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo No se encontro Node.js 20 o posterior.
  echo Instala Node.js LTS y ejecuta nuevamente Instalar-Sommelier.bat.
  pause
  exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Instalar-Sommelier.ps1"
if errorlevel 1 pause
