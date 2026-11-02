document.addEventListener('DOMContentLoaded', () => {
  const pixKeyInput = document.getElementById('pixKey');
  const userNameInput = document.getElementById('userName');
  const saveBtn = document.getElementById('saveBtn');
  const openOptionsBtn = document.getElementById('openOptionsBtn');
  const statusDiv = document.getElementById('status');

  // Carregar dados salvos
  chrome.storage.sync.get(['pixKey', 'userName'], (res) => {
    if (res.pixKey) pixKeyInput.value = res.pixKey;
    if (res.userName) userNameInput.value = res.userName;
  });

  // Salvar dados
  saveBtn.addEventListener('click', () => {
    const pixKey = pixKeyInput.value.trim();
    const userName = userNameInput.value.trim();

    chrome.storage.sync.set({ pixKey, userName }, () => {
      statusDiv.style.display = 'block';
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 2000);
    });
  });

  // Abrir página de ajustes completa
  if (openOptionsBtn) {
    openOptionsBtn.addEventListener('click', () => {
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open(chrome.runtime.getURL('options.html'));
      }
    });
  }
});
