@echo off
echo Iniciando server, ferramentas e mobile...
start "Server" cmd /c "cd /d "%~dp0server" ^& if not exist node_modules npm install ^& npm run dev"
cd /d "%~dp0ferramentas"
for %%f in (*.html) do start "" "%%f"
echo.
echo Server: http://localhost:3000
echo Mobile: execute run-mobile.bat separadamente
pause
