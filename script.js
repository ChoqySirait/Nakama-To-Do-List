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

let currentFilter = 'all';
let searchQuery = '';

let gameLoopId, gameTimerId;
let timeLeft = 30;
let score = 0;
let enemies = [];
let particles = [];
let cannonBalls = [];
let waveOffset = 0;

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
            osc.frequency.setValueAtTime(150, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.2);
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

// --- ADVANCED GAME ENGINE (SUNNY DEFENSE) ---
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

    score = 0;
    timeLeft = 30;
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
    if (score >= 300) title = 'Yonko / Pirate King 👑';
    else if (score >= 180) title = 'Supernova Captain ⚔️';
    else if (score >= 80) title = 'Grand Line Navigator 🧭';

    gameRankTitle.textContent = `Gelar: ${title}`;
    gameFinalScore.textContent = `Poin Bounty Terkumpul: ${score} Berry`;
    gameOverBox.classList.remove('hidden');

    if (typeof confetti === 'function') {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 } });
    }
}

function spawnEnemy() {
    if (Math.random() < 0.04 && enemies.length < 5) {
        enemies.push({
            x: Math.random() * (canvas.width - 40) + 20,
            y: -30,
            size: 24,
            speed: 1 + Math.random() * 1.5,
            hp: 1
        });
    }
}

function createExplosion(x, y) {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            radius: Math.random() * 3 + 1,
            color: ['#FF5E36', '#FFD700', '#FFF', '#E74C3C'][Math.floor(Math.random() * 4)],
            alpha: 1
        });
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dynamic Wave Background
    waveOffset += 0.05;
    ctx.fillStyle = '#09121F';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#102542';
    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x += 10) {
        ctx.lineTo(x, 180 + Math.sin(x * 0.02 + waveOffset) * 8);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.fill();

    spawnEnemy();

    // Render Cannon Balls
    cannonBalls.forEach((cb, index) => {
        cb.y -= cb.speed;
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(cb.x, cb.y, 4, 0, Math.PI * 2);
        ctx.fill();

        if (cb.y < 0) cannonBalls.splice(index, 1);
    });

    // Render Enemies (Navy Warships)
    enemies.forEach((enemy, eIndex) => {
        enemy.y += enemy.speed;

        ctx.fillStyle = '#E74C3C';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#FFF';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚓', enemy.x, enemy.y + 4);

        // Check Collision with Cannon Balls
        cannonBalls.forEach((cb, cbIndex) => {
            const dist = Math.hypot(cb.x - enemy.x, cb.y - enemy.y);
            if (dist < enemy.size / 2 + 4) {
                createExplosion(enemy.x, enemy.y);
                playSFX('explode');
                enemies.splice(eIndex, 1);
                cannonBalls.splice(cbIndex, 1);
                score += 20;
                gameScoreVal.textContent = score;
            }
        });

        if (enemy.y > canvas.height) {
            enemies.splice(eIndex, 1);
        }
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

    // Draw Sunny Cannon (Player)
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height - 10, 20, 0, Math.PI * 2);
    ctx.fill();

    if (timeLeft > 0) {
        gameLoopId = requestAnimationFrame(gameLoop);
    }
}

canvas.addEventListener('click', (e) => {
    if (timeLeft <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    cannonBalls.push({
        x: canvas.width / 2,
        y: canvas.height - 20,
        speed: 7,
        targetX: clickX,
        targetY: clickY
    });
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