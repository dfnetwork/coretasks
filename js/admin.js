// CoreTask - Admin Management

class AdminManager {
    constructor() {
        this.init();
    }

    init() {
        // Check admin permissions
        if (!window.auth.isAdmin()) {
            return;
        }

        // Load admin data
        this.loadAdmin();
        
        // Setup periodic refresh
        this.setupAutoRefresh();
    }

    // Load all admin sections
    loadAdmin() {
        this.loadUsers();
        this.loadSystemLogs();
        this.loadSystemStats();
    }

    // Users management
    loadUsers() {
        if (window.users) {
            window.users.loadUsers();
        }
    }

    // System logs
    loadSystemLogs() {
        const logs = window.storage.getActivityLogs().slice(0, 100);
        const container = document.getElementById('system-logs');
        if (!container) return;

        if (logs.length === 0) {
            container.innerHTML = '<div class="log-entry">No hay logs del sistema</div>';
            return;
        }

        // Get current filter
        const logLevel = document.getElementById('log-level')?.value || 'all';
        
        // Filter logs based on level
        const filteredLogs = this.filterLogsByLevel(logs, logLevel);

        container.innerHTML = filteredLogs.map(log => {
            const user = window.storage.getUserById(log.userId);
            const timestamp = new Date(log.createdAt).toLocaleString();
            
            return `
                <div class="log-entry" data-level="${log.action}">
                    <span class="log-timestamp">[${timestamp}]</span>
                    <span class="log-level ${this.getLogLevelClass(log.action)}">[${log.action.toUpperCase()}]</span>
                    <span class="log-user">${user ? user.name : 'Sistema'}:</span>
                    <span class="log-message">${this.escapeHtml(log.description)}</span>
                    ${log.metadata && Object.keys(log.metadata).length > 0 ? 
                        `<span class="log-metadata">${JSON.stringify(log.metadata)}</span>` : ''
                    }
                </div>
            `;
        }).join('');

        // Auto scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    filterLogsByLevel(logs, level) {
        if (level === 'all') return logs;
        
        const levelMappings = {
            error: ['deleted', 'error', 'failed'],
            warning: ['updated', 'warning', 'changed'],
            info: ['created', 'login', 'logout', 'tested', 'info']
        };

        const allowedActions = levelMappings[level] || [];
        return logs.filter(log => allowedActions.includes(log.action));
    }

    getLogLevelClass(action) {
        const errorActions = ['deleted', 'error', 'failed'];
        const warningActions = ['updated', 'warning', 'changed'];
        const infoActions = ['created', 'login', 'logout', 'tested', 'info'];

        if (errorActions.includes(action)) return 'error';
        if (warningActions.includes(action)) return 'warning';
        if (infoActions.includes(action)) return 'info';
        return 'info';
    }

    // System statistics
    loadSystemStats() {
        const stats = window.storage.getStats();
        this.updateStatsDisplay(stats);
    }

    updateStatsDisplay(stats) {
        // Update stat cards if they exist
        const elements = {
            'total-projects': stats.counts.projects,
            'total-tasks': stats.counts.tasks,
            'completed-tasks': stats.tasksByStatus.done,
            'total-users': stats.counts.users
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value || 0;
            }
        });
    }

    // Admin tools
    async exportData() {
        try {
            const data = window.storage.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            a.href = url;
            a.download = `coretask-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Log activity
            window.storage.logActivity(
                window.auth.getUserId(),
                'exported',
                'system',
                'Datos del sistema exportados'
            );

            window.auth.showNotification('Datos exportados correctamente', 'success');
        } catch (error) {
            console.error('Export error:', error);
            window.auth.showNotification('Error al exportar los datos', 'error');
        }
    }

    async importData() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    
                    if (!this.validateImportData(data)) {
                        throw new Error('Formato de archivo inválido');
                    }

                    if (!confirm('¿Estás seguro de que quieres importar estos datos? Esto sobrescribirá los datos actuales.')) {
                        return;
                    }

                    const success = window.storage.importData(data);
                    if (success) {
                        // Log activity
                        window.storage.logActivity(
                            window.auth.getUserId(),
                            'imported',
                            'system',
                            'Datos del sistema importados'
                        );

                        window.auth.showNotification('Datos importados correctamente', 'success');
                        
                        // Refresh all displays
                        setTimeout(() => {
                            this.loadAdmin();
                            if (window.app) {
                                window.app.updateDashboard();
                            }
                        }, 1000);
                    } else {
                        throw new Error('Error al importar los datos');
                    }
                } catch (error) {
                    console.error('Import error:', error);
                    window.auth.showNotification('Error al importar los datos: ' + error.message, 'error');
                }
            };
            
            input.click();
        } catch (error) {
            console.error('Import setup error:', error);
            window.auth.showNotification('Error al configurar la importación', 'error');
        }
    }

    validateImportData(data) {
        // Check if data has required structure
        const requiredFields = ['users', 'projects', 'tasks'];
        return requiredFields.every(field => Array.isArray(data[field]));
    }

    async generateReport() {
        try {
            const stats = window.storage.getStats();
            const users = window.storage.getUsers();
            const projects = window.storage.getProjects();
            const tasks = window.storage.getTasks();
            const integrationStats = window.integrations?.getIntegrationStats() || {};

            const reportData = {
                generatedAt: new Date().toLocaleString(),
                summary: {
                    totalUsers: stats.counts.users,
                    totalProjects: stats.counts.projects,
                    totalTasks: stats.counts.tasks,
                    completedTasks: stats.tasksByStatus.done,
                    completionRate: stats.counts.tasks > 0 ? 
                        Math.round((stats.tasksByStatus.done / stats.counts.tasks) * 100) : 0
                },
                userActivity: this.getUserActivitySummary(users, tasks),
                projectProgress: this.getProjectProgressSummary(projects, tasks),
                systemHealth: await this.getSystemHealthSummary(),
                integrations: integrationStats
            };

            this.displayReport(reportData);

            // Log activity
            window.storage.logActivity(
                window.auth.getUserId(),
                'generated',
                'report',
                'Reporte del sistema generado'
            );

        } catch (error) {
            console.error('Report generation error:', error);
            window.auth.showNotification('Error al generar el reporte', 'error');
        }
    }

    getUserActivitySummary(users, tasks) {
        return users.map(user => {
            const userTasks = tasks.filter(t => t.assigneeId === user.id);
            const completedTasks = userTasks.filter(t => t.status === 'done');
            
            return {
                name: user.name,
                role: user.role,
                totalTasks: userTasks.length,
                completedTasks: completedTasks.length,
                completionRate: userTasks.length > 0 ? 
                    Math.round((completedTasks.length / userTasks.length) * 100) : 0
            };
        });
    }

    getProjectProgressSummary(projects, tasks) {
        return projects.map(project => {
            const projectTasks = tasks.filter(t => t.projectId === project.id);
            const completedTasks = projectTasks.filter(t => t.status === 'done');
            
            return {
                name: project.name,
                status: project.status,
                totalTasks: projectTasks.length,
                completedTasks: completedTasks.length,
                progress: projectTasks.length > 0 ? 
                    Math.round((completedTasks.length / projectTasks.length) * 100) : 0
            };
        });
    }

    async getSystemHealthSummary() {
        const health = {
            storage: 'healthy',
            authentication: 'healthy',
            integrations: 'unknown'
        };

        try {
            // Check storage
            const testData = { test: true };
            window.storage.setItem('health_check', testData);
            const retrieved = window.storage.getItem('health_check');
            health.storage = JSON.stringify(retrieved) === JSON.stringify(testData) ? 'healthy' : 'error';
            window.storage.removeItem('health_check');

            // Check authentication
            health.authentication = window.auth.isLoggedIn() ? 'healthy' : 'error';

            // Check integrations
            if (window.integrations) {
                const integrationHealth = await window.integrations.checkIntegrationsHealth();
                health.integrations = Object.values(integrationHealth).some(i => i.status === 'error') ? 'warning' : 'healthy';
            }

        } catch (error) {
            console.error('Health check error:', error);
            health.storage = 'error';
        }

        return health;
    }

    displayReport(reportData) {
        const reportWindow = window.open('', '_blank');
        
        const reportHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>CoreTask - Reporte del Sistema</title>
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                        margin: 2rem; 
                        background: #f5f5f5;
                        color: #333;
                    }
                    .container {
                        max-width: 1200px;
                        margin: 0 auto;
                        background: white;
                        padding: 2rem;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .header { 
                        text-align: center; 
                        margin-bottom: 3rem;
                        border-bottom: 2px solid #eee;
                        padding-bottom: 2rem;
                    }
                    .header h1 {
                        font-size: 2.5rem;
                        margin-bottom: 0.5rem;
                        color: #2c3e50;
                    }
                    .header p {
                        color: #7f8c8d;
                        font-size: 1.1rem;
                    }
                    .stats { 
                        display: grid; 
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
                        gap: 2rem; 
                        margin: 2rem 0; 
                    }
                    .stat { 
                        background: #f8f9fa; 
                        padding: 1.5rem; 
                        border-radius: 8px; 
                        text-align: center;
                        border-left: 4px solid #3498db;
                    }
                    .stat-number { 
                        font-size: 2rem; 
                        font-weight: bold; 
                        color: #2c3e50; 
                        margin-bottom: 0.5rem;
                    }
                    .stat-label { 
                        color: #7f8c8d; 
                        font-size: 0.9rem;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    .section {
                        margin: 3rem 0;
                        padding: 2rem;
                        background: #f8f9fa;
                        border-radius: 8px;
                    }
                    .section h2 {
                        color: #2c3e50;
                        margin-bottom: 1rem;
                        font-size: 1.5rem;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 1rem;
                    }
                    th, td {
                        padding: 1rem;
                        text-align: left;
                        border-bottom: 1px solid #dee2e6;
                    }
                    th {
                        background: #e9ecef;
                        font-weight: 600;
                        color: #495057;
                    }
                    .health-indicator {
                        display: inline-block;
                        width: 12px;
                        height: 12px;
                        border-radius: 50%;
                        margin-right: 8px;
                    }
                    .healthy { background: #28a745; }
                    .warning { background: #ffc107; }
                    .error { background: #dc3545; }
                    .print-btn {
                        background: #3498db;
                        color: white;
                        border: none;
                        padding: 1rem 2rem;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 1rem;
                        margin: 2rem 0;
                    }
                    .print-btn:hover {
                        background: #2980b9;
                    }
                    @media print {
                        .print-btn { display: none; }
                        body { background: white; }
                        .container { box-shadow: none; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>CoreTask - Reporte del Sistema</h1>
                        <p>Generado el ${reportData.generatedAt}</p>
                    </div>
                    
                    <div class="stats">
                        <div class="stat">
                            <div class="stat-number">${reportData.summary.totalUsers}</div>
                            <div class="stat-label">Usuarios</div>
                        </div>
                        <div class="stat">
                            <div class="stat-number">${reportData.summary.totalProjects}</div>
                            <div class="stat-label">Proyectos</div>
                        </div>
                        <div class="stat">
                            <div class="stat-number">${reportData.summary.totalTasks}</div>
                            <div class="stat-label">Tareas</div>
                        </div>
                        <div class="stat">
                            <div class="stat-number">${reportData.summary.completionRate}%</div>
                            <div class="stat-label">Completadas</div>
                        </div>
                    </div>

                    <div class="section">
                        <h2>🏥 Estado del Sistema</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Componente</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.entries(reportData.systemHealth).map(([component, status]) => `
                                    <tr>
                                        <td>${component.charAt(0).toUpperCase() + component.slice(1)}</td>
                                        <td>
                                            <span class="health-indicator ${status}"></span>
                                            ${status.charAt(0).toUpperCase() + status.slice(1)}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div class="section">
                        <h2>👥 Actividad de Usuarios</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Usuario</th>
                                    <th>Rol</th>
                                    <th>Tareas Totales</th>
                                    <th>Completadas</th>
                                    <th>% Completado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${reportData.userActivity.map(user => `
                                    <tr>
                                        <td>${user.name}</td>
                                        <td>${user.role}</td>
                                        <td>${user.totalTasks}</td>
                                        <td>${user.completedTasks}</td>
                                        <td>${user.completionRate}%</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div class="section">
                        <h2>📁 Progreso de Proyectos</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Proyecto</th>
                                    <th>Estado</th>
                                    <th>Tareas Totales</th>
                                    <th>Completadas</th>
                                    <th>% Progreso</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${reportData.projectProgress.map(project => `
                                    <tr>
                                        <td>${project.name}</td>
                                        <td>${project.status}</td>
                                        <td>${project.totalTasks}</td>
                                        <td>${project.completedTasks}</td>
                                        <td>${project.progress}%</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <button class="print-btn" onclick="window.print()">
                        🖨️ Imprimir Reporte
                    </button>
                </div>
            </body>
            </html>
        `;

        reportWindow.document.write(reportHtml);
        reportWindow.document.close();
    }

    async resetSystem() {
        if (!window.auth.isAdmin()) {
            window.auth.showNotification('Solo los administradores pueden resetear el sistema', 'error');
            return;
        }

        const confirmations = [
            '⚠️ ADVERTENCIA: Esto eliminará TODOS los datos del sistema.',
            'Esta acción NO se puede deshacer.',
            'Se perderán todos los usuarios, proyectos, tareas y configuraciones.'
        ];

        for (const message of confirmations) {
            if (!confirm(message + '\n\n¿Estás completamente seguro?')) {
                return;
            }
        }

        // Final confirmation with typing
        const confirmText = 'RESETEAR SISTEMA';
        const userInput = prompt(`Para confirmar, escribe: "${confirmText}"`);
        
        if (userInput !== confirmText) {
            window.auth.showNotification('Reseteo cancelado', 'info');
            return;
        }

        try {
            // Log the reset before actually doing it
            window.storage.logActivity(
                window.auth.getUserId(),
                'reset',
                'system',
                'Sistema reseteado por administrador'
            );

            // Reset the system
            window.storage.resetSystem();
            
            window.auth.showNotification('Sistema reseteado. La página se recargará en 3 segundos.', 'success');
            
            setTimeout(() => {
                window.location.reload();
            }, 3000);

        } catch (error) {
            console.error('Reset error:', error);
            window.auth.showNotification('Error al resetear el sistema', 'error');
        }
    }

    // Auto refresh
    setupAutoRefresh() {
        // Refresh logs every 30 seconds
        this.logsRefreshInterval = setInterval(() => {
            this.loadSystemLogs();
        }, 30000);

        // Refresh stats every 60 seconds
        this.statsRefreshInterval = setInterval(() => {
            this.loadSystemStats();
        }, 60000);
    }

    // Clear logs
    clearLogs() {
        if (!window.auth.isAdmin()) {
            window.auth.showNotification('Solo los administradores pueden limpiar logs', 'error');
            return;
        }

        if (!confirm('¿Estás seguro de que quieres limpiar todos los logs del sistema?')) {
            return;
        }

        try {
            window.storage.clearActivityLogs();
            
            // Log the clear action (ironic, but useful)
            window.storage.logActivity(
                window.auth.getUserId(),
                'cleared',
                'logs',
                'Logs del sistema limpiados'
            );

            this.loadSystemLogs();
            window.auth.showNotification('Logs limpiados exitosamente', 'success');

        } catch (error) {
            console.error('Clear logs error:', error);
            window.auth.showNotification('Error al limpiar los logs', 'error');
        }
    }

    // Utility methods
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Cleanup
    destroy() {
        if (this.logsRefreshInterval) {
            clearInterval(this.logsRefreshInterval);
        }
        if (this.statsRefreshInterval) {
            clearInterval(this.statsRefreshInterval);
        }
    }
}

// Global functions for easy access
window.filterLogs = function() {
    if (window.admin) {
        window.admin.loadSystemLogs();
    }
};

window.refreshLogs = function() {
    if (window.admin) {
        window.admin.loadSystemLogs();
    }
};

window.clearLogs = function() {
    if (window.admin) {
        window.admin.clearLogs();
    }
};

window.exportData = function() {
    if (window.admin) {
        window.admin.exportData();
    }
};

window.importData = function() {
    if (window.admin) {
        window.admin.importData();
    }
};

window.generateReport = function() {
    if (window.admin) {
        window.admin.generateReport();
    }
};

window.resetSystem = function() {
    if (window.admin) {
        window.admin.resetSystem();
    }
};

// Initialize admin manager
window.admin = new AdminManager();

console.log('⚙️ Admin management initialized');
