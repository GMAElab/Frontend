document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    
    if (!registerForm) return;

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const name = document.getElementById('nome').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        UI.showFormFeedback('register-feedback', '', false);
        if (password !== confirmPassword) {
            UI.showFormFeedback('register-feedback', 'Passwords do not match.', true);
            document.getElementById('confirm-password').focus();
            return;
        }

        if (password.length < 6) {
            UI.showFormFeedback('register-feedback', 'Password must be at least 6 characters long.', true);
            document.getElementById('password').focus();
            return;
        }

        UI.setButtonLoading('btn-register', true);

        try {
            const payload = {
                nome: name,
                email: email,
                senha: password
            };

            const response = await fetch(`${window.API_URL}/solicitar-register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                UI.showFormFeedback('register-feedback', 'Request sent successfully! Waiting for Admin approval.', false);
                registerForm.reset(); 
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 3000);
            } else {
                const errorMessage = data.detail || 'Registration failed. Please try again.';
                UI.showFormFeedback('register-feedback', errorMessage, true);
            }
        } catch (error) {
            console.error('Registration error:', error);
            UI.showFormFeedback('register-feedback', 'Connection error. Please try again later.', true);
        } finally {
            UI.setButtonLoading('btn-register', false);
        }
    });
});