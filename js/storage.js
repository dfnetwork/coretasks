    deleteProject(id) {
        const projects = this.getProjects();
        const filteredProjects = projects.filter(project => project.id !== parseInt(id));
        this.setItem('projects', filteredProjects);
        
        // Also delete related tasks
        const tasks = this.getTasks();
        const filteredTasks = tasks.filter(task => task.projectId !== parseInt(id));
        this.setItem('tasks', filteredTasks);
        
        return filteredProjects.length < projects.length;
    }

    generateProjectKey(name) {
        const key = name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 5);
        const projects = this.getProjects();
        let uniqueKey = key;
        let counter = 1;
        
        while (projects.find(p => p.key === uniqueKey)) {
            uniqueKey = `${key}${counter}`;
            counter++;
        }
        
        return uniqueKey;
    }

    // Tasks
    getTasks() {
        return this.getItem('tasks', []);
    }

    getTaskById(id) {
        const tasks = this.getTasks();
        return tasks.find(task => task.id === parseInt(id));
    }

    getTasksByProject(projectId) {
        const tasks = this.getTasks();
        return tasks.filter(task => task.projectId === parseInt(projectId));
    }

    getTasksByAssignee(assigneeId) {
        const tasks = this.getTasks();
        return tasks.filter(task => task.assigneeId === parseInt(assigneeId));
    }

    createTask(taskData) {
        const tasks = this.getTasks();
        const newTask = {
            id: this.generateId('tasks'),
            ...taskData,
            tags: taskData.tags || [],
            attachments: taskData.attachments || [],
            customFields: taskData.customFields || {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        tasks.push(newTask);
        this.setItem('tasks', tasks);
        return newTask;
    }

    updateTask(id, updates) {
        const tasks = this.getTasks();
        const index = tasks.findIndex(task => task.id === parseInt(id));
        if (index !== -1) {
            tasks[index] = { ...tasks[index], ...updates, updatedAt: new Date().toISOString() };
            this.setItem('tasks', tasks);
            return tasks[index];
        }
        return null;
    }

    deleteTask(id) {
        const tasks = this.getTasks();
        const filteredTasks = tasks.filter(task => task.id !== parseInt(id));
        this.setItem('tasks', filteredTasks);
        return filteredTasks.length < tasks.length;
    }

    // Webhooks
    getWebhooks() {
        return this.getItem('webhooks', []);
    }

    createWebhook(webhookData) {
        const webhooks = this.getWebhooks();
        const newWebhook = {
            id: this.generateId('webhooks'),
            ...webhookData,
            triggerCount: 0,
            lastTriggered: null,
            createdAt: new Date().toISOString()
        };
        webhooks.push(newWebhook);
        this.setItem('webhooks', webhooks);
        return newWebhook;
    }

    updateWebhook(id, updates) {
        const webhooks = this.getWebhooks();
        const index = webhooks.findIndex(webhook => webhook.id === parseInt(id));
        if (index !== -1) {
            webhooks[index] = { ...webhooks[index], ...updates, updatedAt: new Date().toISOString() };
            this.setItem('webhooks', webhooks);
            return webhooks[index];
        }
        return null;
    }

    deleteWebhook(id) {
        const webhooks = this.getWebhooks();
        const filteredWebhooks = webhooks.filter(webhook => webhook.id !== parseInt(id));
        this.setItem('webhooks', filteredWebhooks);
        return filteredWebhooks.length < webhooks.length;
    }

    // Activity Logs
    getActivityLogs() {
        return this.getItem('activity_logs', []);
    }

    logActivity(userId, action, entityType, description, metadata = {}) {
        const logs = this.getActivityLogs();
        const newLog = {
            id: this.generateId('activity_logs'),
            userId: parseInt(userId),
            action,
            entityType,
            entityId: metadata.entityId || null,
            description,
            metadata,
            ipAddress: null, // No disponible en frontend
            userAgent: navigator.userAgent,
            createdAt: new Date().toISOString()
        };
        
        logs.unshift(newLog); // Add to beginning
        
        // Keep only last 1000 logs
        if (logs.length > 1000) {
            logs.splice(1000);
        }
        
        this.setItem('activity_logs', logs);
        return newLog;
    }

    clearActivityLogs() {
        this.setItem('activity_logs', []);
        return true;
    }

    // Configurations
    getConfigs() {
        return this.getItem('configs', {});
    }

    getConfig(key, defaultValue = null) {
        const configs = this.getConfigs();
        return configs[key] || defaultValue;
    }

    setConfig(key, value) {
        const configs = this.getConfigs();
        configs[key] = value;
        this.setItem('configs', configs);
        return true;
    }

    // Statistics
    getStats() {
        const users = this.getUsers();
        const projects = this.getProjects();
        const tasks = this.getTasks();
        const logs = this.getActivityLogs();

        const tasksByStatus = {
            todo: tasks.filter(t => t.status === 'todo').length,
            in_progress: tasks.filter(t => t.status === 'in_progress').length,
            review: tasks.filter(t => t.status === 'review').length,
            done: tasks.filter(t => t.status === 'done').length
        };

        const tasksByPriority = {
            low: tasks.filter(t => t.priority === 'low').length,
            medium: tasks.filter(t => t.priority === 'medium').length,
            high: tasks.filter(t => t.priority === 'high').length,
            critical: tasks.filter(t => t.priority === 'critical').length
        };

        const usersByRole = {
            admin: users.filter(u => u.role === 'admin').length,
            manager: users.filter(u => u.role === 'manager').length,
            user: users.filter(u => u.role === 'user').length
        };

        return {
            counts: {
                users: users.length,
                projects: projects.length,
                tasks: tasks.length,
                logs: logs.length
            },
            tasksByStatus,
            tasksByPriority,
            usersByRole,
            recentActivity: logs.slice(0, 10)
        };
    }

    // Export/Import
    exportData() {
        const data = {
            users: this.getUsers().map(u => ({ ...u, password: undefined })), // Remove passwords
            projects: this.getProjects(),
            tasks: this.getTasks(),
            webhooks: this.getWebhooks(),
            activity_logs: this.getActivityLogs().slice(0, 100), // Only recent logs
            configs: this.getConfigs(),
            exportDate: new Date().toISOString(),
            version: this.getItem('version', '1.0.0')
        };
        
        return data;
    }

    importData(data) {
        try {
            if (data.users) this.setItem('users', data.users);
            if (data.projects) this.setItem('projects', data.projects);
            if (data.tasks) this.setItem('tasks', data.tasks);
            if (data.webhooks) this.setItem('webhooks', data.webhooks);
            if (data.activity_logs) this.setItem('activity_logs', data.activity_logs);
            if (data.configs) this.setItem('configs', data.configs);
            
            return true;
        } catch (error) {
            console.error('Import error:', error);
            return false;
        }
    }

    // Reset system
    resetSystem() {
        const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix));
        keys.forEach(key => localStorage.removeItem(key));
        this.initializeData();
        return true;
    }

    // Search functionality
    searchTasks(query) {
        const tasks = this.getTasks();
        const searchTerm = query.toLowerCase();
        
        return tasks.filter(task => 
            task.title.toLowerCase().includes(searchTerm) ||
            (task.description && task.description.toLowerCase().includes(searchTerm)) ||
            task.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
    }

    searchProjects(query) {
        const projects = this.getProjects();
        const searchTerm = query.toLowerCase();
        
        return projects.filter(project => 
            project.name.toLowerCase().includes(searchTerm) ||
            (project.description && project.description.toLowerCase().includes(searchTerm)) ||
            project.key.toLowerCase().includes(searchTerm)
        );
    }

    searchUsers(query) {
        const users = this.getUsers();
        const searchTerm = query.toLowerCase();
        
        return users.filter(user => 
            user.name.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm)
        );
    }

    // Filtering
    filterTasks(filters) {
        let tasks = this.getTasks();
        
        if (filters.status) {
            tasks = tasks.filter(task => task.status === filters.status);
        }
        
        if (filters.priority) {
            tasks = tasks.filter(task => task.priority === filters.priority);
        }
        
        if (filters.assigneeId) {
            tasks = tasks.filter(task => task.assigneeId === parseInt(filters.assigneeId));
        }
        
        if (filters.projectId) {
            tasks = tasks.filter(task => task.projectId === parseInt(filters.projectId));
        }
        
        if (filters.type) {
            tasks = tasks.filter(task => task.type === filters.type);
        }
        
        if (filters.overdue) {
            const now = new Date();
            tasks = tasks.filter(task => 
                task.dueDate && 
                new Date(task.dueDate) < now && 
                task.status !== 'done'
            );
        }
        
        return tasks;
    }

    // Validation helpers
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    // Date helpers
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

    isOverdue(dueDate, status) {
        if (!dueDate || status === 'done') return false;
        return new Date(dueDate) < new Date();
    }

    // Utility methods
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

// Initialize global storage instance
window.storage = new CoreTaskStorage();

// Console logging for debugging
console.log('📦 CoreTask Storage initialized');
console.log('📊 Current stats:', window.storage.getStats());
