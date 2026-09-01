// ==========================================
// ROTEADOR DAS TELAS (PESQUISADOR e ADMINISTRAÇÃO)
// ==========================================
document.addEventListener('viewChanged', (e) => {
    if (e.detail.view === 'pta') routerPTA();
});

function routerPTA() {
    const userString = localStorage.getItem('user_data');
    if (!userString) return;
    const user = JSON.parse(userString);

    if (user.role === 'coordenador' || user.role === 'admin') {
        renderPTACoordenador();
    } else {
        renderPTAPesquisador();
    }
}

// ==========================================
// CARREGAR TÓPICOS
// ==========================================
async function carregarDropdownTopicos(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">Carregando tópicos...</option>';

    try {
        const res = await window.api.fetchProtected('/pta/topicos');
        const topicos = await res.json();

        if (topicos.length === 0) {
            select.innerHTML = '<option value="">Nenhum tópico encontrado</option>';
            return;
        }

        let html = '<option value="">Selecione um tópico...</option>';
        topicos.forEach(t => {
            html += `<option value="${t.id}">${window.escapeHTML(t.titulo)} (${t.ano})</option>`;
        });
        select.innerHTML = html;

        if (selectId === 'pta-topico') {
            const ultimoTopico = localStorage.getItem('pta_ultimo_topico');
            if (ultimoTopico && select.querySelector(`option[value="${ultimoTopico}"]`)) {
                select.value = ultimoTopico;
                window.carregarPTAUnificadoEquipe();
            }
        }

        setTimeout(atualizarAvisoUltimoPTA, 300);

    } catch (err) {
        select.innerHTML = '<option value="">Erro ao carregar tópicos</option>';
    }
}

// ==========================================
// VISÃO DO PESQUISADOR
// ==========================================
function renderPTAPesquisador() {
    const main = document.getElementById('dynamic-content');
    const dataAtual = new Date();

    main.innerHTML = `
        <div class="view-header">
            <h2>Planejamento Mensal</h2>
            <p class="text-muted">Envie sua progressão mensal em cada tópico disponível.</p>
        </div>

        <div class="grid-fluida">

            <!-- FORMULÁRIO PRINCIPAL -->
            <div class="card-responsivo" style="align-self: start;">
                <h3 style="margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid var(--border-light);">Novo Planejamento Mensal</h3>
                <form id="form-pta">
                    <div class="input-group">
                        <label>Tópico de Pesquisa</label>
                        <select id="pta-topico" class="form-control" required onchange="localStorage.setItem('pta_ultimo_topico', this.value); window.atualizarAvisoUltimoPTA(); window.carregarPTAUnificadoEquipe()"></select>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;" class="input-group">
                        <div>
                            <label>Mês</label>
                            <input type="number" id="pta-mes" class="form-control" value="${dataAtual.getMonth() + 1}" min="1" max="12" required onchange="window.carregarPTAUnificadoEquipe()">
                        </div>
                        <div>
                            <label>Ano</label>
                            <input type="number" id="pta-ano" class="form-control" value="${dataAtual.getFullYear()}" required onchange="window.carregarPTAUnificadoEquipe()">
                        </div>
                    </div>

                    <div class="pop-sec" style="margin-bottom: 25px;">
                        <label style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span>Avanço Geral da Pesquisa</span>
                            <span id="valor-avanco" class="text-primary" style="font-size:1rem;">50%</span>
                        </label>
                        <input type="range" id="pta-avanco" min="0" max="100" value="50" style="width: 100%; cursor: pointer;"
                               oninput="document.getElementById('valor-avanco').innerText = this.value + '%'">
                    </div>

                    <div id="ultimo-pta-aviso" class="hidden pop-sec" style="border-left: 3px solid var(--primary); margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <strong style="font-size: 13px;">Último relato deste tópico (Mês <span id="ultimo-pta-mes"></span>):</strong>
                            <span class="text-muted" style="font-size: 12px; font-weight: 600;">Avanço anterior: <span id="ultimo-pta-avanco"></span>%</span>
                        </div>
                        <div id="ultimo-pta-texto" class="text-muted" style="font-size: 13px; font-style: italic; line-height: 1.6; white-space: pre-wrap; background: var(--bg-surface); padding: 10px; border-radius: var(--radius-sm);"></div>
                    </div>

                    <div class="input-group">
                        <label>Descrição das Atividades no Mês</label>
                        <textarea id="pta-descricao" class="form-control" rows="6" placeholder="Descreva os experimentos, resultados e atividades..." required></textarea>
                    </div>

                    <button type="submit" class="btn btn-primary btn-block">Enviar PTA</button>
                </form>
            </div>

            <div class="card-responsivo" style="align-self: start;">
                <h3 style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--border-light);">Planejamento Mensal     já enviado</h3>
                <p class="text-muted" style="font-size: 12px; margin-bottom: 15px;">Veja o que os outros membros já enviaram sobre este tópico no mês selecionado.</p>
                <div id="ptaunificado-equipe-lista" style="display: flex; flex-direction: column; gap: 15px; max-height: 600px; overflow-y: auto; padding-right: 5px;">
                    <p class="text-faint" style="font-size: 13px; text-align: center;">Selecione um tópico para verificar o Planejamento Mensal.</p>
                </div>
            </div>

            <div class="card-responsivo" style="align-self: start;">
                <h3 style="margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid var(--border-light);">Meus Últimos Envios</h3>
                <div id="meus-ptas-lista" style="display: flex; flex-direction: column; gap: 15px; max-height: 600px; overflow-y: auto; padding-right: 5px;">
                    <span class="spinner"></span> Buscando histórico...
                </div>
            </div>

        </div>

    `;

    carregarDropdownTopicos('pta-topico');
    carregarMeusPTAs();
    document.getElementById('form-pta').addEventListener('submit', window.prepararEnvioRelatorio);
}

window.atualizarAvisoUltimoPTA = function() {
    const topicoElement = document.getElementById('pta-topico');
    if (!topicoElement) return;

    const topicoId = topicoElement.value;
    const avisoContainer = document.getElementById('ultimo-pta-aviso');
    const inputAvanco = document.getElementById('pta-avanco');
    const spanAvanco = document.getElementById('valor-avanco');

    if (!topicoId || !window.meusPtasCache || window.meusPtasCache.length === 0) {
        if (avisoContainer) avisoContainer.classList.add('hidden');
        if (inputAvanco) inputAvanco.min = 0;
        return;
    }

    let ultimoRelato = null;

    if (window.ptaEditandoId) {
        const relEditando = window.meusPtasCache.find(r => r.id === window.ptaEditandoId);
        if (relEditando) {
            ultimoRelato = window.meusPtasCache.find(rel =>
                rel.topico_id == parseInt(topicoId) &&
                (rel.ano_referencia < relEditando.ano_referencia ||
                (rel.ano_referencia === relEditando.ano_referencia && rel.mes_referencia < relEditando.mes_referencia))
            );
        }
    } else {
        ultimoRelato = window.meusPtasCache.find(rel => rel.topico_id == parseInt(topicoId));
    }

    if (ultimoRelato) {
        avisoContainer.classList.remove('hidden');
        document.getElementById('ultimo-pta-mes').innerText = `${ultimoRelato.mes_referencia}/${ultimoRelato.ano_referencia}`;
        document.getElementById('ultimo-pta-texto').innerText = `"${ultimoRelato.descricao_atividades}"`;
        document.getElementById('ultimo-pta-avanco').innerText = ultimoRelato.percentual_avanco;

        inputAvanco.min = ultimoRelato.percentual_avanco;

        if (parseInt(inputAvanco.value) < ultimoRelato.percentual_avanco) {
            inputAvanco.value = ultimoRelato.percentual_avanco;
            spanAvanco.innerText = ultimoRelato.percentual_avanco + '%';
        }

    } else {
        avisoContainer.classList.add('hidden');
        inputAvanco.min = 0;
    }
};
async function carregarMeusPTAs() {
    const container = document.getElementById('meus-ptas-lista');
    try {
        const res = await window.api.fetchProtected('/pta/meus-relatorios');
        const relatorios = await res.json();

        if (relatorios.length === 0) {
            container.innerHTML = window.UI.emptyState({ icon: 'bar-chart', title: 'Nenhum relatório enviado ainda', description: 'Seu histórico de envios aparecerá aqui.' });
            return;
        }

        relatorios.sort((a, b) => b.ano_referencia - a.ano_referencia || b.mes_referencia - a.mes_referencia);

        window.meusPtasCache = relatorios;
        setTimeout(atualizarAvisoUltimoPTA, 200);

        let html = '';
        relatorios.forEach(rel => {
            let statusClass = 'badge';
            let statusText = 'Enviado';
            let borderVar = 'var(--text-faint)';

            if (rel.status === 'consolidado') {
                statusClass = 'badge-success';
                statusText = 'Aprovado';
                borderVar = 'var(--success)';
            } else if (rel.status === 'rascunho') {
                statusClass = 'badge-danger';
                statusText = 'Devolvido (Revisar)';
                borderVar = 'var(--danger)';
            }

            let nomeTopicoFormatado = `Tópico ID: ${rel.topico_id}`;
            const selectTopico = document.getElementById('pta-topico');
            if (selectTopico) {
                const opt = Array.from(selectTopico.options).find(o => o.value == rel.topico_id);
                if (opt) {
                    nomeTopicoFormatado = opt.text;
                }
            }

            let btnEditar = '';
            if (rel.status !== 'consolidado') {
                btnEditar = `<button type="button" class="btn btn-outline-primary btn-sm" style="margin-top:10px;" onclick="event.stopPropagation(); window.carregarParaEdicao(${rel.id})">Editar Planejamento</button>`;
            }

            html += `
                <div class="card" style="border-left: 3px solid ${borderVar}; padding: 15px; cursor: pointer;"
                     title="Dê um duplo clique para abrir os detalhes completos"
                     ondblclick="abrirModalDetalhesPTA(this)"
                     data-topico="${encodeURIComponent(nomeTopicoFormatado || 'Sem título')}"
                     data-mes="Mês ${rel.mes_referencia}/${rel.ano_referencia}"
                     data-avanco="${rel.percentual_avanco}%"
                     data-descricao="${encodeURIComponent(rel.descricao_atividades || 'Nenhuma descrição fornecida.')}">

                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <strong>Mês ${rel.mes_referencia}/${rel.ano_referencia}</strong>
                        <span class="badge ${statusClass}">${statusText}</span>
                    </div>

                    <div class="text-muted" style="font-size: 13px; margin-bottom: 8px; font-weight: 600;">
                        ${window.escapeHTML(nomeTopicoFormatado)}
                    </div>

                    <div style="width: 100%; background: var(--border-color); border-radius: 4px; height: 8px; margin-bottom: 10px;">
                        <div style="background: ${borderVar}; height: 100%; border-radius: 4px; width: ${rel.percentual_avanco}%;"></div>
                    </div>

                    <div class="text-muted" style="font-size: 13px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-style: italic;">
                        "${window.escapeHTML(rel.descricao_atividades || '')}"
                    </div>

                    ${btnEditar}
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = window.UI.errorState('Erro ao carregar histórico.');
    }
}
window.prepararEnvioRelatorio = function(e) {
    e.preventDefault();

    const topicoId = parseInt(document.getElementById('pta-topico').value);
    const avancoNovo = parseInt(document.getElementById('pta-avanco').value);
    if (!window.ptaEditandoId && window.meusPtasCache) {
        const ultimoRelato = window.meusPtasCache.find(rel => rel.topico_id === topicoId);

        if (ultimoRelato && ultimoRelato.percentual_avanco === avancoNovo) {
            document.getElementById('span-avanco-repetido').innerText = avancoNovo;
            document.getElementById('modal-confirmacao-avanco').style.display = 'flex';
            return;
        }
    }
    executarEnvioPTA();
};

window.fecharModalAvanco = function() {
    document.getElementById('modal-confirmacao-avanco').style.display = 'none';
};

window.confirmarEnvioAvancoRepetido = function() {
    fecharModalAvanco();
    executarEnvioPTA();
};

window.executarEnvioPTA = async function() {
    const payload = {
        topico_id: parseInt(document.getElementById('pta-topico').value),
        mes_referencia: parseInt(document.getElementById('pta-mes').value),
        ano_referencia: parseInt(document.getElementById('pta-ano').value),
        percentual_avanco: parseInt(document.getElementById('pta-avanco').value),
        descricao_atividades: document.getElementById('pta-descricao').value,
        status: "aguardando_aprovacao"
    };

    const btn = document.querySelector('#form-pta button[type="submit"]');
    const textoOriginal = btn.innerText;
    btn.innerHTML = '<span class="spinner"></span> Processando...';
    btn.disabled = true;

    try {
        let res;
        if (window.ptaEditandoId) {
            res = await window.api.fetchProtected(`/pta/relatorios/${window.ptaEditandoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            res = await window.api.fetchProtected('/pta/salvar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        if (res.ok) {
            window.UI.showToast(window.ptaEditandoId ? "PTA atualizado com sucesso!" : "PTA enviado com sucesso!", "success");

            if (window.ptaEditandoId) {
                window.cancelarEdicaoPTA();
            } else {
                document.getElementById('form-pta').reset();
                document.getElementById('valor-avanco').innerText = '50%';
            }
            carregarMeusPTAs();
        } else {
            const errData = await res.json();
            window.UI.showToast(errData.detail || "Erro ao salvar o PTA", "error");
        }
    } catch (err) {
        window.UI.showToast("Falha de conexão.", "error");
    } finally {
        btn.innerText = textoOriginal;
        btn.disabled = false;
    }
};
// ==========================================
// VISÃO DO ADMIN
// ==========================================
function renderPTACoordenador() {
    const main = document.getElementById('dynamic-content');
    const dataAtual = new Date();
    const anoAtual = dataAtual.getFullYear();

    main.innerHTML = `
        <div class="view-header">
            <h2>Gestão de PTA</h2>
            <p class="text-muted">Navegue pelo calendário para avaliar relatórios e gerar textos consolidados.</p>
        </div>

        <div class="grid-admin">

            <div class="card-responsivo">
                <h4 style="margin-bottom: 15px;">Novo Tópico de Pesquisa</h4>
                <form id="form-novo-topico">
                    <div class="input-group">
                        <label>Título do Tópico</label>
                        <input type="text" id="novo-topico-titulo" class="form-control" required>
                    </div>
                    <div class="input-group">
                        <label>Ano Vigente</label>
                        <input type="number" id="novo-topico-ano" class="form-control" value="${anoAtual}" required>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">Cadastrar Tópico</button>
                </form>
            </div>

            <div class="card-responsivo" style="border-top: 4px solid var(--success);">
                <h4 style="margin-bottom: 10px;">Importar Histórico (.xlsx)</h4>
                <p class="text-muted" style="font-size: 12px; margin-bottom: 15px;">Traga dados da planilha para cá.</p>
                <form id="form-importar-pta">
                    <div class="input-group">
                        <label>Ano de Referência</label>
                        <input type="number" id="import-pta-ano" class="form-control" value="${anoAtual}" required>
                    </div>
                    <div class="input-group">
                        <label>Arquivo Excel</label>
                        <input type="file" id="import-pta-arquivo" accept=".xlsx, .xls" class="form-control" required>
                    </div>
                    <button type="submit" class="btn btn-block" style="background:var(--success); color:white; border:none; font-weight:600;">Processar Planilha</button>
                </form>
            </div>

            <div class="card-responsivo" style="border-top: 4px solid var(--primary); grid-column: 1 / -1;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h4 style="color: var(--primary); margin: 0;">Navegação do Ano</h4>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <button class="icon-btn" onclick="mudarAnoCalendario(-1)">${window.Icon('chevron-left', { size: 16 })}</button>
                        <h3 id="calendario-ano-display" style="margin: 0; min-width: 60px; text-align: center;">${anoAtual}</h3>
                        <button class="icon-btn" onclick="mudarAnoCalendario(1)">${window.Icon('chevron-right', { size: 16 })}</button>
                    </div>
                </div>

                <div class="meses-grid" id="grid-meses"></div>
            </div>
        </div>

        <div id="painel-mes-detalhe" class="painel-detalhe hidden" style="margin-top: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; margin-bottom: 20px;">
                <h3 id="painel-titulo" style="margin: 0;">Gestão do Mês</h3>
                <button class="btn btn-sm btn-secondary" onclick="fecharPainelMes()">Fechar Painel</button>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
                <div>
                    <h4 class="text-muted" style="margin-bottom: 15px; font-size: 13px; text-transform: uppercase; letter-spacing:0.05em;">PTAs Pendentes</h4>
                    <div id="lista-pendencias" style="max-height: 400px; overflow-y: auto; padding-right: 5px;"></div>
                </div>

                <div class="pop-sec">
                    <h4 style="color: var(--primary); margin-bottom: 10px; font-size: 15px;">Gerar texto com base nos PTAs aprovados</h4>
                    <p class="text-muted" style="font-size: 13px; margin-bottom: 15px;">Unifica todos os PTAs <b>aprovados</b> do mês atual.</p>

                    <select id="ia-topico-id" class="form-control" style="margin-bottom: 15px;"></select>

                    <button id="btn-gerar-ia" class="btn btn-primary btn-block" onclick="gerarSinteseIA()">
                        ${window.Icon('sparkles', { size: 15 })} Processar PTAs Aprovados
                    </button>

                    <div id="resultado-ia" class="hidden" style="background: var(--bg-surface); border-left: 4px solid var(--primary); padding: 15px; margin-top: 15px; border-radius: var(--radius-sm); box-shadow: var(--shadow-xs);">
                        <strong class="text-primary" style="font-size: 14px;">Texto pronto:</strong>
                        <p id="texto-ia" style="margin-top: 10px; line-height: 1.6; font-size: 14px;"></p>
                    </div>
                </div>
            </div>

            <div style="border-top: 1px solid var(--border-color); padding-top: 25px;">
                <h4 style="margin-bottom: 15px; font-size: 13px; text-transform: uppercase; letter-spacing:0.05em;">PTAs Aprovados</h4>
                <div id="lista-aprovados" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
                </div>
            </div>
        </div>
    `;

    document.getElementById('form-novo-topico').addEventListener('submit', criarTopicoAction);
    document.getElementById('form-importar-pta').addEventListener('submit', importarMatrizPTAAction);

    window.estadoCalendario = { ano: anoAtual, mesSelecionado: null };
    renderizarMeses();
    carregarDropdownTopicos('ia-topico-id');
}

// ==========================================
// FUNÇÕES DO CALENDÁRIO
// ==========================================
window.mudarAnoCalendario = function(delta) {
    window.estadoCalendario.ano += delta;
    document.getElementById('calendario-ano-display').innerText = window.estadoCalendario.ano;
    fecharPainelMes();
    renderizarMeses();
}

function renderizarMeses() {
    const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const grid = document.getElementById('grid-meses');
    let html = '';

    nomesMeses.forEach((nome, index) => {
        const numMes = index + 1;
        const isActive = window.estadoCalendario.mesSelecionado === numMes ? 'active' : '';
        html += `<div class="mes-card ${isActive}" id="card-mes-${numMes}" onclick="selecionarMes(${numMes}, '${nome}')">${nome}</div>`;
    });
    grid.innerHTML = html;
}

window.selecionarMes = function(mes, nomeMes) {
    window.estadoCalendario.mesSelecionado = mes;
    document.querySelectorAll('.mes-card').forEach(el => el.classList.remove('active'));
    document.getElementById(`card-mes-${mes}`).classList.add('active');

    const painel = document.getElementById('painel-mes-detalhe');
    painel.classList.remove('hidden');
    document.getElementById('painel-titulo').innerText = `Gestão: ${nomeMes} / ${window.estadoCalendario.ano}`;
    document.getElementById('resultado-ia').classList.add('hidden');

    carregarPendenciasChefia(mes, window.estadoCalendario.ano);
    carregarAprovadosChefia(mes, window.estadoCalendario.ano);
}
window.fecharPainelMes = function() {
    document.getElementById('painel-mes-detalhe').classList.add('hidden');
    window.estadoCalendario.mesSelecionado = null;
    document.querySelectorAll('.mes-card').forEach(el => el.classList.remove('active'));
}

// ==========================================
// CARREGAR DADOS DO MÊS
// ==========================================
window.carregarPendenciasChefia = async function(mes, ano) {
    const container = document.getElementById('lista-pendencias');
    container.innerHTML = '<span class="spinner"></span> <span class="text-muted" style="font-size: 14px;">Buscando...</span>';

    try {
        const res = await window.api.fetchProtected(`/pta/chefia/pendentes?mes=${mes}&ano=${ano}`);
        const relatorios = await res.json();

        if (relatorios.length === 0) {
            container.innerHTML = window.UI.emptyState({ icon: 'check-circle', title: 'Tudo em dia', description: 'Nenhuma pendência para este mês.' });
            return;
        }

        let html = '';
        relatorios.forEach(rel => {
            let notasHtml = '';
            if (rel.notas && rel.notas.length > 0) {
                notasHtml = '<div style="margin-top: 10px; padding: 12px; background: var(--bg-subtle); border-radius: 4px; font-size: 12px; border-left: 3px solid var(--border-strong);">';
                notasHtml += '<strong class="text-muted" style="display: block; margin-bottom: 8px; text-transform: uppercase; font-size: 11px;">Histórico de Notas da Equipe:</strong>';
                rel.notas.forEach(nota => {
                    notasHtml += `<div style="margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px dashed var(--border-color);">
                                    <strong>${window.escapeHTML(nota.autor_nome)}:</strong>
                                    <span class="text-muted">${window.escapeHTML(nota.texto)}</span>
                                  </div>`;
                });
                notasHtml += '</div>';
            }

            html += `
                <div class="card mb-sm" id="card-relatorio-${rel.id}" style="border-left: 3px solid var(--border-strong); padding: 15px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span class="text-muted" style="font-size: 12px; font-weight: 600;">Usuário ID: ${rel.usuario_id}</span>
                        <span class="badge">Avanço: ${rel.percentual_avanco || 0}%</span>
                    </div>
                    <div style="background: var(--bg-subtle); padding: 12px; border-radius: 4px; margin-bottom: 12px; font-size: 13px; border: 1px solid var(--border-color);">
                        ${window.escapeHTML(rel.descricao_atividades || 'Sem descrição')}
                    </div>

                    ${notasHtml}

                    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 15px;">
                        <button class="btn btn-outline-danger btn-sm" onclick="window.abrirModalDevolucao(${rel.id})">Devolver</button>
                        <button class="btn btn-primary btn-sm" onclick="avaliarRelato(${rel.id}, true)">Aprovar Relatório</button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = window.UI.errorState('Erro ao carregar dados.');
    }
}

window.carregarAprovadosChefia = async function(mes, ano) {
    const container = document.getElementById('lista-aprovados');
    container.innerHTML = '<span class="spinner"></span> <span class="text-primary" style="font-size: 14px;">Buscando textos aprovados...</span>';

    try {
        const res = await window.api.fetchProtected(`/pta/chefia/aprovados?mes=${mes}&ano=${ano}`);
        if (!res.ok) throw new Error("Rota não encontrada");
        const aprovados = await res.json();

        if (aprovados.length === 0) {
            container.innerHTML = `<div style="grid-column:1/-1;">${window.UI.emptyState({ icon: 'file-text', title: 'Nenhum PTA aprovado ainda neste mês' })}</div>`;
            return;
        }
        const mapaRelatorios = new Map();

        aprovados.forEach(rel => {
            const chave = rel.descricao_atividades.trim();
            if (!mapaRelatorios.has(chave)) {
                mapaRelatorios.set(chave, rel);
            }

        });

        const aprovadosDeduplicados = Array.from(mapaRelatorios.values());

        let html = '';
        aprovadosDeduplicados.forEach(rel => {
            html += `
                <div class="card" style="border-left: 4px solid var(--primary); padding: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <strong class="text-primary" style="font-size: 14px;">${window.escapeHTML(rel.usuario_nome)}</strong>
                        <span class="badge">Avanço: ${rel.percentual_avanco}%</span>
                    </div>
                    <div class="text-muted" style="font-size: 12px; margin-bottom: 10px; font-weight: 600; text-transform: uppercase;">
                        Tópico: ${window.escapeHTML(rel.topico_titulo)}
                    </div>
                    <div style="font-size: 13px; line-height: 1.6; background: var(--bg-subtle); padding: 10px; border-radius: 4px;">
                     ${window.escapeHTML(rel.descricao_atividades)}
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = `<div style="grid-column:1/-1;">${window.UI.errorState('Não foi possível carregar os PTAs aprovados.')}</div>`;
    }
}

// ==========================================
// AÇÕES DO ADMIN
// ==========================================
window.avaliarRelato = async function(id, aprovado) {
    try {
        const res = await window.api.fetchProtected(`/pta/chefia/avaliar/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ aprovado: aprovado })
        });

        if (res.ok) {
            window.UI.showToast(aprovado ? "Relatório Aprovado!" : "Devolvido para o pesquisador.", "success");
            const card = document.getElementById(`card-relatorio-${id}`);
            if (card) card.style.display = 'none';

            if (aprovado) {
                carregarAprovadosChefia(window.estadoCalendario.mesSelecionado, window.estadoCalendario.ano);
            }
        }
    } catch (err) {
        window.UI.showToast("Falha ao avaliar.", "error");
    }
}

window.gerarSinteseIA = async function() {
    const topicoId = document.getElementById('ia-topico-id').value;
    const mes = window.estadoCalendario.mesSelecionado;
    const ano = window.estadoCalendario.ano;

    if (!topicoId) {
        window.UI.showToast("Selecione um tópico na lista acima primeiro.", "error"); return;
    }
    if (!mes) {
        window.UI.showToast("Erro: Nenhum mês selecionado.", "error"); return;
    }

    const btn = document.getElementById('btn-gerar-ia');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Processando...';
    btn.disabled = true;
    document.getElementById('resultado-ia').classList.add('hidden');

    try {
        const res = await window.api.fetchProtected(`/pta/chefia/sintetizar?topico_id=${topicoId}&mes=${mes}&ano=${ano}`, {
            method: 'POST'
        });
        const data = await res.json();

        if (res.ok) {
            document.getElementById('resultado-ia').classList.remove('hidden');
            document.getElementById('texto-ia').innerText = data.sintese;
            if (!data.sintese.includes('Não há Planejamento Mensal aprovado')) {
                 window.UI.showToast("Síntese gerada com sucesso!", "success");
            }
        } else {
            window.UI.showToast(data.detail || "Erro ao processar na IA.", "error");
        }
    } catch (err) {
        window.UI.showToast("Falha na comunicação com a Inteligência Artificial.", "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function criarTopicoAction(e) {
    e.preventDefault();
    const payload = {
        titulo: document.getElementById('novo-topico-titulo').value,
        ano: parseInt(document.getElementById('novo-topico-ano').value)
    };

    const btn = e.target.querySelector('button');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Cadastrando...';
    btn.disabled = true;

    try {
        const res = await window.api.fetchProtected('/pta/topicos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            window.UI.showToast("Tópico criado com sucesso!", "success");
            e.target.reset();
            carregarDropdownTopicos('ia-topico-id');
        } else {
            window.UI.showToast("Erro ao criar tópico.", "error");
        }
    } catch (err) {
        window.UI.showToast("Falha de conexão.", "error");
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}

// ==========================================
// IMPORTAÇÃO DE HISTÓRICO
// ==========================================
async function importarMatrizPTAAction(e) {
    e.preventDefault();

    const arquivoInput = document.getElementById('import-pta-arquivo');
    const anoInput = document.getElementById('import-pta-ano');
    const btn = e.target.querySelector('button');

    if (arquivoInput.files.length === 0) {
        window.UI.showToast("Selecione um arquivo Excel.", "error");
        return;
    }

    const arquivo = arquivoInput.files[0];
    const ano = anoInput.value;

    const formData = new FormData();
    formData.append('file', arquivo);
    formData.append('ano', ano);

    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Processando...';
    btn.disabled = true;

    try {
        const res = await window.api.fetchProtected('/pta/import-history', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();

        if (res.ok) {
            window.UI.showToast(data.mensagem || "Importação concluída!", "success");
            e.target.reset();
            carregarDropdownTopicos('ia-topico-id');
            if (window.estadoCalendario.mesSelecionado) {
                carregarAprovadosChefia(window.estadoCalendario.mesSelecionado, window.estadoCalendario.ano);
            }
        } else {
            window.UI.showToast(data.detail || "Erro ao processar planilha.", "error");
        }
    } catch (err) {
        window.UI.showToast("Falha na comunicação com o servidor.", "error");
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}

// ==========================================
// DETALHES DO PTA
// ==========================================
window.abrirModalDetalhesPTA = function(elemento) {
    const topico = decodeURIComponent(elemento.getAttribute('data-topico'));
    const mes = elemento.getAttribute('data-mes');
    const avanco = elemento.getAttribute('data-avanco');
    const descricao = decodeURIComponent(elemento.getAttribute('data-descricao'));

    document.getElementById('modal-detalhes-topico').innerText = topico;
    document.getElementById('modal-detalhes-mes').innerText = mes;
    document.getElementById('modal-detalhes-avanco').innerText = avanco;
    document.getElementById('modal-detalhes-descricao').innerText = descricao;
    document.getElementById('pta-detalhes-modal').style.display = 'flex';
};

window.fecharModalDetalhesPTA = function() {
    document.getElementById('pta-detalhes-modal').style.display = 'none';
};

window.addEventListener('click', function(e) {
    const modal = document.getElementById('pta-detalhes-modal');
    if (e.target === modal) {
        fecharModalDetalhesPTA();
    }
});

// ==========================================
// EDIÇÃO DE PTA PRÓPRIO
// ==========================================
window.carregarParaEdicao = function(id) {
    const rel = window.meusPtasCache.find(r => r.id === id);
    if(!rel) return;

    document.getElementById('pta-topico').value = rel.topico_id;
    document.getElementById('pta-mes').value = rel.mes_referencia;
    document.getElementById('pta-ano').value = rel.ano_referencia;

    window.ptaEditandoId = rel.id;

    window.atualizarAvisoUltimoPTA();

    document.getElementById('pta-avanco').value = rel.percentual_avanco;
    document.getElementById('valor-avanco').innerText = rel.percentual_avanco + '%';
    document.getElementById('pta-descricao').value = rel.descricao_atividades;

    const btnSubmit = document.querySelector('#form-pta button[type="submit"]');
    btnSubmit.innerText = "Atualizar Planejamento Mensal";

    if(!document.getElementById('btn-cancelar-edicao')) {
        const btnCancel = document.createElement('button');
        btnCancel.id = 'btn-cancelar-edicao';
        btnCancel.type = 'button';
        btnCancel.innerText = "Cancelar Edição";
        btnCancel.className = 'btn btn-outline-danger btn-block';
        btnCancel.style.marginTop = '10px';
        btnCancel.onclick = window.cancelarEdicaoPTA;
        btnSubmit.parentNode.insertBefore(btnCancel, btnSubmit.nextSibling);
    }

    window.UI.showToast("Planejamento carregado para edição.", "info");
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.cancelarEdicaoPTA = function() {
    window.ptaEditandoId = null;
    document.getElementById('form-pta').reset();
    document.getElementById('valor-avanco').innerText = '50%';

    const btnSubmit = document.querySelector('#form-pta button[type="submit"]');
    btnSubmit.innerText = "Enviar Planejamento Mensal";

    const btnCancel = document.getElementById('btn-cancelar-edicao');
    if(btnCancel) btnCancel.remove();

    window.atualizarAvisoUltimoPTA();
}

// ==========================================
// PTA UNIFICADO DA EQUIPE E NOTAS
// ==========================================
window.carregarPTAUnificadoEquipe = async function() {
    const topicoId = document.getElementById('pta-topico').value;
    const mes = document.getElementById('pta-mes').value;
    const ano = document.getElementById('pta-ano').value;
    const container = document.getElementById('ptaunificado-equipe-lista');

    if (!topicoId || !mes || !ano) return;

    container.innerHTML = '<span class="spinner"></span> Buscando dados da equipe...';

    try {
        const res = await window.api.fetchProtected(`/pta/equipe/ptaunificado?topico_id=${topicoId}&mes=${mes}&ano=${ano}`);
        if (!res.ok) throw new Error("Falha na API.");
        const relatorios = await res.json();
        const relatoriosExibir = relatorios;

        if (relatoriosExibir.length === 0) {
            container.innerHTML = window.UI.emptyState({ icon: 'users', title: 'Você é o primeiro', description: 'Nenhum colega submeteu informações sobre este tópico neste mês ainda.' });
            return;
        }

        let html = '';

        relatoriosExibir.forEach(rel => {
            let notasHtml = '';
            if (rel.notas && rel.notas.length > 0) {
                notasHtml = '<div style="margin-top: 15px; border-top: 1px dashed var(--border-strong); padding-top: 10px;">';
                rel.notas.forEach(nota => {
                    const btnApagar = nota.is_mine ? `<button onclick="window.deletarNotaPTA(${nota.id})" class="text-danger" style="background: none; border: none; font-size: 11px; cursor: pointer; float: right;">Apagar</button>` : '';

                    const autorSeguro = window.escapeHTML(nota.autor_nome || 'Desconhecido');
                    const textoSeguro = window.escapeHTML(nota.texto || '');

                    notasHtml += `
                        <div style="background: var(--bg-surface); padding: 8px; border-radius: 4px; border: 1px solid var(--border-color); margin-bottom: 5px; font-size: 12px; clear: both; overflow: hidden;">
                            <strong>${autorSeguro}:</strong>
                            <span class="text-muted">${textoSeguro}</span>
                            ${btnApagar}
                        </div>
                    `;
                });
                notasHtml += '</div>';
            }

            let corBorda = rel.is_mine ? "var(--primary)" : "var(--success)";
            let tagMeu = rel.is_mine ? '<span class="badge" style="background: var(--primary-light); color: var(--primary); margin-left: 5px;">MEU ENVIO</span>' : '';

            const usuarioSeguro = window.escapeHTML(rel.usuario_nome || 'Desconhecido');
            const descricaoSegura = window.escapeHTML(rel.descricao || 'Nenhuma descrição fornecida.');

            html += `
                <div style="border: 1px solid var(--border-color); border-left: 4px solid ${corBorda}; border-radius: 6px; padding: 15px; background: var(--bg-subtle); margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <strong style="font-size: 14px;">${usuarioSeguro} ${tagMeu}</strong>
                        <span class="badge badge-success">Avanço: ${rel.percentual_avanco || 0}%</span>
                    </div>
                    <div style="font-size: 13px; line-height: 1.5; font-style: italic; margin-bottom: 10px;">
                        "${descricaoSegura}"
                    </div>

                    ${notasHtml}

                    <div style="display: flex; gap: 8px; margin-top: 10px;">
                        <input type="text" id="input-nota-${rel.id}" class="form-control" placeholder="Adicione algo..." style="padding: 6px 10px; font-size: 12px;">
                        <button onclick="window.adicionarNotaPTA(${rel.id})" class="btn btn-secondary btn-sm">+ Nota</button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (err) {
        console.error("Erro interno do JS:", err);
        container.innerHTML = window.UI.errorState('Erro ao carregar o Planejamento Mensal.');
    }
};

window.adicionarNotaPTA = async function(relatorioId) {
    const input = document.getElementById(`input-nota-${relatorioId}`);
    const texto = input.value.trim();
    if (!texto) return;

    input.disabled = true;
    try {
        const res = await window.api.fetchProtected(`/pta/relatorios/${relatorioId}/notas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texto: texto })
        });
        if (res.ok) {
            window.UI.showToast("Nota adicionada!", "success");
            window.carregarPTAUnificadoEquipe();
        } else {
            window.UI.showToast("Erro ao adicionar nota.", "error");
        }
    } catch (err) {
        window.UI.showToast("Falha de conexão.", "error");
    } finally {
        input.disabled = false;
        input.value = '';
    }
};

window.deletarNotaPTA = async function(notaId) {
    const ok = await window.UI.confirm("Esta nota será apagada permanentemente.", { title: 'Apagar nota?', danger: true, confirmText: 'Apagar' });
    if (!ok) return;

    try {
        const res = await window.api.fetchProtected(`/pta/notas/${notaId}`, {
            method: 'DELETE'
        });
        if (res.ok) {
            window.UI.showToast("Nota apagada.", "success");
            window.carregarPTAUnificadoEquipe();
        }
    } catch (err) {
        window.UI.showToast("Falha de conexão.", "error");
    }
};

// ==========================================
// DEVOLUÇÃO PTA
// ==========================================
window.abrirModalDevolucao = function(relatorioId) {
    window.relatorioParaDevolver = relatorioId;

    let modal = document.getElementById('modal-devolucao');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-devolucao';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header">
                    <h3>Motivo da Devolução</h3>
                </div>
                <p class="text-muted" style="font-size: 13px; margin-bottom: 15px;">Este feedback será anexado ao Planejamento Mensal do pesquisador como uma orientação para correção.</p>

                <textarea id="texto-motivo-devolucao" class="form-control" rows="4" placeholder="Ex: Faltou detalhar a curva de temperatura no experimento 2..."></textarea>

                <div class="modal-footer">
                    <button onclick="window.fecharModalDevolucao()" class="btn btn-secondary">Cancelar</button>
                    <button onclick="window.confirmarDevolucao()" class="btn btn-danger">Confirmar Devolução</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) window.fecharModalDevolucao(); });
    }
    document.getElementById('texto-motivo-devolucao').value = '';
    modal.style.display = 'flex';
};

window.fecharModalDevolucao = function() {
    const modal = document.getElementById('modal-devolucao');
    if (modal) modal.style.display = 'none';
    window.relatorioParaDevolver = null;
};

window.confirmarDevolucao = async function() {
    const relatorioId = window.relatorioParaDevolver;
    const motivo = document.getElementById('texto-motivo-devolucao').value.trim();

    if (!motivo) {
        window.UI.showToast("Por favor, escreva um motivo para a devolução.", "error");
        return;
    }
    try {
        await window.api.fetchProtected(`/pta/relatorios/${relatorioId}/notas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texto: `[AVALIAÇÃO DA CHEFIA]: ${motivo}` })
        });
        window.fecharModalDevolucao();
        window.avaliarRelato(relatorioId, false);

    } catch (err) {
        window.UI.showToast("Falha ao processar o feedback de devolução.", "error");
    }
};
