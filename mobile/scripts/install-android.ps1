# Native MahaTicket RN install (no WebView)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "==> Device check..."
if (-not (adb devices | Select-String "`tdevice$")) {
  Write-Host "Connect phone + USB debugging."; exit 1
}

Write-Host "==> adb reverse Metro+API..."
adb reverse tcp:8081 tcp:8081 | Out-Null
adb reverse tcp:3002 tcp:3002 | Out-Null

Write-Host "==> Build..."
Push-Location android
.\gradlew.bat assembleDebug
if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }
Pop-Location

Write-Host "==> Install..."
adb install -r -t "android\app\build\outputs\apk\debug\app-debug.apk"
if ($LASTEXITCODE -ne 0) {
  Write-Host "Xiaomi: enable Install via USB / Security USB debugging"
  exit 1
}
adb shell monkey -p com.kalpkrutinfotech.mahaticket -c android.intent.category.LAUNCHER 1 | Out-Null
Write-Host "Done. Keep Next :3002 + Metro running."
