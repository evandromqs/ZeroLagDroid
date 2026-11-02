/**
 * ZeroLagDroid - WhatsApp Web Fast Response Extension
 * Barra lateral retrátil acoplada ao canto direito, comprimindo o WhatsApp.
 * Versão 1.2:
 * - Fluxo automatizado de digitação rápida humana (10-20ms/char)
 * - Divide etapas em até 3 mensagens sequenciais naturais (bolhas separadas)
 * - Digita, envia e aguarda com pausa humana de 1 a 1.5s entre cada mensagem
 * - Feedback visual no botão com opção de cancelamento a qualquer instante
 */

(function () {
  'use strict';

  // Configuração padrão de dados
  const config = {
    pixKey: "11976920649",
    userName: "Evandro Marques",
    neighborhood: "Zona Leste (SP)"
  };

  // Carregar dados salvos no storage do Chrome
  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['pixKey', 'userName', 'neighborhood'], (res) => {
      if (res.pixKey) config.pixKey = res.pixKey;
      if (res.userName) config.userName = res.userName;
      if (res.neighborhood) config.neighborhood = res.neighborhood;
    });
  }

  // Modelos de mensagens divididos em fluxos sequenciais naturais (máximo 3 mensagens por etapa)
  function getFlowMessages(action) {
    switch (action) {
      case 'msg1':
        return [
          "Olá, tudo bem? Vi sua mensagem aqui!",
          "Qual é o modelo do seu celular e quais aplicativos você mais utiliza no dia a dia? (Uber, 99 ou iFood?)"
        ];

      case 'msg2':
        return [
          "Esse aparelho é muito bom! O que acontece é que, com as atualizações, o sistema vai acumulando processos pesados em segundo plano e começa a engasgar na hora que toca a corrida.",
          "O procedimento que eu faço é direto pelo computador: ele remove todo esse peso, libera bastante memória RAM e blinda os apps para não fecharem sozinhos. Não formata nada e não perde fotos nem conversas.",
          "Os valores são bem tranquilos: R$ 50 presencial aqui na Zona Leste ou R$ 30 online se tiver computador. E você só paga depois que testar o aparelho e aprovar o resultado!"
        ];

      case 'msg3_presencial':
        return [
          "Sobre o atendimento presencial: eu atendo aqui na Zona Leste de São Paulo.",
          "A gente combina em um local prático para nós dois, como um shopping, posto ou ponto de apoio. Eu levo o notebook e em cerca de 5 a 10 minutos já te entrego o aparelho pronto.",
          "Qual bairro aqui da Zona Leste fica mais fácil para você?"
        ];

      case 'msg3_online':
        return [
          "Para o atendimento remoto de R$ 30,00, é bem simples e rápido:",
          "Você só precisa ter um computador ou notebook com internet aí. Nós conectamos o celular no cabo USB do computador e eu faço tudo daqui à distância pelo AnyDesk, enquanto você acompanha na tela.",
          "Você tem computador ou notebook disponível aí no momento?"
        ];

      case 'msg4_usb':
        return [
          "Para o computador reconhecer o celular, siga esse passo a passo rápido:",
          "1. Abra Configurações > Sobre o telefone > Informações do software e dê 7 toques seguidos em 'Número de compilação'.",
          "2. Volte nas Configurações, entre em 'Opções do desenvolvedor', ative 'Depuração USB' e conecte o cabo no PC marcando 'Sempre permitir'."
        ];

      case 'msg5_teste':
        return [
          "Prontinho! Aparelho 100% otimizado e reiniciado! 🚀",
          "Pode fazer um teste agora: abra os aplicativos da Uber, 99 e o Maps para sentir a diferença.",
          "Sentiu que o toque e a navegação ficaram bem mais rápidos?"
        ];

      case 'msg6_pix_presencial':
        return [
          "Muito obrigado! Fico muito feliz que tenha gostado do resultado. Agora é trabalhar com tranquilidade e sem travamentos!",
          `Seguem os dados para o Pix:\nChave Pix: ${config.pixKey}\nNome: ${config.userName}\nValor: R$ 50,00 (Presencial - Zona Leste)`,
          "Se puder indicar para outros colegas motoristas ou compartilhar nos grupos, agradeço muito!"
        ];

      case 'msg6_pix_online':
        return [
          "Muito obrigado! Fico muito feliz que tenha gostado do resultado. Agora é trabalhar com tranquilidade e sem travamentos!",
          `Seguem os dados para o Pix:\nChave Pix: ${config.pixKey}\nNome: ${config.userName}\nValor: R$ 30,00 (Remoto / Online)`,
          "Se puder indicar para outros colegas motoristas ou compartilhar nos grupos, agradeço muito!"
        ];

      default:
        return [];
    }
  }

  // Utilitário de pausa assíncrona
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

  // Digitação rápida simulada caractere a caractere (10-22ms por letra)
  async function typeMessageIntoWhatsApp(input, text, isAborted) {
    input.focus();

    // Limpar qualquer rascunho anterior
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);

    for (let i = 0; i < text.length; i++) {
      if (isAborted()) return false;

      const char = text[i];

      if (char === '\n') {
        // Dispara Shift+Enter para criar quebra de linha real no editor Lexical do WhatsApp
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
        await sleep(30);
      } else {
        document.execCommand('insertText', false, char);
        // Digitação acelerada, porém fluida e natural (12 a 22ms)
        await sleep(12 + Math.floor(Math.random() * 10));
      }
    }

    // Notificar o React do WhatsApp que o conteúdo mudou
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  // Disparo do envio da mensagem digitada
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

    // Aguardar confirmação de envio no DOM
    await sleep(350);
    return true;
  }

  // Controle de fluxo ativo
  let currentFlow = null;

  // Executor do fluxo de mensagens com digitação e intervalos humanos
  async function executeFlow(action, btn) {
    const messages = getFlowMessages(action);
    if (!messages || messages.length === 0) return;

    // Se já havia um fluxo rodando:
    if (currentFlow) {
      const isSameButton = currentFlow.btn === btn;
      currentFlow.aborted = true;
      if (currentFlow.cleanup) currentFlow.cleanup();
      currentFlow = null;

      // Se clicou no mesmo botão que estava rodando, cancela e encerra
      if (isSameButton) return;
    }

    const input = getChatInput();
    if (!input) {
      alert("⚠️ Abra uma conversa no WhatsApp Web primeiro!");
      return;
    }

    const flowState = {
      aborted: false,
      btn: btn,
      cleanup: null
    };
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

        // Atualizar status no botão: Digitando
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

        // Atualizar status no botão: Enviando
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

        // Se houver próxima mensagem, aguardar intervalo humano de 1.2 a 1.5 segundos
        if (i < total - 1 && !flowState.aborted) {
          btn.innerHTML = `
            <div class="btn-top">
              <span class="step-num">${msgIndex}/${total}</span>
              <span class="step-label">Aguardando...</span>
            </div>
            <div class="zld-flow-status">
              <div class="zld-pulse-dot"></div>
              <span>Pausa natural (1.3s)...</span>
            </div>
          `;
          await sleep(1200 + Math.floor(Math.random() * 300));
        }
      }

      // Conclusão com sucesso
      if (!flowState.aborted) {
        btn.classList.remove('is-active-flow');
        btn.classList.add('is-success');
        btn.innerHTML = `
          <div class="btn-top">
            <span class="step-num">✓</span>
            <span class="step-label" style="color:#00e676">Enviado com Sucesso!</span>
          </div>
          <div class="zld-flow-status" style="color:#00e676">
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

  // Criação da Barra Lateral e Botão de Abertura
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
        <div class="zld-sidebar-header">
          <div class="zld-brand">
            <span class="brand-title">🚀 ZeroLagDroid</span>
            <span class="brand-sub">Fluxo Automático & Humanizado</span>
          </div>
          <button id="zld-collapse-btn" title="Recolher Barra Lateral">&times;</button>
        </div>

        <div class="zld-price-bar">
          <div class="price-chip presencial">
            <span>📍 ZL (Presencial)</span>
            <b>R$ 50</b>
          </div>
          <div class="price-chip online">
            <span>💻 Remoto (PC)</span>
            <b>R$ 30</b>
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
            <div class="btn-preview">3 msgs: Como funciona + R$ 50 / R$ 30 + Garantia</div>
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
            <div class="btn-preview">3 msgs: 7 toques no compilação + autorização</div>
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
                <span>💰 Pix R$ 50</span>
              </div>
              <div class="btn-preview">3 msgs: Pix ZL</div>
            </button>

            <button class="zld-script-btn pix-btn" data-action="msg6_pix_online">
              <div class="btn-top">
                <span>💰 Pix R$ 30</span>
              </div>
              <div class="btn-preview">3 msgs: Pix Remoto</div>
            </button>
          </div>
        </div>

        <div class="zld-sidebar-footer">
          <small>Clique para iniciar o fluxo. Clique novamente para parar.</small>
        </div>
      </aside>
    `;

    document.body.appendChild(root);

    const handleBtn = document.getElementById('zerolag-handle-btn');
    const collapseBtn = document.getElementById('zld-collapse-btn');
    const arrow = handleBtn.querySelector('.handle-arrow');

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
    }

    handleBtn.addEventListener('click', () => toggleSidebar());
    collapseBtn.addEventListener('click', () => toggleSidebar(false));

    // Carregar preferência salva
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['zld_sidebar_open'], (res) => {
        const shouldOpen = res.zld_sidebar_open !== undefined ? res.zld_sidebar_open : true;
        toggleSidebar(shouldOpen);
      });
    } else {
      toggleSidebar(true);
    }

    // Clique em botão de fluxo
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.zld-script-btn');
      if (!btn) return;

      const action = btn.getAttribute('data-action');
      if (action) {
        executeFlow(action, btn);
      }
    });
  }

  // Inicialização quando o WhatsApp Web estiver pronto
  const interval = setInterval(() => {
    if (document.querySelector('#app') || document.querySelector('#main')) {
      clearInterval(interval);
      createSidebar();
    }
  }, 1000);
})();
