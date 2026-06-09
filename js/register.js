document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const passwordInput = document.getElementById('password');
    const feedbackDiv = document.getElementById('register-feedback');
    
    if (!registerForm || !passwordInput) return;

    passwordInput.setAttribute('placeholder', 'Ex: Exemplo@2026 (Min. 8 caracteres)');

    passwordInput.addEventListener('input', () => {
        const pass = passwordInput.value;
        const requirements = [
            { regex: /.{8,}/, msg: "Mínimo 8 caracteres" },
            { regex: /[A-Z]/, msg: "Uma letra maiúscula" },
            { regex: /[0-9]/, msg: "Um número" },
            { regex: /[!@#$%^&*]/, msg: "Um caractere especial (@,#,!)" }
        ];

        const met = requirements.filter(r => r.regex.test(pass));
        const percent = (met.length / requirements.length) * 100;

        if (pass.length === 0) {
            UI.showFormFeedback('register-feedback', '', false);
        } else if (percent < 50) {
            UI.showFormFeedback('register-feedback', 'Senha Fraca: Adicione maiúsculas e símbolos.', true);
        } else if (percent < 100) {
            UI.showFormFeedback('register-feedback', 'Senha Média: Quase lá...', false);
            feedbackDiv.style.color = "#d97706";
        } else {
            UI.showFormFeedback('register-feedback', 'Senha Forte e Segura!', false);
            feedbackDiv.style.color = "#16a34a";
        }
    });

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const name = document.getElementById('nome').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = passwordInput.value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (password !== confirmPassword) {
            UI.showFormFeedback('register-feedback', 'As senhas não coincidem.', true);
            return;
        }

        UI.setButtonLoading('btn-register', true);

        try {
            const payload = { nome: name, email: email, senha: password };

            const response = await fetch(`${window.API_URL}/solicitar-register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                UI.showFormFeedback('register-feedback', 'Pedido enviado! Aguarde a aprovação do Admin.', false);
                feedbackDiv.style.color = "#16a34a";
                registerForm.reset(); 
                setTimeout(() => { window.location.href = 'index.html'; }, 3000);
            } else {
                let errorMsg = 'Falha no registro.';
                if (Array.isArray(data.detail)) {
                    errorMsg = data.detail[0].msg;
                } else {
                    errorMsg = data.detail || errorMsg;
                }
                UI.showFormFeedback('register-feedback', `❌ ${errorMsg}`, true);
            }
        } catch (error) {
            UI.showFormFeedback('register-feedback', 'Erro de conexão. Tente novamente.', true);
        } finally {
            UI.setButtonLoading('btn-register', false);
        }
    });
});