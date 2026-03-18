document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnLogin');
    const msg = document.getElementById('message');
    btn.innerText = "Autenticando...";
    btn.disabled = true;

    const formData = new URLSearchParams();
    formData.append('username', document.getElementById('username').value);
    formData.append('password', document.getElementById('password').value);

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            api.setToken(data.access_token);
            window.location.href = "dashboard.html";
        } else {
            msg.innerText = data.detail || "Erro ao entrar. Verifique seus dados.";
        }
    } catch (err) {
        msg.innerText = "Servidor offline. Tente novamente mais tarde.";
    } finally {
        btn.innerText = "Entrar no Sistema";
        btn.disabled = false;
    }
});