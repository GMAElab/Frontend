const API_URL = 'https://api-ic.onrender.com';
const APP_START_TIME = Date.now(); 

window.api = {
    setToken: () => {},
    
    getToken: () => localStorage.getItem('user_data') ? 'cookie_active' : null,
    
    logout: async () => {
        try {
            await fetch(`${API_URL}/logout`, { method: 'POST', credentials: 'include' });
        } catch (e) {}
        localStorage.removeItem('user_data');
        window.location.href = 'index.html';
    },

    exibirModalErroCookies: () => {
        const modalExistente = document.getElementById('reauth-modal');
        if (modalExistente) modalExistente.remove();

        const modalHtml = `
        <div id="cookie-block-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999999; display:flex; justify-content:center; align-items:center; backdrop-filter: blur(4px);">
            <div style="background:white; padding:35px; border-radius:12px; width:90%; max-width:450px; text-align:center; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);">
                <div style="background:#FEF3C7; width:60px; height:60px; border-radius:50%; display:flex; justify-content:center; align-items:center; margin:0 auto 20px auto;">
                    <span style="font-size:30px; color:#D97706;">⚠️</span>
                </div>
                <h3 style="color:#111827; font-size:20px; margin-bottom:12px; font-weight:700;">Acesso Restrito pelo Navegador</h3>
                <p style="color:#4B5563; font-size:14px; margin-bottom:24px; line-height:1.6; text-align:justify;">
                    Detectamos que você está em uma <strong>Guia Anônima</strong> ou usando um navegador que bloqueia conexões de segurança (como Safari ou Brave). 
                    <br><br>
                    Para entrar no <strong>LEQM Hub</strong>, clique no ícone de <strong>olho riscado ou escudo</strong> na barra de endereços, selecione <strong>"Permitir cookies de terceiros"</strong> e atualize a página.
                </p>
                <button onclick="window.location.reload()" style="width:100%; padding:12px; background:#007BFF; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold; font-size:15px;">
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

        const fetchOptions = {
            ...options,
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
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
    
    reauthSilencioso: () => {
        return new Promise((resolve) => {
            const userDataStr = localStorage.getItem('user_data');
            if (!userDataStr) { resolve(false); return; }
            const user = JSON.parse(userDataStr);
            
            const modalHtml = `
            <div id="reauth-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:9999999; display:flex; justify-content:center; align-items:center;">
                <div style="background:white; padding:30px; border-radius:8px; width:90%; max-width:400px; text-align:center; box-shadow:0 10px 25px rgba(0,0,0,0.5);">
                    <h3 style="color:#DC2626; margin-bottom:10px;">⚠️ Sessão Expirada</h3>
                    <p style="color:#4B5563; font-size:14px; margin-bottom:20px; line-height:1.5;">Por segurança, sua sessão expirou por inatividade. <br><br>Digite sua senha para destravar a tela.</p>
                    
                    <input type="password" id="reauth-pass" placeholder="Sua senha do sistema..." style="width:100%; padding:12px; margin-bottom:15px; border:1px solid #ccc; border-radius:4px; font-size:16px; outline:none;">
                    
                    <div style="display:flex; gap:10px;">
                        <button id="btn-reauth-cancel" style="flex:1; padding:10px; background:#E5E7EB; color:#111; border:none; border-radius:4px; cursor:pointer;">Sair</button>
                        <button id="btn-reauth-confirm" style="flex:1; padding:10px; background:#007BFF; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">Destravar Sessão</button>
                    </div>
                    <p id="reauth-error" style="color:#DC2626; font-size:13px; font-weight:bold; margin-top:15px; display:none;">Senha incorreta. Tente novamente.</p>
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