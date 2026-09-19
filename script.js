const taskInput = document.getElementById('task-input');
const prioritySelect = document.getElementById('priority-select');
const addTaskBtn = document.getElementById('add-task-btn');
const todoList = document.getElementById('todo-list');
const filterBtns = document.querySelectorAll('.filter-btn');
const emptyState = document.getElementById('empty-state');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const itemsLeft = document.getElementById('items-left');
const clearCompletedBtn = document.getElementById('clear-completed-btn');
const toastContainer = document.getElementById('toast-container');

let currentFilter = 'all';

function showToast(message, icon = 'fa-circle-info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function getTasks() {
    const tasks = localStorage.getItem('tasks');
    return tasks ? JSON.parse(tasks) : [];
}

function saveTasks(tasks) {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function renderTasks() {
    todoList.innerHTML = '';
    const tasks = getTasks();

    const filteredTasks = tasks.filter(task => {
        if (currentFilter === 'pending') return !task.completed;
        if (currentFilter === 'completed') return task.completed;
        return true;
    });

    if (filteredTasks.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        filteredTasks.forEach(task => {
            const item = createTaskElement(task);
            todoList.appendChild(item);
        });
    }

    updateStats(tasks);
}

function createTaskElement(task) {
    const listItem = document.createElement('li');
    listItem.classList.add('task-item');
    if (task.completed) listItem.classList.add('completed');

    listItem.innerHTML = `
        <div class="task-main">
            <button class="toggle-btn" aria-label="Toggle Selesai">
                <i class="${task.completed ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'}"></i>
            </button>
            <span class="task-text">${escapeHTML(task.text)}</span>
            <span class="priority-badge ${task.priority}">${task.priority}</span>
        </div>
        <div class="action-group">
            <button class="delete-btn" aria-label="Hapus Tugas">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </div>
    `;

    const toggleBtn = listItem.querySelector('.toggle-btn');
    toggleBtn.addEventListener('click', () => toggleTaskComplete(task.id));

    const deleteBtn = listItem.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => deleteTask(task.id, listItem));

    const taskTextSpan = listItem.querySelector('.task-text');
    taskTextSpan.addEventListener('dblclick', () => enableTaskEdit(task, taskTextSpan, listItem));

    return listItem;
}

function enableTaskEdit(task, textSpan, listItem) {
    if (task.completed) return;

    const inputEdit = document.createElement('input');
    inputEdit.type = 'text';
    inputEdit.value = task.text;
    inputEdit.className = 'input-group';
    inputEdit.style.padding = '4px 8px';

    textSpan.replaceWith(inputEdit);
    inputEdit.focus();

    const saveEdit = () => {
        const newText = inputEdit.value.trim();
        if (newText && newText !== task.text) {
            updateTaskText(task.id, newText);
            showToast('Tugas diperbarui!', 'fa-pen-to-square');
        } else {
            renderTasks();
        }
    };

    inputEdit.addEventListener('blur', saveEdit);
    inputEdit.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveEdit();
    });
}

function addTask() {
    const text = taskInput.value.trim();
    const priority = prioritySelect.value;

    if (!text) {
        showToast('Tugas tidak boleh kosong!', 'fa-triangle-exclamation');
        return;
    }

    const tasks = getTasks();
    const newTask = {
        id: crypto.randomUUID(),
        text: text,
        priority: priority,
        completed: false
    };

    tasks.push(newTask);
    saveTasks(tasks);

    taskInput.value = '';
    renderTasks();
    showToast('Tugas baru ditambahkan!', 'fa-circle-check');
}

function toggleTaskComplete(id) {
    const tasks = getTasks().map(task => {
        if (task.id === id) {
            return { ...task, completed: !task.completed };
        }
        return task;
    });

    saveTasks(tasks);
    renderTasks();
}

function updateTaskText(id, newText) {
    const tasks = getTasks().map(task => {
        if (task.id === id) {
            return { ...task, text: newText };
        }
        return task;
    });

    saveTasks(tasks);
    renderTasks();
}

function deleteTask(id, listItem) {
    listItem.classList.add('fade-out');
    setTimeout(() => {
        const tasks = getTasks().filter(task => task.id !== id);
        saveTasks(tasks);
        renderTasks();
        showToast('Tugas dihapus!', 'fa-trash-can');
    }, 300);
}

function clearCompletedTasks() {
    const tasks = getTasks();
    const activeTasks = tasks.filter(task => !task.completed);

    if (tasks.length === activeTasks.length) {
        showToast('Tidak ada tugas selesai untuk dibersihkan.', 'fa-circle-info');
        return;
    }

    saveTasks(activeTasks);
    renderTasks();
    showToast('Tugas selesai dibersihkan!', 'fa-broom');
}

function updateStats(tasks) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;

    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${percentage}% Selesai`;
    itemsLeft.textContent = `${pending} tugas tersisa`;
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// Event Listeners
addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        filterBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.filter;
        renderTasks();
    });
});

clearCompletedBtn.addEventListener('click', clearCompletedTasks);
document.addEventListener('DOMContentLoaded', renderTasks);