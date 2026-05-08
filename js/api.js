const API_URL = 'https://api-ic.onrender.com'; 

window.api = {
    setToken: (token) => localStorage.setItem('jwt_token', token),
    getToken: () => localStorage.getItem('jwt_token'),
    logout: () => {
        localStorage.removeItem('jwt_token');
        window.location.href = 'index.html';
    },

    fetchProtected: async (endpoint, options = {}) => {
        const token = localStorage.getItem('jwt_token');
        if (!token) {
            window.api.logout();
            throw new Error('Unauthorized');
        }

        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...(options.headers || {}) 
        };

        try {
            const response = await fetch(`${API_URL}/${cleanEndpoint}`, {
                ...options,
                headers
            });

            if (response.status === 401) {
                window.api.logout();
            }
            
            return response;
        } catch (error) {
            console.error("Erro na comunicação com a API:", error);
            throw error;
        }
    }
};

window.API_URL = API_URL;