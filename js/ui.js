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
     * @param {string} viewName - O nome da tela 
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
    UI.switchView('inicio');
});


document.addEventListener('viewChanged', (e) => {
    const view = e.detail.view;
    const mainContent = document.getElementById('dynamic-content');
    if (view === 'inicio') {
        const userString = localStorage.getItem('user_data');
        const user = userString ? JSON.parse(userString) : { role: 'pesquisador', nome: 'Pesquisador' };
        const isAdmin = user.role === 'admin' || user.role === 'coordenador';

        if (isAdmin) {
            alertasHTML = `
                <div class="card" style="border-left: 4px solid var(--warning); padding: 20px; cursor: pointer; transition: transform 0.2s;" onclick="UI.switchView('admin')" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                    <h4 style="color: var(--text-main); margin-bottom: 5px; display: flex; align-items: center; gap: 8px; font-size: 14px;">
                        <span>⚠️</span> Pendências de Avaliação
                    </h4>
                    <p style="color: var(--text-muted); font-size: 13px; margin: 0; line-height: 1.5;">Existem pedidos de cadastro ou relatórios PTA de pesquisadores aguardando a sua revisão no Painel Admin.</p>
                </div>
                ${alertasHTML}
            `;
        } 
        mainContent.innerHTML = `
            <div class="view-header fade-in" style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px;">
                <div>
                    <h2 style="font-size: 1.8rem; font-weight: 700; color: var(--text-main); margin-bottom: 4px;">Visão Geral</h2>
                    <p class="text-muted" style="margin: 0; font-size: 14px;">Resumo das suas atividades e atalhos operacionais do laboratório.</p>
                </div>
            </div>

            <div class="fade-in" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; animation-delay: 0.2s;">
                
                <!-- Ações Rápidas -->
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <h3 style="font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 4px;">Ações Rápidas</h3>
                    
                    <button class="btn btn-secondary" style="justify-content: flex-start; padding: 18px 20px; font-size: 15px; border-radius: 12px; background: white; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); color: var(--text-main);" onclick="UI.switchView('pta')">
                        <span style="font-size: 20px; margin-right: 10px;"></span> Enviar PTA
                    </button>
                    
                    <button class="btn btn-secondary" style="justify-content: flex-start; padding: 18px 20px; font-size: 15px; border-radius: 12px; background: white; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); color: var(--text-main);" onclick="UI.switchView('processes')">
                        <span style="font-size: 20px; margin-right: 10px;"></span> Novo Processo
                    </button>
                    
                    <button class="btn btn-secondary" style="justify-content: flex-start; padding: 18px 20px; font-size: 15px; border-radius: 12px; background: white; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); color: var(--text-main);" onclick="UI.switchView('equipments')">
                        <span style="font-size: 20px; margin-right: 10px;"></span> Equipamentos
                    </button>

                    <button class="btn btn-secondary" style="justify-content: flex-start; padding: 18px 20px; font-size: 15px; border-radius: 12px; background: white; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); color: var(--text-main);" onclick="UI.switchView('articles')">
                        <span style="font-size: 20px; margin-right: 10px;"></span> Artigos
                    </button>
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
                <button id="btn-novo-processo" class="btn btn-primary">+ Novo Processo</button>
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
                        <tr><td colspan="5" style="text-align: center; padding: 30px; color: var(--text-muted);">Carregando processos...</td></tr>
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

const btnMenu = document.getElementById('btn-menu-toggle');
const sidebar = document.querySelector('.sidebar');

if (btnMenu && sidebar) {
    btnMenu.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
}

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        if (window.innerWidth <= 991) {
            sidebar.classList.remove('open');
        }
    });
});