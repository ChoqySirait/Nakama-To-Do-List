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

// Modal & Game Elements
const treasureModal = document.getElementById('treasure-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const treasureIconBtn = document.getElementById('treasure-icon-btn');
const treasureIntro = document.getElementById('treasure-intro');
const treasureGameContainer = document.getElementById('treasure-game-container');
const playGameBtn = document.getElementById('play-game-btn');
const restartGameBtn = document.getElementById('restart-game-btn');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameScoreVal = document.getElementById('game-score-val');

let currentFilter = 'all';
let searchQuery = '';
let treasureUnlocked = false;
let gameInterval, gameScore = 0, targetX = 0, targetY = 0, targetRadius = 20;

// SFX Synthesizer Audio
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
        } else if (type === 'hit') {
            osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.08);
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

    // Check Trigger Kejutan Harta Karun
    const total = tasks.length;
    const completedCount = tasks.filter(t => t.completed).length;

    if (total > 0 && completedCount === total) {
        treasureUnlocked = true;
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

// Drag and Drop
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

// --- MINI GAME LOGIC (Cannon Target) ---
function openTreasureModal() {
    treasureIntro.classList.remove('hidden');
    treasureGameContainer.classList.add('hidden');
    treasureModal.classList.remove('hidden');
}

function closeTreasureModal() {
    treasureModal.classList.add('hidden');
    clearInterval(gameInterval);
}

function startMiniGame() {
    treasureIntro.classList.add('hidden');
    treasureGameContainer.classList.remove('hidden');
    gameScore = 0;
    gameScoreVal.textContent = gameScore;
    nextTarget();
    clearInterval(gameInterval);
    gameInterval = setInterval(nextTarget, 1400);
}

function nextTarget() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    targetX = Math.random() * (canvas.width - 60) + 30;
    targetY = Math.random() * (canvas.height - 60) + 30;

    // Gambar Target Bajak Laut
    ctx.beginPath();
    ctx.arc(targetX, targetY, targetRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#FF5E36';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FFD700';
    ctx.stroke();

    ctx.fillStyle = '#FFF';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏴‍☠️', targetX, targetY + 5);
}

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const dist = Math.hypot(clickX - targetX, clickY - targetY);
    if (dist <= targetRadius) {
        gameScore += 10;
        gameScoreVal.textContent = gameScore;
        playSFX('hit');
        nextTarget();
    }
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

// Modal Events
treasureIconBtn.addEventListener('click', openTreasureModal);
closeModalBtn.addEventListener('click', closeTreasureModal);
playGameBtn.addEventListener('click', startMiniGame);
restartGameBtn.addEventListener('click', startMiniGame);

document.addEventListener('DOMContentLoaded', renderTasks);