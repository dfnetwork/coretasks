### **Discord Webhooks**

1. **Crear webhook en Discord**:
   - Ve a tu servidor Discord
   - Configuración del canal → Integraciones → Webhooks
   - Crear Webhook → Copiar URL

2. **Configurar en CoreTask**:
   - Login → Integraciones → Discord
   - Pegar URL del webhook
   - Seleccionar eventos a notificar
   - Guardar y probar

3. **Eventos disponibles**:
   - ✅ Nueva tarea creada
   - ✅ Tarea asignada
   - ✅ Tarea completada
   - ✅ Nuevo proyecto creado

### **Personalización**

**Cambiar credenciales de admin**:
```javascript
// Editar en js/storage.js línea ~15
{
    email: 'tu-nuevo-email@ejemplo.com',
    password: 'tu-nueva-contraseña',
    name: 'Tu Nombre',
    role: 'admin'
}
```

**Cambiar nombre de la aplicación**:
```html
<!-- Editar en index.html -->
<title>Tu Nombre - Project Management</title>
<h1>Tu Nombre</h1>
```

**Personalizar colores** (en css/styles.css):
```css
:root {
    --primary-black: #000000;    /* Color principal */
    --primary-white: #ffffff;    /* Color secundario */
    --gray-900: #121212;         /* Fondo principal */
}
```

## 📱 **Compatibilidad**

**Navegadores soportados**:
- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+

**Dispositivos**:
- ✅ Desktop (Windows, Mac, Linux)
- ✅ Tablet (iPad, Android)
- ✅ Móvil (iOS, Android)

## 🔒 **Seguridad**

### **Autenticación**
- Sistema de sesiones con expiración (24h)
- Validación de permisos por rol
- Protección contra XSS básica

### **Limitaciones de Hosting Estático**
- ⚠️ **Los datos están en el navegador** - No son compartidos entre usuarios
- ⚠️ **Passwords en texto plano** - En producción real se hashearian
- ⚠️ **No hay rate limiting** del servidor
- ⚠️ **Discord webhooks expuestos** - Considera usar proxy

### **Para Uso Empresarial**
Si necesitas **múltiples usuarios reales** y **datos compartidos**, considera migrar a la versión completa con backend de Node.js.

## 🎯 **Casos de Uso Perfectos**

### ✅ **Ideal para:**
- **Portfolios de desarrolladores**
- **Demos y prototipos**
- **Gestión personal de proyectos**
- **Pequeños equipos (cada uno con su instancia)**
- **Presentaciones a clientes**
- **Testing de funcionalidades**

### ❌ **No ideal para:**
- Equipos grandes con datos compartidos
- Empresas que necesitan auditoría
- Sistemas críticos de producción
- Integración con sistemas existentes

## 🚀 **Migración a Versión Completa**

Si necesitas funcionalidades enterprise:

1. **Backend con Node.js** - Base de datos real MySQL/PostgreSQL
2. **Autenticación JWT** - Sesiones seguras del servidor
3. **API REST completa** - Integración con otros sistemas
4. **Webhooks bidireccionales** - No solo Discord
5. **Sistema de archivos** - Subida de documentos
6. **Reportes avanzados** - Analytics y métricas
7. **SSO/LDAP** - Integración empresarial

## 🛠️ **Personalización Avanzada**

### **Añadir nuevos tipos de tarea**:
```javascript
// En js/storage.js, modificar la función createTask
type: 'research', // Añadir nuevo tipo
```

### **Campos personalizados**:
```javascript
// En js/storage.js
customFields: {
    client: 'Nombre del cliente',
    budget: 5000,
    complexity: 'high'
}
```

### **Nuevos estados de tarea**:
```javascript
// Modificar en múltiples archivos
status: 'blocked' // Añadir estado "bloqueado"
```

## 📊 **Métricas y Analytics**

La aplicación registra automáticamente:
- ✅ **Actividad de usuarios** (login, logout, acciones)
- ✅ **Cambios en tareas** (creación, edición, estado)
- ✅ **Estadísticas de proyectos** (progreso, completion rate)
- ✅ **Logs del sistema** (exportables)

**Exportar datos**:
- Admin → Herramientas → Exportar Datos
- Formato JSON con toda la información
- Importable en otras instancias

## 🎨 **Capturas de Pantalla**

### Dashboard Principal
![Dashboard](https://via.placeholder.com/800x400/000000/FFFFFF?text=CoreTask+Dashboard)

### Gestión de Proyectos
![Projects](https://via.placeholder.com/800x400/000000/FFFFFF?text=Projects+Management)

### Lista de Tareas
![Tasks](https://via.placeholder.com/800x400/000000/FFFFFF?text=Tasks+List)

### Integraciones Discord
![Integrations](https://via.placeholder.com/800x400/000000/FFFFFF?text=Discord+Integration)

## 🔧 **Solución de Problemas**

### **Los datos no se guardan**
- Verifica que el navegador permita LocalStorage
- Comprueba si estás en modo incógnito
- Revisa la consola del navegador (F12)

### **Discord webhooks no funcionan**
- Verifica que la URL sea correcta
- Comprueba los permisos del webhook en Discord
- Revisa la consola del navegador para errores CORS

### **La aplicación no carga**
- Verifica que todos los archivos JS estén presentes
- Comprueba errores en la consola (F12)
- Asegúrate de que el hosting soporte archivos JS

### **Problemas de responsive**
- Limpia caché del navegador
- Verifica que el viewport esté configurado
- Prueba en navegador diferente

## 📞 **Soporte**

**Para consultas técnicas**:
- 📧 Email: gabritorres281096@gmail.com
- 🐛 Issues: Crea un issue en el repositorio
- 💬 Discord: Únete al servidor de soporte

**Documentación adicional**:
- 📚 [Guía de Usuario](docs/user-guide.md)
- 🔧 [API Reference](docs/api.md)
- 🎨 [Design System](docs/design.md)

## 📈 **Roadmap**

### **v1.1 (Próximamente)**
- [ ] Comentarios en tareas
- [ ] Archivos adjuntos (base64)
- [ ] Recordatorios automáticos
- [ ] Temas de color personalizables
- [ ] Exportar a PDF

### **v1.2 (Futuro)**
- [ ] Integración Slack
- [ ] Kanban board
- [ ] Time tracking
- [ ] Gráficos avanzados
- [ ] PWA (Progressive Web App)

## 🏆 **Reconocimientos**

**Tecnologías utilizadas**:
- **Material Design** - Sistema de diseño
- **LocalStorage API** - Persistencia de datos
- **Fetch API** - Integración Discord
- **ES6+ JavaScript** - Lógica de aplicación
- **CSS Grid & Flexbox** - Layout responsive

**Inspirado en**:
- Jira - Gestión de proyectos
- GitHub Issues - Tracking de tareas
- Discord - Sistema de notificaciones

## 📜 **Licencia**

```
MIT License

Copyright (c) 2025 Gabriel Torres

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🎉 **¡Tu CoreTask está listo!**

**Para subir a hosting**:
1. Comprime la carpeta `coretask-hosting`
2. Súbela a tu hosting web
3. Accede desde tu dominio
4. ¡Disfruta tu sistema de gestión de proyectos!

**¿Necesitas ayuda?** Contacta: gabritorres281096@gmail.com

**¡Dale una ⭐ al proyecto si te ha sido útil!**
