@echo off
cd /d "%~dp0ferramentas"
for %%f in (*.html) do start "" "%%f"
