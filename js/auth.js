/**
 * Authentication Controller
 * Handles the login form submission, API communication, and token storage.
 */

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    
    // Safety check: Only run this script if we are on the login page
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevents the page from reloading

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        // 1. Clear previous errors and show loading spinner (Nielsen's Heuristic #1)
        UI.showFormFeedback('login-feedback', '', false);
        UI.setButtonLoading('btn-login', true);

        try {
            // FastAPI's OAuth2PasswordRequestForm expects URLSearchParams, not JSON
            const formData = new URLSearchParams();
            formData.append('username', email); // Backend strictly requires 'username'
            formData.append('password', password);

            const response = await fetch(`${window.API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                // Success: Save the token and redirect to the Dashboard
                api.setToken(data.access_token);
                window.location.href = 'dashboard.html';
            } else {
                // Handle API Rejections (e.g., 401 Unauthorized, 403 Forbidden)
                const errorMessage = data.detail || 'Invalid credentials. Please try again.';
                UI.showFormFeedback('login-feedback', errorMessage, true);
            }
        } catch (error) {
            console.error('Login error:', error);
            // Fallback for network errors or server being completely offline
            UI.showFormFeedback('login-feedback', 'Connection error. Please check your internet connection.', true);
        } finally {
            // 2. Always turn off the loading spinner, regardless of success or error
            UI.setButtonLoading('btn-login', false);
        }
    });

    // Logout functionality (Listens globally across pages)
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            api.logout();
        });
    }
});