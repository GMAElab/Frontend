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

/**
 * DEIXAR O SISTEMA SEMPRE ATIVO PARA EVITAR HIBERNAÇÃO DO RENDER (SISTEMA)
 */
function startKeepAlive() {
    const INTERVAL = 10 * 60 * 1000; 

    setInterval(async () => {
        try {
            console.log("🛰️ LEQM Hub: Mantendo conexão com o servidor ativa...");
            const response = await fetch(`${window.API_URL}/`); 
            const data = await response.json();
            console.log("✅ Servidor respondendo:", data.status);
        } catch (error) {
            console.error("⚠️ Falha ao contactar servidor:", error);
        }
    }, INTERVAL);
}
document.addEventListener('DOMContentLoaded', startKeepAlive);