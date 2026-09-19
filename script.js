const taskInput = document.getElementById('task-input');
const prioritySelect = document.getElementById('priority-select');
const dueDateInput = document.getElementById('due-date-input');
const addTaskBtn = document.getElementById('add-task-btn');
const todoList = document.getElementById('todo-list');
const filterBtns = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('search-input');
const emptyState = document.getElementById('empty-state');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const pendingCount = document.getElementById('pending-count');
const clearCompletedBtn = document.getElementById('clear-completed-btn');
const toastContainer = document.getElementById('toast-container');

const treasureModal = document.getElementById('treasure-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const treasureIconBtn = document.getElementById('treasure-icon-btn');
const treasureIntro = document.getElementById('treasure-intro');
const treasureGameContainer = document.getElementById('treasure-game-container');
const playGameBtn = document.getElementById('play-game-btn');
const restartGameBtn = document.getElementById('restart-game-btn');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameTimerVal = document.getElementById('game-timer-val');
const gameScoreVal = document.getElementById('game-score-val');
const gameOverBox = document.getElementById('game-over-box');
const gameRankTitle = document.getElementById('game-rank-title');
const gameFinalScore = document.getElementById('game-final-score');
const rewardSection = document.getElementById('reward-section');
const rewardTitle = document.getElementById('reward-title');
const rewardDesc = document.getElementById('reward-desc');
const rewardLink = document.getElementById('reward-link');

let currentFilter = 'all';
let searchQuery = '';

// Game Variables
let gameLoopId, gameTimerId;
let timeLeft = 30;
let score = 0;
let enemies = [];
let particles = [];
let cannonBalls = [];
let waveOffset = 0;

let shipX = 200;
const shipY = 240;
let aimAngle = -Math.PI / 2;
let keys = { left: false, right: false };

// POOL HADIAH RAHASIA REAL (LINK RESMI ONE PIECE)
const REWARD_POOL = [
    {
        title: "📖 Manga One Piece Chapter Terbaru",
        desc: "Akses membaca Manga resmi One Piece terjemahan Bahasa Indonesia di Shueisha MangaPlus!",
        url: "https://mangaplus.shueisha.co.jp/titles/100020"
    },
    {
        title: "📺 Anime One Piece Official Channel",
        desc: "Tonton klip, trailer, dan episode pilihan One Piece di Channel YouTube Resmi One Piece!",
        url: "https://www.youtube.com/@ONEPIECE_official"
    },
    {
        title: "🎨 Live Wallpaper HD Thousand Sunny",
        desc: "Wallpaper HD karya komunitas One Piece untuk mempercantik desktop/HP kamu!",
        url: "https://wallhaven.cc/search?q=one+piece"
    },
    {
        title: "🎵 Soundtrack Theme Luffy - Overtaken",
        desc: "Dengarkan OST paling epic One Piece 'Overtaken' di YouTube!",
        url: "https://www.youtube.com/results?search_query=one+piece+overtaken+ost"
    }
];

function playSFX(type) {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const audioCtx = new AudioCtx();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'add') {
            osc.frequency.setValueAtTime(440, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.15);
        } else if (type === 'complete') {
            osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
            osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.25);
        } else if (type === 'explode') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(160, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(25, audioCtx.currentTime + 0.25);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.25);
        }
    } catch(e) {}
}

function showToast(msg, icon = 'fa-compass') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid ${icon}" style="color: var(--gold-glow);"></i> <span>${msg}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
}

function getTasks() {
    return JSON.parse(localStorage.getItem('tasks_nakama_v2')) || [];
}

function saveTasks(tasks) {
    localStorage.setItem('tasks_nakama_v2', JSON.stringify(tasks));
}

function renderTasks() {
    todoList.innerHTML = '';
    const tasks = getTasks();

    const filtered = tasks.filter(t => {
        const matchesFilter = (currentFilter === 'pending') ? !t.completed :
                              (currentFilter === 'completed') ? t.completed : true;
        const matchesSearch = t.text.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    if (filtered.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        filtered.forEach(t => todoList.appendChild(createTaskElement(t)));
    }

    updateProgress(tasks);
    initDragAndDrop();
}

function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    li.draggable = true;
    li.dataset.id = task.id;

    const formattedDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '';

    li.innerHTML = `
        <div class="task-left">
            <button class="check-btn" aria-label="Tandai Selesai">
                <i class="fa-solid fa-check"></i>
            </button>
            <div class="task-details">
                <span class="task-text">${escapeHTML(task.text)}</span>
                <div class="task-meta">
                    <span class="bounty-badge ${task.priority}">${task.priority}</span>
                    ${formattedDate ? `<span class="due-tag"><i class="fa-regular fa-clock"></i> ${formattedDate}</span>` : ''}
                </div>
            </div>
        </div>
        <button class="delete-btn" aria-label="Hapus Misi">
            <i class="fa-solid fa-trash-can"></i>
        </button>
    `;

    li.querySelector('.check-btn').addEventListener('click', () => toggleTask(task.id));
    li.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));

    return li;
}

function addTask() {
    const text = taskInput.value.trim();
    if (!text) return showToast('Isikan rincian misimu dahulu!', 'fa-exclamation-circle');

    const tasks = getTasks();
    const newTask = {
        id: crypto.randomUUID(),
        text,
        priority: prioritySelect.value,
        dueDate: dueDateInput.value,
        completed: false
    };

    tasks.unshift(newTask);
    saveTasks(tasks);

    taskInput.value = '';
    renderTasks();
    playSFX('add');
    showToast('Misi baru tercatat di peta!', 'fa-scroll');
}

function toggleTask(id) {
    const tasks = getTasks().map(t => {
        if (t.id === id) {
            const completed = !t.completed;
            if (completed) playSFX('complete');
            return { ...t, completed };
        }
        return t;
    });

    saveTasks(tasks);
    renderTasks();

    const total = tasks.length;
    const completedCount = tasks.filter(t => t.completed).length;

    if (total > 0 && completedCount === total) {
        treasureIconBtn.classList.remove('hidden');

        if (typeof confetti === 'function') {
            confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        }

        setTimeout(() => {
            openTreasureModal();
        }, 600);
    }
}

function deleteTask(id) {
    const tasks = getTasks().filter(t => t.id !== id);
    saveTasks(tasks);
    renderTasks();
    showToast('Misi dihapus dari logbook.', 'fa-trash');
}

function updateProgress(tasks) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    progressFill.style.width = `${percent}%`;
    progressText.textContent = `${percent}% Selesai`;
    pendingCount.textContent = pending;

    if (total > 0 && completed === total) {
        treasureIconBtn.classList.remove('hidden');
    } else {
        treasureIconBtn.classList.add('hidden');
    }
}

function initDragAndDrop() {
    const items = todoList.querySelectorAll('.task-item');
    items.forEach(item => {
        item.addEventListener('dragstart', () => item.classList.add('dragging'));
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            saveNewOrder();
        });
    });

    todoList.addEventListener('dragover', e => {
        e.preventDefault();
        const dragging = document.querySelector('.dragging');
        if (!dragging) return;
        const siblings = [...todoList.querySelectorAll('.task-item:not(.dragging)')];
        const nextSibling = siblings.find(sibling => {
            return e.clientY <= sibling.getBoundingClientRect().top + sibling.offsetHeight / 2;
        });
        todoList.insertBefore(dragging, nextSibling);
    });
}

function saveNewOrder() {
    const itemIds = [...todoList.querySelectorAll('.task-item')].map(el => el.dataset.id);
    const tasks = getTasks();
    const ordered = itemIds.map(id => tasks.find(t => t.id === id)).filter(Boolean);
    saveTasks(ordered);
}

// --- ENGINE MINI GAME HD & HADIAH RANDOM ---
function openTreasureModal() {
    treasureIntro.classList.remove('hidden');
    treasureGameContainer.classList.add('hidden');
    treasureModal.classList.remove('hidden');
}

function closeTreasureModal() {
    treasureModal.classList.add('hidden');
    stopGame();
}

function startMiniGame() {
    treasureIntro.classList.add('hidden');
    treasureGameContainer.classList.remove('hidden');
    gameOverBox.classList.add('hidden');
    rewardSection.classList.add('hidden');

    score = 0;
    timeLeft = 30;
    shipX = canvas.width / 2;
    enemies = [];
    particles = [];
    cannonBalls = [];

    gameScoreVal.textContent = score;
    gameTimerVal.textContent = timeLeft;

    clearInterval(gameTimerId);
    cancelAnimationFrame(gameLoopId);

    gameTimerId = setInterval(() => {
        timeLeft--;
        gameTimerVal.textContent = timeLeft;
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);

    gameLoop();
}

function stopGame() {
    clearInterval(gameTimerId);
    cancelAnimationFrame(gameLoopId);
}

function endGame() {
    stopGame();
    let title = 'Rookie Pirate 🏴‍☠️';
    if (score >= 250) title = 'Yonko / Pirate King 👑';
    else if (score >= 140) title = 'Supernova Captain ⚔️';
    else if (score >= 60) title = 'Grand Line Navigator 🧭';

    gameRankTitle.textContent = `Gelar: ${title}`;
    gameFinalScore.textContent = `Poin Bounty Terkumpul: ${score} Berry`;

    // BERIKAN HADIAH RAHASIA RANDOM
    const randomReward = REWARD_POOL[Math.floor(Math.random() * REWARD_POOL.length)];
    rewardTitle.textContent = randomReward.title;
    rewardDesc.textContent = randomReward.desc;
    rewardLink.href = randomReward.url;

    rewardSection.classList.remove('hidden');
    gameOverBox.classList.remove('hidden');

    if (typeof confetti === 'function') {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 } });
    }
}

function spawnEnemy() {
    if (Math.random() < 0.045 && enemies.length < 6) {
        enemies.push({
            x: Math.random() * (canvas.width - 60) + 30,
            y: -30,
            width: 32,
            height: 24,
            speed: 1.2 + Math.random() * 1.5
        });
    }
}

function createExplosion(x, y) {
    for (let i = 0; i < 18; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 7,
            vy: (Math.random() - 0.5) * 7,
            radius: Math.random() * 4 + 1.5,
            color: ['#FF5E36', '#FFD700', '#FFF', '#E74C3C'][Math.floor(Math.random() * 4)],
            alpha: 1
        });
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dynamic Wave Motion
    waveOffset += 0.06;
    ctx.fillStyle = '#09121F';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0E223D';
    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x += 10) {
        ctx.lineTo(x, 170 + Math.sin(x * 0.03 + waveOffset) * 6);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.fill();

    // Ship Movement Input
    if (keys.left && shipX > 30) shipX -= 4;
    if (keys.right && shipX < canvas.width - 30) shipX += 4;

    spawnEnemy();

    // Render Cannon Balls with Physics Vector
    cannonBalls.forEach((cb, index) => {
        cb.x += cb.vx;
        cb.y += cb.vy;

        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(cb.x, cb.y, 4, 0, Math.PI * 2);
        ctx.fill();

        if (cb.y < 0 || cb.x < 0 || cb.x > canvas.width || cb.y > canvas.height) {
            cannonBalls.splice(index, 1);
        }
    });

    // Render Enemies (Navy Warships)
    enemies.forEach((enemy, eIndex) => {
        enemy.y += enemy.speed;

        // Enemy Hull (Pseudo-3D)
        ctx.fillStyle = '#8B0000';
        ctx.fillRect(enemy.x - enemy.width / 2, enemy.y, enemy.width, enemy.height);
        ctx.fillStyle = '#E74C3C';
        ctx.fillRect(enemy.x - enemy.width / 2 + 2, enemy.y + 2, enemy.width - 4, enemy.height - 4);

        // Enemy Flag Symbol
        ctx.fillStyle = '#FFF';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚓', enemy.x, enemy.y + 16);

        // Collision Check
        cannonBalls.forEach((cb, cbIndex) => {
            if (cb.x > enemy.x - enemy.width/2 && cb.x < enemy.x + enemy.width/2 &&
                cb.y > enemy.y && cb.y < enemy.y + enemy.height) {
                createExplosion(enemy.x, enemy.y + enemy.height/2);
                playSFX('explode');
                enemies.splice(eIndex, 1);
                cannonBalls.splice(cbIndex, 1);
                score += 20;
                gameScoreVal.textContent = score;
            }
        });

        if (enemy.y > canvas.height) enemies.splice(eIndex, 1);
    });

    // Render Particles
    particles.forEach((p, pIndex) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.03;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        if (p.alpha <= 0) particles.splice(pIndex, 1);
    });

    // RENDER THOUSAND SUNNY SHIP HD & ROTATING CANNON
    ctx.save();
    ctx.translate(shipX, shipY);

    // Ship Hull
    ctx.fillStyle = '#D4AC0D';
    ctx.beginPath();
    ctx.ellipse(0, 10, 24, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lion Figurehead
    ctx.fillStyle = '#FF5E36';
    ctx.beginPath();
    ctx.arc(0, -6, 10, 0, Math.PI * 2);
    ctx.fill();

    // Rotating Cannon Barrel
    ctx.rotate(aimAngle + Math.PI / 2);
    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(-3, -18, 6, 14);

    ctx.restore();

    if (timeLeft > 0) {
        gameLoopId = requestAnimationFrame(gameLoop);
    }
}

// Controls: Mouse & Keyboard
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    shipX = mouseX; // Kapal mengikuti kursor mouse
    aimAngle = Math.atan2(mouseY - shipY, mouseX - shipX);
});

canvas.addEventListener('click', (e) => {
    if (timeLeft <= 0) return;
    const speed = 8;
    cannonBalls.push({
        x: shipX,
        y: shipY,
        vx: Math.cos(aimAngle) * speed,
        vy: Math.sin(aimAngle) * speed
    });
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
});

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

// Event Listeners
addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', e => e.key === 'Enter' && addTask());
searchInput.addEventListener('input', e => { searchQuery = e.target.value; renderTasks(); });

filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        filterBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.filter;
        renderTasks();
    });
});

clearCompletedBtn.addEventListener('click', () => {
    const active = getTasks().filter(t => !t.completed);
    saveTasks(active);
    renderTasks();
    showToast('Misi selesai telah dibersihkan!', 'fa-broom');
});

treasureIconBtn.addEventListener('click', openTreasureModal);
closeModalBtn.addEventListener('click', closeTreasureModal);
playGameBtn.addEventListener('click', startMiniGame);
restartGameBtn.addEventListener('click', startMiniGame);

document.addEventListener('DOMContentLoaded', renderTasks);