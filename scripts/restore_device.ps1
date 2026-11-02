<#
.SYNOPSIS
    Script de restauração / rollback para desfazer otimizações caso necessário.
#>

param (
    [string]$DeviceId = ""
)

$adbCmd = if ($DeviceId) { "adb -s $DeviceId" } else { "adb" }

Write-Host "=== INICIANDO RESTAURACAO / ROLLBACK ===" -ForegroundColor Yellow

# 1. Restaurar Animações e RAM Plus
Invoke-Expression "$adbCmd shell settings put global ram_expand_size 4096"
Invoke-Expression "$adbCmd shell settings put global window_animation_scale 1.0"
Invoke-Expression "$adbCmd shell settings put global transition_animation_scale 1.0"
Invoke-Expression "$adbCmd shell settings put global animator_duration_scale 1.0"
Invoke-Expression "$adbCmd shell settings put global stay_on_while_plugged_in 0"

# 2. Reativar todos os pacotes desativados
Write-Host "Reativando pacotes desativados..." -ForegroundColor Cyan
$disabled = Invoke-Expression "$adbCmd shell pm list packages -d"
foreach ($line in $disabled) {
    if ($line -match "package:(.+)") {
        $pkg = $matches[1].Trim()
        Write-Host "Reativando $pkg..." -ForegroundColor Gray
        Invoke-Expression "$adbCmd shell pm enable $pkg 2>`$null"
    }
}

Write-Host "`n=== RESTAURACAO CONCLUIDA! REINICIE O CELULAR. ===" -ForegroundColor Green
