document.addEventListener('DOMContentLoaded', () => {
  const SERVER_URL = 'https://gta-samp-sektor-weekly-lottery.onrender.com';
  let isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

  let editMode = false;
  let currentEdit = null;

  function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // ===== UI helpers =====
  function showAlert(message, isSuccess) {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;

    const alert = document.createElement('div');
    alert.classList.add('alert', isSuccess ? 'success' : 'error');
    alert.innerText = message;
    alertContainer.appendChild(alert);

    setTimeout(() => alert.remove(), 3000);
  }

  function updateLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (!logoutBtn) return;
    logoutBtn.style.display = isAuthenticated ? 'block' : 'none';
  }

  function updateAdminUI() {
    const btn = document.getElementById('add-history-btn');
    if (!btn) return;
    btn.style.display = isAuthenticated ? 'block' : 'none';
  }

  function updatePrizeEditButtons() {
    document.querySelectorAll('.edit-prize-btn').forEach(btn => {
      btn.style.display = isAuthenticated ? 'inline-block' : 'none';
    });
  }

  // ===== Modal =====
  function closeModal() {
    document.getElementById('admin-modal')?.classList.add('hidden');
  }

  function openAddModal() {
    if (!isAuthenticated) {
      showAlert('Нет доступа', false);
      return;
    }

    editMode = false;
    currentEdit = null;

    // очистка полей (чтобы не тянуло старые значения)
    document.getElementById('input-date').value = '';
    document.getElementById('input-number').value = '';
    document.getElementById('input-name').value = '';
    document.getElementById('input-chosen').value = '';
    document.getElementById('input-prize').value = '';

    document.getElementById('modal-title').innerText = 'Добавить запись';
    document.getElementById('admin-modal').classList.remove('hidden');
    loadPrizesToSelect();
  }

  function openEditModal(item) {
    if (!isAuthenticated) {
      showAlert('Нет доступа', false);
      return;
    }

    editMode = true;
    currentEdit = item;

    document.getElementById('modal-title').innerText = 'Редактировать запись';
    document.getElementById('input-date').value = item.date || '';
    document.getElementById('input-number').value = item.number ?? '';
    document.getElementById('input-name').value = item.name || '';
    document.getElementById('input-chosen').value = item.chosenNumber ?? '';

    document.getElementById('admin-modal').classList.remove('hidden');
    loadPrizesToSelect(item.prize);
  }

  function formatDate(d) {
    return d.toLocaleDateString('ru-RU');
  }
  function setToday() {
    document.getElementById('input-date').value = formatDate(new Date());
  }
  function setYesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    document.getElementById('input-date').value = formatDate(d);
  }

  // ВАЖНО: чтобы работали onclick="..." из HTML
  window.openAddModal = openAddModal;
  window.openEditModal = openEditModal;
  window.closeModal = closeModal;
  window.setToday = setToday;
  window.setYesterday = setYesterday;

  // ===== Data loaders =====
  async function loadPrizesToSelect(selected) {
    const res = await fetch(`${SERVER_URL}/prizes`);
    const prizes = await res.json();

    const select = document.getElementById('input-prize');
    select.innerHTML = '<option value="">—</option>';

    prizes.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.prize;
      opt.textContent = p.prize;
      if (p.prize === selected) opt.selected = true;
      select.appendChild(opt);
    });
  }

  async function loadData() {
    try {
      const response = await fetch(`${SERVER_URL}/names`);
      const data = await response.json();
      data.forEach(item => {
        const square = document.querySelector(`.number-square[data-number="${item.number}"]`);
        if (square) {
          square.classList.add('reserved');
          square.setAttribute('title', `Игрок: ${item.nickname}`);
        }
      });
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
    }
  }

  async function loadHistory() {
    try {
      const response = await fetch(`${SERVER_URL}/history`);
      const history = await response.json();
      const historyList = document.getElementById('history-list');
      historyList.innerHTML = '';

      history.forEach((item) => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
          <span>${item.date}: ${item.number}</span>
          ${isAuthenticated ? '<button class="edit-btn">✏</button>' : ''}
          <span class="winner-name">
            ${item.name || ''}
            ${item.prize ? `<img src="pic/${item.prize}.png" class="winner-prize-icon">` : ''}
          </span>
        `;
        historyList.appendChild(listItem);

        if (isAuthenticated) {
          listItem.querySelector('.edit-btn')?.addEventListener('click', () => openEditModal(item));
        }
      });
    } catch (error) {
      console.error('Ошибка при загрузке истории:', error);
    }
  }

  async function updatePrizes() {
    try {
      const response = await fetch(`${SERVER_URL}/prizes`);
      if (!response.ok) throw new Error('Ошибка загрузки призов');
      const prizes = await response.json();

      prizes.forEach(prize => {
        const el = document.getElementById(`count-${prize.prize}-value`);
        if (el) el.textContent = `${prize.count}`;
      });
    } catch (error) {
      console.error('Ошибка загрузки призов:', error);
    }
  }

  // ===== Save history =====
  async function saveHistory() {
    if (!isAuthenticated) {
      showAlert('Нет доступа', false);
      return;
    }

    const payload = {
      date: document.getElementById('input-date').value.trim(),
      number: document.getElementById('input-number').value,
      name: document.getElementById('input-name').value.trim(),
      chosenNumber: document.getElementById('input-chosen').value,
      prize: document.getElementById('input-prize').value,
      mode: editMode ? 'edit' : 'add',
      // если у тебя на бэке нужно понимать, что редактируем конкретную запись:
      // id: currentEdit?.id
    };

    if (!payload.date || !payload.number) {
      showAlert('Дата и число обязательны', false);
      return;
    }

    try {
      const res = await fetch(`${SERVER_URL}/save-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Ошибка сервера');

      closeModal();
      await loadHistory();
      await updatePrizes();
      showAlert('Запись сохранена', true);
    } catch (e) {
      console.error(e);
      showAlert('Ошибка сохранения', false);
    }
  }

  // ВАЖНО: чтобы работал onclick="saveHistory()" из HTML
  window.saveHistory = saveHistory;

  // ===== Prize edit buttons =====
  async function updatePrizeCount(prize, count) {
    try {
      const res = await fetch(`${SERVER_URL}/update-prize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prize, count })
      });
      if (!res.ok) throw new Error();
      await updatePrizes();
      showAlert('Приз обновлён', true);
    } catch {
      showAlert('Ошибка обновления приза', false);
    }
  }

  function bindPrizeEditButtons() {
    document.querySelectorAll('.edit-prize-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!isAuthenticated) {
          showAlert('Нет доступа', false);
          return;
        }

        const prizeKey = btn.dataset.prize;
        const currentValue = document.getElementById(`count-${prizeKey}-value`)?.innerText || '';
        const newValue = prompt(`Введите новое количество для "${prizeKey}":`, currentValue);
        if (newValue === null) return;

        if (isNaN(newValue) || Number(newValue) < 0) {
          showAlert('Некорректное число', false);
          return;
        }

        updatePrizeCount(prizeKey, Number(newValue));
      });
    });
  }

  // ===== Auth / numbers =====
  async function authenticate(password) {
    try {
      const response = await fetch(`${SERVER_URL}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) throw new Error('Ошибка авторизации');

      const data = await response.json();

      if (data.success) {
        isAuthenticated = true;
        localStorage.setItem('isAuthenticated', 'true');

        updateLogoutButton();
        updateAdminUI();
        updatePrizeEditButtons();
        bindPrizeEditButtons();
        await loadHistory();

        showAlert('Успешная авторизация!', true);
        return true;
      }

      showAlert('Ошибка авторизации!', false);
      return false;
    } catch (error) {
      console.error('Ошибка при авторизации:', error);
      showAlert('Ошибка авторизации!', false);
      return false;
    }
  }

  async function reserveNumber(number, nickname) {
    try {
      const response = await fetch(`${SERVER_URL}/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number, nickname }),
      });
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Ошибка при сохранении:', error);
      return false;
    }
  }

  function logout() {
    isAuthenticated = false;
    localStorage.removeItem('isAuthenticated');
    window.location.reload();
  }

  document.getElementById('logout-btn')?.addEventListener('click', logout);

  // ===== Build grid + events =====
  if (isMobile()) {
    const video = document.querySelector('video');
    if (video) video.style.display = 'none';
    const historySection = document.getElementById('history');
    if (historySection) historySection.style.display = 'none';
  }

  const numbersGrid = document.getElementById('numbers-grid');
  for (let i = 1; i <= 100; i++) {
    const square = document.createElement('div');
    square.classList.add('number-square');
    square.innerText = i;
    square.setAttribute('data-number', i);
    numbersGrid.appendChild(square);
  }

  document.querySelectorAll('.number-square').forEach(square => {
    square.addEventListener('click', async () => {
      if (isMobile()) {
        const nickname = square.getAttribute('title');
        if (nickname) alert(nickname);
        return;
      }

      if (!isAuthenticated) {
        const password = prompt('Введите пароль:');
        if (password) await authenticate(password);
        return;
      }

      const number = square.getAttribute('data-number');
      if (square.classList.contains('reserved')) {
        const confirmFree = confirm('Освободить квадратик?');
        if (confirmFree) {
          const success = await reserveNumber(number, '');
          if (success) {
            square.classList.remove('reserved');
            square.removeAttribute('title');
            loadData();
          }
        }
      } else {
        const nickname = prompt('Введите ник игрока:');
        if (nickname) {
          const success = await reserveNumber(number, nickname);
          if (success) {
            square.classList.add('reserved');
            square.setAttribute('title', `Игрок: ${nickname}`);
            loadData();
          }
        }
      }
    });
  });

  // Кнопка "Добавить"
  document.getElementById('add-history-btn')?.addEventListener('click', openAddModal);

  // ===== Init =====
  updateLogoutButton();
  updateAdminUI();
  updatePrizeEditButtons();
  bindPrizeEditButtons();

  loadData();
  loadHistory();
  updatePrizes();
});
