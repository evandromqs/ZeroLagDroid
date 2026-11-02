#!/usr/bin/env bash
# Script de restauração / rollback para Linux / macOS / Termux

set -e

DEVICE_ARG=""
if [ -n "$1" ]; then
    DEVICE_ARG="-s $1"
fi

ADB="adb $DEVICE_ARG"

echo "=== INICIANDO RESTAURACAO / ROLLBACK ==="

# 1. Restaurar configurações
$ADB shell settings put global ram_expand_size 4096
$ADB shell settings put global window_animation_scale 1.0
$ADB shell settings put global transition_animation_scale 1.0
$ADB shell settings put global animator_duration_scale 1.0
$ADB shell settings put global stay_on_while_plugged_in 0

# 2. Reativar todos os pacotes desativados
echo "Reativando pacotes desativados..."
$ADB shell pm list packages -d | while read -r line; do
    pkg="${line#package:}"
    echo "Reativando $pkg..."
    $ADB shell pm enable "$pkg" 2>/dev/null || true
done

echo "=== RESTAURACAO CONCLUIDA! REINICIE O CELULAR. ==="
