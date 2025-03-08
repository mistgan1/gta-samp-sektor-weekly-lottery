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
        const timestamp = new Date().getTime(); // 🚀 Добавляем временную метку
        const response = await fetch(`${SERVER_URL}/history?t=${timestamp}`);
        if (!response.ok) throw new Error('Ошибка загрузки истории');

        const history = await response.json();
        console.log("📂 Загруженная история:", history);

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

            // Загружаем картинку приза, если приз есть
            if (item.prize && item.prize.trim() !== "") {
                console.log(`🎁 Загружаем приз ${item.prize} для ${item.name}`);
                const prizeImg = document.createElement('img');
                prizeImg.src = `pic/${item.prize}.png?t=${timestamp}`; // 🚀 Добавляем timestamp
                prizeImg.alt = item.prize;
                prizeImg.classList.add('winner-prize-icon');
                listItem.querySelector('.winner-name').appendChild(prizeImg);
            }
        });

        addPrizeButtons();
    } catch (error) {
        console.error('❌ Ошибка при загрузке истории:', error);
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

document.addEventListener('DOMContentLoaded', function () {
    const addButton = document.getElementById('add-history-btn');

    console.log("Проверяем авторизацию...", isAuthenticated); // Отладка

    if (isAuthenticated) {
        console.log("✅ Пользователь авторизован, показываем кнопку.");
        addButton.style.display = 'block';
    } else {
        console.log("❌ Пользователь НЕ авторизован, кнопка скрыта.");
    }

    addButton.addEventListener('click', async function () {
        const dateInput = prompt('Введите дату (в формате ДД.ММ.ГГГГ):');
        if (!dateInput || !/^\d{2}\.\d{2}\.\d{4}$/.test(dateInput)) {
            alert('Некорректный формат даты!');
            return;
        }

        const number = prompt('Введите число:');
        if (!number || isNaN(number)) {
            alert('Введите корректное число!');
            return;
        }

        const name = prompt('Введите имя (опционально):') || "Неизвестный";

        try {
            const response = await fetch(`${SERVER_URL}/add-history`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: dateInput, number, name }),
            });

            console.log("Ответ сервера:", response);

            const data = await response.json();
            console.log("JSON-ответ:", data);

            if (data.success) {
                showAlert('Запись успешно добавлена!', true);
                loadHistory();
            } else {
                showAlert('Ошибка при добавлении!', false);
            }
        } catch (error) {
            console.error('Ошибка при добавлении:', error);
            showAlert('Ошибка сети!', false);
        }
    });
});



function scrollToBottom() {
	setTimeout(() => {
		var historyDiv = document.getElementById("history");
		if (historyDiv) {
			historyDiv.scrollTop = historyDiv.scrollHeight;
		}
	}, 100);
}

var observer = new MutationObserver(scrollToBottom);
observer.observe(document.getElementById("history-list"), { childList: true, subtree: true });

document.addEventListener('DOMContentLoaded', function () {
    // Показываем кнопки "Редактировать" только для авторизованных пользователей
    if (isAuthenticated) {
        document.querySelectorAll('.edit-prize-btn').forEach(button => {
            button.style.display = 'inline-block';
            button.addEventListener('click', async function () {
                const prizeType = this.getAttribute('data-prize');
                const newValue = prompt(`Введите новое количество для ${prizeType}:`);
                
                if (!newValue || isNaN(newValue) || newValue < 0) {
                    alert('Введите корректное число!');
                    return;
                }

                try {
                    const response = await fetch(`${SERVER_URL}/update-prize`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prize: prizeType, count: Number(newValue) }),
                    });

                    const data = await response.json();
                    if (data.success) {
                        showAlert(`Количество ${prizeType} обновлено!`, true);
                        document.getElementById(`count-${prizeType}-value`).textContent = newValue; // Обновляем без перезагрузки
                    } else {
                        showAlert('Ошибка при обновлении!', false);
                    }
                } catch (error) {
                    console.error('Ошибка при обновлении:', error);
                    showAlert('Ошибка сети!', false);
                }
            });
        });
    }
});

document.addEventListener('DOMContentLoaded', function () {
    const logoutBtn = document.getElementById('logout-btn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            isAuthenticated = false;
            localStorage.removeItem('isAuthenticated');
            showAlert('Вы вышли из аккаунта!', true);
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        });
    } else {
        console.error("❌ Кнопка 'Выйти' не найдена в DOM!");
    }
});

function addPrizeButtons() {
    if (!isAuthenticated) return;

    document.querySelectorAll('.winner-name').forEach(winner => {
        if (winner.parentElement.querySelector('.add-prize-btn')) return;

        const addPrizeBtn = document.createElement('button');
        addPrizeBtn.textContent = '🎁';
        addPrizeBtn.classList.add('add-prize-btn');
        addPrizeBtn.style.marginLeft = '10px';

        winner.parentElement.insertBefore(addPrizeBtn, winner.nextSibling);

        addPrizeBtn.addEventListener('click', async function () {
            const prizeList = [
                { name: "coupons", src: "pic/coupons.png" },
                { name: "berry", src: "pic/berry.png" },
                { name: "dragon", src: "pic/dragon.png" },
                { name: "krasnorech", src: "pic/krasnorech.png" },
                { name: "nemota", src: "pic/nemota.png" },
                { name: "otluch", src: "pic/otluch.png" },
                { name: "heavy", src: "pic/heavy.png" },
                { name: "gorgon", src: "pic/gorgon.png" },
                { name: "vedma", src: "pic/vedma.png" },
                { name: "goldapple", src: "pic/goldenapple.png" },
                { name: "5kk", src: "pic/5kk.png" },
				{ name: "valentin", src: "pic/valentin.png" },
				{ name: "rep", src: "pic/rep.png" }
            ];

            let prizeOptions = prizeList.map(prize => prize.name).join(', ');
            const selectedPrize = prompt(`Выберите приз (оставьте пустым, чтобы удалить) coupons berry dragon krasnorech nemota otluch heavy gorgon vedma goldapple 5kk valentin rep:`).toLowerCase().trim();

            // Если пустой ввод – очищаем приз
            if (selectedPrize === "") {
                updateWinnerPrize(winner, "");
                return;
            }

            const prize = prizeList.find(p => p.name === selectedPrize);
            if (!prize) {
                alert('Некорректный выбор приза!');
                return;
            }

            updateWinnerPrize(winner, prize.name, prize.src);
        });
    });
}


async function updateWinnerPrize(winner, prizeName, prizeSrc = "") {
    const winnerName = winner.textContent.trim();
    const winnerDate = winner.parentElement.querySelector('span:first-child').textContent.split(':')[0];

    try {
        const response = await fetch(`${SERVER_URL}/update-winner-prize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: winnerDate, name: winnerName, prize: prizeName }),
        });

        const data = await response.json();
        if (data.success) {
            showAlert(prizeName ? `Приз ${prizeName} добавлен победителю ${winnerName}!` : `Приз удален у ${winnerName}`, true);

            let prizeImg = winner.parentElement.querySelector('.winner-prize-icon');

            if (prizeName) {
                if (!prizeImg) {
                    prizeImg = document.createElement('img');
                    prizeImg.classList.add('winner-prize-icon');
                    winner.appendChild(prizeImg);
                }
                prizeImg.src = prizeSrc;
                prizeImg.alt = prizeName;
            } else {
                if (prizeImg) prizeImg.remove();
            }

            // 🚀 ПЕРЕЗАГРУЖАЕМ СПИСОК ПРИЗОВ ПОСЛЕ ОБНОВЛЕНИЯ HISTORY.JSON
            loadHistory();
        } else {
            showAlert('Ошибка при обновлении приза!', false);
        }
    } catch (error) {
        console.error('❌ Ошибка при обновлении:', error);
        showAlert('Ошибка сети!', false);
    }
}





document.addEventListener('DOMContentLoaded', function () {
    loadHistory().then(addPrizeButtons);

    const observer = new MutationObserver(addPrizeButtons);
    observer.observe(document.getElementById('history-list'), { childList: true, subtree: true });
});


setInterval(updateTimer, 1000);
updateTimer();

window.onload = () => {
    updateLogoutButton();
    loadData();
    loadHistory();
};
