// CoreTask - Tasks Management

class TasksManager {
    constructor() {
        this.currentFilter = 'all';
        this.currentProject = null;
        this.init();
    }

    init() {
        // Setup form handlers
        this.setupTaskForm();
        this.setupTaskDetailModal();
        
        // Load initial data
        this.loadTasks();
    }

    setupTaskForm() {
        const taskForm = document.getElementById('task-form');
        if (taskForm) {
            taskForm.addEventListener('submit', (e) => this.handleTaskSubmit(e));
        }
    }

    setupTaskDetailModal() {
        const commentForm = document.getElementById('comment-form');
        if (commentForm) {
            commentForm.addEventListener('submit', (e) => this.handleCommentSubmit(e));
        }
    }

    // Load and render tasks
    loadTasks() {
        const tasks = window.storage.getTasks();
        this.renderTasksTable(tasks);
        this.loadTaskForm();
    }

    renderTasksTable(tasks) {
        const tbody = document.getElementById('tasks-table-body');
        if (!tbody) return;

        if (tasks.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        <div class="empty-state">
                            <div class="empty-state-icon">📋</div>
                            <h3>No hay tareas</h3>
                            <p>Crea tu primera tarea para comenzar</p>
                            <button class="btn btn-primary" onclick="openTaskModal()">
                                📋 Nueva Tarea
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = tasks.map(task => {
            const project = window.storage.getProjectById(task.projectId);
            const assignee = window.storage.getUserById(task.assigneeId);
            
            return `
                <tr>
                    <td>
                        <span class="font-medium">TASK-${task.id}</span>
                    </td>
                    <td>
                        <div class="task-info">
                            <h4>${this.escapeHtml(task.title)}</h4>
                            ${task.description ? `<p>${this.escapeHtml(task.description.substring(0, 50))}${task.description.length > 50 ? '...' : ''}</p>` : ''}
                        </div>
                    </td>
                    <td>
                        ${project ? `<span class="text-sm">${this.escapeHtml(project.name)}</span>` : '<span class="text-gray-400">Sin proyecto</span>'}
                    </td>
                    <td>
                        ${assignee ? `<span class="text-sm">${this.escapeHtml(assignee.name)}</span>` : '<span class="text-gray-400">Sin asignar</span>'}
                    </td>
                    <td>
                        <select class="form-select status-select" data-task-id="${task.id}" onchange="changeTaskStatus(${task.id}, this.value)">
                            <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>Por hacer</option>
                            <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>En progreso</option>
                            <option value="review" ${task.status === 'review' ? 'selected' : ''}>En revisión</option>
                            <option value="done" ${task.status === 'done' ? 'selected' : ''}>Completada</option>
                        </select>
                    </td>
                    <td>
                        <span class="status-badge priority-${task.priority}">
                            ${this.getPriorityIcon(task.priority)} ${this.getPriorityText(task.priority)}
                        </span>
                    </td>
                    <td>
                        ${task.dueDate ? `
                            <span class="text-sm ${this.isOverdue(task.dueDate, task.status) ? 'text-danger' : ''}">
                                ${this.formatDate(task.dueDate)}
                            </span>
                        ` : '<span class="text-gray-400">Sin fecha</span>'}
                    </td>
                    <td>
                        <div class="task-actions">
                            <button class="btn btn-sm btn-secondary" onclick="viewTask(${task.id})" title="Ver detalles">
                                👁️
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="editTask(${task.id})" title="Editar">
                                ✏️
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteTask(${task.id})" title="Eliminar">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    loadTaskForm() {
        // Load projects for select
        const projects = window.storage.getProjects();
        const projectSelect = document.getElementById('task-project');
        
        if (projectSelect) {
            projectSelect.innerHTML = '<option value="">Seleccionar proyecto</option>' +
                projects.map(project => 
                    `<option value="${project.id}">${this.escapeHtml(project.name)}</option>`
                ).join('');
        }

        // Load users for assignment
        const users = window.storage.getUsers();
        const assigneeSelect = document.getElementById('task-assignee');
        
        if (assigneeSelect) {
            assigneeSelect.innerHTML = '<option value="">Sin asignar</option>' +
                users.map(user => 
                    `<option value="${user.id}">${this.escapeHtml(user.name)}</option>`
                ).join('');
        }
    }

    // Task form submission
    async handleTaskSubmit(event) {
        event.preventDefault();
        
        const form = event.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const isEdit = form.dataset.editId;
        
        // Show loading
        this.setFormLoading(submitBtn, true);
        
        try {
            const taskData = {
                title: document.getElementById('task-title').value.trim(),
                description: document.getElementById('task-description').value.trim(),
                projectId: parseInt(document.getElementById('task-project').value) || null,
                assigneeId: parseInt(document.getElementById('task-assignee').value) || null,
                priority: document.getElementById('task-priority').value,
                type: document.getElementById('task-type').value,
                dueDate: document.getElementById('task-due-date').value || null,
                estimatedHours: parseFloat(document.getElementById('task-estimated-hours').value) || null,
                status: 'todo'
            };

            // Validation
            if (!taskData.title) {
                throw new Error('El título de la tarea es requerido');
            }

            if (!taskData.projectId) {
                throw new Error('Debes seleccionar un proyecto');
            }

            let task;
            if (isEdit) {
                // Update existing task
                task = window.storage.updateTask(parseInt(isEdit), taskData);
                if (!task) {
                    throw new Error('Error al actualizar la tarea');
                }

                // Log activity
                window.storage.logActivity(
                    window.auth.getUserId(),
                    'updated',
                    'task',
                    `Tarea "${task.title}" actualizada`
                );

                window.auth.showNotification('Tarea actualizada exitosamente', 'success');
            } else {
                // Create new task
                taskData.createdBy = window.auth.getUserId();
                task = window.storage.createTask(taskData);

                // Log activity
                window.storage.logActivity(
                    window.auth.getUserId(),
                    'created',
                    'task',
                    `Tarea "${task.title}" creada`
                );

                // Send Discord notification
                this.sendDiscordNotification('task_created', {
                    task: task,
                    user: window.auth.getCurrentUser()
                });

                window.auth.showNotification('Tarea creada exitosamente', 'success');
            }

            // Refresh displays
            this.loadTasks();
            if (window.app) {
                window.app.updateDashboard();
            }

            // Close modal
            this.closeModal('task-modal');

        } catch (error) {
            window.auth.showNotification(error.message, 'error');
        } finally {
            this.setFormLoading(submitBtn, false);
        }
    }

    // Task actions
    viewTask(taskId) {
        const task = window.storage.getTaskById(taskId);
        if (!task) return;

        const project = window.storage.getProjectById(task.projectId);
        const assignee = window.storage.getUserById(task.assigneeId);
        const creator = window.storage.getUserById(task.createdBy);

        // Fill modal with task data
        document.getElementById('task-detail-title').textContent = `Tarea TASK-${task.id}`;
        document.getElementById('task-detail-name').textContent = task.title;
        document.getElementById('task-detail-description').textContent = task.description || 'Sin descripción';
        
        // Update badges
        document.getElementById('task-detail-status').textContent = this.getStatusText(task.status);
        document.getElementById('task-detail-status').className = `status-badge status-${task.status}`;
        
        document.getElementById('task-detail-priority').textContent = this.getPriorityText(task.priority);
        document.getElementById('task-detail-priority').className = `status-badge priority-${task.priority}`;
        
        document.getElementById('task-detail-type').textContent = this.getTypeText(task.type);
        document.getElementById('task-detail-type').className = `status-badge`;

        // Fill sidebar info
        document.getElementById('task-detail-id').textContent = `TASK-${task.id}`;
        document.getElementById('task-detail-project').textContent = project ? project.name : 'Sin proyecto';
        document.getElementById('task-detail-assignee').textContent = assignee ? assignee.name : 'Sin asignar';
        document.getElementById('task-detail-creator').textContent = creator ? creator.name : 'Usuario';
        document.getElementById('task-detail-due-date').textContent = task.dueDate ? this.formatDate(task.dueDate) : 'Sin fecha';
        document.getElementById('task-detail-estimated-hours').textContent = task.estimatedHours ? `${task.estimatedHours}h` : '-';
        document.getElementById('task-detail-created').textContent = this.formatDateTime(task.createdAt);
        document.getElementById('task-detail-updated').textContent = this.formatDateTime(task.updatedAt);

        // Store current task ID for actions
        const modal = document.getElementById('task-detail-modal');
        modal.dataset.taskId = taskId;

        // Show modal
        modal.classList.add('active');
    }

    editTask(taskId) {
        const task = window.storage.getTaskById(taskId);
        if (!task) {
            window.auth.showNotification('Tarea no encontrada', 'error');
            return;
        }

        if (!window.auth.canEditTask(task)) {
            window.auth.showNotification('No tienes permisos para editar esta tarea', 'error');
            return;
        }

        // Fill form with task data
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-project').value = task.projectId || '';
        document.getElementById('task-assignee').value = task.assigneeId || '';
        document.getElementById('task-priority').value = task.priority;
        document.getElementById('task-type').value = task.type;
        document.getElementById('task-due-date').value = task.dueDate || '';
        document.getElementById('task-estimated-hours').value = task.estimatedHours || '';

        // Set edit mode
        const form = document.getElementById('task-form');
        const modal = document.getElementById('task-modal');
        const title = document.getElementById('task-modal-title');
        const submitText = document.getElementById('task-submit-text');

        form.dataset.editId = taskId;
        title.textContent = 'Editar Tarea';
        submitText.textContent = 'Actualizar Tarea';

        // Show modal
        modal.classList.add('active');
    }

    async deleteTask(taskId) {
        const task = window.storage.getTaskById(taskId);
        if (!task) {
            window.auth.showNotification('Tarea no encontrada', 'error');
            return;
        }

        if (!window.auth.canEditTask(task)) {
            window.auth.showNotification('No tienes permisos para eliminar esta tarea', 'error');
            return;
        }

        if (!confirm(`¿Estás seguro de que quieres eliminar la tarea "${task.title}"?`)) {
            return;
        }

        try {
            const success = window.storage.deleteTask(taskId);
            if (success) {
                // Log activity
                window.storage.logActivity(
                    window.auth.getUserId(),
                    'deleted',
                    'task',
                    `Tarea "${task.title}" eliminada`
                );

                window.auth.showNotification('Tarea eliminada exitosamente', 'success');
                
                // Refresh displays
                this.loadTasks();
                if (window.app) {
                    window.app.updateDashboard();
                }
            } else {
                throw new Error('Error al eliminar la tarea');
            }
        } catch (error) {
            window.auth.showNotification(error.message, 'error');
        }
    }

    changeTaskStatus(taskId, newStatus) {
        const task = window.storage.getTaskById(taskId);
        if (!task) return;

        if (!window.auth.canEditTask(task)) {
            window.auth.showNotification('No tienes permisos para cambiar el estado de esta tarea', 'error');
            return;
        }

        const oldStatus = task.status;
        const updatedTask = window.storage.updateTask(taskId, { status: newStatus });

        if (updatedTask) {
            // Log activity
            window.storage.logActivity(
                window.auth.getUserId(),
                'updated',
                'task',
                `Tarea "${task.title}" cambió de ${this.getStatusText(oldStatus)} a ${this.getStatusText(newStatus)}`
            );

            // Send Discord notification for completed tasks
            if (newStatus === 'done') {
                this.sendDiscordNotification('task_completed', {
                    task: updatedTask,
                    user: window.auth.getCurrentUser()
                });
            }

            // Refresh displays
            if (window.app) {
                window.app.updateDashboard();
            }

            window.auth.showNotification('Estado de tarea actualizado', 'success');
        }
    }

    // Comments handling
    async handleCommentSubmit(event) {
        event.preventDefault();
        
        const commentText = document.getElementById('comment-text').value.trim();
        if (!commentText) return;

        const modal = document.getElementById('task-detail-modal');
        const taskId = parseInt(modal.dataset.taskId);
        
        if (!taskId) return;

        try {
            // In a real app, you'd save comments to the task
            // For now, we'll just simulate it
            const comment = {
                id: Date.now(),
                text: commentText,
                author: window.auth.getCurrentUser().name,
                createdAt: new Date().toISOString()
            };

            // Add comment to task (this would be in storage in a real app)
            this.addCommentToTask(taskId, comment);

            // Clear form
            document.getElementById('comment-text').value = '';

            // Refresh comments
            this.loadTaskComments(taskId);

            window.auth.showNotification('Comentario añadido', 'success');

        } catch (error) {
            window.auth.showNotification('Error al añadir comentario', 'error');
        }
    }

    addCommentToTask(taskId, comment) {
        // Get current task
        const task = window.storage.getTaskById(taskId);
        if (!task) return;

        // Initialize comments array if it doesn't exist
        if (!task.comments) {
            task.comments = [];
        }

        // Add comment
        task.comments.push(comment);

        // Update task
        window.storage.updateTask(taskId, { comments: task.comments });
    }

    loadTaskComments(taskId) {
        const task = window.storage.getTaskById(taskId);
        const container = document.getElementById('task-comments-list');
        
        if (!container || !task) return;

        const comments = task.comments || [];

        if (comments.length === 0) {
            container.innerHTML = '<p class="text-gray-400 text-sm">No hay comentarios</p>';
            return;
        }

        container.innerHTML = comments.map(comment => `
            <div class="comment-item">
                <div class="comment-header">
                    <span class="comment-author">${this.escapeHtml(comment.author)}</span>
                    <span class="comment-time">${this.getTimeAgo(comment.createdAt)}</span>
                </div>
                <div class="comment-text">${this.escapeHtml(comment.text)}</div>
            </div>
        `).join('');
    }

    // Modal handling
    openTaskModal() {
        if (!window.auth.isLoggedIn()) return;

        // Reset form
        const form = document.getElementById('task-form');
        const modal = document.getElementById('task-modal');

        form.reset();
        delete form.dataset.editId;
        document.getElementById('task-modal-title').textContent = 'Nueva Tarea';
        document.getElementById('task-submit-text').textContent = 'Crear Tarea';

        // Load form data
        this.loadTaskForm();

        // Show modal
        modal.classList.add('active');

        // Focus on title field
        setTimeout(() => {
            document.getElementById('task-title').focus();
        }, 100);
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // Discord notifications
    async sendDiscordNotification(eventType, data) {
        try {
            const config = window.storage.getConfig('discord_settings');
            if (!config || !config.webhookUrl || !config.events[eventType]) {
                return; // Discord not configured or event not enabled
            }

            const embed = this.createTaskDiscordEmbed(data.task, eventType, data.user);
            
            const response = await fetch(config.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(embed)
            });

            if (response.ok) {
                console.log('Discord notification sent:', eventType);
            } else {
                console.error('Discord notification failed:', response.status);
            }
        } catch (error) {
            console.error('Discord notification error:', error);
        }
    }

    createTaskDiscordEmbed(task, action, user) {
        const colors = {
            task_created: 0x28a745,
            task_updated: 0x007bff,
            task_completed: 0x6f42c1,
            task_assigned: 0xffc107
        };

        const actionEmojis = {
            task_created: '📋',
            task_updated: '✏️',
            task_completed: '✅',
            task_assigned: '👤'
        };

        const actionTexts = {
            task_created: 'Nueva Tarea Creada',
            task_updated: 'Tarea Actualizada',
            task_completed: 'Tarea Completada',
            task_assigned: 'Tarea Asignada'
        };

        const project = window.storage.getProjectById(task.projectId);
        const assignee = window.storage.getUserById(task.assigneeId);

        return {
            embeds: [{
                title: `${actionEmojis[action]} ${actionTexts[action]}`,
                description: `**${task.title}**\n${task.description || 'Sin descripción'}`,
                color: colors[action] || 0x000000,
                fields: [
                    {
                        name: 'Proyecto',
                        value: project ? project.name : 'Sin proyecto',
                        inline: true
                    },
                    {
                        name: 'Asignado a',
                        value: assignee ? assignee.name : 'Sin asignar',
                        inline: true
                    },
                    {
                        name: 'Estado',
                        value: this.getStatusText(task.status),
                        inline: true
                    },
                    {
                        name: 'Prioridad',
                        value: this.getPriorityText(task.priority),
                        inline: true
                    },
                    {
                        name: 'Tipo',
                        value: this.getTypeText(task.type),
                        inline: true
                    },
                    {
                        name: 'ID',
                        value: `TASK-${task.id}`,
                        inline: true
                    }
                ],
                footer: {
                    text: `Por ${user.name} • CoreTask`,
                    icon_url: 'https://cdn.jsdelivr.net/npm/heroicons@1.0.6/outline/clipboard-list.svg'
                },
                timestamp: new Date().toISOString()
            }]
        };
    }

    // Search and filtering
    searchTasks() {
        const query = document.getElementById('task-search').value.trim();
        if (query.length === 0) {
            this.loadTasks();
            return;
        }
        
        const tasks = window.storage.searchTasks(query);
        this.renderTasksTable(tasks);
    }

    filterTasks(filter) {
        this.currentFilter = filter;
        
        let tasks = window.storage.getTasks();
        
        switch (filter) {
            case 'all':
                // Show all tasks
                break;
            case 'assigned':
                tasks = tasks.filter(t => t.assigneeId === window.auth.getUserId());
                break;
            case 'todo':
                tasks = tasks.filter(t => t.status === 'todo');
                break;
            case 'in_progress':
                tasks = tasks.filter(t => t.status === 'in_progress');
                break;
            case 'done':
                tasks = tasks.filter(t => t.status === 'done');
                break;
        }
        
        this.renderTasksTable(tasks);
    }

    filterTasksByProject(projectId) {
        this.currentProject = projectId;
        const tasks = window.storage.getTasksByProject(projectId);
        this.renderTasksTable(tasks);
    }

    // Utility methods
    setFormLoading(button, loading) {
        if (loading) {
            button.disabled = true;
            const spinner = button.querySelector('.spinner') || this.createSpinner();
            const text = button.querySelector('span');
            if (text) text.classList.add('hidden');
            if (!button.querySelector('.spinner')) {
                button.appendChild(spinner);
            }
            spinner.classList.remove('hidden');
        } else {
            button.disabled = false;
            const spinner = button.querySelector('.spinner');
            const text = button.querySelector('span');
            if (text) text.classList.remove('hidden');
            if (spinner) spinner.classList.add('hidden');
        }
    }

    createSpinner() {
        const spinner = document.createElement('div');
        spinner.className = 'spinner hidden';
        return spinner;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    formatDateTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString();
    }

    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Ahora mismo';
        if (minutes < 60) return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
        if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
        return `Hace ${days} día${days > 1 ? 's' : ''}`;
    }

    isOverdue(dueDate, status) {
        if (!dueDate || status === 'done') return false;
        return new Date(dueDate) < new Date();
    }

    getPriorityIcon(priority) {
        const icons = {
            low: '🟢',
            medium: '🟡',
            high: '🟠',
            critical: '🔴'
        };
        return icons[priority] || '⚪';
    }

    getPriorityText(priority) {
        const texts = {
            low: 'Baja',
            medium: 'Media',
            high: 'Alta',
            critical: 'Crítica'
        };
        return texts[priority] || priority;
    }

    getStatusText(status) {
        const texts = {
            todo: 'Por hacer',
            in_progress: 'En progreso',
            review: 'En revisión',
            done: 'Completada'
        };
        return texts[status] || status;
    }

    getTypeText(type) {
        const texts = {
            task: 'Tarea',
            bug: 'Error',
            feature: 'Funcionalidad',
            epic: 'Épica'
        };
        return texts[type] || type;
    }
}

// Global functions for easy access
window.openTaskModal = function() {
    if (window.tasks) {
        window.tasks.openTaskModal();
    }
};

window.viewTask = function(taskId) {
    if (window.tasks) {
        window.tasks.viewTask(taskId);
    }
};

window.editTask = function(taskId) {
    if (window.tasks) {
        window.tasks.editTask(taskId);
    }
};

window.deleteTask = function(taskId) {
    if (window.tasks) {
        window.tasks.deleteTask(taskId);
    }
};

window.changeTaskStatus = function(taskId, newStatus) {
    if (window.tasks) {
        window.tasks.changeTaskStatus(taskId, newStatus);
    }
};

window.editTaskFromDetail = function() {
    const modal = document.getElementById('task-detail-modal');
    const taskId = parseInt(modal.dataset.taskId);
    if (taskId && window.tasks) {
        window.tasks.closeModal('task-detail-modal');
        window.tasks.editTask(taskId);
    }
};

window.deleteTaskFromDetail = function() {
    const modal = document.getElementById('task-detail-modal');
    const taskId = parseInt(modal.dataset.taskId);
    if (taskId && window.tasks) {
        window.tasks.closeModal('task-detail-modal');
        window.tasks.deleteTask(taskId);
    }
};

window.changeTaskStatusFromDetail = function() {
    // Implementation for status change from detail modal
    console.log('Change status from detail modal');
};

window.filterTasksTable = function() {
    const filter = document.getElementById('task-filter').value;
    if (window.tasks) {
        window.tasks.filterTasks(filter);
    }
};

window.searchTasks = function() {
    if (window.tasks) {
        window.tasks.searchTasks();
    }
};

// Initialize tasks manager
window.tasks = new TasksManager();

console.log('📋 Tasks management initialized');
