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
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');

        container.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    /**
     * Altera o estado de um botão para "Carregando" (Mostra o spinner)
     * @param {string} buttonId 
     * @param {boolean} isLoading 
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
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-view') === viewName) {
                btn.classList.add('active');
                if (pageTitle) pageTitle.textContent = btn.textContent;
            }
        });
        mainContent.innerHTML = `<div class="text-center mt-md"><span class="spinner" style="position:relative; border-color:#ccc; border-top-color:var(--color-primary)"></span> Carregando...</div>`;
        const event = new CustomEvent('viewChanged', { detail: { view: viewName } });
        document.dispatchEvent(event);
    }
};

window.UI = UI;

document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const view = e.target.getAttribute('data-view');
            if (view) UI.switchView(view);
        });
    });

    const btnMenu = document.getElementById('btn-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (btnMenu && sidebar) {
        btnMenu.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }
});