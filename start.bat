@echo off
title Rotina TDAH - Iniciando...
cd /d "%~dp0"

echo ============================================
echo  Rotina TDAH - Iniciando todos os servicos
echo ============================================
echo.

:: 1. Server (backend)
echo [1/3] Iniciando server em http://localhost:3000 ...
start "Server" cmd /c "cd /d "%~dp0server" ^& if not exist node_modules npm install ^& npm run dev"

:: Aguarda server subir
:wait
timeout /t 2 /nobreak >nul
netstat -ano 2>nul | findstr ":3000" >nul 2>&1 || goto wait

:: Descobre IP local
for /f "tokens=2 delims=:" %%a in ('ipconfig 2^>nul ^| findstr /c:"IPv4" 2^>nul') do set "IP=%%a"
set "IP=%IP: =%"
if "%IP%"=="" set "IP=localhost"

:: 2. Ferramentas HTML
echo [2/3] Abrindo ferramentas no navegador ...
cd /d "%~dp0ferramentas"
for %%f in (*.html) do start "" "%%f"

:: 3. Mobile (Android) - apenas se Android Studio estiver instalado
if exist "%LOCALAPPDATA%\Android\Sdk" (
  echo [3/3] Preparando app mobile ...
  cd /d "%~dp0app-mobile"
  if not exist node_modules npm install
  npm run sync
  npm run open:android
) else (
  echo [3/3] Android Studio nao encontrado - para gerar APK, instale o Android Studio
)

echo.
echo ============================================
echo  Tudo iniciado!
echo.
echo  No PC:    http://localhost:3000
echo  No celular (mesma rede Wi-Fi):
echo  ^>^> http://%IP%:3000/ferramentas/rotina_tdah.html
echo  ^>^> http://%IP%:3000/ferramentas/triagem_tdah.html
echo.
echo  Para instalar como app no celular:
echo  Abra o link no Chrome, va no menu ^> "Adicionar a tela inicial"
echo ============================================
echo.
pause
