const API_URL = 'https://api-ic.onrender.com'; 

window.api = {
    setToken: (token) => {
        localStorage.setItem('jwt_token', token);
    },
    getToken: () => {
        return localStorage.getItem('jwt_token');
    },
    logout: () => {
        localStorage.removeItem('jwt_token');
        window.location.href = 'index.html';
    },

    fetchProtected: async (endpoint, options = {}) => {
        const token = localStorage.getItem('jwt_token');

        if (!token) {
            window.api.logout();
            throw new Error('Unauthorized: No token found');
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...(options.headers || {}) 
        };
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });

        if (response.status === 401) {
            window.api.logout();
            throw new Error('Session expired');
        }

        return response;
    }
};

window.API_URL = API_URL;