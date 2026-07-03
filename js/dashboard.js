document.addEventListener('DOMContentLoaded', () => {

    const userString = localStorage.getItem('user_data');
    if (userString) {
        const user = JSON.parse(userString);
        const btnSetup2FA = document.getElementById('btn-setup-2fa');
        if (btnSetup2FA && user.is_2fa_enabled) {
            btnSetup2FA.style.display = 'none';
        }
        const btnAdmin = document.getElementById('menu-admin');
        if (btnAdmin) {
            if (user.role === 'admin') {
                btnAdmin.style.display = 'block';
            } else {
                btnAdmin.remove(); 
            }
        }
    }

    initializeUserProfile();

    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (menuToggle && sidebar) {        
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    const userString = localStorage.getItem('user_data');
    if (userString) {
        const user = JSON.parse(userString);
        const btnAdmin = document.getElementById('menu-admin');
        
        if (btnAdmin) {
            if (user.role === 'admin') {
                btnAdmin.style.display = 'block';
            } else {
                btnAdmin.remove(); 
            }
        }
    }

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if (window.api) window.api.logout();
            else {
                localStorage.clear();
                window.location.href = 'index.html';
            }
        });
    }

    configurarMenuLateral();
});

function initializeUserProfile() {
    const userGreeting = document.getElementById('user-greeting');
    const userAvatar = document.querySelector('.avatar');

    const savedName = localStorage.getItem('user_name') || 'Pesquisador';

    if (userGreeting) {
        userGreeting.textContent = `Olá, ${savedName}`;
    }

    if (userAvatar && savedName !== 'Pesquisador') {
        userAvatar.textContent = savedName.charAt(0).toUpperCase();
    }
}

window.toggleMenu = function() {
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) sidebar.classList.toggle('collapsed');
};

function configurarMenuLateral() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sidebar = document.getElementById('app-sidebar');
    
    if (!sidebar) return;

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.add('collapsed');
            }
        });
    });

    if (window.innerWidth <= 768) {
        sidebar.classList.add('collapsed');
    }
}

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
// CONFIGURAÇÃO DO 2FA 
// ==========================================

// 1. Abre o modal
window.abrirSetup2FA = async function() {
    try {
        document.getElementById('modal-setup-2fa').style.display = 'flex';
        document.getElementById('qrcode-container').innerHTML = '<span class="spinner" style="border-top-color: var(--primary);"></span> a carregar...';
        document.getElementById('secret-text').innerText = '';
        document.getElementById('codigo-confirmacao-2fa').value = '';
        document.getElementById('2fa-step-1').classList.remove('hidden');
        document.getElementById('2fa-step-2').classList.add('hidden');

        const response = await window.api.fetchProtected('2fa/setup', {
            method: 'GET'
        });
        const data = await response.json();

        if (response.ok && data.qr_uri) {
            document.getElementById('qrcode-container').innerHTML = '';
            new QRCode(document.getElementById('qrcode-container'), {
                text: data.qr_uri,
                width: 180,
                height: 180,
                colorDark: "#0F172A",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
            document.getElementById('secret-text').innerText = data.secret;
        } else {
            UI.showToast(data.detail || 'O 2FA já está ativo ou ocorreu um erro.', 'error');
            window.fecharSetup2FA();
        }
    } catch (error) {
        UI.showToast('Erro de comunicação ao configurar o 2FA.', 'error');
        window.fecharSetup2FA();
    }
};

// navegacao do modal
window.fecharSetup2FA = function() {
    document.getElementById('modal-setup-2fa').style.display = 'none';
};

window.avancarPasso2FA = function() {
    document.getElementById('2fa-step-1').classList.add('hidden');
    document.getElementById('2fa-step-2').classList.remove('hidden');
    document.getElementById('codigo-confirmacao-2fa').focus();
};

window.voltarPasso2FA = function() {
    document.getElementById('2fa-step-2').classList.add('hidden');
    document.getElementById('2fa-step-1').classList.remove('hidden');
};

// 3. Valida e ativa o 2FA
window.confirmarAtivacao2FA = async function() {
    const codigo = document.getElementById('codigo-confirmacao-2fa').value.trim();
    
    if (!codigo || codigo.length < 6) {
        UI.showToast('Introduza o código de 6 dígitos completo.', 'warning');
        return;
    }

    const btn = document.getElementById('btn-confirmar-2fa');
    const textoOriginal = btn.innerText;
    btn.innerText = 'A verificar...';
    btn.disabled = true;

    try {
        const response = await window.api.fetchProtected('2fa/confirmar', {
            method: 'POST',
            body: JSON.stringify({ codigo: codigo })
        });

        const data = await response.json();

        if (response.ok) {
            UI.showToast('Autenticação de 2 Fatores ativada com sucesso!', 'success');
            window.fecharSetup2FA();
            const btnSetup2FA = document.getElementById('btn-setup-2fa');
            if (btnSetup2FA) btnSetup2FA.style.display = 'none';
            let userAtual = JSON.parse(localStorage.getItem('user_data'));
            userAtual.is_2fa_enabled = true;
            localStorage.setItem('user_data', JSON.stringify(userAtual));

        } else {
            UI.showToast(data.detail || 'Código incorreto. Tente novamente.', 'error');
            document.getElementById('codigo-confirmacao-2fa').value = '';
            document.getElementById('codigo-confirmacao-2fa').focus();
        }
    } catch (error) {
        UI.showToast('Erro ao validar o código.', 'error');
    } finally {
        btn.innerText = textoOriginal;
        btn.disabled = false;
    }
};