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

        const modalHtml = `
        <div id="cookie-block-modal" class="modal-overlay is-open is-top">
            <div class="modal-content modal-sm">
                <div class="modal-header"><h3>O navegador bloqueou o login</h3></div>
                <p class="dialog-text">
                    Isso acontece em guia anônima ou em navegadores que bloqueiam cookies de terceiros (Safari, Brave).
                </p>
                <p class="dialog-text mt-sm">
                    Na barra de endereços, clique no ícone de olho riscado ou escudo, escolha <strong>Permitir cookies de terceiros</strong> e atualize a página.
                </p>
                <div class="modal-footer">
                    <button onclick="window.location.reload()" class="btn btn-primary">Já permiti, atualizar</button>
                </div>
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

            const modalHtml = `
            <div id="${modalId}" class="modal-overlay is-open is-top is-locked">
                <div class="modal-content modal-sm">
                    <div class="modal-header">
                        <div>
                            <p class="eyebrow">ação administrativa</p>
                            <h3>${window.escapeHTML(title || 'Confirme sua identidade')}</h3>
                        </div>
                    </div>
                    <p class="dialog-text mb-md">${window.escapeHTML(message || 'Esta é uma ação administrativa sensível.')}</p>

                    <label for="stepup-input">${usa2fa ? 'Código do Autenticador' : 'Sua senha'}</label>
                    <input type="${usa2fa ? 'text' : 'password'}" id="stepup-input" class="${usa2fa ? 'code-input' : 'form-control'}" inputmode="${usa2fa ? 'numeric' : 'text'}" autocomplete="${usa2fa ? 'one-time-code' : 'current-password'}" maxlength="${usa2fa ? 6 : 128}"${usa2fa ? ' placeholder="000000"' : ''}>
                    <p id="stepup-error" class="form-error"></p>

                    <div class="modal-footer">
                        <button id="stepup-cancel" class="btn btn-secondary">Cancelar</button>
                        <button id="stepup-confirm" class="btn btn-primary">Confirmar</button>
                    </div>
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
            
            const modalHtml = `
            <div id="reauth-modal" class="modal-overlay is-open is-top is-locked">
                <div class="modal-content modal-sm">
                    <div class="modal-header"><h3>Sessão expirada</h3></div>
                    <p class="dialog-text mb-md">A sessão foi encerrada por inatividade. Digite sua senha para continuar de onde parou.</p>

                    <label for="reauth-pass">Senha</label>
                    <input type="password" id="reauth-pass" class="form-control" autocomplete="current-password">
                    <p id="reauth-error" class="form-error">Senha incorreta. Tente novamente.</p>

                    <div class="modal-footer split">
                        <button id="btn-reauth-cancel" class="btn btn-secondary">Sair</button>
                        <button id="btn-reauth-confirm" class="btn btn-primary">Continuar</button>
                    </div>
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
                        btnConfirm.innerText = "Continuar";
                        btnConfirm.disabled = false;
                        passInput.value = '';
                    }
                } catch(e) {
                    errorMsg.style.display = 'block';
                    btnConfirm.innerText = "Continuar";
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

// Fotos de celular/câmera chegam com 5–20MB; redimensionadas para 2000px em
// JPEG 82% ficam em ~300KB–1MB sem perda visível, o que faz o 1GB do Supabase
// Storage durar ~20x mais. JPEG (e não WebP) porque as imagens também entram
// no DOCX exportado, e o python-docx não aceita WebP. GIF fica de fora para
// não perder animação. Qualquer falha devolve o arquivo original.
const IMG_MAX_LADO = 2000;
const IMG_QUALIDADE = 0.82;
const IMG_MIN_BYTES_PARA_COMPRIMIR = 500 * 1024;

window.comprimirImagem = async function(file) {
    if (!file || !['image/jpeg', 'image/png'].includes(file.type)) return file;
    if (file.size < IMG_MIN_BYTES_PARA_COMPRIMIR) return file;

    const objectUrl = URL.createObjectURL(file);
    try {
        const img = new Image();
        img.src = objectUrl;
        await img.decode();

        const escala = Math.min(1, IMG_MAX_LADO / Math.max(img.naturalWidth, img.naturalHeight));
        const largura = Math.round(img.naturalWidth * escala);
        const altura = Math.round(img.naturalHeight * escala);

        const canvas = document.createElement('canvas');
        canvas.width = largura;
        canvas.height = altura;
        const ctx = canvas.getContext('2d');
        // PNG com transparência ficaria com fundo preto em JPEG
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, largura, altura);
        ctx.drawImage(img, 0, 0, largura, altura);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', IMG_QUALIDADE));
        if (!blob || blob.size >= file.size) return file;

        const nomeBase = (file.name || 'imagem').replace(/\.[^.]+$/, '');
        return new File([blob], `${nomeBase}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
    } catch (e) {
        console.warn('Compressão de imagem falhou, enviando original:', e);
        return file;
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
};

window.fazerUploadImagem = async function(inputId) {
    const fileInput = document.getElementById(inputId);
    if (!fileInput || fileInput.files.length === 0) return null;

    const file = await window.comprimirImagem(fileInput.files[0]);
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