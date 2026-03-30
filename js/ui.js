const UI = {
    /**
     * Exibe uma notificação flutuante (Toast)
     * @param {string} message 
     * @param {string} type
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
     * @param {string} elementId 
     * @param {string} message 
     * @param {boolean} isError 
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


document.addEventListener('viewChanged', (e) => {
    const view = e.detail.view;
    const mainContent = document.getElementById('dynamic-content');

    if (view === 'processes') {
        mainContent.innerHTML = `
            <div class="view-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                    <h3 style="margin: 0;">Gestão de Processos</h3>
                    <p class="text-muted" style="margin-top: 5px;">Mapeamento, acompanhamento e histórico de processos.</p>
                </div>
                <button id="btn-novo-processo" class="btn btn-primary">+ Novo Processo</button>
            </div>

            <div class="card table-card">
                <div class="table-responsive">
                    <table class="data-table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 2px solid #eee; text-align: left;">
                                <th style="padding: 12px 8px;">Nome do Processo</th>
                                <th style="padding: 12px 8px;">Responsável</th>
                                <th style="padding: 12px 8px;">Status</th>
                                <th style="padding: 12px 8px;">Data de Registro</th>
                                <th style="padding: 12px 8px;">Ações</th>
                            </tr>
                        </thead>
                        <tbody id="processesTableBody">
                            <tr><td colspan="5" style="text-align: center; padding: 20px;">Carregando processos...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        const btnNovoProcesso = document.getElementById('btn-novo-processo');
        if (btnNovoProcesso) {
            btnNovoProcesso.addEventListener('click', () => {
                console.log("Iniciando abertura do modal...");
                
                if (typeof window.openProcessModal === 'function') {
                    window.openProcessModal();
                } else {
                    const modal = document.getElementById('processModal');
                    if (modal) {
                        modal.style.display = 'flex';
                        modal.style.zIndex = '99999';
                    } else {
                        alert("Erro: Estrutura do modal não encontrada no HTML principal.");
                    }
                }
            });
        }

        if (typeof loadProcessesTable === 'function') {
            loadProcessesTable();
        }
    }
});