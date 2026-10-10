# abrir_en_internet.ps1
# Genera un tunel publico seguro (HTTPS) para abrir la aplicacion desde cualquier lugar
# sin importar si estas en otra red Wi-Fi o con datos moviles 4G/5G.
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " GENERANDO ENLACE PUBLICO (HTTPS) PARA NUTRICION CLINICA" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "El servidor local debe estar activo en el puerto 8080."
Write-Host "Conectando al tunel seguro..." -ForegroundColor Yellow

ssh -o StrictHostKeyChecking=no -R 80:localhost:8080 a.pinggy.io
