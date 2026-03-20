/**
 * UI Controller
 * Responsável pelas interações globais de interface (Toasts, Loaders, View Switcher)
 * Aplicação das Heurísticas de Nielsen: Visibilidade do Status e Prevenção de Erros
 */
const UI = {
    /**
     * Exibe uma notificação flutuante (Toast)
     * @param {string} message - A mensagem a ser exibida
     * @param {string} type - 'success', 'error' ou 'info'
     */
    showToast: (message, type = 'info') => {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        // Acessibilidade (Screen Readers)
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');

        container.appendChild(toast);

        // Remove o toast automaticamente após 4 segundos
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse forwards';
            setTimeout(() => toast.remove(), 300); // Tempo da animação
        }, 4000);
    },

    /**
     * Altera o estado de um botão para "Carregando" (Mostra o spinner)
     * @param {string} buttonId - O ID do botão
     * @param {boolean} isLoading - true para carregar, false para voltar ao normal
     */
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

    /**
     * Exibe mensagens de erro/sucesso embaixo de formulários
     * @param {string} elementId - O ID da div de feedback (ex: 'login-feedback')
     * @param {string} message - A mensagem
     * @param {boolean} isError - Define se a cor será vermelha (true) ou verde (false)
     */
    showFormFeedback: (elementId, message, isError = true) => {
        const feedbackEl = document.getElementById(elementId);
        if (!feedbackEl) return;

        feedbackEl.textContent = message;
        feedbackEl.className = `feedback-msg ${isError ? 'error' : 'success'}`;
    },

    /**
     * SPA View Switcher: Troca o conteúdo principal sem recarregar a página
     * @param {string} viewName - O nome da tela (ex: 'equipments', 'processes')
     */
    switchView: (viewName) => {
        const mainContent = document.getElementById('dynamic-content');
        const pageTitle = document.getElementById('current-page-title');
        if (!mainContent) return;

        // Atualiza os botões do menu lateral para mostrar qual está ativo
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-view') === viewName) {
                btn.classList.add('active');
                if (pageTitle) pageTitle.textContent = btn.textContent; // Atualiza o título do topo
            }
        });

        // Limpa a tela atual e mostra um loading temporário
        mainContent.innerHTML = `<div class="text-center mt-md"><span class="spinner" style="position:relative; border-color:#ccc; border-top-color:var(--color-primary)"></span> Carregando...</div>`;

        // Dispara um evento customizado que os arquivos das views (ex: equipments.js) vão escutar
        const event = new CustomEvent('viewChanged', { detail: { view: viewName } });
        document.dispatchEvent(event);
    }
};

// Torna o objeto global para ser usado por auth.js, equipments.js, etc.
window.UI = UI;

// Inicializa a navegação do Menu Lateral (Sidebar)
document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const view = e.target.getAttribute('data-view');
            if (view) UI.switchView(view);
        });
    });

    // Responsividade do Menu Mobile
    const btnMenu = document.getElementById('btn-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (btnMenu && sidebar) {
        btnMenu.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }
});