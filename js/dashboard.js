/**
 * Dashboard Controller
 * Inicializa a sessão, verifica segurança e carrega dados básicos do perfil.
 */

document.addEventListener('DOMContentLoaded', () => {

    const token = api.getToken();
    if (!token) {
        console.warn("Acesso negado: Token não encontrado. Redirecionando...");
        window.location.href = 'index.html';
        return;
    }

    initializeUserProfile();

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            api.logout();
        });
    }

    console.log("Sistema LEQM Hub inicializado com sucesso.");
});

/**
 * Busca dados do usuário ou extrai do token para exibir a saudação
 */
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