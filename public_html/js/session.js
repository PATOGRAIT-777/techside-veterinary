// public_html/js/session.js

(function() {
    console.log("🔒 Sistema de Seguridad: Verificando sesión...");

    // 1. Leer datos del usuario
    const userStr = localStorage.getItem('usuario'); // Ojo: en tu login usabas 'usuario' o 'user', verifica cual es
    const token = localStorage.getItem('token');
    
    // Obtener nombre del archivo actual
    const path = window.location.pathname;
    const page = path.split("/").pop();

    // Páginas PÚBLICAS (No requieren login)
    const publicPages = ['initPag.html', 'index.html', 'registro.html', 'formAgregar.html'];

    // --- CASO 1: NO LOGUEADO ---
    if (!token && !publicPages.includes(page)) {
        console.warn("⛔ Usuario no identificado. Redirigiendo al login.");
        alert("Debes iniciar sesión para ver esta página.");
        // Ajusta la ruta ../ o ./ segun donde esté tu archivo
        window.location.href = '../admin/initPag.html'; 
        return;
    }

    // --- CASO 2: LOGUEADO ---
    if (userStr) {
        let user;
        try {
            user = JSON.parse(userStr);
        } catch (e) {
            console.error("Error leyendo usuario", e);
            localStorage.clear();
            window.location.href = '../admin/initPag.html';
            return;
        }

        // A. Protección de Rutas ADMIN
        // Lista de páginas que SOLO un admin o médico puede ver
        const adminPages = ['dashboard.html', 'pacientes.html', 'inventario.html', 'ordenes.html'];
        
        // Si la página actual es de admin Y el usuario es 'cliente'
        if (adminPages.includes(page) && user.rol === 'cliente') {
            alert("⛔ Acceso Denegado: Esta área es solo para personal.");
            window.location.href = '../admin/citas.html'; // Lo mandamos a una página segura para clientes
            return;
        }

        // B. Mostrar Nombre en el Header (Opcional)
        // Si tienes un elemento <span id="user-name-display"></span> en tu HTML
        const display = document.getElementById('user-name-display');
        if (display) {
            display.textContent = user.nombre_completo || user.email;
        }
    }

})();

// Función global para cerrar sesión (Úsala en tu botón del menú)
function cerrarSesion() {
    if(confirm("¿Seguro que deseas salir?")) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        localStorage.removeItem('user');
        window.location.href = '../admin/initPag.html';
    }
}

