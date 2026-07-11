@echo off
cd /d "%~dp0app-mobile"
if not exist node_modules npm install
npm run sync
npm run open:android
