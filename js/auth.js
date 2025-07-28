// CoreTask - Authentication Management

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
        this.init();
    }

    init() {
        // Check for existing session
        this.loadSession();
        
        // Setup login form
        this.setupLoginForm();
        
        // Setup user menu
        this.setupUserMenu();
        
        // Check session periodically
        setInterval(() => this.checkSession(), 60000); // Every minute
    }

    setupLoginForm() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Pre-fill admin credentials for demo
        const emailField = document.getElementById('login-email');
        const passwordField = document.getElementById('login-password');
        
        if (emailField) emailField.value = 'gabritorres281096@gmail.com';
        if (passwordField) passwordField.value = '290719Lucia';
    }

    setupUserMenu() {
        const userMenuBtn = document.getElementById('user-menu-btn');
        const userMenu = document.getElementById('user-menu');
        
        if (userMenuBtn && userMenu) {
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userMenu.classList.toggle('hidden');
            });

            // Close menu when clicking outside
            document.addEventListener('click', () => {
                userMenu.classList.add('hidden');
            });
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const errorDiv = document.getElementById('login-error');
        
        // Show loading
        this.setLoginLoading(true);
        this.hideError();
        
        try {
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Validate credentials
            const user = window.storage.getUserByEmail(email);
            
            if (!user || user.password !== password) {
                throw new Error('Credenciales incorrectas');
            }
            
            if (user.status !== 'active') {
                throw new Error('Cuenta desactivada');
            }
            
            // Update last login
            window.storage.updateUser(user.id, {
                lastLogin: new Date().toISOString()
            });
            
            // Log activity
            window.storage.logActivity(
                user.id,
                'login',
                'user',
                `Usuario ${user.name} inició sesión`
            );
            
            // Set session
            this.setSession(user);
            
            // Show success and redirect
            this.showNotification('¡Bienvenido de vuelta!', 'success');
            
            setTimeout(() => {
                this.showApp();
            }, 500);
            
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.setLoginLoading(false);
        }
    }

    setSession(user) {
        this.currentUser = user;
        
        // Store session with expiration
        const sessionData = {
            user: user,
            timestamp: Date.now(),
            expires: Date.now() + this.sessionTimeout
        };
        
        localStorage.setItem('coretask_session', JSON.stringify(sessionData));
        
        // Update UI
        this.updateUserInfo();
        this.updateUserRole();
    }

    loadSession() {
        try {
            const sessionData = JSON.parse(localStorage.getItem('coretask_session'));
            
            if (sessionData && sessionData.expires > Date.now()) {
                this.currentUser = sessionData.user;
                this.updateUserInfo();
                this.updateUserRole();
                
                // Show app immediately if valid session
                if (this.currentUser) {
                    setTimeout(() => this.showApp(), 100);
                    return true;
                }
            } else {
                // Clear expired session
                this.clearSession();
            }
        } catch (error) {
            console.error('Session load error:', error);
            this.clearSession();
        }
        
        return false;
    }

    clearSession() {
        this.currentUser = null;
        localStorage.removeItem('coretask_session');
        this.updateUserInfo();
        this.updateUserRole();
    }

    checkSession() {
        if (!this.currentUser) return;
        
        try {
            const sessionData = JSON.parse(localStorage.getItem('coretask_session'));
            
            if (!sessionData || sessionData.expires <= Date.now()) {
                this.showNotification('Sesión expirada. Por favor, inicia sesión nuevamente.', 'warning');
                this.logout();
            }
        } catch (error) {
            console.error('Session check error:', error);
            this.logout();
        }
    }

    updateUserInfo() {
        const userNameElement = document.getElementById('user-name');
        if (userNameElement && this.currentUser) {
            userNameElement.textContent = this.currentUser.name;
        }
    }

    updateUserRole() {
        const body = document.body;
        
        // Remove existing role classes
        body.classList.remove('admin', 'manager', 'user');
        
        if (this.currentUser) {
            // Add role class to body for conditional styling
            body.classList.add(this.currentUser.role);
        }
    }

    logout() {
        if (this.currentUser) {
            // Log activity
            window.storage.logActivity(
                this.currentUser.id,
                'logout',
                'user',
                `Usuario ${this.currentUser.name} cerró sesión`
            );
        }
        
        this.clearSession();
        this.showLogin();
        this.showNotification('Sesión cerrada correctamente', 'success');
    }

    showLogin() {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app').classList.add('hidden');
        
        // Clear form
        document.getElementById('login-form').reset();
        this.hideError();
        
        // Focus on email field
        setTimeout(() => {
            document.getElementById('login-email').focus();
        }, 100);
    }

    showApp() {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        
        // Initialize app data
        if (window.app && window.app.init) {
            window.app.init();
        }
    }

    setLoginLoading(loading) {
        const loginText = document.getElementById('login-text');
        const loginSpinner = document.getElementById('login-spinner');
        const submitBtn = document.querySelector('#login-form button[type="submit"]');
        
        if (loading) {
            loginText.classList.add('hidden');
            loginSpinner.classList.remove('hidden');
            submitBtn.disabled = true;
        } else {
            loginText.classList.remove('hidden');
            loginSpinner.classList.add('hidden');
            submitBtn.disabled = false;
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('login-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
        }
    }

    hideError() {
        const errorDiv = document.getElementById('login-error');
        if (errorDiv) {
            errorDiv.classList.add('hidden');
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notifications');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">${message}</div>
            <button class="notification-close" onclick="this.parentElement.remove()">&times;</button>
        `;
        
        container.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // User management methods
    async changePassword(currentPassword, newPassword) {
        if (!this.currentUser) {
            throw new Error('No hay sesión activa');
        }
        
        // Validate current password
        const user = window.storage.getUserById(this.currentUser.id);
        if (!user || user.password !== currentPassword) {
            throw new Error('Contraseña actual incorrecta');
        }
        
        // Update password
        const updated = window.storage.updateUser(this.currentUser.id, {
            password: newPassword
        });
        
        if (updated) {
            // Update current session
            this.currentUser.password = newPassword;
            this.setSession(this.currentUser);
            
            // Log activity
            window.storage.logActivity(
                this.currentUser.id,
                'updated',
                'user',
                'Contraseña actualizada'
            );
            
            return true;
        }
        
        throw new Error('Error al actualizar la contraseña');
    }

    async updateProfile(updates) {
        if (!this.currentUser) {
            throw new Error('No hay sesión activa');
        }
        
        const updated = window.storage.updateUser(this.currentUser.id, updates);
        
        if (updated) {
            // Update current session
            Object.assign(this.currentUser, updates);
            this.setSession(this.currentUser);
            this.updateUserInfo();
            
            // Log activity
            window.storage.logActivity(
                this.currentUser.id,
                'updated',
                'user',
                'Perfil actualizado'
            );
            
            return updated;
        }
        
        throw new Error('Error al actualizar el perfil');
    }

    // Permission checking methods
    isLoggedIn() {
        return this.currentUser !== null;
    }

    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }

    isManager() {
        return this.currentUser && ['admin', 'manager'].includes(this.currentUser.role);
    }

    canEditUser(userId) {
        if (!this.currentUser) return false;
        return this.isAdmin() || this.currentUser.id === parseInt(userId);
    }

    canEditProject(project) {
        if (!this.currentUser) return false;
        return this.isManager() || project.createdBy === this.currentUser.id;
    }

    canEditTask(task) {
        if (!this.currentUser) return false;
        return this.isManager() || 
               task.createdBy === this.currentUser.id || 
               task.assigneeId === this.currentUser.id;
    }

    // Get current user info
    getCurrentUser() {
        return this.currentUser;
    }

    getUserId() {
        return this.currentUser ? this.currentUser.id : null;
    }

    getUserRole() {
        return this.currentUser ? this.currentUser.role : null;
    }

    getUserName() {
        return this.currentUser ? this.currentUser.name : null;
    }

    getUserEmail() {
        return this.currentUser ? this.currentUser.email : null;
    }
}

// Global auth functions for easy access
window.showProfile = function() {
    if (window.app && window.app.showProfileModal) {
        window.app.showProfileModal();
    }
};

window.changePassword = function() {
    if (window.app && window.app.showPasswordModal) {
        window.app.showPasswordModal();
    }
};

window.logout = function() {
    if (window.auth) {
        window.auth.logout();
    }
};

// Initialize authentication manager
window.auth = new AuthManager();

// Show initial screen
setTimeout(() => {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        if (!window.auth.isLoggedIn()) {
            window.auth.showLogin();
        }
    }
}, 1000);

console.log('🔐 Authentication system initialized');
