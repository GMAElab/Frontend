let preAuthTokenPara2FA = null;

// ==========================================
// DETECÇÃO DE COOKIES BLOQUEADOS
// ==========================================
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
    // O aviso só faz sentido na tela de login; no dashboard quebraria o layout.
    const loginCard = document.querySelector('.login-card');
    if (!loginCard) return;

    const avisoHtml = `
        <div id="aviso-cookie-restrito" class="note warn">
            <strong>Seu navegador está bloqueando o login.</strong>
            Isso acontece em guia anônima ou em navegadores que bloqueiam cookies de terceiros (Safari, Brave).
            Na barra de endereços, clique no ícone de olho riscado ou escudo, escolha <strong>Permitir cookies de terceiros</strong> e atualize a página.
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
            const emailInput = document.getElementById('email') || document.getElementById('username');
            const email = emailInput ? emailInput.value.trim() : '';
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
                        preAuthTokenPara2FA = data.pre_auth_token;
                        document.querySelector('.auth-switcher')?.classList.add('hidden');
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
                    if (data.csrf_token) localStorage.setItem('csrf_token', data.csrf_token);
                    window.location.href = 'dashboard.html';
                } else {
                    const errorMessage = data.detail || 'Credenciais inválidas. Tente novamente.';
                    UI.showFormFeedback('login-feedback', errorMessage, true);
                }
            } catch (error) {
                UI.showFormFeedback('login-feedback', 'Erro de conexão. Verifique sua internet e tente novamente.', true);
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
                        pre_auth_token: preAuthTokenPara2FA,
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
                    if (data.csrf_token) localStorage.setItem('csrf_token', data.csrf_token);
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

// ==========================================
// 3. FLUXO DE RECUPERAÇÃO DE SENHA
// ==========================================

window.mostrarEsqueciSenha = function(event) {
    event.preventDefault();
    document.querySelector('.auth-switcher')?.classList.add('hidden');
    document.getElementById('login-form')?.classList.add('hidden');
    document.getElementById('2fa-form')?.classList.add('hidden');
    document.getElementById('guest-request-form')?.classList.add('hidden');
    document.getElementById('guest-verify-form')?.classList.add('hidden');
    document.getElementById('forgot-password-form')?.classList.remove('hidden');
};

window.voltarParaLogin = function() {
    document.querySelector('.auth-switcher')?.classList.remove('hidden');
    document.getElementById('tab-auth-login')?.classList.add('active');
    document.getElementById('tab-auth-guest')?.classList.remove('active');
    document.getElementById('forgot-password-form')?.classList.add('hidden');
    document.getElementById('2fa-form')?.classList.add('hidden');
    document.getElementById('guest-request-form')?.classList.add('hidden');
    document.getElementById('guest-verify-form')?.classList.add('hidden');
    document.getElementById('login-form')?.classList.remove('hidden');
};

// ==========================================
// 4. ACESSO COMO CONVIDADO (OTP POR E-MAIL)
// ==========================================
let guestEmailAtual = '';
let guestNomeAtual = '';
let guestResendTimer = null;

function iniciarCooldownReenvio(segundos = 60) {
    const link = document.getElementById('btn-guest-resend');
    if (!link) return;
    if (guestResendTimer) clearInterval(guestResendTimer);
    let restante = segundos;
    link.style.pointerEvents = 'none';
    link.style.opacity = '0.6';
    link.textContent = `Reenviar em ${restante}s`;
    guestResendTimer = setInterval(() => {
        restante--;
        if (restante <= 0) {
            clearInterval(guestResendTimer);
            guestResendTimer = null;
            link.style.pointerEvents = '';
            link.style.opacity = '';
            link.textContent = 'Reenviar código';
        } else {
            link.textContent = `Reenviar em ${restante}s`;
        }
    }, 1000);
}

window.mostrarAcessoConvidado = function(event) {
    if (event) event.preventDefault();
    document.querySelector('.auth-switcher')?.classList.remove('hidden');
    document.getElementById('tab-auth-login')?.classList.remove('active');
    document.getElementById('tab-auth-guest')?.classList.add('active');
    document.getElementById('login-form')?.classList.add('hidden');
    document.getElementById('2fa-form')?.classList.add('hidden');
    document.getElementById('forgot-password-form')?.classList.add('hidden');
    document.getElementById('guest-verify-form')?.classList.add('hidden');
    document.getElementById('guest-request-form')?.classList.remove('hidden');
    document.getElementById('guest-nome')?.focus();
};

window.voltarEtapaConvidado = function() {
    document.getElementById('guest-verify-form')?.classList.add('hidden');
    document.getElementById('guest-request-form')?.classList.remove('hidden');
    document.getElementById('guest-email')?.focus();
};

async function enviarOtpConvidado(nome, email, feedbackId, btnId) {
    UI.showFormFeedback(feedbackId, '', false);
    if (btnId) UI.setButtonLoading(btnId, true);
    try {
        const res = await fetch(`${window.API_URL}/auth/guest/request-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ nome, email })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
            guestEmailAtual = email;
            guestNomeAtual = nome;
            const display = document.getElementById('guest-email-display');
            if (display) display.textContent = email;
            document.getElementById('guest-request-form')?.classList.add('hidden');
            document.getElementById('guest-verify-form')?.classList.remove('hidden');
            const otpInput = document.getElementById('guest-otp-code');
            if (otpInput) { otpInput.value = ''; otpInput.focus(); }
            UI.showFormFeedback('guest-verify-feedback', data.mensagem || 'Código enviado ao seu e-mail.', false);
            iniciarCooldownReenvio(60);
        } else {
            UI.showFormFeedback(feedbackId, UI.mensagemLegivel(data.detail || 'Não foi possível enviar o código.'), true);
        }
    } catch (e) {
        UI.showFormFeedback(feedbackId, 'Erro de conexão com o servidor. Tente novamente.', true);
    } finally {
        if (btnId) UI.setButtonLoading(btnId, false);
    }
}

window.reenviarCodigoConvidado = function(event) {
    if (event) event.preventDefault();
    if (!guestEmailAtual || !guestNomeAtual) {
        window.voltarEtapaConvidado();
        return;
    }
    enviarOtpConvidado(guestNomeAtual, guestEmailAtual, 'guest-verify-feedback', null);
};

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.hash === '#convidado') {
        window.mostrarAcessoConvidado();
    }

    const guestReqForm = document.getElementById('guest-request-form');
    if (guestReqForm) {
        guestReqForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nome = (document.getElementById('guest-nome')?.value || '').trim();
            const email = (document.getElementById('guest-email')?.value || '').trim();
            if (nome.length < 2) {
                UI.showFormFeedback('guest-req-feedback', 'Informe seu nome completo.', true);
                return;
            }
            await enviarOtpConvidado(nome, email, 'guest-req-feedback', 'btn-guest-request');
        });
    }

    const guestVerifyForm = document.getElementById('guest-verify-form');
    if (guestVerifyForm) {
        guestVerifyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const codigo = (document.getElementById('guest-otp-code')?.value || '').replace(/\D/g, '');
            if (codigo.length !== 6) {
                UI.showFormFeedback('guest-verify-feedback', 'Digite os 6 dígitos do código recebido por e-mail.', true);
                return;
            }
            UI.showFormFeedback('guest-verify-feedback', '', false);
            UI.setButtonLoading('btn-guest-verify', true);
            try {
                const res = await fetch(`${window.API_URL}/auth/guest/verify-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email: guestEmailAtual, codigo })
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok) {
                    const check = await fetch(`${window.API_URL}/auth/session`, {
                        method: 'GET',
                        credentials: 'include'
                    });
                    if (check.status === 401) {
                        if (window.api && window.api.exibirModalErroCookies) {
                            window.api.exibirModalErroCookies();
                        } else {
                            UI.showFormFeedback('guest-verify-feedback', 'Acesso negado: seu navegador bloqueou os cookies de sessão.', true);
                        }
                        return;
                    }
                    localStorage.setItem('user_data', JSON.stringify(data.user));
                    if (data.csrf_token) localStorage.setItem('csrf_token', data.csrf_token);
                    window.location.href = 'dashboard.html#equipments';
                } else {
                    UI.showFormFeedback('guest-verify-feedback', UI.mensagemLegivel(data.detail || 'Código inválido ou expirado.'), true);
                    const otpInput = document.getElementById('guest-otp-code');
                    if (otpInput) { otpInput.value = ''; otpInput.focus(); }
                }
            } catch (err) {
                UI.showFormFeedback('guest-verify-feedback', 'Erro de conexão com o servidor.', true);
            } finally {
                UI.setButtonLoading('btn-guest-verify', false);
            }
        });
    }
});

const forgotForm = document.getElementById('forgot-password-form');
if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('reset-email').value.trim();
        const codigo2FA = document.getElementById('reset-2fa').value.trim();
        const codigoBackup = document.getElementById('reset-backup').value.trim();
        const novaSenha = document.getElementById('reset-new-password').value;

        if (!codigo2FA && !codigoBackup) {
            UI.showFormFeedback('reset-feedback', 'Preencha o código do Autenticador ou um código de backup.', true);
            return;
        }

        UI.showFormFeedback('reset-feedback', '', false);
        UI.setButtonLoading('btn-reset', true);

        try {
            const response = await fetch(`${window.API_URL}/esqueci-senha/auto-recuperacao`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    codigo_2fa: codigo2FA || null,
                    codigo_backup: codigoBackup || null,
                    nova_senha: novaSenha
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                UI.showFormFeedback('reset-feedback', 'Sucesso! Voltaremos para o login...', false);
                document.getElementById('reset-feedback').style.color = 'var(--success)';
                setTimeout(() => { window.location.reload(); }, 2500);
            } else {
                UI.showFormFeedback('reset-feedback', data.detail || 'Erro ao recuperar senha.', true);
            }
        } catch (error) {
            UI.showFormFeedback('reset-feedback', 'Erro de conexão com o servidor.', true);
        } finally {
            UI.setButtonLoading('btn-reset', false);
        }
    });
}
