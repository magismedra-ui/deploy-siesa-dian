# Script para cambiar a la rama main eliminando el bloqueo de Git
# Ejecutar desde PowerShell fuera de Cursor

$repoPath = "C:\Users\LENOVO\OneDrive\Documentos\PROYECTS\Siesa-Dian\production_siesa_dian"
$lockFile = Join-Path $repoPath ".git\index.lock"

Write-Host "Cambiando al directorio del repositorio..." -ForegroundColor Yellow
Set-Location $repoPath

Write-Host "Verificando si existe el archivo de bloqueo..." -ForegroundColor Yellow
if (Test-Path $lockFile) {
    Write-Host "Eliminando archivo de bloqueo..." -ForegroundColor Yellow
    try {
        Remove-Item $lockFile -Force -ErrorAction Stop
        Write-Host "Archivo de bloqueo eliminado exitosamente." -ForegroundColor Green
        Start-Sleep -Seconds 1
    } catch {
        Write-Host "Error al eliminar el archivo: $_" -ForegroundColor Red
        Write-Host "Por favor, cierra Cursor y todos los procesos de Git antes de continuar." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "No se encontró archivo de bloqueo." -ForegroundColor Green
}

Write-Host "Cambiando a la rama main..." -ForegroundColor Yellow
try {
    git checkout main
    Write-Host "Cambio a rama main exitoso!" -ForegroundColor Green
    git status
} catch {
    Write-Host "Error al cambiar de rama: $_" -ForegroundColor Red
    Write-Host "Si el error persiste, cierra Cursor y vuelve a intentar." -ForegroundColor Yellow
    exit 1
}
