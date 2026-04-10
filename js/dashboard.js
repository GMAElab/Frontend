document.addEventListener('DOMContentLoaded', () => {

    const token = api.getToken();
    if (!token) {
        console.warn("Acesso negado: Token não encontrado. Redirecionando...");
        window.location.href = 'index.html';
        return;
    }

    initializeUserProfile();
    const userString = localStorage.getItem('user_data');
    if (userString) {
        const user = JSON.parse(userString);
        if (user.role === 'admin') {
            const btnAdmin = document.getElementById('menu-admin');
            if (btnAdmin) btnAdmin.style.display = 'block';
        }
    }

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            api.logout();
        });
    }

    console.log("Sistema LEQM Hub inicializado com sucesso.");
});

function initializeUserProfile() {
    const userGreeting = document.getElementById('user-greeting');
    const userAvatar = document.querySelector('.avatar');

    // Tenta pegar o nome do usuário salvo
    const savedName = localStorage.getItem('user_name') || 'Pesquisador';

    if (userGreeting) {
        userGreeting.textContent = `Olá, ${savedName}`;
    }

    if (userAvatar && savedName !== 'Pesquisador') {
        userAvatar.textContent = savedName.charAt(0).toUpperCase();
    }
}