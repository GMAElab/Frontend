document.addEventListener('viewChanged', (e) => {
    if (e.detail.view === 'admin') routerAdmin();
});

function routerAdmin() {
    const userString = localStorage.getItem('user_data');
    if (!userString) return;
    const user = JSON.parse(userString);
    if (user.role !== 'admin') {
        document.getElementById('dynamic-content').innerHTML = `
            <div class="card-responsivo" style="border-left: 4px solid #EF4444;">
                <h3 style="color: #DC2626;">Acesso Negado</h3>
                <p>Esta área é restrita para Administradores do Sistema.</p>
            </div>
        `;
        return;
    }
    
    renderAdminPanel();
}

function renderAdminPanel() {
    const main = document.getElementById('dynamic-content');
    
    main.innerHTML = `
        <div class="view-header">
            <h2>Painel Administrativo</h2>
            <p class="text-muted">Gerencie usuários, permissões e pendências do laboratório.</p>
        </div>
        
        <div style="display: flex; gap: 10px; border-bottom: 1px solid var(--border-light); padding-bottom: 15px; margin-bottom: 20px; flex-wrap: wrap;">
            <button class="btn btn-primary" id="tab-pending" onclick="switchAdminTab('pending')" style="flex: 1; min-width: 150px;">Pedidos Pendentes</button>
            <button class="btn btn-secondary" id="tab-users" onclick="switchAdminTab('users')" style="flex: 1; min-width: 150px;">Usuários Ativos</button>
        </div>
        
        <div id="admin-tab-content">
            <span class="spinner"></span> Carregando conteúdo...
        </div>
    `;
    
    switchAdminTab('pending');
}

window.switchAdminTab = function(tab) {
    document.getElementById('tab-users').className = tab === 'users' ? 'btn btn-primary' : 'btn btn-secondary';
    document.getElementById('tab-users').style.flex = "1";
    document.getElementById('tab-users').style.minWidth = "150px";

    document.getElementById('tab-pending').className = tab === 'pending' ? 'btn btn-primary' : 'btn btn-secondary';
    document.getElementById('tab-pending').style.flex = "1";
    document.getElementById('tab-pending').style.minWidth = "150px";

    const container = document.getElementById('admin-tab-content');
    container.innerHTML = '<span class="spinner"></span> Carregando...';

    if (tab === 'users') {
        loadActiveUsers(container);
    } else {
        loadPendingRequests(container);
    }
};

// ==========================================
// ABA 1: PEDIDOS PENDENTES (Layout em Grid de Cards)
// ==========================================
async function loadPendingRequests(container) {
    try {
        const res = await window.api.fetchProtected('/admin/pedidos-cadastro'); 
        
        if (!res.ok) throw new Error("Erro na API");
        const requests = await res.json();

        if (requests.length === 0) {
            container.innerHTML = `
                <div class="card-responsivo" style="text-align: center; padding: 40px 20px;">
                    <p class="text-muted">Nenhum pedido de registro pendente no momento.</p>
                </div>`;
            return;
        }

        let html = '<div class="grid-fluida" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));">';

        requests.forEach(req => {
            html += `
                <div class="card-responsivo" style="background: #FAF5FF; border: 1px solid #E9D5FF; margin-bottom: 0;">
                    <h4 style="margin: 0 0 5px 0;">${req.nome}</h4>
                    <p style="margin: 0 0 15px 0; font-size: 14px; color: var(--text-muted);">📧 ${req.email}</p>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="font-size: 12px; font-weight: bold; color: #6B21A8;">Atribuir Cargo:</label>
                        <select id="role-select-${req.id}" class="form-control" style="margin-top: 5px;">
                            <option value="pesquisador">Pesquisador</option>
                            <option value="tecnico">Técnico</option>
                            <option value="coordenador">Coordenador</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>
                    
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-outline-danger" style="flex: 1; padding: 10px;" onclick="handleApproval(${req.id}, false)">Rejeitar</button>
                        <button class="btn btn-primary" style="flex: 1; padding: 10px; background: #9333EA; border-color: #9333EA;" onclick="handleApproval(${req.id}, true)">✅ Aprovar</button>
                    </div>
                </div>`;
        });

        container.innerHTML = html + '</div>';
    } catch (err) {
        container.innerHTML = '<div class="card-responsivo" style="color: red;">Erro ao carregar pendências. Verifique sua conexão.</div>';
    }
}

window.handleApproval = async (id, isApproved) => {
    if(!confirm(isApproved ? "Confirma a APROVAÇÃO deste usuário?" : "Tem certeza que deseja REJEITAR e excluir este pedido?")) return;

    try {
        const endpoint = isApproved ? `/aprovar-registro/${id}` : `/rejeitar-registro/${id}`;
        let fetchOptions = { method: 'POST' };

        if (isApproved) {
            const roleEscolhida = document.getElementById(`role-select-${id}`).value;
            fetchOptions.headers = { 'Content-Type': 'application/json' };
            fetchOptions.body = JSON.stringify({ role_atribuida: roleEscolhida });
        }

        const res = await window.api.fetchProtected(endpoint, fetchOptions);
        
        if (res.ok) {
            window.UI.showToast(isApproved ? "Usuário aprovado e cargo definido!" : "Pedido rejeitado e excluído.", "success");
            switchAdminTab('pending');
        } else {
            const errData = await res.json();
            window.UI.showToast(errData.detail || "Erro na operação", "error");
        }
    } catch (err) {
        window.UI.showToast("Erro ao comunicar com o servidor.", "error");
    }
};

// ==========================================
// ABA 2: USUÁRIOS ATIVOS (Tabela com proteção mobile)
// ==========================================
async function loadActiveUsers(container) {
    try {
        const res = await window.api.fetchProtected('/admin/usuarios'); 
        
        if (!res.ok) throw new Error("Erro na API");
        const users = await res.json();

        if (users.length === 0) {
            container.innerHTML = '<div class="card-responsivo"><p class="text-muted">Nenhum usuário cadastrado.</p></div>';
            return;
        }
       let html = `
            <div class="card-responsivo">
                <div style="overflow-x: auto;">
                    <table style="width: 100%; text-align: left; border-collapse: collapse; min-width: 600px;">
                        <thead>
                            <tr style="border-bottom: 2px solid var(--border-light);">
                                <th style="padding: 15px 10px; color: var(--text-muted);">ID</th>
                                <th style="padding: 15px 10px; color: var(--text-muted);">Nome</th>
                                <th style="padding: 15px 10px; color: var(--text-muted);">Email</th>
                                <th style="padding: 15px 10px; color: var(--text-muted);">Cargo</th>
                                <th style="padding: 15px 10px; text-align: right; color: var(--text-muted);">Ações</th>
                            </tr>
                        </thead>
                        <tbody>`;

        users.forEach(user => {
            const roleBadge = user.role === 'admin' 
                ? '<span style="background: #FEF08A; color: #854D0E; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold;">Admin</span>'
                : `<span style="background: #DBEAFE; color: #1E40AF; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; text-transform: capitalize;">${user.role}</span>`;

            const acoes = user.role !== 'admin'
                ? `<button class="btn btn-outline-danger" style="padding: 6px 12px; font-size: 12px;" onclick="deleteUser(${user.id}, '${user.nome}')">Excluir</button>`
                : `<span style="font-size: 12px; color: var(--text-muted); font-style: italic;">Protegido</span>`;

            html += `
                <tr style="border-bottom: 1px solid var(--border-light);">
                    <td style="padding: 15px 10px;">#${user.id}</td>
                    <td style="padding: 15px 10px; font-weight: bold;">${user.nome}</td>
                    <td style="padding: 15px 10px;">${user.email}</td>
                    <td style="padding: 15px 10px;">${roleBadge}</td>
                    <td style="padding: 15px 10px; text-align: right;">${acoes}</td>
                </tr>`;
        });

        container.innerHTML = html + `</tbody></table></div></div>`;
    } catch (err) {
        container.innerHTML = '<div class="card-responsivo" style="color: red;">Erro ao carregar usuários.</div>';
    }
}

window.deleteUser = async (id, nome) => {
    if(!confirm(`CUIDADO: Tem certeza que deseja excluir o usuário "${nome}" permanentemente? Essa ação bloqueia o acesso na mesma hora.`)) return;
    
    try {
        const res = await window.api.fetchProtected(`/admin/usuarios/${id}`, { method: 'DELETE' });
        if (res.ok) {
            window.UI.showToast("Usuário excluído com sucesso.", "success");
            switchAdminTab('users');
        } else {
            const errData = await res.json();
            window.UI.showToast(errData.detail || "Erro ao excluir usuário.", "error");
        }
    } catch (err) {
        window.UI.showToast("Falha de conexão.", "error");
    }
};