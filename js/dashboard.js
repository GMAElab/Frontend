/**
 * Dashboard Controller
 * Inicializa a sessão, verifica segurança e carrega dados básicos do perfil.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificação de Segurança (Guarda de Rota)
    // Se não houver token, o usuário não deve estar aqui.
    const token = api.getToken();
    if (!token) {
        console.warn("Acesso negado: Token não encontrado. Redirecionando...");
        window.location.href = 'index.html';
        return;
    }

    // 2. Inicialização de dados do usuário
    // Aqui podemos buscar informações do usuário logado para exibir no topo
    initializeUserProfile();

    // 3. Listener Global para Logout
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            api.logout();
        });
    }

    // 4. Iniciar na tela de boas-vindas
    // Opcional: Garante que a primeira aba esteja marcada como ativa visualmente
    console.log("Sistema LEQM Hub inicializado com sucesso.");
});

/**
 * Busca dados do usuário ou extrai do token para exibir a saudação
 */
function initializeUserProfile() {
    const userGreeting = document.getElementById('user-greeting');
    const userAvatar = document.querySelector('.avatar');

    // Tenta recuperar o nome salvo no login (se você salvou no localStorage)
    const savedName = localStorage.getItem('user_name') || 'Pesquisador';

    if (userGreeting) {
        userGreeting.textContent = `Olá, ${savedName}`;
    }

    if (userAvatar && savedName !== 'Pesquisador') {
        userAvatar.textContent = savedName.charAt(0).toUpperCase();
    }
}