<#
.SYNOPSIS
    Script de automação para otimização extrema de smartphones Android via ADB.
.DESCRIPTION
    Aplica desativação de RAM Plus, debloating em camadas, compilação nativa AOT,
    whitelist de Doze e configurações de rádio e tela para máxima performance.
#>

param (
    [string]$DeviceId = ""
)

$adbCmd = if ($DeviceId) { "adb -s $DeviceId" } else { "adb" }

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   ANDROID PERFORMANCE OPTIMIZER - MODO EXTREMO / MOTORISTA" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Ajustes Globais de Interface e Kernel
Write-Host "`n[1/5] Ajustando Kernel e Interface..." -ForegroundColor Yellow
Invoke-Expression "$adbCmd shell settings put global ram_expand_size 0"
Invoke-Expression "$adbCmd shell settings put global window_animation_scale 0.5"
Invoke-Expression "$adbCmd shell settings put global transition_animation_scale 0.5"
Invoke-Expression "$adbCmd shell settings put global animator_duration_scale 0.5"
Invoke-Expression "$adbCmd shell settings put system auto_adjust_touch 1"
Invoke-Expression "$adbCmd shell cmd uimode night yes"

# 2. Ajustes de Rádio e Bateria
Write-Host "`n[2/5] Otimizando Rádios e Economia de Bateria..." -ForegroundColor Yellow
Invoke-Expression "$adbCmd shell settings put global wifi_scan_always_enabled 0"
Invoke-Expression "$adbCmd shell settings put global ble_scan_always_enabled 0"
Invoke-Expression "$adbCmd shell settings put global mobile_data_always_on 0"
Invoke-Expression "$adbCmd shell settings put global stay_on_while_plugged_in 7"
Invoke-Expression "$adbCmd shell cmd location set-location-enabled true"

# 3. Lista de Bloatwares para Desativar
Write-Host "`n[3/5] Desativando Telemetria, Bixby e Bloatwares..." -ForegroundColor Yellow
$packages = @(
    # Telemetria & Rastreamento
    "com.samsung.android.knox.analytics.uploader",
    "com.samsung.android.scpm",
    "com.samsung.android.aware.service",
    "com.samsung.android.dsms",
    "com.samsung.android.scs",
    "com.samsung.android.smartsuggestions",
    "com.sec.android.diagmonagent",
    "com.samsung.android.dqagent",
    "com.sec.android.soagent",
    "com.samsung.android.rubin.app",
    "com.dti.samsung",
    "com.sec.spp.push",
    "com.samsung.android.sm.devicesecurity",
    "com.google.android.adservices.api",

    # Meta / Facebook
    "com.facebook.katana",
    "com.facebook.appmanager",
    "com.facebook.services",
    "com.facebook.system",

    # Bixby & AR
    "com.samsung.android.bixby.agent",
    "com.samsung.android.bixby.wakeup",
    "com.samsung.android.app.settings.bixby",
    "com.samsung.android.bixbyvision.framework",
    "com.samsung.android.arzone",
    "com.samsung.android.aremoji",
    "com.google.ar.core",
    "com.samsung.android.ardrawing",

    # Jogos & Throttling
    "com.samsung.android.game.gos",
    "com.samsung.android.game.gamehome",
    "com.samsung.android.game.gametools",

    # Ecossistema & Proximidade
    "com.samsung.android.beaconmanager",
    "com.samsung.android.easysetup",
    "com.samsung.android.mcfserver",
    "com.samsung.android.mcfds",
    "com.samsung.android.mdx",
    "com.samsung.android.mdx.quickboard",
    "com.samsung.android.allshare.service.mediashare",
    "com.samsung.android.allshare.service.fileshare",
    "com.samsung.android.smartmirroring",
    "com.samsung.android.fmm",
    "com.samsung.android.scloud",
    "com.samsung.android.mobileservice",

    # Cosméticos e Bloatwares Secundários
    "com.samsung.android.app.routines",
    "com.samsung.android.app.aodservice",
    "com.samsung.android.app.cocktailbarservice",
    "com.samsung.android.app.clipboardedge",
    "com.samsung.android.app.taskedge",
    "com.samsung.android.app.appsedge",
    "com.samsung.android.themestore",
    "com.samsung.android.themecenter",
    "com.samsung.android.app.dressroom",
    "com.samsung.storyservice",
    "com.samsung.cmh",
    "com.samsung.android.app.galaxyfinder",
    "com.samsung.android.dynamiclock",
    "com.samsung.android.forest",
    "com.samsung.android.spayfw",
    "com.samsung.android.samsungpass",
    "com.samsung.android.samsungpassautofill",
    "com.sec.android.app.samsungapps",
    "com.opera.max.oem",
    "com.netflix.partner.activation",
    "com.microsoft.appmanager",
    "com.hiya.star"
)

foreach ($pkg in $packages) {
    Invoke-Expression "$adbCmd shell pm disable-user --user 0 $pkg 2>`$null"
}

# 4. Whitelist de Proteção de Bateria (Doze)
Write-Host "`n[4/5] Aplicando Whitelist de Bateria nos Aplicativos de Trabalho..." -ForegroundColor Yellow
$whitelist = @(
    "com.google.android.apps.maps",
    "com.google.android.gms",
    "com.ubercab.driver",
    "com.app99.driver",
    "br.com.ifood.driver.app"
)
foreach ($pkg in $whitelist) {
    Invoke-Expression "$adbCmd shell dumpsys deviceidle whitelist +$pkg 2>`$null"
}

# 5. Compilação Nativa AOT
Write-Host "`n[5/5] Compilando Aplicativos em Modo de Alta Performance (AOT)..." -ForegroundColor Yellow
$compilePkgs = @(
    "com.sec.android.app.launcher",
    "com.android.systemui",
    "com.google.android.apps.maps",
    "com.google.android.gms",
    "com.google.android.inputmethod.latin",
    "com.android.chrome",
    "com.ubercab.driver",
    "com.app99.driver",
    "br.com.ifood.driver.app"
)
foreach ($pkg in $compilePkgs) {
    Write-Host "Compilando $pkg..." -ForegroundColor Gray
    Invoke-Expression "$adbCmd shell cmd package compile -m speed -f $pkg 2>`$null"
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "   OTIMIZACAO CONCLUIDA COM SUCESSO!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Reinicie o smartphone para consolidar o descarregamento de swap do kernel." -ForegroundColor Cyan
