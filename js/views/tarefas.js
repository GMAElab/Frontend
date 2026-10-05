(function () {
// ==========================================
// ROTEADOR
// ==========================================
document.addEventListener('viewChanged', (e) => {
    if (e.detail.view === 'tarefas') routerTarefas();
});

const escT = (s) => window.escapeHTML(s);

const STATUS_LABEL = {
    pendente: 'Pendente',
    em_andamento: 'Em Andamento',
    em_revisao: 'Em Revisão',
    concluida: 'Concluída',
    cancelada: 'Cancelada'
};
const STATUS_BADGE = {
    pendente: 'badge-warning',
    em_andamento: 'badge-warning',
    concluida: 'badge-success',
    cancelada: 'badge-danger'
};
const PRIORIDADE_LABEL = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };
const PRIORIDADE_BADGE = { baixa: 'badge', media: 'badge-warning', alta: 'badge-danger' };
const DESFECHO_LABEL = {
    atingido: 'Atingido',
    parcial: 'Parcialmente atingido',
    nao_atingido: 'Não atingido',
    inconclusivo: 'Inconclusivo'
};
const DESFECHO_BADGE = {
    atingido: 'badge-success',
    parcial: 'badge-warning',
    nao_atingido: 'badge-danger',
    inconclusivo: 'badge'
};

// Só ADMIN, TÉCNICO e COORDENADOR criam/editam/concluem tarefas e veem a equipe
// inteira — espelha security.check_roles no backend.
function isGestor(user) {
    return ['admin', 'tecnico', 'coordenador'].includes(user.role);
}

function usuarioAtual() {
    const userString = localStorage.getItem('user_data');
    return userString ? JSON.parse(userString) : null;
}

// ==========================================
// FORMATAÇÃO
// ==========================================
// Datas gravadas pelo servidor vêm em UTC; o prazo é horário de parede
// (digitado pelo gestor) e por isso não passa por essa conversão.
function parseUTC(valor) {
    if (!valor) return null;
    return new Date(/[zZ]$|[+-]\d\d:?\d\d$/.test(valor) ? valor : valor + 'Z');
}

function fmtDataHora(valorUtc) {
    const d = parseUTC(valorUtc);
    return d ? d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
}

function fmtData(valorUtc) {
    const d = parseUTC(valorUtc);
    return d ? d.toLocaleDateString('pt-BR') : '—';
}

function fmtPrazo(prazo) {
    return prazo ? new Date(prazo).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Sem prazo';
}

function fmtDuracao(segundos) {
    if (segundos === null || segundos === undefined) return '—';
    const s = Math.abs(Math.round(segundos));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return h > 0 ? `${d} d ${h} h` : `${d} d`;
    if (h > 0) return m > 0 ? `${h} h ${m} min` : `${h} h`;
    if (m > 0) return `${m} min`;
    return '< 1 min';
}

function normalizarTexto(s) {
    return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function badgeStatus(t) {
    if (t.atrasada) return '<span class="badge badge-danger">Atrasada</span>';
    if (t.status === 'em_revisao') return '<span class="badge badge-accent">Em revisão</span>';
    return `<span class="badge ${STATUS_BADGE[t.status] || 'badge'}">${STATUS_LABEL[t.status] || escT(t.status)}</span>`;
}

function badgePrioridade(t) {
    return `<span class="badge ${PRIORIDADE_BADGE[t.prioridade] || 'badge'}">${PRIORIDADE_LABEL[t.prioridade] || escT(t.prioridade)}</span>`;
}

function badgeDesfecho(t) {
    if (!t.desfecho) return '';
    return `<span class="badge ${DESFECHO_BADGE[t.desfecho] || 'badge'}">${DESFECHO_LABEL[t.desfecho] || escT(t.desfecho)}</span>`;
}

function chipsTags(tags, clicavel) {
    if (!tags || tags.length === 0) return '';
    return tags.map(tag => `<span class="badge"${clicavel ? ` title="Filtrar por esta tag" onclick="event.stopPropagation(); window.filtrarAcervoPorTag('${escT(tag).replace(/'/g, '&#39;')}')"` : ''}>${escT(tag)}</span>`).join(' ');
}

function buscarTarefaEmCache(id) {
    const todas = [].concat(window.tarefasEquipeCache || [], window.minhasTarefasCache || [], window.acervoCache || []);
    return todas.find(t => t.id === id);
}

function fecharModais(...ids) {
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
}

// ==========================================
// CASCA DA TELA (abas) — IGUAL PARA GESTOR E COLABORADOR
// ==========================================
function routerTarefas() {
    const user = usuarioAtual();
    if (!user) return;
    const gestor = isGestor(user);

    document.getElementById('dynamic-content').innerHTML = `
        <header class="page-head fade-in">
            <div>
                <p class="eyebrow">${gestor ? 'equipe' : 'atribuídas a você'}</p>
                <h1>Tarefas</h1>
                <p class="lede">${gestor ? 'Atribua tarefas, revise entregas e consulte o que já foi concluído.' : 'Reporte seu progresso e consulte o que a equipe já concluiu.'}</p>
            </div>
            <div class="page-actions" id="tarefas-acoes-topo"></div>
        </header>
        <div class="tabs fade-in">
            <button type="button" class="tab-btn" id="tab-tarefas-abertas" onclick="window.mostrarAbaTarefas('abertas')">Em andamento</button>
            <button type="button" class="tab-btn" id="tab-tarefas-acervo" onclick="window.mostrarAbaTarefas('acervo')">Concluídas</button>
        </div>
        <div id="tarefas-conteudo" class="fade-in"></div>
    `;
    window.mostrarAbaTarefas('abertas');
}

window.mostrarAbaTarefas = function (aba) {
    const user = usuarioAtual();
    if (!user) return;
    const gestor = isGestor(user);
    window.tarefasAba = aba;

    ['abertas', 'acervo'].forEach(nome => {
        const btn = document.getElementById(`tab-tarefas-${nome}`);
        if (!btn) return;
        btn.classList.toggle('active', nome === aba);
    });

    const acoes = document.getElementById('tarefas-acoes-topo');
    if (acoes) {
        acoes.innerHTML = (gestor && aba === 'abertas')
            ? `<button type="button" class="btn btn-primary" onclick="window.abrirModalTarefa()">Nova tarefa</button>`
            : '';
    }

    if (aba === 'acervo') renderAcervo();
    else if (gestor) renderTabelaGestor();
    else renderListaColaborador();
};

function recarregarTarefas() {
    const user = usuarioAtual();
    if (!user || !document.getElementById('tarefas-conteudo')) return;
    if (window.tarefasAba === 'acervo') carregarAcervo();
    else if (isGestor(user)) carregarTarefasEquipe();
    else carregarMinhasTarefas();
}

// ==========================================
// GESTOR — TABELA DE TAREFAS EM ABERTO
// ==========================================
function renderTabelaGestor() {
    document.getElementById('tarefas-conteudo').innerHTML = `
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Tarefa</th>
                        <th>Atribuída a</th>
                        <th>Prioridade</th>
                        <th>Prazo</th>
                        <th>Progresso</th>
                        <th>Status</th>
                        <th class="end">Ações</th>
                    </tr>
                </thead>
                <tbody id="tarefasEquipeBody">
                    <tr><td colspan="7">${window.UI.loading()}</td></tr>
                </tbody>
            </table>
        </div>
    `;
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
            tbody.innerHTML = `<tr><td colspan="7">${window.UI.emptyState({ title: 'Nenhuma tarefa em andamento', description: 'Use “Nova tarefa” para atribuir uma. As concluídas ficam na aba Concluídas.' })}</td></tr>`;
            return;
        }
        tbody.innerHTML = tarefas.map(renderLinhaTarefaGestor).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7">${window.UI.errorState('Erro ao carregar tarefas.')}</td></tr>`;
    }
}

function renderLinhaTarefaGestor(t) {
    const nomes = t.atribuidos.map(a => escT(a.nome)).join(', ') || '—';
    const vinculo = t.processo_nome ? `<span class="sub">Processo: ${escT(t.processo_nome)}</span>` : '';

    return `
        <tr class="clickable${t.status === 'em_revisao' ? ' is-flagged' : ''}" onclick="window.abrirDetalhesTarefa(${t.id})">
            <td><strong>${escT(t.titulo)}</strong>${vinculo}</td>
            <td>${nomes}</td>
            <td>${badgePrioridade(t)}</td>
            <td class="num">${fmtPrazo(t.prazo)}</td>
            <td class="num">${t.percentual_conclusao}%</td>
            <td>${badgeStatus(t)}</td>
            <td onclick="event.stopPropagation()">
                <div class="row-actions">
                    <button class="link-btn" onclick="window.abrirModalConcluir(${t.id})">Concluir</button>
                    <button class="link-btn muted" onclick="window.abrirModalTarefa(${t.id})">Editar</button>
                    <button class="link-btn danger" onclick="window.excluirTarefa(${t.id})">Excluir</button>
                </div>
            </td>
        </tr>
    `;
}

// ==========================================
// COLABORADOR — MINHAS TAREFAS EM ABERTO
// ==========================================
function renderListaColaborador() {
    document.getElementById('tarefas-conteudo').innerHTML = `
        <div id="minhasTarefasLista" class="entries">${window.UI.loading()}</div>
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
            container.innerHTML = window.UI.emptyState({ title: 'Nenhuma tarefa em andamento', description: 'Quando um gestor atribuir uma tarefa a você, ela aparece aqui. As já concluídas ficam na aba Concluídas.' });
            return;
        }
        container.innerHTML = tarefas.map(renderCardTarefaColaborador).join('');
    } catch (err) {
        container.innerHTML = window.UI.errorState('Erro ao carregar suas tarefas.');
    }
}

function renderCardTarefaColaborador(t) {
    const vinculo = t.processo_nome ? ` · processo: ${escT(t.processo_nome)}` : '';
    return `
        <article class="entry clickable" onclick="window.abrirDetalhesTarefa(${t.id})">
            <div class="entry-head">
                <h3 class="entry-title">${escT(t.titulo)}</h3>
                <div class="cluster">
                    ${badgePrioridade(t)}
                    ${badgeStatus(t)}
                </div>
            </div>
            <p class="meta">prazo: ${fmtPrazo(t.prazo)} · criada por ${escT(t.criado_por_nome)}${vinculo}</p>
            <div class="meter">
                <div class="meter-track"><div class="meter-fill" style="width:${t.percentual_conclusao}%"></div></div>
                <span class="meter-value">${t.percentual_conclusao}%</span>
            </div>
        </article>
    `;
}

// ==========================================
// TAREFAS CONCLUÍDAS
// ==========================================
function renderAcervo() {
    document.getElementById('tarefas-conteudo').innerHTML = `
        <p class="lede mb-md">O que já foi feito no laboratório: resultados, lições aprendidas e o que não funcionou. Consulte antes de começar algo novo.</p>
        <div class="toolbar">
            <input type="search" id="acervo-busca" class="form-control grow" placeholder="Buscar por título, resultado, lições, tag, pessoa ou processo" oninput="window.filtrarAcervo()">
            <select id="acervo-desfecho" class="form-control" onchange="window.filtrarAcervo()" aria-label="Desfecho">
                <option value="">Todos os desfechos</option>
                ${Object.entries(DESFECHO_LABEL).map(([valor, rotulo]) => `<option value="${valor}">${rotulo}</option>`).join('')}
            </select>
            <label class="check-inline">
                <input type="checkbox" id="acervo-minhas" onchange="window.filtrarAcervo()"> Somente as minhas
            </label>
        </div>
        <p id="acervo-contador" class="meta mb-sm"></p>
        <div id="acervo-lista" class="entries">${window.UI.loading()}</div>
    `;
    carregarAcervo();
}

async function carregarAcervo() {
    const lista = document.getElementById('acervo-lista');
    if (!lista) return;
    try {
        const res = await window.api.fetchProtected('/tarefas/acervo');
        if (!res.ok) throw new Error();
        window.acervoCache = await res.json();
        window.filtrarAcervo();
    } catch (err) {
        lista.innerHTML = window.UI.errorState('Erro ao carregar o acervo.');
    }
}

window.filtrarAcervo = function () {
    const lista = document.getElementById('acervo-lista');
    if (!lista) return;
    const user = usuarioAtual();
    const termo = normalizarTexto(document.getElementById('acervo-busca').value.trim());
    const desfecho = document.getElementById('acervo-desfecho').value;
    const soMinhas = document.getElementById('acervo-minhas').checked;

    const resultado = (window.acervoCache || []).filter(t => {
        if (desfecho && t.desfecho !== desfecho) return false;
        if (soMinhas && !t.atribuidos.some(a => user && a.id === user.id)) return false;
        if (!termo) return true;
        const palheiro = normalizarTexto([
            t.titulo, t.descricao, t.resultado, t.licoes, t.processo_nome, t.topico_titulo,
            (t.tags || []).join(' '), t.atribuidos.map(a => a.nome).join(' ')
        ].join(' '));
        return termo.split(/\s+/).every(palavra => palheiro.includes(palavra));
    });

    const total = (window.acervoCache || []).length;
    document.getElementById('acervo-contador').textContent = `${resultado.length} de ${total} ${total === 1 ? 'registro' : 'registros'}`;

    if (resultado.length === 0) {
        lista.innerHTML = total === 0
            ? window.UI.emptyState({ title: 'Nenhuma tarefa concluída ainda', description: 'As tarefas concluídas pelos gestores aparecem aqui.' })
            : window.UI.emptyState({ title: 'Nada encontrado', description: 'Tente outras palavras ou limpe os filtros.' });
        return;
    }
    lista.innerHTML = resultado.map(renderCardAcervo).join('');
};

window.filtrarAcervoPorTag = function (tag) {
    const campo = document.getElementById('acervo-busca');
    if (!campo) return;
    campo.value = tag;
    window.filtrarAcervo();
    campo.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

function renderCardAcervo(t) {
    let atrasoBadge = '';
    if (t.atraso_segundos !== null && t.atraso_segundos !== undefined) {
        atrasoBadge = t.atraso_segundos > 60
            ? `<span class="badge badge-danger">Atrasou ${fmtDuracao(t.atraso_segundos)}</span>`
            : '<span class="badge badge-success">No prazo</span>';
    }
    const resumoTxt = t.resultado
        ? escT(t.resultado.length > 220 ? t.resultado.slice(0, 220) + '…' : t.resultado)
        : '<span class="text-faint">Sem registro de resultado.</span>';
    const vinculos = [
        t.processo_nome ? `Processo: ${escT(t.processo_nome)}` : '',
        t.topico_titulo ? `Tópico PTA: ${escT(t.topico_titulo)}` : ''
    ].filter(Boolean).join(' · ');

    return `
        <article class="entry clickable" onclick="window.abrirResumoTarefa(${t.id})">
            <div class="entry-head">
                <h3 class="entry-title">${escT(t.titulo)}</h3>
                <div class="cluster">${badgeDesfecho(t)}${atrasoBadge}</div>
            </div>
            ${vinculos ? `<p class="meta">${vinculos}</p>` : ''}
            <p class="entry-body pre-wrap">${resumoTxt}</p>
            ${t.tags && t.tags.length ? `<div class="cluster mt-sm">${chipsTags(t.tags, true)}</div>` : ''}
            <p class="meta">concluída em ${fmtData(t.concluida_em)} · tempo total: ${fmtDuracao(t.tempo_total_segundos)} · ${t.atribuidos.map(a => escT(a.nome)).join(', ') || '—'}</p>
        </article>
    `;
}

// ==========================================
// VÍNCULO OPCIONAL COM PROCESSO / TÓPICO
// ==========================================
async function carregarOpcoesVinculo(idSelectProcesso, idSelectTopico, processoAtual, topicoAtual) {
    const selProc = document.getElementById(idSelectProcesso);
    const selTop = document.getElementById(idSelectTopico);
    if (!selProc || !selTop) return;

    const [rp, rt] = await Promise.all([
        window.api.fetchProtected('/processes/?limit=500').catch(() => null),
        window.api.fetchProtected('/pta/topicos').catch(() => null)
    ]);

    if (rp && rp.ok) {
        const procs = (await rp.json()).sort((a, b) => (a.nome_processo || '').localeCompare(b.nome_processo || '', 'pt-BR'));
        selProc.innerHTML = '<option value="">Nenhum</option>' + procs.map(p =>
            `<option value="${p.id}" ${p.id === processoAtual ? 'selected' : ''}>${escT(p.nome_processo)}</option>`).join('');
        selProc.dataset.carregado = '1';
    } else {
        selProc.innerHTML = '<option value="">Indisponível</option>';
    }

    if (rt && rt.ok) {
        const tops = await rt.json();
        selTop.innerHTML = '<option value="">Nenhum</option>' + tops.map(t =>
            `<option value="${t.id}" ${t.id === topicoAtual ? 'selected' : ''}>${escT(t.titulo)} (${t.ano})</option>`).join('');
        selTop.dataset.carregado = '1';
    } else {
        selTop.innerHTML = '<option value="">Indisponível</option>';
    }
}

function lerVinculos(idSelectProcesso, idSelectTopico) {
    const dados = {};
    const selProc = document.getElementById(idSelectProcesso);
    const selTop = document.getElementById(idSelectTopico);
    if (selProc && selProc.dataset.carregado === '1') dados.processo_id = selProc.value ? parseInt(selProc.value, 10) : null;
    if (selTop && selTop.dataset.carregado === '1') dados.topico_id = selTop.value ? parseInt(selTop.value, 10) : null;
    return dados;
}

function htmlSelectsVinculo(prefixo) {
    return `
        <div class="field-grid">
            <div class="input-group">
                <label for="${prefixo}-processo">Processo (opcional)</label>
                <select id="${prefixo}-processo"><option value="">Carregando...</option></select>
            </div>
            <div class="input-group">
                <label for="${prefixo}-topico">Tópico de pesquisa (opcional)</label>
                <select id="${prefixo}-topico"><option value="">Carregando...</option></select>
            </div>
        </div>`;
}

// ==========================================
// CRIAR / EDITAR TAREFA (SÓ GESTOR)
// ==========================================
window.abrirModalTarefa = async function (id = null) {
    const editando = !!id;
    const tarefa = editando ? (window.tarefasEquipeCache || []).find(t => t.id === id) : null;

    fecharModais('modalTarefa');

    document.body.insertAdjacentHTML('beforeend', `
    <div id="modalTarefa" class="modal-overlay is-open">
        <div class="modal-content">
            <div class="modal-header">
                <h3>${editando ? 'Editar tarefa' : 'Nova tarefa'}</h3>
                ${window.UI.closeButton("document.getElementById('modalTarefa').remove()")}
            </div>
            <form id="formTarefa">
                <div class="input-group">
                    <label for="tarefa-titulo">Título</label>
                    <input type="text" id="tarefa-titulo" required value="${tarefa ? escT(tarefa.titulo) : ''}">
                </div>
                <div class="input-group">
                    <label for="tarefa-descricao">Descrição</label>
                    <textarea id="tarefa-descricao" rows="3">${tarefa ? escT(tarefa.descricao || '') : ''}</textarea>
                </div>
                <div class="field-grid">
                    <div class="input-group">
                        <label for="tarefa-prazo">Prazo</label>
                        <input type="datetime-local" id="tarefa-prazo" value="${tarefa && tarefa.prazo ? tarefa.prazo.substring(0, 16) : ''}">
                    </div>
                    <div class="input-group">
                        <label for="tarefa-prioridade">Prioridade</label>
                        <select id="tarefa-prioridade">
                            <option value="baixa">Baixa</option>
                            <option value="media" selected>Média</option>
                            <option value="alta">Alta</option>
                        </select>
                    </div>
                </div>
                ${htmlSelectsVinculo('tarefa')}
                <div class="input-group">
                    <label>Atribuir a</label>
                    <div id="tarefa-equipe-container" class="check-chips">${window.UI.loading('Carregando equipe')}</div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('modalTarefa').remove()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">${editando ? 'Salvar alterações' : 'Criar tarefa'}</button>
                </div>
            </form>
        </div>
    </div>`);

    if (tarefa) document.getElementById('tarefa-prioridade').value = tarefa.prioridade;
    carregarOpcoesVinculo('tarefa-processo', 'tarefa-topico', tarefa ? tarefa.processo_id : null, tarefa ? tarefa.topico_id : null);

    const atribuidosAtuais = tarefa ? tarefa.atribuidos.map(a => a.id) : [];
    const containerEquipe = document.getElementById('tarefa-equipe-container');
    try {
        const res = await window.api.fetchProtected('/usuarios/equipe');
        const equipe = res.ok ? await res.json() : [];
        if (equipe.length === 0) {
            containerEquipe.innerHTML = '<span class="help">Nenhum usuário disponível.</span>';
        } else {
            containerEquipe.innerHTML = equipe.map(u => `
                <label class="check-chip">
                    <input type="checkbox" name="tarefa_atribuido_cb" value="${u.id}" ${atribuidosAtuais.includes(u.id) ? 'checked' : ''}>
                    ${escT(u.nome)}
                </label>
            `).join('');
        }
    } catch (err) {
        containerEquipe.innerHTML = '<span class="help text-danger">Não foi possível carregar a equipe.</span>';
    }

    document.getElementById('formTarefa').addEventListener('submit', (e) => window.salvarTarefa(e, id));
};

window.salvarTarefa = async function (e, id) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const textoOriginal = btn.innerText;
    btn.disabled = true;
    btn.innerText = 'Salvando...';

    const atribuidos = Array.from(document.querySelectorAll('input[name="tarefa_atribuido_cb"]:checked')).map(cb => parseInt(cb.value, 10));
    if (atribuidos.length === 0) {
        window.UI.showToast('Selecione ao menos um responsável.', 'warning');
        btn.disabled = false;
        btn.innerText = textoOriginal;
        return;
    }

    const payload = {
        titulo: document.getElementById('tarefa-titulo').value,
        descricao: document.getElementById('tarefa-descricao').value || null,
        prazo: document.getElementById('tarefa-prazo').value || null,
        prioridade: document.getElementById('tarefa-prioridade').value,
        atribuidos: atribuidos,
        ...lerVinculos('tarefa-processo', 'tarefa-topico')
    };

    try {
        const res = await window.api.fetchProtected(id ? `/tarefas/${id}` : '/tarefas', {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(await mensagemDeErro(res, 'Erro ao salvar tarefa.'));

        fecharModais('modalTarefa');
        window.UI.showToast(id ? 'Tarefa atualizada!' : 'Tarefa criada!', 'success');
        recarregarTarefas();
    } catch (err) {
        window.UI.showToast(err.message || 'Falha ao salvar tarefa.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = textoOriginal;
    }
};

window.excluirTarefa = async function (id) {
    const ok = await window.UI.confirm('Tem certeza que deseja excluir esta tarefa? Essa ação não pode ser desfeita.', { danger: true, confirmText: 'Excluir' });
    if (!ok) return;

    try {
        const res = await window.api.fetchProtected(`/tarefas/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(await mensagemDeErro(res, 'Falha ao excluir tarefa.'));
        window.UI.showToast('Tarefa excluída.', 'success');
        recarregarTarefas();
    } catch (err) {
        window.UI.showToast(err.message, 'error');
    }
};

async function mensagemDeErro(res, padrao) {
    const data = await res.json().catch(() => ({}));
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail) && data.detail[0] && data.detail[0].msg) {
        return data.detail[0].msg.replace(/^Value error, /, '');
    }
    return padrao;
}

// ==========================================
// DETALHES DA TAREFA EM ABERTO (progresso, revisão e comentários)
// ==========================================
function htmlFormComentario() {
    return `
        <form id="formComentarioTarefa">
            <div class="inline-form">
                <input type="text" id="detalhe-comentario-texto" class="form-control" placeholder="Escreva um comentário" required>
                <button type="submit" class="btn btn-secondary">Enviar</button>
            </div>
            <div class="cluster mt-sm">
                <label for="detalhe-comentario-midia" class="link-btn muted attach-label">Anexar foto ou vídeo</label>
                <input type="file" id="detalhe-comentario-midia" class="hidden" accept="image/*,video/*" onchange="window.previewMidiaComentario(event)">
                <span id="detalhe-comentario-midia-nome" class="meta"></span>
            </div>
        </form>`;
}

window.abrirDetalhesTarefa = function (id) {
    const user = usuarioAtual();
    if (!user) return;

    const tarefa = buscarTarefaEmCache(id);
    if (!tarefa) return;
    if (tarefa.status === 'concluida') { window.abrirResumoTarefa(id); return; }

    fecharModais('modalDetalhesTarefa');

    const gestor = isGestor(user);
    const souAtribuido = tarefa.atribuidos.some(a => a.id === user.id);
    const nomes = tarefa.atribuidos.map(a => escT(a.nome)).join(', ') || '—';
    const emRevisao = tarefa.status === 'em_revisao';

    const vinculos = [
        tarefa.processo_nome ? `Processo: <strong>${escT(tarefa.processo_nome)}</strong>` : '',
        tarefa.topico_titulo ? `Tópico PTA: <strong>${escT(tarefa.topico_titulo)}</strong>` : ''
    ].filter(Boolean).join(' · ');

    let avisoRevisao = '';
    if (emRevisao) {
        avisoRevisao = `<p class="note accent">
            ${gestor ? 'Esta tarefa foi enviada para revisão. Confira a entrega e conclua ou devolva com ajustes.' : 'Enviada para revisão, aguardando o gestor. Se precisar mexer em algo, mude o status abaixo.'}
        </p>`;
    }

    const acoesGestor = gestor ? `
        <div class="cluster mb-md">
            <button type="button" class="btn btn-primary btn-sm" onclick="window.abrirModalConcluir(${tarefa.id})">Concluir tarefa</button>
            ${emRevisao ? `<button type="button" class="btn btn-secondary btn-sm" onclick="window.abrirModalDevolver(${tarefa.id})">Devolver para ajustes</button>` : ''}
        </div>` : '';

    const progressoHtml = souAtribuido ? `
        <section class="modal-section">
            <div class="section-head"><h3>Meu progresso</h3></div>
            <div class="input-group">
                <label for="detalhe-avanco" class="label-row"><span>Conclusão</span><span id="detalhe-avanco-valor" class="mono">${tarefa.percentual_conclusao}%</span></label>
                <input type="range" id="detalhe-avanco" min="0" max="100" value="${tarefa.percentual_conclusao}" oninput="document.getElementById('detalhe-avanco-valor').innerText = this.value + '%'">
            </div>
            <div class="inline-form">
                <select id="detalhe-status" class="form-control" onchange="window.aoMudarStatusProgresso()" aria-label="Status">
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="em_revisao">Terminei, enviar para revisão</option>
                </select>
                <button type="button" id="detalhe-btn-progresso" class="btn btn-primary" onclick="window.salvarProgressoTarefa(${tarefa.id})">Salvar progresso</button>
            </div>
        </section>` : '';

    document.body.insertAdjacentHTML('beforeend', `
    <div id="modalDetalhesTarefa" class="modal-overlay is-open">
        <div class="modal-content modal-md">
            <div class="modal-header">
                <div>
                    <p class="eyebrow">tarefa</p>
                    <h3>${escT(tarefa.titulo)}</h3>
                </div>
                ${window.UI.closeButton("document.getElementById('modalDetalhesTarefa').remove()")}
            </div>
            <div class="cluster mb-md">${badgePrioridade(tarefa)}${badgeStatus(tarefa)}</div>

            ${avisoRevisao}
            ${acoesGestor}

            <dl class="dl compact">
                <div><dt>atribuída a</dt><dd class="plain">${nomes}</dd></div>
                <div><dt>prazo</dt><dd class="plain mono">${fmtPrazo(tarefa.prazo)}</dd></div>
                ${vinculos ? `<div><dt>vínculos</dt><dd class="plain">${vinculos}</dd></div>` : ''}
                <div><dt>descrição</dt><dd>${tarefa.descricao ? escT(tarefa.descricao) : '<span class="text-faint">Sem descrição.</span>'}</dd></div>
            </dl>

            ${progressoHtml}

            <section class="modal-section">
                <div class="section-head"><h3>Comentários</h3></div>
                <div id="detalhe-comentarios-lista" class="comments">${window.UI.loading()}</div>
                ${(gestor || souAtribuido) ? htmlFormComentario() : ''}
            </section>
        </div>
    </div>`);

    if (souAtribuido) {
        document.getElementById('detalhe-status').value = tarefa.status === 'em_revisao' ? 'em_revisao' : tarefa.status;
        window.aoMudarStatusProgresso();
    }
    const form = document.getElementById('formComentarioTarefa');
    if (form) form.addEventListener('submit', (e) => window.enviarComentarioTarefa(e, tarefa.id));
    carregarComentariosTarefa(tarefa.id);
};

window.aoMudarStatusProgresso = function () {
    const select = document.getElementById('detalhe-status');
    const slider = document.getElementById('detalhe-avanco');
    const btn = document.getElementById('detalhe-btn-progresso');
    if (!select || !slider) return;

    const revisao = select.value === 'em_revisao';
    if (revisao) {
        slider.value = 100;
        document.getElementById('detalhe-avanco-valor').innerText = '100%';
    }
    slider.disabled = revisao;
    if (btn) btn.innerText = revisao ? 'Enviar para revisão' : 'Salvar progresso';
};

window.salvarProgressoTarefa = async function (id) {
    const percentual = parseInt(document.getElementById('detalhe-avanco').value, 10);
    const status = document.getElementById('detalhe-status').value;

    if (status === 'em_revisao') {
        const ok = await window.UI.confirm('Enviar esta tarefa para revisão? O gestor será avisado por e-mail.', { title: 'Enviar para revisão', confirmText: 'Enviar' });
        if (!ok) return;
    }

    try {
        const res = await window.api.fetchProtected(`/tarefas/${id}/progresso`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, percentual_conclusao: percentual })
        });
        if (!res.ok) throw new Error(await mensagemDeErro(res, 'Falha ao atualizar progresso.'));

        window.UI.showToast(status === 'em_revisao' ? 'Tarefa enviada para revisão!' : 'Progresso atualizado!', 'success');
        fecharModais('modalDetalhesTarefa');
        recarregarTarefas();
    } catch (err) {
        window.UI.showToast(err.message, 'error');
    }
};

// ==========================================
// COMENTÁRIOS (COM FOTO/VÍDEO OPCIONAL)
// ==========================================
function renderAnexoComentario(url) {
    if (!url) return '';
    const extensao = (url.split('.').pop() || '').split('?')[0].toLowerCase();
    const ehVideo = ['mp4', 'mov', 'webm'].includes(extensao);
    const safeUrl = escT(url);

    if (ehVideo) {
        return `<video controls><source src="${safeUrl}"></video>`;
    }
    return `<img src="${safeUrl}" alt="" onclick="window.open(this.src, '_blank')" title="Abrir em tamanho real">`;
}

async function carregarComentariosTarefa(id) {
    const container = document.getElementById('detalhe-comentarios-lista');
    if (!container) return;
    try {
        const res = await window.api.fetchProtected(`/tarefas/${id}/comentarios`);
        if (!res.ok) throw new Error();
        const comentarios = await res.json();

        if (comentarios.length === 0) {
            container.innerHTML = '<p class="text-faint text-small">Nenhum comentário ainda.</p>';
            return;
        }
        container.innerHTML = comentarios.map(c => `
            <div class="comment">
                <strong>${escT(c.autor_nome)}</strong> <span class="meta">${fmtDataHora(c.criado_em)}</span>
                <p class="pre-wrap">${escT(c.texto)}</p>
                ${renderAnexoComentario(c.anexo_url)}
            </div>
        `).join('');
        container.scrollTop = container.scrollHeight;
    } catch (err) {
        container.innerHTML = '<p class="text-danger text-small">Não foi possível carregar os comentários.</p>';
    }
}

window.previewMidiaComentario = function (event) {
    const file = event.target.files[0];
    const label = document.getElementById('detalhe-comentario-midia-nome');
    if (!file) { if (label) label.textContent = ''; return; }

    const ehVideo = file.type.startsWith('video/');
    // Imagens até 25MB são aceitas aqui porque JPG/PNG são comprimidos no
    // navegador antes do upload (window.comprimirImagem)
    const limite = ehVideo ? 30 * 1024 * 1024 : 25 * 1024 * 1024;

    if (file.size > limite) {
        window.UI.showToast(`Arquivo muito grande. Limite de ${ehVideo ? '30MB para vídeo' : '25MB para imagem'}.`, 'warning');
        event.target.value = '';
        if (label) label.textContent = '';
        return;
    }
    if (label) label.textContent = file.name;
};

window.enviarComentarioTarefa = async function (e, id) {
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
            formData.append('file', await window.comprimirImagem(midiaInput.files[0]));
            const resUpload = await window.api.fetchProtected('/upload-midia', { method: 'POST', body: formData });
            if (!resUpload.ok) throw new Error(await mensagemDeErro(resUpload, 'Falha ao enviar o anexo.'));
            anexoUrl = (await resUpload.json()).url;
        }

        const res = await window.api.fetchProtected(`/tarefas/${id}/comentarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texto, anexo_url: anexoUrl })
        });
        if (!res.ok) throw new Error(await mensagemDeErro(res, 'Falha ao enviar comentário.'));

        if (document.getElementById('detalhe-comentarios-lista')) carregarComentariosTarefa(id);
        else if (document.getElementById('modalResumoTarefa')) window.abrirResumoTarefa(id);
    } catch (err) {
        window.UI.showToast(err.message || 'Falha ao enviar comentário.', 'error');
        btn.disabled = false;
        btn.innerText = textoOriginalBtn;
    }
};

// ==========================================
// CONCLUIR TAREFA
// ==========================================
function criarInputDeTags(idContainer, iniciais) {
    const container = document.getElementById(idContainer);
    const tags = [...iniciais];

    container.innerHTML = `
        <div class="tag-chips cluster mb-sm"></div>
        <input type="text" class="form-control" list="${idContainer}-sugestoes" maxlength="40" placeholder="Digite e pressione Enter (ex.: pla, extrusão)">
        <datalist id="${idContainer}-sugestoes"></datalist>`;
    const chips = container.querySelector('.tag-chips');
    const input = container.querySelector('input');
    const datalist = container.querySelector('datalist');

    const desenhar = () => {
        chips.innerHTML = tags.map((tag, i) => `
            <span class="badge">${escT(tag)}
                <button type="button" data-i="${i}" aria-label="Remover tag">&times;</button>
            </span>`).join('');
        chips.querySelectorAll('button').forEach(b => {
            b.onclick = () => { tags.splice(parseInt(b.dataset.i, 10), 1); desenhar(); };
        });
    };
    const adicionar = (valor) => {
        const v = valor.trim().toLowerCase().replace(/\s+/g, ' ');
        if (!v || tags.includes(v) || tags.length >= 10) return;
        tags.push(v);
        desenhar();
    };

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            adicionar(input.value.replace(/,/g, ''));
            input.value = '';
        }
    });
    input.addEventListener('blur', () => {
        if (input.value.trim()) { adicionar(input.value); input.value = ''; }
    });

    window.api.fetchProtected('/tarefas/tags')
        .then(r => r.ok ? r.json() : [])
        .then(lista => { datalist.innerHTML = lista.map(x => `<option value="${escT(x.tag)}"></option>`).join(''); })
        .catch(() => {});

    desenhar();
    return {
        obter: () => {
            if (input.value.trim()) { adicionar(input.value); input.value = ''; }
            return tags;
        }
    };
}

window.abrirModalConcluir = function (id) {
    const tarefa = buscarTarefaEmCache(id);
    if (!tarefa) return;
    fecharModais('modalConcluirTarefa');

    document.body.insertAdjacentHTML('beforeend', `
    <div id="modalConcluirTarefa" class="modal-overlay is-open is-top">
        <div class="modal-content modal-md">
            <div class="modal-header">
                <div>
                    <p class="eyebrow">concluir tarefa</p>
                    <h3>${escT(tarefa.titulo)}</h3>
                </div>
                ${window.UI.closeButton("document.getElementById('modalConcluirTarefa').remove()")}
            </div>
            <p class="note">Este registro fica na base e ajuda quem chegar depois a não refazer o que já foi feito. Depois de concluída, a tarefa fica travada.</p>
            <form id="formConcluirTarefa">
                <div class="input-group">
                    <label for="concluir-resultado">Resultado</label>
                    <textarea id="concluir-resultado" rows="4" required minlength="10" placeholder="O que foi obtido? Inclua dados, condições e valores relevantes."></textarea>
                </div>
                <div class="input-group">
                    <label for="concluir-desfecho">Desfecho</label>
                    <select id="concluir-desfecho" required>
                        <option value="" disabled selected>Selecione</option>
                        ${Object.entries(DESFECHO_LABEL).map(([valor, rotulo]) => `<option value="${valor}">${rotulo}</option>`).join('')}
                    </select>
                </div>
                <div class="input-group">
                    <label for="concluir-licoes">Lições aprendidas e o que não funcionou (opcional)</label>
                    <textarea id="concluir-licoes" rows="3" placeholder="O que faria diferente? O que evitar?"></textarea>
                </div>
                <div class="input-group">
                    <label>Palavras-chave</label>
                    <div id="concluir-tags"></div>
                    <span class="help">Ajudam a encontrar este registro na busca. Reaproveite as já existentes.</span>
                </div>
                ${htmlSelectsVinculo('concluir')}
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('modalConcluirTarefa').remove()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Concluir tarefa</button>
                </div>
            </form>
        </div>
    </div>`);

    const tagInput = criarInputDeTags('concluir-tags', tarefa.tags || []);
    carregarOpcoesVinculo('concluir-processo', 'concluir-topico', tarefa.processo_id, tarefa.topico_id);

    document.getElementById('formConcluirTarefa').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerText = 'Concluindo...';

        const payload = {
            resultado: document.getElementById('concluir-resultado').value,
            desfecho: document.getElementById('concluir-desfecho').value,
            licoes: document.getElementById('concluir-licoes').value || null,
            tags: tagInput.obter(),
            ...lerVinculos('concluir-processo', 'concluir-topico')
        };

        try {
            const res = await window.api.fetchProtected(`/tarefas/${id}/concluir`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error(await mensagemDeErro(res, 'Falha ao concluir a tarefa.'));

            fecharModais('modalConcluirTarefa', 'modalDetalhesTarefa');
            window.UI.showToast('Tarefa concluída e registrada na base de dados!', 'success');
            recarregarTarefas();
            window.abrirResumoTarefa(id);
        } catch (err) {
            window.UI.showToast(err.message, 'error');
            btn.disabled = false;
            btn.innerText = 'Concluir tarefa';
        }
    });
};

window.abrirModalDevolver = function (id) {
    const tarefa = buscarTarefaEmCache(id);
    if (!tarefa) return;
    fecharModais('modalDevolverTarefa');

    document.body.insertAdjacentHTML('beforeend', `
    <div id="modalDevolverTarefa" class="modal-overlay is-open is-top">
        <div class="modal-content modal-sm">
            <div class="modal-header">
                <div>
                    <p class="eyebrow">devolver para ajustes</p>
                    <h3>${escT(tarefa.titulo)}</h3>
                </div>
            </div>
            <form id="formDevolverTarefa">
                <div class="input-group">
                    <label for="devolver-motivo">O que precisa ser ajustado</label>
                    <textarea id="devolver-motivo" rows="4" required minlength="3"></textarea>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('modalDevolverTarefa').remove()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Devolver</button>
                </div>
            </form>
        </div>
    </div>`);

    document.getElementById('formDevolverTarefa').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        try {
            const res = await window.api.fetchProtected(`/tarefas/${id}/devolver`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ motivo: document.getElementById('devolver-motivo').value })
            });
            if (!res.ok) throw new Error(await mensagemDeErro(res, 'Falha ao devolver a tarefa.'));

            fecharModais('modalDevolverTarefa', 'modalDetalhesTarefa');
            window.UI.showToast('Tarefa devolvida. O colaborador foi avisado.', 'success');
            recarregarTarefas();
        } catch (err) {
            window.UI.showToast(err.message, 'error');
            btn.disabled = false;
        }
    });
};

window.reabrirTarefa = async function (id) {
    const ok = await window.UI.confirm('Reabrir esta tarefa? Ela sai da base de dados e volta para "Em andamento" para permitir correções.', { title: 'Reabrir tarefa', confirmText: 'Reabrir' });
    if (!ok) return;
    try {
        const res = await window.api.fetchProtected(`/tarefas/${id}/reabrir`, { method: 'POST' });
        if (!res.ok) throw new Error(await mensagemDeErro(res, 'Falha ao reabrir a tarefa.'));
        fecharModais('modalResumoTarefa');
        window.UI.showToast('Tarefa reaberta.', 'success');
        recarregarTarefas();
    } catch (err) {
        window.UI.showToast(err.message, 'error');
    }
};

// ==========================================
// RESUMO DA TAREFA CONCLUÍDA
// ==========================================
function cartaoMetrica(rotulo, valor) {
    return `<div class="figure"><span class="v">${valor}</span><span class="k">${rotulo}</span></div>`;
}

function fmtPrazoIso(iso) {
    return iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'sem prazo';
}

function descreverEvento(ev) {
    const nome = `<strong>${escT(ev.usuario_nome)}</strong>`;
    const d = ev.dados || {};
    switch (ev.tipo) {
        case 'criada': return `${nome} criou a tarefa`;
        case 'progresso': return `${nome} atualizou o progresso para ${d.percentual_para}% (${STATUS_LABEL[d.status_para] || escT(d.status_para)})`;
        case 'enviada_revisao': return `${nome} enviou a tarefa para revisão`;
        case 'devolvida': return `${nome} devolveu a tarefa para ajustes`;
        case 'concluida': return `${nome} concluiu a tarefa${d.desfecho ? ` (${DESFECHO_LABEL[d.desfecho] || escT(d.desfecho)})` : ''}`;
        case 'reaberta': return `${nome} reabriu a tarefa`;
        case 'prazo_alterado': return `${nome} alterou o prazo de ${fmtPrazoIso(d.de)} para ${fmtPrazoIso(d.para)}`;
        default: return `${nome}: ${escT(ev.tipo)}`;
    }
}

function corDoEvento(tipo) {
    return {
        concluida: 'ok', enviada_revisao: 'accent', devolvida: 'warn',
        reaberta: 'warn', prazo_alterado: 'warn'
    }[tipo] || '';
}

window.abrirResumoTarefa = async function (id) {
    const user = usuarioAtual();
    if (!user) return;
    fecharModais('modalResumoTarefa');

    document.body.insertAdjacentHTML('beforeend', `
    <div id="modalResumoTarefa" class="modal-overlay is-open">
        <div class="modal-content modal-lg">
            <div id="resumo-corpo">${window.UI.loading('Carregando resumo')}</div>
        </div>
    </div>`);

    const corpo = document.getElementById('resumo-corpo');
    try {
        const res = await window.api.fetchProtected(`/tarefas/${id}/resumo`);
        if (!res.ok) throw new Error(await mensagemDeErro(res, 'Não foi possível carregar o resumo.'));
        const { tarefa: t, metricas: m, linha_do_tempo: linha } = await res.json();

        const gestor = isGestor(user);
        const envolvido = gestor || t.atribuidos.some(a => a.id === user.id);
        const vinculos = [
            t.processo_nome ? `Processo: <strong>${escT(t.processo_nome)}</strong>` : '',
            t.topico_titulo ? `Tópico PTA: <strong>${escT(t.topico_titulo)}</strong>` : ''
        ].filter(Boolean).join(' · ');

        const metricasHtml = cartaoMetrica('do início à conclusão', fmtDuracao(m.tempo_total_segundos));

        const timelineHtml = linha.map(item => {
            const cor = corDoEvento(item.tipo);
            let conteudo;
            if (item.origem === 'comentario') {
                conteudo = `<strong>${escT(item.usuario_nome)}</strong> comentou
                    <p class="tl-quote pre-wrap">${escT(item.texto)}</p>
                    ${renderAnexoComentario(item.anexo_url)}`;
            } else {
                conteudo = descreverEvento(item);
            }
            return `<li class="tl-item ${cor}">
                <div class="meta">${fmtDataHora(item.criado_em)}</div>
                ${conteudo}
            </li>`;
        }).join('');

        const bloco = (rotulo, texto) => `<div><dt>${rotulo}</dt><dd>${texto}</dd></div>`;

        corpo.innerHTML = `
            <div class="modal-header">
                <div>
                    <p class="eyebrow">resumo da tarefa</p>
                    <h3>${escT(t.titulo)}</h3>
                </div>
                ${window.UI.closeButton("document.getElementById('modalResumoTarefa').remove()")}
            </div>
            <div class="cluster">
                ${t.status === 'concluida' ? '<span class="badge badge-success">Concluída</span>' : badgeStatus(t)}
                ${badgeDesfecho(t)}${badgePrioridade(t)}
            </div>

            ${metricasHtml}

            <dl class="dl">
                ${bloco('atribuída a', t.atribuidos.map(a => escT(a.nome)).join(', ') || '—')}
                ${bloco('criada', `por ${escT(t.criado_por_nome)} em ${fmtData(t.criado_em)}`)}
                ${t.concluida_em ? bloco('concluída', `por ${escT(t.concluida_por_nome || '—')} em ${fmtDataHora(t.concluida_em)}`) : ''}
                ${vinculos ? `<div><dt>vínculos</dt><dd class="plain">${vinculos}</dd></div>` : ''}
                ${t.descricao ? bloco('o que foi pedido', escT(t.descricao)) : ''}
                ${bloco('resultado', t.resultado ? escT(t.resultado) : '<span class="text-faint">Sem registro de resultado.</span>')}
                ${t.licoes ? bloco('lições aprendidas', escT(t.licoes)) : ''}
                ${t.tags && t.tags.length ? `<div><dt>palavras-chave</dt><dd class="plain"><div class="cluster">${chipsTags(t.tags, false)}</div></dd></div>` : ''}
                ${bloco('participaram', m.participantes.map(escT).join(', ') || '—')}
            </dl>

            <section class="modal-section">
                <div class="section-head"><h3>Linha do tempo</h3></div>
                ${timelineHtml ? `<ul class="timeline">${timelineHtml}</ul>` : '<p class="text-faint text-small">Sem histórico registrado.</p>'}
            </section>

            ${envolvido ? `<section class="modal-section">
                <div class="section-head"><h3>Adendo</h3></div>
                <p class="text-muted text-small mb-sm">A tarefa está travada. Correções e informações novas entram como comentário.</p>
                ${htmlFormComentario()}
            </section>` : ''}

            ${(user.role === 'admin' && t.status === 'concluida') ? `
            <div class="modal-footer">
                <button type="button" class="link-btn danger" onclick="window.reabrirTarefa(${t.id})">Reabrir tarefa</button>
            </div>` : ''}
        `;

        const form = document.getElementById('formComentarioTarefa');
        if (form) form.addEventListener('submit', (e) => window.enviarComentarioTarefa(e, t.id));
    } catch (err) {
        corpo.innerHTML = `${window.UI.errorState(err.message)}
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('modalResumoTarefa').remove()">Fechar</button>`;
    }
};
})();
