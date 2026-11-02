/**
 * ZeroLagDroid - WhatsApp Web Fast Response Extension
 * Barra lateral retrátil acoplada ao canto direito, comprimindo o WhatsApp.
 */

(function () {
  'use strict';

  const SIDEBAR_WIDTH = 360; // Largura da barra lateral em pixels

  // Modelos de mensagens configuráveis
  const defaultTemplates = {
    pixKey: "seu-pix-aqui",
    userName: "Evandro",
    neighborhood: "Zona Leste (SP)",
    msg1: `Fala parceiro, beleza? 👊
Seja bem-vindo! 

Me conta duas coisas rápidas sobre o seu aparelho:
1. Qual é o modelo do seu celular? (Ex: Galaxy A10, A20, A32, Moto G, etc.)
2. Quais aplicativos você mais usa nele? (Uber, 99 ou iFood?)`,

    msg2: `Show de bola! Esse modelo sofre bastante com a memória virtual lenta de fábrica e processos de fundo que esquentam o aparelho.

O que nós fazemos nele:
✅ Não formata nada: não apaga fotos, conversas nem senhas.
✅ Sem root: 100% seguro pelo sistema original.
✅ Otimização Extrema: Desativamos o que pesa, liberamos até 2 GB de RAM e blindamos o app da Uber/99/iFood para nunca fechar no meio da corrida.

💰 Valores:
📍 Presencial (Somente Zona Leste - SP): R$ 50,00
💻 Remoto / Online (se você tiver computador): R$ 30,00

🛡️ Garantia Total: Você só me paga depois que ver o celular respondendo liso e aprovar!`,

    msg3_presencial: `📍 Atendimento Presencial (Zona Leste - SP - R$ 50,00):
Podemos combinar em um ponto de apoio, posto de combustível ou shopping da Zona Leste que fique bom para nós dois. 

Leva apenas 5 minutinhos no cabo USB direto no meu notebook!

Qual bairro da Zona Leste fica mais fácil para você?`,

    msg3_online: `💻 Atendimento Online / Remoto (R$ 30,00):
Se você tiver um computador ou notebook com internet aí, você só precisa conectar o celular no cabo USB no seu PC.

Eu conecto com você pelo AnyDesk (ou TeamViewer) e faço todo o procedimento daqui em 5 minutinhos na sua tela.

Você tem computador aí agora?`,

    msg4_usb: `Para o computador reconhecer o celular, precisamos ativar uma opção simples:
1. Vá em Configurações > Sobre o telefone > Informações do software.
2. Toque 7 vezes seguidas em cima de "Número de compilação" (vai avisar que o modo desenvolvedor foi ativado).
3. Volte nas Configurações, desça até o fim e abra "Opções do desenvolvedor".
4. Ative a caixinha "Depuração USB".

Agora conecte o cabo no computador. Na tela do celular vai aparecer: "Permitir depuração USB?". Marque "Sempre permitir" e clique em Permitir.`,

    msg5_teste: `Prontinho parceiro! Aparelho 100% otimizado e reiniciado! 🚀

Faz o teste aí agora:
1. Desbloqueie o celular e sinta a velocidade nas animações e toques.
2. Abra a Uber / 99 / iFood e o Google Maps.

Sentiu a diferença na resposta imediata?`,

    msg6_pix: `Top demais! Fico feliz que tenha aprovado o resultado, agora é rodar com o celular voando! 👊

Segue os dados para o Pix:
🔑 Chave Pix: {PIX_KEY}
👤 Nome: {USER_NAME}
💰 Valor: {VALOR}

🤝 Se você tiver algum parceiro de rodagem ou grupo de WhatsApp que esteja sofrendo com celular travando, compartilha meu contato com eles! Fortalece muito o trampo! Valeu!`
  };

  let templates = { ...defaultTemplates };

  // Carregar dados salvos
  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['pixKey', 'userName', 'neighborhood'], (res) => {
      if (res.pixKey) templates.pixKey = res.pixKey;
      if (res.userName) templates.userName = res.userName;
      if (res.neighborhood) templates.neighborhood = res.neighborhood;
    });
  }

  // Inserir texto no input do WhatsApp Web
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

    const success = document.execCommand('insertText', false, text);
    if (!success) {
      inputField.textContent = text;
      inputField.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }

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
            <span class="brand-sub">Painel de Atendimento</span>
          </div>
          <button id="zld-collapse-btn" title="Recolher Barra Lateral">&times;</button>
        </div>

        <div class="zld-price-bar">
          <div class="price-chip presencial">
            <span>📍 ZL (Presencial)</span>
            <b>R$ 50</b>
          </div>
          <div class="price-chip online">
            <span>💻 Remoto / Online</span>
            <b>R$ 30</b>
          </div>
        </div>

        <div class="zld-content-scroll">
          <div class="zld-section-title">Etapas do Atendimento</div>

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
                <span class="step-label">Presencial (ZL)</span>
              </div>
              <div class="btn-preview">Combina posto/ponto ZL</div>
            </button>

            <button class="zld-script-btn" data-action="msg3_online">
              <div class="btn-top">
                <span class="step-num">3B</span>
                <span class="step-label">Remoto (PC)</span>
              </div>
              <div class="btn-preview">Explica AnyDesk/cabo</div>
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
          <small>Clique em qualquer etapa para preencher na conversa.</small>
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

      // Lembrar preferência no storage
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

  // Iniciar assim que o WhatsApp Web estiver pronto
  const interval = setInterval(() => {
    if (document.querySelector('#app') || document.querySelector('#main')) {
      clearInterval(interval);
      createSidebar();
    }
  }, 1000);
})();
