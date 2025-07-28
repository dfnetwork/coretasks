                user = window.storage.createUser(userData);

                window.storage.logActivity(
                    window.auth.getUserId(),
                    'created',
                    'user',
                    `Usuario "${user.name}" creado`
                );

                window.auth.showNotification('Usuario creado exitosamente', 'success');
            }

            // Refresh displays
            this.loadAdmin();
            
            // Close modal
            this.closeModal('user-modal');

        } catch (error) {
            window.auth.showNotification(error.message, 'error');
        } finally {
            this.setFormLoading(submitBtn, false);
        }
    }

    // Integrations
    loadIntegrations() {
        this.loadDiscordConfig();
        this.loadEmailConfig();
    }

    loadDiscordConfig() {
        const config = window.storage.getConfig('discord_settings', {});
        
        // Fill form with current config
        document.getElementById('discord-webhook').value = config.webhookUrl || '';
        document.getElementById('discord-channel').value = config.defaultChannel || '#general';
        
        // Set event checkboxes
        const events = config.events || {};
        document.getElementById('discord-task-created').checked = events.taskCreated || false;
        document.getElementById('discord-task-assigned').checked = events.taskAssigned || false;
        document.getElementById('discord-task-completed').checked = events.taskCompleted || false;
        document.getElementById('discord-project-created').checked = events.projectCreated || false;
        
        // Update status
        const statusElement = document.getElementById('discord-status');
        if (config.webhookUrl) {
            statusElement.innerHTML = '<span class="status-dot status-online"></span> Conectado';
        } else {
            statusElement.innerHTML = '<span class="status-dot status-offline"></span> Desconectado';
        }

        // Setup form handler
        const discordForm = document.getElementById('discord-form');
        if (discordForm) {
            discordForm.onsubmit = (e) => this.handleDiscordConfig(e);
        }
    }

    loadEmailConfig() {
        // For static hosting, email is simulated
        const statusElement = document.getElementById('email-status');
        statusElement.innerHTML = '<span class="status-dot status-online"></span> Simulado';
    }

    async handleDiscordConfig(event) {
        event.preventDefault();
        
        const webhookUrl = document.getElementById('discord-webhook').value.trim();
        const defaultChannel = document.getElementById('discord-channel').value.trim();
        
        const events = {
            taskCreated: document.getElementById('discord-task-created').checked,
            taskAssigned: document.getElementById('discord-task-assigned').checked,
            taskCompleted: document.getElementById('discord-task-completed').checked,
            projectCreated: document.getElementById('discord-project-created').checked
        };

        if (!webhookUrl) {
            window.auth.showNotification('URL de webhook es requerida', 'error');
            return;
        }

        if (!webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
            window.auth.showNotification('URL de webhook de Discord inválida', 'error');
            return;
        }

        const config = {
            webhookUrl,
            defaultChannel: defaultChannel || '#general',
            events,
            updatedAt: new Date().toISOString(),
            updatedBy: window.auth.getUserId()
        };

        // Save configuration
        window.storage.setConfig('discord_settings', config);

        // Log activity
        window.storage.logActivity(
            window.auth.getUserId(),
            'updated',
            'config',
            'Configuración de Discord actualizada'
        );

        window.auth.showNotification('Configuración de Discord guardada exitosamente', 'success');
        
        // Update status
        this.loadDiscordConfig();
    }

    // Admin
    loadAdmin() {
        if (!window.auth.isAdmin()) {
            window.auth.showNotification('Acceso denegado', 'error');
            return;
        }

        this.loadUsers();
        this.loadSystemLogs();
    }

    loadUsers() {
        const users = window.storage.getUsers();
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.email}</td>
                <td>${user.name}</td>
                <td><span class="status-badge status-${user.role}">${this.getRoleText(user.role)}</span></td>
                <td><span class="status-badge status-${user.status === 'active' ? 'done' : 'todo'}">${user.status === 'active' ? 'Activo' : 'Inactivo'}</span></td>
                <td>
                    <div class="user-actions">
                        <button class="btn btn-sm btn-secondary" onclick="editUser(${user.id})" title="Editar">
                            ✏️
                        </button>
                        ${user.id !== window.auth.getUserId() ? `
                            <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})" title="Eliminar">
                                🗑️
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    loadSystemLogs() {
        const logs = window.storage.getActivityLogs().slice(0, 50);
        const container = document.getElementById('system-logs');
        if (!container) return;

        if (logs.length === 0) {
            container.innerHTML = '<div class="log-entry">No hay logs del sistema</div>';
            return;
        }

        container.innerHTML = logs.map(log => {
            const user = window.storage.getUserById(log.userId);
            const timestamp = new Date(log.createdAt).toLocaleString();
            
            return `
                <div class="log-entry">
                    <span class="log-timestamp">[${timestamp}]</span>
                    <span class="log-level ${log.action}">[${log.action.toUpperCase()}]</span>
                    <span class="log-user">${user ? user.name : 'Sistema'}:</span>
                    <span class="log-message">${log.description}</span>
                </div>
            `;
        }).join('');

        // Auto scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    // Filtering and Search
    filterTasks(filter) {
        let tasks = window.storage.getTasks();
        
        // Update active filter in sidebar
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
        });
        event.target.classList.add('active');
        
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
        
        this.currentFilter = filter;
        this.renderTasksTable(tasks);
    }

    filterTasksByProject(projectId) {
        const tasks = window.storage.getTasksByProject(projectId);
        this.renderTasksTable(tasks);
        
        // Update filter indication
        const project = window.storage.getProjectById(projectId);
        if (project) {
            window.auth.showNotification(`Mostrando tareas del proyecto: ${project.name}`, 'info');
        }
    }

    searchTasks() {
        const query = document.getElementById('task-search').value.trim();
        if (query.length === 0) {
            this.loadTasks();
            return;
        }
        
        const tasks = window.storage.searchTasks(query);
        this.renderTasksTable(tasks);
    }

    // Discord Notifications
    async sendTaskDiscordNotification(eventType, task) {
        try {
            const config = window.storage.getConfig('discord_settings');
            if (!config || !config.webhookUrl || !config.events[eventType]) {
                return;
            }

            const project = window.storage.getProjectById(task.projectId);
            const assignee = window.storage.getUserById(task.assigneeId);
            const user = window.auth.getCurrentUser();

            const embed = this.createTaskDiscordEmbed(task, eventType, user, project, assignee);
            
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

    createTaskDiscordEmbed(task, action, user, project, assignee) {
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

    // Utility Methods
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    setFormLoading(button, loading) {
        if (loading) {
            button.disabled = true;
            const text = button.querySelector('span');
            const spinner = button.querySelector('.spinner') || this.createSpinner();
            
            if (text) text.classList.add('hidden');
            if (!button.querySelector('.spinner')) {
                button.appendChild(spinner);
            }
            spinner.classList.remove('hidden');
        } else {
            button.disabled = false;
            const text = button.querySelector('span');
            const spinner = button.querySelector('.spinner');
            
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

    getActivityIcon(action) {
        const icons = {
            created: '➕',
            updated: '✏️',
            deleted: '🗑️',
            login: '🔐',
            logout: '🚪',
            initialized: '🚀'
        };
        return icons[action] || '📝';
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

    getPriorityText(priority) {
        const texts = {
            low: 'Baja',
            medium: 'Media',
            high: 'Alta',
            critical: 'Crítica'
        };
        return texts[priority] || priority;
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

    getTypeText(type) {
        const texts = {
            task: 'Tarea',
            bug: 'Error',
            feature: 'Funcionalidad',
            epic: 'Épica'
        };
        return texts[type] || type;
    }

    getRoleText(role) {
        const texts = {
            admin: 'Administrador',
            manager: 'Manager',
            user: 'Usuario'
        };
        return texts[role] || role;
    }
}

// Global functions for easy access
window.refreshDashboard = function() {
    if (window.app) {
        window.app.updateDashboard();
    }
};

window.openTaskModal = function() {
    if (!window.auth.isLoggedIn()) return;
    
    // Reset form
    const form = document.getElementById('task-form');
    const modal = document.getElementById('task-modal');
    
    form.reset();
    delete form.dataset.editId;
    document.getElementById('task-modal-title').textContent = 'Nueva Tarea';
    document.getElementById('task-submit-text').textContent = 'Crear Tarea';
    
    // Load form data
    window.app.loadTaskForm();
    
    modal.classList.add('active');
    
    setTimeout(() => {
        document.getElementById('task-title').focus();
    }, 100);
};

window.editTask = function(taskId) {
    // Implementation would go here
    console.log('Edit task:', taskId);
};

window.deleteTask = function(taskId) {
    // Implementation would go here
    console.log('Delete task:', taskId);
};

window.viewTask = function(taskId) {
    // Implementation would go here
    console.log('View task:', taskId);
};

window.changeTaskStatus = function(taskId, newStatus) {
    if (!window.auth.isLoggedIn()) return;
    
    const task = window.storage.getTaskById(taskId);
    if (!task) return;
    
    if (!window.auth.canEditTask(task)) {
        window.auth.showNotification('No tienes permisos para cambiar el estado de esta tarea', 'error');
        return;
    }
    
    const oldStatus = task.status;
    const updatedTask = window.storage.updateTask(taskId, { status: newStatus });
    
    if (updatedTask) {
        window.storage.logActivity(
            window.auth.getUserId(),
            'updated',
            'task',
            `Tarea "${task.title}" cambió de ${window.app.getStatusText(oldStatus)} a ${window.app.getStatusText(newStatus)}`
        );
        
        // Send Discord notification for completed tasks
        if (newStatus === 'done') {
            window.app.sendTaskDiscordNotification('task_completed', updatedTask);
        }
        
        window.app.updateDashboard();
        window.auth.showNotification('Estado de tarea actualizado', 'success');
    }
};

window.filterTasks = function(filter) {
    if (window.app) {
        window.app.filterTasks(filter);
    }
};

window.searchTasks = function() {
    if (window.app) {
        window.app.searchTasks();
    }
};

window.openUserModal = function() {
    if (!window.auth.isAdmin()) {
        window.auth.showNotification('Solo los administradores pueden crear usuarios', 'error');
        return;
    }
    
    const form = document.getElementById('user-form');
    const modal = document.getElementById('user-modal');
    
    form.reset();
    delete form.dataset.editId;
    document.getElementById('user-modal-title').textContent = 'Nuevo Usuario';
    document.getElementById('user-submit-text').textContent = 'Crear Usuario';
    
    modal.classList.add('active');
    
    setTimeout(() => {
        document.getElementById('user-email').focus();
    }, 100);
};

window.editUser = function(userId) {
    console.log('Edit user:', userId);
};

window.deleteUser = function(userId) {
    console.log('Delete user:', userId);
};

window.testDiscordWebhook = function() {
    console.log('Test Discord webhook');
};

window.testEmailNotification = function() {
    console.log('📧 Email de prueba enviado (simulado)');
    window.auth.showNotification('Email de prueba enviado correctamente (simulado)', 'success');
};

window.filterLogs = function() {
    if (window.app) {
        window.app.loadSystemLogs();
    }
};

window.refreshLogs = function() {
    if (window.app) {
        window.app.loadSystemLogs();
    }
};

window.clearLogs = function() {
    if (!window.auth.isAdmin()) return;
    
    if (confirm('¿Estás seguro de que quieres limpiar todos los logs?')) {
        window.storage.clearActivityLogs();
        window.storage.logActivity(
            window.auth.getUserId(),
            'cleared',
            'config',
            'Logs del sistema limpiados'
        );
        window.app.loadSystemLogs();
        window.auth.showNotification('Logs limpiados exitosamente', 'success');
    }
};

window.exportData = function() {
    const data = window.storage.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coretask-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    window.auth.showNotification('Datos exportados correctamente', 'success');
};

window.importData = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                if (confirm('¿Estás seguro de que quieres importar estos datos? Esto sobrescribirá los datos actuales.')) {
                    const success = window.storage.importData(data);
                    if (success) {
                        window.auth.showNotification('Datos importados correctamente', 'success');
                        setTimeout(() => location.reload(), 1000);
                    } else {
                        throw new Error('Error al importar los datos');
                    }
                }
            } catch (error) {
                window.auth.showNotification('Error al importar los datos: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
};

window.generateReport = function() {
    const stats = window.storage.getStats();
    const reportWindow = window.open('', '_blank');
    
    reportWindow.document.write(`
        <html>
        <head>
            <title>CoreTask - Reporte del Sistema</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 2rem; }
                .header { text-align: center; margin-bottom: 2rem; }
                .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 2rem 0; }
                .stat { background: #f5f5f5; padding: 1rem; border-radius: 8px; text-align: center; }
                .stat-number { font-size: 2rem; font-weight: bold; color: #333; }
                .stat-label { color: #666; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>CoreTask - Reporte del Sistema</h1>
                <p>Generado el ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="stats">
                <div class="stat">
                    <div class="stat-number">${stats.counts.projects}</div>
                    <div class="stat-label">Proyectos</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${stats.counts.tasks}</div>
                    <div class="stat-label">Tareas</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${stats.counts.users}</div>
                    <div class="stat-label">Usuarios</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${stats.tasksByStatus.done || 0}</div>
                    <div class="stat-label">Completadas</div>
                </div>
            </div>
            
            <button onclick="window.print()" style="background: #007bff; color: white; border: none; padding: 1rem 2rem; border-radius: 4px; cursor: pointer;">
                Imprimir Reporte
            </button>
        </body>
        </html>
    `);
    reportWindow.document.close();
};

window.resetSystem = function() {
    if (!window.auth.isAdmin()) return;
    
    if (!confirm('⚠️ ADVERTENCIA: Esto eliminará TODOS los datos del sistema. ¿Estás completamente seguro?')) {
        return;
    }
    
    if (!confirm('Esta acción NO se puede deshacer. ¿Confirmas que quieres resetear todo el sistema?')) {
        return;
    }
    
    window.storage.resetSystem();
    window.auth.showNotification('Sistema reseteado. La página se recargará.', 'success');
    
    setTimeout(() => {
        location.reload();
    }, 2000);
};

window.closeModal = function(modalId) {
    if (window.app) {
        window.app.closeModal(modalId);
    }
};

// Initialize main application
window.app = new CoreTaskApp();

console.log('🎯 Main application controller initialized');
