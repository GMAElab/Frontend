document.addEventListener('DOMContentLoaded', () => {

    const token = window.api ? window.api.getToken() : localStorage.getItem('access_token'); 
    if (!token) {
        console.warn("Acesso negado: Token não encontrado. Redirecionando...");
        window.location.href = 'index.html';
        return;
    }

    initializeUserProfile();

    // Toggle sidebar for mobile
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    const userString = localStorage.getItem('user_data');
    if (userString) {
        const user = JSON.parse(userString);
        const btnAdmin = document.getElementById('menu-admin');
        
        if (btnAdmin) {
            if (user.role === 'admin') {
                btnAdmin.style.display = 'block';
            } else {
                btnAdmin.remove(); 
            }
        }
    }

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if (window.api) window.api.logout();
            else {
                localStorage.clear();
                window.location.href = 'index.html';
            }
        });
    }

    configurarMenuLateral();

    console.log("Sistema LEQM Hub inicializado com sucesso.");
});

// ==========================================
// FUNÇÕES AUXILIARES GLOBAIS
// ==========================================

function initializeUserProfile() {
    const userGreeting = document.getElementById('user-greeting');
    const userAvatar = document.querySelector('.avatar');

    const savedName = localStorage.getItem('user_name') || 'Pesquisador';

    if (userGreeting) {
        userGreeting.textContent = `Olá, ${savedName}`;
    }

    if (userAvatar && savedName !== 'Pesquisador') {
        userAvatar.textContent = savedName.charAt(0).toUpperCase();
    }
}

window.toggleMenu = function() {
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) sidebar.classList.toggle('collapsed');
};

function configurarMenuLateral() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sidebar = document.getElementById('app-sidebar');
    
    if (!sidebar) return;

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.add('collapsed');
            }
        });
    });

    if (window.innerWidth <= 768) {
        sidebar.classList.add('collapsed');
    }
}

// segurança

window.escapeHTML = function(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};