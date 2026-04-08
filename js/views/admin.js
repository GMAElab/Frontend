document.addEventListener('viewChanged', (e) => {
    if (e.detail.view === 'admin') renderAdminPanel();
});

function renderAdminPanel() {
    const main = document.getElementById('dynamic-content');
    
    main.innerHTML = `
        <div class="view-header">
            <h2>Painel Administrativo</h2>
            <p class="text-muted">Gerencie usuários, permissões e pendências do laboratório.</p>
        </div>
        
        <div class="tabs-nav mt-md" style="display: flex; gap: 10px; border-bottom: 1px solid var(--border-light); padding-bottom: 10px;">
            <button class="btn btn-secondary active" id="tab-users" onclick="switchAdminTab('users')">Usuários Ativos</button>
            <button class="btn btn-secondary" id="tab-pending" onclick="switchAdminTab('pending')">Pedidos Pendentes</button>
        </div>
        
        <div id="admin-tab-content" class="card mt-md">
            <span class="spinner"></span> Carregando conteúdo...
        </div>
    `;
    
    switchAdminTab('pending');
}

window.switchAdminTab = function(tab) {
    document.getElementById('tab-users').classList.remove('btn-primary');
    document.getElementById('tab-users').classList.add('btn-secondary');
    document.getElementById('tab-pending').classList.remove('btn-primary');
    document.getElementById('tab-pending').classList.add('btn-secondary');
    
    document.getElementById(`tab-${tab}`).classList.remove('btn-secondary');
    document.getElementById(`tab-${tab}`).classList.add('btn-primary');

    const container = document.getElementById('admin-tab-content');
    container.innerHTML = '<span class="spinner"></span> Carregando...';

    if (tab === 'users') {
        loadActiveUsers(container);
    } else {
        loadPendingRequests(container);
    }
};

// ==========================================
// ABA 1: PEDIDOS PENDENTES 
// ==========================================
async function loadPendingRequests(container) {
    try {
        const res = await window.api.fetchProtected('/admin/pedidos-pendentes'); 
        
        if (!res.ok) throw new Error("Erro na API");
        const requests = await res.json();

        if (requests.length === 0) {
            container.innerHTML = '<p class="text-muted" style="padding: 20px;">Nenhum pedido de registro pendente no momento.</p>';
            return;
        }

        let html = `
            <div class="table-responsive">
                <table class="data-table" style="width: 100%; text-align: left; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border-light);">
                            <th style="padding: 12px 8px;">ID</th>
                            <th style="padding: 12px 8px;">Nome</th>
                            <th style="padding: 12px 8px;">Email</th>
                            <th style="padding: 12px 8px;">Atribuir Cargo</th>
                        </tr>
                    </thead>
                    <tbody>`;

        requests.forEach(req => {
            html += `
                <tr style="border-bottom: 1px solid var(--border-light);">
                    <td style="padding: 12px 8px;">${req.id}</td>
                    <td style="padding: 12px 8px;">${req.nome}</td>
                    <td style="padding: 12px 8px;">${req.email}</td>
                    <td style="padding: 12px 8px;">
                        <select id="role-select-${req.id}" class="form-control" style="width: 140px; display: inline-block; margin-right: 10px; padding: 6px;">
                            <option value="pesquisador">Pesquisador</option>
                            <option value="tecnico">Técnico</option>
                            <option value="coordenador">Coordenador</option>
                            <option value="admin">Administrador</option>
                        </select>
                        <button class="btn btn-primary btn-small" onclick="handleApproval(${req.id}, true)">Aprovar</button>
                        <button class="btn btn-outline-danger btn-small ml-sm" style="margin-left: 8px;" onclick="handleApproval(${req.id}, false)">Rejeitar</button>
                    </td>
                </tr>`;
        });

        container.innerHTML = html + `</tbody></table></div>`;
    } catch (err) {
        container.innerHTML = '<p class="text-danger" style="padding: 20px;">Erro ao carregar pendências. Verifique se a rota /admin/pedidos-pendentes existe no backend.</p>';
    }
}

window.handleApproval = async (id, isApproved) => {
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
// ABA 2: USUÁRIOS ATIVOS 
// ==========================================
async function loadActiveUsers(container) {
    try {
        const res = await window.api.fetchProtected('/admin/usuarios'); 
        
        if (!res.ok) throw new Error("Erro na API");
        const users = await res.json();

        if (users.length === 0) {
            container.innerHTML = '<p class="text-muted" style="padding: 20px;">Nenhum usuário cadastrado no sistema.</p>';
            return;
        }

        let html = `
            <div class="table-responsive">
                <table class="data-table" style="width: 100%; text-align: left; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border-light);">
                            <th style="padding: 12px 8px;">ID</th>
                            <th style="padding: 12px 8px;">Nome</th>
                            <th style="padding: 12px 8px;">Email</th>
                            <th style="padding: 12px 8px;">Cargo (Role)</th>
                            <th style="padding: 12px 8px;">Ações</th>
                        </tr>
                    </thead>
                    <tbody>`;

        users.forEach(user => {
            html += `
                <tr style="border-bottom: 1px solid var(--border-light);">
                    <td style="padding: 12px 8px;">${user.id}</td>
                    <td style="padding: 12px 8px;">${user.nome}</td>
                    <td style="padding: 12px 8px;">${user.email}</td>
                    <td style="padding: 12px 8px;">
                        <span style="background: #E5E7EB; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase;">
                            ${user.role}
                        </span>
                    </td>
                    <td style="padding: 12px 8px;">
                        <button class="btn btn-text btn-small" style="color: #DC2626;" onclick="deleteUser(${user.id})">Excluir</button>
                    </td>
                </tr>`;
        });

        container.innerHTML = html + `</tbody></table></div>`;
    } catch (err) {
        container.innerHTML = '<p class="text-danger" style="padding: 20px;">Erro ao carregar usuários. Verifique se a rota /admin/usuarios existe no backend.</p>';
    }
}

// Excluir user
window.deleteUser = async (id) => {
    if(!confirm("CUIDADO: Tem certeza que deseja excluir este usuário permanentemente?")) return;
    
    try {
        const res = await window.api.fetchProtected(`/admin/usuarios/${id}`, { method: 'DELETE' });
        if (res.ok) {
            window.UI.showToast("Usuário excluído com sucesso.", "success");
            switchAdminTab('users');
        } else {
            window.UI.showToast("Erro ao excluir usuário.", "error");
        }
    } catch (err) {
        window.UI.showToast("Falha de conexão.", "error");
    }
};