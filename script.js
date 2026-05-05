class TaskManager {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        this.editingTaskId = null;
        this.init();
    }

    init() {
        this.render();
        this.bindEvents();
        this.updateStats();
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
                document.getElementById(e.target.dataset.tab).classList.add('active');
            });
        });

        // Form submission
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTask();
        });

        // Month filter default to current month
        document.getElementById('monthFilter').valueAsDate = new Date();
    }

    saveToStorage() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    showToast(message, isError = false) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${isError ? 'error' : ''} show`;
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // Task CRUD
    addTask(taskData) {
        const task = {
            id: Date.now(),
            ...taskData,
            subtasks: taskData.subtasks || [],
            createdAt: new Date().toISOString()
        };
        this.tasks.push(task);
        this.saveToStorage();
        this.render();
        this.showToast('Tarefa criada com sucesso!');
    }

    updateTask(id, taskData) {
        const index = this.tasks.findIndex(t => t.id === id);
        if (index !== -1) {
            this.tasks[index] = { ...this.tasks[index], ...taskData };
            this.saveToStorage();
            this.render();
            this.showToast('Tarefa atualizada com sucesso!');
        }
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.saveToStorage();
        this.render();
        this.showToast('Tarefa excluída!');
    }

    toggleSubtask(taskId, subtaskIndex) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.subtasks[subtaskIndex]) {
            task.subtasks[subtaskIndex].completed = !task.subtasks[subtaskIndex].completed;
            this.saveToStorage();
            this.render();
        }
    }

    // Calculations
    calculateProgress(task) {
        if (!task.subtasks?.length) return 0;
        const completed = task.subtasks.filter(s => s.completed).length;
        return Math.round((completed / task.subtasks.length) * 100);
    }

    calculateExpectedProgress(task) {
        const now = new Date();
        const start = new Date(task.startDate);
        const end = new Date(task.endDate);
        
        const totalDuration = end - start;
        const elapsed = now - start;
        
        if (totalDuration <= 0 || elapsed <= 0) return 0;
        
        const progress = Math.min((elapsed / totalDuration) * 100, 100);
        return Math.round(progress);
    }

    getStatus(task) {
        const now = new Date();
        const endDate = new Date(task.endDate);
        const progress = this.calculateProgress(task);
        const expectedProgress = this.calculateExpectedProgress(task);

        if (progress === 100) return 'completed';
        if (now > endDate && progress < 100) return 'overdue';
        if (progress > 0) return 'in-progress';
        return 'not-started';
    }

    // Rendering
    render() {
        this.renderDashboard();
        this.renderTasksList();
        this.updateStats();
    }

    renderDashboard() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        const currentTasks = this.tasks.filter(task => {
            const start = new Date(task.startDate);
            const end = new Date(task.endDate);
            return start <= now && end >= now;
        });

        const upcomingTasks = this.tasks.filter(task => {
            const start = new Date(task.startDate);
            return start >= nextMonth && start <= new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0);
        });

        this.renderTasksContainer('tasksCurrent', currentTasks);
        this.renderTasksContainer('tasksUpcoming', upcomingTasks);
    }

    renderTasksContainer(containerId, tasks) {
        const container = document.getElementById(containerId);
        if (!tasks.length) {
            container.innerHTML = '<p style="text-align: center; color: #a0aec0; padding: 40px;">Nenhuma tarefa encontrada</p>';
            return;
        }

        container.innerHTML = tasks.map(task => {
            const status = this.getStatus(task);
            const actualProgress = this.calculateProgress(task);
            const expectedProgress = this.calculateExpectedProgress(task);
            const startDate = new Date(task.startDate).toLocaleDateString('pt-BR');
            const endDate = new Date(task.endDate).toLocaleDateString('pt-BR');

            return `
                <div class="task-card ${status}" onclick="taskManager.editTask(${task.id})">
                    <div class="task-header">
                        <div class="task-title">${task.name}</div>
                        <span class="task-status status-${status}">
                            ${this.getStatusLabel(status)}
                        </span>
                    </div>
                    <div class="progress-container">
                        <div class="progress-item">
                            <div class="progress-label">
                                <span>Esperado</span>
                                <span>${expectedProgress}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill progress-expected" style="width: ${expectedProgress}%"></div>
                            </div>
                        </div>
                        <div class="progress-item">
                            <div class="progress-label">
                                <span>Atual</span>
                                <span>${actualProgress}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill progress-actual" style="width: ${actualProgress}%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="dates">
                        ${startDate} - ${endDate}
                    </div>
                    ${task.description ? `<p style="margin-top: 10px; color: #718096;">${task.description}</p>` : ''}
                </div>
            `;
        }).join('');
    }

    renderTasksList() {
        const container = document.getElementById('tasksList');
        if (!this.tasks.length) {
            container.innerHTML = '<p style="text-align: center; color: #a0aec0; padding: 60px;">Nenhuma tarefa cadastrada. Crie sua primeira tarefa!</p>';
            return;
        }

        const filteredTasks = this.filterTasksForList();
        container.innerHTML = filteredTasks.map(task => {
            const status = this.getStatus(task);
            const actualProgress = this.calculateProgress(task);
            const expectedProgress = this.calculateExpectedProgress(task);

            return `
                <div class="task-item">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                        <div>
                            <h3 style="color: #2d3748; margin-bottom: 5px;">${task.name}</h3>
                            <span class="task-status status-${status}">${this.getStatusLabel(status)}</span>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 0.9em; color: #718096; margin-bottom: 5px;">
                                ${new Date(task.startDate).toLocaleDateString('pt-BR')} - ${new Date(task.endDate).toLocaleDateString('pt-BR')}
                            </div>
                            <div style="font-size: 0.85em; color: #718096;">
                                Progresso: ${actualProgress}% / ${expectedProgress}% esperado
                            </div>
                        </div>
                    </div>
                    ${task.description ? `<p style="color: #718096; margin-bottom: 15px;">${task.description}</p>` : ''}
                    
                    ${task.subtasks?.length ? `
                        <div style="margin-top: 15px;">
                            <strong>Subtarefas (${actualProgress}% concluídas):</strong>
                            <div style="margin-top: 10px;">
                                ${task.subtasks.map((subtask, index) => `
                                    <div style="display: flex; align-items: center; gap: 10px; padding: 8px 0;">
                                        <input type="checkbox" ${subtask.completed ? 'checked' : ''} 
                                               onchange="taskManager.toggleSubtask(${task.id}, ${index})">
                                        <span style="flex: 1; ${subtask.completed ? 'text-decoration: line-through; color: #a0aec0;' : ''}">
                                            ${subtask.name}
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="task-actions">
                        <button class="btn-primary" onclick="taskManager.editTask(${task.id})" style="padding: 8px 16px; font-size: 0.9em;">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn-secondary" onclick="taskManager.deleteTask(${task.id})" style="padding: 8px 16px; font-size: 0.9em;">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    filterTasksForList() {
        const monthFilter = document.getElementById('monthFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;

        return this.tasks.filter(task => {
            const start = new Date(task.startDate);
            const end = new Date(task.endDate);
            const filterDate = monthFilter ? new Date(monthFilter + '-01') : new Date();

            const inDateRange = !monthFilter || 
                (start <= new Date(filterDate.getFullYear(), filterDate.getMonth() + 1, 0) &&
                 end >= new Date(filterDate.getFullYear(), filterDate.getMonth(), 1));

            const statusMatch = !statusFilter || this.getStatus(task) === statusFilter;

            return inDateRange && statusMatch;
        });
    }

    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => this.calculateProgress(t) === 100).length;
        const overdue = this.tasks.filter(t => this.getStatus(t) === 'overdue').length;
        const avgProgress = Math.round(
            this.tasks.reduce((sum, t) => sum + this.calculateProgress(t), 0) / Math.max(total, 1)
        );

        document.getElementById('totalTasks').textContent = total;
        document.getElementById('completedTasks').textContent = completed;
        document.getElementById('overdueTasks').textContent = overdue;
        document.getElementById('avgProgress').textContent = avgProgress + '%';
    }

    // Modal Management
    showAddTaskModal() {
        this.editingTaskId = null;
        document.getElementById('modalTitle').textContent = 'Nova Tarefa';
        this.populateForm(null);
        document.getElementById('taskModal').classList.add('active');
    }

    editTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            this.editingTaskId = id;
            document.getElementById('modalTitle').textContent = 'Editar Tarefa';
            this.populateForm(task);
            document.getElementById('taskModal').classList.add('active');
        }
    }

    populateForm(task) {
        document.getElementById('taskName').value = task?.name || '';
        document.getElementById('startDate').value = task?.startDate || '';
        document.getElementById('endDate').value = task?.endDate || '';
        document.getElementById('description').value = task?.description || '';
        
        const container = document.getElementById('subtasksContainer');
        container.innerHTML = '';
        
        if (task?.subtasks) {
            task.subtasks.forEach((subtask, index) => {
                this.addSubtask(subtask.name, subtask.completed);
            });
        } else {
            this.addSubtask();
        }
    }

    saveTask() {
        const taskData = {
            name: document.getElementById('taskName').value,
            startDate: document.getElementById('startDate').value,
            endDate: document.getElementById('endDate').value,
            description: document.getElementById('description').value,
            subtasks: Array.from(document.querySelectorAll('.subtask-input'))
                .map(input => ({
                    name: input.value,
                    completed: input.closest('.subtask-item').querySelector('.subtask-checkbox').checked
                })).filter(s => s.name.trim())
        };

        if (this.editingTaskId) {
            this.updateTask(this.editingTaskId, taskData);
        } else {
            this.addTask(taskData);
        }

        this.closeModal();
    }

    closeModal() {
        document.getElementById('taskModal').classList.remove('active');
    }

    addSubtask(name = '', completed = false) {
        const container = document.getElementById('subtasksContainer');
        const subtaskId = Date.now();
        container.insertAdjacentHTML('beforeend', `
            <div class="subtask-item">
                <input type="checkbox" class="subtask-checkbox" ${completed ? 'checked' : ''}>
                <input type="text" class="subtask-input" value="${name}" placeholder="Nome da subtarefa">
                <button type="button" class="subtask-delete" onclick="taskManager.removeSubtask(this)">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `);
    }

    removeSubtask(button) {
        button.closest('.subtask-item').remove();
    }

    getStatusLabel(status) {
        const labels = {
            'not-started': 'Não Iniciada',
            'in-progress': 'Em Andamento',
            'completed': 'Concluída',
            'overdue': 'Atrasada'
        };
        return labels[status] || status;
    }
}

// Global functions for onclick handlers
const taskManager = new TaskManager();

function filterTasks() {
    taskManager.renderTasksList();
    taskManager.renderDashboard();
}

function showAddTaskModal() {
    taskManager.showAddTaskModal();
}