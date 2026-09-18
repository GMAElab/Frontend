// ==========================================
// ROTEADOR DAS TELAS (GESTOR e COLABORADOR)
// ==========================================
document.addEventListener('viewChanged', (e) => {
    if (e.detail.view === 'tarefas') routerTarefas();
});

const TAREFA_STATUS_LABEL = {
    pendente: 'Pendente',
    em_andamento: 'Em Andamento',
    concluida: 'Concluída',
    cancelada: 'Cancelada'
};
const TAREFA_STATUS_BADGE = {
    pendente: 'badge-warning',
    em_andamento: 'badge-warning',
    concluida: 'badge-success',
    cancelada: 'badge-danger'
};
const TAREFA_PRIORIDADE_LABEL = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };
const TAREFA_PRIORIDADE_BADGE = { baixa: 'badge', media: 'badge-warning', alta: 'badge-danger' };

// Só ADMIN, TÉCNICO e COORDENADOR podem criar/editar/excluir tarefas e ver a
// equipe inteira — espelha a checagem de roles feita no backend (security.check_roles).
function isGestorTarefas(user) {
    return ['admin', 'tecnico', 'coordenador'].includes(user.role);
}

function usuarioAtual() {
    const userString = localStorage.getItem('user_data');
    return userString ? JSON.parse(userString) : null;
}

function routerTarefas() {
    const user = usuarioAtual();
    if (!user) return;

    if (isGestorTarefas(user)) {
        renderTarefasGestor();
    } else {
        renderTarefasColaborador();
    }
}

// ==========================================
// VISÃO DO GESTOR (ADMIN / TÉCNICO / COORDENADOR)
// ==========================================
function renderTarefasGestor() {
    const main = document.getElementById('dynamic-content');
    main.innerHTML = `
        <div class="view-header fade-in" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:12px;">
            <div>
                <h3 style="margin:0; font-size:1.5rem;">Tarefas da Equipe</h3>
                <p class="text-muted" style="margin-top:5px;">Atribua tarefas e acompanhe o progresso de cada membro.</p>
            </div>
            <button id="btn-nova-tarefa" class="btn btn-primary">${window.Icon('plus', { size: 16 })} Nova Tarefa</button>
        </div>

        <div class="card table-container fade-in">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Tarefa</th>
                        <th>Atribuída a</th>
                        <th>Prioridade</th>
                        <th>Prazo</th>
                        <th>Progresso</th>
                        <th>Status</th>
                        <th style="text-align:right;">Ações</th>
                    </tr>
                </thead>
                <tbody id="tarefasEquipeBody">
                    <tr><td colspan="7" style="text-align:center; padding:30px;"><span class="spinner"></span></td></tr>
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('btn-nova-tarefa').addEventListener('click', () => window.abrirModalTarefa());
    carregarTarefasEquipe();
}

async function carregarTarefasEquipe() {
    const tbody = document.getElementById('tarefasEquipeBody');
    if (!tbody) return;
    try {
        const res = await window.api.fetchProtected('/tarefas/equipe');
        if (!res.ok) throw new Error();
        const tarefas = await res.json();
        window.tarefasEquipeCache = tarefas;

        if (tarefas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7">${window.UI.emptyState({ icon: 'clipboard', title: 'Nenhuma tarefa criada ainda', description: 'Clique em "Nova Tarefa" para atribuir a primeira.' })}</td></tr>`;
            return;
        }

        tbody.innerHTML = tarefas.map(renderLinhaTarefaGestor).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7">${window.UI.errorState('Erro ao carregar tarefas.')}</td></tr>`;
    }
}

function renderLinhaTarefaGestor(t) {
    const nomes = t.atribuidos.map(a => window.escapeHTML(a.nome)).join(', ') || '—';
    const prazoTxt = t.prazo ? new Date(t.prazo).toLocaleDateString('pt-BR') : 'Sem prazo';
    const statusLabel = t.atrasada ? 'Atrasada' : (TAREFA_STATUS_LABEL[t.status] || t.status);
    const statusBadge = t.atrasada ? 'badge-danger' : (TAREFA_STATUS_BADGE[t.status] || 'badge');
    const prioLabel = TAREFA_PRIORIDADE_LABEL[t.prioridade] || t.prioridade;
    const prioBadge = TAREFA_PRIORIDADE_BADGE[t.prioridade] || 'badge';

    return `
        <tr style="cursor:pointer;" onclick="window.abrirDetalhesTarefa(${t.id})">
            <td><strong>${window.escapeHTML(t.titulo)}</strong></td>
            <td>${nomes}</td>
            <td><span class="badge ${prioBadge}">${prioLabel}</span></td>
            <td>${prazoTxt}</td>
            <td>${t.percentual_conclusao}%</td>
            <td><span class="badge ${statusBadge}">${statusLabel}</span></td>
            <td style="text-align:right; white-space:nowrap;" onclick="event.stopPropagation()">
                <button class="btn btn-outline-primary btn-sm" onclick="window.abrirModalTarefa(${t.id})">Editar</button>
                <button class="btn btn-outline-danger btn-sm" onclick="window.excluirTarefa(${t.id})">Excluir</button>
            </td>
        </tr>
    `;
}

// ==========================================
// CRIAR / EDITAR TAREFA (SÓ GESTOR)
// ==========================================
window.abrirModalTarefa = async function(id = null) {
    const editando = !!id;
    const tarefa = editando ? (window.tarefasEquipeCache || []).find(t => t.id === id) : null;

    const old = document.getElementById('modalTarefa');
    if (old) old.remove();

    const modalHtml = `
    <div id="modalTarefa" class="modal-overlay" style="display:flex; position:fixed; top:0; left:0; width:100%; height:100%; z-index:999999; justify-content:center; align-items:center; padding:20px;">
        <div class="modal-content" style="width:100%; max-width:560px; max-height:90vh; overflow-y:auto; border-radius:4px; border-top:3px solid var(--primary);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
                <h3 style="margin:0;">${editando ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
                <button type="button" onclick="document.getElementById('modalTarefa').remove()" style="background:none; border:none; font-size:26px; cursor:pointer; color:var(--text-faint);">&times;</button>
            </div>
            <form id="formTarefa">
                <div class="input-group" style="margin-bottom:14px;">
                    <label>Título</label>
                    <input type="text" id="tarefa-titulo" class="form-control" required value="${tarefa ? window.escapeHTML(tarefa.titulo) : ''}">
                </div>
                <div class="input-group" style="margin-bottom:14px;">
                    <label>Descrição</label>
                    <textarea id="tarefa-descricao" class="form-control" rows="3">${tarefa ? window.escapeHTML(tarefa.descricao || '') : ''}</textarea>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px;">
                    <div class="input-group" style="margin-bottom:0;">
                        <label>Prazo</label>
                        <input type="datetime-local" id="tarefa-prazo" class="form-control" value="${tarefa && tarefa.prazo ? tarefa.prazo.substring(0, 16) : ''}">
                    </div>
                    <div class="input-group" style="margin-bottom:0;">
                        <label>Prioridade</label>
                        <select id="tarefa-prioridade" class="form-control">
                            <option value="baixa">Baixa</option>
                            <option value="media" selected>Média</option>
                            <option value="alta">Alta</option>
                        </select>
                    </div>
                </div>
                <div class="input-group" style="margin-bottom:18px;">
                    <label>Atribuir a</label>
                    <div id="tarefa-equipe-container" style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;">
                        <span class="spinner" style="width:15px; height:15px;"></span> <span style="font-size:13px;">Carregando equipe...</span>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary btn-block">${editando ? 'Salvar Alterações' : 'Criar Tarefa'}</button>
            </form>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    if (tarefa) document.getElementById('tarefa-prioridade').value = tarefa.prioridade;

    const atribuidosAtuais = tarefa ? tarefa.atribuidos.map(a => a.id) : [];
    const containerEquipe = document.getElementById('tarefa-equipe-container');
    try {
        const res = await window.api.fetchProtected('/usuarios/equipe');
        const equipe = res.ok ? await res.json() : [];
        if (equipe.length === 0) {
            containerEquipe.innerHTML = '<span class="text-muted" style="font-size:13px;">Nenhum usuário disponível.</span>';
        } else {
            containerEquipe.innerHTML = equipe.map(u => `
                <label style="background:var(--bg-subtle); color:var(--text-main); padding:6px 12px; border-radius:var(--radius-full); cursor:pointer; font-size:13px; display:flex; align-items:center; gap:5px; border:1px solid var(--border-color); user-select:none;">
                    <input type="checkbox" name="tarefa_atribuido_cb" value="${u.id}" ${atribuidosAtuais.includes(u.id) ? 'checked' : ''} style="cursor:pointer;">
                    ${window.escapeHTML(u.nome)}
                </label>
            `).join('');
        }
    } catch (err) {
        containerEquipe.innerHTML = '<span style="color:var(--danger); font-size:12px;">Falha ao carregar lista de equipe.</span>';
    }

    document.getElementById('formTarefa').addEventListener('submit', (e) => window.salvarTarefa(e, id));
};

window.salvarTarefa = async function(e, id) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const textoOriginal = btn.innerText;
    btn.disabled = true;
    btn.innerText = 'Salvando...';

    const checkboxes = document.querySelectorAll('input[name="tarefa_atribuido_cb"]:checked');
    const atribuidos = Array.from(checkboxes).map(cb => parseInt(cb.value, 10));

    if (atribuidos.length === 0) {
        window.UI.showToast('Selecione ao menos um responsável.', 'warning');
        btn.disabled = false;
        btn.innerText = textoOriginal;
        return;
    }

    const prazoValor = document.getElementById('tarefa-prazo').value;
    const payload = {
        titulo: document.getElementById('tarefa-titulo').value,
        descricao: document.getElementById('tarefa-descricao').value || null,
        prazo: prazoValor || null,
        prioridade: document.getElementById('tarefa-prioridade').value,
        atribuidos: atribuidos
    };

    try {
        const res = await window.api.fetchProtected(id ? `/tarefas/${id}` : '/tarefas', {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.detail || 'Erro ao salvar tarefa.');
        }

        document.getElementById('modalTarefa').remove();
        window.UI.showToast(id ? 'Tarefa atualizada!' : 'Tarefa criada!', 'success');
        carregarTarefasEquipe();
    } catch (err) {
        window.UI.showToast(err.message || 'Falha ao salvar tarefa.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = textoOriginal;
    }
};

window.excluirTarefa = async function(id) {
    const ok = await window.UI.confirm('Tem certeza que deseja excluir esta tarefa? Essa ação não pode ser desfeita.', { danger: true, confirmText: 'Excluir' });
    if (!ok) return;

    try {
        const res = await window.api.fetchProtected(`/tarefas/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        window.UI.showToast('Tarefa excluída.', 'success');
        carregarTarefasEquipe();
    } catch (err) {
        window.UI.showToast('Falha ao excluir tarefa.', 'error');
    }
};

// ==========================================
// VISÃO DO COLABORADOR (PESQUISADOR)
// ==========================================
function renderTarefasColaborador() {
    const main = document.getElementById('dynamic-content');
    main.innerHTML = `
        <div class="view-header fade-in" style="margin-bottom:24px;">
            <h3 style="margin:0; font-size:1.5rem;">Minhas Tarefas</h3>
            <p class="text-muted" style="margin-top:5px;">Acompanhe as tarefas atribuídas a você e reporte seu progresso.</p>
        </div>
        <div id="minhasTarefasLista" class="fade-in" style="display:flex; flex-direction:column; gap:14px;">
            <span class="spinner"></span>
        </div>
    `;
    carregarMinhasTarefas();
}

async function carregarMinhasTarefas() {
    const container = document.getElementById('minhasTarefasLista');
    if (!container) return;
    try {
        const res = await window.api.fetchProtected('/tarefas/minhas');
        if (!res.ok) throw new Error();
        const tarefas = await res.json();
        window.minhasTarefasCache = tarefas;

        if (tarefas.length === 0) {
            container.innerHTML = window.UI.emptyState({ icon: 'clipboard', title: 'Nenhuma tarefa atribuída', description: 'Quando um gestor atribuir uma tarefa a você, ela aparece aqui.' });
            return;
        }

        container.innerHTML = tarefas.map(renderCardTarefaColaborador).join('');
    } catch (err) {
        container.innerHTML = window.UI.errorState('Erro ao carregar suas tarefas.');
    }
}

function renderCardTarefaColaborador(t) {
    const prazoTxt = t.prazo ? new Date(t.prazo).toLocaleDateString('pt-BR') : 'Sem prazo';
    const statusLabel = t.atrasada ? 'Atrasada' : (TAREFA_STATUS_LABEL[t.status] || t.status);
    const statusBadge = t.atrasada ? 'badge-danger' : (TAREFA_STATUS_BADGE[t.status] || 'badge');
    const prioLabel = TAREFA_PRIORIDADE_LABEL[t.prioridade] || t.prioridade;
    const prioBadge = TAREFA_PRIORIDADE_BADGE[t.prioridade] || 'badge';

    return `
        <div class="card" style="cursor:pointer; border-left:3px solid var(--primary);" onclick="window.abrirDetalhesTarefa(${t.id})">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">
                <div>
                    <strong style="font-size:15px;">${window.escapeHTML(t.titulo)}</strong>
                    <p class="text-muted" style="font-size:12.5px; margin:4px 0 0 0;">Prazo: ${prazoTxt} · Criada por ${window.escapeHTML(t.criado_por_nome)}</p>
                </div>
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <span class="badge ${prioBadge}">${prioLabel}</span>
                    <span class="badge ${statusBadge}">${statusLabel}</span>
                </div>
            </div>
            <div style="margin-top:12px; background:var(--bg-subtle); border-radius:var(--radius-full); height:8px; overflow:hidden;">
                <div style="width:${t.percentual_conclusao}%; background:var(--primary); height:100%;"></div>
            </div>
            <p class="text-muted" style="font-size:12px; margin:6px 0 0 0; text-align:right;">${t.percentual_conclusao}% concluído</p>
        </div>
    `;
}

// ==========================================
// MODAL DE DETALHES (COMPARTILHADO ENTRE OS DOIS PERFIS)
// ==========================================
window.abrirDetalhesTarefa = async function(id) {
    const user = usuarioAtual();
    if (!user) return;

    const old = document.getElementById('modalDetalhesTarefa');
    if (old) old.remove();

    const cacheLista = window.tarefasEquipeCache || window.minhasTarefasCache || [];
    const tarefa = cacheLista.find(t => t.id === id);
    if (!tarefa) return;

    const souAtribuido = tarefa.atribuidos.some(a => a.id === user.id);
    const prazoTxt = tarefa.prazo ? new Date(tarefa.prazo).toLocaleString('pt-BR') : 'Sem prazo definido';
    const nomes = tarefa.atribuidos.map(a => window.escapeHTML(a.nome)).join(', ') || '—';

    const progressoHtml = souAtribuido ? `
        <div style="background:var(--bg-subtle); padding:16px; border-radius:var(--radius-md); margin-top:18px;">
            <h4 style="margin:0 0 12px 0; font-size:14px;">Atualizar meu progresso</h4>
            <div class="input-group" style="margin-bottom:10px;">
                <label style="display:flex; justify-content:space-between;"><span>Conclusão</span><span id="detalhe-avanco-valor">${tarefa.percentual_conclusao}%</span></label>
                <input type="range" id="detalhe-avanco" min="0" max="100" value="${tarefa.percentual_conclusao}" style="width:100%;" oninput="document.getElementById('detalhe-avanco-valor').innerText = this.value + '%'">
            </div>
            <div class="input-group" style="margin-bottom:10px;">
                <label>Status</label>
                <select id="detalhe-status" class="form-control">
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluida">Concluída</option>
                </select>
            </div>
            <button type="button" class="btn btn-primary btn-sm" onclick="window.salvarProgressoTarefa(${tarefa.id})">Salvar Progresso</button>
        </div>` : '';

    const modalHtml = `
    <div id="modalDetalhesTarefa" class="modal-overlay" style="display:flex; position:fixed; top:0; left:0; width:100%; height:100%; z-index:999999; justify-content:center; align-items:center; padding:20px;">
        <div class="modal-content" style="width:100%; max-width:600px; max-height:90vh; overflow-y:auto; border-radius:4px; border-top:3px solid var(--primary);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <h3 style="margin:0;">${window.escapeHTML(tarefa.titulo)}</h3>
                <button type="button" onclick="document.getElementById('modalDetalhesTarefa').remove()" style="background:none; border:none; font-size:26px; cursor:pointer; color:var(--text-faint);">&times;</button>
            </div>
            <p class="text-muted" style="font-size:13px; margin-bottom:14px;">Atribuída a: <strong>${nomes}</strong> · Prazo: <strong>${prazoTxt}</strong></p>
            <div style="background:var(--bg-subtle); padding:14px; border-radius:var(--radius-md); font-size:13.5px; white-space:pre-wrap; margin-bottom:6px;">${tarefa.descricao ? window.escapeHTML(tarefa.descricao) : 'Sem descrição.'}</div>

            ${progressoHtml}

            <div style="margin-top:20px; border-top:1px solid var(--border-light); padding-top:16px;">
                <h4 style="margin:0 0 10px 0; font-size:14px;">Comentários</h4>
                <div id="detalhe-comentarios-lista" style="display:flex; flex-direction:column; gap:10px; max-height:220px; overflow-y:auto; margin-bottom:14px;">
                    <span class="spinner"></span>
                </div>
                <form id="formComentarioTarefa">
                    <div style="display:flex; gap:8px;">
                        <input type="text" id="detalhe-comentario-texto" class="form-control" placeholder="Escreva um comentário..." required style="flex:1;">
                        <button type="submit" class="btn btn-primary btn-sm">Enviar</button>
                    </div>
                    <div style="margin-top:8px; display:flex; align-items:center; gap:8px;">
                        <label for="detalhe-comentario-midia" class="btn btn-outline-primary btn-sm" style="cursor:pointer; margin:0;">${window.Icon('upload', { size: 14 })} Anexar foto/vídeo</label>
                        <input type="file" id="detalhe-comentario-midia" accept="image/*,video/*" style="display:none;" onchange="window.previewMidiaComentario(event)">
                        <span id="detalhe-comentario-midia-nome" class="text-muted" style="font-size:12px;"></span>
                    </div>
                </form>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    if (souAtribuido) document.getElementById('detalhe-status').value = tarefa.status;

    document.getElementById('formComentarioTarefa').addEventListener('submit', (e) => window.enviarComentarioTarefa(e, tarefa.id));
    carregarComentariosTarefa(tarefa.id);
};

function renderAnexoComentario(url) {
    if (!url) return '';
    const extensao = (url.split('.').pop() || '').split('?')[0].toLowerCase();
    const ehVideo = ['mp4', 'mov', 'webm'].includes(extensao);
    const safeUrl = window.escapeHTML(url);

    if (ehVideo) {
        return `<video controls style="max-width:100%; max-height:220px; border-radius:var(--radius-sm); margin-top:6px; display:block;"><source src="${safeUrl}"></video>`;
    }
    return `<img src="${safeUrl}" style="max-width:100%; max-height:220px; border-radius:var(--radius-sm); margin-top:6px; cursor:pointer; object-fit:contain;" onclick="window.open('${safeUrl}', '_blank')" title="Clique para ampliar">`;
}

async function carregarComentariosTarefa(id) {
    const container = document.getElementById('detalhe-comentarios-lista');
    if (!container) return;
    try {
        const res = await window.api.fetchProtected(`/tarefas/${id}/comentarios`);
        if (!res.ok) throw new Error();
        const comentarios = await res.json();

        if (comentarios.length === 0) {
            container.innerHTML = '<p class="text-faint" style="font-size:12.5px; text-align:center;">Nenhum comentário ainda.</p>';
            return;
        }

        container.innerHTML = comentarios.map(c => `
            <div style="border-left:2px solid var(--border-color); padding-left:10px;">
                <strong style="font-size:12.5px;">${window.escapeHTML(c.autor_nome)}</strong>
                <p style="margin:2px 0 0 0; font-size:13px; color:var(--text-main); white-space:pre-wrap;">${window.escapeHTML(c.texto)}</p>
                ${renderAnexoComentario(c.anexo_url)}
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = '<p class="text-danger" style="font-size:12.5px;">Erro ao carregar comentários.</p>';
    }
}

window.previewMidiaComentario = function(event) {
    const file = event.target.files[0];
    const label = document.getElementById('detalhe-comentario-midia-nome');
    if (!file) { if (label) label.textContent = ''; return; }

    const ehVideo = file.type.startsWith('video/');
    const limite = ehVideo ? 30 * 1024 * 1024 : 10 * 1024 * 1024;

    if (file.size > limite) {
        window.UI.showToast(`Arquivo muito grande. Limite de ${ehVideo ? '30MB para vídeo' : '10MB para imagem'}.`, 'warning');
        event.target.value = '';
        if (label) label.textContent = '';
        return;
    }
    if (label) label.textContent = file.name;
};

window.enviarComentarioTarefa = async function(e, id) {
    e.preventDefault();
    const input = document.getElementById('detalhe-comentario-texto');
    const midiaInput = document.getElementById('detalhe-comentario-midia');
    const texto = input.value.trim();
    if (!texto) return;

    const btn = e.target.querySelector('button[type="submit"]');
    const textoOriginalBtn = btn.innerText;
    btn.disabled = true;
    btn.innerText = 'Enviando...';

    try {
        let anexoUrl = null;
        if (midiaInput && midiaInput.files.length > 0) {
            const formData = new FormData();
            formData.append('file', midiaInput.files[0]);
            const resUpload = await window.api.fetchProtected('/upload-midia', { method: 'POST', body: formData });
            if (!resUpload.ok) {
                const dataErro = await resUpload.json().catch(() => ({}));
                throw new Error(dataErro.detail || 'Falha ao enviar o anexo.');
            }
            const dataUpload = await resUpload.json();
            anexoUrl = dataUpload.url;
        }

        const res = await window.api.fetchProtected(`/tarefas/${id}/comentarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texto, anexo_url: anexoUrl })
        });
        if (!res.ok) throw new Error();

        input.value = '';
        if (midiaInput) midiaInput.value = '';
        const label = document.getElementById('detalhe-comentario-midia-nome');
        if (label) label.textContent = '';
        carregarComentariosTarefa(id);
    } catch (err) {
        window.UI.showToast(err.message || 'Falha ao enviar comentário.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = textoOriginalBtn;
    }
};

window.salvarProgressoTarefa = async function(id) {
    const percentual = parseInt(document.getElementById('detalhe-avanco').value, 10);
    const status = document.getElementById('detalhe-status').value;

    try {
        const res = await window.api.fetchProtected(`/tarefas/${id}/progresso`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, percentual_conclusao: percentual })
        });
        if (!res.ok) throw new Error();

        window.UI.showToast('Progresso atualizado!', 'success');
        document.getElementById('modalDetalhesTarefa').remove();

        const user = usuarioAtual();
        if (user && isGestorTarefas(user)) carregarTarefasEquipe();
        else carregarMinhasTarefas();
    } catch (err) {
        window.UI.showToast('Falha ao atualizar progresso.', 'error');
    }
};
