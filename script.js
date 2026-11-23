const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameStarted = false;
let gameSeconds = 0;
let totalSeconds = 0;
let timerInterval = null;
let totalTimerInterval = null;
let gameWon = false;
let currentWorldIndex = 0;

let unlockedWorlds = 5; // Открыты все 5 миров

const game = {
    money: 300,
    hireModalOpen: false,
    deskModalOpen: false,
    selectedDeskIndex: null,
    officeTier: 0
};

const player = {
    x: 300,
    y: 330,
    size: 24,
    speed: 4,
    color: '#38bdf8'
};

const hireDesk = { x: 70, y: 70 };
const maxUpgradeShop = { x: 540, y: 390 };

const worldsConfig = [
    {
        id: 0,
        name: 'Мир 1: Стартап',
        bg: '#0f172a',
        startMoney: 300,
        goal: 1e15, // 1qa$
        goalStr: '1qa$',
        maxTier: 10,
        maxEmpLevel: 10,
        expansionCosts: [
            15000, 100000, 500000, 1000000, 10000000, 
            100000000, 10000000000, 100000000000, 1000000000000
        ]
    },
    {
        id: 1,
        name: 'Мир 2: Корпорация',
        bg: '#111827',
        startMoney: 1000000,
        goal: 5e20, // 500qi$
        goalStr: '500qi$',
        maxTier: 15,
        maxEmpLevel: 15,
        expansionCosts: [
            50000000, 100000000, 1000000000, 30000000000, 250000000000, 
            500000000000, 1000000000000, 10000000000000, 50000000000000, 
            100000000000000, 500000000000500, 1000000000000000, 
            5000000000000000, 10000000000000000
        ]
    },
    {
        id: 2,
        name: 'Мир 3: Кибер-Империя',
        bg: '#0c0a1d',
        startMoney: 10000000,
        goal: 5e22, // 50sx$
        goalStr: '50sx$',
        maxTier: 15,
        maxEmpLevel: 20,
        expansionCosts: [
            100000000, 500000000, 2000000000, 10000000000, 50000000000, 
            200000000000, 1000000000000, 5000000000000, 20000000000000, 
            100000000000000, 500000000000500, 2000000000000000, 
            10000000000000000, 50000000000000000
        ]
    },
    {
        id: 3,
        name: 'Мир 4: Квантовая Сеть',
        bg: '#180a2e',
        startMoney: 100000000,
        goal: 2e25, // 20sp$
        goalStr: '20sp$',
        maxTier: 15,
        maxEmpLevel: 25,
        expansionCosts: [
            500000000, 2000000000, 10000000000, 50000000000, 200000000000, 
            1000000000000, 5000000000000, 25000000000000, 100000000000000, 
            500000000000500, 2000000000000000, 10000000000000000, 
            50000000000050000, 200000000000000000
        ]
    },
    {
        id: 4,
        name: 'Мир 5: Метавселенная',
        bg: '#051923',
        startMoney: 1000000000,
        goal: 8e27, // 8oc$
        goalStr: '8oc$',
        maxTier: 15,
        maxEmpLevel: 30,
        expansionCosts: [
            2000000000, 10000000000, 50000000000, 200000000000, 1000000000000, 
            5000000000000, 25000000000000, 100000000000000, 500000000000500, 
            2000000000000000, 10000000000000000, 50000000000050000, 
            200000000000000000, 1000000000000000000
        ]
    }
];

let expansions = [];
let employeeTypes = [];

function generateExpansions(worldIdx) {
    let cfg = worldsConfig[worldIdx];
    let expList = [];
    let costs = cfg.expansionCosts;
    
    for (let i = 0; i < costs.length; i++) {
        let desksCount = Math.round(10 + (90 / costs.length) * (i + 1));
        if (desksCount > 100) desksCount = 100;
        let mult = Number((1.5 + i * 0.4).toFixed(1));
        expList.push({
            tier: i + 2,
            cost: costs[i],
            desks: desksCount,
            mult: mult,
            name: `Ур.${i + 2} (${desksCount} мест)`
        });
    }
    return expList;
}

function generateEmployees(worldIdx) {
    let cfg = worldsConfig[worldIdx];
    let baseCost = cfg.startMoney * 0.15;
    let baseIncome = baseCost * 0.1;
    let costMult = 3.2 + (worldIdx * 0.15);
    let icons = ['🧑‍🎓', '👨‍💻', '🧑‍💻', '🧙‍♂️', '👨‍✈️', '👔', '📈', '🏛️', '🚀', '🌐', '💎', '🔮', '👑', '🔥', '⚡', '👾'];
    let names = ['Стажёр', 'Джуниор', 'Мидл', 'Сеньор', 'Тимлид', 'Менеджер', 'Аналитик', 'Архитектор', 'Инноватор', 'Сетевик', 'Квант', 'Оракул', 'Император', 'Повелитель', 'Титан', 'ИИ-Бог'];

    let list = [];
    for (let i = 0; i < 16; i++) {
        let c = Math.round(baseCost * Math.pow(costMult, i));
        let inc = Math.round(baseIncome * Math.pow(costMult, i));
        list.push({
            type: `e${i+1}`,
            name: `${icons[i]} ${names[i]}`,
            cost: c,
            income: inc,
            icon: icons[i]
        });
    }
    return list;
}

const desks = [];
for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
        desks.push({
            x: 60 + c * 44,
            y: 150 + r * 27,
            employee: null,
            level: 1
        });
    }
}

const keys = {};

window.selectWorld = function(worldIdx) {
    if (worldIdx > unlockedWorlds - 1) {
        alert('🔒 Этот мир заблокирован! Пройдите предыдущий мир.');
        return;
    }

    currentWorldIndex = worldIdx;
    let cfg = worldsConfig[worldIdx];

    expansions = generateExpansions(worldIdx);
    employeeTypes = generateEmployees(worldIdx);

    game.money = cfg.startMoney;
    game.officeTier = 0;
    game.hireModalOpen = false;
    game.deskModalOpen = false;
    game.selectedDeskIndex = null;
    gameWon = false;

    desks.forEach(d => {
        d.employee = null;
        d.level = 1;
    });

    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    document.getElementById('worldTitle').textContent = `🏢 ${cfg.name}`;
    document.getElementById('goalText').textContent = cfg.goalStr;
    document.getElementById('maxTierText').textContent = cfg.maxTier;
    document.getElementById('gameArenaBg').style.background = cfg.bg;

    gameStarted = true;
    startTimers();
    updateHUD();
};

window.returnToMenu = function() {
    gameStarted = false;
    clearInterval(timerInterval);
    clearInterval(totalTimerInterval);
    document.getElementById('winModal').classList.add('hidden');
    document.getElementById('gameScreen').classList.add('hidden');
    document.getElementById('mainMenu').classList.remove('hidden');
    updateMenuUI();
};

function updateMenuUI() {
    for (let i = 0; i < worldsConfig.length; i++) {
        let card = document.getElementById(`worldCard${i}`);
        let btn = document.getElementById(`worldBtn${i}`);
        if (i <= unlockedWorlds - 1) {
            if (card) card.classList.remove('locked');
            if (btn) {
                btn.classList.remove('locked-btn');
                btn.textContent = '▶ Играть';
            }
        } else {
            if (card) card.classList.add('locked');
            if (btn) {
                btn.classList.add('locked-btn');
                btn.textContent = '🔒 Закрыто';
            }
        }
    }
}

window.resetSaveData = function() {
    if (confirm('⚠️ Сбросить прогресс и начать заново?')) {
        unlockedWorlds = 1;
        updateMenuUI();
        alert('🔄 Прогресс сброшен!');
    }
};

document.getElementById('exitMenuBtn').addEventListener('click', returnToMenu);

function startTimers() {
    clearInterval(timerInterval);
    clearInterval(totalTimerInterval);
    gameSeconds = 0;
    totalSeconds = 0;

    timerInterval = setInterval(() => {
        if (!gameWon && gameStarted) {
            gameSeconds++;
            let mins = Math.floor(gameSeconds / 60).toString().padStart(2, '0');
            let secs = (gameSeconds % 60).toString().padStart(2, '0');
            document.getElementById('timer').textContent = `${mins}:${secs}`;
        }
    }, 1000);

    totalTimerInterval = setInterval(() => {
        if (!gameWon && gameStarted) {
            totalSeconds++;
            let mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
            let secs = (totalSeconds % 60).toString().padStart(2, '0');
            document.getElementById('totalTimer').textContent = `${mins}:${secs}`;
        }
    }, 1000);
}

document.getElementById('cheatBtn').addEventListener('click', processCheat);
document.getElementById('cheatInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') processCheat();
});

function processCheat() {
    let input = document.getElementById('cheatInput');
    let code = input.value.trim().toUpperCase();
    input.value = '';

    let cfg = worldsConfig[currentWorldIndex];
    if (code === 'GOD') {
        game.money += cfg.startMoney * 10;
        alert('⚡ ЧИТ: Получено много денег!');
    } else if (code === 'RICH') {
        game.money += cfg.goal * 2;
        alert('💰 ЧИТ: Получено много денег!');
    } else if (code === 'MAX') {
        game.money += cfg.goal * 2;
        game.officeTier = expansions.length - 1;
        let activeLimit = expansions[game.officeTier].desks;
        desks.slice(0, activeLimit).forEach(d => {
            d.employee = { ...employeeTypes[15] };
            d.level = cfg.maxEmpLevel;
        });
        alert('👑 ЧИТ: Офис и сотрудники на максимум!');
    } else if (code === 'SKIP') {
        game.money = cfg.goal;
        alert('🚀 ЧИТ: Мир успешно пропущен!');
        updateHUD();
    } else {
        alert('❌ Неверный чит-код!');
    }
    updateHUD();
}

window.addEventListener('keydown', e => {
    if (!gameStarted || gameWon) return;
    if (document.activeElement === document.getElementById('cheatInput')) return;

    let key = e.key.toLowerCase();

    if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        
        let distHire = Math.hypot(player.x - hireDesk.x, player.y - hireDesk.y);
        if (distHire < 55) {
            game.hireModalOpen = !game.hireModalOpen;
            toggleHireUI();
            return;
        }

        let distMaxShop = Math.hypot(player.x - maxUpgradeShop.x, player.y - maxUpgradeShop.y);
        if (distMaxShop < 55) {
            triggerMaxUpgradeAll();
            return;
        }

        if (game.officeTier < expansions.length) {
            let nextExp = expansions[game.officeTier];
            let signX = 540, signY = 25 + game.officeTier * 22;
            let distExp = Math.hypot(player.x - signX, player.y - signY);
            if (distExp < 45) {
                if (game.money >= nextExp.cost) {
                    game.money -= nextExp.cost;
                    game.officeTier++;
                    alert(`🎉 Офис прокачан до уровня ${game.officeTier + 1}! Мест: ${nextExp.desks}`);
                    updateHUD();
                } else {
                    alert(`Не хватает средств! Нужно ${formatMoney(nextExp.cost)}`);
                }
            }
        }
        return;
    }

    if (e.key === 'Shift') {
        let activeLimit = game.officeTier === 0 ? 10 : expansions[game.officeTier - 1].desks;
        desks.slice(0, activeLimit).forEach(d => {
            let dist = Math.hypot(player.x - d.x, player.y - d.y);
            if (dist < 35 && d.employee) {
                let refund = Math.round(d.employee.cost * 0.5);
                game.money += refund;
                d.employee = null;
                d.level = 1;
                alert(`Сотрудник уволен. Возврат: ${formatMoney(refund)}`);
                updateHUD();
            }
        });
        return;
    }

    keys[key] = true;

    if (key === 'e') {
        let activeLimit = game.officeTier === 0 ? 10 : expansions[game.officeTier - 1].desks;
        desks.slice(0, activeLimit).forEach((d, index) => {
            let dist = Math.hypot(player.x - d.x, player.y - d.y);
            if (dist < 35) {
                game.selectedDeskIndex = index;
                game.deskModalOpen = true;
                renderDeskUI(d);
            }
        });
    }
});

function triggerMaxUpgradeAll() {
    let cfg = worldsConfig[currentWorldIndex];
    let activeLimit = game.officeTier === 0 ? 10 : expansions[game.officeTier - 1].desks;
    let activeDesks = desks.slice(0, activeLimit).filter(d => d.employee !== null && d.level < cfg.maxEmpLevel);

    if (activeDesks.length === 0) {
        alert('⚠️ Нет сотрудников для прокачки!');
        return;
    }

    if (game.money <= 0) {
        alert('❌ Нет денег для прокачки!');
        return;
    }

    let totalSpent = 0;
    let keepUpgrading = true;

    while (keepUpgrading && game.money > 0) {
        keepUpgrading = false;
        activeDesks.sort((a, b) => a.level - b.level);

        for (let d of activeDesks) {
            if (d.level < cfg.maxEmpLevel) {
                let upgradeCost = Math.round(d.employee.cost * 0.4 * Math.pow(1.5, d.level - 1));
                if (game.money >= upgradeCost) {
                    game.money -= upgradeCost;
                    totalSpent += upgradeCost;
                    d.level++;
                    keepUpgrading = true;
                }
            }
        }
    }

    updateHUD();
    if (totalSpent > 0) {
        alert(`⚡ Прокачано!\n💸 Потрачено: ${formatMoney(totalSpent)}\n💰 Осталось: ${formatMoney(game.money)}`);
    } else {
        alert('❌ Не хватает денег на следующий уровень!');
    }
}

window.addEventListener('keyup', e => {
    if (!gameStarted) return;
    keys[e.key.toLowerCase()] = false;
});

function toggleHireUI() {
    const modal = document.getElementById('hireModal');
    if (game.hireModalOpen) {
        modal.classList.remove('hidden');
        renderHireList();
    } else {
        modal.classList.add('hidden');
    }
}

function renderHireList() {
    const list = document.getElementById('hireList');
    list.innerHTML = '';
    employeeTypes.forEach(emp => {
        let div = document.createElement('div');
        div.className = 'item-card';
        div.innerHTML = `
            <span>${emp.icon} <b>${emp.name}</b><br><small style="color:#94a3b8">Цена: ${formatMoney(emp.cost)} | Доход: +${formatMoney(emp.income)}/с</small></span>
            <button class="action-btn" onclick="hireEmployee('${emp.type}')">Нанять</button>
        `;
        list.appendChild(div);
    });
}

window.hireEmployee = function(type) {
    let empConfig = employeeTypes.find(e => e.type === type);
    let activeLimit = game.officeTier === 0 ? 10 : expansions[game.officeTier - 1].desks;
    
    if (game.money >= empConfig.cost) {
        let emptyDesk = desks.slice(0, activeLimit).find(d => d.employee === null);
        if (emptyDesk) {
            game.money -= empConfig.cost;
            emptyDesk.employee = { ...empConfig };
            emptyDesk.level = 1;
            game.hireModalOpen = false;
            document.getElementById('hireModal').classList.add('hidden');
            updateHUD();
        } else {
            alert('Все места в текущем офисе заняты!');
        }
    } else {
        alert('Недостаточно бюджета!');
    }
};

document.getElementById('closeHire').addEventListener('click', () => {
    game.hireModalOpen = false;
    document.getElementById('hireModal').classList.add('hidden');
});

document.getElementById('closeDesk').addEventListener('click', () => {
    game.deskModalOpen = false;
    document.getElementById('deskModal').classList.add('hidden');
});

function formatMoney(amount) {
    if (amount >= 1e27) return (amount / 1e27).toFixed(1) + 'oc$';
    if (amount >= 1e24) return (amount / 1e24).toFixed(1) + 'sp$';
    if (amount >= 1e21) return (amount / 1e21).toFixed(1) + 'sx$';
    if (amount >= 1e18) return (amount / 1e18).toFixed(1) + 'qi$';
    if (amount >= 1e15) return (amount / 1e15).toFixed(1) + 'qa$';
    if (amount >= 1e12) return (amount / 1e12).toFixed(1) + 'T$';
    if (amount >= 1e9)  return (amount / 1e9).toFixed(1) + 'B$';
    if (amount >= 1e6)  return (amount / 1e6).toFixed(1) + 'M$';
    if (amount >= 1e3)  return (amount / 1e3).toFixed(1) + 'k$';
    return Math.round(amount) + '$';
}

function updateHUD() {
    let cfg = worldsConfig[currentWorldIndex];
    let totalIncome = 0;
    let staffCount = 0;
    let activeLimit = game.officeTier === 0 ? 10 : expansions[game.officeTier - 1].desks;

    desks.slice(0, activeLimit).forEach(d => {
        if (d.employee) {
            staffCount++;
            totalIncome += d.employee.income * Math.pow(1.8, d.level - 1);
        }
    });

    let mult = 1;
    if (game.officeTier > 0) {
        mult = expansions[game.officeTier - 1].mult;
    }
    totalIncome *= mult;

    document.getElementById('money').textContent = formatMoney(game.money);
    document.getElementById('staffCount').textContent = staffCount;
    document.getElementById('maxDesks').textContent = activeLimit;
    document.getElementById('income').textContent = formatMoney(totalIncome);
    document.getElementById('officeTier').textContent = game.officeTier + 1;

    if (!gameWon && game.money >= cfg.goal) {
        triggerWin();
    }

    return totalIncome;
}

function triggerWin() {
    gameWon = true;
    let cfg = worldsConfig[currentWorldIndex];
    let mins = Math.floor(gameSeconds / 60).toString().padStart(2, '0');
    let secs = (gameSeconds % 60).toString().padStart(2, '0');
    let totalMins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    let totalSecs = (totalSeconds % 60).toString().padStart(2, '0');

    document.getElementById('finalTime').textContent = `${mins}:${secs}`;
    document.getElementById('finalTotalTime').textContent = `${totalMins}:${totalSecs}`;
    
    if (currentWorldIndex + 1 >= unlockedWorlds && currentWorldIndex < worldsConfig.length - 1) {
        unlockedWorlds = currentWorldIndex + 2;
        document.getElementById('winDesc').textContent = `🎯 Цель ${cfg.goalStr} достигнута! Мир ${currentWorldIndex + 2} разблокирован!`;
    } else {
        document.getElementById('winDesc').textContent = `🎯 Вы полностью прошли все 5 миров игры!`;
    }

    document.getElementById('winModal').classList.remove('hidden');
}

function update() {
    if (!gameStarted || game.hireModalOpen || game.deskModalOpen || gameWon) return;

    if ((keys['w'] || keys['arrowup']) && player.y > 40) player.y -= player.speed;
    if ((keys['s'] || keys['arrowdown']) && player.y < canvas.height - 30) player.y += player.speed;
    if ((keys['a'] || keys['arrowleft']) && player.x > 30) player.x -= player.speed;
    if ((keys['d'] || keys['arrowright']) && player.x < canvas.width - 70) player.x += player.speed;
}

function renderDeskUI(desk) {
    let cfg = worldsConfig[currentWorldIndex];
    const modal = document.getElementById('deskModal');
    const body = document.getElementById('deskBody');
    modal.classList.remove('hidden');

    if (!desk.employee) {
        body.innerHTML = `<p style="color:#94a3b8; font-size:0.85rem;">Стол пуст. Подойдите к стойке найма слева [ПРОБЕЛ]!</p>`;
    } else if (desk.level >= cfg.maxEmpLevel) {
        let currentIncome = desk.employee.income * Math.pow(1.8, cfg.maxEmpLevel - 1);
        body.innerHTML = `
            <div class="item-card">
                <span>${desk.employee.icon} <b>${desk.employee.name}</b><br><small>Макс. уровень: ${cfg.maxEmpLevel} | Доход: ${formatMoney(currentIncome)}/с</small></span>
            </div>
            <p style="color:#22c55e; font-size:0.8rem; text-align:center; margin-top:5px;">⭐ Достигнут предел уровня (${cfg.maxEmpLevel})!</p>
            <button class="action-btn" style="background:#ef4444; margin-top:8px;" onclick="sellEmployee()">💰 Продать за ${formatMoney(desk.employee.cost * 0.5)}</button>
        `;
    } else {
        let currentIncome = desk.employee.income * Math.pow(1.8, desk.level - 1);
        let nextIncome = desk.employee.income * Math.pow(1.8, desk.level);
        let upgradeCost = Math.round(desk.employee.cost * 0.4 * Math.pow(1.5, desk.level - 1));
        let sellPrice = Math.round(desk.employee.cost * 0.5);

        body.innerHTML = `
            <div class="item-card">
                <span>${desk.employee.icon} <b>${desk.employee.name}</b><br><small>Уровень: ${desk.level}/${cfg.maxEmpLevel} | Доход: ${formatMoney(currentIncome)} ➡️ <span style="color:#22c55e">${formatMoney(nextIncome)}</span>/с</small></span>
            </div>
            <button class="action-btn" onclick="upgradeDesk()">⬆️ Прокачать на Lv.${desk.level + 1} за ${formatMoney(upgradeCost)}</button>
            <button class="action-btn" style="background:#ef4444;" onclick="sellEmployee()">💰 Продать за ${formatMoney(sellPrice)}</button>
        `;
    }
}

window.upgradeDesk = function() {
    let cfg = worldsConfig[currentWorldIndex];
    let desk = desks[game.selectedDeskIndex];
    if (desk.level >= cfg.maxEmpLevel) {
        alert('Уже достигнут максимальный уровень!');
        return;
    }
    let upgradeCost = Math.round(desk.employee.cost * 0.4 * Math.pow(1.5, desk.level - 1));
    if (game.money >= upgradeCost) {
        game.money -= upgradeCost;
        desk.level++;
        renderDeskUI(desk);
        updateHUD();
    } else {
        alert('Не хватает денег для прокачки!');
    }
};

window.sellEmployee = function() {
    let desk = desks[game.selectedDeskIndex];
    let sellPrice = Math.round(desk.employee.cost * 0.5);
    game.money += sellPrice;
    desk.employee = null;
    desk.level = 1;
    game.deskModalOpen = false;
    document.getElementById('deskModal').classList.add('hidden');
    updateHUD();
    alert(`Сотрудник продан за ${formatMoney(sellPrice)}!`);
};

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let cfg = worldsConfig[currentWorldIndex];

    ctx.fillStyle = '#facc15';
    ctx.fillRect(hireDesk.x - 22, hireDesk.y - 12, 44, 26);
    ctx.fillStyle = '#000';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📋 Найм', hireDesk.x, hireDesk.y + 4);

    ctx.fillStyle = '#22c55e';
    ctx.fillRect(maxUpgradeShop.x - 42, maxUpgradeShop.y - 12, 84, 26);
    ctx.fillStyle = '#000';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⭐ АВТОПРОК.', maxUpgradeShop.x, maxUpgradeShop.y + 4);

    let signX = 540;
    expansions.forEach((exp, idx) => {
        let isBought = game.officeTier > idx;
        let isNext = game.officeTier === idx;
        let signY = 25 + idx * 22;

        ctx.fillStyle = isBought ? '#16a34a' : (isNext ? '#38bdf8' : '#334155');
        ctx.fillRect(signX - 38, signY - 9, 76, 18);
        ctx.strokeStyle = isNext ? '#ffffff' : '#1e293b';
        ctx.lineWidth = isNext ? 2 : 1;
        ctx.strokeRect(signX - 38, signY - 9, 76, 18);

        ctx.fillStyle = '#fff';
        ctx.font = '7px sans-serif';
        ctx.fillText(isBought ? `✓ Ур.${idx+2}` : `Ур.${idx+2} (${exp.desks}м)`, signX, signY - 2);
        ctx.font = '7px sans-serif';
        ctx.fillText(isBought ? 'Куплено' : formatMoney(exp.cost), signX, signY + 5);
    });

    let activeLimit = game.officeTier === 0 ? 10 : expansions[game.officeTier - 1].desks;
    desks.forEach((d, index) => {
        let isActive = index < activeLimit;
        ctx.fillStyle = !isActive ? '#090d16' : (d.employee ? '#1e293b' : '#0f172a');
        ctx.strokeStyle = isActive ? '#334155' : '#1e293b';
        ctx.lineWidth = 1;
        ctx.fillRect(d.x - 19, d.y - 11, 38, 22);
        ctx.strokeRect(d.x - 19, d.y - 11, 38, 22);

        if (isActive) {
            if (d.employee) {
                ctx.font = '11px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(d.employee.icon, d.x, d.y - 3);
                ctx.fillStyle = d.level === cfg.maxEmpLevel ? '#facc15' : '#38bdf8';
                ctx.font = '7px sans-serif';
                ctx.fillText(`Lv.${d.level}`, d.x, d.y + 7);
            } else {
                ctx.fillStyle = '#475569';
                ctx.font = '7px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('Стол', d.x, d.y);
            }
        }
    });

    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👨‍💼', player.x, player.y);

    let distHire = Math.hypot(player.x - hireDesk.x, player.y - hireDesk.y);
    if (distHire < 55) {
        ctx.fillStyle = '#38bdf8';
        ctx.font = '11px sans-serif';
        ctx.fillText('[ПРОБЕЛ] — Биржа труда', hireDesk.x, hireDesk.y - 20);
    }

    let distMaxShop = Math.hypot(player.x - maxUpgradeShop.x, player.y - maxUpgradeShop.y);
    if (distMaxShop < 55) {
        ctx.fillStyle = '#22c55e';
        ctx.font = '10px sans-serif';
        ctx.fillText('[ПРОБЕЛ] — Автопрокачка', maxUpgradeShop.x - 30, maxUpgradeShop.y - 20);
    }
}

setInterval(() => {
    if (gameStarted && !gameWon) {
        let income = updateHUD();
        game.money += income / 10;
        updateHUD();
    }
}, 100);

function loop() {
    if (gameStarted) {
        update();
        draw();
    }
    requestAnimationFrame(loop);
}

updateMenuUI();
loop();