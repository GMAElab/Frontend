const API_URL = "https://api-ic.onrender.com";

const api = {
    setToken: (token) => localStorage.setItem("ic_token", token),
    getToken: () => localStorage.getItem("ic_token"),
    logout: () => {
        localStorage.removeItem("ic_token");
        window.location.href = "index.html";
    },
    fetchProtected: async (endpoint, options = {}) => {
        const token = api.getToken();
        
        const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        
        if (!token) {
            console.error("Acesso negado: Nenhum token encontrado.");
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

            if (response.status === 401) {
                api.logout();
            }

            return response;
        } catch (error) {
            console.error("Erro na comunicação com o servidor:", error);
            throw error;
        }
    }
};
