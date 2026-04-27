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
        <h2 style="margin-bottom: 5px;">Painel de controle Administrador</h2>
        <p class="text-muted" style="margin-bottom: 20px;">Gerenciamento de todos os módulos do sistema.</p>
        
        <div class="grid-fluida" style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
            <div class="card-responsivo" style="cursor: pointer; border-top: 4px solid #3B82F6;" onclick="openAdminModule('users')">
                <h3 style="display: flex; align-items: center; gap: 10px;">👥 Usuários</h3>
                <p class="text-muted">Controle de acesso e permissões dos usuários.</p>
            </div>
            
            <div class="card-responsivo" style="cursor: pointer; border-top: 4px solid #10B981;" onclick="openAdminModule('lab')">
                <h3 style="display: flex; align-items: center; gap: 10px;">🔬 Laboratório</h3>
                <p class="text-muted">Controle dos equipamentos e POPs.</p>
            </div>
            
            <div class="card-responsivo" style="cursor: pointer; border-top: 4px solid #8B5CF6;" onclick="openAdminModule('pd')">
                <h3 style="display: flex; align-items: center; gap: 10px;">📋 P&D e PTA</h3>
                <p class="text-muted">Processos e PTA</p>
            </div>

            <div class="card-responsivo" style="cursor: pointer; border-top: 4px solid #F59E0B;" onclick="openAdminModule('audit')">
                <h3 style="display: flex; align-items: center; gap: 10px;">👁️ Auditoria e Logs</h3>
                <p class="text-muted">Rastreie quem fez o quê e quando.</p>
            </div>
        </div>
        
        <div id="admin-module-area" style="margin-top: 30px;"></div>

        <div id="deep-view-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; justify-content:center; align-items:center; backdrop-filter: blur(4px);">
            <div class="card-responsivo fade-in" style="background:#fff; width:90%; max-width:600px; max-height:90vh; overflow-y:auto; position:relative;">
                <button onclick="closeDeepView()" style="position:absolute; top:15px; right:15px; border:none; background:none; font-size:20px; cursor:pointer;">✖</button>
                <h3 id="dv-title" style="margin-top:0; border-bottom:2px solid var(--border-light); padding-bottom:10px;">Detalhes do Registro</h3>
                <div id="dv-body" style="margin-top:20px; display:flex; flex-direction:column; gap:15px;"></div>
                <div style="margin-top:25px; display:flex; gap:10px; justify-content:flex-end;">
                    <button class="btn btn-secondary" onclick="closeDeepView()">Cancelar</button>
                    <button class="btn btn-primary" id="dv-save-btn">💾 Salvar Alterações</button>
                </div>
            </div>
        </div>
    </div>`;
}
// ==========================================
// 2. ROTEADOR DE MÓDULOS
// ==========================================
window.openAdminModule = function(module) {
    const area = document.getElementById('admin-module-area');
    
    let title = 'Gestão';
    if (module === 'users') title = 'Gestão de Usuários';
    else if (module === 'lab') title = 'Gestão do Laboratório';
    else if (module === 'pd') title = 'Gestão de P&D';
    else if (module === 'audit') title = 'Logs de Auditoria';

    area.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--border-light);">
            <button class="btn btn-secondary" onclick="renderAdminPanel()" style="padding: 5px 15px;">⬅ Voltar</button>
            <h3 style="margin: 0;">${title}</h3>
        </div>
        <div id="module-subcontent"></div>
    `;
    
    const sub = document.getElementById('module-subcontent');
    
    if (module === 'users') {
        sub.innerHTML = `
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <button class="btn btn-primary" id="tab-pending" onclick="switchUserTab('pending')">Pedidos Pendentes:</button>
                <button class="btn btn-secondary" id="tab-active" onclick="switchUserTab('active')">Usuários Ativos:</button>
            </div>
            <div id="users-container"></div>`;
        switchUserTab('pending');
    } 
    else if (module === 'lab') {
        sub.innerHTML = `
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <button class="btn btn-primary" id="tab-eq" onclick="switchLabTab('eq')">Equipamentos:</button>
                <button class="btn btn-secondary" id="tab-pop" onclick="switchLabTab('pop')">POPs:</button>
            </div>
            <div id="lab-container"></div>`;
        switchLabTab('eq');
    }
    else if (module === 'pd') {
        sub.innerHTML = `
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <button class="btn btn-primary" id="tab-proc" onclick="switchPdTab('proc')">Processos:</button>
                <button class="btn btn-secondary" id="tab-pta" onclick="switchPdTab('pta')">Tópicos PTA:</button>
            </div>
            <div id="pd-container"></div>`;
        switchPdTab('proc');
    }
    else if (module === 'audit') {
        sub.innerHTML = `
            <div class="card-responsivo" style="background: #FFFBEB; border-color: #FCD34D;">
                <p style="margin: 0; color: #B45309;"><strong>Aviso:</strong> Estes registros são permanentes. Ninguém pode apagar o histórico de auditoria.</p>
            </div>
            <div id="audit-container"></div>`;
        loadAuditLogs(document.getElementById('audit-container'));
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
                    <h4>${req.nome}</h4>
                    <p class="text-muted" style="font-size: 14px;">${req.email}</p>
                    <select id="role-${req.id}" class="form-control" style="margin: 10px 0;">
                        <option value="pesquisador">Pesquisador:</option>
                        <option value="tecnico">Técnico:</option>
                        <option value="coordenador">Coordenador:</option>
                        <option value="admin">Administrador:</option>
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
        html += '<tr style="border-bottom: 1px solid #ccc;"><th>ID</th><th>Nome</th><th>Email</th><th>Cargo</th><th>Status</th><th>Ação</th></tr>';
        
        users.forEach(u => {
            const isActive = (u.is_active === 1 || u.is_active === true);
            const statusBadge = isActive 
                ? '<span style="background: #D1FAE5; color: #065F46; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">🟢 ATIVO</span>'
                : '<span style="background: #FEE2E2; color: #991B1B; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">🔴 INATIVO</span>';

            let btn = '';
            if (u.role === 'admin') {
                btn = '<span style="color:#9CA3AF; font-style:italic;">Protegido</span>';
            } else if (!isActive) {
                btn = `<button class="btn btn-secondary" style="padding: 5px;" onclick="openDeepView('usuarios', ${u.id}, 'Usuário')">👁️ Detalhes</button>`;
            } else {
                btn = `
                    <div style="display:flex; gap:5px;">
                        <button class="btn btn-secondary" style="padding: 5px;" onclick="openDeepView('usuarios', ${u.id}, 'Usuário')">✏️ Editar</button>
                        <button class="btn btn-outline-danger" style="padding: 5px;" onclick="adminDelete('usuarios', ${u.id}, 'active')">🚫 Bloquear</button>
                    </div>
                `;
            }

            const rowStyle = !isActive ? 'opacity: 0.6; background-color: #F9FAFB;' : '';

            html += `<tr style="border-bottom: 1px solid #eee; ${rowStyle}">
                <td style="padding: 10px 0;">#${u.id}</td>
                <td>${u.nome}</td>
                <td>${u.email}</td>
                <td><span style="text-transform: capitalize;">${u.role}</span></td>
                <td>${statusBadge}</td>
                <td>${btn}</td>
            </tr>`;
        });
        container.innerHTML = html + '</table></div>';
    } catch (err) { container.innerHTML = '<p style="color:red;">Erro ao carregar usuários.</p>'; }
}


// ==========================================
// 4. MÓDULO: LABORATÓRIO E P&D
// ==========================================
window.switchLabTab = function(tab) {
    document.getElementById('tab-eq').className = tab === 'eq' ? 'btn btn-primary' : 'btn btn-secondary';
    document.getElementById('tab-pop').className = tab === 'pop' ? 'btn btn-primary' : 'btn btn-secondary';
    const container = document.getElementById('lab-container');
    if (tab === 'eq') loadAdminEquipments(container); else loadAdminPops(container);
};

window.switchPdTab = function(tab) {
    document.getElementById('tab-proc').className = tab === 'proc' ? 'btn btn-primary' : 'btn btn-secondary';
    document.getElementById('tab-pta').className = tab === 'pta' ? 'btn btn-primary' : 'btn btn-secondary';
    const container = document.getElementById('pd-container');
    if (tab === 'proc') loadAdminProcesses(container); else loadAdminPtaTopics(container);
};

async function loadAdminEquipments(container) {
    container.innerHTML = '<span class="spinner"></span>';
    try {
        const res = await window.api.fetchProtected('/equipments');
        const eq = await res.json();
        if (!Array.isArray(eq) || eq.length === 0) {
            container.innerHTML = '<div class="card-responsivo"><p class="text-muted">Nenhum equipamento cadastrado.</p></div>';
            return;
        }

        let html = '<div class="card-responsivo"><table style="width:100%; text-align:left;"><tr><th>ID</th><th>Equipamento</th><th>Ação</th></tr>';
        eq.forEach(e => {
            html += `<tr><td style="padding: 10px 0;">#${e.id}</td><td>${e.nome}</td>
            <td style="padding: 10px 0; display:flex; gap:5px;"><button class="btn btn-secondary" style="padding: 5px;" onclick="openDeepView('equipments', ${e.id}, 'Equipamento')">✏️ Editar</button><button class="btn btn-outline-danger" style="padding: 5px;" onclick="adminDelete('equipments', ${e.id}, 'eq')">🗑️ Deletar</button></td></tr>`;
        });
        container.innerHTML = html + '</table></div>';
    } catch (err) {
        container.innerHTML = '<div class="card-responsivo"><p class="text-muted">Erro ao carregar equipamentos.</p></div>';
    }
}

async function loadAdminPops(container) {
    container.innerHTML = '<span class="spinner"></span>';
    try {
        const res = await window.api.fetchProtected('/pops');
        const pops = await res.json();
        if (!Array.isArray(pops) || pops.length === 0) {
            container.innerHTML = '<div class="card-responsivo"><p class="text-muted">Nenhum POP disponível.</p></div>';
            return;
        }

        let html = '<div class="card-responsivo"><table style="width:100%; text-align:left;"><tr><th>Código</th><th>Título</th><th>Ação</th></tr>';
        pops.forEach(p => {
            html += `<tr><td style="padding: 10px 0;">${p.codigo}</td><td>${p.titulo}</td>
            <td style="padding: 10px 0; display:flex; gap:5px;"><button class="btn btn-secondary" style="padding: 5px;" onclick="openDeepView('pops', ${JSON.stringify(p.codigo)}, 'POP')">✏️ Editar</button><button class="btn btn-outline-danger" style="padding: 5px;" onclick="adminDelete('pops', ${JSON.stringify(p.codigo)}, 'pop')">🗑️ Deletar</button></td></tr>`;
        });
        container.innerHTML = html + '</table></div>';
    } catch (err) {
        container.innerHTML = '<div class="card-responsivo"><p class="text-muted">Erro ao carregar POPs.</p></div>';
    }
}

async function loadAdminProcesses(container) {
    container.innerHTML = '<span class="spinner"></span>';
    try {
        const res = await window.api.fetchProtected('/processes');
        const procs = await res.json();
        if (!Array.isArray(procs) || procs.length === 0) {
            container.innerHTML = '<div class="card-responsivo"><p class="text-muted">Nenhum processo cadastrado.</p></div>';
            return;
        }

        let html = '<div class="card-responsivo"><table style="width:100%; text-align:left;"><tr><th>ID</th><th>Processo</th><th>Ação</th></tr>';
        procs.forEach(p => {
            html += `<tr><td style="padding: 10px 0;">#${p.id}</td><td>${p.nome_processo}</td>
            <td style="padding: 10px 0; display:flex; gap:5px;"><button class="btn btn-secondary" style="padding: 5px;" onclick="openDeepView('processes', ${p.id}, 'Processo')">✏️ Editar</button><button class="btn btn-outline-danger" style="padding: 5px;" onclick="adminDelete('processes', ${p.id}, 'proc')">🗑️ Deletar</button></td></tr>`;
        });
        container.innerHTML = html + '</table></div>';
    } catch (err) {
        container.innerHTML = '<div class="card-responsivo"><p class="text-muted">Erro ao carregar processos.</p></div>';
    }
}

async function loadAdminPtaTopics(container) {
    container.innerHTML = '<span class="spinner"></span>';
    try {
        const res = await window.api.fetchProtected('/pta/topicos');
        const tops = await res.json();
        if (!Array.isArray(tops) || tops.length === 0) {
            container.innerHTML = '<div class="card-responsivo"><p class="text-muted">Nenhum tópico PTA cadastrado.</p></div>';
            return;
        }

        let html = '<div class="card-responsivo"><table style="width:100%; text-align:left;"><tr><th>Ano</th><th>Tópico</th><th>Ação</th></tr>';
        tops.forEach(t => {
            html += `<tr><td style="padding: 10px 0;">${t.ano}</td><td>${t.titulo}</td>
            <td style="padding: 10px 0; display:flex; gap:5px;"><button class="btn btn-secondary" style="padding: 5px;" onclick="openDeepView('pta/topicos', ${t.id}, 'Tópico PTA')">✏️ Editar</button><button class="btn btn-outline-danger" style="padding: 5px;" onclick="adminDelete('pta/topicos', ${t.id}, 'pta')">🗑️ Deletar Tópico</button></td></tr>`;
        });
        container.innerHTML = html + '</table></div>';
    } catch (err) {
        container.innerHTML = '<div class="card-responsivo"><p class="text-muted">Erro ao carregar tópicos PTA.</p></div>';
    }
}

// ==========================================
// 5. LOGS
// ==========================================
async function loadAuditLogs(container) {
    container.innerHTML = '<span class="spinner"></span> Carregando histórico...';
    try {
        const res = await window.api.fetchProtected('/admin/logs');
        if (!res.ok) throw new Error("Erro ao buscar logs");
        const logs = await res.json();

        if (logs.length === 0) {
            container.innerHTML = '<div class="card-responsivo"><p class="text-muted">Nenhum evento registrado ainda.</p></div>';
            return;
        }

        window.currentAuditLogs = logs;

        let html = '<div class="card-responsivo" style="overflow-x: auto;"><table style="width:100%; text-align:left; font-size: 14px;">';
        html += '<tr style="border-bottom: 2px solid #ccc;"><th>Data/Hora</th><th>Usuário</th><th>Ação</th><th>Módulo</th><th>Registro</th><th>Detalhes</th></tr>';
        
        logs.forEach((log, index) => {
            const dataFormatada = new Date(log.timestamp).toLocaleString('pt-BR');
            let corAcao = (log.action === "DELETE" || log.action === "SOFT_DELETE") ? "#DC2626" : log.action === "UPDATE" ? "#2563EB" : "#10B981";

            html += `<tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px 5px; white-space: nowrap;">${dataFormatada}</td>
                <td style="padding: 12px 5px; font-weight: bold;">#${log.admin_id}</td>
                <td style="padding: 12px 5px;"><span style="color: ${corAcao}; font-weight: bold;">${log.action}</span></td>
                <td style="padding: 12px 5px; text-transform: uppercase;">${log.table_name}</td>
                <td style="padding: 12px 5px;">ID: ${log.record_id}</td>
                <td style="padding: 12px 5px;">
                    <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 12px;" onclick="viewLogPayload(${index})">
                        👁️ Ver detalhes
                    </button>
                </td>
            </tr>`;
        });
        container.innerHTML = html + '</table></div>';
    } catch (err) {
        container.innerHTML = '<div class="card-responsivo" style="color:red;">Falha ao carregar o log.</div>';
    }
}

// FUNÇÃO SEGURA PARA LER OS DADOS
window.viewLogPayload = function(index) {
    const log = window.currentAuditLogs[index];
    if (!log) return;

    const oldData = log.old_data ? JSON.stringify(log.old_data, null, 2) : "Sem detalhes / Não aplicável";
    const newData = log.new_data ? JSON.stringify(log.new_data, null, 2) : "Sem detalhes / Não aplicável";

    alert(`DETALHES DO EVENTO\n\n🔹 Antes:\n${oldData}\n\n🔸 Atual:\n${newData}`);
};

// ==========================================
// 6. VISÃO PROFUNDA DO LOG
// ==========================================
window.closeDeepView = function() {
    document.getElementById('deep-view-modal').style.display = 'none';
}

window.openDeepView = async function(route, id, entityName) {
    const modal = document.getElementById('deep-view-modal');
    const body = document.getElementById('dv-body');
    const saveBtn = document.getElementById('dv-save-btn');

    const displayId = typeof id === 'string' ? id : `#${id}`;
    document.getElementById('dv-title').innerText = `Editando: ${entityName} ${displayId}`;
    body.innerHTML = '<span class="spinner"></span> Carregando dados completos...';
    modal.style.display = 'flex';

    try {
        let data;
        if (route === 'usuarios') {
            const res = await window.api.fetchProtected(`/admin/${route}/${id}`);
            if (!res.ok) throw new Error("Erro ao buscar detalhes.");
            data = await res.json();
        } else if (route === 'pops') {
            const res = await window.api.fetchProtected(`/pops/${encodeURIComponent(id)}`);
            if (!res.ok) throw new Error("Erro ao buscar detalhes do POP.");
            data = await res.json();
        } else if (route === 'equipments') {
            const res = await window.api.fetchProtected(`/equipments/${id}`);
            if (!res.ok) throw new Error("Erro ao buscar detalhes do equipamento.");
            data = await res.json();
        } else if (route === 'processes') {
            const res = await window.api.fetchProtected(`/processes/${id}`);
            if (!res.ok) throw new Error("Erro ao buscar detalhes do processo.");
            data = await res.json();
        } else if (route === 'pta/topicos') {
            const res = await window.api.fetchProtected('/pta/topicos');
            if (!res.ok) throw new Error("Erro ao buscar tópicos PTA.");
            const topics = await res.json();
            data = topics.find(item => item.id === id);
            if (!data) throw new Error("Tópico não encontrado.");
        } else {
            throw new Error("Rota desconhecida.");
        }

        let html = '';
        for (const [key, value] of Object.entries(data)) {
            if (key === 'senha' || key === 'id' || key === 'descricao' || key === 'anexo_dados' || key === 'anexo_meta') continue;
            const safeValue = value !== null && value !== undefined ? String(value).replace(/"/g, '&quot;') : '';
            html += `
                <div style="display:flex; flex-direction:column; gap:5px;">
                    <label style="font-size:12px; font-weight:bold; color:var(--text-muted); text-transform:uppercase;">${key}</label>
                    <input type="text" id="dv-input-${key}" class="form-control" value="${safeValue}">
                </div>
            `;
        }

        if (html.trim() === '') {
            html = '<p class="text-muted">Não há campos editáveis disponíveis para este registro.</p>';
            saveBtn.style.display = 'none';
        } else {
            saveBtn.style.display = 'inline-flex';
        }

        body.innerHTML = html;
        saveBtn.onclick = () => saveDeepView(route, id, data);
    } catch (err) {
        body.innerHTML = `<p style="color:red;">${err.message || 'Erro ao conectar com o banco de dados.'}</p>`;
        saveBtn.style.display = 'none';
    }
}

async function saveDeepView(route, id, originalData) {
    const payload = {};
    const saveBtn = document.getElementById('dv-save-btn');

    for (const key of Object.keys(originalData)) {
        if (key === 'senha' || key === 'id' || key === 'descricao' || key === 'anexo_dados' || key === 'anexo_meta') continue;
        const input = document.getElementById(`dv-input-${key}`);
        if (input) payload[key] = input.value;
    }

    saveBtn.innerText = "Salvando...";
    saveBtn.disabled = true;

    try {
        let endpoint;
        if (route === 'usuarios') endpoint = `/admin/${route}/${id}`;
        else if (route === 'pops') endpoint = `/pops/${encodeURIComponent(id)}`;
        else if (route === 'equipments') endpoint = `/equipments/${id}`;
        else if (route === 'processes') endpoint = `/processes/${id}`;
        else if (route === 'pta/topicos') endpoint = `/pta/topicos/${id}`;
        else throw new Error('Rota desconhecida.');

        const res = await window.api.fetchProtected(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            window.UI.showToast("Dados atualizados com sucesso!", "success");
            closeDeepView();
            if (route === 'usuarios') switchUserTab('active');
            else if (route === 'equipments') switchLabTab('eq');
            else if (route === 'pops') switchLabTab('pop');
            else if (route === 'processes') switchPdTab('proc');
            else if (route === 'pta/topicos') switchPdTab('pta');
        } else {
            const errData = await res.json().catch(() => ({}));
            window.UI.showToast(errData.detail || "Erro ao salvar.", "error");
        }
    } catch (err) {
        window.UI.showToast(err.message || "Falha na conexão.", "error");
    } finally {
        saveBtn.innerText = "💾 Salvar Alterações";
        saveBtn.disabled = false;
    }
}

// ==========================================
// 7. MOTOR DE EXCLUSÃO E BLOQUEIO
// ==========================================
window.adminDelete = async (route, id, tabToReload) => {
    if(!id) return;
    
    const confirmMsg = route === 'usuarios' 
        ? `⚠️ ATENÇÃO ⚠️\n\nVocê está prestes a BLOQUEAR o Usuário [ ID: ${id} ].\nEle não poderá mais acessar o sistema, mas o histórico dele será mantido.\n\nConfirma o bloqueio?`
        : `⚠️ ALERTA DE SEGURANÇA ⚠️\n\nVocê está prestes a excluir o item [ ${id} ].\nEssa ação é IRREVERSÍVEL.\n\nTem certeza absoluta?`;
    
    if(!confirm(confirmMsg)) return;

    try {
        const res = await window.api.fetchProtected(`/admin/${route}/${id}`, { method: 'DELETE' });
        
        if (res.ok) {
            window.UI.showToast("Ação realizada com sucesso.", "success");
            if (route === 'usuarios') switchUserTab(tabToReload);
            else if (route === 'equipments' || route === 'pops') switchLabTab(tabToReload);
            else if (route === 'processes' || route === 'pta/topicos') switchPdTab(tabToReload);
        } else {
            const errData = await res.json().catch(() => ({}));
            window.UI.showToast(errData.detail || "Erro de permissão.", "error");
        }
    } catch (err) {
        window.UI.showToast("Falha de comunicação com a API.", "error");
    }
};