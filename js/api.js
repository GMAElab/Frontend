const API_URL = "https://api-ic.onrender.com"; 

const api = {
    setToken: (token) => localStorage.setItem("ic_token", token),
    getToken: () => localStorage.getItem("ic_token"),
    logout: () => {
        localStorage.removeItem("ic_token");
    },

    fetchProtected: async (endpoint, options = {}) => {
        const token = api.getToken();
        const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        
        const headers = {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            ...options.headers
        };

        return fetch(`${API_URL}${path}`, { ...options, headers });
    }
};