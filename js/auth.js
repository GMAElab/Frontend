document.addEventListener('DOMContentLoaded', () => {
    
    const loginForm = document.getElementById('login-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            UI.showFormFeedback('login-feedback', '', false);
            UI.setButtonLoading('btn-login', true);

            try {
                const formData = new URLSearchParams();
                formData.append('username', email);
                formData.append('password', password);

                const response = await fetch(`${window.API_URL}/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    credentials: 'include',
                    body: formData
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('user_data', JSON.stringify(data.user));
                    window.location.href = 'dashboard.html';
                } else {
                    const errorMessage = data.detail || 'Invalid credentials. Please try again.';
                    UI.showFormFeedback('login-feedback', errorMessage, true);
                }
            } catch (error) {
                UI.showFormFeedback('login-feedback', 'Connection error. Please check your internet connection.', true);
            } finally {
                UI.setButtonLoading('btn-login', false);
            }
        });
    }

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            api.logout();
        });
    }

    const userString = localStorage.getItem('user_data');
    if (userString) {
        const user = JSON.parse(userString);

        const menuChefia = document.getElementById('menu-chefia-pta');
        if (menuChefia && (user.role === 'coordenador' || user.role === 'admin')) {
            menuChefia.style.display = 'block';
        }

        const menuAdmin = document.getElementById('menu-admin');
        if (menuAdmin && user.role === 'admin') {
            menuAdmin.style.display = 'block';
        }
    }
});