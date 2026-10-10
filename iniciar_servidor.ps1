# iniciar_servidor.ps1
# Script para iniciar el servidor de Nutricion Clinica PAN USIL
$ErrorActionPreference = "Continue"

$AppDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PythonExe = Join-Path (Split-Path -Parent $AppDir) "python311\python.exe"

if (-not (Test-Path $PythonExe)) {
    $PythonExe = "python.exe"
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " INICIANDO PLATAFORMA DE NUTRICION CLINICA (PAN USIL)" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Directorio: $AppDir"
Write-Host "Ejecutable Python: $PythonExe"

$localIp = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi*" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty IPAddress -First 1)
if (-not $localIp) {
    $localIp = "192.168.18.186"
}

Write-Host "`n>> Acceso en esta PC:   http://localhost:8080" -ForegroundColor Yellow
Write-Host ">> Acceso desde Celular: http://$($localIp):8080" -ForegroundColor Green
Write-Host "==========================================================`n"

& $PythonExe (Join-Path $AppDir "server.py") 8080
