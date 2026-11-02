/**
 * ZeroLagDroid - WhatsApp Web Fast Response Extension
 * Barra lateral retrátil acoplada ao canto direito, comprimindo o WhatsApp.
 * Versão 1.1: Textos humanizados + quebra de linha corrigida (Shift+Enter/LineBreak).
 */

(function () {
  'use strict';

  // Modelos de mensagens humanizadas (sem tom de robô)
  const defaultTemplates = {
    pixKey: "seu-pix-aqui",
    userName: "Evandro",
    neighborhood: "Zona Leste (SP)",
    
    msg1: `Opa mano, tudo bem? Vi sua mensagem aqui! 👊

Qual é o modelo do seu celular e quais aplicativos você mais roda nele no dia a dia? Uber, 99 ou iFood?`,

    msg2: `Pô, esse aparelho é bom, o problema é que com as atualizações o sistema da marca vai acumulando muita coisa inútil em segundo plano e fica engasgando na hora que toca a corrida.

Eu faço um serviço pelo computador que tira todo esse peso, libera bastante memória RAM e blinda os apps da Uber e 99 pra não fecharem mais sozinhos.

Não precisa formatar nada, não perde fotos, nem conversas, nem nada.

Os valores são bem tranquilos:
• Presencial aqui na Zona Leste: R$ 50 (a gente marca num posto ou shopping de boa)
• Online / Remoto: R$ 30 (se você tiver um computador com internet em casa)

E o melhor: você só me paga depois que ver o celular respondendo na hora!`,

    msg3_presencial: `Sobre o presencial: eu atendo aqui na Zona Leste de SP.

A gente pode marcar num posto de gasolina, shopping ou ponto de apoio que fique fácil pra nós dois. Eu levo o notebook e em 5 minutinhos já te entrego ele pronto pra rodar.

Qual bairro aqui da ZL fica melhor pra você?`,

    msg3_online: `Pro atendimento online de R$ 30, é bem simples:

Você só precisa ter um computador ou notebook com internet aí. A gente conecta o celular no cabo USB do PC e eu faço tudo daqui rapidinho pelo AnyDesk enquanto você acompanha na tela.

Você tem PC ou notebook aí agora?`,

    msg4_usb: `Pra gente conectar no computador, só faz esse passo a passo rápido no seu celular:

1. Entra nas Configurações do celular e vai em "Sobre o telefone"
2. Clica em "Informações do software"
3. Clica 7 vezes seguidas em cima de "Número de compilação" (vai avisar que ativou o modo desenvolvedor)
4. Agora volta nas Configurações, desce tudo e entra em "Opções do desenvolvedor"
5. Ativa a chave "Depuração USB"

Aí é só plugar no cabo do computador. Na tela do celular vai aparecer uma caixinha perguntando se permite a depuração USB. Marca a caixinha "Sempre permitir" e clica em Permitir.`,

    msg5_teste: `Prontinho meu parceiro! Aparelho tá 100% pronto e reiniciado! 🚀

Dá uma mexida nele aí agora pra você sentir a diferença. Abre a Uber, a 99 e o Maps.

Ficou mais leve e rápido no toque?`,

    msg6_pix: `Show de bola mano, fico feliz demais que tenha gostado! Agora é só acelerar e faturar sem dor de cabeça de app travando! 👊

Seguem os dados do Pix:
Chave Pix: {PIX_KEY}
Nome: {USER_NAME}
Valor: {VALOR}

Se puder indicar pros parceiros da rodagem ou mandar no grupo de motoristas aí, me ajuda muito! Tamo junto!`
  };

  let templates = { ...defaultTemplates };

  // Carregar dados salvos no storage do Chrome
  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['pixKey', 'userName', 'neighborhood'], (res) => {
      if (res.pixKey) templates.pixKey = res.pixKey;
      if (res.userName) templates.userName = res.userName;
      if (res.neighborhood) templates.neighborhood = res.neighborhood;
    });
  }

  // Função para injetar texto mantendo as quebras de linha reais no WhatsApp Web
  function insertIntoWhatsAppInput(text) {
    const inputSelectors = [
      'footer div[contenteditable="true"]',
      'div[contenteditable="true"][data-tab="10"]',
      'div[contenteditable="true"][role="textbox"]',
      '#main footer div[contenteditable="true"]'
    ];

    let inputField = null;
    for (const selector of inputSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        inputField = el;
        break;
      }
    }

    if (!inputField) {
      alert("⚠️ Abra uma conversa no WhatsApp Web primeiro!");
      return;
    }

    inputField.focus();

    // 1. Tentar simular evento de Paste com DataTransfer (o método mais limpo do WhatsApp)
    try {
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', text);
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true
      });
      inputField.dispatchEvent(pasteEvent);
      
      // Se inseriu com sucesso, finaliza
      if (inputField.textContent && inputField.textContent.length > 5) {
        inputField.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
    } catch (e) {
      console.warn("Clipboard paste falhou, usando método por linhas:", e);
    }

    // 2. Método Infalível: Inserir linha por linha com insertLineBreak (Shift+Enter nativo do editor)
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.length > 0) {
        document.execCommand('insertText', false, line);
      }
      if (i < lines.length - 1) {
        // Insere quebra de linha sem disparar o envio da mensagem
        document.execCommand('insertLineBreak');
      }
    }

    // Forçar notificação de input para o React do WhatsApp
    inputField.dispatchEvent(new Event('input', { bubbles: true }));
    inputField.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Criação da Barra Lateral e Botão Centralizado
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
            <span class="brand-sub">Atendimento Rápido</span>
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
          <div class="zld-section-title">Conversa & Negociação</div>

          <button class="zld-script-btn" data-action="msg1">
            <div class="btn-top">
              <span class="step-num">1</span>
              <span class="step-label">Boas-Vindas & Modelo</span>
            </div>
            <div class="btn-preview">Pergunta modelo e apps que usa</div>
          </button>

          <button class="zld-script-btn highlight" data-action="msg2">
            <div class="btn-top">
              <span class="step-num">2</span>
              <span class="step-label">Explicação, Garantia & Preços</span>
            </div>
            <div class="btn-preview">R$ 50 ZL / R$ 30 Online + Garantia</div>
          </button>

          <div class="zld-grid-2">
            <button class="zld-script-btn" data-action="msg3_presencial">
              <div class="btn-top">
                <span class="step-num">3A</span>
                <span class="step-label">Presencial ZL</span>
              </div>
              <div class="btn-preview">Combina posto/ponto ZL</div>
            </button>

            <button class="zld-script-btn" data-action="msg3_online">
              <div class="btn-top">
                <span class="step-num">3B</span>
                <span class="step-label">Remoto (PC)</span>
              </div>
              <div class="btn-preview">AnyDesk / cabo USB</div>
            </button>
          </div>

          <button class="zld-script-btn" data-action="msg4_usb">
            <div class="btn-top">
              <span class="step-num">4</span>
              <span class="step-label">Como Ativar Depuração USB</span>
            </div>
            <div class="btn-preview">Passo a passo com 7 toques</div>
          </button>

          <button class="zld-script-btn" data-action="msg5_teste">
            <div class="btn-top">
              <span class="step-num">5</span>
              <span class="step-label">Teste Pós-Otimização</span>
            </div>
            <div class="btn-preview">Pede para testar a fluidez</div>
          </button>

          <div class="zld-section-title">Cobrança Pix & Indicação</div>

          <div class="zld-grid-2">
            <button class="zld-script-btn pix-btn" data-action="msg6_pix_presencial">
              <div class="btn-top">
                <span>💰 Pix R$ 50</span>
              </div>
              <div class="btn-preview">Presencial Zona Leste</div>
            </button>

            <button class="zld-script-btn pix-btn" data-action="msg6_pix_online">
              <div class="btn-top">
                <span>💰 Pix R$ 30</span>
              </div>
              <div class="btn-preview">Atendimento Online</div>
            </button>
          </div>
        </div>

        <div class="zld-sidebar-footer">
          <small>Clique em qualquer etapa para preencher com quebra de linha.</small>
        </div>
      </aside>
    `;

    document.body.appendChild(root);

    const handleBtn = document.getElementById('zerolag-handle-btn');
    const collapseBtn = document.getElementById('zld-collapse-btn');
    const arrow = handleBtn.querySelector('.handle-arrow');

    // Função para alternar expansão/encolhimento
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

    // Carregar estado salvo (padrão: aberto)
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['zld_sidebar_open'], (res) => {
        const shouldOpen = res.zld_sidebar_open !== undefined ? res.zld_sidebar_open : true;
        toggleSidebar(shouldOpen);
      });
    } else {
      toggleSidebar(true);
    }

    // Ações dos botões de preenchimento
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.zld-script-btn');
      if (!btn) return;

      const action = btn.getAttribute('data-action');
      let textToSend = "";

      switch (action) {
        case 'msg1':
          textToSend = templates.msg1;
          break;
        case 'msg2':
          textToSend = templates.msg2;
          break;
        case 'msg3_presencial':
          textToSend = templates.msg3_presencial;
          break;
        case 'msg3_online':
          textToSend = templates.msg3_online;
          break;
        case 'msg4_usb':
          textToSend = templates.msg4_usb;
          break;
        case 'msg5_teste':
          textToSend = templates.msg5_teste;
          break;
        case 'msg6_pix_presencial':
          textToSend = templates.msg6_pix
            .replace('{PIX_KEY}', templates.pixKey)
            .replace('{USER_NAME}', templates.userName)
            .replace('{VALOR}', 'R$ 50,00 (Presencial - Zona Leste)');
          break;
        case 'msg6_pix_online':
          textToSend = templates.msg6_pix
            .replace('{PIX_KEY}', templates.pixKey)
            .replace('{USER_NAME}', templates.userName)
            .replace('{VALOR}', 'R$ 30,00 (Online / Remoto)');
          break;
      }

      if (textToSend) {
        insertIntoWhatsAppInput(textToSend);
      }
    });
  }

  // Iniciar assim que o WhatsApp Web estiver carregado
  const interval = setInterval(() => {
    if (document.querySelector('#app') || document.querySelector('#main')) {
      clearInterval(interval);
      createSidebar();
    }
  }, 1000);
})();
