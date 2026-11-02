# 🚀 ZeroLagDroid

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: Android](https://img.shields.io/badge/Platform-Android%2010+-green.svg)](#)
[![Validated: Samsung One UI](https://img.shields.io/badge/Validated-Samsung%20One%20UI-orange.svg)](#)
[![Zero Root](https://img.shields.io/badge/Root-Not%20Required-brightgreen.svg)](#)

> **Elimine travamentos, libere até 2 GB de memória RAM e maximize a performance de qualquer smartphone Android via ADB sem root.**  
> Desenvolvido com foco especial em celulares de motoristas e entregadores (**Uber, 99, iFood**), garantindo estabilidade no GPS e fluidez extrema no trânsito.

---

## 📌 Por que o ZeroLagDroid existe?

Celulares intermediários e básicos (como a linha **Samsung Galaxy A/M**, Motorola Moto G, Xiaomi Redmi) frequentemente sofrem com lentidão severa e engasgos após alguns meses de uso. Os motivos técnicos reais são:

1. **Memória Virtual / RAM Plus (O Grande Vilão):** O sistema utiliza o armazenamento flash lento (eMMC ou UFS 2.x) como memória de troca (*swap*). Quando a RAM física atinge 80%, o aparelho entra em *I/O thrashing*, congelando a tela a cada toque.
2. **Telemetria e Adwares Invisíveis:** Serviços como *Digital Turbine (DT Ignite)*, antivírus da McAfee embutido, telemetria da Samsung e do Facebook rodam silenciosamente 24 horas por dia consumindo bateria e aquecendo a CPU.
3. **Compilação Dinâmica Lenta:** Aplicativos pesados (Uber, Maps) demoram para carregar porque o sistema tenta compilar código Java em tempo de execução.
4. **Encerramento Agressivo de Apps (Doze Killer):** O Android fecha o aplicativo de corrida em segundo plano enquanto você navega no GPS, fazendo o motorista perder chamadas.

O **ZeroLagDroid** resolve todos esses gargalos com automação via terminal **ADB** (sem desbloqueio de bootloader e sem root).

---

## ⚡ Resultados Comprovados (Caso Real: Galaxy A51)

| Métrica / Recurso | Antes | Depois do ZeroLagDroid | Ganho Real |
| :--- | :---: | :---: | :---: |
| **Memória RAM Livre** | ~123 MB (96% saturado) | **2.130 MB (~2,1 GB livres)** | **+1.600%** |
| **RAM Plus (Memória Virtual em Disco)** | 4.096 MB (4 GB) | **0 MB (Desativado)** | Fim dos engasgos |
| **Processos Ativos em Espaço de Usuário** | +60 processos | **10 processos essenciais** | Redução de 83% |
| **Tempo de Resposta / Animações** | 1.0x (lento) | **0.5x (instantâneo)** | Resposta ao toque imediata |
| **Consumo AMOLED em Tela** | Modo Claro | **Modo Escuro Forçado** | Até 35% menos bateria |
| **Aplicativos de Trabalho (Uber/99/iFood)** | Padrão | **Compilados em AOT nativo + Whitelist** | Zero fechamentos |

---

## 🛠️ Como Usar

### Pré-requisitos
* Computador com [Android SDK Platform-Tools (ADB)](https://developer.android.com/tools/releases/platform-tools) instalado.
* Celular com **Depuração USB** (via cabo) ou **Depuração por Wi-Fi** ativada nas *Opções do Desenvolvedor*.

---

### Opção 1: Execução Automática em 1 Clique

#### No Windows (PowerShell):
```powershell
# Clone o repositório
git clone https://github.com/evandromqs/ZeroLagDroid.git
cd ZeroLagDroid

# Conecte o celular via cabo ou Wi-Fi e execute:
powershell -ExecutionPolicy Bypass -File .\scripts\optimize_device.ps1
```

#### No Linux / macOS / Termux (Bash):
```bash
git clone https://github.com/evandromqs/ZeroLagDroid.git
cd ZeroLagDroid
chmod +x ./scripts/optimize_device.sh
./scripts/optimize_device.sh
```

---

### Opção 2: Como Agent Skill (Google Antigravity / Gemini)

Copie o repositório para o seu diretório de skills ou aponte para o arquivo [SKILL.md](SKILL.md) como instrução de contexto do seu agente de IA.

---

## 🛡️ O Que o ZeroLagDroid Executa?

1. **Kernel e Memória:**
   * Desativa o **RAM Plus / Memória Virtual** (`ram_expand_size 0`), impedindo que o aparelho congele por lentidão de disco.
2. **Interface e Resposta:**
   * Acelera as animações do sistema para **0.5x**.
   * Ativa **alta sensibilidade de toque** para uso com luvas de motoqueiro ou películas de vidro.
3. **Bateria e Trânsito:**
   * Ativa o **Modo Escuro (Dark Mode)**, desligando pixels pretos em telas AMOLED.
   * Mantém a **tela sempre acesa no suporte com carregador** (`stay_on_while_plugged_in 7`).
   * Desativa varreduras fantasmas de Wi-Fi e Bluetooth em segundo plano.
   * Garante a ativação de alta precisão do **GPS**.
4. **Extermínio de Bloatware (Mais de 80 pacotes):**
   * Desativa telemetrias de diagnóstico (Knox Analytics, SCPM, Aware).
   * Desativa instaladores de operadora e anúncios (*Digital Turbine / DT Ignite*).
   * Desativa o antivírus oculto da McAfee (*Device Security*).
   * Desativa toda a suíte Bixby, Realidade Aumentada (AR Zone) e serviços de jogos (GOS).
5. **Proteção de Bateria (Doze Whitelist):**
   * Adiciona **Uber Driver**, **99 Motorista**, **iFood Entregador**, **Google Maps** e **Google Play Services** à lista de exceção de energia (nunca encerram em segundo plano).
6. **Compilação Nativa (AOT):**
   * Pré-compila a interface do Android, teclado Gboard, Chrome e os aplicativos de corrida em código de máquina nativo (`speed`).

---

## ↩️ Como Desfazer / Rollback Seguro

O ZeroLagDroid **não apaga arquivos do sistema**. Todos os pacotes são apenas desativados para o usuário, permitindo reversão total a qualquer momento:

#### No Windows (PowerShell):
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore_device.ps1
```

#### No Linux / macOS:
```bash
chmod +x ./scripts/restore_device.sh
./scripts/restore_device.sh
```

---

## 📄 Licença

Distribuído sob a licença **MIT**. Veja [LICENSE](LICENSE) para mais detalhes.

---

### 🤝 Contribuições
Contribuições com listas de pacotes para outras marcas (Xiaomi HyperOS, Motorola MyUX, Realme, etc.) são muito bem-vindas! Abra uma Issue ou envie um Pull Request.
