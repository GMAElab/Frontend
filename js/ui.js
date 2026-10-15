window.escapeHTML = function(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

// ==========================================
// ÍCONES (substitui emoji por SVG de linha consistente)
// ==========================================
const ICON_PATHS = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/>',
    flask: '<path d="M9 2v6.34L4.24 17.5A2 2 0 0 0 6 20.5h12a2 2 0 0 0 1.76-3L15 8.34V2"/><path d="M8.5 2h7"/><path d="M6.5 14.5h11"/>',
    layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
    'bar-chart': '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    shield: '<path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4Z"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/>',
    'alert-triangle': '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    'edit-2': '<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    'trash-2': '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    'check-circle': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    'x-circle': '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    ban: '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>',
    'chevron-left': '<polyline points="15 18 9 12 15 6"/>',
    'chevron-right': '<polyline points="9 18 15 12 9 6"/>',
    'arrow-left': '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    sparkles: '<path d="M12 3v4M3 12h4M12 21v-4M21 12h-4"/><path d="M6.5 6.5 8 8M18 18l-1.5-1.5M6.5 17.5 8 16M18 6l-1.5 1.5"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    'message-square': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/>',
    'file-plus': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="12" x2="12" y2="18"/><line x1="9" y1="15" x2="15" y2="15"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    x: '<line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/>',
    'arrow-right': '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    'eye-off': '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    'check-square': '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    'book-open': '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    microscope: '<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>',
};

window.Icon = function (name, opts = {}) {
    const size = opts.size || 16;
    const cls = opts.class ? ` ${opts.class}` : '';
    const path = ICON_PATHS[name];
    if (!path) return '';
    return `<svg class="icon${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
};

// ==========================================
// TOGGLE DE MOSTRAR/OCULTAR SENHA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.password-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.getAttribute('data-target'));
            if (!input) return;
            const showing = input.type === 'text';
            input.type = showing ? 'password' : 'text';
            btn.innerHTML = window.Icon(showing ? 'eye' : 'eye-off', { size: 18 });
            btn.setAttribute('aria-label', showing ? 'Mostrar senha' : 'Ocultar senha');
        });
    });
});

// ==========================================
// NÚCLEO DE UI
// ==========================================
const UI = {
    /**
     * Erros e avisos ficam na tela até a pessoa fechar: quem está na bancada
     * pode não estar olhando no momento. Confirmações somem sozinhas.
     */
    showToast: (message, type = 'info') => {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const persistente = type === 'error' || type === 'warning';
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.setAttribute('role', persistente ? 'alert' : 'status');

        const tagByType = { success: 'ok', error: 'erro', warning: 'aviso', info: 'info' };
        toast.innerHTML = `
            <span class="tag">${tagByType[type] || 'info'}</span>
            <span class="toast-msg"></span>
            <button type="button" class="toast-close" aria-label="Fechar aviso">${window.Icon('x', { size: 14 })}</button>`;
        toast.querySelector('.toast-msg').textContent = UI.mensagemLegivel(message);

        const remover = () => {
            toast.style.transition = 'opacity 0.2s ease';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 200);
        };
        toast.querySelector('.toast-close').addEventListener('click', remover);

        if (!persistente) {
            let timer = setTimeout(remover, 4000);
            toast.addEventListener('mouseenter', () => clearTimeout(timer));
            toast.addEventListener('mouseleave', () => { timer = setTimeout(remover, 2000); });
        }

        container.appendChild(toast);
        while (container.children.length > 4) container.firstElementChild.remove();
    },

    /** Traduz mensagens técnicas da API e do navegador para algo que a pessoa entenda. */
    mensagemLegivel: (mensagem) => {
        if (mensagem === null || mensagem === undefined || mensagem === '') return 'Algo deu errado. Tente novamente.';
        if (Array.isArray(mensagem)) mensagem = mensagem.map(d => (d && d.msg) || String(d)).join(' ');
        else if (typeof mensagem === 'object') mensagem = mensagem.msg || mensagem.detail || mensagem.message || '';

        const texto = String(mensagem).replace(/^Value error,\s*/i, '').trim();
        const traducoes = [
            [/^(failed to fetch|load failed)$|networkerror/i, 'Sem conexão com o servidor. Verifique a internet e tente de novo.'],
            [/^internal server error$/i, 'Erro no servidor. Tente de novo em instantes.'],
            [/^not authenticated$|could not validate credentials/i, 'Sua sessão expirou. Entre novamente.'],
            [/^(forbidden|not enough permissions)$/i, 'Você não tem permissão para esta ação.'],
            [/^not found$/i, 'Registro não encontrado. Ele pode ter sido excluído.'],
            [/^field required$/i, 'Preencha os campos obrigatórios.'],
            [/^string should have at least (\d+) characters?$/i, (m, n) => `O texto precisa ter pelo menos ${n} caracteres.`],
            [/^input should be a valid integer/i, 'Use apenas números inteiros.'],
            [/value is not a valid email/i, 'E-mail inválido.'],
            [/^\[object object\]$/i, 'Algo deu errado. Tente novamente.'],
        ];
        for (const [padrao, traducao] of traducoes) {
            if (padrao.test(texto)) return typeof traducao === 'function' ? texto.replace(padrao, traducao) : traducao;
        }
        return texto || 'Algo deu errado. Tente novamente.';
    },

    /**
     * Converte qualquer link do YouTube (watch, youtu.be, shorts, live, embed)
     * no endereço que funciona dentro da página. Devolve null se não for YouTube.
     */
    youtubeEmbed: (url) => {
        const m = String(url || '').trim().match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([\w-]{11})/i);
        return m ? `https://www.youtube.com/embed/${m[1]}` : null;
    },

    /**
     * Ao digitar o nome de um novo registro, mostra os já cadastrados com nome parecido.
     * O objetivo do portal é partir do que existe, não duplicar.
     */
    avisarSemelhantes: ({ campo, endpoint, rotulo, tipo = 'registro', ativo = () => true }) => {
        const input = typeof campo === 'string' ? document.getElementById(campo) : campo;
        if (!input || input.dataset.semelhantes) return;
        input.dataset.semelhantes = '1';

        const aviso = document.createElement('span');
        aviso.className = 'help similar-hint';
        aviso.setAttribute('aria-live', 'polite');
        aviso.id = `${input.id}-semelhantes`;
        (input.closest('.input-group') || input.parentElement).appendChild(aviso);
        input.setAttribute('aria-describedby', [input.getAttribute('aria-describedby'), aviso.id].filter(Boolean).join(' '));

        const normalizar = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
        let timer = null;
        let pedido = 0;

        const limpar = () => { aviso.textContent = ''; aviso.classList.remove('is-warning'); };

        input.addEventListener('input', () => {
            clearTimeout(timer);
            const termo = input.value.trim();
            if (!ativo() || termo.length < 3) { pedido++; limpar(); return; }
            timer = setTimeout(async () => {
                const atual = ++pedido;
                try {
                    const res = await window.api.fetchProtected(`${endpoint}?q=${encodeURIComponent(termo)}&limit=5`);
                    if (!res.ok || atual !== pedido) return;
                    const itens = await res.json();
                    if (atual !== pedido || !Array.isArray(itens)) return;
                    if (!itens.length) { limpar(); return; }

                    const igual = itens.some(i => normalizar(rotulo(i)) === normalizar(termo));
                    aviso.classList.toggle('is-warning', igual);
                    aviso.innerHTML = igual
                        ? `Já existe um ${tipo} com este nome. Confira antes de criar outro.`
                        : `Parecidos já cadastrados: <strong>${itens.map(i => window.escapeHTML(rotulo(i))).join('</strong>, <strong>')}</strong>. Confira se não é o mesmo.`;
                } catch (e) { /* o aviso é opcional: sem conexão, segue sem ele */ }
            }, 350);
        });
    },

    setButtonLoading: (buttonId, isLoading) => {
        const btn = document.getElementById(buttonId);
        if (!btn) return;

        const textSpan = btn.querySelector('.btn-text');
        const spinner = btn.querySelector('.spinner');

        if (isLoading) {
            btn.disabled = true;
            if (textSpan) textSpan.classList.add('hidden');
            if (spinner) spinner.classList.remove('hidden');
        } else {
            btn.disabled = false;
            if (textSpan) textSpan.classList.remove('hidden');
            if (spinner) spinner.classList.add('hidden');
        }
    },

    showFormFeedback: (elementId, message, isError = true) => {
        const feedbackEl = document.getElementById(elementId);
        if (!feedbackEl) return;

        feedbackEl.textContent = message;
        feedbackEl.className = `feedback-msg ${isError ? 'error' : 'success'}`;
    },

    /** Botão de fechar padrão dos modais. */
    closeButton: (onclick) =>
        `<button type="button" class="modal-close" onclick="${onclick}" aria-label="Fechar">${window.Icon('x', { size: 16 })}</button>`,

    /** Linha de carregamento, usada enquanto uma lista ou painel busca dados. */
    loading: (label = 'Carregando') =>
        `<div class="loading"><span class="spinner"></span>${label}</div>`,

    /**
     * Substitui window.confirm() nativo por um modal com a identidade visual do sistema.
     * Uso: if (await UI.confirm("Excluir este item?", { danger: true })) { ... }
     */
    confirm: (message, opts = {}) => {
        const { title = 'Confirmar ação', confirmText = 'Confirmar', cancelText = 'Cancelar', danger = false } = opts;
        return new Promise((resolve) => {
            const old = document.getElementById('ui-confirm-modal');
            if (old) old.remove();

            const modal = document.createElement('div');
            modal.id = 'ui-confirm-modal';
            modal.className = 'modal-overlay';
            modal.style.display = 'flex';
            modal.innerHTML = `
                <div class="modal-content modal-sm">
                    <div class="modal-header"><h3>${title}</h3></div>
                    <p class="dialog-text"></p>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-role="cancel">${cancelText}</button>
                        <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-role="ok">${confirmText}</button>
                    </div>
                </div>`;
            modal.querySelector('p').textContent = message;
            document.body.appendChild(modal);

            const cleanup = (result) => { modal.remove(); resolve(result); };
            modal.querySelector('[data-role="cancel"]').onclick = () => cleanup(false);
            modal.querySelector('[data-role="ok"]').onclick = () => cleanup(true);
            modal.addEventListener('click', (e) => { if (e.target === modal) cleanup(false); });
            modal.querySelector('[data-role="ok"]').focus();
        });
    },

    /**
     * Markup padrão para listas/tabelas sem dados: título e orientação,
     * em vez de uma célula em branco sem explicação.
     */
    emptyState: (opts = {}) => {
        const { title = 'Nada por aqui ainda', description = '', actionLabel = '', actionOnclick = '' } = opts;
        return `
            <div class="empty-state">
                <h4>${title}</h4>
                ${description ? `<p>${description}</p>` : ''}
                ${actionLabel ? `<button type="button" class="btn btn-secondary btn-sm" onclick="${actionOnclick}">${actionLabel}</button>` : ''}
            </div>`;
    },

    /** Markup padrão para falhas de carregamento. */
    errorState: (message = 'Não foi possível carregar os dados.') => {
        return `
            <div class="empty-state error">
                <h4>${message}</h4>
                <p>Verifique a conexão e tente novamente.</p>
            </div>`;
    },

    /**
     * Troca a tela. Se houver texto não enviado na tela atual, pergunta antes.
     * Devolve uma promessa: true se trocou, false se a pessoa preferiu ficar.
     */
    switchView: (viewName, opcoes = {}) => {
        const mainContent = document.getElementById('dynamic-content');
        const pageTitle = document.getElementById('current-page-title');

        if (!mainContent) return Promise.resolve(false);

        if (!opcoes.forcar && window.Salvaguardas && window.Salvaguardas.formularioSujoNaTela()) {
            return UI.confirm(
                'Você tem um texto não enviado nesta tela. Ele fica guardado como rascunho neste navegador, mas não será enviado.',
                { title: 'Sair sem enviar?', confirmText: 'Sair da tela', cancelText: 'Continuar editando' }
            ).then(sair => (sair ? UI.switchView(viewName, { forcar: true }) : false));
        }

        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-view') === viewName) {
                btn.classList.add('active');
                const rotulo = (btn.dataset.label || btn.textContent).trim();
                if (pageTitle) pageTitle.textContent = rotulo;
                document.title = `${rotulo} · SGCI`;
            }
        });

        // A tela atual fica no endereço: recarregar a página não volta ao início.
        if (location.hash.slice(1) !== viewName) history.replaceState(null, '', `#${viewName}`);

        mainContent.scrollTop = 0;
        mainContent.innerHTML = UI.loading();
        const event = new CustomEvent('viewChanged', { detail: { view: viewName } });
        document.dispatchEvent(event);
        return Promise.resolve(true);
    }
};

window.UI = UI;

document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const view = e.currentTarget.getAttribute('data-view');
            if (view) UI.switchView(view);
        });
    });

    const btnMenu = document.getElementById('btn-menu-toggle') || document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (btnMenu && sidebar) {
        btnMenu.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    const pedida = location.hash.slice(1);
    const existe = pedida && document.querySelector(`.nav-item[data-view="${CSS.escape(pedida)}"]`);
    UI.switchView(existe ? pedida : 'inicio');
});

// Esc fecha só o modal de cima, e pergunta antes se houver texto não salvo.
document.addEventListener('keydown', async (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    const abertos = Array.from(document.querySelectorAll('.modal-overlay')).filter(m => getComputedStyle(m).display !== 'none');
    const modal = (window.Salvaguardas && window.Salvaguardas.modalDoTopo()) || abertos[abertos.length - 1];
    if (!modal || modal.classList.contains('is-locked')) return;
    e.preventDefault();

    const cancelar = modal.querySelector('[data-role="cancel"]');
    if (cancelar) { cancelar.click(); return; }

    if (window.Salvaguardas && !(await window.Salvaguardas.podeDescartar(modal))) return;
    modal.style.display = 'none';
    if (abertos.length <= 1) document.body.style.overflow = 'auto';
});

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        if (window.innerWidth <= 991) {
            document.querySelector('.sidebar')?.classList.remove('open');
        }
    });
});
