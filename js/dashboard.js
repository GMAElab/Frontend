// ==========================================
// INICIALIZAÇÃO DO DASHBOARD
// ==========================================
document.addEventListener('DOMContentLoaded', () => {

    const userString = localStorage.getItem('user_data');
    if (userString) {
        const user = JSON.parse(userString);

        const nomeEl = document.getElementById('user-greeting');
        const papelEl = document.getElementById('user-role');
        if (nomeEl) nomeEl.textContent = user.nome || 'Usuário';
        if (papelEl) papelEl.textContent = user.role || '';

        const btnSetup2FA = document.getElementById('btn-setup-2fa');
        if (btnSetup2FA && !user.is_2fa_enabled) {
            btnSetup2FA.style.display = 'inline-flex';
        }

        const btnAdmin = document.getElementById('menu-admin');
        if (btnAdmin) {
            if (user.role === 'admin') {
                btnAdmin.style.display = 'block';
            } else {
                btnAdmin.remove();
            }
        }

        if (user.must_change_password) {
            exibirModalTrocaSenhaObrigatoria();
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
});

// ==========================================
// CONFIGURAÇÃO DO 2FA 
// ==========================================

// 1. Abre o modal
window.abrirSetup2FA = async function() {
    try {
        document.getElementById('modal-setup-2fa').style.display = 'flex';
        document.getElementById('qrcode-container').innerHTML = '<span class="spinner"></span>';
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
                colorDark: "#16171A",
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

window.confirmarAtivacao2FA = async function() {
    const codigo = document.getElementById('codigo-confirmacao-2fa').value.trim();
    
    if (!codigo || codigo.length < 6) {
        UI.showToast('Introduza o código de 6 dígitos completo.', 'warning');
        return;
    }

    const btn = document.getElementById('btn-confirmar-2fa');
    const textoOriginal = btn.innerText;
    btn.innerText = 'Verificando...';
    btn.disabled = true;

    try {
        const response = await window.api.fetchProtected('2fa/confirmar', {
            method: 'POST',
            body: JSON.stringify({ codigo: codigo }) 
        });

        const data = await response.json();

        if (response.ok) {
            UI.showToast('Segurança ativada! Iniciando download das chaves...', 'success');
            if (data.codigos_backup) {
                const conteudoArquivo = 
` SGCI LEQM - CÓDIGOS DE RECUPERAÇÃO 2FA 

Guarde este arquivo em um local seguro, de preferência offline.
Se você esquecer sua senha ou perder o acesso ao seu celular, 
utilize um destes códigos para recuperar sua conta.

ATENÇÃO: Cada código listado abaixo só pode ser utilizado UMA ÚNICA VEZ.

${data.codigos_backup.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Gerado em: ${new Date().toLocaleString('pt-BR')}
`;
                const blob = new Blob([conteudoArquivo], { type: 'text/plain' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'SGCI_Codigos_Recuperacao.txt';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

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
        UI.showToast('Erro ao validar os dados.', 'error');
    } finally {
        btn.innerText = textoOriginal;
        btn.disabled = false;
    }
};

// ==========================================
// TROCA DE SENHA OBRIGATÓRIA (após reset feito por um admin)
// ==========================================
function exibirModalTrocaSenhaObrigatoria() {
    const modalId = 'forcar-troca-senha-modal';
    if (document.getElementById(modalId)) return;

    const modalHtml = `
    <div id="${modalId}" class="modal-overlay is-open is-top is-locked">
        <div class="modal-content modal-sm">
            <div class="modal-header">
                <div>
                    <p class="eyebrow">obrigatório</p>
                    <h3>Defina uma nova senha</h3>
                </div>
            </div>
            <p class="dialog-text mb-md">Um administrador redefiniu sua senha. Crie uma nova antes de continuar.</p>

            <div class="input-group">
                <label for="ftc-senha-atual">Senha temporária</label>
                <input type="password" id="ftc-senha-atual" autocomplete="current-password">
            </div>
            <div class="input-group">
                <label for="ftc-nova-senha">Nova senha</label>
                <input type="password" id="ftc-nova-senha" autocomplete="new-password">
                <span class="help">8 ou mais caracteres, com maiúscula, minúscula, número e símbolo.</span>
            </div>
            <div class="input-group">
                <label for="ftc-confirmar-senha">Confirmar nova senha</label>
                <input type="password" id="ftc-confirmar-senha" autocomplete="new-password">
            </div>
            <p id="ftc-erro" class="form-error"></p>

            <div class="modal-footer">
                <button id="ftc-btn-salvar" class="btn btn-primary">Salvar nova senha</button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const btn = document.getElementById('ftc-btn-salvar');
    const erro = document.getElementById('ftc-erro');

    const salvar = async () => {
        const senhaAtual = document.getElementById('ftc-senha-atual').value;
        const novaSenha = document.getElementById('ftc-nova-senha').value;
        const confirmar = document.getElementById('ftc-confirmar-senha').value;

        erro.style.display = 'none';

        if (!senhaAtual || !novaSenha || !confirmar) {
            erro.innerText = 'Preencha todos os campos.';
            erro.style.display = 'block';
            return;
        }
        if (novaSenha !== confirmar) {
            erro.innerText = 'As senhas não coincidem.';
            erro.style.display = 'block';
            return;
        }

        btn.disabled = true;
        btn.innerText = 'Salvando...';

        try {
            const res = await window.api.fetchProtected('/trocar-senha', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ senha_atual: senhaAtual, nova_senha: novaSenha })
            });

            if (res.ok) {
                const userAtual = JSON.parse(localStorage.getItem('user_data'));
                userAtual.must_change_password = false;
                localStorage.setItem('user_data', JSON.stringify(userAtual));
                document.getElementById(modalId).remove();
                if (window.UI) window.UI.showToast('Senha alterada com sucesso!', 'success');
            } else {
                const data = await res.json().catch(() => ({}));
                erro.innerText = data.detail || 'Erro ao alterar a senha.';
                erro.style.display = 'block';
            }
        } catch (e) {
            erro.innerText = 'Falha de conexão. Tente novamente.';
            erro.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.innerText = 'Salvar nova senha';
        }
    };

    btn.onclick = salvar;
    document.getElementById(modalId).querySelectorAll('input').forEach(input => {
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); salvar(); } });
    });
}