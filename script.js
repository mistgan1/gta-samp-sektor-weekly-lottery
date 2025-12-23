document.addEventListener('DOMContentLoaded', () => {
  const SERVER_URL = 'https://gta-samp-sektor-weekly-lottery.onrender.com';
  let isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

  let editMode = false;
  let currentEdit = null;

  function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // ===================== Alerts =====================
  function showAlert(message, isSuccess) {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;

    const alert = document.createElement('div');
    alert.classList.add('alert', isSuccess ? 'success' : 'error');
    alert.innerText = message;
    alertContainer.appendChild(alert);

    setTimeout(() => alert.remove(), 3000);
  }

  // ===================== Admin UI =====================
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

  // ===================== Modal =====================
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

    document.getElementById('modal-title').innerText = 'Добавить запись';

    // очистка
    document.getElementById('input-date').value = '';
    document.getElementById('input-number').value = '';
    document.getElementById('input-name').value = '';
    document.getElementById('input-chosen').value = '';
    document.getElementById('input-prize').value = '';

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
  window.closeModal = closeModal;
  window.saveHistory = saveHistory;
  window.setToday = setToday;
  window.setYesterday = setYesterday;

  // ===================== Data =====================
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

      history.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
          <span>${item.date}: ${item.number}</span>
          ${isAuthenticated ? '<button class="edit-btn">✏</button>' : ''}
          <span class="winner-name">
            ${item.name || ''}
            ${item.prize ? `<img src="pic/${item.prize}.png" class="winner-prize-icon">` : ''}
          </span>
        `;
        historyList.appendChild(li);

        if (isAuthenticated) {
          li.querySelector('.edit-btn')?.addEventListener('click', () => openEditModal(item));
        }
      });
      scrollHistoryToBottom(); 
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

  function scrollHistoryToBottom() {
    const history = document.getElementById('history');
    if (!history) return;
    history.scrollTop = history.scrollHeight;
    }

  // ===================== Save history =====================
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
      mode: editMode ? 'edit' : 'add'
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

  // ===================== Prize edit =====================
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

  // ===================== Auth / reserve =====================
  async function authenticate(password) {
    try {
      const response = await fetch(`${SERVER_URL}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (!response.ok) return false;

      const data = await response.json();
      if (!data.success) return false;

      isAuthenticated = true;
      localStorage.setItem('isAuthenticated', 'true');

      updateLogoutButton();
      updateAdminUI();
      updatePrizeEditButtons();
      bindPrizeEditButtons();
      await loadHistory();

      return true;
    } catch (e) {
      console.error('Ошибка при авторизации:', e);
      return false;
    }
  }

  async function reserveNumber(number, nickname) {
    try {
      const response = await fetch(`${SERVER_URL}/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number, nickname })
      });
      const data = await response.json();
      return data.success;
    } catch (e) {
      console.error('Ошибка при сохранении:', e);
      return false;
    }
  }

  function logout() {
    isAuthenticated = false;
    localStorage.removeItem('isAuthenticated');
    window.location.reload();
  }

  document.getElementById('logout-btn')?.addEventListener('click', logout);

  // ===================== Grid + click =====================
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
        if (!password) return;

        const ok = await authenticate(password);
        if (ok) showAlert('Успешная авторизация!', true);
        else showAlert('Ошибка авторизации!', false);

        return;
      }

      const number = square.getAttribute('data-number');

      if (square.classList.contains('reserved')) {
        const confirmFree = confirm('Освободить квадратик?');
        if (!confirmFree) return;

        const ok = await reserveNumber(number, '');
        if (ok) {
          square.classList.remove('reserved');
          square.removeAttribute('title');
          loadData();
        }
      } else {
        const nickname = prompt('Введите ник игрока:');
        if (!nickname) return;

        const ok = await reserveNumber(number, nickname);
        if (ok) {
          square.classList.add('reserved');
          square.setAttribute('title', `Игрок: ${nickname}`);
          loadData();
        }
      }
    });
  });

  // Кнопка "Добавить"
  document.getElementById('add-history-btn')?.addEventListener('click', openAddModal);

  // ===================== Timer (без /generate) =====================
  function calculateNextDate() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun ... 6=Sat
    const targetDays = [2, 6]; // Tue, Sat

    let daysToAdd = 0;
    for (let i = 0; i < targetDays.length; i++) {
      const d = targetDays[i];
      const isToday = d === dayOfWeek;
      const beforeDrawTime = now.getHours() < 0 || (now.getHours() === 0 && now.getMinutes() < 1);
      if (d > dayOfWeek || (isToday && beforeDrawTime)) {
        daysToAdd = d - dayOfWeek;
        break;
      }
    }
    if (daysToAdd === 0) daysToAdd = targetDays[0] - dayOfWeek + 7;

    const nextDate = new Date(now);
    nextDate.setDate(now.getDate() + daysToAdd);
    nextDate.setHours(0, 1, 0, 0);
    return nextDate;
  }

  let nextDate = calculateNextDate();

  function updateTimer() {
    const now = new Date();
    let diff = nextDate - now;

    if (diff <= 0) {
      nextDate = calculateNextDate();
      loadHistory();
      diff = nextDate - now;
    }

    diff = Math.max(0, diff);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const timerEl = document.getElementById('timer');
    if (timerEl) timerEl.innerText = `${days} д. ${hours} ч. ${minutes} мин. ${seconds} сек.`;
  }

  setInterval(updateTimer, 1000);
  updateTimer();

  // ===================== Init =====================
  updateLogoutButton();
  updateAdminUI();
  updatePrizeEditButtons();
  bindPrizeEditButtons();

  loadData();
  loadHistory();
  updatePrizes();
});
