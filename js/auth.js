let tempUserIdPara2FA = null; 

function verificarBloqueioDeCookies() {
    try {
        document.cookie = "teste_cookies=1; SameSite=None; Secure";
        const cookiesAtivos = document.cookie.indexOf("teste_cookies=") !== -1;
        
        if (!cookiesAtivos) {
            exibirAvisoCookies();
            return;
        }
        
        document.cookie = "teste_cookies=; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure";
    } catch (e) {
        exibirAvisoCookies();
    }
}

function exibirAvisoCookies() {
    const loginCard = document.querySelector('.login-card') || document.body;
    
    const avisoHtml = `
        <div id="aviso-cookie-restrito" style="background: #FFFBEB; border: 1px solid #F59E0B; padding: 15px; border-radius: 6px; margin-bottom: 20px; text-align: left; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <h4 style="color: #B45309; margin: 0 0 5px 0; display: flex; align-items: center; gap: 8px;">
                ⚠️ Navegador Restrito Detectado
            </h4>
            <p style="color: #78350F; font-size: 13px; margin: 0; line-height: 1.5;">
                Você está em uma <strong>Guia Anônima</strong> ou usando um navegador que bloqueia conexões externas (como Safari ou Brave). 
                <br><br>
                Para conseguir entrar no LEQM Hub, clique no ícone de <strong>olho riscado ou escudo</strong> na barra de endereços do seu navegador e selecione <strong>"Permitir cookies de terceiros"</strong>. Em seguida, atualize a página.
            </p>
        </div>
    `;
    
    loginCard.insertAdjacentHTML('afterbegin', avisoHtml);
}

document.addEventListener('DOMContentLoaded', () => {
    verificarBloqueioDeCookies();
    
    // ==========================================
    // 1. FLUXO DE LOGIN NORMAL
    // ==========================================
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
                    if (data.requires_2fa) {
                        tempUserIdPara2FA = data.temp_user_id; 
                        document.getElementById('login-form').classList.add('hidden');
                        document.getElementById('2fa-form').classList.remove('hidden');
                        document.getElementById('codigo-2fa').focus();
                        return; 
                    }
                    const verifyResponse = await fetch(`${window.API_URL}/usuarios/equipe`, {
                        method: 'GET',
                        credentials: 'include'
                    });

                    if (verifyResponse.status === 401) {
                        if (window.api && window.api.exibirModalErroCookies) {
                            window.api.exibirModalErroCookies();
                        } else {
                            UI.showFormFeedback('login-feedback', 'Acesso negado: Seu navegador bloqueou os cookies de segurança.', true);
                        }
                        return; 
                    }

                    localStorage.setItem('user_data', JSON.stringify(data.user));
                    window.location.href = 'dashboard.html';
                } else {
                    const errorMessage = data.detail || 'Credenciais inválidas. Tente novamente.';
                    UI.showFormFeedback('login-feedback', errorMessage, true);
                }
            } catch (error) {
                UI.showFormFeedback('login-feedback', 'Connection error. Please check your internet connection.', true);
            } finally {
                UI.setButtonLoading('btn-login', false);
            }
        });
    }

    // ==========================================
    // 2. FLUXO DO 2FA
    // ==========================================
    const form2FA = document.getElementById('2fa-form');
    if (form2FA) {
        form2FA.addEventListener('submit', async (event) => {
            event.preventDefault();
            const codigo = document.getElementById('codigo-2fa').value.trim();
            UI.showFormFeedback('2fa-feedback', '', false);
            UI.setButtonLoading('btn-2fa', true);

            try {
                const response = await fetch(`${window.API_URL}/login/2fa`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        temp_user_id: tempUserIdPara2FA,
                        codigo: codigo
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    const verifyResponse = await fetch(`${window.API_URL}/usuarios/equipe`, {
                        method: 'GET',
                        credentials: 'include'
                    });

                    if (verifyResponse.status === 401) {
                        if (window.api && window.api.exibirModalErroCookies) {
                            window.api.exibirModalErroCookies();
                        } else {
                            UI.showFormFeedback('2fa-feedback', 'Acesso negado: Seu navegador bloqueou os cookies.', true);
                        }
                        return;
                    }

                    localStorage.setItem('user_data', JSON.stringify(data.user));
                    window.location.href = 'dashboard.html';
                } else {
                    UI.showFormFeedback('2fa-feedback', data.detail || 'Código inválido ou expirado.', true);
                    document.getElementById('codigo-2fa').value = '';
                    document.getElementById('codigo-2fa').focus();
                }
            } catch (error) {
                UI.showFormFeedback('2fa-feedback', 'Erro de conexão com o servidor.', true);
            } finally {
                UI.setButtonLoading('btn-2fa', false);
            }
        });
    }

    // ==========================================
    // MENU E LOGOUT
    // ==========================================
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