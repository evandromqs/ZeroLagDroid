/**
 * ZeroLagDroid - Painel de Ajustes e Configurações (options.js)
 */

(function () {
  'use strict';

  // Textos padrões recomendados
  const defaultTemplates = {
    msg1_part1: "Olá, tudo bem? Vi sua mensagem aqui!",
    msg1_part2: "Qual é o modelo do seu celular e quais aplicativos você mais utiliza no dia a dia? (Uber, 99 ou iFood?)",

    msg2_part1: "Esse aparelho é muito bom! O que acontece é que, com as atualizações, o sistema vai acumulando processos pesados em segundo plano e começa a engasgar na hora que toca a corrida.",
    msg2_part2: "O procedimento que eu faço é direto pelo computador: ele remove todo esse peso, libera bastante memória RAM e blinda os apps para não fecharem sozinhos. Não formata nada e não perde fotos nem conversas.",
    msg2_part3: "Os valores são bem tranquilos: R$ 50 presencial aqui na Zona Leste ou R$ 30 online se tiver computador. E você só paga depois que testar o aparelho e aprovar o resultado!",

    msg3p_part1: "Sobre o atendimento presencial: eu atendo aqui na Zona Leste de São Paulo.",
    msg3p_part2: "A gente combina em um local prático para nós dois, como um shopping, posto ou ponto de apoio. Eu levo o notebook e em cerca de 5 a 10 minutos já te entrego o aparelho pronto.",
    msg3p_part3: "Qual bairro aqui da Zona Leste fica mais fácil para você?",

    msg3o_part1: "Para o atendimento remoto de R$ 30,00, é bem simples e rápido:",
    msg3o_part2: "Você só precisa ter um computador ou notebook com internet aí. Nós conectamos o celular no cabo USB do computador e eu faço tudo daqui à distância pelo AnyDesk, enquanto você acompanha na tela.",
    msg3o_part3: "Você tem computador ou notebook disponível aí no momento?",

    msg4_part1: "Para o computador reconhecer o celular, siga esse passo a passo rápido:",
    msg4_part2: "1. Abra Configurações > Sobre o telefone > Informações do software e dê 7 toques seguidos em 'Número de compilação'.\n2. Volte nas Configurações, entre em 'Opções do desenvolvedor', ative 'Depuração USB' e conecte o cabo no PC marcando 'Sempre permitir'.",

    msg5_part1: "Prontinho! Aparelho 100% otimizado e reiniciado! 🚀",
    msg5_part2: "Pode fazer um teste agora: abra os aplicativos da Uber, 99 e o Maps para sentir a diferença.",
    msg5_part3: "Sentiu que o toque e a navegação ficaram bem mais rápidos?",

    msg6_part1: "Muito obrigado! Fico muito feliz que tenha gostado do resultado. Agora é trabalhar com tranquilidade e sem travamentos!",
    msg6_part3: "Se puder indicar para outros colegas motoristas ou compartilhar nos grupos, agradeço muito!"
  };

  // Troca de Abas
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((c) => (c.style.display = 'none'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetEl = document.getElementById(targetId);
      if (targetEl) targetEl.style.display = 'block';
    });
  });

  // Mostrar Toast
  function showToast(message) {
    const toast = document.getElementById('toast');
    if (message) toast.querySelector('span').textContent = message;
    toast.style.display = 'flex';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 2800);
  }

  // Preencher formulário com dados
  function populateForm(data) {
    document.getElementById('pixKey').value = data.pixKey || "11976920649";
    document.getElementById('userName').value = data.userName || "Evandro Marques";
    document.getElementById('neighborhood').value = data.neighborhood || "Zona Leste (SP)";
    document.getElementById('pricePresencial').value = data.pricePresencial || "50";
    document.getElementById('priceOnline').value = data.priceOnline || "30";
    document.getElementById('sidebarWidth').value = data.sidebarWidth || "320";
    document.getElementById('sidebarMode').value = data.sidebarMode || "compress";
    document.getElementById('typingSpeed').value = data.typingSpeed || "fast";
    document.getElementById('pauseDelay').value = data.pauseDelay || "1300";

    const customFlows = data.customFlows || {};

    for (const key of Object.keys(defaultTemplates)) {
      const el = document.getElementById(key);
      if (el) {
        el.value = customFlows[key] !== undefined ? customFlows[key] : defaultTemplates[key];
      }
    }
  }

  // Carregar dados salvos
  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(null, (res) => {
      populateForm(res);
    });
  } else {
    populateForm({});
  }

  // Coletar dados do formulário
  function collectFormData() {
    const customFlows = {};
    for (const key of Object.keys(defaultTemplates)) {
      const el = document.getElementById(key);
      if (el) {
        customFlows[key] = el.value.trim();
      }
    }

    return {
      pixKey: document.getElementById('pixKey').value.trim(),
      userName: document.getElementById('userName').value.trim(),
      neighborhood: document.getElementById('neighborhood').value.trim(),
      pricePresencial: document.getElementById('pricePresencial').value.trim() || "50",
      priceOnline: document.getElementById('priceOnline').value.trim() || "30",
      sidebarWidth: document.getElementById('sidebarWidth').value,
      sidebarMode: document.getElementById('sidebarMode').value,
      typingSpeed: document.getElementById('typingSpeed').value,
      pauseDelay: parseInt(document.getElementById('pauseDelay').value, 10) || 1300,
      customFlows: customFlows
    };
  }

  // Salvar no storage
  function saveSettings() {
    const data = collectFormData();
    if (chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set(data, () => {
        showToast("✅ Configurações salvas e aplicadas com sucesso no WhatsApp!");
      });
    } else {
      localStorage.setItem('zld_settings', JSON.stringify(data));
      showToast("✅ Configurações salvas no armazenamento local!");
    }
  }

  document.getElementById('saveTopBtn').addEventListener('click', saveSettings);
  document.getElementById('saveBottomBtn').addEventListener('click', saveSettings);

  // Restaurar Mensagens Padrão
  document.getElementById('resetDefaultsBtn').addEventListener('click', () => {
    if (confirm("Deseja restaurar todas as mensagens para os textos originais recomendados?")) {
      for (const key of Object.keys(defaultTemplates)) {
        const el = document.getElementById(key);
        if (el) el.value = defaultTemplates[key];
      }
      showToast("🔄 Textos padrão restaurados! Clique em Salvar para confirmar.");
    }
  });
})();
