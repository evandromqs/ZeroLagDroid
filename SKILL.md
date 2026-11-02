---
name: ZeroLagDroid
description: Automated auditing, deep debloating, memory tuning, kernel swap optimization, and AOT native compilation for Android smartphones (Samsung Galaxy One UI, Xiaomi HyperOS, Motorola, AOSP). Specializes in high-performance tuning for ride-hailing/delivery drivers (Uber, 99, iFood), gaming, and revitalizing low/mid-range Android hardware without root.
---

# ZeroLagDroid - Android Performance Optimizer Skill

Comprehensive guide, command templates, debloating catalog, and tuning procedures for optimizing Android smartphones via **ADB (Android Debug Bridge)**.

Developed and validated on **Samsung Galaxy One UI (One UI 3/4/5/6)**, adaptable to any Android 10+ device.

---

## 1. Conexão e Diagnóstico Inicial

### 1.1 Conexão Sem Fio (Android 11+)
Quando a conexão USB não estiver disponível ou utilizar cabos de apenas carregamento:
1. Ativar **Depuração por Wi-Fi** em *Opções do Desenvolvedor*.
2. Emparelhar:
   ```bash
   adb pair <IP>:<PORTA_PAREAMENTO> <CODIGO_6_DIGITOS>
   ```
3. Conectar:
   ```bash
   adb connect <IP>:<PORTA_CONEXAO>
   ```

### 1.2 Diagnóstico de Hardware e Memória
Extrair métricas antes de qualquer intervenção:
```bash
# 1. Modelo, versão do Android e One UI
adb shell "getprop ro.product.model; getprop ro.build.version.release; getprop ro.build.version.oneui"

# 2. Status da RAM física e Swap/ZRAM
adb shell free -m

# 3. Status da memória virtual do fabricante (ex: RAM Plus Samsung)
adb shell settings get global ram_expand_size

# 4. Status de armazenamento interno livre
adb shell df -h /data

# 5. Processos mais pesados consumindo memória de usuário
adb shell "ps -A | grep u0_a"
```

---

## 2. Otimização de Kernel e Memória Virtual (Regra de Ouro)

> [!CRITICAL]
> Em dispositivos de entrada e intermediários com armazenamento flash eMMC ou UFS 2.0/2.1 (como Galaxy A51, A32, Moto G, etc.), recursos de memória virtual (ex: **RAM Plus** da Samsung, **Memory Extension** da Xiaomi) utilizam o disco flash como memória de troca (*swap*). Isso causa **gargalo severo de E/S (I/O thrashing)**, micro-travamentos contínuos e aquecimento térmico.

### Desativar Memória Virtual via ADB
```bash
# Samsung One UI (Define RAM Plus para 0 MB)
adb shell settings put global ram_expand_size 0
```
*(Requer reinicialização do dispositivo para liberar a partição de swap do kernel)*.

---

## 3. Matriz de Extermínio e Debloating em Camadas

O debloating seguro utiliza `pm disable-user --user 0 <pacote>`. Isso impede a inicialização sem quebrar o sistema, permitindo reversão imediata com `pm enable <pacote>`.

### Camada 1: Telemetria, Rastreamento e Diagnósticos de Fábrica
```bash
# Samsung Telemetria e Anúncios
adb shell "pm disable-user --user 0 com.samsung.android.knox.analytics.uploader"
adb shell "pm disable-user --user 0 com.samsung.android.scpm"
adb shell "pm disable-user --user 0 com.samsung.android.aware.service"
adb shell "pm disable-user --user 0 com.samsung.android.dsms"
adb shell "pm disable-user --user 0 com.samsung.android.scs"
adb shell "pm disable-user --user 0 com.samsung.android.smartsuggestions"
adb shell "pm disable-user --user 0 com.sec.android.diagmonagent"
adb shell "pm disable-user --user 0 com.samsung.android.dqagent"
adb shell "pm disable-user --user 0 com.sec.android.soagent"
adb shell "pm disable-user --user 0 com.samsung.android.rubin.app"

# Meta / Facebook Background Telemetry (Presente mesmo sem app aberto)
adb shell "pm disable-user --user 0 com.facebook.appmanager"
adb shell "pm disable-user --user 0 com.facebook.services"
adb shell "pm disable-user --user 0 com.facebook.system"

# Adware de Operadora / Instalador Silencioso
adb shell "pm disable-user --user 0 com.dti.samsung"  # Digital Turbine / DT Ignite (~140MB RAM)
adb shell "pm disable-user --user 0 com.sec.spp.push" # Samsung Push Service

# Antivírus Oculto (McAfee embutido na Assistência do Aparelho)
adb shell "pm disable-user --user 0 com.samsung.android.sm.devicesecurity"
```

### Camada 2: Assistentes, Voz e Realidade Aumentada
```bash
# Suíte Bixby
adb shell "pm disable-user --user 0 com.samsung.android.bixby.agent"
adb shell "pm disable-user --user 0 com.samsung.android.bixby.wakeup"
adb shell "pm disable-user --user 0 com.samsung.android.app.settings.bixby"
adb shell "pm disable-user --user 0 com.samsung.android.bixbyvision.framework"

# Realidade Aumentada (AR Zone / Emojis)
adb shell "pm disable-user --user 0 com.samsung.android.arzone"
adb shell "pm disable-user --user 0 com.samsung.android.aremoji"
adb shell "pm disable-user --user 0 com.google.ar.core"
adb shell "pm disable-user --user 0 com.samsung.android.ardrawing"
```

### Camada 3: Limitadores de Desempenho e Ferramentas de Jogos
A Samsung inclui o **GOS (Game Optimizing Service)**, conhecido por limitar agressivamente a frequência da CPU:
```bash
adb shell "pm disable-user --user 0 com.samsung.android.game.gos"
adb shell "pm disable-user --user 0 com.samsung.android.game.gamehome"
adb shell "pm disable-user --user 0 com.samsung.android.game.gametools"
```

### Camada 4: Ecossistema, Varredura de Proximidade e Periféricos
```bash
adb shell "pm disable-user --user 0 com.samsung.android.beaconmanager"
adb shell "pm disable-user --user 0 com.samsung.android.easysetup"
adb shell "pm disable-user --user 0 com.samsung.android.mcfserver"
adb shell "pm disable-user --user 0 com.samsung.android.mcfds"
adb shell "pm disable-user --user 0 com.samsung.android.mdx"
adb shell "pm disable-user --user 0 com.samsung.android.mdx.quickboard"
adb shell "pm disable-user --user 0 com.samsung.android.allshare.service.mediashare"
adb shell "pm disable-user --user 0 com.samsung.android.allshare.service.fileshare"
adb shell "pm disable-user --user 0 com.samsung.android.smartmirroring"
```

### Camada 5: Substituição do Teclado por Gboard
```bash
# 1. Ativar e definir Gboard como padrão
adb shell ime enable com.google.android.inputmethod.latin/com.android.inputmethod.latin.LatinIME
adb shell ime set com.google.android.inputmethod.latin/com.android.inputmethod.latin.LatinIME

# 2. Desativar teclado Samsung
adb shell pm disable-user --user 0 com.samsung.android.honeyboard
```

---

## 4. Otimização de Interface e Resposta ao Toque

```bash
# 1. Animações com o dobro de velocidade (0.5x)
adb shell "settings put global window_animation_scale 0.5"
adb shell "settings put global transition_animation_scale 0.5"
adb shell "settings put global animator_duration_scale 0.5"

# 2. Alta sensibilidade de toque (para películas espessas ou uso com luvas)
adb shell "settings put system auto_adjust_touch 1"
```

---

## 5. Perfil de Máxima Autonomia e Eficiência no Trânsito

```bash
# 1. Modo Escuro (Super AMOLED - Desliga pixels pretos)
adb shell cmd uimode night yes

# 2. Desativar varreduras contínuas de antenas em standby
adb shell "settings put global wifi_scan_always_enabled 0"
adb shell "settings put global ble_scan_always_enabled 0"
adb shell "settings put global mobile_data_always_on 0"

# 3. Manter tela acesa no carregador veicular
adb shell settings put global stay_on_while_plugged_in 7

# 4. Ativação explícita de GPS de alta precisão
adb shell cmd location set-location-enabled true
```

---

## 6. Pipeline de Compilação AOT (Ahead-Of-Time)

```bash
# Alta performance nativa para aplicativos críticos
adb shell "cmd package compile -m speed -f com.sec.android.app.launcher"
adb shell "cmd package compile -m speed -f com.android.systemui"
adb shell "cmd package compile -m speed -f com.google.android.apps.maps"
adb shell "cmd package compile -m speed -f com.google.android.gms"
adb shell "cmd package compile -m speed -f com.google.android.inputmethod.latin"
adb shell "cmd package compile -m speed -f com.android.chrome"

# Apps de Trabalho
adb shell "cmd package compile -m speed -f com.ubercab.driver"
adb shell "cmd package compile -m speed -f com.app99.driver"
adb shell "cmd package compile -m speed -f br.com.ifood.driver.app"
```

---

## 7. Blindagem contra Encerramento em Segundo Plano (Doze Whitelist)

```bash
adb shell "dumpsys deviceidle whitelist +com.google.android.apps.maps"
adb shell "dumpsys deviceidle whitelist +com.google.android.gms"
adb shell "dumpsys deviceidle whitelist +com.ubercab.driver"
adb shell "dumpsys deviceidle whitelist +com.app99.driver"
adb shell "dumpsys deviceidle whitelist +br.com.ifood.driver.app"
```
