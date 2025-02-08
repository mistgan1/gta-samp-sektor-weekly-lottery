const SERVER_URL = 'https://gta-samp-sektor-weekly-lottery.glitch.me';
let isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

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
                ${isAuthenticated ? '<button class="edit-btn">ред</button>' : ''}
                <span class="winner-name">${item.name ? item.name : ''}</span>
            `;
            historyList.appendChild(listItem);

            if (isAuthenticated) {
                const editBtn = listItem.querySelector('.edit-btn');
                editBtn.addEventListener('click', () => {
                    const name = prompt('Введите никнейм победителя:');
                    if (name !== null) {
                        updateWinner(item.date, item.number, name);
                    }
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
            window.location.reload();
        } else {
            throw new Error('Ошибка авторизации');
        }
    } catch (error) {
        console.error('Ошибка при авторизации:', error);
        showAlert('Ошибка авторизации!', false);
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
    if (isAuthenticated) {
        logoutBtn.style.display = 'block';
    } else {
        logoutBtn.style.display = 'none';
    }
}

document.getElementById('logout-btn').addEventListener('click', logout);

function showAlert(message, isSuccess) {
    const alertContainer = document.getElementById('alert-container');
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
    const dayOfWeek = now.getDay();
    const targetDays = [2, 6];

    let daysToAdd = 0;
    for (let i = 0; i < targetDays.length; i++) {
        if (targetDays[i] > dayOfWeek || (targetDays[i] === dayOfWeek && (now.getHours() < 0 || (now.getHours() === 0 && now.getMinutes() < 1)))) {
            daysToAdd = targetDays[i] - dayOfWeek;
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
    const timeDiff = nextDate - now;

    if (timeDiff <= 0) {
        generateNumber();
        nextDate = calculateNextDate();
    }

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

    document.getElementById('timer').innerText = `${days} д. ${hours} ч. ${minutes} мин. ${seconds} сек.`;
}

async function generateNumber() {
    try {
        const response = await fetch(`${SERVER_URL}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        const data = await response.json();
        if (data.success) {
            loadHistory();
        }
    } catch (error) {
        console.error('Ошибка при генерации числа:', error);
    }
}

setInterval(updateTimer, 1000);
updateTimer();

window.onload = () => {
    updateLogoutButton();
    loadData();
    loadHistory();
};
