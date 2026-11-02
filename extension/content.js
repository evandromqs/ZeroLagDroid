/**
 * ZeroLagDroid - WhatsApp Web Fast Response Extension
 * Barra lateral retrátil acoplada ao canto direito, comprimindo o WhatsApp.
 * Versão 1.3:
 * - Cabeçalho minimalista sem botão 'X' (retração controlada pelo botão lateral nativo)
 * - Modal popup de Ajustes FLUTUANTE e CENTRALIZADO direto no WhatsApp Web
 * - Suporte a largura configurável e modo sobreposição (overlay)
 * - Textos, preços, chaves Pix e velocidades 100% editáveis no popup
 * - Fluxo automatizado de digitação rápida simulada com auto-envio
 */

(function () {
  'use strict';

  // Configuração padrão
  const defaultConfig = {
    pixKey: "11976920649",
    userName: "Evandro Marques",
    neighborhood: "Zona Leste (SP)",
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
      "Olá, tudo bem? Vi sua mensagem aqui!",
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

  // Aplicar variáveis de estilo ao DOM
  function applyLayoutSettings() {
    const width = config.sidebarWidth || "330";
    document.documentElement.style.setProperty('--zld-sidebar-width', `${width}px`);

    if (config.sidebarMode === 'overlay') {
      document.body.classList.add('zld-mode-overlay');
    } else {
      document.body.classList.remove('zld-mode-overlay');
    }

    // Atualizar preços na barra
    const presencialEl = document.querySelector('.price-chip.presencial b');
    if (presencialEl) presencialEl.textContent = `R$ ${config.pricePresencial || '50'}`;

    const onlineEl = document.querySelector('.price-chip.online b');
    if (onlineEl) onlineEl.textContent = `R$ ${config.priceOnline || '30'}`;

    // Disparar redimensionamento para o WhatsApp reajustar layout sem cortes
    window.dispatchEvent(new Event('resize'));
  }

  // Carregar dados salvos
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

  // Ouvir alterações de configurações em tempo real
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

    // Aplicar substituição de variáveis
    return list.map((msg) =>
      msg
        .replace(/\{PIX_KEY\}/g, config.pixKey || "11976920649")
        .replace(/\{USER_NAME\}/g, config.userName || "Evandro Marques")
        .replace(/\{PRICE_PRESENCIAL\}/g, config.pricePresencial || "50")
        .replace(/\{PRICE_ONLINE\}/g, config.priceOnline || "30")
        .replace(/\{NEIGHBORHOOD\}/g, config.neighborhood || "Zona Leste (SP)")
    );
  }

  // Utilitário de pausa
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

    // Limpar rascunho anterior
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);

    // Modo instantâneo: insere direto
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

  // Controle de fluxo
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

  // Criação da Barra Lateral e Modal Centralizado
  function createSidebar() {
    if (document.getElementById('zerolag-sidebar-root')) return;

    const root = document.createElement('div');
    root.id = 'zerolag-sidebar-root';
    root.innerHTML = `
      <!-- Botão Centralizado na Direita (Sempre Visível) -->
      <button id="zerolag-handle-btn" title="Expandir/Recolher Painel ZeroLag">
        <span class="handle-arrow">◀</span>
        <span class="handle-badge">🚀 ZeroLag</span>
      </button>

      <!-- Barra Lateral -->
      <aside id="zerolag-sidebar">
        <!-- Cabeçalho Otimizado (sem botão X) -->
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
          <div class="zld-section-title">Fluxos de Conversa (Até 3 msgs)</div>

          <button class="zld-script-btn" data-action="msg1">
            <div class="btn-top">
              <span class="step-num">1</span>
              <span class="step-label">Boas-Vindas & Modelo</span>
            </div>
            <div class="btn-preview">2 msgs: Saudação + Pergunta modelo e apps</div>
          </button>

          <button class="zld-script-btn highlight" data-action="msg2">
            <div class="btn-top">
              <span class="step-num">2</span>
              <span class="step-label">Explicação, Garantia & Preços</span>
            </div>
            <div class="btn-preview">3 msgs: Como funciona + Valores + Garantia</div>
          </button>

          <div class="zld-grid-2">
            <button class="zld-script-btn" data-action="msg3_presencial">
              <div class="btn-top">
                <span class="step-num">3A</span>
                <span class="step-label">Presencial ZL</span>
              </div>
              <div class="btn-preview">3 msgs: Posto/ponto ZL</div>
            </button>

            <button class="zld-script-btn" data-action="msg3_online">
              <div class="btn-top">
                <span class="step-num">3B</span>
                <span class="step-label">Remoto (PC)</span>
              </div>
              <div class="btn-preview">3 msgs: AnyDesk + USB</div>
            </button>
          </div>

          <button class="zld-script-btn" data-action="msg4_usb">
            <div class="btn-top">
              <span class="step-num">4</span>
              <span class="step-label">Como Ativar Depuração USB</span>
            </div>
            <div class="btn-preview">Passo a passo com 7 toques + autorização</div>
          </button>

          <button class="zld-script-btn" data-action="msg5_teste">
            <div class="btn-top">
              <span class="step-num">5</span>
              <span class="step-label">Teste Pós-Otimização</span>
            </div>
            <div class="btn-preview">3 msgs: Reiniciado + pedir teste Uber/99/Maps</div>
          </button>

          <div class="zld-section-title">Cobrança Pix & Indicação</div>

          <div class="zld-grid-2">
            <button class="zld-script-btn pix-btn" data-action="msg6_pix_presencial">
              <div class="btn-top">
                <span>💰 Pix R$ ${config.pricePresencial || '50'}</span>
              </div>
              <div class="btn-preview">3 msgs: Pix Presencial</div>
            </button>

            <button class="zld-script-btn pix-btn" data-action="msg6_pix_online">
              <div class="btn-top">
                <span>💰 Pix R$ ${config.priceOnline || '30'}</span>
              </div>
              <div class="btn-preview">3 msgs: Pix Remoto</div>
            </button>
          </div>
        </div>

        <div class="zld-sidebar-footer">
          <small>Clique para iniciar o fluxo. Clique novamente para parar.</small>
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
            <button class="zld-modal-tab-btn" data-tab="tab-m-layout">🖥️ Layout da Barra</button>
            <button class="zld-modal-tab-btn" data-tab="tab-m-speed">⚡ Digitação</button>
            <button class="zld-modal-tab-btn" data-tab="tab-m-scripts">📝 Roteiro das Mensagens</button>
          </div>

          <div class="zld-modal-body">
            <!-- Aba 1: Pix & Valores -->
            <div id="tab-m-pix" class="zld-modal-tab-content">
              <div class="zld-card-section">
                <div class="zld-card-section-title">Dados de Recebimento Pix</div>
                <div class="zld-form-group">
                  <label>Chave Pix:</label>
                  <input type="text" id="m_pixKey" placeholder="Ex: Telefone, CPF ou E-mail">
                  <div class="zld-help">Substitui automaticamente {PIX_KEY} nas mensagens de cobrança.</div>
                </div>
                <div class="zld-form-group" style="margin-top: 12px;">
                  <label>Nome do Titular:</label>
                  <input type="text" id="m_userName" placeholder="Ex: Evandro Marques">
                  <div class="zld-help">Substitui {USER_NAME} na confirmação do Pix.</div>
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

            <!-- Aba 2: Layout da Barra -->
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
                  <div class="zld-help">Reduz a largura para caber com folga mesmo em telas de resolução menor.</div>
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

            <!-- Aba 3: Digitação -->
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

            <!-- Aba 4: Roteiro das Mensagens -->
            <div id="tab-m-scripts" class="zld-modal-tab-content" style="display: none;">
              <div class="zld-card-section">
                <div class="zld-card-section-title">Etapa 1: Boas-Vindas & Modelo</div>
                <div class="zld-form-group">
                  <label>Mensagem 1 (Saudação):</label>
                  <textarea id="m_msg1_part1"></textarea>
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

      // Notificar o WhatsApp para recalcular seu layout responsivo sem cortes
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
    }

    function openModal() {
      populateModalFields();
      modalOverlay.style.display = 'flex';
    }

    function closeModal() {
      modalOverlay.style.display = 'none';
    }

    if (settingsBtn) settingsBtn.addEventListener('click', openModal);
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);

    // Fechar ao clicar fora do modal
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    // Fechar com tecla ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalOverlay.style.display === 'flex') {
        closeModal();
      }
    });

    // Abas do Modal
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

    // Clique em botão de script
    root.addEventListener('click', (e) => {
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
