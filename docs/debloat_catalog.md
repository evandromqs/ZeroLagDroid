# 📚 Catálogo Detalhado de Pacotes Desativados

Este documento detalha os principais pacotes desativados, sua finalidade original no sistema e o motivo técnico pelo qual foram desativados para maximizar a performance.

---

## 1. Telemetria, Diagnósticos e Rastreamento

| Pacote | Nome Amigável | O que faz no sistema | Motivo da Desativação |
| :--- | :--- | :--- | :--- |
| `com.samsung.android.knox.analytics.uploader` | Knox Analytics | Coleta métricas de segurança corporativa e envia à Samsung | Uploads e logs constantes em segundo plano consumindo dados e bateria |
| `com.samsung.android.scpm` | Samsung Policy Manager | Gerenciador de políticas remotas da Samsung | Wake locks periódicos |
| `com.samsung.android.aware.service` | Context Aware Service | Monitora sensores para prever rotinas do usuário | Mantém a CPU ativa monitorando localização e movimento |
| `com.samsung.android.dsms` | Device Security Monitoring | Monitor de integridade de segurança Samsung | Consumo desnecessário de CPU |
| `com.samsung.android.scs` | Samsung Core Services | Motor de IA para busca semântica em imagens e texto | Indexação constante em segundo plano |
| `com.samsung.android.smartsuggestions` | Sugestões Inteligentes | IA preditiva de ações e texto | Consumo de RAM e sobrecarga de CPU |
| `com.dti.samsung` | Digital Turbine / DT Ignite | Instalador de apps de operadora e propaganda | **Consome ~140 MB de RAM** e tenta baixar apps parceiros silenciosamente |
| `com.sec.spp.push` | Samsung Push Service | Notificações de promoções da Galaxy Store | Mantém socket TCP constante consumindo bateria móvel |
| `com.samsung.android.sm.devicesecurity` | McAfee Security | Antivírus integrado na Assistência do Aparelho | Varre o armazenamento em segundo plano, esquentando o aparelho |
| `com.google.android.adservices.api` | Privacy Sandbox Ads | Framework de telemetria e perfil publicitário do Google | Tarefas agendadas em segundo plano para categorização de perfil |

---

## 2. Meta / Facebook Background Daemons

Mesmo sem ter a conta conectada ou o aplicativo do Facebook aberto, esses serviços vêm pré-instalados em nível de sistema na maioria dos aparelhos Samsung:

| Pacote | O que faz |
| :--- | :--- |
| `com.facebook.appmanager` | Gerencia atualizações silenciosas de produtos da Meta |
| `com.facebook.services` | Sincroniza dados e telemetria da Meta em segundo plano |
| `com.facebook.system` | Instalador com privilégios de sistema para a suíte da Meta |

---

## 3. Assistente Bixby e Realidade Aumentada

| Pacote | Finalidade Original |
| :--- | :--- |
| `com.samsung.android.bixby.agent` | Assistente de voz Bixby |
| `com.samsung.android.bixby.wakeup` | Escuta contínua de microfone esperando o comando "Hi Bixby" |
| `com.samsung.android.bixbyvision.framework` | OCR e busca por imagens na câmera da Samsung |
| `com.samsung.android.arzone` | Zona de Realidade Aumentada da câmera |
| `com.samsung.android.aremoji` | Gerador e animador de bonecos 3D virtuais |
| `com.google.ar.core` | Biblioteca do Google Play para realidade aumentada |

---

## 4. Limitador de Desempenho e Jogos

* **`com.samsung.android.game.gos` (Game Optimizing Service):**  
  Mecanismo controverso da Samsung que reduz a frequência de clock (throttling) da CPU e GPU para limitar temperatura. Sua desativação desbloqueia a potência real do processador.
* **`com.samsung.android.game.gamehome`:** Launcher de jogos.
* **`com.samsung.android.game.gametools`:** Painel flutuante de gravação e captura em jogos.

---

## 5. Ecossistema e Proximidade

* **`com.samsung.android.beaconmanager`:** Varredura ininterrupta de rádio Bluetooth procurando SmartTags.
* **`com.samsung.android.easysetup`:** Detecta fones Galaxy Buds ou relógios novos por perto.
* **`com.samsung.android.mcfserver` / `mcfds`:** Multi-Connectivity Framework (sincronização com tablets e TVs Samsung).
* **`com.samsung.android.smartmirroring`:** Smart View (espelhamento de tela).
