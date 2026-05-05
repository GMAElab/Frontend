/**
 * Mobile Menu Handler
 * Gerencia a abertura/fechamento do menu sidebar em dispositivos móveis
 * Adiciona overlay para melhor UX
 */

document.addEventListener('DOMContentLoaded', function() {
    // Criar overlay se não existir
    if (!document.getElementById('sidebar-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'sidebar-overlay';
        overlay.className = 'sidebar-overlay';
        document.body.insertBefore(overlay, document.body.firstChild);
    }

    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const navItems = document.querySelectorAll('.nav-item');

    // Função para fechar o menu
    function closeSidebar() {
        if (sidebar) {
            sidebar.classList.remove('open');
        }
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    // Função para abrir o menu
    function openSidebar() {
        if (sidebar) {
            sidebar.classList.add('open');
        }
        if (overlay) {
            overlay.classList.add('active');
        }
    }

    // Toggle menu ao clicar no botão hamburger
    if (menuToggle) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (sidebar && sidebar.classList.contains('open')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });

        // Toque duplo no menu não faz nada (evita zoom)
        menuToggle.addEventListener('touchstart', function(e) {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        });
    }

    // Fechar o menu ao clicar fora (no overlay)
    if (overlay) {
        overlay.addEventListener('click', () => {
            closeSidebar();
        });
    }

    // Fechar o menu quando um item é clicado
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Pequeno delay para melhor UX
            setTimeout(() => {
                closeSidebar();
            }, 100);
        });
    });

    // Fechar o menu ao pressionar Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar && sidebar.classList.contains('open')) {
            closeSidebar();
        }
    });

    // Fechar o menu quando a janela é redimensionada (desktop)
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768 && sidebar && sidebar.classList.contains('open')) {
            closeSidebar();
        }
    });

    console.log('Mobile Menu Handler inicializado com sucesso');
});
