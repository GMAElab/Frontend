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
            <header class="page-head">
                <div>
                    <p class="eyebrow">acesso restrito</p>
                    <h1>Administração</h1>
                    <p class="lede">Esta área é exclusiva para administradores do sistema.</p>
                </div>
            </header>
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
    const modulos = [
        { acao: "openAdminModule('users')", titulo: 'Usuários', desc: 'Pedidos de cadastro, cargos, senhas e bloqueios.' },
        { acao: "openAdminModule('lab')", titulo: 'Laboratório', desc: 'Equipamentos e POPs cadastrados.' },
        { acao: "openAdminModule('pd')", titulo: 'P&amp;D e planejamento', desc: 'Processos e tópicos de pesquisa.' },
        { acao: "openAdminModule('audit')", titulo: 'Auditoria', desc: 'Quem alterou o quê, e quando.' },
        { acao: 'abrirSetup2FA()', titulo: 'Verificação em duas etapas', desc: 'Proteja a sua conta com um aplicativo Autenticador.' },
    ];

    container.innerHTML = `
        <header class="page-head fade-in">
            <div>
                <p class="eyebrow">sistema</p>
                <h1>Administração</h1>
            </div>
        </header>

        <ul class="index-list fade-in" id="admin-index">
            ${modulos.map((m, i) => `
                <li>
                    <button type="button" class="index-row" onclick="${m.acao}">
                        <span class="n">${String(i + 1).padStart(2, '0')}</span>
                        <span class="t">${m.titulo}</span>
                        <span class="d">${m.desc}</span>
                        <span class="go">${window.Icon('arrow-right', { size: 16 })}</span>
                    </button>
                </li>
            `).join('')}
        </ul>

        <div id="admin-module-area"></div>`;
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

    const indice = document.getElementById('admin-index');
    if (indice) indice.classList.add('hidden');

    area.innerHTML = `
        <div class="section-head fade-in">
            <h3 class="module-title">${title}</h3>
            <button class="link-btn muted" onclick="renderAdminPanel()">${window.Icon('arrow-left', { size: 14 })} Todos os módulos</button>
        </div>
        <div id="module-subcontent" class="fade-in"></div>
    `;

    const sub = document.getElementById('module-subcontent');

    if (module === 'users') {
        sub.innerHTML = `
            <div class="tabs">
                <button class="tab-btn" id="tab-pending" onclick="switchUserTab('pending')">Pedidos pendentes</button>
                <button class="tab-btn" id="tab-active" onclick="switchUserTab('active')">Usuários</button>
            </div>
            <div id="users-container"></div>`;
        switchUserTab('pending');
    }
    else if (module === 'lab') {
        sub.innerHTML = `
            <div class="tabs">
                <button class="tab-btn" id="tab-eq" onclick="switchLabTab('eq')">Equipamentos</button>
                <button class="tab-btn" id="tab-pop" onclick="switchLabTab('pop')">POPs</button>
            </div>
            <div id="lab-container"></div>`;
        switchLabTab('eq');
    }
    else if (module === 'pd') {
        sub.innerHTML = `
            <div class="tabs">
                <button class="tab-btn" id="tab-proc" onclick="switchPdTab('proc')">Processos</button>
                <button class="tab-btn" id="tab-pta" onclick="switchPdTab('pta')">Tópicos de pesquisa</button>
            </div>
            <div id="pd-container"></div>`;
        switchPdTab('proc');
    }
    else if (module === 'audit') {
        sub.innerHTML = `
            <p class="note">Estes registros são permanentes. O histórico de auditoria não pode ser editado nem apagado.</p>
            <div id="audit-container"></div>`;
        loadAuditLogs(document.getElementById('audit-container'));
    }
};
// ==========================================
// 3. MÓDULO: USUÁRIOS
// ==========================================
window.switchUserTab = function(tab) {
    document.getElementById('tab-pending').classList.toggle('active', tab === 'pending');
    document.getElementById('tab-active').classList.toggle('active', tab === 'active');
    const container = document.getElementById('users-container');

    if (tab === 'pending') loadPendingRequests(container);
    else loadActiveUsers(container);
};

async function loadPendingRequests(container) {
    container.innerHTML = window.UI.loading();
    try {
        const res = await window.api.fetchProtected('/admin/pedidos-cadastro');
        if (!res.ok) throw new Error("Erro na API");
        const requests = await res.json();

        if (requests.length === 0) {
            container.innerHTML = window.UI.emptyState({ title: 'Nenhum pedido pendente', description: 'Novos cadastros aparecerão aqui para aprovação.' });
            return;
        }

        let html = '<div class="entries">';
        requests.forEach(req => {
            html += `
                <article class="entry request-row">
                    <div>
                        <h4 class="entry-title">${window.escapeHTML(req.nome)}</h4>
                        <p class="meta">${window.escapeHTML(req.email)}</p>
                    </div>
                    <div class="cluster">
                        <select id="role-${req.id}" class="form-control" aria-label="Cargo">
                            <option value="pesquisador">Pesquisador</option>
                            <option value="tecnico">Técnico</option>
                            <option value="coordenador">Coordenador</option>
                            <option value="admin">Administrador</option>
                        </select>
                        <button class="btn btn-primary btn-sm" onclick="handleApproval(${req.id}, true)">Aprovar</button>
                        <button class="link-btn danger" onclick="handleApproval(${req.id}, false)">Rejeitar</button>
                    </div>
                </article>`;
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

    let stepUpToken = null;
    if (isApproved) {
        stepUpToken = await window.api.confirmStepUp({ title: 'Confirme para aprovar', message: 'Você está concedendo acesso ao sistema a um novo usuário.' });
        if (!stepUpToken) return;
    }

    try {
        const endpoint = isApproved ? `/aprovar-registro/${id}` : `/rejeitar-registro/${id}`;
        let opts = { method: 'POST' };
        if (isApproved) {
            opts.headers = { 'Content-Type': 'application/json', 'X-Step-Up-Token': stepUpToken };
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
    container.innerHTML = window.UI.loading();
    try {
        const res = await window.api.fetchProtected('/admin/usuarios');
        if (!res.ok) throw new Error("Erro na API");
        const users = await res.json();
        users.sort((a, b) => a.nome.localeCompare(b.nome));

        const meuId = (JSON.parse(localStorage.getItem('user_data') || '{}')).id;

        let html = '<div class="table-container"><table class="data-table">';
        html += '<thead><tr><th>ID</th><th>Nome</th><th>E-mail</th><th>Cargo</th><th>Status</th><th class="end">Ações</th></tr></thead><tbody>';

        users.forEach(u => {
            const isActive = (u.is_active === 1 || u.is_active === true);
            const isSelf = u.id === meuId;
            const statusBadge = isActive
                ? '<span class="badge badge-success">ativo</span>'
                : '<span class="badge badge-danger">bloqueado</span>';

            // Admins também podem ser alvo destas ações — cada uma já exige reconfirmação
            // de identidade (senha ou código do Autenticador) do admin que a executa.
            const nomeJs = window.escapeHTML(u.nome).replace(/'/g, "\\'");
            let btn = '';
            if (!isActive) {
                btn = `<div class="row-actions"><button class="link-btn" onclick="openDeepView('usuarios', ${u.id}, 'Usuário')">Abrir</button></div>`;
            } else {
                btn = `
                    <div class="row-actions">
                        <button class="link-btn" onclick="openDeepView('usuarios', ${u.id}, 'Usuário')">Editar</button>
                        <button class="link-btn muted" onclick="window.resetUserPassword(${u.id}, '${nomeJs}')">Nova senha</button>
                        <button class="link-btn muted" title="Para quando a pessoa perdeu o celular do Autenticador" onclick="window.resetUser2FA(${u.id}, '${nomeJs}')">Resetar 2FA</button>
                        ${!isSelf ? `<button class="link-btn danger" onclick="adminDelete('usuarios', ${u.id}, 'active')">Bloquear</button>` : ''}
                    </div>
                `;
            }

            html += `<tr class="${!isActive ? 'is-dimmed' : ''}">
                <td class="num">${u.id}</td>
                <td><strong>${window.escapeHTML(u.nome)}</strong></td>
                <td>${window.escapeHTML(u.email)}</td>
                <td>${window.escapeHTML(u.role)}</td>
                <td>${statusBadge}</td>
                <td>${btn}</td>
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

    const stepUpToken = await window.api.confirmStepUp({ title: 'Confirme para resetar o 2FA', message: `Você está removendo a segunda camada de segurança de ${nome}.` });
    if (!stepUpToken) return;

    try {
        const res = await window.api.fetchProtected(`/admin/usuarios/${userId}/resetar-2fa`, { method: 'POST', headers: { 'X-Step-Up-Token': stepUpToken } });
        if (res.ok) {
            window.UI.showToast("2FA resetado com sucesso.", "success");
        } else {
            window.UI.showToast("Erro ao resetar o 2FA.", "error");
        }
    } catch (err) {
        window.UI.showToast("Falha na rede.", "error");
    }
};

window.resetUserPassword = async (userId, nome) => {
    const ok = await window.UI.confirm(
        `Uma nova senha temporária será gerada para ${nome}. A senha atual dele(a) deixará de funcionar imediatamente.`,
        { title: 'Redefinir senha?', danger: true, confirmText: 'Redefinir' }
    );
    if (!ok) return;

    const stepUpToken = await window.api.confirmStepUp({ title: 'Confirme para redefinir a senha', message: `Você está gerando uma nova senha para ${nome}.` });
    if (!stepUpToken) return;

    try {
        const res = await window.api.fetchProtected(`/admin/usuarios/${userId}/resetar-senha`, { method: 'POST', headers: { 'X-Step-Up-Token': stepUpToken } });
        if (res.ok) {
            const data = await res.json();
            window.mostrarSenhaTemporaria(nome, data.senha_temporaria);
        } else {
            const data = await res.json().catch(() => ({}));
            window.UI.showToast(data.detail || "Erro ao redefinir a senha.", "error");
        }
    } catch (err) {
        window.UI.showToast("Falha na rede.", "error");
    }
};

window.mostrarSenhaTemporaria = function(nome, senha) {
    const modalId = 'senha-temp-modal';
    const old = document.getElementById(modalId);
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal-overlay is-locked';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content modal-sm">
            <div class="modal-header"><h3>Senha redefinida</h3></div>
            <p class="dialog-text">Repasse esta senha a <strong>${window.escapeHTML(nome)}</strong> por um canal seguro. Ela aparece só desta vez.</p>
            <div class="secret-box">
                <code id="senha-temp-valor">${window.escapeHTML(senha)}</code>
                <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText(document.getElementById('senha-temp-valor').textContent); window.UI.showToast('Senha copiada.', 'success');">Copiar</button>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="document.getElementById('${modalId}').remove()">Já anotei</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
};

// ==========================================
// 4. MÓDULO: LABORATÓRIO E P&D
// ==========================================
window.switchLabTab = function(tab) {
    document.getElementById('tab-eq').classList.toggle('active', tab === 'eq');
    document.getElementById('tab-pop').classList.toggle('active', tab === 'pop');
    const container = document.getElementById('lab-container');
    if (tab === 'eq') loadAdminEquipments(container); else loadAdminPops(container);
};

window.switchPdTab = function(tab) {
    document.getElementById('tab-proc').classList.toggle('active', tab === 'proc');
    document.getElementById('tab-pta').classList.toggle('active', tab === 'pta');
    const container = document.getElementById('pd-container');
    if (tab === 'proc') loadAdminProcesses(container); else loadAdminPtaTopics(container);
};

function loadAdminEquipments(container) {
    window.listagemAtual = window.Listagem.criar({
        alvo: container,
        endpoint: '/equipments/',
        placeholder: 'Buscar equipamento',
        cabecalho: '<th>ID</th><th>Equipamento</th><th class="end">Ações</th>',
        vazio: { title: 'Nenhum equipamento cadastrado' },
        erro: 'Erro ao carregar equipamentos.',
        renderLinha: (e) => `<tr><td class="num">${e.id}</td><td>${window.escapeHTML(e.nome)}</td>
            <td><div class="row-actions">
                <button class="link-btn" onclick="openDeepView('equipments', ${e.id}, 'Equipamento')">Editar</button>
                <button class="link-btn danger" onclick="adminDelete('equipments', ${e.id}, 'eq')">Excluir</button>
            </div></td></tr>`
    });
}

function loadAdminPops(container) {
    window.listagemAtual = window.Listagem.criar({
        alvo: container,
        endpoint: '/pops/',
        placeholder: 'Buscar POP por código, título ou conteúdo',
        cabecalho: '<th>Código</th><th>Título</th><th class="end">Ações</th>',
        vazio: { title: 'Nenhum POP disponível' },
        erro: 'Erro ao carregar POPs.',
        renderLinha: (p) => `<tr><td class="code">${window.escapeHTML(p.codigo)}</td><td>${window.escapeHTML(p.titulo)}</td>
            <td><div class="row-actions">
                <button class="link-btn" data-id="${window.escapeHTML(p.codigo)}" onclick="window.openPopModal(this.dataset.id)">Editar</button>
                <button class="link-btn danger" data-id="${window.escapeHTML(p.codigo)}" onclick="adminDelete('pops', this.dataset.id, 'pop')">Excluir</button>
            </div></td></tr>`
    });
}

function loadAdminProcesses(container) {
    window.listagemAtual = window.Listagem.criar({
        alvo: container,
        endpoint: '/processes/',
        placeholder: 'Buscar processo',
        cabecalho: '<th>ID</th><th>Processo</th><th class="end">Ações</th>',
        vazio: { title: 'Nenhum processo cadastrado' },
        erro: 'Erro ao carregar processos.',
        renderLinha: (p) => `<tr><td class="num">${p.id}</td><td>${window.escapeHTML(p.nome_processo)}</td>
            <td><div class="row-actions">
                <button class="link-btn" onclick="window.openProcessModal(${p.id})">Editar</button>
                <button class="link-btn danger" onclick="adminDelete('processes', ${p.id}, 'proc')">Excluir</button>
            </div></td></tr>`
    });
}

async function loadAdminPtaTopics(container) {
    container.innerHTML = window.UI.loading();
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
            container.innerHTML = window.UI.emptyState({ title: 'Nenhum tópico PTA cadastrado' });
            return;
        }

        let html = '<div class="table-container"><table class="data-table"><thead><tr><th>Ano</th><th>Tópico</th><th class="end">Ações</th></tr></thead><tbody>';
        topicosUnicos.forEach(t => {
            html += `<tr><td class="num">${t.ano}</td><td>${window.escapeHTML(t.titulo)}</td>
            <td><div class="row-actions">
                <button class="link-btn" onclick="openDeepView('pta/topicos', ${t.id}, 'Tópico PTA')">Editar</button>
                <button class="link-btn danger" onclick="adminDelete('pta/topicos', ${t.id}, 'pta')">Excluir</button>
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
    container.innerHTML = window.UI.loading();
    try {
        const res = await window.api.fetchProtected('/admin/logs');
        if (!res.ok) throw new Error("Erro ao buscar logs");
        const logs = await res.json();

        if (logs.length === 0) {
            container.innerHTML = window.UI.emptyState({ title: 'Nenhum evento registrado ainda' });
            return;
        }

        window.currentAuditLogs = logs;

        let html = '<div class="table-container"><table class="data-table">';
        html += '<thead><tr><th>Data e hora</th><th>Usuário</th><th>Ação</th><th>Módulo</th><th>Registro</th><th class="end">Detalhes</th></tr></thead><tbody>';

        logs.forEach((log, index) => {
            const dataFormatada = new Date(log.timestamp).toLocaleString('pt-BR');
            const isDelete = (log.action === "DELETE" || log.action === "SOFT_DELETE");
            const isUpdate = log.action === "UPDATE";
            const corClasse = isDelete ? 'badge-danger' : isUpdate ? 'badge-accent' : 'badge-success';

            html += `<tr>
                <td class="num">${dataFormatada}</td>
                <td class="num">#${log.admin_id}</td>
                <td><span class="badge ${corClasse}">${window.escapeHTML(log.action)}</span></td>
                <td class="code">${window.escapeHTML(log.table_name)}</td>
                <td class="num">${window.escapeHTML(log.record_id)}</td>
                <td><div class="row-actions"><button class="link-btn" onclick="viewLogPayload(${index})">Ver</button></div></td>
            </tr>`;
        });
        container.innerHTML = html + '</tbody></table></div>';
    } catch (err) {
        container.innerHTML = window.UI.errorState('Falha ao carregar o log.');
    }
}

window.viewLogPayload = function(index) {
    const log = window.currentAuditLogs[index];
    if (!log) return;

    const oldData = log.old_data ? JSON.stringify(log.old_data, null, 2) : "Sem dados";
    const newData = log.new_data ? JSON.stringify(log.new_data, null, 2) : "Sem dados";

    const modalId = 'log-payload-modal';
    const old = document.getElementById(modalId);
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content modal-md">
            <div class="modal-header">
                <div>
                    <p class="eyebrow">${window.escapeHTML(log.action)} · ${window.escapeHTML(log.table_name)} · ${window.escapeHTML(log.record_id)}</p>
                    <h3>Detalhes do evento</h3>
                </div>
                ${window.UI.closeButton(`document.getElementById('${modalId}').remove()`)}
            </div>
            <div class="stack">
                <div>
                    <label>Antes</label>
                    <pre>${window.escapeHTML(oldData)}</pre>
                </div>
                <div>
                    <label>Depois</label>
                    <pre>${window.escapeHTML(newData)}</pre>
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
    document.getElementById('dv-title').innerText = `${entityName} ${displayId}`;
    body.innerHTML = window.UI.loading();
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
            "is_active": "Conta ativa",
            "role": "Cargo"
        };

        let html = '';
        for (const [key, value] of Object.entries(data)) {
            if (key === 'senha' || key === 'id' || key === 'descricao' || key === 'anexo_dados' || key === 'anexo_meta') continue;

            const labelAmigavel = tradutorDeRotulos[key] || key;

            if (key === 'role') {
                const papeis = ['pesquisador', 'tecnico', 'coordenador', 'admin'];
                html += `
                    <div class="input-group">
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
                    <div class="input-group">
                        <label class="check-inline">
                            <input type="checkbox" id="dv-input-${key}" ${marcado ? 'checked' : ''}>
                            ${labelAmigavel}
                        </label>
                    </div>
                `;
                continue;
            }

            const safeValue = window.escapeHTML(value !== null && value !== undefined ? String(value) : '');

            html += `
                <div class="input-group">
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

    let stepUpToken = null;
    if (route === 'usuarios') {
        stepUpToken = await window.api.confirmStepUp({ title: 'Confirme para salvar', message: 'Você está alterando dados de acesso de um usuário, incluindo possivelmente o cargo/permissão dele.' });
        if (!stepUpToken) return;
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
            headers: {
                'Content-Type': 'application/json',
                ...(stepUpToken ? { 'X-Step-Up-Token': stepUpToken } : {})
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            window.UI.showToast("Dados atualizados com sucesso!", "success");
            closeDeepView();
            const naAdmin = !!document.getElementById('module-subcontent');
            if (!naAdmin) {
                const viewAtual = document.querySelector('.nav-item.active');
                if (viewAtual) window.UI.switchView(viewAtual.getAttribute('data-view'));
            }
            else if (route === 'usuarios') switchUserTab('active');
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

    let stepUpToken = null;
    if (isUser) {
        stepUpToken = await window.api.confirmStepUp({ title: 'Confirme para bloquear', message: 'Você está revogando o acesso deste usuário ao sistema.' });
        if (!stepUpToken) return;
    }

    let endpoint = '';
    if (route === 'usuarios') endpoint = `/admin/usuarios/${id}`;
    else if (route === 'equipments') endpoint = `/equipments/admin/${id}`;
    else if (route === 'pops') endpoint = `/pops/admin/${id}`;
    else if (route === 'processes') endpoint = `/processes/admin/${id}`;
    else if (route === 'pta/topicos') endpoint = `/pta/admin/topicos/${id}`;

    try {
        const res = await window.api.fetchProtected(endpoint, {
            method: 'DELETE',
            headers: isUser ? { 'X-Step-Up-Token': stepUpToken } : {}
        });

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
