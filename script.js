const taskInput = document.getElementById('task-input');
const prioritySelect = document.getElementById('priority-select');
const dueDateInput = document.getElementById('due-date-input');
const addTaskBtn = document.getElementById('add-task-btn');
const todoList = document.getElementById('todo-list');
const filterBtns = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
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

const STORAGE_KEY = 'tasks_nakama_v2';
const RECOVERY_STORAGE_KEY = 'tasks_nakama_v2_recovery';
const MAX_TASK_LENGTH = 200;
const VALID_PRIORITIES = new Set(['low', 'medium', 'high']);
const PRIORITY_WEIGHT = { high: 3, medium: 2, low: 1 };

let currentFilter = 'all';
let searchQuery = '';
let currentSort = 'manual';
let hasNotifiedStorageIssue = false;
let isDragAndDropInitialized = false;
let editingState = null;
let shouldFocusEditInput = false;
let lastRenderedDateKey = '';
let deadlineRefreshTimerId = null;
let isDeadlineRefreshInitialized = false;

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

    const safeIcon = /^[a-z0-9-]+$/i.test(String(icon)) ? icon : 'fa-compass';
    const iconEl = document.createElement('i');
    iconEl.className = `fa-solid ${safeIcon}`;
    iconEl.style.color = 'var(--gold-glow)';

    const textEl = document.createElement('span');
    textEl.textContent = String(msg);

    toast.append(iconEl, ' ', textEl);
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
}

function generateTaskId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `task-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeTask(item) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;

    const id = typeof item.id === 'string' ? item.id.trim() : '';
    const text = typeof item.text === 'string' ? item.text.trim() : '';
    if (!id || !text) return null;

    const priority = VALID_PRIORITIES.has(item.priority) ? item.priority : 'medium';
    const dueDate = typeof item.dueDate === 'string' ? item.dueDate : '';
    const completed = Boolean(item.completed);

    return {
        id,
        text: text.slice(0, MAX_TASK_LENGTH),
        priority,
        dueDate,
        completed
    };
}

function backupCorruptedStorage(rawValue) {
    try {
        localStorage.setItem(RECOVERY_STORAGE_KEY, rawValue);
    } catch (e) {
        // Abaikan jika penyimpanan penuh/ditolak saat mencadangkan
    }
}

function notifyStorageIssueOnce(message) {
    if (hasNotifiedStorageIssue) return;
    hasNotifiedStorageIssue = true;
    showToast(message, 'fa-exclamation-triangle');
}

function getTasks() {
    let raw;
    try {
        raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
        notifyStorageIssueOnce('Gagal mengakses penyimpanan lokal.');
        return [];
    }

    if (!raw) return [];

    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (e) {
        backupCorruptedStorage(raw);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
        } catch (writeErr) {
            // Tetap kembalikan array kosong agar aplikasi tetap berjalan
        }
        notifyStorageIssueOnce('Data rusak ditemukan, dicadangkan & dipulihkan.');
        return [];
    }

    if (!Array.isArray(parsed)) {
        backupCorruptedStorage(raw);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
        } catch (writeErr) {
            // Tetap kembalikan array kosong
        }
        notifyStorageIssueOnce('Format data tidak valid, dicadangkan & dipulihkan.');
        return [];
    }

    const validTasks = [];
    let hasInvalidItem = false;

    for (const item of parsed) {
        const normalized = normalizeTask(item);
        if (normalized) {
            validTasks.push(normalized);
        } else {
            hasInvalidItem = true;
        }
    }

    if (hasInvalidItem) {
        backupCorruptedStorage(raw);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(validTasks));
        } catch (writeErr) {
            // Tetap gunakan data valid di memori
        }
        notifyStorageIssueOnce('Sebagian data tidak valid telah dicadangkan & dibersihkan.');
    }

    return validTasks;
}

function saveTasks(tasks) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return true;
    } catch (e) {
        const isQuotaError = e && (
            e.name === 'QuotaExceededError' ||
            e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
            e.code === 22 ||
            e.code === 1014
        );
        const msg = isQuotaError
            ? 'Penyimpanan penuh! Hapus beberapa misi terlebih dahulu.'
            : 'Gagal menyimpan data ke penyimpanan lokal!';
        showToast(msg, 'fa-exclamation-triangle');
        return false;
    }
}

function parseLocalDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const dt = new Date(year, month - 1, day);

    if (
        dt.getFullYear() !== year ||
        dt.getMonth() !== month - 1 ||
        dt.getDate() !== day
    ) {
        return null;
    }
    return dt;
}

function getDateDifference(dueDateStr, referenceDate = new Date()) {
    const dueLocal = parseLocalDate(dueDateStr);
    if (!dueLocal) return null;

    const dueUtcDay = Date.UTC(dueLocal.getFullYear(), dueLocal.getMonth(), dueLocal.getDate());
    const refUtcDay = Date.UTC(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    return Math.round((dueUtcDay - refUtcDay) / 86400000);
}

function getDeadlineStatus(task, referenceDate = new Date()) {
    const diffDays = task && task.dueDate ? getDateDifference(task.dueDate, referenceDate) : null;
    if (diffDays === null) {
        return { key: 'none', label: 'Tanpa tenggat' };
    }

    if (task.completed && diffDays < 0) {
        return { key: 'completed', label: 'Selesai' };
    }

    if (diffDays < 0) return { key: 'overdue', label: 'Terlambat' };
    if (diffDays === 0) return { key: 'today', label: 'Hari ini' };
    if (diffDays === 1) return { key: 'tomorrow', label: 'Besok' };
    if (diffDays <= 7) return { key: 'soon', label: 'Segera' };
    return { key: 'upcoming', label: 'Mendatang' };
}

function formatDueDate(dueDate) {
    const parsed = parseLocalDate(dueDate);
    if (!parsed) return '';
    return parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getMsUntilNextLocalMidnight(now = new Date()) {
    const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0, 0, 0, 50
    );
    return Math.max(1000, nextMidnight.getTime() - now.getTime());
}

function scheduleNextDeadlineRefresh(now = new Date()) {
    if (deadlineRefreshTimerId !== null) {
        clearTimeout(deadlineRefreshTimerId);
        deadlineRefreshTimerId = null;
    }

    const delay = getMsUntilNextLocalMidnight(now);
    deadlineRefreshTimerId = setTimeout(() => {
        deadlineRefreshTimerId = null;
        refreshDeadlineStatusIfDateChanged();
        scheduleNextDeadlineRefresh();
    }, delay);
}

function refreshDeadlineStatusIfDateChanged(referenceDate = new Date()) {
    const currentDateKey = getLocalDateKey(referenceDate);
    if (currentDateKey === lastRenderedDateKey) {
        return false;
    }

    lastRenderedDateKey = currentDateKey;
    renderTasks();
    return true;
}

function initDeadlineAutoRefresh() {
    if (isDeadlineRefreshInitialized) return;
    isDeadlineRefreshInitialized = true;

    lastRenderedDateKey = getLocalDateKey();
    scheduleNextDeadlineRefresh();

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            refreshDeadlineStatusIfDateChanged();
            scheduleNextDeadlineRefresh();
        }
    });

    window.addEventListener('focus', () => {
        refreshDeadlineStatusIfDateChanged();
        scheduleNextDeadlineRefresh();
    });
}

function getSortedTasks(taskList, sortMode = currentSort) {
    if (sortMode === 'manual') {
        return [...taskList];
    }

    const indexed = taskList.map((task, idx) => ({ task, idx }));

    if (sortMode === 'deadline') {
        indexed.sort((a, b) => {
            const dateA = parseLocalDate(a.task.dueDate);
            const dateB = parseLocalDate(b.task.dueDate);
            const timeA = dateA ? dateA.getTime() : Infinity;
            const timeB = dateB ? dateB.getTime() : Infinity;
            if (timeA !== timeB) return timeA - timeB;
            return a.idx - b.idx;
        });
    } else if (sortMode === 'priority-desc') {
        indexed.sort((a, b) => {
            const weightA = PRIORITY_WEIGHT[a.task.priority] || 0;
            const weightB = PRIORITY_WEIGHT[b.task.priority] || 0;
            if (weightA !== weightB) return weightB - weightA;
            return a.idx - b.idx;
        });
    } else if (sortMode === 'priority-asc') {
        indexed.sort((a, b) => {
            const weightA = PRIORITY_WEIGHT[a.task.priority] || 0;
            const weightB = PRIORITY_WEIGHT[b.task.priority] || 0;
            if (weightA !== weightB) return weightA - weightB;
            return a.idx - b.idx;
        });
    }

    return indexed.map(entry => entry.task);
}

function renderTasks() {
    lastRenderedDateKey = getLocalDateKey();
    todoList.replaceChildren();
    const tasks = getTasks();

    const filtered = tasks.filter(t => {
        const matchesFilter = (currentFilter === 'pending') ? !t.completed :
                              (currentFilter === 'completed') ? t.completed : true;
        const matchesSearch = t.text.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const displayed = getSortedTasks(filtered, currentSort);

    if (displayed.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        displayed.forEach(t => todoList.appendChild(createTaskElement(t)));
    }

    if (shouldFocusEditInput) {
        shouldFocusEditInput = false;
        const activeEditInput = todoList.querySelector('.task-edit-input');
        if (activeEditInput) {
            activeEditInput.focus();
            if (typeof activeEditInput.setSelectionRange === 'function') {
                const len = activeEditInput.value.length;
                activeEditInput.setSelectionRange(len, len);
            }
        }
    }

    updateProgress(tasks);
}

function startEditTask(task) {
    if (editingState && editingState.id !== task.id) {
        showToast('Simpan atau batalkan edit misi yang sedang aktif terlebih dahulu.', 'fa-exclamation-circle');
        const activeEditInput = todoList.querySelector('.task-edit-input');
        if (activeEditInput) activeEditInput.focus();
        return;
    }

    if (editingState && editingState.id === task.id) {
        const activeEditInput = todoList.querySelector('.task-edit-input');
        if (activeEditInput) activeEditInput.focus();
        return;
    }

    editingState = {
        id: task.id,
        text: task.text,
        priority: VALID_PRIORITIES.has(task.priority) ? task.priority : 'medium',
        dueDate: task.dueDate || '',
        error: ''
    };
    shouldFocusEditInput = true;
    renderTasks();
}

function cancelEditTask() {
    if (!editingState) return;
    editingState = null;
    shouldFocusEditInput = false;
    renderTasks();
}

function isValidDateInput(dateStr) {
    if (dateStr === '' || dateStr === null || dateStr === undefined) return true;
    if (typeof dateStr !== 'string') return false;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const dt = new Date(Date.UTC(year, month - 1, day));
    return dt.getUTCFullYear() === year &&
           dt.getUTCMonth() === month - 1 &&
           dt.getUTCDate() === day;
}

function saveEditTask() {
    if (!editingState) return;

    const trimmedText = String(editingState.text || '').trim();
    if (!trimmedText) {
        editingState.error = 'Rincian misi tidak boleh kosong.';
        showToast(editingState.error, 'fa-exclamation-circle');
        shouldFocusEditInput = true;
        renderTasks();
        return;
    }

    if (trimmedText.length > MAX_TASK_LENGTH) {
        editingState.error = `Rincian misi maksimal ${MAX_TASK_LENGTH} karakter.`;
        showToast(editingState.error, 'fa-exclamation-circle');
        shouldFocusEditInput = true;
        renderTasks();
        return;
    }

    if (!VALID_PRIORITIES.has(editingState.priority)) {
        editingState.error = 'Prioritas misi tidak valid.';
        showToast(editingState.error, 'fa-exclamation-circle');
        renderTasks();
        return;
    }

    const dueDate = typeof editingState.dueDate === 'string' ? editingState.dueDate.trim() : '';
    if (!isValidDateInput(dueDate)) {
        editingState.error = 'Format tanggal tenggat waktu tidak valid.';
        showToast(editingState.error, 'fa-exclamation-circle');
        renderTasks();
        return;
    }

    const tasks = getTasks();
    const taskIndex = tasks.findIndex(t => t.id === editingState.id);
    if (taskIndex === -1) {
        editingState = null;
        renderTasks();
        return;
    }

    const updatedTasks = tasks.map((t, idx) => {
        if (idx !== taskIndex) return t;
        return {
            ...t,
            text: trimmedText,
            priority: editingState.priority,
            dueDate
        };
    });

    if (!saveTasks(updatedTasks)) {
        editingState.error = 'Gagal menyimpan perubahan. Draft tetap dipertahankan.';
        renderTasks();
        return;
    }

    editingState = null;
    shouldFocusEditInput = false;
    renderTasks();
    showToast('Misi berhasil diperbarui!', 'fa-pen');
}

function createTaskEditForm(task) {
    const form = document.createElement('form');
    form.className = 'task-edit-form';
    form.noValidate = true;

    const inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.className = 'task-edit-input';
    inputEl.maxLength = MAX_TASK_LENGTH;
    inputEl.value = editingState.text;
    inputEl.setAttribute('aria-label', 'Edit teks misi');
    inputEl.placeholder = 'Tuliskan rincian misi...';

    const metaRow = document.createElement('div');
    metaRow.className = 'task-edit-meta';

    const selectEl = document.createElement('select');
    selectEl.className = 'task-edit-select';
    selectEl.setAttribute('aria-label', 'Edit prioritas misi');
    [
        { value: 'low', label: 'Low Bounty' },
        { value: 'medium', label: 'Medium Bounty' },
        { value: 'high', label: 'High Bounty' }
    ].forEach(opt => {
        const optionEl = document.createElement('option');
        optionEl.value = opt.value;
        optionEl.textContent = opt.label;
        selectEl.appendChild(optionEl);
    });
    selectEl.value = editingState.priority;

    const dateEl = document.createElement('input');
    dateEl.type = 'date';
    dateEl.className = 'task-edit-date';
    dateEl.value = editingState.dueDate;
    dateEl.setAttribute('aria-label', 'Edit tenggat waktu');

    metaRow.append(selectEl, dateEl);

    const actionsRow = document.createElement('div');
    actionsRow.className = 'task-edit-actions';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.className = 'task-edit-save';
    saveBtn.setAttribute('aria-label', 'Simpan perubahan');
    const saveIcon = document.createElement('i');
    saveIcon.className = 'fa-solid fa-check';
    saveBtn.append(saveIcon, ' Simpan');

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'task-edit-cancel';
    cancelBtn.setAttribute('aria-label', 'Batal mengedit');
    const cancelIcon = document.createElement('i');
    cancelIcon.className = 'fa-solid fa-xmark';
    cancelBtn.append(cancelIcon, ' Batal');

    actionsRow.append(saveBtn, cancelBtn);
    form.append(inputEl, metaRow);

    if (editingState.error) {
        inputEl.setAttribute('aria-invalid', 'true');
        const errorEl = document.createElement('p');
        errorEl.className = 'task-edit-error';
        errorEl.setAttribute('role', 'alert');
        errorEl.setAttribute('aria-live', 'assertive');
        errorEl.textContent = editingState.error;
        form.appendChild(errorEl);
    }

    form.appendChild(actionsRow);

    inputEl.addEventListener('input', () => {
        if (editingState && editingState.id === task.id) {
            editingState.text = inputEl.value;
            if (editingState.error) editingState.error = '';
        }
    });
    selectEl.addEventListener('change', () => {
        if (editingState && editingState.id === task.id) {
            editingState.priority = selectEl.value;
        }
    });
    dateEl.addEventListener('input', () => {
        if (editingState && editingState.id === task.id) {
            editingState.dueDate = dateEl.value;
        }
    });

    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            cancelEditTask();
        }
    };
    form.addEventListener('keydown', handleEscape);
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveEditTask();
    });
    cancelBtn.addEventListener('click', cancelEditTask);

    return form;
}

function createTaskElement(task) {
    const isEditing = Boolean(editingState && editingState.id === task.id);
    const isDragAllowed = !isEditing && currentSort === 'manual';
    const li = document.createElement('li');
    li.className = `task-item${task.completed ? ' completed' : ''}${isEditing ? ' editing' : ''}${currentSort !== 'manual' ? ' sort-locked' : ''}`;
    li.draggable = isDragAllowed;
    li.dataset.id = task.id;

    if (isEditing) {
        li.appendChild(createTaskEditForm(task));
        return li;
    }

    const taskLeft = document.createElement('div');
    taskLeft.className = 'task-left';

    const checkBtn = document.createElement('button');
    checkBtn.type = 'button';
    checkBtn.className = 'check-btn';
    checkBtn.setAttribute('aria-label', 'Tandai Selesai');
    const checkIcon = document.createElement('i');
    checkIcon.className = 'fa-solid fa-check';
    checkBtn.appendChild(checkIcon);

    const taskDetails = document.createElement('div');
    taskDetails.className = 'task-details';

    const taskText = document.createElement('span');
    taskText.className = 'task-text';
    taskText.textContent = task.text;

    const taskMeta = document.createElement('div');
    taskMeta.className = 'task-meta';

    const bountyBadge = document.createElement('span');
    bountyBadge.className = `bounty-badge ${task.priority}`;
    bountyBadge.textContent = task.priority;
    taskMeta.appendChild(bountyBadge);

    const formattedDate = formatDueDate(task.dueDate);
    if (formattedDate) {
        const dueTag = document.createElement('span');
        dueTag.className = 'due-tag';
        const clockIcon = document.createElement('i');
        clockIcon.className = 'fa-regular fa-clock';
        dueTag.append(clockIcon, ` ${formattedDate}`);
        taskMeta.appendChild(dueTag);
    }

    const deadlineStatus = getDeadlineStatus(task);
    const deadlineBadge = document.createElement('span');
    deadlineBadge.className = `deadline-badge deadline-${deadlineStatus.key}`;
    deadlineBadge.textContent = deadlineStatus.label;
    taskMeta.appendChild(deadlineBadge);

    taskDetails.append(taskText, taskMeta);
    taskLeft.append(checkBtn, taskDetails);

    const taskActions = document.createElement('div');
    taskActions.className = 'task-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'edit-btn';
    editBtn.setAttribute('aria-label', 'Edit Misi');
    editBtn.title = 'Edit Misi';
    const editIcon = document.createElement('i');
    editIcon.className = 'fa-solid fa-pen';
    editBtn.appendChild(editIcon);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete-btn';
    deleteBtn.setAttribute('aria-label', 'Hapus Misi');
    deleteBtn.title = 'Hapus Misi';
    const trashIcon = document.createElement('i');
    trashIcon.className = 'fa-solid fa-trash-can';
    deleteBtn.appendChild(trashIcon);

    taskActions.append(editBtn, deleteBtn);
    li.append(taskLeft, taskActions);

    checkBtn.addEventListener('click', () => toggleTask(task.id));
    editBtn.addEventListener('click', () => startEditTask(task));
    deleteBtn.addEventListener('click', () => deleteTask(task.id));
    li.addEventListener('dragstart', (e) => {
        if (li.classList.contains('editing') || currentSort !== 'manual') {
            if (e && typeof e.preventDefault === 'function') e.preventDefault();
            return;
        }
        li.classList.add('dragging');
    });
    li.addEventListener('dragend', () => {
        li.classList.remove('dragging');
        if (currentSort === 'manual') {
            saveNewOrder();
        }
    });

    return li;
}

function addTask() {
    const text = taskInput.value.trim();
    if (!text) return showToast('Isikan rincian misimu dahulu!', 'fa-exclamation-circle');
    if (text.length > MAX_TASK_LENGTH) {
        return showToast(`Rincian misi maksimal ${MAX_TASK_LENGTH} karakter!`, 'fa-exclamation-circle');
    }

    const priority = VALID_PRIORITIES.has(prioritySelect.value) ? prioritySelect.value : 'medium';
    const tasks = getTasks();
    const newTask = {
        id: generateTaskId(),
        text,
        priority,
        dueDate: dueDateInput.value,
        completed: false
    };

    tasks.unshift(newTask);
    if (!saveTasks(tasks)) return;

    taskInput.value = '';
    renderTasks();
    playSFX('add');
    showToast('Misi baru tercatat di peta!', 'fa-scroll');
}

function toggleTask(id) {
    let toggledCompleted = false;
    let found = false;
    const tasks = getTasks().map(t => {
        if (t.id === id) {
            found = true;
            toggledCompleted = !t.completed;
            return { ...t, completed: toggledCompleted };
        }
        return t;
    });

    if (!found) return;
    if (!saveTasks(tasks)) return;

    if (toggledCompleted) playSFX('complete');
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
    const tasks = getTasks();
    const remaining = tasks.filter(t => t.id !== id);
    if (remaining.length === tasks.length) return;
    if (!saveTasks(remaining)) return;

    if (editingState && editingState.id === id) {
        editingState = null;
    }
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
    if (isDragAndDropInitialized) return;
    isDragAndDropInitialized = true;

    todoList.addEventListener('dragover', e => {
        if (currentSort !== 'manual') return;
        e.preventDefault();
        const dragging = todoList.querySelector('.dragging');
        if (!dragging) return;
        const siblings = [...todoList.querySelectorAll('.task-item:not(.dragging)')];
        const nextSibling = siblings.find(sibling => {
            return e.clientY <= sibling.getBoundingClientRect().top + sibling.offsetHeight / 2;
        });
        todoList.insertBefore(dragging, nextSibling || null);
    });
}

function saveNewOrder() {
    if (currentSort !== 'manual') return;
    const visibleIds = [...todoList.querySelectorAll('.task-item')]
        .map(el => el.dataset.id)
        .filter(Boolean);
    if (visibleIds.length === 0) return;

    const tasks = getTasks();
    const taskById = new Map(tasks.map(t => [t.id, t]));
    const visibleIdSet = new Set(visibleIds);

    let visibleIdx = 0;
    const reordered = tasks.map(task => {
        if (visibleIdSet.has(task.id) && visibleIdx < visibleIds.length) {
            return taskById.get(visibleIds[visibleIdx++]) || task;
        }
        return task;
    });

    if (!saveTasks(reordered)) {
        renderTasks();
    }
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

if (sortSelect) {
    sortSelect.addEventListener('change', e => {
        currentSort = e.target.value || 'manual';
        renderTasks();
    });
}

filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        filterBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.filter;
        renderTasks();
    });
});

clearCompletedBtn.addEventListener('click', () => {
    const tasks = getTasks();
    const active = tasks.filter(t => !t.completed);
    if (active.length === tasks.length) {
        return showToast('Tidak ada misi selesai untuk dibersihkan.', 'fa-compass');
    }
    if (!saveTasks(active)) return;
    if (editingState && !active.some(t => t.id === editingState.id)) {
        editingState = null;
    }
    renderTasks();
    showToast('Misi selesai telah dibersihkan!', 'fa-broom');
});

treasureIconBtn.addEventListener('click', openTreasureModal);
closeModalBtn.addEventListener('click', closeTreasureModal);
playGameBtn.addEventListener('click', startMiniGame);
restartGameBtn.addEventListener('click', startMiniGame);

document.addEventListener('DOMContentLoaded', () => {
    initDragAndDrop();
    initDeadlineAutoRefresh();
    renderTasks();
});