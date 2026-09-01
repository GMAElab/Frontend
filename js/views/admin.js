// ==========================================
// GUARDA DE ACESSO (SOMENTE ADMIN)
// ==========================================
document.addEventListener('viewChanged', (e) => {
    if (e.detail.view === 'admin') routerAdmin();
});

function routerAdmin() {
    const userString = localStorage.getItem('user_data');
    if (!userString) return;
    const user = JSON.parse(userString);
    if (user.role !== 'admin') {
        document.getElementById('dynamic-content').innerHTML = `
            <div class="card-responsivo" style="border-left: 4px solid var(--danger);">
                <h3 class="text-danger">Acesso Negado</h3>
                <p>Esta área é restrita para Administradores do Sistema.</p>
            </div>
        `;
        return;
    }
    renderAdminPanel();
}

// ==========================================
// 1. TELA PRINCIPAL
// ==========================================
function renderAdminPanel() {
    const container = document.getElementById('dynamic-content');
    container.innerHTML = `
    <div class="admin-container fade-in">
        <div class="view-header" style="margin-bottom: 25px;">
            <h2>Painel de controle Administrador</h2>
            <p class="text-muted">Gerenciamento de todos os módulos do sistema.</p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px;">
            <div class="admin-card" onclick="openAdminModule('users')">
                <h3>${window.Icon('users', { size: 18 })} Usuários</h3>
                <p>Controle de acesso e permissões dos usuários.</p>
            </div>

            <div class="admin-card" onclick="openAdminModule('lab')">
                <h3>${window.Icon('flask', { size: 18 })} Laboratório</h3>
                <p>Controle dos equipamentos e POPs.</p>
            </div>

            <div class="admin-card" onclick="openAdminModule('pd')">
                <h3>${window.Icon('clipboard', { size: 18 })} P&D e PTA</h3>
                <p>Processos e PTA</p>
            </div>

            <div class="admin-card" onclick="openAdminModule('audit')">
                <h3>${window.Icon('eye', { size: 18 })} Auditoria e Logs</h3>
                <p>Rastreie quem fez o quê e quando.</p>
            </div>
            <div class="admin-card" onclick="iniciarSetup2FA()" style="border-top-color: var(--danger);">
                <h3>${window.Icon('lock', { size: 18 })} Segurança (2FA)</h3>
                <p>Proteger minha conta com Autenticador.</p>
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

    let title = 'Gestão';
    if (module === 'users') title = 'Gestão de Usuários';
    else if (module === 'lab') title = 'Gestão do Laboratório';
    else if (module === 'pd') title = 'Gestão de P&D';
    else if (module === 'audit') title = 'Logs de Auditoria';

    area.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--border-light);">
            <button class="btn btn-secondary btn-sm" onclick="renderAdminPanel()">${window.Icon('arrow-left', { size: 14 })} Voltar</button>
            <h3 style="margin: 0;">${title}</h3>
        </div>
        <div id="module-subcontent"></div>
    `;

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
    else if (module === 'audit') {
        sub.innerHTML = `
            <div class="card-responsivo" style="background: var(--warning-light); border-color: var(--warning-border); display:flex; align-items:center; gap:10px;">
                ${window.Icon('alert-triangle', { size: 16, class: 'text-muted' })}
                <p style="margin: 0; color:var(--warning);"><strong>Aviso:</strong> Estes registros são permanentes. Ninguém pode apagar o histórico de auditoria.</p>
            </div>
            <div id="audit-container" style="margin-top:16px;"></div>`;
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
            container.innerHTML = window.UI.emptyState({ icon: 'users', title: 'Nenhum pedido pendente', description: 'Novos cadastros aparecerão aqui para aprovação.' });
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
    } catch (err) { container.innerHTML = window.UI.errorState('Erro ao carregar pedidos.'); }
}

window.handleApproval = async (id, isApproved) => {
    const ok = await window.UI.confirm(
        isApproved ? "O usuário passará a ter acesso ao sistema com o cargo selecionado." : "O pedido de cadastro será descartado.",
        { title: isApproved ? 'Aprovar usuário?' : 'Rejeitar pedido?', danger: !isApproved }
    );
    if (!ok) return;
    try {
        const endpoint = isApproved ? `/aprovar-registro/${id}` : `/rejeitar-registro/${id}`;
        let opts = { method: 'POST' };
        if (isApproved) {
            opts.headers = { 'Content-Type': 'application/json' };
            opts.body = JSON.stringify({ role_atribuida: document.getElementById(`role-${id}`).value });
        }
        const res = await window.api.fetchProtected(endpoint, opts);
        if (res.ok) {
            window.UI.showToast(isApproved ? "Usuário aprovado." : "Pedido rejeitado.", "success");
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
        users.sort((a, b) => a.nome.localeCompare(b.nome));

        let html = '<div class="table-container"><table class="data-table">';
        html += '<thead><tr><th>ID</th><th>Nome</th><th>Email</th><th>Cargo</th><th>Status</th><th style="text-align:right;">Ação</th></tr></thead><tbody>';

        users.forEach(u => {
            const isActive = (u.is_active === 1 || u.is_active === true);
            const statusBadge = isActive
                ? '<span class="badge badge-success">Ativo</span>'
                : '<span class="badge badge-danger">Inativo</span>';

            let btn = '';
            if (u.role === 'admin') {
                btn = '<span class="text-faint" style="font-style:italic; font-size:13px;">Protegido</span>';
            } else if (!isActive) {
                btn = `<button class="icon-btn" title="Ver detalhes" onclick="openDeepView('usuarios', ${u.id}, 'Usuário')">${window.Icon('eye', { size: 15 })}</button>`;
            } else {
                btn = `
                    <div class="action-group">
                        <button class="icon-btn" title="Editar" onclick="openDeepView('usuarios', ${u.id}, 'Usuário')">${window.Icon('edit-2', { size: 15 })}</button>
                        <button class="icon-btn" title="Resetar 2FA (usuário perdeu o celular)" onclick="window.resetUser2FA(${u.id}, '${window.escapeHTML(u.nome).replace(/'/g, "\\'")}')">${window.Icon('shield', { size: 15 })}</button>
                        <button class="icon-btn danger" title="Bloquear acesso" onclick="adminDelete('usuarios', ${u.id}, 'active')">${window.Icon('ban', { size: 15 })}</button>
                    </div>
                `;
            }

            html += `<tr style="${!isActive ? 'opacity:0.6;' : ''}">
                <td>#${u.id}</td>
                <td>${window.escapeHTML(u.nome)}</td>
                <td>${window.escapeHTML(u.email)}</td>
                <td style="text-transform: capitalize;">${window.escapeHTML(u.role)}</td>
                <td>${statusBadge}</td>
                <td style="text-align:right;">${btn}</td>
            </tr>`;
        });
        container.innerHTML = html + '</tbody></table></div>';
    } catch (err) { container.innerHTML = window.UI.errorState('Erro ao carregar usuários.'); }
}

window.resetUser2FA = async (userId, nome) => {
    const ok = await window.UI.confirm(
        `O 2FA de ${nome} será desativado. Use isso quando a pessoa perdeu o celular do Autenticador e esgotou os códigos de backup — ela poderá configurar o 2FA de novo após o próximo login.`,
        { title: 'Resetar 2FA?', danger: true, confirmText: 'Resetar 2FA' }
    );
    if (!ok) return;
    try {
        const res = await window.api.fetchProtected(`/admin/usuarios/${userId}/resetar-2fa`, { method: 'POST' });
        if (res.ok) {
            window.UI.showToast("2FA resetado com sucesso.", "success");
        } else {
            window.UI.showToast("Erro ao resetar o 2FA.", "error");
        }
    } catch (err) {
        window.UI.showToast("Falha na rede.", "error");
    }
};

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
        eq.sort((a, b) => a.nome.localeCompare(b.nome));
        if (!Array.isArray(eq) || eq.length === 0) {
            container.innerHTML = window.UI.emptyState({ icon: 'flask', title: 'Nenhum equipamento cadastrado' });
            return;
        }

        let html = '<div class="table-container"><table class="data-table"><thead><tr><th>ID</th><th>Equipamento</th><th style="text-align:right;">Ação</th></tr></thead><tbody>';
        eq.forEach(e => {
            html += `<tr><td>#${e.id}</td><td>${window.escapeHTML(e.nome)}</td>
            <td style="text-align:right;"><div class="action-group">
                <button class="icon-btn" title="Editar" onclick="openDeepView('equipments', ${e.id}, 'Equipamento')">${window.Icon('edit-2', { size: 15 })}</button>
                <button class="icon-btn danger" title="Excluir" onclick="adminDelete('equipments', ${e.id}, 'eq')">${window.Icon('trash-2', { size: 15 })}</button>
            </div></td></tr>`;
        });
        container.innerHTML = html + '</tbody></table></div>';
    } catch (err) {
        container.innerHTML = window.UI.errorState('Erro ao carregar equipamentos.');
    }
}

async function loadAdminPops(container) {
    container.innerHTML = '<span class="spinner"></span>';
    try {
        const res = await window.api.fetchProtected('/pops');
        const pops = await res.json();
        pops.sort((a, b) => a.titulo.localeCompare(b.titulo));
        if (!Array.isArray(pops) || pops.length === 0) {
            container.innerHTML = window.UI.emptyState({ icon: 'clipboard', title: 'Nenhum POP disponível' });
            return;
        }

        let html = '<div class="table-container"><table class="data-table"><thead><tr><th>Código</th><th>Título</th><th style="text-align:right;">Ação</th></tr></thead><tbody>';
        pops.forEach(p => {
            html += `<tr><td>${window.escapeHTML(p.codigo)}</td><td>${window.escapeHTML(p.titulo)}</td>
            <td style="text-align:right;"><div class="action-group">
                <button class="icon-btn" title="Editar" onclick="openDeepView('pops', ${JSON.stringify(window.escapeHTML(p.codigo))}, 'POP')">${window.Icon('edit-2', { size: 15 })}</button>
                <button class="icon-btn danger" title="Excluir" onclick="adminDelete('pops', ${JSON.stringify(window.escapeHTML(p.codigo))}, 'pop')">${window.Icon('trash-2', { size: 15 })}</button>
            </div></td></tr>`;
        });
        container.innerHTML = html + '</tbody></table></div>';
    } catch (err) {
        container.innerHTML = window.UI.errorState('Erro ao carregar POPs.');
    }
}

async function loadAdminProcesses(container) {
    container.innerHTML = '<span class="spinner"></span>';
    try {
        const res = await window.api.fetchProtected('/processes');
        const procs = await res.json();
        procs.sort((a, b) => b.id - a.id);
        if (!Array.isArray(procs) || procs.length === 0) {
            container.innerHTML = window.UI.emptyState({ icon: 'layers', title: 'Nenhum processo cadastrado' });
            return;
        }

        let html = '<div class="table-container"><table class="data-table"><thead><tr><th>ID</th><th>Processo</th><th style="text-align:right;">Ação</th></tr></thead><tbody>';
        procs.forEach(p => {
            html += `<tr><td>#${p.id}</td><td>${window.escapeHTML(p.nome_processo)}</td>
            <td style="text-align:right;"><div class="action-group">
                <button class="icon-btn" title="Editar" onclick="openDeepView('processes', ${p.id}, 'Processo')">${window.Icon('edit-2', { size: 15 })}</button>
                <button class="icon-btn danger" title="Excluir" onclick="adminDelete('processes', ${p.id}, 'proc')">${window.Icon('trash-2', { size: 15 })}</button>
            </div></td></tr>`;
        });
        container.innerHTML = html + '</tbody></table></div>';
    } catch (err) {
        container.innerHTML = window.UI.errorState('Erro ao carregar processos.');
    }
}

async function loadAdminPtaTopics(container) {
    container.innerHTML = '<span class="spinner"></span>';
    try {
        const res = await window.api.fetchProtected('/pta/topicos');
        const tops = await res.json();
        const topicosUnicos = [];
        const titulosVistos = new Set();

        tops.forEach(t => {
            if (!titulosVistos.has(t.titulo)) {
                topicosUnicos.push(t);
                titulosVistos.add(t.titulo);
            }
        });

        if (topicosUnicos.length === 0) {
            container.innerHTML = window.UI.emptyState({ icon: 'bar-chart', title: 'Nenhum tópico PTA cadastrado' });
            return;
        }

        let html = '<div class="table-container"><table class="data-table"><thead><tr><th>Ano</th><th>Tópico</th><th style="text-align:right;">Ação</th></tr></thead><tbody>';
        topicosUnicos.forEach(t => {
            html += `<tr><td>${t.ano}</td><td>${window.escapeHTML(t.titulo)}</td>
            <td style="text-align:right;"><div class="action-group">
                <button class="icon-btn" title="Editar" onclick="openDeepView('pta/topicos', ${t.id}, 'Tópico PTA')">${window.Icon('edit-2', { size: 15 })}</button>
                <button class="icon-btn danger" title="Excluir" onclick="adminDelete('pta/topicos', ${t.id}, 'pta')">${window.Icon('trash-2', { size: 15 })}</button>
            </div></td></tr>`;
        });
        container.innerHTML = html + '</tbody></table></div>';
    } catch (err) {
        container.innerHTML = window.UI.errorState('Erro ao carregar tópicos PTA.');
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
            container.innerHTML = window.UI.emptyState({ icon: 'eye', title: 'Nenhum evento registrado ainda' });
            return;
        }

        window.currentAuditLogs = logs;

        let html = '<div class="table-container"><table class="data-table" style="font-size: 14px;">';
        html += '<thead><tr><th>Data/Hora</th><th>Usuário</th><th>Ação</th><th>Módulo</th><th>Registro</th><th>Detalhes</th></tr></thead><tbody>';

        logs.forEach((log, index) => {
            const dataFormatada = new Date(log.timestamp).toLocaleString('pt-BR');
            const isDelete = (log.action === "DELETE" || log.action === "SOFT_DELETE");
            const isUpdate = log.action === "UPDATE";
            const corClasse = isDelete ? 'text-danger' : isUpdate ? 'text-primary' : 'text-success';

            html += `<tr>
                <td style="white-space: nowrap;">${dataFormatada}</td>
                <td style="font-weight:600;">#${log.admin_id}</td>
                <td><strong class="${corClasse}">${log.action}</strong></td>
                <td style="text-transform: uppercase;">${log.table_name}</td>
                <td>ID: ${log.record_id}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="viewLogPayload(${index})">Ver detalhes</button>
                </td>
            </tr>`;
        });
        container.innerHTML = html + '</tbody></table></div>';
    } catch (err) {
        container.innerHTML = window.UI.errorState('Falha ao carregar o log.');
    }
}

// LER OS DADOS
window.viewLogPayload = function(index) {
    const log = window.currentAuditLogs[index];
    if (!log) return;

    const oldData = log.old_data ? JSON.stringify(log.old_data, null, 2) : "Sem detalhes / Não aplicável";
    const newData = log.new_data ? JSON.stringify(log.new_data, null, 2) : "Sem detalhes / Não aplicável";

    const modalId = 'log-payload-modal';
    const old = document.getElementById(modalId);
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:560px;">
            <div class="modal-header">
                <h3>Detalhes do evento</h3>
                <button type="button" class="modal-close" onclick="document.getElementById('${modalId}').remove()">&times;</button>
            </div>
            <div style="display:flex; flex-direction:column; gap:14px;">
                <div>
                    <label>Antes</label>
                    <pre style="background:var(--bg-subtle); padding:12px; border-radius:8px; font-size:12px; overflow-x:auto; white-space:pre-wrap;">${window.escapeHTML(oldData)}</pre>
                </div>
                <div>
                    <label>Atual</label>
                    <pre style="background:var(--bg-subtle); padding:12px; border-radius:8px; font-size:12px; overflow-x:auto; white-space:pre-wrap;">${window.escapeHTML(newData)}</pre>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
};

// ==========================================
// 6. Edição dos Dados
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

        const tradutorDeRotulos = {
            "nome": "Nome",
            "description": "Descrição",
            "video_url": "Link do YouTube",
            "manual_url": "Link do POP",
            "status": "Status",
            "titulo": "Título",
            "is_active": "Ativo? (1 ou 0)",
            "role": "Cargo"
        };

        let html = '';
        for (const [key, value] of Object.entries(data)) {
            if (key === 'senha' || key === 'id' || key === 'descricao' || key === 'anexo_dados' || key === 'anexo_meta') continue;

            const labelAmigavel = tradutorDeRotulos[key] || key;

            if (key === 'role') {
                const papeis = ['pesquisador', 'tecnico', 'coordenador', 'admin'];
                html += `
                    <div class="input-group" style="margin-bottom:0;">
                        <label>${labelAmigavel}</label>
                        <select id="dv-input-${key}" class="form-control">
                            ${papeis.map(p => `<option value="${p}" ${value === p ? 'selected' : ''}>${p}</option>`).join('')}
                        </select>
                    </div>
                `;
                continue;
            }

            if (key === 'is_active') {
                const marcado = value === 1 || value === true || value === '1';
                html += `
                    <div class="input-group" style="margin-bottom:0; display:flex; align-items:center; gap:8px;">
                        <input type="checkbox" id="dv-input-${key}" ${marcado ? 'checked' : ''} style="width:auto;">
                        <label style="margin:0;">${labelAmigavel}</label>
                    </div>
                `;
                continue;
            }

            const safeValue = window.escapeHTML(value !== null && value !== undefined ? String(value) : '');

            html += `
                <div class="input-group" style="margin-bottom:0;">
                    <label>${labelAmigavel}</label>
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
        body.innerHTML = window.UI.errorState(err.message || 'Erro ao conectar com o banco de dados.');
        saveBtn.style.display = 'none';
    }
}

async function saveDeepView(route, id, originalData) {
    const payload = {};
    const saveBtn = document.getElementById('dv-save-btn');

    for (const key of Object.keys(originalData)) {
        if (key === 'senha' || key === 'id' || key === 'descricao' || key === 'anexo_dados' || key === 'anexo_meta') continue;
        const input = document.getElementById(`dv-input-${key}`);
        if (!input) continue;
        payload[key] = key === 'is_active' ? (input.checked ? 1 : 0) : input.value;
    }

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
        saveBtn.disabled = false;
    }
}

// ==========================================
// 7. EXCLUSÃO E BLOQUEIO
// ==========================================
window.adminDelete = async (route, id, tabToReload) => {
    if(!id) return;

    const isUser = route === 'usuarios';
    const ok = await window.UI.confirm(
        isUser
            ? `O usuário [ID: ${id}] não poderá mais acessar o sistema. O histórico dele será mantido.`
            : `Você está prestes a excluir permanentemente o item [${id}]. Essa ação não pode ser desfeita.`,
        { title: isUser ? 'Bloquear usuário?' : 'Excluir item?', danger: true, confirmText: isUser ? 'Bloquear' : 'Excluir' }
    );
    if (!ok) return;

    let endpoint = '';
    if (route === 'usuarios') endpoint = `/admin/usuarios/${id}`;
    else if (route === 'equipments') endpoint = `/equipments/admin/${id}`;
    else if (route === 'pops') endpoint = `/pops/admin/${id}`;
    else if (route === 'processes') endpoint = `/processes/admin/${id}`;
    else if (route === 'pta/topicos') endpoint = `/pta/admin/topicos/${id}`;

    try {
        const res = await window.api.fetchProtected(endpoint, { method: 'DELETE' });

        if (res.ok) {
            window.UI.showToast("Ação realizada com sucesso.", "success");
            if (route === 'usuarios') switchUserTab(tabToReload);
            else if (route === 'equipments' || route === 'pops') switchLabTab(tabToReload);
            else if (route === 'processes' || route === 'pta/topicos') switchPdTab(tabToReload);
        } else {
            const data = await res.json();
            window.UI.showToast(data.detail || "Erro ao excluir o item.", "error");
        }
    } catch (error) {
        window.UI.showToast("Erro de comunicação com o servidor.", "error");
        console.error("Erro no adminDelete:", error);
    }
}
