// Configuração da URL base da API
const API_URL = 'https://api-ic.onrender.com'; 

window.api = {
    // Gerenciamento de Token
    setToken: (token) => localStorage.setItem('jwt_token', token),
    getToken: () => localStorage.getItem('jwt_token'),
    logout: () => {
        localStorage.removeItem('jwt_token');
        window.location.href = 'index.html';
    },

    // Wrapper para requisições autenticadas
    fetchProtected: async (endpoint, options = {}) => {
        const token = localStorage.getItem('jwt_token');
        if (!token) {
            window.api.logout();
            throw new Error('Unauthorized');
        }

        // Normalização de endpoint para evitar barras duplas
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...(options.headers || {}) 
        };

        const response = await fetch(`${API_URL}/${cleanEndpoint}`, {
            ...options,
            headers
        });

        if (response.status === 401) window.api.logout();
        
        return response;
    }
};

window.API_URL = API_URL;