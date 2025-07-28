        const isEdit = form.dataset.editId;
        
        // Show loading
        this.setFormLoading(submitBtn, true);
        
        try {
            const projectData = {
                name: document.getElementById('project-name').value.trim(),
                description: document.getElementById('project-description').value.trim(),
                priority: document.getElementById('project-priority').value,
                status: document.getElementById('project-status').value,
                startDate: document.getElementById('project-start-date').value || null,
                endDate: document.getElementById('project-end-date').value || null
            };

            // Validation
            if (!projectData.name) {
                throw new Error('El nombre del proyecto es requerido');
            }

            if (projectData.startDate && projectData.endDate && 
                new Date(projectData.startDate) > new Date(projectData.endDate)) {
                throw new Error('La fecha de inicio no puede ser posterior a la fecha límite');
            }

            let project;
            if (isEdit) {
                // Update existing project
                project = window.storage.updateProject(parseInt(isEdit), projectData);
                if (!project) {
                    throw new Error('Error al actualizar el proyecto');
                }

                // Log activity
                window.storage.logActivity(
                    window.auth.getUserId(),
                    'updated',
                    'project',
                    `Proyecto "${project.name}" actualizado`
                );

                // Send Discord notification
                this.sendDiscordNotification('project_updated', {
                    project: project,
                    user: window.auth.getCurrentUser()
                });

                window.auth.showNotification('Proyecto actualizado exitosamente', 'success');
            } else {
                // Create new project
                projectData.createdBy = window.auth.getUserId();
                project = window.storage.createProject(projectData);

                // Log activity
                window.storage.logActivity(
                    window.auth.getUserId(),
                    'created',
                    'project',
                    `Proyecto "${project.name}" creado`
                );

                // Send Discord notification
                this.sendDiscordNotification('project_created', {
                    project: project,
                    user: window.auth.getCurrentUser()
                });

                window.auth.showNotification('Proyecto creado exitosamente', 'success');
            }

            // Refresh displays
            this.loadProjects();
            if (window.app) {
                window.app.updateDashboard();
            }

            // Close modal
            this.closeModal('project-modal');

        } catch (error) {
            window.auth.showNotification(error.message, 'error');
        } finally {
            this.setFormLoading(submitBtn, false);
        }
    }

    // Project actions
    viewProject(projectId) {
        const project = window.storage.getProjectById(projectId);
        if (!project) return;

        // Switch to tasks view and filter by project
        if (window.app) {
            window.app.showPage('tasks');
            window.app.filterTasksByProject(projectId);
        }
    }

    editProject(projectId) {
        const project = window.storage.getProjectById(projectId);
        if (!project) {
            window.auth.showNotification('Proyecto no encontrado', 'error');
            return;
        }

        if (!window.auth.canEditProject(project)) {
            window.auth.showNotification('No tienes permisos para editar este proyecto', 'error');
            return;
        }

        // Fill form with project data
        document.getElementById('project-name').value = project.name;
        document.getElementById('project-description').value = project.description || '';
        document.getElementById('project-priority').value = project.priority;
        document.getElementById('project-status').value = project.status;
        document.getElementById('project-start-date').value = project.startDate || '';
        document.getElementById('project-end-date').value = project.endDate || '';

        // Set edit mode
        const form = document.getElementById('project-form');
        const modal = document.getElementById('project-modal');
        const title = document.getElementById('project-modal-title');
        const submitText = document.getElementById('project-submit-text');

        form.dataset.editId = projectId;
        title.textContent = 'Editar Proyecto';
        submitText.textContent = 'Actualizar Proyecto';

        // Show modal
        modal.classList.add('active');
    }

    async deleteProject(projectId) {
        const project = window.storage.getProjectById(projectId);
        if (!project) {
            window.auth.showNotification('Proyecto no encontrado', 'error');
            return;
        }

        if (!window.auth.canEditProject(project)) {
            window.auth.showNotification('No tienes permisos para eliminar este proyecto', 'error');
            return;
        }

        // Check if project has tasks
        const tasks = window.storage.getTasksByProject(projectId);
        if (tasks.length > 0) {
            if (!confirm(`El proyecto "${project.name}" tiene ${tasks.length} tareas. ¿Estás seguro de que quieres eliminarlo? Esto también eliminará todas las tareas asociadas.`)) {
                return;
            }
        } else {
            if (!confirm(`¿Estás seguro de que quieres eliminar el proyecto "${project.name}"?`)) {
                return;
            }
        }

        try {
            const success = window.storage.deleteProject(projectId);
            if (success) {
                // Log activity
                window.storage.logActivity(
                    window.auth.getUserId(),
                    'deleted',
                    'project',
                    `Proyecto "${project.name}" eliminado`
                );

                // Send Discord notification
                this.sendDiscordNotification('project_deleted', {
                    project: project,
                    user: window.auth.getCurrentUser()
                });

                window.auth.showNotification('Proyecto eliminado exitosamente', 'success');
                
                // Refresh displays
                this.loadProjects();
                if (window.app) {
                    window.app.updateDashboard();
                    window.app.loadTasks(); // Refresh tasks since related tasks were deleted
                }
            } else {
                throw new Error('Error al eliminar el proyecto');
            }
        } catch (error) {
            window.auth.showNotification(error.message, 'error');
        }
    }

    // Modal handling
    openProjectModal() {
        if (!window.auth.isManager()) {
            window.auth.showNotification('Solo los managers y administradores pueden crear proyectos', 'error');
            return;
        }

        // Reset form
        const form = document.getElementById('project-form');
        const modal = document.getElementById('project-modal');
        const title = document.getElementById('project-modal-title');
        const submitText = document.getElementById('project-submit-text');

        form.reset();
        delete form.dataset.editId;
        title.textContent = 'Nuevo Proyecto';
        submitText.textContent = 'Crear Proyecto';

        // Show modal
        modal.classList.add('active');

        // Focus on name field
        setTimeout(() => {
            document.getElementById('project-name').focus();
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

            const embed = this.createProjectDiscordEmbed(data.project, eventType, data.user);
            
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

    createProjectDiscordEmbed(project, action, user) {
        const colors = {
            project_created: 0x28a745,   // Green
            project_updated: 0x007bff,   // Blue
            project_completed: 0x6f42c1, // Purple
            project_deleted: 0xdc3545    // Red
        };

        const actionEmojis = {
            project_created: '🆕',
            project_updated: '✏️',
            project_completed: '🎉',
            project_deleted: '🗑️'
        };

        const actionTexts = {
            project_created: 'Proyecto Creado',
            project_updated: 'Proyecto Actualizado',
            project_completed: 'Proyecto Completado',
            project_deleted: 'Proyecto Eliminado'
        };

        return {
            embeds: [{
                title: `${actionEmojis[action]} ${actionTexts[action]}`,
                description: `**${project.name}** (${project.key})\n${project.description || 'Sin descripción'}`,
                color: colors[action] || 0x000000,
                fields: [
                    {
                        name: 'Estado',
                        value: this.getStatusText(project.status),
                        inline: true
                    },
                    {
                        name: 'Prioridad',
                        value: this.getPriorityText(project.priority),
                        inline: true
                    },
                    {
                        name: 'Fechas',
                        value: project.startDate && project.endDate 
                            ? `${this.formatDate(project.startDate)} - ${this.formatDate(project.endDate)}`
                            : 'Sin fechas definidas',
                        inline: true
                    }
                ],
                footer: {
                    text: `Por ${user.name} • CoreTask`,
                    icon_url: 'https://cdn.jsdelivr.net/npm/heroicons@1.0.6/outline/folder.svg'
                },
                timestamp: new Date().toISOString()
            }]
        };
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
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString();
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

    getStatusIcon(status) {
        const icons = {
            active: '🟢',
            on_hold: '⏸️',
            completed: '✅',
            cancelled: '❌'
        };
        return icons[status] || '⚪';
    }

    getStatusText(status) {
        const texts = {
            active: 'Activo',
            on_hold: 'En pausa',
            completed: 'Completado',
            cancelled: 'Cancelado'
        };
        return texts[status] || status;
    }

    // Search and filtering
    searchProjects(query) {
        const projects = window.storage.searchProjects(query);
        this.renderProjectsGrid(projects);
    }

    filterProjects(filters) {
        let projects = window.storage.getProjects();
        
        if (filters.status) {
            projects = projects.filter(p => p.status === filters.status);
        }
        
        if (filters.priority) {
            projects = projects.filter(p => p.priority === filters.priority);
        }
        
        if (filters.createdBy && window.auth.getUserId()) {
            projects = projects.filter(p => p.createdBy === window.auth.getUserId());
        }
        
        this.renderProjectsGrid(projects);
    }

    // Project statistics
    getProjectStats(projectId) {
        const project = window.storage.getProjectById(projectId);
        if (!project) return null;

        const tasks = window.storage.getTasksByProject(projectId);
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'done').length;
        const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
        const todoTasks = tasks.filter(t => t.status === 'todo').length;

        const overdueTasks = tasks.filter(t => 
            t.dueDate && 
            new Date(t.dueDate) < new Date() && 
            t.status !== 'done'
        ).length;

        return {
            project: project,
            totalTasks,
            completedTasks,
            inProgressTasks,
            todoTasks,
            overdueTasks,
            completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        };
    }
}

// Global functions for easy access
window.openProjectModal = function() {
    if (window.projects) {
        window.projects.openProjectModal();
    }
};

window.editProject = function(projectId) {
    if (window.projects) {
        window.projects.editProject(projectId);
    }
};

window.deleteProject = function(projectId) {
    if (window.projects) {
        window.projects.deleteProject(projectId);
    }
};

window.filterTasksByProject = function(projectId) {
    if (window.app) {
        window.app.showPage('tasks');
        window.app.filterTasksByProject(projectId);
    }
};

// Initialize projects manager
window.projects = new ProjectsManager();

console.log('📁 Projects management initialized');
