// CoreTask - Users Management

class UsersManager {
    constructor() {
        this.init();
    }

    init() {
        // Setup form handlers
        this.setupUserForm();
        this.setupProfileForm();
        this.setupPasswordForm();
    }

    setupUserForm() {
        const userForm = document.getElementById('user-form');
        if (userForm) {
            userForm.addEventListener('submit', (e) => this.handleUserSubmit(e));
        }
    }

    setupProfileForm() {
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => this.handleProfileSubmit(e));
        }
    }

    setupPasswordForm() {
        const passwordForm = document.getElementById('password-form');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => this.handlePasswordSubmit(e));
        }
    }

    // Load and render users
    loadUsers() {
        const users = window.storage.getUsers();
        this.renderUsersTable(users);
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        if (users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">
                        <div class="empty-state">
                            <div class="empty-state-icon">👥</div>
                            <h3>No hay usuarios</h3>
                            <p>Crea el primer usuario para comenzar</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>
                    <span class="text-sm">${this.escapeHtml(user.email)}</span>
                </td>
                <td>
                    <span class="font-medium">${this.escapeHtml(user.name)}</span>
                </td>
                <td>
                    <span class="status-badge status-${user.role}">
                        ${this.getRoleIcon(user.role)} ${this.getRoleText(user.role)}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${user.status === 'active' ? 'status-done' : 'status-todo'}">
                        ${user.status === 'active' ? '✅ Activo' : '⏸️ Inactivo'}
                    </span>
                </td>
                <td>
                    <div class="user-actions">
                        <button class="btn btn-sm btn-secondary" onclick="editUser(${user.id})" title="Editar">
                            ✏️
                        </button>
                        ${user.id !== window.auth.getUserId() ? `
                            <button class="btn btn-sm btn-secondary" onclick="toggleUserStatus(${user.id})" title="${user.status === 'active' ? 'Desactivar' : 'Activar'}">
                                ${user.status === 'active' ? '⏸️' : '▶️'}
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})" title="Eliminar">
                                🗑️
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // User form submission
    async handleUserSubmit(event) {
        event.preventDefault();
        
        const form = event.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const isEdit = form.dataset.editId;
        
        // Show loading
        this.setFormLoading(submitBtn, true);
        
        try {
            const userData = {
                email: document.getElementById('user-email').value.trim(),
                name: document.getElementById('user-name').value.trim(),
                role: document.getElementById('user-role').value,
                status: 'active'
            };

            // Add password only for new users or if provided
            const password = document.getElementById('user-password').value;
            if (!isEdit || password) {
                userData.password = password;
            }

            // Validation
            if (!userData.email || !userData.name) {
                throw new Error('Email y nombre son requeridos');
            }

            if (!window.storage.isValidEmail(userData.email)) {
                throw new Error('Email inválido');
            }

            if (!isEdit && !password) {
                throw new Error('La contraseña es requerida para usuarios nuevos');
            }

            if (password && password.length < 6) {
                throw new Error('La contraseña debe tener al menos 6 caracteres');
            }

            let user;
            if (isEdit) {
                // Check if email is already taken by another user
                const existingUser = window.storage.getUserByEmail(userData.email);
                if (existingUser && existingUser.id !== parseInt(isEdit)) {
                    throw new Error('El email ya está en uso por otro usuario');
                }

                // Update existing user
                user = window.storage.updateUser(parseInt(isEdit), userData);
                if (!user) {
                    throw new Error('Error al actualizar el usuario');
                }

                // Log activity
                window.storage.logActivity(
                    window.auth.getUserId(),
                    'updated',
                    'user',
                    `Usuario "${user.name}" actualizado`
                );

                window.auth.showNotification('Usuario actualizado exitosamente', 'success');
            } else {
                // Check if email is already taken
                const existingUser = window.storage.getUserByEmail(userData.email);
                if (existingUser) {
                    throw new Error('El email ya está en uso');
                }

                // Create new user
                user = window.storage.createUser(userData);

                // Log activity
                window.storage.logActivity(
                    window.auth.getUserId(),
                    'created',
                    'user',
                    `Usuario "${user.name}" creado`
                );

                window.auth.showNotification('Usuario creado exitosamente', 'success');
            }

            // Refresh displays
            this.loadUsers();
            
            // Close modal
            this.closeModal('user-modal');

        } catch (error) {
            window.auth.showNotification(error.message, 'error');
        } finally {
            this.setFormLoading(submitBtn, false);
        }
    }

    // Profile form submission
    async handleProfileSubmit(event) {
        event.preventDefault();
        
        const form = event.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Show loading
        this.setFormLoading(submitBtn, true);
        
        try {
            const profileData = {
                name: document.getElementById('profile-name').value.trim()
            };

            // Validation
            if (!profileData.name) {
                throw new Error('El nombre es requerido');
            }

            // Update profile
            await window.auth.updateProfile(profileData);

            window.auth.showNotification('Perfil actualizado exitosamente', 'success');
            
            // Close modal
            this.closeModal('profile-modal');

        } catch (error) {
            window.auth.showNotification(error.message, 'error');
        } finally {
            this.setFormLoading(submitBtn, false);
        }
    }

    // Password form submission
    async handlePasswordSubmit(event) {
        event.preventDefault();
        
        const form = event.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Show loading
        this.setFormLoading(submitBtn, true);
        
        try {
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            // Validation
            if (!currentPassword || !newPassword || !confirmPassword) {
                throw new Error('Todos los campos son requeridos');
            }

            if (newPassword.length < 6) {
                throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
            }

            if (newPassword !== confirmPassword) {
                throw new Error('Las contraseñas no coinciden');
            }

            if (newPassword === currentPassword) {
                throw new Error('La nueva contraseña debe ser diferente a la actual');
            }

            // Change password
            await window.auth.changePassword(currentPassword, newPassword);

            window.auth.showNotification('Contraseña cambiada exitosamente', 'success');
            
            // Clear form and close modal
            form.reset();
            this.closeModal('password-modal');

        } catch (error) {
            window.auth.showNotification(error.message, 'error');
        } finally {
            this.setFormLoading(submitBtn, false);
        }
    }

    // User actions
    editUser(userId) {
        const user = window.storage.getUserById(userId);
        if (!user) {
            window.auth.showNotification('Usuario no encontrado', 'error');
            return;
        }

        if (!window.auth.canEditUser(userId)) {
            window.auth.showNotification('No tienes permisos para editar este usuario', 'error');
            return;
        }

        // Fill form with user data
        document.getElementById('user-email').value = user.email;
        document.getElementById('user-name').value = user.name;
        document.getElementById('user-role').value = user.role;
        document.getElementById('user-password').value = ''; // Don't pre-fill password

        // Set edit mode
        const form = document.getElementById('user-form');
        const modal = document.getElementById('user-modal');
        const title = document.getElementById('user-modal-title');
        const submitText = document.getElementById('user-submit-text');
        const passwordField = document.getElementById('user-password');

        form.dataset.editId = userId;
        title.textContent = 'Editar Usuario';
        submitText.textContent = 'Actualizar Usuario';
        passwordField.placeholder = 'Dejar vacío para mantener la actual';
        passwordField.required = false;

        // Show modal
        modal.classList.add('active');
    }

    async deleteUser(userId) {
        const user = window.storage.getUserById(userId);
        if (!user) {
            window.auth.showNotification('Usuario no encontrado', 'error');
            return;
        }

        if (!window.auth.isAdmin()) {
            window.auth.showNotification('Solo los administradores pueden eliminar usuarios', 'error');
            return;
        }

        if (user.id === window.auth.getUserId()) {
            window.auth.showNotification('No puedes eliminarte a ti mismo', 'error');
            return;
        }

        // Check if user has tasks or projects assigned
        const userTasks = window.storage.getTasksByAssignee(userId);
        const userProjects = window.storage.getProjects().filter(p => p.createdBy === userId);

        let confirmMessage = `¿Estás seguro de que quieres eliminar al usuario "${user.name}"?`;
        
        if (userTasks.length > 0 || userProjects.length > 0) {
            confirmMessage += `\n\nEste usuario tiene:\n`;
            if (userTasks.length > 0) confirmMessage += `- ${userTasks.length} tareas asignadas\n`;
            if (userProjects.length > 0) confirmMessage += `- ${userProjects.length} proyectos creados\n`;
            confirmMessage += `\nEstos elementos se mantendrán pero sin asignación.`;
        }

        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            const success = window.storage.deleteUser(userId);
            if (success) {
                // Log activity
                window.storage.logActivity(
                    window.auth.getUserId(),
                    'deleted',
                    'user',
                    `Usuario "${user.name}" eliminado`
                );

                window.auth.showNotification('Usuario eliminado exitosamente', 'success');
                
                // Refresh displays
                this.loadUsers();
            } else {
                throw new Error('Error al eliminar el usuario');
            }
        } catch (error) {
            window.auth.showNotification(error.message, 'error');
        }
    }

    async toggleUserStatus(userId) {
        const user = window.storage.getUserById(userId);
        if (!user) {
            window.auth.showNotification('Usuario no encontrado', 'error');
            return;
        }

        if (!window.auth.isAdmin()) {
            window.auth.showNotification('Solo los administradores pueden cambiar el estado de usuarios', 'error');
            return;
        }

        try {
            const newStatus = user.status === 'active' ? 'inactive' : 'active';
            const updatedUser = window.storage.updateUser(userId, { status: newStatus });
            
            if (updatedUser) {
                // Log activity
                window.storage.logActivity(
                    window.auth.getUserId(),
                    'updated',
                    'user',
                    `Usuario "${user.name}" ${newStatus === 'active' ? 'activado' : 'desactivado'}`
                );

                window.auth.showNotification(
                    `Usuario ${newStatus === 'active' ? 'activado' : 'desactivado'} exitosamente`, 
                    'success'
                );
                
                // Refresh displays
                this.loadUsers();
            } else {
                throw new Error('Error al cambiar el estado del usuario');
            }
        } catch (error) {
            window.auth.showNotification(error.message, 'error');
        }
    }

    // Modal handling
    openUserModal() {
        if (!window.auth.isAdmin()) {
            window.auth.showNotification('Solo los administradores pueden crear usuarios', 'error');
            return;
        }

        // Reset form
        const form = document.getElementById('user-form');
        const modal = document.getElementById('user-modal');
        const title = document.getElementById('user-modal-title');
        const submitText = document.getElementById('user-submit-text');
        const passwordField = document.getElementById('user-password');

        form.reset();
        delete form.dataset.editId;
        title.textContent = 'Nuevo Usuario';
        submitText.textContent = 'Crear Usuario';
        passwordField.placeholder = 'Contraseña';
        passwordField.required = true;

        // Show modal
        modal.classList.add('active');

        // Focus on email field
        setTimeout(() => {
            document.getElementById('user-email').focus();
        }, 100);
    }

    showProfileModal() {
        if (!window.auth.isLoggedIn()) return;

        const user = window.auth.getCurrentUser();
        if (!user) return;

        // Fill form with current user data
        document.getElementById('profile-email').value = user.email;
        document.getElementById('profile-name').value = user.name;
        document.getElementById('profile-role').value = this.getRoleText(user.role);

        // Show modal
        const modal = document.getElementById('profile-modal');
        modal.classList.add('active');

        // Focus on name field
        setTimeout(() => {
            document.getElementById('profile-name').focus();
        }, 100);
    }

    showPasswordModal() {
        if (!window.auth.isLoggedIn()) return;

        // Reset form
        document.getElementById('password-form').reset();

        // Show modal
        const modal = document.getElementById('password-modal');
        modal.classList.add('active');

        // Focus on current password field
        setTimeout(() => {
            document.getElementById('current-password').focus();
        }, 100);
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // Search and filtering
    searchUsers(query) {
        const users = window.storage.searchUsers(query);
        this.renderUsersTable(users);
    }

    filterUsers(filters) {
        let users = window.storage.getUsers();
        
        if (filters.role) {
            users = users.filter(u => u.role === filters.role);
        }
        
        if (filters.status) {
            users = users.filter(u => u.status === filters.status);
        }
        
        this.renderUsersTable(users);
    }

    // User statistics
    getUserStats() {
        const users = window.storage.getUsers();
        const tasks = window.storage.getTasks();
        const projects = window.storage.getProjects();

        return users.map(user => {
            const userTasks = tasks.filter(t => t.assigneeId === user.id);
            const userProjects = projects.filter(p => p.createdBy === user.id);
            const completedTasks = userTasks.filter(t => t.status === 'done');

            return {
                ...user,
                stats: {
                    totalTasks: userTasks.length,
                    completedTasks: completedTasks.length,
                    totalProjects: userProjects.length,
                    completionRate: userTasks.length > 0 ? Math.round((completedTasks.length / userTasks.length) * 100) : 0
                }
            };
        });
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

    getRoleIcon(role) {
        const icons = {
            admin: '👑',
            manager: '👨‍💼',
            user: '👤'
        };
        return icons[role] || '👤';
    }

    getRoleText(role) {
        const texts = {
            admin: 'Administrador',
            manager: 'Manager',
            user: 'Usuario'
        };
        return texts[role] || role;
    }

    // Password strength validation
    checkPasswordStrength(password) {
        const checks = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        const score = Object.values(checks).filter(Boolean).length;
        
        let strength = 'very-weak';
        if (score >= 4) strength = 'strong';
        else if (score >= 3) strength = 'medium';
        else if (score >= 2) strength = 'weak';

        return {
            strength,
            score,
            checks,
            suggestions: this.getPasswordSuggestions(checks)
        };
    }

    getPasswordSuggestions(checks) {
        const suggestions = [];
        
        if (!checks.length) suggestions.push('Use al menos 8 caracteres');
        if (!checks.uppercase) suggestions.push('Incluye al menos una letra mayúscula');
        if (!checks.lowercase) suggestions.push('Incluye al menos una letra minúscula');
        if (!checks.number) suggestions.push('Incluye al menos un número');
        if (!checks.special) suggestions.push('Incluye al menos un carácter especial');

        return suggestions;
    }

    // Activity tracking
    trackUserActivity(userId, action, details = {}) {
        window.storage.logActivity(
            userId,
            action,
            'user',
            `Actividad de usuario: ${action}`,
            details
        );
    }

    // User role management
    canPromoteUser(userId) {
        const currentUser = window.auth.getCurrentUser();
        const targetUser = window.storage.getUserById(userId);
        
        if (!currentUser || !targetUser) return false;
        if (!window.auth.isAdmin()) return false;
        if (currentUser.id === targetUser.id) return false;

        return true;
    }

    async promoteUser(userId, newRole) {
        if (!this.canPromoteUser(userId)) {
            window.auth.showNotification('No tienes permisos para cambiar roles', 'error');
            return;
        }

        const user = window.storage.getUserById(userId);
        if (!user) return;

        try {
            const updatedUser = window.storage.updateUser(userId, { role: newRole });
            
            if (updatedUser) {
                // Log activity
                window.storage.logActivity(
                    window.auth.getUserId(),
                    'updated',
                    'user',
                    `Rol de usuario "${user.name}" cambiado a ${this.getRoleText(newRole)}`
                );

                window.auth.showNotification('Rol de usuario actualizado exitosamente', 'success');
                this.loadUsers();
            }
        } catch (error) {
            window.auth.showNotification('Error al actualizar el rol', 'error');
        }
    }

    // Bulk operations
    async bulkDeleteUsers(userIds) {
        if (!window.auth.isAdmin()) {
            window.auth.showNotification('Solo los administradores pueden realizar operaciones en lote', 'error');
            return;
        }

        const currentUserId = window.auth.getUserId();
        const validIds = userIds.filter(id => id !== currentUserId);

        if (validIds.length === 0) {
            window.auth.showNotification('No hay usuarios válidos para eliminar', 'error');
            return;
        }

        if (!confirm(`¿Estás seguro de que quieres eliminar ${validIds.length} usuarios?`)) {
            return;
        }

        try {
            let deletedCount = 0;
            
            for (const userId of validIds) {
                const success = window.storage.deleteUser(userId);
                if (success) deletedCount++;
            }

            // Log activity
            window.storage.logActivity(
                window.auth.getUserId(),
                'bulk_deleted',
                'user',
                `${deletedCount} usuarios eliminados en lote`
            );

            window.auth.showNotification(`${deletedCount} usuarios eliminados exitosamente`, 'success');
            this.loadUsers();

        } catch (error) {
            window.auth.showNotification('Error en la operación en lote', 'error');
        }
    }

    // Export user data
    exportUserData(userId) {
        const user = window.storage.getUserById(userId);
        if (!user) return null;

        const tasks = window.storage.getTasksByAssignee(userId);
        const projects = window.storage.getProjects().filter(p => p.createdBy === userId);
        const activities = window.storage.getActivityLogs().filter(a => a.userId === userId);

        return {
            user: { ...user, password: undefined }, // Remove password
            tasks,
            projects,
            activities: activities.slice(0, 100), // Limit activities
            exportDate: new Date().toISOString()
        };
    }
}

// Global functions for easy access
window.openUserModal = function() {
    if (window.users) {
        window.users.openUserModal();
    }
};

window.editUser = function(userId) {
    if (window.users) {
        window.users.editUser(userId);
    }
};

window.deleteUser = function(userId) {
    if (window.users) {
        window.users.deleteUser(userId);
    }
};

window.toggleUserStatus = function(userId) {
    if (window.users) {
        window.users.toggleUserStatus(userId);
    }
};

window.showProfile = function() {
    if (window.users) {
        window.users.showProfileModal();
    }
};

window.changePassword = function() {
    if (window.users) {
        window.users.showPasswordModal();
    }
};

// Initialize users manager
window.users = new UsersManager();

console.log('👥 Users management initialized');
