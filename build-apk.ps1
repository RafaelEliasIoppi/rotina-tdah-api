param(
  [switch]$SkipSync
)

$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSCommandPath
$AndroidDir = "$env:LOCALAPPDATA\Android"

Write-Host "=== Build APK Rotina TDAH ===" -ForegroundColor Cyan

# 1. Check Java
$javaOut = cmd /c "java -version 2>&1"
if ($LASTEXITCODE -ne 0) { throw "Java JDK nao encontrado. Instale o JDK 17+." }
Write-Host "[OK] Java encontrado" -ForegroundColor Green

# 2. Install Android SDK cmdline-tools if needed
$CmdTools = "$AndroidDir\cmdline-tools\latest\bin\sdkmanager.bat"
if (-not (Test-Path $CmdTools)) {
  Write-Host "[1/4] Baixando Android SDK command-line tools..." -ForegroundColor Yellow
  $url = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
  $zip = "$env:TEMP\cmdline-tools.zip"
  Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
  Expand-Archive -Path $zip -DestinationPath "$AndroidDir\tmp" -Force
  New-Item -ItemType Directory -Path "$AndroidDir\cmdline-tools\latest" -Force | Out-Null
  Move-Item -Path "$AndroidDir\tmp\cmdline-tools\*" -Destination "$AndroidDir\cmdline-tools\latest\" -Force
  Remove-Item -Path "$AndroidDir\tmp" -Recurse -Force
  Remove-Item -Path $zip -Force
  Write-Host "[OK] SDK tools instalados" -ForegroundColor Green
}

$env:ANDROID_HOME = $AndroidDir
[Environment]::SetEnvironmentVariable("ANDROID_HOME", $AndroidDir, "Process")

# 3. Accept licenses and install required platform
Write-Host "[2/4] Aceitando licencas e instalando platform Android 36..." -ForegroundColor Yellow
$sdkMgr = "$AndroidDir\cmdline-tools\latest\bin\sdkmanager.bat"
$yes = "y" | Out-String

# Accept all licenses
cmd /c "echo y | `"$sdkMgr`" --licenses >nul 2>&1"

# Install required components
cmd /c "`"$sdkMgr`" platforms;android-36 build-tools\;36.0.0 >nul 2>&1"
Write-Host "[OK] Platform e build-tools instalados" -ForegroundColor Green

# 4. Create local.properties
Write-Host "[3/4] Configurando projeto Android..." -ForegroundColor Yellow
$localProps = "sdk.dir=$AndroidDir"
Set-Content -Path "$Root\app-mobile\android\local.properties" -Value $localProps -Force

# 5. Sync Capacitor
if (-not $SkipSync) {
  Push-Location "$Root\app-mobile"
  if (-not (Test-Path node_modules)) { npm install }
  npm run sync 2>&1 | Out-Null
  Pop-Location
}
Write-Host "[OK] Projeto configurado" -ForegroundColor Green

# 6. Build APK
Write-Host "[4/4] Buildando APK (isso pode levar alguns minutos)..." -ForegroundColor Yellow
Push-Location "$Root\app-mobile\android"
$output = cmd /c ".\gradlew.bat assembleDebug --no-daemon 2>&1"
if ($LASTEXITCODE -ne 0) {
  Write-Host "ERRO no build:" -ForegroundColor Red
  $output | Select-String -Pattern "error|Error|FAILED" | ForEach-Object { Write-Host $_ -ForegroundColor Red }
  exit 1
}
Pop-Location

$apkPath = "$Root\app-mobile\android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
  Write-Host "`n========================================" -ForegroundColor Green
  Write-Host "  APK GERADO COM SUCESSO!" -ForegroundColor Green
  Write-Host "========================================" -ForegroundColor Green
  Write-Host "  $apkPath" -ForegroundColor White
  Write-Host "  Tamanho: $([math]::Round((Get-Item $apkPath).Length/1MB, 1)) MB" -ForegroundColor White
  Write-Host "========================================" -ForegroundColor Green
} else {
  Write-Host "APK nao encontrado em $apkPath" -ForegroundColor Red
}
