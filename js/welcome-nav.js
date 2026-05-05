/**
 * Welcome Screen Mobile Navigation
 * Adiciona botões de navegação rápida na tela inicial para dispositivos móveis
 */

document.addEventListener('DOMContentLoaded', function() {
    // Aguardar um pouco para garantir que o DOM está pronto
    setTimeout(function() {
        const welcomeCard = document.querySelector('.welcome-card');
        
        if (welcomeCard) {
            // Verificar se já tem botões (para evitar duplicação)
            if (!welcomeCard.querySelector('.mobile-nav-grid')) {
                // Criar container dos botões
                const navGrid = document.createElement('div');
                navGrid.className = 'mobile-nav-grid';
                navGrid.style.cssText = `
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                    gap: 12px;
                    margin-top: 24px;
                    padding: 20px 0;
                    border-top: 1px solid var(--border);
                `;
                
                // Definir as opções de navegação
                const navOptions = [
                    { view: 'equipments', icon: '⚙️', label: 'Equipamentos' },
                    { view: 'processes', icon: '🔬', label: 'Processos P&D' },
                    { view: 'pops', icon: '📋', label: 'POPs' },
                    { view: 'pta', icon: '📅', label: 'PTA' },
                    { view: 'articles', icon: '📰', label: 'Artigos' }
                ];
                
                // Criar botões
                navOptions.forEach(option => {
                    const btn = document.createElement('button');
                    btn.className = 'nav-btn-mobile';
                    btn.setAttribute('data-view', option.view);
                    btn.style.cssText = `
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        padding: 16px 12px;
                        background-color: var(--surface);
                        border: 1px solid var(--border);
                        border-radius: var(--radius-md);
                        cursor: pointer;
                        transition: all 0.2s ease;
                        min-height: 100px;
                        font-size: 0.9rem;
                        font-weight: 500;
                        color: var(--text-main);
                        font-family: inherit;
                    `;
                    
                    const icon = document.createElement('span');
                    icon.textContent = option.icon;
                    icon.style.fontSize = '28px';
                    
                    const label = document.createElement('span');
                    label.textContent = option.label;
                    label.style.cssText = `
                        text-align: center;
                        font-size: 0.8rem;
                    `;
                    
                    btn.appendChild(icon);
                    btn.appendChild(label);
                    
                    // Adicionar hover effect
                    btn.addEventListener('mouseenter', function() {
                        this.style.backgroundColor = 'var(--sidebar-active)';
                        this.style.transform = 'translateY(-2px)';
                        this.style.boxShadow = 'var(--shadow-sm)';
                    });
                    
                    btn.addEventListener('mouseleave', function() {
                        this.style.backgroundColor = 'var(--surface)';
                        this.style.transform = 'translateY(0)';
                        this.style.boxShadow = 'none';
                    });
                    
                    // Clique para navegar
                    btn.addEventListener('click', function() {
                        const view = this.getAttribute('data-view');
                        if (window.UI && window.UI.switchView) {
                            window.UI.switchView(view);
                        } else if (window.dispatchEvent) {
                            const event = new CustomEvent('viewChanged', { detail: { view: view } });
                            document.dispatchEvent(event);
                            
                            // Marcar como ativo no sidebar
                            document.querySelectorAll('.nav-item').forEach(item => {
                                item.classList.remove('active');
                                if (item.getAttribute('data-view') === view) {
                                    item.classList.add('active');
                                }
                            });
                        }
                        
                        // Fechar menu em mobile
                        const sidebar = document.querySelector('.sidebar');
                        if (sidebar && sidebar.classList.contains('open')) {
                            sidebar.classList.remove('open');
                            const overlay = document.getElementById('sidebar-overlay');
                            if (overlay) {
                                overlay.classList.remove('active');
                            }
                        }
                    });
                    
                    navGrid.appendChild(btn);
                });
                
                // Adicionar após o parágrafo de boas-vindas
                welcomeCard.appendChild(navGrid);
                
                // Adicionar mensagem de ajuda
                const helpMsg = document.createElement('p');
                helpMsg.style.cssText = `
                    margin-top: 24px;
                    padding-top: 20px;
                    border-top: 1px solid var(--border);
                    font-size: 0.85rem;
                    color: var(--text-muted);
                    text-align: center;
                `;
                helpMsg.innerHTML = '💡 <strong>Dica:</strong> Em dispositivos móveis, toque no menu <strong>☰</strong> no topo para mais opções.';
                welcomeCard.appendChild(helpMsg);
                
                console.log('Mobile navigation buttons adicionados com sucesso');
            }
        }
    }, 300);
});

// Estilo para melhor aparência em dispositivos realmente pequenos
if (window.innerWidth < 480) {
    const style = document.createElement('style');
    style.textContent = `
        .mobile-nav-grid {
            grid-template-columns: repeat(2, 1fr) !important;
        }
        
        .nav-btn-mobile {
            min-height: 90px;
            font-size: 0.85rem;
        }
        
        .nav-btn-mobile span:first-child {
            font-size: 24px !important;
        }
    `;
    document.head.appendChild(style);
}
