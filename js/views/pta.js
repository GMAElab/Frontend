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
        <header class="page-head fade-in">
            <div>
                <p class="eyebrow">relato mensal</p>
                <h1>Planejamento mensal</h1>
                <p class="lede">Registre o avanço do mês em cada tópico de pesquisa e veja o que a equipe já enviou.</p>
            </div>
        </header>

        <div class="columns fade-in">
            <section>
                <div class="section-head"><h3>Novo relato</h3></div>
                <form id="form-pta">
                    <div class="input-group">
                        <label for="pta-topico">Tópico de pesquisa</label>
                        <select id="pta-topico" required onchange="localStorage.setItem('pta_ultimo_topico', this.value); window.atualizarAvisoUltimoPTA(); window.carregarPTAUnificadoEquipe()"></select>
                    </div>

                    <div class="field-grid">
                        <div class="input-group">
                            <label for="pta-mes">Mês</label>
                            <input type="number" id="pta-mes" class="mono" value="${dataAtual.getMonth() + 1}" min="1" max="12" required onchange="window.carregarPTAUnificadoEquipe()">
                        </div>
                        <div class="input-group">
                            <label for="pta-ano">Ano</label>
                            <input type="number" id="pta-ano" class="mono" value="${dataAtual.getFullYear()}" required onchange="window.carregarPTAUnificadoEquipe()">
                        </div>
                    </div>

                    <div class="input-group">
                        <label for="pta-avanco" class="label-row">
                            <span>Avanço geral da pesquisa</span>
                            <span id="valor-avanco" class="mono">50%</span>
                        </label>
                        <input type="range" id="pta-avanco" min="0" max="100" value="50"
                               oninput="document.getElementById('valor-avanco').innerText = this.value + '%'">
                    </div>

                    <div id="ultimo-pta-aviso" class="note hidden">
                        <p class="mono">último relato · <span id="ultimo-pta-mes"></span> · avanço <span id="ultimo-pta-avanco"></span>%</p>
                        <p id="ultimo-pta-texto" class="pre-wrap"></p>
                    </div>

                    <div class="input-group">
                        <label for="pta-descricao">Atividades do mês</label>
                        <textarea id="pta-descricao" rows="7" placeholder="Experimentos realizados, resultados obtidos, próximos passos" required></textarea>
                    </div>

                    <button type="submit" class="btn btn-primary btn-block">Enviar planejamento</button>
                </form>
            </section>

            <div class="stack-lg">
                <section>
                    <div class="section-head">
                        <h3>Equipe neste tópico</h3>
                        <p class="meta">mês selecionado</p>
                    </div>
                    <div id="ptaunificado-equipe-lista" class="entries scroll-pane">
                        <div class="empty-state"><p>Escolha um tópico para ver o que já foi enviado.</p></div>
                    </div>
                </section>

                <section>
                    <div class="section-head"><h3>Meus envios</h3></div>
                    <div id="meus-ptas-lista" class="entries scroll-pane">${window.UI.loading('Buscando histórico')}</div>
                </section>
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
        document.getElementById('ultimo-pta-texto').innerText = ultimoRelato.descricao_atividades;
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
            container.innerHTML = window.UI.emptyState({ title: 'Nenhum relato enviado', description: 'Seu histórico aparece aqui depois do primeiro envio.' });
            return;
        }

        relatorios.sort((a, b) => b.ano_referencia - a.ano_referencia || b.mes_referencia - a.mes_referencia);

        window.meusPtasCache = relatorios;
        setTimeout(atualizarAvisoUltimoPTA, 200);

        let html = '';
        relatorios.forEach(rel => {
            let statusClass = '';
            let statusText = 'enviado';
            let meterClass = '';

            if (rel.status === 'consolidado') {
                statusClass = 'badge-success';
                statusText = 'aprovado';
                meterClass = 'ok';
            } else if (rel.status === 'rascunho') {
                statusClass = 'badge-danger';
                statusText = 'devolvido para revisão';
                meterClass = 'bad';
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
                btnEditar = `<button type="button" class="link-btn" onclick="window.carregarParaEdicao(${rel.id})">Editar</button>`;
            }

            html += `
                <article class="entry"
                     data-topico="${encodeURIComponent(nomeTopicoFormatado || 'Sem título')}"
                     data-mes="${String(rel.mes_referencia).padStart(2, '0')}/${rel.ano_referencia}"
                     data-avanco="${rel.percentual_avanco}%"
                     data-descricao="${encodeURIComponent(rel.descricao_atividades || 'Nenhuma descrição fornecida.')}">

                    <div class="entry-head">
                        <h4 class="entry-title">${window.escapeHTML(nomeTopicoFormatado)}</h4>
                        <span class="badge ${statusClass}">${statusText}</span>
                    </div>
                    <p class="meta">${String(rel.mes_referencia).padStart(2, '0')}/${rel.ano_referencia}</p>

                    <div class="meter">
                        <div class="meter-track"><div class="meter-fill ${meterClass}" style="width:${rel.percentual_avanco}%"></div></div>
                        <span class="meter-value">${rel.percentual_avanco}%</span>
                    </div>

                    <p class="entry-body clamp">${window.escapeHTML(rel.descricao_atividades || '')}</p>

                    <div class="entry-foot">
                        <button type="button" class="link-btn muted" onclick="abrirModalDetalhesPTA(this.closest('.entry'))">Ler completo</button>
                        ${btnEditar}
                    </div>
                </article>
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
        <header class="page-head fade-in">
            <div>
                <p class="eyebrow">coordenação</p>
                <h1>Planejamento mensal</h1>
                <p class="lede">Escolha um mês para avaliar os relatos enviados e gerar o texto consolidado.</p>
            </div>
            <div class="year-nav">
                <button class="icon-btn" onclick="mudarAnoCalendario(-1)" aria-label="Ano anterior">${window.Icon('chevron-left', { size: 16 })}</button>
                <span id="calendario-ano-display" class="mono">${anoAtual}</span>
                <button class="icon-btn" onclick="mudarAnoCalendario(1)" aria-label="Próximo ano">${window.Icon('chevron-right', { size: 16 })}</button>
            </div>
        </header>

        <div class="meses-grid fade-in" id="grid-meses"></div>

        <div id="painel-mes-detalhe" class="month-panel hidden">
            <div class="section-head">
                <h3 id="painel-titulo">Mês</h3>
                <button class="link-btn muted" onclick="fecharPainelMes()">Fechar mês</button>
            </div>

            <div class="columns">
                <section>
                    <div class="section-head"><h3>Aguardando avaliação</h3></div>
                    <div id="lista-pendencias" class="entries scroll-pane"></div>
                </section>

                <section>
                    <div class="section-head"><h3>Texto consolidado</h3></div>
                    <p class="text-muted text-small mb-md">Reúne em um único texto os relatos <strong>aprovados</strong> do tópico neste mês.</p>

                    <div class="input-group">
                        <label for="ia-topico-id">Tópico</label>
                        <select id="ia-topico-id"></select>
                    </div>

                    <button id="btn-gerar-ia" class="btn btn-secondary" onclick="gerarSinteseIA()">Gerar texto</button>

                    <div id="resultado-ia" class="note accent mt-md hidden">
                        <p class="mono">gerado por IA · revise antes de usar</p>
                        <p id="texto-ia" class="pre-wrap"></p>
                    </div>
                </section>
            </div>

            <section class="mt-md">
                <div class="section-head"><h3>Aprovados</h3></div>
                <div id="lista-aprovados" class="entries"></div>
            </section>
        </div>

        <div class="columns setup-forms fade-in">
            <section>
                <div class="section-head"><h3>Novo tópico de pesquisa</h3></div>
                <form id="form-novo-topico">
                    <div class="input-group">
                        <label for="novo-topico-titulo">Título</label>
                        <input type="text" id="novo-topico-titulo" required>
                    </div>
                    <div class="input-group">
                        <label for="novo-topico-ano">Ano vigente</label>
                        <input type="number" id="novo-topico-ano" class="mono" value="${anoAtual}" required>
                    </div>
                    <button type="submit" class="btn btn-secondary">Cadastrar tópico</button>
                </form>
            </section>

            <section>
                <div class="section-head"><h3>Importar histórico</h3></div>
                <form id="form-importar-pta">
                    <div class="input-group">
                        <label for="import-pta-ano">Ano de referência</label>
                        <input type="number" id="import-pta-ano" class="mono" value="${anoAtual}" required>
                    </div>
                    <div class="input-group">
                        <label for="import-pta-arquivo">Planilha (.xlsx)</label>
                        <input type="file" id="import-pta-arquivo" accept=".xlsx, .xls" required>
                    </div>
                    <button type="submit" class="btn btn-secondary">Importar planilha</button>
                </form>
            </section>
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
    const mesExtenso = new Date(window.estadoCalendario.ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });
    document.getElementById('painel-titulo').innerText = `${mesExtenso.charAt(0).toUpperCase() + mesExtenso.slice(1)} de ${window.estadoCalendario.ano}`;
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
    container.innerHTML = window.UI.loading();

    try {
        const res = await window.api.fetchProtected(`/pta/chefia/pendentes?mes=${mes}&ano=${ano}`);
        const relatorios = await res.json();

        if (relatorios.length === 0) {
            container.innerHTML = window.UI.emptyState({ title: 'Nada aguardando avaliação', description: 'Nenhum relato pendente neste mês.' });
            return;
        }

        let html = '';
        relatorios.forEach(rel => {
            let notasHtml = '';
            if (rel.notas && rel.notas.length > 0) {
                notasHtml = '<div class="thread"><p class="thread-label">notas da equipe</p>';
                rel.notas.forEach(nota => {
                    notasHtml += `<div class="thread-item"><p><strong>${window.escapeHTML(nota.autor_nome)}</strong> ${window.escapeHTML(nota.texto)}</p></div>`;
                });
                notasHtml += '</div>';
            }

            html += `
                <article class="entry" id="card-relatorio-${rel.id}">
                    <div class="entry-head">
                        <h4 class="entry-title">${window.escapeHTML(rel.usuario_nome || `Usuário #${rel.usuario_id}`)}</h4>
                        <span class="mono">${rel.percentual_avanco || 0}%</span>
                    </div>
                    <p class="entry-body pre-wrap">${window.escapeHTML(rel.descricao_atividades || 'Sem descrição')}</p>

                    ${notasHtml}

                    <div class="entry-foot">
                        <button class="btn btn-primary btn-sm" onclick="avaliarRelato(${rel.id}, true)">Aprovar</button>
                        <button class="link-btn danger" onclick="window.abrirModalDevolucao(${rel.id})">Devolver com observação</button>
                    </div>
                </article>
            `;
        });
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = window.UI.errorState('Erro ao carregar dados.');
    }
}

window.carregarAprovadosChefia = async function(mes, ano) {
    const container = document.getElementById('lista-aprovados');
    container.innerHTML = window.UI.loading();

    try {
        const res = await window.api.fetchProtected(`/pta/chefia/aprovados?mes=${mes}&ano=${ano}`);
        if (!res.ok) throw new Error("Rota não encontrada");
        const aprovados = await res.json();

        if (aprovados.length === 0) {
            container.innerHTML = window.UI.emptyState({ title: 'Nenhum relato aprovado neste mês' });
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
                <article class="entry">
                    <div class="entry-head">
                        <h4 class="entry-title">${window.escapeHTML(rel.usuario_nome)}</h4>
                        <span class="mono">${rel.percentual_avanco}%</span>
                    </div>
                    <p class="meta">${window.escapeHTML(rel.topico_titulo)}</p>
                    <p class="entry-body pre-wrap">${window.escapeHTML(rel.descricao_atividades)}</p>
                </article>
            `;
        });
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = window.UI.errorState('Não foi possível carregar os relatos aprovados.');
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
        btnCancel.className = 'btn btn-secondary btn-block mt-sm';
        btnCancel.onclick = window.cancelarEdicaoPTA;
        btnSubmit.parentNode.insertBefore(btnCancel, btnSubmit.nextSibling);
    }

    window.UI.showToast("Planejamento carregado para edição.", "info");
    document.getElementById('dynamic-content').scrollTo({ top: 0, behavior: 'smooth' });
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

    container.innerHTML = window.UI.loading('Buscando relatos da equipe');

    try {
        const res = await window.api.fetchProtected(`/pta/equipe/ptaunificado?topico_id=${topicoId}&mes=${mes}&ano=${ano}`);
        if (!res.ok) throw new Error("Falha na API.");
        const relatorios = await res.json();
        const relatoriosExibir = relatorios;

        if (relatoriosExibir.length === 0) {
            container.innerHTML = window.UI.emptyState({ title: 'Ninguém enviou ainda', description: 'Nenhum relato deste tópico no mês selecionado.' });
            return;
        }

        let html = '';

        relatoriosExibir.forEach(rel => {
            let notasHtml = '';
            if (rel.notas && rel.notas.length > 0) {
                notasHtml = '<div class="thread">';
                rel.notas.forEach(nota => {
                    const btnApagar = nota.is_mine ? `<button onclick="window.deletarNotaPTA(${nota.id})" class="link-btn danger text-xs">apagar</button>` : '';

                    const autorSeguro = window.escapeHTML(nota.autor_nome || 'Desconhecido');
                    const textoSeguro = window.escapeHTML(nota.texto || '');

                    notasHtml += `
                        <div class="thread-item">
                            <p><strong>${autorSeguro}</strong> ${textoSeguro}</p>
                            ${btnApagar}
                        </div>
                    `;
                });
                notasHtml += '</div>';
            }

            const usuarioSeguro = window.escapeHTML(rel.usuario_nome || 'Desconhecido');
            const descricaoSegura = window.escapeHTML(rel.descricao || 'Nenhuma descrição fornecida.');

            html += `
                <article class="entry${rel.is_mine ? ' is-mine' : ''}">
                    <div class="entry-head">
                        <h4 class="entry-title">${usuarioSeguro}</h4>
                        <span class="mono">${rel.percentual_avanco || 0}%</span>
                    </div>
                    <p class="entry-body pre-wrap">${descricaoSegura}</p>

                    ${notasHtml}

                    <div class="inline-form mt-sm">
                        <input type="text" id="input-nota-${rel.id}" class="form-control" placeholder="Adicionar uma nota" onkeydown="if(event.key === 'Enter') { event.preventDefault(); window.adicionarNotaPTA(${rel.id}); }">
                        <button onclick="window.adicionarNotaPTA(${rel.id})" class="btn btn-secondary btn-sm">Anotar</button>
                    </div>
                </article>
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
            <div class="modal-content modal-sm">
                <div class="modal-header"><h3>Devolver para revisão</h3></div>
                <p class="dialog-text mb-md">A observação fica anexada ao relato para orientar a correção.</p>

                <label for="texto-motivo-devolucao">O que precisa ser ajustado</label>
                <textarea id="texto-motivo-devolucao" rows="4" placeholder="Ex.: faltou detalhar a curva de temperatura do experimento 2"></textarea>

                <div class="modal-footer">
                    <button onclick="window.fecharModalDevolucao()" class="btn btn-secondary">Cancelar</button>
                    <button onclick="window.confirmarDevolucao()" class="btn btn-danger">Devolver</button>
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
