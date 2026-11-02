/**
 * ZeroLagDroid - WhatsApp Web Fast Response Extension
 * Injeta um painel flutuante de atendimento rápido no WhatsApp Web.
 */

(function () {
  'use strict';

  // Configuração padrão de respostas
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

    msg3_presencial: `📍 Atendimento Presencial (Zona Leste - SP):
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

  // Carregar dados salvos no storage
  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['pixKey', 'userName', 'neighborhood'], (res) => {
      if (res.pixKey) templates.pixKey = res.pixKey;
      if (res.userName) templates.userName = res.userName;
      if (res.neighborhood) templates.neighborhood = res.neighborhood;
    });
  }

  // Função para injetar texto no campo do WhatsApp Web
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

    // Inserção compatível com a manipulação de DOM do React no WhatsApp Web
    const success = document.execCommand('insertText', false, text);

    if (!success) {
      // Fallback para ClipboardEvent / InputEvent se execCommand falhar
      inputField.textContent = text;
      inputField.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }

    // Scroll para manter visível
    inputField.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Criação do Painel Flutuante
  function createFloatingPanel() {
    if (document.getElementById('zerolag-floating-root')) return;

    const root = document.createElement('div');
    root.id = 'zerolag-floating-root';

    root.innerHTML = `
      <div id="zerolag-toggle-btn" title="Abrir Respostas ZeroLagDroid">
        <span class="zld-icon">🚀</span>
        <span class="zld-label">ZeroLag</span>
      </div>
      
      <div id="zerolag-panel" class="zld-hidden">
        <div class="zld-header">
          <div class="zld-title">
            <span>🚀 ZeroLagDroid</span>
            <small>Atendimento Rápido</small>
          </div>
          <button id="zld-close-btn">&times;</button>
        </div>

        <div class="zld-price-badge">
          <span>📍 Presencial: <b>R$ 50</b> (ZL)</span>
          <span>💻 Online: <b>R$ 30</b></span>
        </div>

        <div class="zld-buttons-container">
          <button class="zld-btn" data-action="msg1">
            <span class="btn-icon">👋</span>
            <span class="btn-text">1. Boas-Vindas & Pergunta Modelo</span>
          </button>

          <button class="zld-btn" data-action="msg2">
            <span class="btn-icon">🛡️</span>
            <span class="btn-text">2. Explicação, Garantia & Preços</span>
          </button>

          <div class="zld-row">
            <button class="zld-btn half" data-action="msg3_presencial">
              <span class="btn-icon">📍</span>
              <span class="btn-text">3. Presencial (ZL)</span>
            </button>
            <button class="zld-btn half" data-action="msg3_online">
              <span class="btn-icon">💻</span>
              <span class="btn-text">3. Online / Remoto</span>
            </button>
          </div>

          <button class="zld-btn" data-action="msg4_usb">
            <span class="btn-icon">⚙️</span>
            <span class="btn-text">4. Como Ativar Depuração USB</span>
          </button>

          <button class="zld-btn" data-action="msg5_teste">
            <span class="btn-icon">✨</span>
            <span class="btn-text">5. Teste Pós-Otimização</span>
          </button>

          <div class="zld-row">
            <button class="zld-btn half pix-btn" data-action="msg6_pix_presencial">
              <span class="btn-icon">💰</span>
              <span class="btn-text">Pix R$ 50 (ZL)</span>
            </button>
            <button class="zld-btn half pix-btn" data-action="msg6_pix_online">
              <span class="btn-icon">💰</span>
              <span class="btn-text">Pix R$ 30 (Online)</span>
            </button>
          </div>
        </div>

        <div class="zld-footer">
          <small>Clique no botão para preencher na conversa aberta.</small>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    // Eventos de clique
    const toggleBtn = document.getElementById('zerolag-toggle-btn');
    const panel = document.getElementById('zerolag-panel');
    const closeBtn = document.getElementById('zld-close-btn');

    toggleBtn.addEventListener('click', () => {
      panel.classList.toggle('zld-hidden');
    });

    closeBtn.addEventListener('click', () => {
      panel.classList.add('zld-hidden');
    });

    // Ações dos botões
    panel.addEventListener('click', (e) => {
      const btn = e.target.closest('.zld-btn');
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

  // Monitorar carregamento do WhatsApp Web
  const interval = setInterval(() => {
    if (document.querySelector('#app') || document.querySelector('#main')) {
      clearInterval(interval);
      createFloatingPanel();
    }
  }, 1000);
})();
