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

// ==========================================
// 1. TELA PRINCIPAL (MENU DE CARDS)
// ==========================================
function renderAdminPanel() {
    const container = document.getElementById('dynamic-content');
    container.innerHTML = `
    <div class="admin-container fade-in">
        <h2 style="margin-bottom: 5px;">👑 Central de Comando</h2>
        <p class="text-muted" style="margin-bottom: 20px;">Gestão absoluta de acessos, dados e integridade do laboratório.</p>
        
        <div class="grid-fluida" style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
            <div class="card-responsivo" style="cursor: pointer; border-top: 4px solid #3B82F6;" onclick="openAdminModule('users')">
                <h3 style="display: flex; align-items: center; gap: 10px;">👥 Usuários</h3>
                <p class="text-muted">Aprovações pendentes, remoção de contas e gestão de cargos.</p>
            </div>
            
            <div class="card-responsivo" style="cursor: pointer; border-top: 4px solid #10B981;" onclick="openAdminModule('lab')">
                <h3 style="display: flex; align-items: center; gap: 10px;">🔬 Laboratório</h3>
                <p class="text-muted">Exclusão de Equipamentos e revogação de Procedimentos (POPs).</p>
            </div>
            
            <div class="card-responsivo" style="cursor: pointer; border-top: 4px solid #8B5CF6;" onclick="openAdminModule('pd')">
                <h3 style="display: flex; align-items: center; gap: 10px;">📋 P&D e PTA</h3>
                <p class="text-muted">Controle de Tópicos do Plano Anual e Processos cadastrados.</p>
            </div>
        </div>
        
        <div id="admin-module-area" style="margin-top: 30px;"></div>
    </div>`;
}

// ==========================================
// 2. ROTEADOR DE MÓDULOS
// ==========================================
window.openAdminModule = function(module) {
    const area = document.getElementById('admin-module-area');
    
    let html = `
        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--border-light);">
            <button class="btn btn-secondary" onclick="renderAdminPanel()" style="padding: 5px 15px;">⬅ Voltar</button>
            <h3 style="margin: 0;">${module === 'users' ? 'Gestão de Usuários' : module === 'lab' ? 'Gestão do Laboratório' : 'Gestão de P&D'}</h3>
        </div>
        <div id="module-subcontent"></div>
    `;
    area.innerHTML = html;
    
    const sub = document.getElementById('module-subcontent');
    
    if (module === 'users') {
        sub.innerHTML = `
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <button class="btn btn-primary" id="tab-pending" onclick="switchUserTab('pending')">Pedidos Pendentes</button>
                <button class="btn btn-secondary" id="tab-active" onclick="switchUserTab('active')">Usuários Ativos</button>
            </div>
            <div id="users-container"></div>`;
        switchUserTab('pending');
    } 
    else if (module === 'lab') {
        sub.innerHTML = `
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <button class="btn btn-primary" id="tab-eq" onclick="switchLabTab('eq')">Equipamentos</button>
                <button class="btn btn-secondary" id="tab-pop" onclick="switchLabTab('pop')">POPs</button>
            </div>
            <div id="lab-container"></div>`;
        switchLabTab('eq');
    }
    else if (module === 'pd') {
        sub.innerHTML = `
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <button class="btn btn-primary" id="tab-proc" onclick="switchPdTab('proc')">Processos</button>
                <button class="btn btn-secondary" id="tab-pta" onclick="switchPdTab('pta')">Tópicos PTA</button>
            </div>
            <div id="pd-container"></div>`;
        switchPdTab('proc');
    }
};

// ==========================================
// 3. MÓDULO: USUÁRIOS
// ==========================================
window.switchUserTab = function(tab) {
    document.getElementById('tab-pending').className = tab === 'pending' ? 'btn btn-primary' : 'btn btn-secondary';
    document.getElementById('tab-active').className = tab === 'active' ? 'btn btn-primary' : 'btn btn-secondary';
    const container = document.getElementById('users-container');
    
    if (tab === 'pending') loadPendingRequests(container);
    else loadActiveUsers(container);
};

async function loadPendingRequests(container) {
    container.innerHTML = '<span class="spinner"></span> Carregando...';
    try {
        const res = await window.api.fetchProtected('/admin/pedidos-cadastro'); 
        if (!res.ok) throw new Error("Erro na API");
        const requests = await res.json();

        if (requests.length === 0) {
            container.innerHTML = '<div class="card-responsivo"><p class="text-muted">Nenhum pedido pendente.</p></div>';
            return;
        }

        let html = '<div class="grid-fluida">';
        requests.forEach(req => {
            html += `
                <div class="card-responsivo">
                    <h4>${window.escapeHTML(req.nome)}</h4>
                    <p class="text-muted" style="font-size: 14px;">${window.escapeHTML(req.email)}</p>
                    <select id="role-${req.id}" class="form-control" style="margin: 10px 0;">
                        <option value="pesquisador">Pesquisador</option>
                        <option value="tecnico">Técnico</option>
                        <option value="coordenador">Coordenador</option>
                        <option value="admin">Administrador</option>
                    </select>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-outline-danger" style="flex: 1;" onclick="handleApproval(${req.id}, false)">Rejeitar</button>
                        <button class="btn btn-primary" style="flex: 1;" onclick="handleApproval(${req.id}, true)">Aprovar</button>
                    </div>
                </div>`;
        });
        container.innerHTML = html + '</div>';
    } catch (err) { container.innerHTML = '<p style="color:red;">Erro ao carregar pedidos.</p>'; }
}

window.handleApproval = async (id, isApproved) => {
    if(!confirm(isApproved ? "Aprovar usuário?" : "Rejeitar pedido?")) return;
    try {
        const endpoint = isApproved ? `/aprovar-registro/${id}` : `/rejeitar-registro/${id}`;
        let opts = { method: 'POST' };
        if (isApproved) {
            opts.headers = { 'Content-Type': 'application/json' };
            opts.body = JSON.stringify({ role_atribuida: document.getElementById(`role-${id}`).value });
        }
        const res = await window.api.fetchProtected(endpoint, opts);
        if (res.ok) {
            window.UI.showToast("Sucesso!", "success");
            switchUserTab('pending');
        } else window.UI.showToast("Erro na operação", "error");
    } catch (err) { window.UI.showToast("Falha na rede.", "error"); }
};

async function loadActiveUsers(container) {
    container.innerHTML = '<span class="spinner"></span> Carregando...';
    try {
        const res = await window.api.fetchProtected('/admin/usuarios'); 
        if (!res.ok) throw new Error("Erro na API");
        const users = await res.json();
        
        let html = '<div class="card-responsivo" style="overflow-x: auto;"><table style="width:100%; text-align:left;">';
        html += '<tr style="border-bottom: 1px solid #ccc;"><th>ID</th><th>Nome</th><th>Email</th><th>Cargo</th><th>Ação</th></tr>';
        
        users.forEach(u => {
            // Nota: Usamos &apos; para evitar conflito de aspas no HTML
            const btn = u.role !== 'admin' ? `<button class="btn btn-outline-danger" style="padding: 5px;" onclick="adminDelete('usuarios', ${u.id}, 'switchUserTab(&apos;active&apos;)')">Excluir</button>` : 'Protegido';
            html += `<tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px 0;">#${u.id}</td>
                <td>${window.escapeHTML(u.nome)}</td>
                <td>${window.escapeHTML(u.email)}</td>
                <td><span style="text-transform: capitalize;">${window.escapeHTML(u.role)}</span></td>
                <td>${btn}</td>
            </tr>`;
        });
        container.innerHTML = html + '</table></div>';
    } catch (err) { container.innerHTML = '<p style="color:red;">Erro.</p>'; }
}


// ==========================================
// 4. MÓDULO: LABORATÓRIO
// ==========================================
window.switchLabTab = function(tab) {
    document.getElementById('tab-eq').className = tab === 'eq' ? 'btn btn-primary' : 'btn btn-secondary';
    document.getElementById('tab-pop').className = tab === 'pop' ? 'btn btn-primary' : 'btn btn-secondary';
    const container = document.getElementById('lab-container');
    
    if (tab === 'eq') loadAdminEquipments(container);
    else loadAdminPops(container);
};

async function loadAdminEquipments(container) {
    container.innerHTML = '<span class="spinner"></span>';
    try {
        const res = await window.api.fetchProtected('/equipments');
        const eq = await res.json();
        let html = '<div class="card-responsivo"><table style="width:100%; text-align:left;"><tr><th>ID</th><th>Equipamento</th><th>Ação</th></tr>';
        eq.forEach(e => {
            html += `<tr><td style="padding: 10px 0;">#${e.id}</td><td>${window.escapeHTML(e.nome)}</td>
            <td><button class="btn btn-outline-danger" style="padding: 5px;" onclick="adminDelete('equipments', ${e.id}, 'switchLabTab(&apos;eq&apos;)')">Deletar</button></td></tr>`;
        });
        container.innerHTML = html + '</table></div>';
    } catch (err) {}
}

async function loadAdminPops(container) {
    container.innerHTML = '<span class="spinner"></span>';
    container.innerHTML = `
        <div class="card-responsivo">
            Para excluir POPs, digite o código exato: <br><br>
            <input type="text" id="pop-code" class="form-control" placeholder="Ex: POP-001" style="width: 200px; display: inline-block;">
            <button class="btn btn-outline-danger" onclick="adminDelete('pops', document.getElementById('pop-code').value, 'switchLabTab(&apos;pop&apos;)')">Excluir POP</button>
        </div>
    `;
}

// ==========================================
// 5. MÓDULO: P&D E PTA
// ==========================================
window.switchPdTab = function(tab) {
    document.getElementById('tab-proc').className = tab === 'proc' ? 'btn btn-primary' : 'btn btn-secondary';
    document.getElementById('tab-pta').className = tab === 'pta' ? 'btn btn-primary' : 'btn btn-secondary';
    const container = document.getElementById('pd-container');
    
    if (tab === 'proc') loadAdminProcesses(container);
    else loadAdminPtaTopics(container);
};

async function loadAdminProcesses(container) {
    container.innerHTML = '<span class="spinner"></span>';
    try {
        const res = await window.api.fetchProtected('/processes');
        const procs = await res.json();
        let html = '<div class="card-responsivo"><table style="width:100%; text-align:left;"><tr><th>ID</th><th>Processo</th><th>Ação</th></tr>';
        procs.forEach(p => {
            html += `<tr><td style="padding: 10px 0;">#${p.id}</td><td>${window.escapeHTML(p.nome_processo)}</td>
            <td><button class="btn btn-outline-danger" style="padding: 5px;" onclick="adminDelete('processes', ${p.id}, 'switchPdTab(&apos;proc&apos;)')">Deletar</button></td></tr>`;
        });
        container.innerHTML = html + '</table></div>';
    } catch (err) {}
}

async function loadAdminPtaTopics(container) {
    container.innerHTML = '<span class="spinner"></span>';
    try {
        const res = await window.api.fetchProtected('/pta/topicos');
        const tops = await res.json();
        let html = '<div class="card-responsivo"><table style="width:100%; text-align:left;"><tr><th>Ano</th><th>Tópico</th><th>Ação</th></tr>';
        tops.forEach(t => {
            html += `<tr><td style="padding: 10px 0;">${t.ano}</td><td>${window.escapeHTML(t.titulo)}</td>
            <td><button class="btn btn-outline-danger" style="padding: 5px;" onclick="adminDelete('pta/topicos', ${t.id}, 'switchPdTab(&apos;pta&apos;)')">Deletar Tópico</button></td></tr>`;
        });
        container.innerHTML = html + '</table></div>';
    } catch (err) {}
}

// ==========================================
// MOTOR DE EXCLUSÃO GLOBAL DE ALTA SEGURANÇA
// ==========================================
window.adminDelete = async (route, id, reloadCallbackFunc) => {
    if(!id) return;
    const confirmMsg = `⚠️ ALERTA DE SEGURANÇA ⚠️\n\nVocê está prestes a excluir o item [ ${id} ] do banco de dados.\nEssa ação é IRREVERSÍVEL e apagará todos os dados anexados a ele.\n\nTem certeza absoluta?`;
    
    if(!confirm(confirmMsg)) return;

    try {
        const res = await window.api.fetchProtected(`/admin/${route}/${id}`, { method: 'DELETE' });
        
        if (res.ok) {
            window.UI.showToast("Dado obliterado com sucesso.", "success");
            eval(reloadCallbackFunc); 
        } else {
            const errData = await res.json().catch(() => ({}));
            window.UI.showToast(errData.detail || "Erro de permissão ou não encontrado.", "error");
        }
    } catch (err) {
        window.UI.showToast("Falha crítica de comunicação com a API.", "error");
    }
};