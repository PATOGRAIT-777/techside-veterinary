// public_html/js/session.js

(function() {
    console.log("🔒 Sistema de Seguridad: Verificando sesión...");

    // 1. Leer datos del usuario con las claves CORRECTAS
    const userStr = localStorage.getItem('user'); 
    const token = localStorage.getItem('accessToken'); 
    
    // Obtener nombre del archivo actual
    const path = window.location.pathname;
    let page = path.split("/").pop();
    if (page === "") page = "index.html"; // Por si la ruta es solo "/"

    // Páginas PÚBLICAS (No requieren login)
    const publicPages = ['initPag.html', 'index.html', 'registro.html', 'formAgregar.html'];

    // --- CASO 1: NO LOGUEADO ---
    if (!token && !publicPages.includes(page)) {
        console.warn("⛔ Usuario no identificado. Redirigiendo al login.");
        alert("Debes iniciar sesión para ver esta página.");
        // Redirección relativa al directorio actual
        window.location.href = 'initPag.html'; 
        return;
    }

    // --- CASO 2: LOGUEADO ---
    if (userStr) {
        let user;
        try {
            user = JSON.parse(userStr);
        } catch (e) {
            console.error("Error leyendo usuario", e);
            cerrarSesionDirecta();
            return;
        }

        // A. Protección de Rutas ADMIN
        // Lista de páginas que SOLO un admin o médico puede ver
        const adminPages = [
            'dashboard.html', 
            'pacientes.html', 
            'inventario.html', 
            'ordenes.html', 
            'regUserAdmin.html',
            'regPetAdmin.html'
        ];
        
        // Si la página actual es de admin Y el usuario es 'cliente'
        if (adminPages.includes(page) && user.rol === 'cliente') {
            alert("⛔ Acceso Denegado: Esta área es solo para personal.");
            window.location.href = 'regUser.html'; // Lo mandamos a su cuenta de cliente
            return;
        }

        // B. Mostrar Nombre en el Header (Opcional)
        const display = document.getElementById('user-name-display');
        if (display) {
            // Se utiliza nombreCompleto tal como viene de la base de datos de Persona
            display.textContent = user.nombreCompleto || user.email;
        }
    }

})();

// Función interna para matar sesión corrupta sin preguntar
function cerrarSesionDirecta() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    window.location.href = 'initPag.html';
}

// Función global para cerrar sesión (Úsala en tu botón del menú)
function cerrarSesion() {
    if(confirm("¿Seguro que deseas salir?")) {
        cerrarSesionDirecta();
    }
}