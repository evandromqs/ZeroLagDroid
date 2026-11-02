#!/usr/bin/env bash
# Android Performance Optimizer - Script para Linux / macOS / Termux

set -e

DEVICE_ARG=""
if [ -n "$1" ]; then
    DEVICE_ARG="-s $1"
fi

ADB="adb $DEVICE_ARG"

echo "=========================================================="
echo "   ANDROID PERFORMANCE OPTIMIZER - MODO EXTREMO"
echo "=========================================================="

# 1. Ajustes de Kernel e Interface
echo -e "\n[1/5] Ajustando Kernel e Interface..."
$ADB shell settings put global ram_expand_size 0
$ADB shell settings put global window_animation_scale 0.5
$ADB shell settings put global transition_animation_scale 0.5
$ADB shell settings put global animator_duration_scale 0.5
$ADB shell settings put system auto_adjust_touch 1
$ADB shell cmd uimode night yes

# 2. Ajustes de Rádio e Bateria
echo -e "\n[2/5] Otimizando Rádios e Economia de Bateria..."
$ADB shell settings put global wifi_scan_always_enabled 0
$ADB shell settings put global ble_scan_always_enabled 0
$ADB shell settings put global mobile_data_always_on 0
$ADB shell settings put global stay_on_while_plugged_in 7
$ADB shell cmd location set-location-enabled true

# 3. Desativando Bloatwares
echo -e "\n[3/5] Desativando Telemetria e Bloatwares..."
PACKAGES=(
    com.samsung.android.knox.analytics.uploader
    com.samsung.android.scpm
    com.samsung.android.aware.service
    com.samsung.android.dsms
    com.samsung.android.scs
    com.samsung.android.smartsuggestions
    com.sec.android.diagmonagent
    com.samsung.android.dqagent
    com.sec.android.soagent
    com.samsung.android.rubin.app
    com.dti.samsung
    com.sec.spp.push
    com.samsung.android.sm.devicesecurity
    com.google.android.adservices.api
    com.facebook.katana
    com.facebook.appmanager
    com.facebook.services
    com.facebook.system
    com.samsung.android.bixby.agent
    com.samsung.android.bixby.wakeup
    com.samsung.android.app.settings.bixby
    com.samsung.android.bixbyvision.framework
    com.samsung.android.arzone
    com.samsung.android.aremoji
    com.google.ar.core
    com.samsung.android.ardrawing
    com.samsung.android.game.gos
    com.samsung.android.game.gamehome
    com.samsung.android.game.gametools
    com.samsung.android.beaconmanager
    com.samsung.android.easysetup
    com.samsung.android.mcfserver
    com.samsung.android.mcfds
    com.samsung.android.mdx
    com.samsung.android.mdx.quickboard
    com.samsung.android.allshare.service.mediashare
    com.samsung.android.allshare.service.fileshare
    com.samsung.android.smartmirroring
    com.samsung.android.fmm
    com.samsung.android.scloud
    com.samsung.android.mobileservice
    com.samsung.android.app.routines
    com.samsung.android.app.aodservice
    com.samsung.android.app.cocktailbarservice
    com.samsung.android.app.clipboardedge
    com.samsung.android.app.taskedge
    com.samsung.android.app.appsedge
    com.samsung.android.themestore
    com.samsung.android.themecenter
    com.samsung.android.app.dressroom
    com.samsung.storyservice
    com.samsung.cmh
    com.samsung.android.app.galaxyfinder
    com.samsung.android.dynamiclock
    com.samsung.android.forest
    com.samsung.android.spayfw
    com.samsung.android.samsungpass
    com.samsung.android.samsungpassautofill
    com.sec.android.app.samsungapps
    com.opera.max.oem
    com.netflix.partner.activation
    com.microsoft.appmanager
    com.hiya.star
)

for pkg in "${PACKAGES[@]}"; do
    $ADB shell pm disable-user --user 0 "$pkg" 2>/dev/null || true
done

# 4. Whitelist Doze
echo -e "\n[4/5] Whitelisting Apps de Entrega..."
WHITELIST=(
    com.google.android.apps.maps
    com.google.android.gms
    com.ubercab.driver
    com.app99.driver
    br.com.ifood.driver.app
)

for pkg in "${WHITELIST[@]}"; do
    $ADB shell dumpsys deviceidle whitelist +"$pkg" 2>/dev/null || true
done

# 5. Compilação AOT
echo -e "\n[5/5] Compilando Apps em AOT Nativo..."
COMPILE_PKGS=(
    com.sec.android.app.launcher
    com.android.systemui
    com.google.android.apps.maps
    com.google.android.gms
    com.google.android.inputmethod.latin
    com.android.chrome
    com.ubercab.driver
    com.app99.driver
    br.com.ifood.driver.app
)

for pkg in "${COMPILE_PKGS[@]}"; do
    echo "Compilando $pkg..."
    $ADB shell cmd package compile -m speed -f "$pkg" 2>/dev/null || true
done

echo -e "\n=========================================================="
echo "   OTIMIZACAO CONCLUIDA! REINICIE O APARELHO."
echo "=========================================================="
