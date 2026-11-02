document.addEventListener('DOMContentLoaded', () => {
  const pixKeyInput = document.getElementById('pixKey');
  const userNameInput = document.getElementById('userName');
  const saveBtn = document.getElementById('saveBtn');
  const status = document.getElementById('status');

  // Carregar dados salvos
  chrome.storage.sync.get(['pixKey', 'userName'], (res) => {
    if (res.pixKey) pixKeyInput.value = res.pixKey;
    if (res.userName) userNameInput.value = res.userName;
  });

  // Salvar dados
  saveBtn.addEventListener('click', () => {
    chrome.storage.sync.set({
      pixKey: pixKeyInput.value.trim(),
      userName: userNameInput.value.trim()
    }, () => {
      status.style.display = 'block';
      setTimeout(() => {
        status.style.display = 'none';
      }, 2500);
    });
  });
});
