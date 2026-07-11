param(
  [ValidateSet("server", "mobile", "tools", "all")]
  [string]$Target = "all"
)

$Root = Split-Path -Parent $PSCommandPath

function Start-Server {
  Write-Host "[server] Iniciando backend..." -ForegroundColor Cyan
  Push-Location "$Root\server"
  if (-not (Test-Path node_modules)) { npm install }
  Start-Process -WindowStyle Normal -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "npm run dev"
  Pop-Location
}

function Start-Mobile {
  Write-Host "[mobile] Sincronizando e abrindo Android Studio..." -ForegroundColor Cyan
  Push-Location "$Root\app-mobile"
  if (-not (Test-Path node_modules)) { npm install }
  npm run sync
  npm run open:android
  Pop-Location
}

function Start-Tools {
  Write-Host "[tools] Abrindo ferramentas HTML no navegador..." -ForegroundColor Cyan
  $tools = Get-ChildItem "$Root\ferramentas\*.html"
  foreach ($t in $tools) {
    Start-Process $t.FullName
  }
}

switch ($Target) {
  "server"  { Start-Server }
  "mobile"  { Start-Mobile }
  "tools"   { Start-Tools }
  "all" {
    Start-Server
    Start-Tools
    Write-Host "
  Todas as ferramentas foram iniciadas!
  - Server: http://localhost:3000
  - Mobile: abra com:  .\run.ps1 -Target mobile
  - Tools: abertas no navegador
  " -ForegroundColor Green
  }
}
