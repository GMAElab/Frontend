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
    'eye-off': '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>',
};

window.Icon = function (name, opts = {}) {
    const size = opts.size || 16;
    const cls = opts.class ? ` ${opts.class}` : '';
    const path = ICON_PATHS[name];
    if (!path) return '';
    return `<svg class="icon${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
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
    showToast: (message, type = 'info') => {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');

        const iconByType = { success: 'check-circle', error: 'x-circle', warning: 'alert-triangle', info: 'message-square' };
        toast.innerHTML = `${window.Icon(iconByType[type] || 'message-square', { size: 18 })}<span></span>`;
        toast.querySelector('span').textContent = message;

        container.appendChild(toast);
        setTimeout(() => {
            toast.style.transition = 'opacity 0.2s ease';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 200);
        }, 4000);
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
                <div class="modal-content" style="max-width:420px;">
                    <div class="modal-header" style="margin-bottom:16px; border-bottom:none; padding-bottom:0;">
                        <h3 style="display:flex; align-items:center; gap:10px;">${danger ? window.Icon('alert-triangle', { size: 18, class: 'text-danger' }) : ''}${title}</h3>
                    </div>
                    <p style="color:var(--text-muted); font-size:14px; line-height:1.6; margin-bottom:8px;"></p>
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
     * Markup padrão para listas/tabelas sem dados, com ícone e orientação —
     * em vez de uma célula em branco sem explicação.
     */
    emptyState: (opts = {}) => {
        const { icon = 'inbox', title = 'Nada por aqui ainda', description = '', actionLabel = '', actionOnclick = '' } = opts;
        return `
            <div class="empty-state">
                <div class="empty-state-icon">${window.Icon(icon, { size: 26 })}</div>
                <h4>${title}</h4>
                ${description ? `<p class="text-muted">${description}</p>` : ''}
                ${actionLabel ? `<button type="button" class="btn btn-primary btn-sm" style="margin-top:14px;" onclick="${actionOnclick}">${actionLabel}</button>` : ''}
            </div>`;
    },

    /**
     * Markup padrão para falhas de carregamento — substitui os antigos
     * parágrafos soltos em vermelho por algo consistente com o resto do app.
     */
    errorState: (message = 'Não foi possível carregar os dados.') => {
        return `
            <div class="empty-state">
                <div class="empty-state-icon" style="background:var(--danger-light); color:var(--danger);">${window.Icon('alert-triangle', { size: 24 })}</div>
                <p class="text-danger" style="font-weight:600;">${message}</p>
            </div>`;
    },

    switchView: (viewName) => {
        const mainContent = document.getElementById('dynamic-content');
        const pageTitle = document.getElementById('current-page-title');

        if (!mainContent) return;

        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-view') === viewName) {
                btn.classList.add('active');
                if (pageTitle) pageTitle.textContent = (btn.dataset.label || btn.textContent).trim();
            }
        });
        mainContent.innerHTML = `<div class="text-center mt-md"><span class="spinner" style="position:relative; border-color:var(--border-color); border-top-color:var(--primary)"></span> Carregando...</div>`;
        const event = new CustomEvent('viewChanged', { detail: { view: viewName } });
        document.dispatchEvent(event);
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
    UI.switchView('inicio');
});

// Fecha qualquer modal visível com Esc — sem precisar clicar no X.
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        if (getComputedStyle(modal).display !== 'none') {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
});

document.addEventListener('viewChanged', (e) => {
    const view = e.detail.view;
    const mainContent = document.getElementById('dynamic-content');
    if (view === 'inicio') {
        const userString = localStorage.getItem('user_data');
        const user = userString ? JSON.parse(userString) : { role: 'pesquisador', nome: 'Pesquisador' };
        const isAdmin = user.role === 'admin' || user.role === 'coordenador';
        const primeiroNome = (user.nome || 'Pesquisador').split(' ')[0];

        const atalhos = [
            { view: 'pta', icon: 'bar-chart', label: 'Enviar Planejamento Mensal', desc: 'Registrar avanço mensal' },
            { view: 'processes', icon: 'layers', label: 'Novo Processo', desc: 'Mapear um processo de P&D' },
            { view: 'equipments', icon: 'flask', label: 'Equipamentos', desc: 'Consultar o laboratório' },
            { view: 'articles', icon: 'search', label: 'Artigos', desc: 'Buscar literatura científica' },
        ];

        const alertaAdmin = isAdmin ? `
            <div class="card" style="border-left: 4px solid var(--warning); cursor: pointer; display:flex; align-items:flex-start; gap:14px;" onclick="UI.switchView('admin')">
                <div style="color:var(--warning); flex-shrink:0; margin-top:2px;">${window.Icon('alert-triangle', { size: 20 })}</div>
                <div>
                    <h4 style="font-size:14px; margin-bottom:4px;">Pendências de avaliação</h4>
                    <p class="text-muted" style="font-size:13px; margin:0; line-height:1.5;">Há pedidos de cadastro ou relatórios do Planejamento Mensal aguardando sua revisão no Painel Admin.</p>
                </div>
            </div>` : '';

        mainContent.innerHTML = `
            <div class="view-header fade-in" style="margin-bottom:28px;">
                <h2 style="font-size:1.6rem;">Olá, ${window.escapeHTML(primeiroNome)}</h2>
                <p class="text-muted" style="margin:0;">Aqui está um atalho rápido para o que você faz com mais frequência.</p>
            </div>

            <div class="fade-in" style="display:flex; flex-direction:column; gap:24px;">
                ${alertaAdmin}
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:14px;">
                    ${atalhos.map(a => `
                        <button type="button" class="shortcut-card" onclick="UI.switchView('${a.view}')">
                            <span class="icon-wrap">${window.Icon(a.icon, { size: 20 })}</span>
                            <span>
                                ${a.label}
                                <small>${a.desc}</small>
                            </span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    if (view === 'processes') {
        mainContent.innerHTML = `
            <div class="view-header fade-in" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <div>
                    <h3 style="margin: 0; font-size: 1.5rem;">Gestão de Processos P&D</h3>
                    <p class="text-muted" style="margin-top: 5px;">Mapeamento, acompanhamento e histórico de processos.</p>
                </div>
                <button id="btn-novo-processo" class="btn btn-primary">${window.Icon('plus', { size: 16 })} Novo Processo</button>
            </div>

            <div class="card table-container fade-in">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Nome do Processo</th>
                            <th>Responsável</th>
                            <th>Status</th>
                            <th>Data de Registro</th>
                            <th style="text-align: right;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="processesTableBody">
                        <tr><td colspan="5" style="text-align: center; padding: 30px;"><span class="spinner"></span></td></tr>
                    </tbody>
                </table>
            </div>
        `;

        const btnNovoProcesso = document.getElementById('btn-novo-processo');
        if (btnNovoProcesso) {
            btnNovoProcesso.addEventListener('click', () => {
                if (typeof window.openProcessModal === 'function') {
                    window.openProcessModal();
                } else {
                    const modal = document.getElementById('processModal');
                    if (modal) modal.style.display = 'flex';
                }
            });
        }

        if (typeof loadProcessesTable === 'function') loadProcessesTable();
    }
});

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        if (window.innerWidth <= 991) {
            document.querySelector('.sidebar')?.classList.remove('open');
        }
    });
});
