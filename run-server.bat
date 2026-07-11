@echo off
cd /d "%~dp0server"
if not exist node_modules npm install
npm run dev
