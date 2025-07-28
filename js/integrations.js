// CoreTask - Integrations Management

class IntegrationsManager {
    constructor() {
        this.webhookTests = new Map();
        this.init();
    }

    init() {
        // Setup form handlers
        this.setupDiscordForm();
        this.setupEmailIntegration();
        
        // Load current configurations
        this.loadIntegrations();
    }

    setupDiscordForm() {
        const discordForm = document.getElementById('discord-form');
        if (discordForm) {
            discordForm.addEventListener('submit', (e) => this.handleDiscordConfig(e));
        }
    }

    setupEmailIntegration() {
        // Email is simulated for static hosting
        this.updateEmailStatus();
    }

    // Load and display current integrations
    loadIntegrations() {
        this.loadDiscordConfig();
        this.loadEmailConfig();
    }

    loadDiscordConfig() {
        const config = window.storage.getConfig('discord_settings', {});
        
        // Fill form with current config
        const webhookInput = document.getElementById('discord-webhook');
        const channelInput = document.getElementById('discord-channel');
        
        if (webhookInput) webhookInput.value = config.webhookUrl || '';
        if (channelInput) channelInput.value = config.defaultChannel || '#general';
        
        // Set event checkboxes
        const events = config.events || {};
        const checkboxes = {
            'discord-task-created': events.task_created || false,
            'discord-task-assigned': events.task_assigned || false,
            'discord-task-completed': events.task_completed || false,
            'discord-project-created': events.project_created || false
        };

        Object.entries(checkboxes).forEach(([id, checked]) => {
            const checkbox = document.getElementById(id);
            if (checkbox) checkbox.checked = checked;
        });
        
        // Update status
        this.updateDiscordStatus(config);
    }

    loadEmailConfig() {
        // For static hosting, email is simulated
        this.updateEmailStatus();
    }

    updateDiscordStatus(config) {
        const statusElement = document.getElementById('discord-status');
        if (!statusElement) return;

        if (config && config.webhookUrl && this.isValidDiscordWebhook(config.webhookUrl)) {
            statusElement.innerHTML = '<span class="status-dot status-online"></span> Conectado';
        } else {
            statusElement.innerHTML = '<span class="status-dot status-offline"></span> Desconectado';
        }
    }

    updateEmailStatus() {
        const statusElement = document.getElementById('email-status');
        if (statusElement) {
            statusElement.innerHTML = '<span class="status-dot status-online"></span> Simulado';
        }
    }

    // Discord configuration handler
    async handleDiscordConfig(event) {
        event.preventDefault();
        
        const webhookUrl = document.getElementById('discord-webhook').value.trim();
        const defaultChannel = document.getElementById('discord-channel').value.trim();
        
        const events = {
            task_created: document.getElementById('discord-task-created').checked,
            task_assigned: document.getElementById('discord-task-assigned').checked,
            task_completed: document.getElementById('discord-task-completed').checked,
            project_created: document.getElementById('discord-project-created').checked
        };

        // Validation
        if (!webhookUrl) {
            window.auth.showNotification('URL de webhook es requerida', 'error');
            return;
        }

        if (!this.isValidDiscordWebhook(webhookUrl)) {
            window.auth.showNotification('URL de webhook de Discord inválida', 'error');
            return;
        }

        // Test webhook before saving
        const testResult = await this.testDiscordWebhook(webhookUrl, true);
        if (!testResult.success) {
            window.auth.showNotification(`Error al probar webhook: ${testResult.error}`, 'error');
            return;
        }

        const config = {
            webhookUrl,
            defaultChannel: defaultChannel || '#general',
            events,
            lastTested: new Date().toISOString(),
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
        this.updateDiscordStatus(config);
    }

    // Discord webhook testing
    async testDiscordWebhook(webhookUrl = null, silent = false) {
        const url = webhookUrl || document.getElementById('discord-webhook').value.trim();
        
        if (!url) {
            if (!silent) window.auth.showNotification('Introduce una URL de webhook primero', 'error');
            return { success: false, error: 'No webhook URL provided' };
        }

        if (!this.isValidDiscordWebhook(url)) {
            if (!silent) window.auth.showNotification('URL de webhook de Discord inválida', 'error');
            return { success: false, error: 'Invalid Discord webhook URL' };
        }

        try {
            const testEmbed = this.createTestDiscordEmbed();
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(testEmbed)
            });

            if (response.ok) {
                if (!silent) {
                    window.auth.showNotification('¡Webhook de Discord funcionando correctamente!', 'success');
                }
                
                // Update last tested time
                const config = window.storage.getConfig('discord_settings', {});
                config.lastTested = new Date().toISOString();
                window.storage.setConfig('discord_settings', config);
                
                return { success: true };
            } else {
                const errorText = await response.text();
                if (!silent) {
                    window.auth.showNotification(`Error del webhook: ${response.status} - ${errorText}`, 'error');
                }
                return { success: false, error: `HTTP ${response.status}: ${errorText}` };
            }
        } catch (error) {
            if (!silent) {
                window.auth.showNotification(`Error de conexión: ${error.message}`, 'error');
            }
            return { success: false, error: error.message };
        }
    }

    createTestDiscordEmbed() {
        const user = window.auth.getCurrentUser();
        
        return {
            embeds: [{
                title: '🧪 Test de Integración CoreTask',
                description: 'Esta es una prueba de la integración con Discord. ¡Todo funciona correctamente!',
                color: 0x00ff00, // Green
                fields: [
                    {
                        name: 'Sistema',
                        value: 'CoreTask Project Management',
                        inline: true
                    },
                    {
                        name: 'Usuario de prueba',
                        value: user ? user.name : 'Sistema',
                        inline: true
                    },
                    {
                        name: 'Fecha',
                        value: new Date().toLocaleString(),
                        inline: true
                    }
                ],
                footer: {
                    text: 'CoreTask • Test de integración',
                    icon_url: 'https://cdn.jsdelivr.net/npm/heroicons@1.0.6/outline/check-circle.svg'
                },
                timestamp: new Date().toISOString()
            }]
        };
    }

    // Email notification testing (simulated)
    testEmailNotification() {
        const user = window.auth.getCurrentUser();
        
        // Simulate email sending
        const emailData = {
            to: user ? user.email : 'test@example.com',
            subject: '📧 CoreTask - Test de Notificación',
            body: `
                Hola ${user ? user.name : 'Usuario'},
                
                Esta es una prueba de las notificaciones por email de CoreTask.
                
                Si estás viendo este mensaje en la consola, significa que el sistema
                de notificaciones está funcionando correctamente.
                
                En un entorno de producción real, este email se enviaría a través
                de un servicio como SendGrid, Mailgun o similar.
                
                ¡Saludos!
                Equipo CoreTask
            `,
            timestamp: new Date().toISOString()
        };
        
        // Log simulated email
        console.log('📧 Email simulado enviado:', emailData);
        
        // Log activity
        window.storage.logActivity(
            window.auth.getUserId(),
            'tested',
            'integration',
            'Prueba de notificación por email realizada'
        );
        
        window.auth.showNotification('Email de prueba enviado correctamente (simulado)', 'success');
    }

    // Send actual notifications through integrations
    async sendTaskNotification(eventType, taskData) {
        const promises = [];
        
        // Discord notification
        promises.push(this.sendDiscordTaskNotification(eventType, taskData));
        
        // Email notification (simulated)
        promises.push(this.sendEmailTaskNotification(eventType, taskData));
        
        // Wait for all notifications
        const results = await Promise.allSettled(promises);
        
        // Log results
        results.forEach((result, index) => {
            const service = index === 0 ? 'Discord' : 'Email';
            if (result.status === 'rejected') {
                console.error(`${service} notification failed:`, result.reason);
            }
        });
    }

    async sendDiscordTaskNotification(eventType, taskData) {
        const config = window.storage.getConfig('discord_settings');
        if (!config || !config.webhookUrl || !config.events[eventType]) {
            return; // Not configured or event not enabled
        }

        try {
            const embed = this.createTaskDiscordEmbed(taskData.task, eventType, taskData.user);
            
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

    async sendEmailTaskNotification(eventType, taskData) {
        // Simulate email notification
        const emailData = {
            eventType,
            task: taskData.task,
            user: taskData.user,
            timestamp: new Date().toISOString()
        };
        
        console.log('📧 Email notification simulated:', emailData);
    }

    createTaskDiscordEmbed(task, action, user) {
        const colors = {
            task_created: 0x28a745,
            task_updated: 0x007bff,
            task_completed: 0x6f42c1,
            task_assigned: 0xffc107,
            project_created: 0x28a745,
            project_updated: 0x007bff
        };

        const actionEmojis = {
            task_created: '📋',
            task_updated: '✏️',
            task_completed: '✅',
            task_assigned: '👤',
            project_created: '🆕',
            project_updated: '✏️'
        };

        const actionTexts = {
            task_created: 'Nueva Tarea Creada',
            task_updated: 'Tarea Actualizada',
            task_completed: 'Tarea Completada',
            task_assigned: 'Tarea Asignada',
            project_created: 'Nuevo Proyecto Creado',
            project_updated: 'Proyecto Actualizado'
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

    // Webhook management
    async createWebhook(webhookData) {
        try {
            const webhook = window.storage.createWebhook({
                ...webhookData,
                createdBy: window.auth.getUserId()
            });

            // Log activity
            window.storage.logActivity(
                window.auth.getUserId(),
                'created',
                'webhook',
                `Webhook "${webhook.name}" creado`
            );

            return webhook;
        } catch (error) {
            console.error('Error creating webhook:', error);
            throw error;
        }
    }

    async updateWebhook(webhookId, updates) {
        try {
            const webhook = window.storage.updateWebhook(webhookId, {
                ...updates,
                updatedBy: window.auth.getUserId()
            });

            // Log activity
            window.storage.logActivity(
                window.auth.getUserId(),
                'updated',
                'webhook',
                `Webhook actualizado`
            );

            return webhook;
        } catch (error) {
            console.error('Error updating webhook:', error);
            throw error;
        }
    }

    async deleteWebhook(webhookId) {
        try {
            const success = window.storage.deleteWebhook(webhookId);
            
            if (success) {
                // Log activity
                window.storage.logActivity(
                    window.auth.getUserId(),
                    'deleted',
                    'webhook',
                    `Webhook eliminado`
                );
            }

            return success;
        } catch (error) {
            console.error('Error deleting webhook:', error);
            throw error;
        }
    }

    // Integration health checks
    async checkIntegrationsHealth() {
        const results = {
            discord: { status: 'unknown', lastTested: null, error: null },
            email: { status: 'simulated', lastTested: new Date().toISOString(), error: null }
        };

        // Check Discord
        const discordConfig = window.storage.getConfig('discord_settings');
        if (discordConfig && discordConfig.webhookUrl) {
            const testResult = await this.testDiscordWebhook(discordConfig.webhookUrl, true);
            results.discord = {
                status: testResult.success ? 'healthy' : 'error',
                lastTested: new Date().toISOString(),
                error: testResult.error || null
            };
        } else {
            results.discord.status = 'not_configured';
        }

        return results;
    }

    // Integration statistics
    getIntegrationStats() {
        const logs = window.storage.getActivityLogs();
        const integrationLogs = logs.filter(log => 
            log.entityType === 'integration' || 
            log.entityType === 'webhook' ||
            log.description.includes('Discord') ||
            log.description.includes('email')
        );

        const stats = {
            totalEvents: integrationLogs.length,
            discordEvents: integrationLogs.filter(log => log.description.includes('Discord')).length,
            emailEvents: integrationLogs.filter(log => log.description.includes('email')).length,
            webhookEvents: integrationLogs.filter(log => log.entityType === 'webhook').length,
            lastEvent: integrationLogs.length > 0 ? integrationLogs[0].createdAt : null
        };

        return stats;
    }

    // Utility methods
    isValidDiscordWebhook(url) {
        const discordWebhookRegex = /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/;
        return discordWebhookRegex.test(url);
    }

    isValidEmail(email) {
        return window.storage.isValidEmail(email);
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Rate limiting for notifications
    rateLimitNotification(key, limit = 5, window = 60000) { // 5 notifications per minute by default
        const now = Date.now();
        const rateLimitKey = `rate_limit_${key}`;
        
        let attempts = this.webhookTests.get(rateLimitKey) || [];
        attempts = attempts.filter(time => now - time < window);
        
        if (attempts.length >= limit) {
            return false; // Rate limited
        }
        
        attempts.push(now);
        this.webhookTests.set(rateLimitKey, attempts);
        return true;
    }

    // Bulk notification sending
    async sendBulkNotifications(notifications) {
        const batchSize = 5; // Process 5 notifications at a time
        const results = [];
        
        for (let i = 0; i < notifications.length; i += batchSize) {
            const batch = notifications.slice(i, i + batchSize);
            const batchPromises = batch.map(notification => 
                this.sendTaskNotification(notification.eventType, notification.data)
            );
            
            const batchResults = await Promise.allSettled(batchPromises);
            results.push(...batchResults);
            
            // Small delay between batches to avoid rate limiting
            if (i + batchSize < notifications.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        return results;
    }

    // Configuration validation
    validateDiscordConfig(config) {
        const errors = [];
        
        if (!config.webhookUrl) {
            errors.push('Webhook URL es requerida');
        } else if (!this.isValidDiscordWebhook(config.webhookUrl)) {
            errors.push('Webhook URL de Discord inválida');
        }
        
        if (!config.defaultChannel) {
            errors.push('Canal por defecto es requerido');
        } else if (!config.defaultChannel.startsWith('#')) {
            errors.push('El canal debe comenzar con #');
        }
        
        if (!config.events || Object.keys(config.events).length === 0) {
            errors.push('Debe seleccionar al menos un evento');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Integration templates
    getDiscordTemplates() {
        return {
            minimal: {
                name: 'Configuración Mínima',
                events: {
                    task_created: true,
                    task_completed: true
                }
            },
            complete: {
                name: 'Configuración Completa',
                events: {
                    task_created: true,
                    task_assigned: true,
                    task_completed: true,
                    project_created: true
                }
            },
            manager: {
                name: 'Solo para Managers',
                events: {
                    project_created: true,
                    task_completed: true
                }
            }
        };
    }

    applyDiscordTemplate(templateName) {
        const templates = this.getDiscordTemplates();
        const template = templates[templateName];
        
        if (!template) return;
        
        // Apply template events
        Object.entries(template.events).forEach(([eventId, enabled]) => {
            const checkbox = document.getElementById(`discord-${eventId.replace('_', '-')}`);
            if (checkbox) {
                checkbox.checked = enabled;
            }
        });
        
        window.auth.showNotification(`Plantilla "${template.name}" aplicada`, 'success');
    }

    // Export/Import configurations
    exportIntegrationConfig() {
        const config = {
            discord: window.storage.getConfig('discord_settings'),
            email: window.storage.getConfig('email_settings'),
            webhooks: window.storage.getWebhooks(),
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };
        
        // Remove sensitive data
        if (config.discord && config.discord.webhookUrl) {
            config.discord.webhookUrl = '[REDACTED]';
        }
        
        return config;
    }

    importIntegrationConfig(configData) {
        try {
            if (configData.discord) {
                // Don't import redacted webhook URLs
                if (configData.discord.webhookUrl !== '[REDACTED]') {
                    window.storage.setConfig('discord_settings', configData.discord);
                }
            }
            
            if (configData.email) {
                window.storage.setConfig('email_settings', configData.email);
            }
            
            // Log activity
            window.storage.logActivity(
                window.auth.getUserId(),
                'imported',
                'config',
                'Configuración de integraciones importada'
            );
            
            // Reload configurations
            this.loadIntegrations();
            
            return true;
        } catch (error) {
            console.error('Error importing config:', error);
            return false;
        }
    }

    // Integration monitoring
    startHealthMonitoring(interval = 300000) { // 5 minutes
        if (this.healthMonitorInterval) {
            clearInterval(this.healthMonitorInterval);
        }
        
        this.healthMonitorInterval = setInterval(async () => {
            const health = await this.checkIntegrationsHealth();
            
            // Log health status
            console.log('Integration health check:', health);
            
            // Alert on errors
            Object.entries(health).forEach(([service, status]) => {
                if (status.status === 'error') {
                    console.warn(`${service} integration error:`, status.error);
                }
            });
        }, interval);
    }

    stopHealthMonitoring() {
        if (this.healthMonitorInterval) {
            clearInterval(this.healthMonitorInterval);
            this.healthMonitorInterval = null;
        }
    }

    // Clean up
    destroy() {
        this.stopHealthMonitoring();
        this.webhookTests.clear();
    }
}

// Global functions for easy access
window.testDiscordWebhook = function() {
    if (window.integrations) {
        window.integrations.testDiscordWebhook();
    }
};

window.testEmailNotification = function() {
    if (window.integrations) {
        window.integrations.testEmailNotification();
    }
};

window.applyDiscordTemplate = function(templateName) {
    if (window.integrations) {
        window.integrations.applyDiscordTemplate(templateName);
    }
};

// Initialize integrations manager
window.integrations = new IntegrationsManager();

// Start health monitoring
window.integrations.startHealthMonitoring();

console.log('🔗 Integrations management initialized');
