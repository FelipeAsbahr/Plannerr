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
        // Navigation tabs
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

        // Modal backdrop close
        document.getElementById('taskModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeModal();
        });

        // Month filter
        document.getElementById('monthFilter').addEventListener('change', () => {
            this.renderTasksList();
            this.renderDashboard();
        });

        document.getElementById('statusFilter').addEventListener('change', () => {
            this.renderTasksList();
        });

        // Set default month
        const now = new Date();
        const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        document.getElementById('monthFilter').value = currentMonth;
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

    // ===== TASK OPERATIONS =====
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
        this.showToast('✅ Tarefa criada com sucesso!');
    }

    updateTask(id, taskData) {
        const index = this.tasks.findIndex(t => t.id === id);
        if (index !== -1) {
            this.tasks[index] = { ...this.tasks[index], ...taskData };
            this.saveToStorage();
            this.render();
            this.showToast('✅ Tarefa atualizada!');
        }
    }

    deleteTask(id) {
        if (confirm('🗑️ Tem certeza que deseja excluir esta tarefa?')) {
            this.tasks = this.tasks.filter(t => t.id !== id);
            this.saveToStorage();
            this.render();
            this.showToast('🗑️ Tarefa excluída!');
        }
    }

    toggleSubtask(taskId, subtaskIndex) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.subtasks[subtaskIndex]) {
            task.subtasks[subtaskIndex].completed = !task.subtasks[subtaskIndex].completed;
            this.saveToStorage();
            this.render();
        }
    }

    // ===== CALCULATIONS =====
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
        const elapsed = Math.max(0, now - start);
        
        if (totalDuration <= 0) return 0;
        const progress = Math.min((elapsed / totalDuration) * 100, 100);
        return Math.round(progress);
    }

    getStatus(task) {
        const now = new Date();
        const endDate = new Date(task.endDate);
        const progress = this.calculateProgress(task);

        if (progress === 100) return 'completed';
        if (now > endDate && progress < 100) return 'overdue';
        if (progress > 0) return 'in-progress';
        return 'not-started';
    }

    // ===== RENDERING =====
    render() {
        this.renderDashboard();
        this.renderTasksList();
        this.updateStats();
    }

    renderDashboard() {
        const now = new Date();
        const currentTasks = this.tasks.filter(task => {
            const start = new Date(task.startDate);
            const end = new Date(task.endDate);
            return start <= now && end >= now;
        });

        const upcomingTasks = this.tasks.filter(task => {
            const start = new Date(task.startDate);
            const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            return start >= nextMonth && start <= new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0);
        });

        this.renderTasksContainer('tasksCurrent', currentTasks);
        this.renderTasksContainer('tasksUpcoming', upcomingTasks);
    }

    renderTasksContainer(containerId, tasks) {
        const container = document.getElementById(containerId);
        if (!tasks.length) {
            container.innerHTML = '<div style="text-align: center; color: #a0aec0; padding: 40px;"><i class="fas fa-inbox" style="font-size: 3em; margin-bottom: 15px; opacity: 0.5;"></i><p>Nenhuma tarefa encontrada</p></div>';
            return;
        }

        container.innerHTML = tasks.map(task => {
            const status = this.getStatus(task);
            const actualProgress = this.calculateProgress(task);
            const expectedProgress = this.calculateExpectedProgress(task);

            return `
                <div class="task-card ${status}" onclick="taskManager.editTask(${task.id})">
                    <div class="task-header">
                        <div class="task-title">${task.name}</div>
                        <span class="task-status status-${status}">${this.getStatusLabel(status)}</span>
                    </div>
                    <div class="progress-container">
                        <div class="progress-item">
                            <div class="progress-label"><span>Esperado</span><span>${expectedProgress}%</span></div>
                            <div class="progress-bar"><div class="progress-fill progress-expected" style="width: ${expectedProgress}%"></div></div>
                        </div>
                        <div class="progress-item">
                            <div class="progress-label"><span>Atual</span><span>${actualProgress}%</span></div>
                            <div class="progress-bar"><div class="progress-fill progress-actual" style="width: ${actualProgress}%"></div></div>
                        </div>
                    </div>
                    <div class="dates">${new Date(task.startDate).toLocaleDateString('pt-BR')} - ${new Date(task.endDate).toLocaleDateString('pt-BR')}</div>
                </div>
            `;
        }).join('');
    }

    renderTasksList() {
        const container = document.getElementById('tasksList');
        if (!this.tasks.length) {
            container.innerHTML = '<div style="text-align: center; color: #a0aec0; padding: 80px;"><i class="fas fa-tasks" style="font-size: 4em; margin-bottom: 20px; opacity: 0.5;"></i><h3>Comece criando sua primeira tarefa!</h3></div>';
            return;
        }

        const filteredTasks = this.filterTasksForList();
        container.innerHTML = filteredTasks.map(task => this.renderTaskItem(task)).join('');
    }

    renderTaskItem(task) {
        const status = this.getStatus(task);
        const actualProgress = this.calculateProgress(task);
        const expectedProgress = this.calculateExpectedProgress(task);

        return `
            <div class="task-item">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                    <div>
                        <h3 style="color: #2d3748; margin-bottom: 8px;">${task.name}</h3>
                        <span class="task-status status-${status}" style="font-size: 0.9em; padding: 4px 12px;">${this.getStatusLabel(status)}</span>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.9em; color: #718096; margin-bottom: 8px;">
                            ${new Date(task.startDate).toLocaleDateString('pt-BR')} - ${new Date(task.endDate).toLocaleDateString('pt-BR')}
                        </div>
                        <div style="font-size: 0.9em; color: #48bb78; font-weight: 600;">
                            ${actualProgress}% / ${expectedProgress}% esperado
                        </div>
                    </div>
                </div>
                ${task.description ? `<p style="color: #718096; margin-bottom: 20px; padding: 15px; background: #f7fafc; border-radius: 10px;">${task.description}</p>` : ''}
                
                ${task.subtasks?.length ? `
                    <div style="margin-bottom: 25px;">
                        <div style="font-weight: 600; margin-bottom: 12px; color: #4a5568;">📋 Subtarefas (${actualProgress}% concluídas)</div>
                        <div style="max-height: 200px; overflow-y: auto;">
                            ${task.subtasks.map((subtask, index) => `
                                <div style="display: flex; align-items: center; gap: 12px; padding: 12px; margin-bottom: 8px; background: white; border-radius: 8px; border-left: 4px solid ${subtask.completed ? '#48bb78' : '#e2e8f0'};">
                                    <input type="checkbox" ${subtask.completed ? 'checked' : ''} 
                                           onchange="taskManager.toggleSubtask(${task.id}, ${index})"
                                           style="width: 18px; height: 18px; accent-color: #667eea;">
                                    <span style="flex: 1; ${subtask.completed ? 'text-decoration: line-through; color: #a0aec0;' : ''}">
                                        ${subtask.name}
                                    </span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="task-actions">
                    <button class="btn-primary" onclick="taskManager.editTask(${task.id}); event.stopPropagation();" style="padding: 12px 24px;">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-secondary" onclick="taskManager.deleteTask(${task.id}); event.stopPropagation();" style="padding: 12px 24px;">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                </div>
            </div>
        `;
    }

    filterTasksForList() {
        const monthFilter = document.getElementById('monthFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;

        return this.tasks.filter(task => {
            const start = new Date(task.startDate);
            const end = new Date(task.endDate);
            
            let inDateRange = true;
            if (monthFilter) {
                const filterDate = new Date(monthFilter + '-01');
                const monthEnd = new Date(filterDate.getFullYear(), filterDate.getMonth() + 1, 0);
                inDateRange = start <= monthEnd && end >= filterDate;
            }

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

    // ===== MODAL OPERATIONS - SUBTASKS REFEITAS =====
    showAddTaskModal() {
        this.editingTaskId = null;
        document.getElementById('modalTitle').textContent = '📝 Nova Tarefa';
        this.populateForm(null);
        document.getElementById('taskModal').classList.add('active');
    }

    editTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            this.editingTaskId = id;
            document.getElementById('modalTitle').textContent = '✏️ Editar Tarefa';
            this.populateForm(task);
            document.getElementById('taskModal').classList.add('active');
        }
    }

    populateForm(task) {
        // Preencher campos principais
        document.getElementById('taskName').value = task?.name || '';
        document.getElementById('startDate').value = task?.startDate || '';
        document.getElementById('endDate').value = task?.endDate || '';
        document.getElementById('description').value = task?.description || '';
        
        // Renderizar subtasks
        this.renderSubtasksInModal(task?.subtasks || []);
    }

    renderSubtasksInModal(subtasks = []) {
        const container = document.getElementById('subtasksContainer');
        
        if (subtasks.length === 0) {
            container.innerHTML = `
                <div class="subtasks-container empty" onclick="taskManager.addSubtask()">
                    <i class="fas fa-plus-circle" style="font-size: 2.5em; margin-bottom: 10px; color: #cbd5e0;"></i>
                    <p>Clique para adicionar a primeira subtarefa</p>
                    <small>ou use o botão abaixo</small>
                </div>
                <button type="button" class="subtask-add-btn" onclick="taskManager.addSubtask()">
                    <i class="fas fa-plus"></i> Adicionar Subtarefa
                </button>
            `;
            return;
        }

        // Renderizar subtasks existentes + botão adicionar
        container.innerHTML = subtasks.map((subtask, index) => this.renderSubtaskItem(subtask, index)).join('') + `
            <div style="margin-top: 15px;">
                <button type="button" class="subtask-add-btn" onclick="taskManager.addSubtask()">
                    <i class="fas fa-plus"></i> + Nova Subtarefa
                </button>
            </div>
            <div class="subtasks-counter">
                ${subtasks.length} subtarefa${subtasks.length !== 1 ? 's' : ''} adicionada${subtasks.length !== 1 ? 's' : ''}
            </div>
        `;
    }

    renderSubtaskItem(subtask, index) {
        return `
            <div class="subtask-item">
                <input type="checkbox" class="subtask-checkbox" ${subtask.completed ? 'checked' : ''}>
                <input type="text" class="subtask-input ${subtask.completed ? 'completed' : ''}" 
                       value="${subtask.name}" placeholder="Digite o nome da subtarefa"
                       onchange="taskManager.updateSubtaskVisual(this)"
                       onkeyup="taskManager.updateSubtaskVisual(this)">
                <button type="button" class="subtask-delete" onclick="taskManager.removeSubtask(this)">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }

    addSubtask(name = '', completed = false) {
        const container = document.getElementById('subtasksContainer');
        const newSubtaskHtml = this.renderSubtaskItem({name, completed}, 0);
        
        // Se estava vazio, substituir completamente
        if (container.querySelector('.subtasks-container.empty')) {
            container.innerHTML = newSubtaskHtml + `
                <div style="margin-top: 15px;">
                    <button type="button" class="subtask-add-btn" onclick="taskManager.addSubtask()">
                        <i class="fas fa-plus"></i> + Nova Subtarefa
                    </button>
                </div>
            `;
        } else {
            // Inserir antes do botão adicionar
            const addButton = container.querySelector('.subtask-add-btn');
            if (addButton) {
                addButton.insertAdjacentHTML('beforebegin', newSubtaskHtml);
            } else {
                container.insertAdjacentHTML('beforeend', newSubtaskHtml);
            }
        }
        
        // Focar no novo input
        const newInput = container.querySelector('.subtask-input:last-of-type');
        if (newInput) newInput.focus();
    }

    updateSubtaskVisual(input) {
        const item = input.closest('.subtask-item');
        const checkbox = item.querySelector('.subtask-checkbox');
        
        if (checkbox.checked) {
            input.classList.add('completed');
        } else {
            input.classList.remove('completed');
        }
    }

    removeSubtask(button) {
        const subtaskItem = button.closest('.subtask-item');
        subtaskItem.remove();
        
        // Re-renderizar se ficou vazio
        const remaining = document.querySelectorAll('.subtask-item');
        if (remaining.length === 0) {
            this.renderSubtasksInModal([]);
        }
    }

    saveTask() {
        const taskData = {
            name: document.getElementById('taskName').value.trim(),
            startDate: document.getElementById('startDate').value,
            endDate: document.getElementById('endDate').value,
            description: document.getElementById('description').value.trim(),
            subtasks: Array.from(document.querySelectorAll('.subtask-item')).map(item => {
                const checkbox = item.querySelector('.subtask-checkbox');
                const input = item.querySelector('.subtask-input');
                return {
                    name: input.value.trim(),
                    completed: checkbox.checked
                };
            }).filter(s => s.name.length > 0) // Remove vazias
        };

        // Validações
        if (!taskData.name) return this.showToast('❌ Nome da tarefa é obrigatório!', true);
        if (!taskData.startDate || !taskData.endDate) return this.showToast('❌ Datas são obrigatórias!', true);
        if (new Date(taskData.startDate) > new Date(taskData.endDate)) {
            return this.showToast('❌ Data início deve ser anterior à data fim!', true);
        }
        if (taskData.subtasks.length === 0) {
            return this.showToast('❌ Adicione pelo menos uma subtarefa!', true);
        }

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

// Inicialização
let taskManager;
document.addEventListener('DOMContentLoaded', () => {
    taskManager = new TaskManager();
    window.taskManager = taskManager;
});

// Funções globais
window.filterTasks = () => taskManager?.render();
window.showAddTaskModal = () => taskManager?.showAddTaskModal();