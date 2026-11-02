/**
 * ZeroLagDroid - WhatsApp Web Fast Response Extension
 * Barra lateral retrátil acoplada ao canto direito, comprimindo o WhatsApp.
 * Versão 1.4:
 * - Personalização Automática com o Nome do Contato ("Olá, Marcos, tudo bem?")
 * - Modo de envio flexível: Enviar como TEXTO ou como ÁUDIO gravado (PTT nativo)
 * - Gravador de voz embutido no modal de ajustes com teleprompter
 * - Gerador de QR Code Pix oficial (EMV Banco Central) enviado direto no chat
 * - Cabeçalho minimalista integrado ao WhatsApp (59px)
 */

(function () {
  'use strict';

  // Configuração padrão
  const defaultConfig = {
    pixKey: "11976920649",
    userName: "Evandro Marques",
    neighborhood: "Zona Leste (SP)",
    city: "SAO PAULO",
    pricePresencial: "50",
    priceOnline: "30",
    sidebarWidth: "330",
    sidebarMode: "compress",
    typingSpeed: "fast",
    pauseDelay: 1300,
    customFlows: {}
  };

  let config = { ...defaultConfig };

  // Textos padrões
  const defaultFlows = {
    msg1: [
      "Olá{NAME_SUFFIX}, tudo bem? Vi sua mensagem aqui!",
      "Qual é o modelo do seu celular e quais aplicativos você mais utiliza no dia a dia? (Uber, 99 ou iFood?)"
    ],
    msg2: [
      "Esse aparelho é muito bom! O que acontece é que, com as atualizações, o sistema vai acumulando processos pesados em segundo plano e começa a engasgar na hora que toca a corrida.",
      "O procedimento que eu faço é direto pelo computador: ele remove todo esse peso, libera bastante memória RAM e blinda os apps para não fecharem sozinhos. Não formata nada e não perde fotos nem conversas.",
      "Os valores são bem tranquilos: R$ {PRICE_PRESENCIAL} presencial aqui na {NEIGHBORHOOD} ou R$ {PRICE_ONLINE} online se tiver computador. E você só paga depois que testar o aparelho e aprovar o resultado!"
    ],
    msg3_presencial: [
      "Sobre o atendimento presencial: eu atendo aqui na {NEIGHBORHOOD}.",
      "A gente combina em um local prático para nós dois, como um shopping, posto ou ponto de apoio. Eu levo o notebook e em cerca de 5 a 10 minutos já te entrego o aparelho pronto.",
      "Qual bairro aqui da {NEIGHBORHOOD} fica mais fácil para você?"
    ],
    msg3_online: [
      "Para o atendimento remoto de R$ {PRICE_ONLINE},00, é bem simples e rápido:",
      "Você só precisa ter um computador ou notebook com internet aí. Nós conectamos o celular no cabo USB do computador e eu faço tudo daqui à distância pelo AnyDesk, enquanto você acompanha na tela.",
      "Você tem computador ou notebook disponível aí no momento?"
    ],
    msg4_usb: [
      "Para o computador reconhecer o celular, siga esse passo a passo rápido:",
      "1. Abra Configurações > Sobre o telefone > Informações do software e dê 7 toques seguidos em 'Número de compilação'.",
      "2. Volte nas Configurações, entre em 'Opções do desenvolvedor', ative 'Depuração USB' e conecte o cabo no PC marcando 'Sempre permitir'."
    ],
    msg5_teste: [
      "Prontinho! Aparelho 100% otimizado e reiniciado! 🚀",
      "Pode fazer um teste agora: abra os aplicativos da Uber, 99 e o Maps para sentir a diferença.",
      "Sentiu que o toque e a navegação ficaram bem mais rápidos?"
    ],
    msg6_pix_presencial: [
      "Muito obrigado! Fico muito feliz que tenha gostado do resultado. Agora é trabalhar com tranquilidade e sem travamentos!",
      "Seguem os dados para o Pix:\nChave Pix: {PIX_KEY}\nNome: {USER_NAME}\nValor: R$ {PRICE_PRESENCIAL},00 (Presencial - {NEIGHBORHOOD})",
      "Se puder indicar para outros colegas motoristas ou compartilhar nos grupos, agradeço muito!"
    ],
    msg6_pix_online: [
      "Muito obrigado! Fico muito feliz que tenha gostado do resultado. Agora é trabalhar com tranquilidade e sem travamentos!",
      "Seguem os dados para o Pix:\nChave Pix: {PIX_KEY}\nNome: {USER_NAME}\nValor: R$ {PRICE_ONLINE},00 (Remoto / Online)",
      "Se puder indicar para outros colegas motoristas ou compartilhar nos grupos, agradeço muito!"
    ]
  };

  // Utilitário de pausa
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // ============================================================
  // 1. Armazenamento de Áudios Gravados (IndexedDB)
  // ============================================================
  const AudioStorage = {
    dbPromise: null,
    async getDB() {
      if (this.dbPromise) return this.dbPromise;
      this.dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open('ZeroLagAudioDB', 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('audios')) {
            db.createObjectStore('audios', { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      return this.dbPromise;
    },
    async save(id, blob, duration) {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('audios', 'readwrite');
        tx.objectStore('audios').put({ id, blob, duration, updatedAt: Date.now() });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    },
    async get(id) {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('audios', 'readonly');
        const req = tx.objectStore('audios').get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    },
    async delete(id) {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('audios', 'readwrite');
        tx.objectStore('audios').delete(id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    }
  };

  // ============================================================
  // 2. Detecção Automática do Primeiro Nome do Contato
  // ============================================================
  function getContactFirstName() {
    const header = document.querySelector('#main header');
    if (!header) return "";

    const nameEl =
      header.querySelector('div[role="button"] span[dir="auto"]') ||
      header.querySelector('span[dir="auto"]') ||
      header.querySelector('[data-testid="conversation-info-header-chat-title"]');

    if (!nameEl) return "";

    const raw = (nameEl.getAttribute('title') || nameEl.textContent || "").trim();
    if (!raw) return "";

    // Se for apenas número de telefone (+55 11 9..., etc.), não usar
    const digitsOnly = raw.replace(/\D/g, '');
    if (digitsOnly.length >= 8 && raw.replace(/[+\s\-()0-9]/g, '').length === 0) {
      return "";
    }

    // Extrair primeira palavra
    const firstWord = raw.split(/\s+/)[0];
    const cleanName = firstWord.replace(/[^\p{L}]/gu, '');

    if (cleanName.length >= 2 && cleanName.length <= 25) {
      return cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();
    }

    return "";
  }

  // ============================================================
  // 3. Gerador Oficial de Código Pix (EMV / Banco Central do Brasil)
  // ============================================================
  function formatEMV(id, value) {
    const len = String(value.length).padStart(2, '0');
    return `${id}${len}${value}`;
  }

  function calculateCRC16(payload) {
    let crc = 0xffff;
    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = ((crc << 1) ^ 0x1021) & 0xffff;
        } else {
          crc = (crc << 1) & 0xffff;
        }
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  function generatePixPayload({ key, name, city, amount, txid = "***" }) {
    const cleanName = (name || "EVANDRO MARQUES")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .slice(0, 25);
    const cleanCity = (city || "SAO PAULO")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .slice(0, 15);
    const cleanAmount = parseFloat(amount || 0).toFixed(2);

    const gui = formatEMV("00", "br.gov.bcb.pix");
    const pixKey = formatEMV("01", key.trim());
    const accountInfo = formatEMV("26", gui + pixKey);

    const payload =
      formatEMV("00", "01") +
      accountInfo +
      formatEMV("52", "0000") +
      formatEMV("53", "986") +
      formatEMV("54", cleanAmount) +
      formatEMV("58", "BR") +
      formatEMV("59", cleanName) +
      formatEMV("60", cleanCity) +
      formatEMV("62", formatEMV("05", txid)) +
      "6304";

    const crc = calculateCRC16(payload);
    return payload + crc;
  }

  // Enviar arquivo (Imagem QR Code ou Áudio OGG/MP3) no chat do WhatsApp
  async function pasteFileToWhatsApp(file) {
    const inputField = getChatInput();
    if (!inputField) {
      alert("⚠️ Abra uma conversa no WhatsApp Web primeiro!");
      return false;
    }

    inputField.focus();

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    const chatContainer = document.querySelector('#main footer') || document.querySelector('#main') || inputField;
    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: dataTransfer,
      bubbles: true,
      cancelable: true
    });
    chatContainer.dispatchEvent(pasteEvent);

    // Aguardar o modal nativo de envio de mídia do WhatsApp abrir
    let sendBtn = null;
    for (let attempt = 0; attempt < 20; attempt++) {
      await sleep(200);
      sendBtn =
        document.querySelector('div[aria-label="Enviar"]') ||
        document.querySelector('button[aria-label="Enviar"]') ||
        document.querySelector('span[data-icon="send"]')?.closest('button') ||
        document.querySelector('span[data-icon="send"]')?.closest('div[role="button"]');

      if (sendBtn && sendBtn.offsetParent !== null) {
        break;
      }
    }

    if (sendBtn) {
      await sleep(300);
      sendBtn.click();
      await sleep(600);
      return true;
    }

    return false;
  }

  // ============================================================
  // 4. Configurações e Layout
  // ============================================================
  function applyLayoutSettings() {
    const width = config.sidebarWidth || "330";
    document.documentElement.style.setProperty('--zld-sidebar-width', `${width}px`);

    if (config.sidebarMode === 'overlay') {
      document.body.classList.add('zld-mode-overlay');
    } else {
      document.body.classList.remove('zld-mode-overlay');
    }

    const presencialEl = document.querySelector('.price-chip.presencial b');
    if (presencialEl) presencialEl.textContent = `R$ ${config.pricePresencial || '50'}`;

    const onlineEl = document.querySelector('.price-chip.online b');
    if (onlineEl) onlineEl.textContent = `R$ ${config.priceOnline || '30'}`;

    window.dispatchEvent(new Event('resize'));
  }

  function loadSettings() {
    if (chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(null, (res) => {
        if (res) {
          config = { ...defaultConfig, ...res };
          applyLayoutSettings();
        }
      });
    }
  }

  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' || area === 'local') {
        loadSettings();
      }
    });
  }

  loadSettings();

  // Obter mensagens personalizadas com substituições dinâmicas
  function getFlowMessages(action) {
    let list = [];
    const custom = config.customFlows || {};

    if (action === 'msg1') {
      list = [
        custom.msg1_part1 || defaultFlows.msg1[0],
        custom.msg1_part2 || defaultFlows.msg1[1]
      ];
    } else if (action === 'msg2') {
      list = [
        custom.msg2_part1 || defaultFlows.msg2[0],
        custom.msg2_part2 || defaultFlows.msg2[1],
        custom.msg2_part3 || defaultFlows.msg2[2]
      ];
    } else if (action === 'msg3_presencial') {
      list = [
        custom.msg3p_part1 || defaultFlows.msg3_presencial[0],
        custom.msg3p_part2 || defaultFlows.msg3_presencial[1],
        custom.msg3p_part3 || defaultFlows.msg3_presencial[2]
      ];
    } else if (action === 'msg3_online') {
      list = [
        custom.msg3o_part1 || defaultFlows.msg3_online[0],
        custom.msg3o_part2 || defaultFlows.msg3_online[1],
        custom.msg3o_part3 || defaultFlows.msg3_online[2]
      ];
    } else if (action === 'msg4_usb') {
      list = [
        custom.msg4_part1 || defaultFlows.msg4_usb[0],
        custom.msg4_part2 || defaultFlows.msg4_usb[1]
      ];
    } else if (action === 'msg5_teste') {
      list = [
        custom.msg5_part1 || defaultFlows.msg5_teste[0],
        custom.msg5_part2 || defaultFlows.msg5_teste[1],
        custom.msg5_part3 || defaultFlows.msg5_teste[2]
      ];
    } else if (action === 'msg6_pix_presencial') {
      list = [
        custom.msg6_part1 || defaultFlows.msg6_pix_presencial[0],
        defaultFlows.msg6_pix_presencial[1],
        custom.msg6_part3 || defaultFlows.msg6_pix_presencial[2]
      ];
    } else if (action === 'msg6_pix_online') {
      list = [
        custom.msg6_part1 || defaultFlows.msg6_pix_online[0],
        defaultFlows.msg6_pix_online[1],
        custom.msg6_part3 || defaultFlows.msg6_pix_online[2]
      ];
    }

    // Personalização dinâmica com o primeiro nome do cliente aberto
    const contactName = getContactFirstName();
    const nameSuffix = contactName ? `, ${contactName}` : "";

    return list.map((msg) =>
      msg
        .replace(/\{NAME_SUFFIX\}/g, nameSuffix)
        .replace(/\{NOME\}/g, contactName || "")
        .replace(/\{PIX_KEY\}/g, config.pixKey || "11976920649")
        .replace(/\{USER_NAME\}/g, config.userName || "Evandro Marques")
        .replace(/\{PRICE_PRESENCIAL\}/g, config.pricePresencial || "50")
        .replace(/\{PRICE_ONLINE\}/g, config.priceOnline || "30")
        .replace(/\{NEIGHBORHOOD\}/g, config.neighborhood || "Zona Leste (SP)")
    );
  }

  // Localizar campo de digitação do WhatsApp Web
  function getChatInput() {
    return (
      document.querySelector('#main footer div[contenteditable="true"]') ||
      document.querySelector('footer div[contenteditable="true"][role="textbox"]') ||
      document.querySelector('div[contenteditable="true"][data-tab="10"]') ||
      document.querySelector('div[contenteditable="true"][role="textbox"]') ||
      document.querySelector('footer div[contenteditable="true"]')
    );
  }

  // Localizar botão de enviar do WhatsApp Web
  function getSendButton() {
    return (
      document.querySelector('footer button[aria-label="Enviar"]') ||
      document.querySelector('footer button[data-tab="11"]') ||
      document.querySelector('footer span[data-icon="send"]')?.closest('button') ||
      document.querySelector('footer span[data-icon="ptt-send"]')?.closest('button') ||
      document.querySelector('#main footer button:has(span[data-icon="send"])') ||
      document.querySelector('footer [data-icon="send"]')?.parentElement
    );
  }

  // Digitação rápida ou instantânea
  async function typeMessageIntoWhatsApp(input, text, isAborted) {
    input.focus();

    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);

    if (config.typingSpeed === 'instant') {
      document.execCommand('insertText', false, text);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(100);
      return true;
    }

    const delayRange = config.typingSpeed === 'medium' ? [25, 35] : [12, 18];

    for (let i = 0; i < text.length; i++) {
      if (isAborted()) return false;

      const char = text[i];

      if (char === '\n') {
        input.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            shiftKey: true,
            bubbles: true,
            cancelable: true
          })
        );
        try {
          input.dispatchEvent(
            new InputEvent('beforeinput', {
              inputType: 'insertLineBreak',
              bubbles: true,
              cancelable: true
            })
          );
        } catch (e) {}
        await sleep(25);
      } else {
        document.execCommand('insertText', false, char);
        await sleep(delayRange[0] + Math.floor(Math.random() * (delayRange[1] - delayRange[0])));
      }
    }

    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  // Envio da mensagem
  async function sendCurrentMessage(input, isAborted) {
    if (isAborted()) return false;
    await sleep(200);

    const sendBtn = getSendButton();
    if (sendBtn) {
      sendBtn.click();
    } else {
      input.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true
        })
      );
    }

    await sleep(350);
    return true;
  }

  // ============================================================
  // 5. Execução de Fluxo de Texto
  // ============================================================
  let currentFlow = null;

  async function executeFlow(action, btn) {
    const messages = getFlowMessages(action);
    if (!messages || messages.length === 0) return;

    if (currentFlow) {
      const isSame = currentFlow.btn === btn;
      currentFlow.aborted = true;
      if (currentFlow.cleanup) currentFlow.cleanup();
      currentFlow = null;
      if (isSame) return;
    }

    const input = getChatInput();
    if (!input) {
      alert("⚠️ Abra uma conversa no WhatsApp Web primeiro!");
      return;
    }

    const flowState = { aborted: false, btn: btn, cleanup: null };
    currentFlow = flowState;

    const originalHTML = btn.innerHTML;
    flowState.cleanup = () => {
      btn.classList.remove('is-active-flow', 'is-success');
      btn.innerHTML = originalHTML;
    };

    btn.classList.add('is-active-flow');

    try {
      for (let i = 0; i < messages.length; i++) {
        if (flowState.aborted) break;

        const msgIndex = i + 1;
        const total = messages.length;
        const text = messages[i];

        btn.innerHTML = `
          <div class="btn-top">
            <span class="step-num">${msgIndex}/${total}</span>
            <span class="step-label">Digitando...</span>
          </div>
          <div class="zld-flow-status">
            <div class="zld-pulse-dot"></div>
            <span>Mensagem ${msgIndex} de ${total} (Clique p/ parar)</span>
          </div>
        `;

        const typed = await typeMessageIntoWhatsApp(input, text, () => flowState.aborted);
        if (!typed || flowState.aborted) break;

        btn.innerHTML = `
          <div class="btn-top">
            <span class="step-num">${msgIndex}/${total}</span>
            <span class="step-label">Enviando...</span>
          </div>
          <div class="zld-flow-status">
            <div class="zld-pulse-dot"></div>
            <span>Enviando ${msgIndex}/${total}...</span>
          </div>
        `;

        await sendCurrentMessage(input, () => flowState.aborted);
        if (flowState.aborted) break;

        if (i < total - 1 && !flowState.aborted) {
          btn.innerHTML = `
            <div class="btn-top">
              <span class="step-num">${msgIndex}/${total}</span>
              <span class="step-label">Aguardando...</span>
            </div>
            <div class="zld-flow-status">
              <div class="zld-pulse-dot"></div>
              <span>Pausa natural...</span>
            </div>
          `;
          await sleep(config.pauseDelay || 1300);
        }
      }

      if (!flowState.aborted) {
        btn.classList.remove('is-active-flow');
        btn.classList.add('is-success');
        btn.innerHTML = `
          <div class="btn-top">
            <span class="step-num">✓</span>
            <span class="step-label" style="color:var(--wa-teal)">Enviado com Sucesso!</span>
          </div>
          <div class="zld-flow-status" style="color:var(--wa-teal)">
            <span>Fluxo de ${messages.length} mensagens concluído</span>
          </div>
        `;
        await sleep(2200);
      }
    } catch (err) {
      console.error("Erro no fluxo ZeroLagDroid:", err);
    } finally {
      if (currentFlow === flowState) {
        flowState.cleanup();
        currentFlow = null;
      }
    }
  }

  // ============================================================
  // 6. Envio de Áudio Pré-Gravado (PTT / Nota de Voz)
  // ============================================================
  async function sendAudioStep(action, btn) {
    const audioData = await AudioStorage.get(action);
    if (!audioData || !audioData.blob) {
      const wantRecord = confirm(
        "🎙️ Você ainda não gravou o áudio para esta etapa!\n\nDeseja abrir a Central de Ajustes para gravar sua voz agora?"
      );
      if (wantRecord) {
        openModal('tab-m-audio');
      }
      return;
    }

    const originalHTML = btn.innerHTML;
    btn.classList.add('is-active-flow');
    btn.innerHTML = `
      <div class="btn-top">
        <span class="step-num">🎙️</span>
        <span class="step-label">Anexando Áudio...</span>
      </div>
      <div class="zld-flow-status">
        <div class="zld-pulse-dot"></div>
        <span>Enviando áudio gravado (${audioData.duration || ''}s)...</span>
      </div>
    `;

    try {
      const ext = audioData.blob.type.includes('mp3') ? 'mp3' : 'ogg';
      const audioFile = new File([audioData.blob], `zerolag_${action}.${ext}`, {
        type: audioData.blob.type || 'audio/ogg'
      });

      const success = await pasteFileToWhatsApp(audioFile);
      if (success) {
        btn.classList.remove('is-active-flow');
        btn.classList.add('is-success');
        btn.innerHTML = `
          <div class="btn-top">
            <span class="step-num">✓</span>
            <span class="step-label" style="color:var(--wa-teal)">Áudio Enviado!</span>
          </div>
          <div class="zld-flow-status" style="color:var(--wa-teal)">
            <span>Áudio entregue na conversa</span>
          </div>
        `;
        await sleep(2000);
      } else {
        alert("⚠️ Não foi possível anexar o áudio. Verifique se o chat está aberto.");
      }
    } catch (err) {
      console.error("Erro ao enviar áudio:", err);
    } finally {
      btn.classList.remove('is-active-flow', 'is-success');
      btn.innerHTML = originalHTML;
    }
  }

  // ============================================================
  // 7. Envio do QR Code Pix Direto no Chat
  // ============================================================
  async function sendPixQRCode(amount, btn) {
    if (!window.ZeroLagQR || !window.ZeroLagQR.generatePixCardCanvas) {
      alert("⚠️ Gerador de QR Code indisponível. Recarregue a página.");
      return;
    }

    const originalHTML = btn.innerHTML;
    btn.innerHTML = `⏳ Gerando QR Code...`;

    try {
      const payload = generatePixPayload({
        key: config.pixKey || "11976920649",
        name: config.userName || "EVANDRO MARQUES",
        city: config.city || "SAO PAULO",
        amount: String(amount)
      });

      const cardCanvas = window.ZeroLagQR.generatePixCardCanvas({
        payload: payload,
        valor: `${amount},00`,
        nome: config.userName || "Evandro Marques",
        chavePix: config.pixKey || "11976920649"
      });

      cardCanvas.toBlob(async (blob) => {
        const file = new File([blob], `pix_${amount}_zerolagdroid.png`, { type: 'image/png' });
        btn.innerHTML = `🚀 Enviando QR Code...`;

        const sent = await pasteFileToWhatsApp(file);
        if (sent) {
          // Após enviar a imagem do QR Code, envia a chave Copia e Cola como texto
          await sleep(600);
          const input = getChatInput();
          if (input) {
            const copiaColaMsg = `💰 Pix Copia e Cola (R$ ${amount},00):\n${payload}`;
            await typeMessageIntoWhatsApp(input, copiaColaMsg, () => false);
            await sendCurrentMessage(input, () => false);
          }
          btn.innerHTML = `✅ QR Code Enviado!`;
          await sleep(1800);
        } else {
          alert("Não foi possível enviar a imagem do QR Code. O chat está aberto?");
        }
        btn.innerHTML = originalHTML;
      }, 'image/png');
    } catch (err) {
      console.error("Erro ao gerar QR Code:", err);
      btn.innerHTML = originalHTML;
    }
  }

  // ============================================================
  // 8. Criação da Barra Lateral e Modal Centralizado
  // ============================================================
  function createSidebar() {
    if (document.getElementById('zerolag-sidebar-root')) return;

    const root = document.createElement('div');
    root.id = 'zerolag-sidebar-root';
    root.innerHTML = `
      <!-- Botão Retrátil Lateral Nativo -->
      <button id="zerolag-handle-btn" title="Expandir/Recolher Painel ZeroLag">
        <span class="handle-arrow">◀</span>
        <span class="handle-badge">🚀 ZeroLag</span>
      </button>

      <!-- Barra Lateral -->
      <aside id="zerolag-sidebar">
        <!-- Cabeçalho Otimizado Idêntico ao WhatsApp (59px) -->
        <div class="zld-sidebar-header">
          <div class="zld-header-left">
            <div class="zld-avatar">🚀</div>
            <div class="zld-brand-info">
              <span class="brand-title">ZeroLagDroid</span>
              <span class="brand-sub">online • Atendimento</span>
            </div>
          </div>
          <div class="zld-header-actions">
            <button id="zld-settings-btn" class="zld-icon-btn" title="Ajustes & Personalização">
              <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
            </button>
          </div>
        </div>

        <div class="zld-price-bar">
          <div class="price-chip presencial">
            <span>📍 ZL (Presencial)</span>
            <b>R$ ${config.pricePresencial || '50'}</b>
          </div>
          <div class="price-chip online">
            <span>💻 Remoto (PC)</span>
            <b>R$ ${config.priceOnline || '30'}</b>
          </div>
        </div>

        <div class="zld-content-scroll">
          <div class="zld-section-title">Fluxos de Atendimento (Texto ou Áudio)</div>

          <!-- Etapa 1 -->
          <div class="zld-script-btn" data-action="msg1">
            <div class="btn-top">
              <div class="btn-top-left">
                <span class="step-num">1</span>
                <span class="step-label">Boas-Vindas & Modelo</span>
              </div>
              <div class="zld-dual-actions">
                <button class="zld-action-pill text-action" data-mode="text" title="Digitar Texto">💬 Texto</button>
                <button class="zld-action-pill audio audio-action" data-mode="audio" title="Enviar Áudio Gravado">🎙️ Áudio</button>
              </div>
            </div>
            <div class="btn-preview">Saudação personalizada com nome + pergunta modelo</div>
          </div>

          <!-- Etapa 2 -->
          <div class="zld-script-btn highlight" data-action="msg2">
            <div class="btn-top">
              <div class="btn-top-left">
                <span class="step-num">2</span>
                <span class="step-label">Explicação, Garantia & Preços</span>
              </div>
              <div class="zld-dual-actions">
                <button class="zld-action-pill text-action" data-mode="text" title="Digitar Texto">💬 Texto</button>
                <button class="zld-action-pill audio audio-action" data-mode="audio" title="Enviar Áudio Gravado">🎙️ Áudio</button>
              </div>
            </div>
            <div class="btn-preview">Como funciona + R$ 50 ZL / R$ 30 Online + Garantia</div>
          </div>

          <!-- Etapa 3A e 3B -->
          <div class="zld-grid-2">
            <div class="zld-script-btn" data-action="msg3_presencial">
              <div class="btn-top">
                <div class="btn-top-left">
                  <span class="step-num">3A</span>
                  <span class="step-label">Presencial ZL</span>
                </div>
                <button class="zld-action-pill audio audio-action" data-mode="audio" title="Enviar Áudio">🎙️</button>
              </div>
              <div class="btn-preview">Posto/ponto ZL</div>
            </div>

            <div class="zld-script-btn" data-action="msg3_online">
              <div class="btn-top">
                <div class="btn-top-left">
                  <span class="step-num">3B</span>
                  <span class="step-label">Remoto PC</span>
                </div>
                <button class="zld-action-pill audio audio-action" data-mode="audio" title="Enviar Áudio">🎙️</button>
              </div>
              <div class="btn-preview">AnyDesk + USB</div>
            </div>
          </div>

          <!-- Etapa 4 -->
          <div class="zld-script-btn" data-action="msg4_usb">
            <div class="btn-top">
              <div class="btn-top-left">
                <span class="step-num">4</span>
                <span class="step-label">Ativar Depuração USB</span>
              </div>
              <div class="zld-dual-actions">
                <button class="zld-action-pill text-action" data-mode="text" title="Digitar Texto">💬 Texto</button>
                <button class="zld-action-pill audio audio-action" data-mode="audio" title="Enviar Áudio">🎙️ Áudio</button>
              </div>
            </div>
            <div class="btn-preview">Passo a passo com 7 toques + autorização</div>
          </div>

          <!-- Etapa 5 -->
          <div class="zld-script-btn" data-action="msg5_teste">
            <div class="btn-top">
              <div class="btn-top-left">
                <span class="step-num">5</span>
                <span class="step-label">Teste Pós-Otimização</span>
              </div>
              <div class="zld-dual-actions">
                <button class="zld-action-pill text-action" data-mode="text" title="Digitar Texto">💬 Texto</button>
                <button class="zld-action-pill audio audio-action" data-mode="audio" title="Enviar Áudio">🎙️ Áudio</button>
              </div>
            </div>
            <div class="btn-preview">Reiniciado + testar Uber/99/Maps</div>
          </div>

          <!-- Seção de Cobrança Pix -->
          <div class="zld-section-title">Cobrança Pix & QR Code</div>

          <div class="zld-grid-2">
            <!-- Pix R$ 50 -->
            <div class="zld-script-btn pix-btn" data-action="msg6_pix_presencial">
              <div class="btn-top">
                <span style="font-weight: 700;">💰 Presencial R$ 50</span>
              </div>
              <div class="zld-pix-actions">
                <button class="zld-pix-subbtn" data-pix-type="text" data-amount="50">💬 Texto</button>
                <button class="zld-pix-subbtn" data-pix-type="qr" data-amount="50">📷 QR Code</button>
              </div>
            </div>

            <!-- Pix R$ 30 -->
            <div class="zld-script-btn pix-btn" data-action="msg6_pix_online">
              <div class="btn-top">
                <span style="font-weight: 700;">💰 Remoto R$ 30</span>
              </div>
              <div class="zld-pix-actions">
                <button class="zld-pix-subbtn" data-pix-type="text" data-amount="30">💬 Texto</button>
                <button class="zld-pix-subbtn" data-pix-type="qr" data-amount="30">📷 QR Code</button>
              </div>
            </div>
          </div>
        </div>

        <div class="zld-sidebar-footer">
          <small>Clique no texto ou no microfone para enviar no formato desejado.</small>
        </div>
      </aside>

      <!-- Modal Flutuante Centralizado de Ajustes -->
      <div id="zld-modal-overlay" class="zld-modal-backdrop" style="display: none;">
        <div class="zld-modal-window">
          <div class="zld-modal-header">
            <div class="zld-modal-title">
              <span style="font-size: 20px;">⚙️</span>
              <h3>Ajustes & Personalização - ZeroLagDroid</h3>
            </div>
            <button id="zld-modal-close" class="zld-icon-btn" title="Fechar">&times;</button>
          </div>

          <div class="zld-modal-tabs">
            <button class="zld-modal-tab-btn active" data-tab="tab-m-pix">💰 Pix & Valores</button>
            <button class="zld-modal-tab-btn" data-tab="tab-m-audio">🎙️ Gravar Áudios</button>
            <button class="zld-modal-tab-btn" data-tab="tab-m-layout">🖥️ Layout da Barra</button>
            <button class="zld-modal-tab-btn" data-tab="tab-m-speed">⚡ Digitação</button>
            <button class="zld-modal-tab-btn" data-tab="tab-m-scripts">📝 Roteiro das Mensagens</button>
          </div>

          <div class="zld-modal-body">
            <!-- Aba 1: Pix & Valores -->
            <div id="tab-m-pix" class="zld-modal-tab-content">
              <div class="zld-card-section">
                <div class="zld-card-section-title">Dados de Recebimento Pix & QR Code</div>
                <div class="zld-form-group">
                  <label>Chave Pix:</label>
                  <input type="text" id="m_pixKey" placeholder="Ex: Telefone, CPF ou E-mail">
                  <div class="zld-help">Usada para gerar o QR Code oficial do Banco Central e as mensagens de cobrança.</div>
                </div>
                <div class="zld-form-group" style="margin-top: 12px;">
                  <label>Nome do Titular:</label>
                  <input type="text" id="m_userName" placeholder="Ex: Evandro Marques">
                  <div class="zld-help">Nome completo exibido no QR Code e no comprovante do Pix.</div>
                </div>
                <div class="zld-form-group" style="margin-top: 12px;">
                  <label>Cidade do Titular (para o QR Code Pix):</label>
                  <input type="text" id="m_city" value="SAO PAULO">
                </div>
              </div>

              <div class="zld-card-section">
                <div class="zld-card-section-title">Valores dos Serviços & Bairro</div>
                <div style="display: flex; gap: 12px;">
                  <div class="zld-form-group" style="flex: 1;">
                    <label>Valor Presencial (R$):</label>
                    <input type="number" id="m_pricePresencial" value="50">
                  </div>
                  <div class="zld-form-group" style="flex: 1;">
                    <label>Valor Remoto / Online (R$):</label>
                    <input type="number" id="m_priceOnline" value="30">
                  </div>
                </div>
                <div class="zld-form-group" style="margin-top: 12px;">
                  <label>Região / Bairro de Atendimento Presencial:</label>
                  <input type="text" id="m_neighborhood" value="Zona Leste (SP)">
                </div>
              </div>
            </div>

            <!-- Aba 2: Gravador de Áudios -->
            <div id="tab-m-audio" class="zld-modal-tab-content" style="display: none;">
              <div class="zld-help" style="margin-bottom: 14px; font-size: 12px;">
                💡 <b>Dica de Ouro:</b> Grave com a sua voz falando de forma descontraída. O áudio será enviado com microfone verde no WhatsApp como se tivesse sido gravado na hora!
              </div>

              <div id="zld-audio-items-container">
                <!-- Itens de áudio são gerados dinamicamente via JS -->
              </div>
            </div>

            <!-- Aba 3: Layout da Barra -->
            <div id="tab-m-layout" class="zld-modal-tab-content" style="display: none;">
              <div class="zld-card-section">
                <div class="zld-card-section-title">Dimensões e Comportamento da Barra</div>
                <div class="zld-form-group">
                  <label>Largura da Barra Lateral:</label>
                  <select id="m_sidebarWidth">
                    <option value="300">300px - Compacta (Notebooks e telas menores)</option>
                    <option value="330">330px - Padrão WhatsApp (Recomendado)</option>
                    <option value="360">360px - Confortável</option>
                  </select>
                </div>
                <div class="zld-form-group" style="margin-top: 14px;">
                  <label>Comportamento em Relação ao WhatsApp:</label>
                  <select id="m_sidebarMode">
                    <option value="compress">Comprimir WhatsApp (Lado a lado sem cobrir as conversas)</option>
                    <option value="overlay">Sobrepor (Barra flutua por cima do WhatsApp sem redimensioná-lo)</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Aba 4: Digitação -->
            <div id="tab-m-speed" class="zld-modal-tab-content" style="display: none;">
              <div class="zld-card-section">
                <div class="zld-card-section-title">Velocidade e Intervalos</div>
                <div class="zld-form-group">
                  <label>Velocidade de Digitação por Letra:</label>
                  <select id="m_typingSpeed">
                    <option value="fast">Rápida (12-18ms por caractere - natural e veloz)</option>
                    <option value="medium">Moderada (25-35ms por caractere)</option>
                    <option value="instant">Instantânea (Cola a mensagem de uma vez)</option>
                  </select>
                </div>
                <div class="zld-form-group" style="margin-top: 14px;">
                  <label>Pausa Entre Mensagens Sequenciais:</label>
                  <select id="m_pauseDelay">
                    <option value="1000">1.0 segundo (Mais rápido)</option>
                    <option value="1300">1.3 segundos (Intervalo natural ideal)</option>
                    <option value="1800">1.8 segundos (Mais espaçado)</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Aba 5: Roteiro das Mensagens -->
            <div id="tab-m-scripts" class="zld-modal-tab-content" style="display: none;">
              <div class="zld-card-section">
                <div class="zld-card-section-title">Etapa 1: Boas-Vindas & Modelo</div>
                <div class="zld-form-group">
                  <label>Mensagem 1 (Saudação com nome automático {NAME_SUFFIX}):</label>
                  <textarea id="m_msg1_part1"></textarea>
                  <div class="zld-help">A tag {NAME_SUFFIX} insere automaticamente ", [PrimeiroNome]" se houver nome na conversa.</div>
                </div>
                <div class="zld-form-group" style="margin-top: 8px;">
                  <label>Mensagem 2 (Pergunta de modelo e apps):</label>
                  <textarea id="m_msg1_part2"></textarea>
                </div>
              </div>

              <div class="zld-card-section">
                <div class="zld-card-section-title">Etapa 2: Explicação, Garantia & Preços</div>
                <div class="zld-form-group">
                  <label>Mensagem 1 (Diagnóstico):</label>
                  <textarea id="m_msg2_part1"></textarea>
                </div>
                <div class="zld-form-group" style="margin-top: 8px;">
                  <label>Mensagem 2 (O que é feito / sem formatação):</label>
                  <textarea id="m_msg2_part2"></textarea>
                </div>
                <div class="zld-form-group" style="margin-top: 8px;">
                  <label>Mensagem 3 (Valores e Garantia pós-teste):</label>
                  <textarea id="m_msg2_part3"></textarea>
                </div>
              </div>

              <div class="zld-card-section">
                <div class="zld-card-section-title">Etapa 3A: Presencial ZL</div>
                <div class="zld-form-group">
                  <label>Mensagem 1 (Região):</label>
                  <textarea id="m_msg3p_part1"></textarea>
                </div>
                <div class="zld-form-group" style="margin-top: 8px;">
                  <label>Mensagem 2 (Local de encontro e rapidez):</label>
                  <textarea id="m_msg3p_part2"></textarea>
                </div>
                <div class="zld-form-group" style="margin-top: 8px;">
                  <label>Mensagem 3 (Pergunta do bairro):</label>
                  <textarea id="m_msg3p_part3"></textarea>
                </div>
              </div>

              <div class="zld-card-section">
                <div class="zld-card-section-title">Etapa 3B: Remoto (PC / Online)</div>
                <div class="zld-form-group">
                  <label>Mensagem 1 (Apresentação):</label>
                  <textarea id="m_msg3o_part1"></textarea>
                </div>
                <div class="zld-form-group" style="margin-top: 8px;">
                  <label>Mensagem 2 (AnyDesk e USB):</label>
                  <textarea id="m_msg3o_part2"></textarea>
                </div>
                <div class="zld-form-group" style="margin-top: 8px;">
                  <label>Mensagem 3 (Pergunta se tem PC):</label>
                  <textarea id="m_msg3o_part3"></textarea>
                </div>
              </div>

              <div class="zld-card-section">
                <div class="zld-card-section-title">Etapa 4: Depuração USB</div>
                <div class="zld-form-group">
                  <label>Mensagem 1:</label>
                  <textarea id="m_msg4_part1"></textarea>
                </div>
                <div class="zld-form-group" style="margin-top: 8px;">
                  <label>Mensagem 2 (Passo a passo):</label>
                  <textarea id="m_msg4_part2"></textarea>
                </div>
              </div>

              <div class="zld-card-section">
                <div class="zld-card-section-title">Etapa 5: Teste Pós-Otimização</div>
                <div class="zld-form-group">
                  <label>Mensagem 1 (Aparelho reiniciado):</label>
                  <textarea id="m_msg5_part1"></textarea>
                </div>
                <div class="zld-form-group" style="margin-top: 8px;">
                  <label>Mensagem 2 (Pede para testar):</label>
                  <textarea id="m_msg5_part2"></textarea>
                </div>
                <div class="zld-form-group" style="margin-top: 8px;">
                  <label>Mensagem 3 (Pergunta se ficou rápido):</label>
                  <textarea id="m_msg5_part3"></textarea>
                </div>
              </div>

              <div class="zld-card-section">
                <div class="zld-card-section-title">Etapa 6: Agradecimento & Indicação</div>
                <div class="zld-form-group">
                  <label>Mensagem 1 (Agradecimento):</label>
                  <textarea id="m_msg6_part1"></textarea>
                </div>
                <div class="zld-form-group" style="margin-top: 8px;">
                  <label>Mensagem 3 (Pedido de indicação):</label>
                  <textarea id="m_msg6_part3"></textarea>
                </div>
              </div>
            </div>
          </div>

          <div class="zld-modal-footer">
            <button id="zld-modal-reset" class="zld-btn-ghost">🔄 Restaurar Padrões</button>
            <button id="zld-modal-save" class="zld-btn-primary">💾 Salvar Alterações</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    const handleBtn = document.getElementById('zerolag-handle-btn');
    const settingsBtn = document.getElementById('zld-settings-btn');
    const arrow = handleBtn.querySelector('.handle-arrow');

    // Alternar Barra Lateral
    function toggleSidebar(open) {
      const isOpen = typeof open === 'boolean' ? open : !document.body.classList.contains('zld-sidebar-open');

      if (isOpen) {
        document.body.classList.add('zld-sidebar-open');
        arrow.textContent = '▶';
        handleBtn.title = "Recolher Painel ZeroLag";
      } else {
        document.body.classList.remove('zld-sidebar-open');
        arrow.textContent = '◀';
        handleBtn.title = "Expandir Painel ZeroLag";
      }

      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ zld_sidebar_open: isOpen });
      }

      setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
      setTimeout(() => window.dispatchEvent(new Event('resize')), 280);
    }

    handleBtn.addEventListener('click', () => toggleSidebar());

    // Gerenciamento do Modal Flutuante Centralizado
    const modalOverlay = document.getElementById('zld-modal-overlay');
    const modalCloseBtn = document.getElementById('zld-modal-close');
    const modalSaveBtn = document.getElementById('zld-modal-save');
    const modalResetBtn = document.getElementById('zld-modal-reset');

    function populateModalFields() {
      document.getElementById('m_pixKey').value = config.pixKey || "11976920649";
      document.getElementById('m_userName').value = config.userName || "Evandro Marques";
      document.getElementById('m_city').value = config.city || "SAO PAULO";
      document.getElementById('m_neighborhood').value = config.neighborhood || "Zona Leste (SP)";
      document.getElementById('m_pricePresencial').value = config.pricePresencial || "50";
      document.getElementById('m_priceOnline').value = config.priceOnline || "30";
      document.getElementById('m_sidebarWidth').value = config.sidebarWidth || "330";
      document.getElementById('m_sidebarMode').value = config.sidebarMode || "compress";
      document.getElementById('m_typingSpeed').value = config.typingSpeed || "fast";
      document.getElementById('m_pauseDelay').value = config.pauseDelay || "1300";

      const c = config.customFlows || {};
      document.getElementById('m_msg1_part1').value = c.msg1_part1 || defaultFlows.msg1[0];
      document.getElementById('m_msg1_part2').value = c.msg1_part2 || defaultFlows.msg1[1];

      document.getElementById('m_msg2_part1').value = c.msg2_part1 || defaultFlows.msg2[0];
      document.getElementById('m_msg2_part2').value = c.msg2_part2 || defaultFlows.msg2[1];
      document.getElementById('m_msg2_part3').value = c.msg2_part3 || defaultFlows.msg2[2];

      document.getElementById('m_msg3p_part1').value = c.msg3p_part1 || defaultFlows.msg3_presencial[0];
      document.getElementById('m_msg3p_part2').value = c.msg3p_part2 || defaultFlows.msg3_presencial[1];
      document.getElementById('m_msg3p_part3').value = c.msg3p_part3 || defaultFlows.msg3_presencial[2];

      document.getElementById('m_msg3o_part1').value = c.msg3o_part1 || defaultFlows.msg3_online[0];
      document.getElementById('m_msg3o_part2').value = c.msg3o_part2 || defaultFlows.msg3_online[1];
      document.getElementById('m_msg3o_part3').value = c.msg3o_part3 || defaultFlows.msg3_online[2];

      document.getElementById('m_msg4_part1').value = c.msg4_part1 || defaultFlows.msg4_usb[0];
      document.getElementById('m_msg4_part2').value = c.msg4_part2 || defaultFlows.msg4_usb[1];

      document.getElementById('m_msg5_part1').value = c.msg5_part1 || defaultFlows.msg5_teste[0];
      document.getElementById('m_msg5_part2').value = c.msg5_part2 || defaultFlows.msg5_teste[1];
      document.getElementById('m_msg5_part3').value = c.msg5_part3 || defaultFlows.msg5_teste[2];

      document.getElementById('m_msg6_part1').value = c.msg6_part1 || defaultFlows.msg6_pix_presencial[0];
      document.getElementById('m_msg6_part3').value = c.msg6_part3 || defaultFlows.msg6_pix_presencial[2];

      renderAudioRecordingItems();
    }

    function openModal(defaultTabId) {
      populateModalFields();
      if (defaultTabId) {
        modalOverlay.querySelectorAll('.zld-modal-tab-btn').forEach((b) => b.classList.remove('active'));
        modalOverlay.querySelectorAll('.zld-modal-tab-content').forEach((c) => (c.style.display = 'none'));
        const tabBtn = modalOverlay.querySelector(`[data-tab="${defaultTabId}"]`);
        if (tabBtn) tabBtn.classList.add('active');
        const tabContent = document.getElementById(defaultTabId);
        if (tabContent) tabContent.style.display = 'block';
      }
      modalOverlay.style.display = 'flex';
    }

    function closeModal() {
      modalOverlay.style.display = 'none';
      if (activeMediaRecorder && activeMediaRecorder.state !== 'inactive') {
        activeMediaRecorder.stop();
      }
    }

    if (settingsBtn) settingsBtn.addEventListener('click', () => openModal());
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);

    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalOverlay.style.display === 'flex') {
        closeModal();
      }
    });

    modalOverlay.querySelectorAll('.zld-modal-tab-btn').forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => {
        modalOverlay.querySelectorAll('.zld-modal-tab-btn').forEach((b) => b.classList.remove('active'));
        modalOverlay.querySelectorAll('.zld-modal-tab-content').forEach((c) => (c.style.display = 'none'));

        tabBtn.classList.add('active');
        const targetId = tabBtn.getAttribute('data-tab');
        const targetEl = document.getElementById(targetId);
        if (targetEl) targetEl.style.display = 'block';
      });
    });

    // ============================================================
    // Gerenciador do Gravador de Áudios (com microfone)
    // ============================================================
    let activeMediaRecorder = null;
    let activeStream = null;
    let activeInterval = null;

    const audioStepsList = [
      { id: 'msg1', title: 'Etapa 1: Boas-Vindas & Modelo', script: 'Olá parceiro, tudo bem? Vi sua mensagem aqui! Me fala qual modelo do seu celular e quais apps você mais roda no dia a dia? Uber, 99 ou iFood?' },
      { id: 'msg2', title: 'Etapa 2: Explicação & Valores', script: 'Esse aparelho é excelente! O que pesa nele são os processos de fábrica acumulados em segundo plano. Pelo computador eu tiro todo esse peso, libero memória RAM e blindo os apps de corrida sem formatar nada. Fica R$ 50 presencial na ZL ou R$ 30 remoto, e você só paga depois que testar e aprovar!' },
      { id: 'msg3_presencial', title: 'Etapa 3A: Presencial ZL', script: 'Sobre o presencial, eu atendo na Zona Leste de SP. Marcamos num shopping, posto ou ponto de apoio. Levo o notebook e em 10 minutos entrego pronto. Qual bairro fica melhor pra você?' },
      { id: 'msg3_online', title: 'Etapa 3B: Remoto (PC / Online)', script: 'Pro atendimento remoto de R$ 30, você só precisa de um computador com internet. Plugamos o celular no cabo USB e faço tudo à distância pelo AnyDesk na sua tela. Você tem PC aí agora?' },
      { id: 'msg4_usb', title: 'Etapa 4: Depuração USB', script: 'Pra conectar, vai em Configurações > Sobre o telefone > Informações do software e clica 7 vezes em Número de compilação. Depois abre Opções do desenvolvedor, ativa Depuração USB e conecta o cabo no PC marcando sempre permitir.' },
      { id: 'msg5_teste', title: 'Etapa 5: Teste Pós-Otimização', script: 'Prontinho parceiro! Aparelho 100% otimizado e reiniciado. Abre a Uber, a 99 e o Maps aí agora pra sentir a fluidez. Ficou bem mais rápido no toque?' }
    ];

    async function renderAudioRecordingItems() {
      const container = document.getElementById('zld-audio-items-container');
      if (!container) return;
      container.innerHTML = '';

      for (const item of audioStepsList) {
        const audioData = await AudioStorage.get(item.id);
        const hasAudio = !!audioData && !!audioData.blob;

        const card = document.createElement('div');
        card.className = 'zld-audio-item';
        card.innerHTML = `
          <div class="zld-audio-item-header">
            <span class="zld-audio-title">${item.title}</span>
            <span class="zld-audio-status ${hasAudio ? 'has-audio' : ''}" id="status_${item.id}">
              ${hasAudio ? `✅ Gravado (${audioData.duration || ''}s)` : '⚪ Nenhum áudio'}
            </span>
          </div>
          <div class="zld-audio-script">"${item.script}"</div>
          <div class="zld-audio-controls">
            <button class="zld-audio-btn record" id="rec_btn_${item.id}">🔴 Gravar Voz</button>
            <button class="zld-audio-btn stop" id="stop_btn_${item.id}" style="display:none;">⏹️ Parar Gravação</button>
            <button class="zld-audio-btn play" id="play_btn_${item.id}" style="${hasAudio ? '' : 'display:none;'}">▶️ Ouvir</button>
            <button class="zld-audio-btn delete" id="del_btn_${item.id}" style="${hasAudio ? '' : 'display:none;'}" title="Excluir áudio">🗑️</button>
          </div>
        `;

        container.appendChild(card);

        const recBtn = card.querySelector(`#rec_btn_${item.id}`);
        const stopBtn = card.querySelector(`#stop_btn_${item.id}`);
        const playBtn = card.querySelector(`#play_btn_${item.id}`);
        const delBtn = card.querySelector(`#del_btn_${item.id}`);
        const statusEl = card.querySelector(`#status_${item.id}`);

        // Iniciar gravação
        recBtn.addEventListener('click', async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            activeStream = stream;
            const chunks = [];
            const recorder = new MediaRecorder(stream);
            activeMediaRecorder = recorder;

            recorder.ondataavailable = (e) => {
              if (e.data.size > 0) chunks.push(e.data);
            };

            let sec = 0;
            statusEl.textContent = 'Gravando: 00:00 🔴';
            statusEl.className = 'zld-audio-status';
            activeInterval = setInterval(() => {
              sec++;
              const m = String(Math.floor(sec / 60)).padStart(2, '0');
              const s = String(sec % 60).padStart(2, '0');
              statusEl.textContent = `Gravando: ${m}:${s} 🔴`;
            }, 1000);

            recBtn.style.display = 'none';
            stopBtn.style.display = 'inline-flex';

            recorder.onstop = async () => {
              clearInterval(activeInterval);
              stream.getTracks().forEach((t) => t.stop());
              const mime = recorder.mimeType || 'audio/ogg; codecs=opus';
              const blob = new Blob(chunks, { type: mime });
              await AudioStorage.save(item.id, blob, sec);
              statusEl.textContent = `✅ Gravado (${sec}s)`;
              statusEl.className = 'zld-audio-status has-audio';
              recBtn.style.display = 'inline-flex';
              recBtn.textContent = '🔄 Regravar';
              stopBtn.style.display = 'none';
              playBtn.style.display = 'inline-flex';
              delBtn.style.display = 'inline-flex';
            };

            recorder.start();
          } catch (err) {
            alert("Não foi possível acessar o microfone: " + err.message);
          }
        });

        // Parar gravação
        stopBtn.addEventListener('click', () => {
          if (activeMediaRecorder && activeMediaRecorder.state !== 'inactive') {
            activeMediaRecorder.stop();
          }
        });

        // Ouvir áudio gravado
        playBtn.addEventListener('click', async () => {
          const currentAudio = await AudioStorage.get(item.id);
          if (currentAudio && currentAudio.blob) {
            const audioUrl = URL.createObjectURL(currentAudio.blob);
            const audio = new Audio(audioUrl);
            audio.play();
          }
        });

        // Excluir áudio gravado
        delBtn.addEventListener('click', async () => {
          if (confirm("Deseja excluir a gravação desta etapa?")) {
            await AudioStorage.delete(item.id);
            statusEl.textContent = '⚪ Nenhum áudio';
            statusEl.className = 'zld-audio-status';
            recBtn.textContent = '🔴 Gravar Voz';
            playBtn.style.display = 'none';
            delBtn.style.display = 'none';
          }
        });
      }
    }

    // Salvar no Modal
    if (modalSaveBtn) {
      modalSaveBtn.addEventListener('click', () => {
        const customFlows = {
          msg1_part1: document.getElementById('m_msg1_part1').value.trim(),
          msg1_part2: document.getElementById('m_msg1_part2').value.trim(),
          msg2_part1: document.getElementById('m_msg2_part1').value.trim(),
          msg2_part2: document.getElementById('m_msg2_part2').value.trim(),
          msg2_part3: document.getElementById('m_msg2_part3').value.trim(),
          msg3p_part1: document.getElementById('m_msg3p_part1').value.trim(),
          msg3p_part2: document.getElementById('m_msg3p_part2').value.trim(),
          msg3p_part3: document.getElementById('m_msg3p_part3').value.trim(),
          msg3o_part1: document.getElementById('m_msg3o_part1').value.trim(),
          msg3o_part2: document.getElementById('m_msg3o_part2').value.trim(),
          msg3o_part3: document.getElementById('m_msg3o_part3').value.trim(),
          msg4_part1: document.getElementById('m_msg4_part1').value.trim(),
          msg4_part2: document.getElementById('m_msg4_part2').value.trim(),
          msg5_part1: document.getElementById('m_msg5_part1').value.trim(),
          msg5_part2: document.getElementById('m_msg5_part2').value.trim(),
          msg5_part3: document.getElementById('m_msg5_part3').value.trim(),
          msg6_part1: document.getElementById('m_msg6_part1').value.trim(),
          msg6_part3: document.getElementById('m_msg6_part3').value.trim()
        };

        const newSettings = {
          pixKey: document.getElementById('m_pixKey').value.trim(),
          userName: document.getElementById('m_userName').value.trim(),
          city: document.getElementById('m_city').value.trim() || "SAO PAULO",
          neighborhood: document.getElementById('m_neighborhood').value.trim(),
          pricePresencial: document.getElementById('m_pricePresencial').value.trim() || "50",
          priceOnline: document.getElementById('m_priceOnline').value.trim() || "30",
          sidebarWidth: document.getElementById('m_sidebarWidth').value || "330",
          sidebarMode: document.getElementById('m_sidebarMode').value || "compress",
          typingSpeed: document.getElementById('m_typingSpeed').value || "fast",
          pauseDelay: parseInt(document.getElementById('m_pauseDelay').value, 10) || 1300,
          customFlows: customFlows
        };

        if (chrome.storage && chrome.storage.sync) {
          chrome.storage.sync.set(newSettings, () => {
            config = { ...config, ...newSettings };
            applyLayoutSettings();
            modalSaveBtn.textContent = "✅ Salvo com Sucesso!";
            setTimeout(() => {
              modalSaveBtn.textContent = "💾 Salvar Alterações";
              closeModal();
            }, 800);
          });
        }
      });
    }

    // Restaurar Padrões no Modal
    if (modalResetBtn) {
      modalResetBtn.addEventListener('click', () => {
        if (confirm("Deseja restaurar as mensagens originais?")) {
          document.getElementById('m_msg1_part1').value = defaultFlows.msg1[0];
          document.getElementById('m_msg1_part2').value = defaultFlows.msg1[1];
          document.getElementById('m_msg2_part1').value = defaultFlows.msg2[0];
          document.getElementById('m_msg2_part2').value = defaultFlows.msg2[1];
          document.getElementById('m_msg2_part3').value = defaultFlows.msg2[2];
          document.getElementById('m_msg3p_part1').value = defaultFlows.msg3_presencial[0];
          document.getElementById('m_msg3p_part2').value = defaultFlows.msg3_presencial[1];
          document.getElementById('m_msg3p_part3').value = defaultFlows.msg3_presencial[2];
          document.getElementById('m_msg3o_part1').value = defaultFlows.msg3_online[0];
          document.getElementById('m_msg3o_part2').value = defaultFlows.msg3_online[1];
          document.getElementById('m_msg3o_part3').value = defaultFlows.msg3_online[2];
          document.getElementById('m_msg4_part1').value = defaultFlows.msg4_usb[0];
          document.getElementById('m_msg4_part2').value = defaultFlows.msg4_usb[1];
          document.getElementById('m_msg5_part1').value = defaultFlows.msg5_teste[0];
          document.getElementById('m_msg5_part2').value = defaultFlows.msg5_teste[1];
          document.getElementById('m_msg5_part3').value = defaultFlows.msg5_teste[2];
          document.getElementById('m_msg6_part1').value = defaultFlows.msg6_pix_presencial[0];
          document.getElementById('m_msg6_part3').value = defaultFlows.msg6_pix_presencial[2];
        }
      });
    }

    // Carregar estado salvo da barra
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['zld_sidebar_open'], (res) => {
        const shouldOpen = res.zld_sidebar_open !== undefined ? res.zld_sidebar_open : true;
        toggleSidebar(shouldOpen);
      });
    } else {
      toggleSidebar(true);
    }

    // Cliques nos botões de scripts (Texto, Áudio e Pix QR Code)
    root.addEventListener('click', (e) => {
      // 1. Botão de QR Code Pix
      const pixSubBtn = e.target.closest('.zld-pix-subbtn');
      if (pixSubBtn) {
        e.stopPropagation();
        const type = pixSubBtn.getAttribute('data-pix-type');
        const amount = pixSubBtn.getAttribute('data-amount');
        if (type === 'qr') {
          sendPixQRCode(amount, pixSubBtn);
        } else {
          const action = amount === '50' ? 'msg6_pix_presencial' : 'msg6_pix_online';
          executeFlow(action, pixSubBtn);
        }
        return;
      }

      // 2. Botão de Envio de Áudio
      const audioActionBtn = e.target.closest('.audio-action');
      if (audioActionBtn) {
        e.stopPropagation();
        const card = audioActionBtn.closest('.zld-script-btn');
        const action = card ? card.getAttribute('data-action') : null;
        if (action) {
          sendAudioStep(action, card);
        }
        return;
      }

      // 3. Botão de Envio de Texto
      const textActionBtn = e.target.closest('.text-action');
      if (textActionBtn) {
        e.stopPropagation();
        const card = textActionBtn.closest('.zld-script-btn');
        const action = card ? card.getAttribute('data-action') : null;
        if (action) {
          executeFlow(action, card);
        }
        return;
      }

      // 4. Clique geral no card
      const btn = e.target.closest('.zld-script-btn');
      if (!btn) return;

      const action = btn.getAttribute('data-action');
      if (action) {
        executeFlow(action, btn);
      }
    });

    applyLayoutSettings();
  }

  // Inicialização quando o WhatsApp Web estiver pronto
  const interval = setInterval(() => {
    if (document.querySelector('#app') || document.querySelector('#main')) {
      clearInterval(interval);
      createSidebar();
    }
  }, 1000);
})();
