const SERVER_URL = 'https://gta-samp-sektor-weekly-lottery.onrender.com';
let isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';


let editMode = false;
let currentEdit = null;

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

if (isMobile()) {
    const video = document.querySelector('video');
    if (video) {
        video.style.display = 'none';
    }

    const historySection = document.getElementById('history');
    if (historySection) {
        historySection.style.display = 'none';
    }
}

const numbersGrid = document.getElementById('numbers-grid');
for (let i = 1; i <= 100; i++) {
    const square = document.createElement('div');
    square.classList.add('number-square');
    square.innerText = i;
    square.setAttribute('data-number', i);
    numbersGrid.appendChild(square);
}

function openAddModal() {
  if (!isAuthenticated) {
    showAlert('Нет доступа', false);
    return;
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

async function updatePrizeCount(prize, count) {
  try {
    const res = await fetch(`${SERVER_URL}/update-prize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prize, count })
    });

    if (!res.ok) throw new Error();

    updatePrizes();
    showAlert('Приз обновлён', true);
  } catch {
    showAlert('Ошибка обновления приза', false);
  }
}


  editMode = false;
  currentEdit = null;

  document.getElementById('modal-title').innerText = 'Добавить запись';
  document.getElementById('admin-modal').classList.remove('hidden');
  loadPrizesToSelect();
}

function closeModal() {
  document.getElementById('admin-modal').classList.add('hidden');
}


function openEditModal(item) {
  if (!isAuthenticated) {
    showAlert('Нет доступа', false);
    return;
  }

  editMode = true;
  currentEdit = item;

  document.getElementById('modal-title').innerText = 'Редактировать запись';
  document.getElementById('input-date').value = item.date;
  document.getElementById('input-number').value = item.number;
  document.getElementById('input-name').value = item.name || '';
  document.getElementById('input-chosen').value = item.chosenNumber || '';

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

    if (!res.ok) {
      throw new Error('Ошибка сервера');
    }

    closeModal();
    loadHistory();
    showAlert('Запись сохранена', true);
  } catch (e) {
    console.error(e);
    showAlert('Ошибка сохранения', false);
  }
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
                const editBtn = listItem.querySelector('.edit-btn');
                editBtn.addEventListener('click', () => {
                    openEditModal(item);
                });
            }
        });
    } catch (error) {
        console.error('Ошибка при загрузке истории:', error);
    }
}

async function updateWinner(date, number, name) {
    try {
        const response = await fetch(`${SERVER_URL}/update-winner`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, number, name }),
        });
        const data = await response.json();
        if (data.success) {
            loadHistory();
        } else {
            showAlert('Ошибка при обновлении никнейма', false);
        }
    } catch (error) {
        console.error('Ошибка при обновлении никнейма:', error);
        showAlert('Произошла ошибка при обновлении никнейма.', false);
    }
}

async function updatePrizes() {
    try {
        const response = await fetch(`${SERVER_URL}/prizes`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            throw new Error('Ошибка загрузки призов');
        }

        const prizes = await response.json();
        console.log('Загруженные призы:', prizes);

        prizes.forEach(prize => {
            const element = document.getElementById(`count-${prize.prize}-value`);
            if (element) {
                element.textContent = `${prize.count}`;
            } else {
                console.warn(`Элемент для приза ${prize.prize} не найден`);
            }
        });
    } catch (error) {
        console.error('Ошибка загрузки призов:', error);
    }
}
document.addEventListener('DOMContentLoaded', updatePrizes);

document.querySelectorAll('.number-square').forEach(square => {
    square.addEventListener('click', async () => {
        if (isMobile()) {
            const nickname = square.getAttribute('title');
            if (nickname) {
                alert(nickname);
            }
        } else {
            if (!isAuthenticated) {
                const password = prompt('Введите пароль:');
                if (password) {
                    const success = await authenticate(password);
                    if (success) {
                        showAlert('Успешная авторизация!', true);
                    } else {
                        showAlert('Ошибка авторизации!', false);
                    }
                }
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
        }
    });
});

function updatePrizeEditButtons() {
  document.querySelectorAll('.edit-prize-btn').forEach(btn => {
    btn.style.display = isAuthenticated ? 'inline-block' : 'none';
  });
}

function updateAdminUI() {
  const btn = document.getElementById('add-history-btn');
  if (!btn) return;

  btn.style.display = isAuthenticated ? 'block' : 'none';
}


async function authenticate(password) {
    try {
        const response = await fetch(`${SERVER_URL}/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
        });

        if (!response.ok) {
            throw new Error('Ошибка авторизации');
        }

        const data = await response.json();

        if (data.success) {
            isAuthenticated = true;
            localStorage.setItem('isAuthenticated', 'true');
            
            updateLogoutButton();
            updateAdminUI();
            updatePrizeEditButtons();
            bindPrizeEditButtons(); 
            loadHistory();
            
            showAlert('Успешная авторизация!', true);
            return true;
        } else {
            throw new Error('Ошибка авторизации');
        }
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

function updateLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (!logoutBtn) return;

    if (isAuthenticated) {
        logoutBtn.style.display = 'block';
    } else {
        logoutBtn.style.display = 'none';
    }
}

document.getElementById('logout-btn')?.addEventListener('click', logout);

function showAlert(message, isSuccess) {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;

    const alert = document.createElement('div');
    alert.classList.add('alert');
    alert.classList.add(isSuccess ? 'success' : 'error');
    alert.innerText = message;
    alertContainer.appendChild(alert);

    setTimeout(() => {
        alert.remove();
    }, 3000);
}

function calculateNextDate() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun ... 6=Sat
    const targetDays = [2, 6]; // Tue, Sat

    let daysToAdd = 0;
    for (let i = 0; i < targetDays.length; i++) {
        const d = targetDays[i];
        const isToday = d === dayOfWeek;
        const beforeDrawTime = now.getHours() < 0 || (now.getHours() === 0 && now.getMinutes() < 1); // как было у тебя
        if (d > dayOfWeek || (isToday && beforeDrawTime)) {
            daysToAdd = d - dayOfWeek;
            break;
        }
    }

    if (daysToAdd === 0) {
        daysToAdd = targetDays[0] - dayOfWeek + 7;
    }

    const nextDate = new Date(now);
    nextDate.setDate(now.getDate() + daysToAdd);
    nextDate.setHours(0, 1, 0, 0);
    return nextDate;
}

let nextDate = calculateNextDate();

function updateTimer() {
    const now = new Date();
    let timeDiff = nextDate - now;

    // Раньше тут был POST /generate — теперь генерация в Telegram-боте
    if (timeDiff <= 0) {
        nextDate = calculateNextDate();
        loadHistory(); // просто подтянуть историю (вдруг уже есть новый тираж)
        timeDiff = nextDate - now;
    }

    const safeDiff = Math.max(0, timeDiff);

    const days = Math.floor(safeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((safeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((safeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((safeDiff % (1000 * 60)) / 1000);

    const timerEl = document.getElementById('timer');
    if (timerEl) {
        timerEl.innerText = `${days} д. ${hours} ч. ${minutes} мин. ${seconds} сек.`;
    }
}

document.addEventListener("DOMContentLoaded", function () {
    scrollToBottom();
});

function scrollToBottom() {
    setTimeout(() => {
        const historyDiv = document.getElementById("history");
        if (historyDiv) {
            historyDiv.scrollTop = historyDiv.scrollHeight;
        }
    }, 100);
}

const historyListEl = document.getElementById("history-list");
if (historyListEl) {
    const observer = new MutationObserver(scrollToBottom);
    observer.observe(historyListEl, { childList: true, subtree: true });
}

setInterval(updateTimer, 1000);
updateTimer();

window.onload = () => {
  updateLogoutButton();
  updateAdminUI();
  updatePrizeEditButtons();

  document.getElementById('add-history-btn')
    ?.addEventListener('click', openAddModal);

  loadData();
  loadHistory();
};


