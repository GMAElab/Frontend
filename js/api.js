// 1. Definição da URL base da API (Render)
// Certifique-se de que não há uma barra "/" ao final do link
const API_URL = "https://api-ic.onrender.com";

/**
 * Utilitário central de comunicação com o Backend (SGCI)
 */
const api = {
    // Gerenciamento do Token JWT no navegador
    setToken: (token) => localStorage.setItem("ic_token", token),
    getToken: () => localStorage.getItem("ic_token"),
    logout: () => {
        localStorage.removeItem("ic_token");
        window.location.href = "index.html";
    },

    /**
     * Função para chamadas que EXIGEM login (GET, POST de equipamentos, etc)
     */
    fetchProtected: async (endpoint, options = {}) => {
        const token = api.getToken();
        
        // Garante que o caminho comece com "/"
        const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        
        if (!token) {
            console.warn("Nenhum token encontrado. Redirecionando para login...");
            window.location.href = "index.html";
            return;
        }

        const headers = {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            ...options.headers
        };

        try {
            const response = await fetch(`${API_URL}${path}`, { 
                ...options, 
                headers 
            });

            // Se o token expirou (401), desloga automaticamente
            if (response.status === 401) {
                api.logout();
            }

            return response;
        } catch (error) {
            console.error("Erro na comunicação protegida:", error);
            throw error;
        }
    }
};

// Tornar a URL disponível globalmente para o auth.js
window.API_URL = API_URL;