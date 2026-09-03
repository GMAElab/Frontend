const API_URL = 'https://api-hzrz.onrender.com';
const APP_START_TIME = Date.now();

// ==========================================
// CLIENTE DA API (sessão, cookies, CSRF)
// ==========================================
window.api = {
    setToken: () => {},

    getToken: () => localStorage.getItem('user_data') ? 'cookie_active' : null,

    logout: async () => {
        try {
            await fetch(`${API_URL}/logout`, { method: 'POST', credentials: 'include' });
        } catch (e) {}
        localStorage.removeItem('user_data');
        localStorage.removeItem('csrf_token');
        window.location.href = 'index.html';
    },

    exibirModalErroCookies: () => {
        const modalExistente = document.getElementById('reauth-modal');
        if (modalExistente) modalExistente.remove();

        const iconHtml = window.Icon ? window.Icon('alert-triangle', { size: 26 }) : '';
        const modalHtml = `
        <div id="cookie-block-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(27,24,21,0.6); z-index:9999999; display:flex; justify-content:center; align-items:center;">
            <div style="background:var(--bg-surface); padding:32px; border-radius:4px; border-top:3px solid var(--warning); width:90%; max-width:450px; text-align:center; box-shadow:var(--shadow-lg); border-left:1px solid var(--border-color); border-right:1px solid var(--border-color); border-bottom:1px solid var(--border-color);">
                <div style="background:var(--warning-light); color:var(--warning); width:52px; height:52px; border-radius:50%; display:flex; justify-content:center; align-items:center; margin:0 auto 20px auto;">
                    ${iconHtml}
                </div>
                <h3 style="color:var(--text-main); font-size:19px; margin-bottom:12px;">Acesso Restrito pelo Navegador</h3>
                <p style="color:var(--text-muted); font-size:14px; margin-bottom:24px; line-height:1.6; text-align:justify;">
                    Detectamos que você está em uma <strong>Guia Anônima</strong> ou usando um navegador que bloqueia conexões de segurança (como Safari ou Brave).
                    <br><br>
                    Para entrar no <strong>SGCI - GMAE</strong>, clique no ícone de <strong>olho riscado ou escudo</strong> na barra de endereços, selecione <strong>"Permitir cookies de terceiros"</strong> e atualize a página.
                </p>
                <button onclick="window.location.reload()" class="btn btn-primary btn-block">
                    Já ativei, atualizar página
                </button>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    fetchProtected: async (endpoint, options = {}) => {
        if (!window.api.getToken()) {
            window.api.logout();
            throw new Error('Unauthorized');
        }

        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
        const isFormData = options.body instanceof FormData;
        const method = (options.method || 'GET').toUpperCase();
        const csrfToken = localStorage.getItem('csrf_token');

        const fetchOptions = {
            ...options,
            headers: {
                ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
                ...(!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
                ...(options.headers || {})
            },
            credentials: 'include'
        };

        try {
            let response = await fetch(`${API_URL}/${cleanEndpoint}`, fetchOptions);
            
            if (response.status === 401) {
                const tempoDeUso = Date.now() - APP_START_TIME;
                
                if (tempoDeUso < 3000) {
                    window.api.exibirModalErroCookies();
                    throw new Error('Cookies bloqueados pelo navegador.');
                }

                const sucesso = await window.api.reauthSilencioso();

                if (sucesso) {
                    response = await fetch(`${API_URL}/${cleanEndpoint}`, fetchOptions);
                    
                    if (response.status === 401) {
                        window.api.exibirModalErroCookies();
                        throw new Error('Cookies bloqueados ativamente pelo navegador.');
                    }
                } else {
                    window.api.logout();
                    throw new Error('Unauthorized');
                }
            }
            
            return response;
        } catch (error) {
            throw error;
        }
    },
    
    // Pede reconfirmação de identidade (senha, ou código do Autenticador se o admin
    // tiver 2FA ativo) antes de uma ação administrativa sensível. Resolve com o
    // step_up_token a ser enviado no header X-Step-Up-Token, ou null se cancelado.
    confirmStepUp: ({ title, message } = {}) => {
        return new Promise((resolve) => {
            const userDataStr = localStorage.getItem('user_data');
            if (!userDataStr) { resolve(null); return; }
            const user = JSON.parse(userDataStr);
            const usa2fa = !!user.is_2fa_enabled;

            const modalId = 'stepup-modal';
            const existente = document.getElementById(modalId);
            if (existente) existente.remove();

            const icon = window.Icon ? window.Icon('lock', { size: 24 }) : '';
            const modalHtml = `
            <div id="${modalId}" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(27,24,21,0.7); z-index:9999999; display:flex; justify-content:center; align-items:center;">
                <div style="background:var(--bg-surface); padding:30px; border-radius:4px; border-top:3px solid var(--danger); width:90%; max-width:400px; text-align:center; box-shadow:var(--shadow-lg); border-left:1px solid var(--border-color); border-right:1px solid var(--border-color); border-bottom:1px solid var(--border-color);">
                    <div style="color:var(--danger); margin-bottom:12px; display:flex; justify-content:center;">${icon}</div>
                    <h3 style="margin-bottom:10px; font-size:18px;">${window.escapeHTML(title || 'Confirme sua identidade')}</h3>
                    <p style="color:var(--text-muted); font-size:14px; margin-bottom:20px; line-height:1.5;">
                        ${window.escapeHTML(message || 'Esta é uma ação administrativa sensível.')}
                        ${usa2fa ? 'Digite o código do seu Autenticador.' : 'Digite sua senha para continuar.'}
                    </p>

                    <input type="${usa2fa ? 'text' : 'password'}" id="stepup-input" class="form-control" inputmode="${usa2fa ? 'numeric' : 'text'}" autocomplete="${usa2fa ? 'one-time-code' : 'current-password'}" maxlength="${usa2fa ? 6 : 128}" placeholder="${usa2fa ? 'Código de 6 dígitos' : 'Sua senha'}" style="width:100%; margin-bottom:15px; font-size:16px; text-align:center;">

                    <div style="display:flex; gap:10px;">
                        <button id="stepup-cancel" class="btn btn-secondary" style="flex:1;">Cancelar</button>
                        <button id="stepup-confirm" class="btn btn-primary" style="flex:1;">Confirmar</button>
                    </div>
                    <p id="stepup-error" style="color:var(--danger); font-size:13px; font-weight:600; margin-top:15px; display:none;"></p>
                </div>
            </div>`;

            document.body.insertAdjacentHTML('beforeend', modalHtml);

            const modal = document.getElementById(modalId);
            const input = document.getElementById('stepup-input');
            const btnConfirm = document.getElementById('stepup-confirm');
            const btnCancel = document.getElementById('stepup-cancel');
            const errorMsg = document.getElementById('stepup-error');

            input.focus();
            btnCancel.onclick = () => { modal.remove(); resolve(null); };

            const doConfirm = async () => {
                const valor = input.value.trim();
                if (!valor) return;
                btnConfirm.disabled = true;
                btnConfirm.innerText = "Verificando...";
                errorMsg.style.display = 'none';

                try {
                    const body = usa2fa ? { codigo_2fa: valor } : { senha: valor };
                    const res = await window.api.fetchProtected('/admin/confirmar-acao', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });

                    if (res.ok) {
                        const data = await res.json();
                        modal.remove();
                        resolve(data.step_up_token);
                    } else {
                        const data = await res.json().catch(() => ({}));
                        errorMsg.innerText = data.detail || (usa2fa ? "Código incorreto." : "Senha incorreta.");
                        errorMsg.style.display = 'block';
                        btnConfirm.innerText = "Confirmar";
                        btnConfirm.disabled = false;
                        input.value = '';
                        input.focus();
                    }
                } catch (e) {
                    errorMsg.innerText = "Falha de conexão. Tente novamente.";
                    errorMsg.style.display = 'block';
                    btnConfirm.innerText = "Confirmar";
                    btnConfirm.disabled = false;
                }
            };

            btnConfirm.onclick = doConfirm;
            input.addEventListener("keypress", (e) => { if (e.key === "Enter") { e.preventDefault(); doConfirm(); } });
        });
    },

    reauthSilencioso: () => {
        return new Promise((resolve) => {
            const userDataStr = localStorage.getItem('user_data');
            if (!userDataStr) { resolve(false); return; }
            const user = JSON.parse(userDataStr);
            
            const reauthIcon = window.Icon ? window.Icon('lock', { size: 24 }) : '';
            const modalHtml = `
            <div id="reauth-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(27,24,21,0.7); z-index:9999999; display:flex; justify-content:center; align-items:center;">
                <div style="background:var(--bg-surface); padding:30px; border-radius:4px; border-top:3px solid var(--warning); width:90%; max-width:400px; text-align:center; box-shadow:var(--shadow-lg); border-left:1px solid var(--border-color); border-right:1px solid var(--border-color); border-bottom:1px solid var(--border-color);">
                    <div style="color:var(--warning); margin-bottom:12px; display:flex; justify-content:center;">${reauthIcon}</div>
                    <h3 style="margin-bottom:10px; font-size:18px;">Sessão Expirada</h3>
                    <p style="color:var(--text-muted); font-size:14px; margin-bottom:20px; line-height:1.5;">Por segurança, sua sessão expirou por inatividade. <br><br>Digite sua senha para destravar a tela.</p>

                    <input type="password" id="reauth-pass" class="form-control" placeholder="Sua senha do sistema..." style="width:100%; margin-bottom:15px; font-size:16px;">

                    <div style="display:flex; gap:10px;">
                        <button id="btn-reauth-cancel" class="btn btn-secondary" style="flex:1;">Sair</button>
                        <button id="btn-reauth-confirm" class="btn btn-primary" style="flex:1;">Destravar Sessão</button>
                    </div>
                    <p id="reauth-error" style="color:var(--danger); font-size:13px; font-weight:600; margin-top:15px; display:none;">Senha incorreta. Tente novamente.</p>
                </div>
            </div>`;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            const modal = document.getElementById('reauth-modal');
            const passInput = document.getElementById('reauth-pass');
            const btnConfirm = document.getElementById('btn-reauth-confirm');
            const btnCancel = document.getElementById('btn-reauth-cancel');
            const errorMsg = document.getElementById('reauth-error');

            passInput.focus();
            btnCancel.onclick = () => { modal.remove(); resolve(false); };

            btnConfirm.onclick = async () => {
                btnConfirm.innerText = "Validando...";
                btnConfirm.disabled = true;
                errorMsg.style.display = 'none';

                try {
                    const formData = new URLSearchParams();
                    formData.append('username', user.email);
                    formData.append('password', passInput.value);

                    const res = await fetch(`${API_URL}/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        credentials: 'include',
                        body: formData
                    });

                    if (res.ok) {
                        const data = await res.json();
                        if (data.csrf_token) localStorage.setItem('csrf_token', data.csrf_token);
                        modal.remove();
                        if(window.UI) window.UI.showToast("Sessão renovada!", "success");
                        resolve(true);
                    } else {
                        errorMsg.style.display = 'block';
                        btnConfirm.innerText = "Destravar Sessão";
                        btnConfirm.disabled = false;
                        passInput.value = '';
                    }
                } catch(e) {
                    errorMsg.style.display = 'block';
                    btnConfirm.innerText = "Destravar Sessão";
                    btnConfirm.disabled = false;
                }
            };

            passInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter") { e.preventDefault(); btnConfirm.click(); }
            });
        });
    }
};

window.API_URL = API_URL;

// ==========================================
// UPLOAD DE IMAGENS E PREVIEW
// ==========================================
//Teste

window.previewImagem = function(event, previewDivId, imgId) {
    const file = event.target.files[0];
    const previewDiv = document.getElementById(previewDivId);
    const imgElement = document.getElementById(imgId);

    if (file) {
        if (file.size > 10 * 1024 * 1024) { 
            window.UI.showToast("A imagem é muito grande. Máximo 10MB.", "warning");
            event.target.value = ''; 
            return;
        }
        imgElement.src = URL.createObjectURL(file);
        previewDiv.style.display = 'block';
    }
};

window.removerImagem = function(inputId, previewDivId) {
    document.getElementById(inputId).value = '';
    document.getElementById(previewDivId).style.display = 'none';
};

window.fazerUploadImagem = async function(inputId) {
    const fileInput = document.getElementById(inputId);
    if (!fileInput || fileInput.files.length === 0) return null;

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("file", file); 

    try {
        const res = await window.api.fetchProtected('/upload-imagem', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) throw new Error("Falha no servidor ao enviar imagem");
        
        const data = await res.json();
        return data.url; 
    } catch (error) {
        console.error("Erro no upload:", error);
        window.UI.showToast("Erro ao processar a imagem na nuvem.", "error");
        return null;
    }
};