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
async function buscarTopicosPTA() {
    const res = await window.api.fetchProtected('/pta/topicos');
    const topicos = await res.json();
    window.topicosPtaCache = Array.isArray(topicos) ? topicos : [];
    return window.topicosPtaCache;
}

function resolverNomeTopicoPTA(rel) {
    if (rel && rel.topico_titulo) {
        return rel.topico_ano ? `${rel.topico_titulo} (${rel.topico_ano})` : rel.topico_titulo;
    }
    const topicoId = rel ? rel.topico_id : null;
    if (topicoId !== null && topicoId !== undefined) {
        const topicoCache = (window.topicosPtaCache || []).find(t => t.id == topicoId);
        if (topicoCache && topicoCache.titulo) {
            return topicoCache.ano ? `${topicoCache.titulo} (${topicoCache.ano})` : topicoCache.titulo;
        }
        const selectTopico = document.getElementById('pta-topico') || document.getElementById('ia-topico-id');
        if (selectTopico) {
            const opt = Array.from(selectTopico.options).find(o => o.value == topicoId);
            if (opt && opt.value) {
                return opt.text;
            }
        }
    }
    return 'Tópico não identificado';
}

function obterDadosConclusaoTopico(topicoId) {
    if (!topicoId || !Array.isArray(window.meusPtasCache)) return { concluido: false, meses: [] };
    const idNum = parseInt(topicoId, 10);
    const consolidados = window.meusPtasCache
        .filter(r => r.topico_id == idNum && r.status === 'consolidado')
        .sort((a, b) => (a.ano_referencia - b.ano_referencia) || (a.mes_referencia - b.mes_referencia));

    const atingiu100 = consolidados.some(r => (r.percentual_avanco || 0) >= 100);
    if (!atingiu100 || consolidados.length === 0) {
        return { concluido: false, meses: consolidados };
    }

    const primeiro = consolidados[0];
    const ultimo = consolidados.find(r => (r.percentual_avanco || 0) >= 100) || consolidados[consolidados.length - 1];
    const spanMeses = Math.max(1, ((ultimo.ano_referencia - primeiro.ano_referencia) * 12) + (ultimo.mes_referencia - primeiro.mes_referencia) + 1);

    return {
        concluido: true,
        meses: consolidados,
        primeiro,
        ultimo,
        qtdRegistros: consolidados.length,
        duracaoMeses: spanMeses
    };
}

function formatarPrazoTopicoPTA(topico) {
    if (!topico || !topico.mes_fim) return `${topico?.ano || ''}`;
    const ini = String(topico.mes_inicio || 1).padStart(2, '0');
    const fim = String(topico.mes_fim).padStart(2, '0');
    const anoCurto = String(topico.ano || '').slice(-2);
    return `${ini}/${anoCurto} → ${fim}/${anoCurto}`;
}

window.atualizarIndicacaoTopicosConcluidos = function() {
    const select = document.getElementById('pta-topico');
    if (!select || !Array.isArray(window.topicosPtaCache) || window.topicosPtaCache.length === 0) return;

    const valorAtual = select.value || localStorage.getItem('pta_ultimo_topico') || '';
    let html = '<option value="">Selecione um tópico...</option>';
    window.topicosPtaCache.forEach(t => {
        const info = obterDadosConclusaoTopico(t.id);
        const prazoStr = formatarPrazoTopicoPTA(t);
        const tituloBase = `${t.titulo} (${prazoStr})`;
        const label = info.concluido ? `✓ [Concluído 100%] ${tituloBase}` : tituloBase;
        html += `<option value="${t.id}" data-titulo="${window.escapeHTML(tituloBase)}">${window.escapeHTML(label)}</option>`;
    });
    select.innerHTML = html;
    if (valorAtual && select.querySelector(`option[value="${valorAtual}"]`)) {
        select.value = valorAtual;
    }
};

window.abrirModalTopicoConcluido = function(topicoId) {
    const id = topicoId || document.getElementById('pta-topico')?.value;
    if (!id) return;
    const info = obterDadosConclusaoTopico(id);
    if (!info.concluido) return;

    const topicoObj = (window.topicosPtaCache || []).find(t => t.id == id);
    const nomeTopico = topicoObj ? `${topicoObj.titulo} (${topicoObj.ano})` : resolverNomeTopicoPTA(info.ultimo);

    const fmtMesAno = (r) => `${String(r.mes_referencia).padStart(2, '0')}/${r.ano_referencia}`;
    const fmtMesExtenso = (r) => {
        const m = MESES_DO_ANO[(r.mes_referencia || 1) - 1] || String(r.mes_referencia).padStart(2, '0');
        return `${m[0].toUpperCase() + m.slice(1)} de ${r.ano_referencia}`;
    };

    const periodoTexto = info.primeiro.mes_referencia === info.ultimo.mes_referencia && info.primeiro.ano_referencia === info.ultimo.ano_referencia
        ? fmtMesAno(info.ultimo)
        : `${fmtMesAno(info.primeiro)} a ${fmtMesAno(info.ultimo)}`;

    const tempoTexto = info.duracaoMeses === 1 ? '1 mês' : `${info.duracaoMeses} meses`;
    const relatosTexto = info.qtdRegistros === 1 ? '1 mês consolidado' : `${info.qtdRegistros} meses consolidados`;

    const listaMesesHtml = info.meses.map(rel => `
        <article class="entry">
            <div class="entry-head">
                <h4 class="entry-title">${window.escapeHTML(fmtMesExtenso(rel))} (${fmtMesAno(rel)})</h4>
                <span class="mono">${rel.percentual_avanco || 0}%</span>
            </div>
            <div class="meter">
                <div class="meter-track"><div class="meter-fill ok" style="width:${rel.percentual_avanco || 0}%"></div></div>
                <span class="meter-value">${rel.percentual_avanco || 0}%</span>
            </div>
            <p class="entry-body pre-wrap">${window.escapeHTML(rel.descricao_atividades || 'Sem descrição.')}</p>
        </article>
    `).join('');

    const modalId = 'modal-topico-concluido';
    document.getElementById(modalId)?.remove();

    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content modal-lg">
            <div class="modal-header">
                <div>
                    <p class="eyebrow">tópico concluído · 100% de avanço</p>
                    <h3>${window.escapeHTML(nomeTopico)}</h3>
                </div>
                <button type="button" class="modal-close" onclick="document.getElementById('${modalId}')?.remove()" aria-label="Fechar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>
                </button>
            </div>

            <div class="note" style="margin-bottom:var(--space-4);">
                <p style="margin:0;"><strong>Este tópico já foi finalizado (100%).</strong> Não é necessário preencher novos planejamentos mensais para ele. Confira abaixo o resumo do tempo gasto e o histórico de todos os meses realizados.</p>
            </div>

            <div class="figures" style="margin-bottom:var(--space-4);">
                <div class="figure">
                    <span class="v">100%</span>
                    <span class="k">status concluído</span>
                </div>
                <div class="figure">
                    <span class="v">${window.escapeHTML(tempoTexto)}</span>
                    <span class="k">duração (${window.escapeHTML(periodoTexto)})</span>
                </div>
                <div class="figure">
                    <span class="v">${info.qtdRegistros}</span>
                    <span class="k">${window.escapeHTML(relatosTexto)}</span>
                </div>
            </div>

            <div class="section-head">
                <h3>Meses realizados neste tópico</h3>
            </div>
            <div class="entries scroll-pane" style="max-height:360px;">
                ${listaMesesHtml}
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-primary" onclick="document.getElementById('${modalId}')?.remove()">Entendi</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
};

async function carregarDropdownTopicos(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">Carregando tópicos...</option>';

    try {
        window.topicosPtaPromise = buscarTopicosPTA();
        const topicos = await window.topicosPtaPromise;

        if (topicos.length === 0) {
            select.innerHTML = '<option value="">Nenhum tópico encontrado</option>';
            return;
        }

        let html = '<option value="">Selecione um tópico...</option>';
        topicos.forEach(t => {
            html += `<option value="${t.id}" data-titulo="${window.escapeHTML(t.titulo)} (${t.ano})">${window.escapeHTML(t.titulo)} (${t.ano})</option>`;
        });
        select.innerHTML = html;

        if (selectId === 'pta-topico') {
            window.atualizarIndicacaoTopicosConcluidos();
            const ultimoTopico = localStorage.getItem('pta_ultimo_topico');
            if (ultimoTopico && select.querySelector(`option[value="${ultimoTopico}"]`)) {
                select.value = ultimoTopico;
                window.carregarPTAUnificadoEquipe();
            }
        }

        setTimeout(() => window.atualizarAvisoUltimoPTA(false), 300);

    } catch (err) {
        select.innerHTML = '<option value="">Erro ao carregar tópicos</option>';
    }
}

// ==========================================
// VISÃO DO PESQUISADOR
// ==========================================
window.renderPTAPesquisador = renderPTAPesquisador;
window.renderPTACoordenador = renderPTACoordenador;

function renderPTAPesquisador() {
    const main = document.getElementById('dynamic-content');
    const dataAtual = new Date();
    const user = JSON.parse(localStorage.getItem('user_data') || '{}');
    const isGestor = user.role === 'coordenador' || user.role === 'admin';

    main.innerHTML = `
        <header class="page-head fade-in">
            <div>
                <p class="eyebrow">PTA mensal</p>
                <h1>Planejamento mensal</h1>
                <p class="lede">Registre o avanço do mês em cada tópico de pesquisa e acompanhe o histórico consolidado.</p>
            </div>
            ${isGestor ? `<button type="button" class="btn btn-secondary btn-sm" onclick="window.renderPTACoordenador()">Painel da coordenação</button>` : ''}
        </header>

        <div class="columns fade-in">
            <section>
                <div class="section-head"><h3>Novo PTA</h3></div>
                <form id="form-pta">
                    <div class="input-group">
                        <label for="pta-topico">Tópico de pesquisa</label>
                        <select id="pta-topico" required onchange="localStorage.setItem('pta_ultimo_topico', this.value); window.atualizarAvisoUltimoPTA(true); window.carregarPTAUnificadoEquipe(); window.renderizarListaMeusPTAs && window.renderizarListaMeusPTAs()"></select>
                    </div>

                    <div id="aviso-topico-concluido" class="note hidden" style="margin-bottom:var(--space-4);">
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
                            <p style="margin:0;"><strong>Tópico já concluído (100%).</strong> Este tópico foi finalizado e não recebe novos envios.</p>
                            <button type="button" class="btn btn-secondary btn-sm" onclick="window.abrirModalTopicoConcluido()">Ver resumo e meses realizados</button>
                        </div>
                    </div>

                    <div class="field-grid">
                        <div class="input-group">
                            <label for="pta-mes">Mês</label>
                            <select id="pta-mes" required onchange="window.atualizarAvisoUltimoPTA(); window.carregarPTAUnificadoEquipe()">
                                ${MESES_DO_ANO.map((nome, i) => `<option value="${i + 1}" ${i === dataAtual.getMonth() ? 'selected' : ''}>${nome[0].toUpperCase() + nome.slice(1)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="input-group">
                            <label for="pta-ano">Ano</label>
                            <select id="pta-ano" required onchange="window.atualizarAvisoUltimoPTA(); window.carregarPTAUnificadoEquipe()">
                                ${[-2, -1, 0, 1].map(d => dataAtual.getFullYear() + d).map(a => `<option value="${a}" ${a === dataAtual.getFullYear() ? 'selected' : ''}>${a}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="input-group">
                        <label for="pta-avanco-num" id="rotulo-avanco">Avanço geral da pesquisa</label>
                        <div class="range-field">
                            <input type="range" id="pta-avanco" min="0" max="100" value="50"
                                   aria-labelledby="rotulo-avanco" aria-describedby="ajuda-avanco" aria-valuetext="50%"
                                   oninput="window.sincronizarAvanco('controle')">
                            <div class="num-suffix">
                                <input type="number" id="pta-avanco-num" min="0" max="100" step="1" value="50"
                                       inputmode="numeric" required aria-describedby="ajuda-avanco"
                                       onfocus="this.select()"
                                       oninput="window.sincronizarAvanco('caixa')"
                                       onchange="window.sincronizarAvanco('confirmar')">
                                <span aria-hidden="true">%</span>
                            </div>
                        </div>
                        <span class="help" id="ajuda-avanco" aria-live="polite">De 0 a 100. Digite o número ou arraste o controle; as setas ajustam de 1 em 1.</span>
                    </div>

                    <div class="input-group">
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                            <label for="pta-descricao">Atividades do mês</label>
                            <button type="button" class="link-btn" onclick="window.importarExperimentosRSpaceParaPTA()">
                                ${window.Icon ? window.Icon('layers', { size: 13 }) : ''} Importar do RSpace (mês selecionado)  ___ EM DESENVOLVIMENTO
                            </button>
                        </div>
                        <textarea id="pta-descricao" rows="7" placeholder="Experimentos realizados, resultados obtidos, próximos passos" required></textarea>
                    </div>

                    <p class="pta-resumo" id="pta-resumo" aria-live="polite"></p>
                    <button type="submit" class="btn btn-primary btn-block">Enviar planejamento</button>
                </form>
            </section>

            <div class="stack-lg">
                <section>
                    <div class="section-head">
                        <h3>Histórico consolidado deste tópico</h3>
                        <p class="meta">evolução mês a mês</p>
                    </div>
                    <div id="ptaunificado-equipe-lista" class="entries scroll-pane">
                        <div class="empty-state"><p>Escolha um tópico para ver a evolução percentual e o que já foi consolidado em cada mês.</p></div>
                    </div>
                </section>

                <section id="secao-meus-envios">
                    <div class="section-head">
                        <h3>Meus envios em andamento</h3>
                        <p class="meta">aguardando avaliação ou revisão</p>
                    </div>
                    <div id="meus-ptas-lista" class="entries scroll-pane">${window.UI.loading('Buscando envios')}</div>
                </section>
            </div>
        </div>
    `;

    carregarDropdownTopicos('pta-topico');
    carregarMeusPTAs();
    const form = document.getElementById('form-pta');
    form.addEventListener('submit', window.prepararEnvioRelatorio);
    form.addEventListener('change', atualizarResumoPTA);
    form.addEventListener('reset', () => setTimeout(atualizarResumoPTA, 0));
    window.Salvaguardas?.vincularRascunho(form, 'pta');
    atualizarResumoPTA();
}

// ==========================================
// RESUMO DO PTA ANTES DE ENVIAR
// Evita o erro mais comum: relatar no mês errado.
// ==========================================
const MESES_DO_ANO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function atualizarResumoPTA() {
    const resumo = document.getElementById('pta-resumo');
    if (!resumo) return;

    const topico = document.getElementById('pta-topico');
    const mes = parseInt(document.getElementById('pta-mes').value, 10);
    const ano = parseInt(document.getElementById('pta-ano').value, 10);
    const opcao = topico && topico.value ? topico.selectedOptions[0] : null;
    const nomeTopico = opcao ? (opcao.dataset.titulo || opcao.textContent) : '';
    const hoje = new Date();
    const foraDoMes = mes !== hoje.getMonth() + 1 || ano !== hoje.getFullYear();

    const acao = window.ptaEditandoId ? 'Você está editando o PTA de' : 'Você está registrando';
    resumo.innerHTML = `${acao} <strong>${MESES_DO_ANO[mes - 1]} de ${ano}</strong>${nomeTopico ? ` · ${window.escapeHTML(nomeTopico)}` : ''}${foraDoMes ? ' <span class="badge badge-warning">não é o mês atual</span>' : ''}`;
}

function garantirAnoNoSeletor(ano) {
    const select = document.getElementById('pta-ano');
    if (!select || select.querySelector(`option[value="${ano}"]`)) return;
    const opcao = new Option(String(ano), String(ano));
    const depois = Array.from(select.options).find(o => parseInt(o.value, 10) > ano);
    select.insertBefore(opcao, depois || null);
}

// ==========================================
// AVANÇO: CONTROLE DESLIZANTE + CAIXA NUMÉRICA
// Os dois mostram o mesmo valor. O envio lê o
// controle (#pta-avanco); a caixa só o alimenta.
// ==========================================
function elementosDoAvanco() {
    return {
        controle: document.getElementById('pta-avanco'),
        caixa: document.getElementById('pta-avanco-num'),
        ajuda: document.getElementById('ajuda-avanco'),
    };
}

function textoDeAjudaAvanco(minimo, ajustadoPara) {
    const base = minimo > 0
        ? `De ${minimo} a 100. O mínimo é ${minimo}%, o avanço do último PTA neste tópico.`
        : 'De 0 a 100. Digite o número ou arraste o controle; as setas ajustam de 1 em 1.';
    return ajustadoPara === undefined ? base : `Ajustado para ${ajustadoPara}%. ${base}`;
}

function definirAvanco(valor) {
    const { controle, caixa } = elementosDoAvanco();
    if (!controle || !caixa) return;
    controle.value = valor;
    // O controle já limita ao mínimo/máximo; a caixa mostra o valor final.
    caixa.value = controle.value;
    controle.setAttribute('aria-valuetext', `${controle.value}%`);
}

function definirMinimoAvanco(minimo, sincronizarComUltimo = false) {
    const { controle, caixa, ajuda } = elementosDoAvanco();
    if (!controle || !caixa) return;
    controle.min = minimo;
    caixa.min = minimo;
    if (sincronizarComUltimo) {
        definirAvanco(minimo);
    } else {
        definirAvanco(Math.max(parseInt(controle.value, 10) || 0, minimo));
    }
    if (ajuda) ajuda.textContent = textoDeAjudaAvanco(minimo);
}

window.sincronizarAvanco = function(origem) {
    const { controle, caixa, ajuda } = elementosDoAvanco();
    if (!controle || !caixa) return;
    const minimo = parseInt(controle.min, 10) || 0;

    if (origem === 'controle') {
        caixa.value = controle.value;
        controle.setAttribute('aria-valuetext', `${controle.value}%`);
        return;
    }

    const digitado = Number(caixa.value);
    const valido = caixa.value !== '' && Number.isFinite(digitado);

    // Enquanto digita: só acompanha valores já dentro da faixa,
    // para não "pular" o número no meio da digitação (ex.: 7 → 75).
    if (origem === 'caixa') {
        if (valido && digitado >= minimo && digitado <= 100) {
            controle.value = Math.round(digitado);
            controle.setAttribute('aria-valuetext', `${controle.value}%`);
        }
        return;
    }

    // Ao confirmar (sair da caixa ou Enter): arredonda e traz para a faixa.
    const ajustado = valido ? Math.min(100, Math.max(minimo, Math.round(digitado))) : parseInt(controle.value, 10);
    definirAvanco(ajustado);
    if (ajuda) ajuda.textContent = textoDeAjudaAvanco(minimo, valido && ajustado === digitado ? undefined : ajustado);
};

function obterUltimoRelatoDoTopico(topicoId) {
    if (!topicoId || !window.meusPtasCache || window.meusPtasCache.length === 0) return null;
    const topicoIdNum = parseInt(topicoId, 10);
    const doTopico = window.meusPtasCache.filter(rel => rel.topico_id == topicoIdNum);
    if (doTopico.length === 0) return null;

    if (window.ptaEditandoId) {
        const relEditando = window.meusPtasCache.find(r => r.id === window.ptaEditandoId);
        if (relEditando) {
            return doTopico.find(rel =>
                rel.ano_referencia < relEditando.ano_referencia ||
                (rel.ano_referencia === relEditando.ano_referencia && rel.mes_referencia < relEditando.mes_referencia)
            ) || null;
        }
    }

    const mesForm = parseInt(document.getElementById('pta-mes')?.value, 10);
    const anoForm = parseInt(document.getElementById('pta-ano')?.value, 10);
    if (mesForm && anoForm) {
        const anterior = doTopico.find(rel =>
            rel.ano_referencia < anoForm ||
            (rel.ano_referencia === anoForm && rel.mes_referencia < mesForm)
        );
        if (anterior) return anterior;
    }
    return doTopico[0];
}

window.atualizarAvisoUltimoPTA = function(abrirModalSeConcluido = false) {
    const topicoElement = document.getElementById('pta-topico');
    if (!topicoElement) return;
    atualizarResumoPTA();

    const topicoId = topicoElement.value;
    const inputAvanco = document.getElementById('pta-avanco');
    const inputAvancoNum = document.getElementById('pta-avanco-num');
    const textareaDesc = document.getElementById('pta-descricao');
    const btnSubmit = document.querySelector('#form-pta button[type="submit"]');
    const avisoConcluido = document.getElementById('aviso-topico-concluido');

    const infoConclusao = obterDadosConclusaoTopico(topicoId);
    if (infoConclusao.concluido && !window.ptaEditandoId) {
        if (avisoConcluido) avisoConcluido.classList.remove('hidden');
        definirMinimoAvanco(100, true);
        if (inputAvanco) inputAvanco.disabled = true;
        if (inputAvancoNum) inputAvancoNum.disabled = true;
        if (textareaDesc) {
            textareaDesc.disabled = true;
            textareaDesc.placeholder = "Este tópico já atingiu 100% de avanço e foi concluído.";
        }
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerText = "Tópico já concluído (100%)";
        }
        if (abrirModalSeConcluido) {
            window.abrirModalTopicoConcluido(topicoId);
        }
        return;
    } else {
        if (avisoConcluido) avisoConcluido.classList.add('hidden');
        if (inputAvanco) inputAvanco.disabled = false;
        if (inputAvancoNum) inputAvancoNum.disabled = false;
        if (textareaDesc) {
            textareaDesc.disabled = false;
            textareaDesc.placeholder = "Experimentos realizados, resultados obtidos, próximos passos";
        }
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerText = window.ptaEditandoId ? "Atualizar Planejamento Mensal" : "Enviar planejamento";
        }
    }

    if (!topicoId || !window.meusPtasCache || window.meusPtasCache.length === 0) {
        if (inputAvanco) definirMinimoAvanco(0);
        return;
    }

    const ultimoRelato = obterUltimoRelatoDoTopico(topicoId);

    if (ultimoRelato) {
        definirMinimoAvanco(ultimoRelato.percentual_avanco, !window.ptaEditandoId);
    } else {
        definirMinimoAvanco(0, !window.ptaEditandoId);
    }
};

window.renderizarListaMeusPTAs = function() {
    const container = document.getElementById('meus-ptas-lista');
    if (!container) return;
    const todos = Array.isArray(window.meusPtasCache) ? [...window.meusPtasCache] : [];
    // Exibe apenas PTAs ainda não consolidados (enviados para avaliação ou devolvidos para revisão),
    // evitando duplicar os PTAs consolidados que já aparecem no Histórico consolidado do tópico.
    const relatorios = todos.filter(r => r.status !== 'consolidado' && r.is_mine !== false);

    if (relatorios.length === 0) {
        container.innerHTML = window.UI.emptyState({
            title: 'Nenhum envio pendente',
            description: 'Seus PTAs aguardando avaliação ou devolvidos para revisão aparecem aqui.'
        });
        return;
    }

    const topicoSelecionado = parseInt(document.getElementById('pta-topico')?.value, 10) || null;
    relatorios.sort((a, b) => {
        if (topicoSelecionado) {
            const aMatch = a.topico_id == topicoSelecionado ? 0 : 1;
            const bMatch = b.topico_id == topicoSelecionado ? 0 : 1;
            if (aMatch !== bMatch) return aMatch - bMatch;
        }
        return b.ano_referencia - a.ano_referencia || b.mes_referencia - a.mes_referencia;
    });

    let html = '';
    relatorios.forEach(rel => {
        let statusClass = '';
        let statusText = 'aguardando aprovação';
        let meterClass = '';

        if (rel.status === 'rascunho') {
            statusClass = 'badge-danger';
            statusText = 'devolvido para revisão';
            meterClass = 'bad';
        }

        const nomeTopicoFormatado = resolverNomeTopicoPTA(rel);
        const btnEditar = `<button type="button" class="link-btn" onclick="window.carregarParaEdicao(${rel.id})">Editar</button>`;

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
};

async function carregarMeusPTAs() {
    const container = document.getElementById('meus-ptas-lista');
    try {
        const [res] = await Promise.all([
            window.api.fetchProtected('/pta/meus-relatorios'),
            window.topicosPtaPromise ? window.topicosPtaPromise.catch(() => null) : Promise.resolve()
        ]);
        const relatorios = await res.json();

        relatorios.sort((a, b) => b.ano_referencia - a.ano_referencia || b.mes_referencia - a.mes_referencia);
        window.meusPtasCache = relatorios;

        window.atualizarIndicacaoTopicosConcluidos();
        window.renderizarListaMeusPTAs();
        window.carregarPTAUnificadoEquipe();
        setTimeout(() => window.atualizarAvisoUltimoPTA(false), 100);
    } catch (err) {
        if (container) container.innerHTML = window.UI.errorState('Erro ao carregar histórico.');
    }
}
window.prepararEnvioRelatorio = function(e) {
    e.preventDefault();

    window.sincronizarAvanco('confirmar');
    const topicoId = parseInt(document.getElementById('pta-topico').value);
    const avancoNovo = parseInt(document.getElementById('pta-avanco').value);
    if (!window.ptaEditandoId && window.meusPtasCache) {
        const ultimoRelato = obterUltimoRelatoDoTopico(topicoId);

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
                definirAvanco(50);
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
                <p class="lede">Escolha um mês para avaliar os PTAs enviados e gerar o texto consolidado.</p>
            </div>
            <div class="cluster">
                <button type="button" class="btn btn-secondary btn-sm" onclick="window.renderPTAPesquisador()">Visão pesquisador / Preencher PTA</button>
                <div class="year-nav">
                    <button class="icon-btn" onclick="mudarAnoCalendario(-1)" aria-label="Ano anterior">${window.Icon('chevron-left', { size: 16 })}</button>
                    <span id="calendario-ano-display" class="mono">${anoAtual}</span>
                    <button class="icon-btn" onclick="mudarAnoCalendario(1)" aria-label="Próximo ano">${window.Icon('chevron-right', { size: 16 })}</button>
                </div>
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
                    <p class="text-muted text-small mb-md">Reúne em um único texto os PTAs <strong>aprovados</strong> do tópico neste mês.</p>

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
                        <input type="number" id="novo-topico-ano" class="mono" value="${anoAtual}" required oninput="window.atualizarPreviewPrazoNovoTopico()">
                    </div>
                    <div class="field-grid">
                        <div class="input-group">
                            <label for="novo-topico-mes-inicio">Mês de início</label>
                            <select id="novo-topico-mes-inicio" required onchange="window.atualizarPreviewPrazoNovoTopico()">
                                ${MESES_DO_ANO.map((nome, i) => `<option value="${i + 1}" ${i === 0 ? 'selected' : ''}>${String(i + 1).padStart(2, '0')} · ${nome[0].toUpperCase() + nome.slice(1)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="input-group">
                            <label for="novo-topico-mes-fim">Previsão de término</label>
                            <select id="novo-topico-mes-fim" required onchange="window.atualizarPreviewPrazoNovoTopico()">
                                ${MESES_DO_ANO.map((nome, i) => `<option value="${i + 1}" ${i === 11 ? 'selected' : ''}>${String(i + 1).padStart(2, '0')} · ${nome[0].toUpperCase() + nome.slice(1)}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <p class="help" id="preview-prazo-novo-topico" style="margin-top:-4px; margin-bottom:var(--space-3);">Previsão: 01/${String(anoAtual).slice(-2)} → 12/${String(anoAtual).slice(-2)}</p>
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
        html += `<div class="mes-card ${isActive}" id="card-mes-${numMes}" role="button" tabindex="0" onclick="selecionarMes(${numMes}, '${nome}')">${nome}</div>`;
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
        const [res] = await Promise.all([
            window.api.fetchProtected(`/pta/chefia/pendentes?mes=${mes}&ano=${ano}`),
            window.topicosPtaPromise ? window.topicosPtaPromise.catch(() => null) : Promise.resolve()
        ]);
        const relatorios = await res.json();

        if (relatorios.length === 0) {
            container.innerHTML = window.UI.emptyState({ title: 'Nada aguardando avaliação', description: 'Nenhum PTA pendente neste mês.' });
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

            const nomeTopico = resolverNomeTopicoPTA(rel);

            html += `
                <article class="entry" id="card-relatorio-${rel.id}">
                    <div class="entry-head">
                        <h4 class="entry-title">${window.escapeHTML(rel.usuario_nome || `Usuário #${rel.usuario_id}`)}</h4>
                        <span class="mono">${rel.percentual_avanco || 0}%</span>
                    </div>
                    <p class="meta">${window.escapeHTML(nomeTopico)}</p>
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
            container.innerHTML = window.UI.emptyState({ title: 'Nenhum PTA aprovado neste mês' });
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
                        <h4 class="entry-title">${window.escapeHTML(rel.topico_titulo)}</h4>
                        <span class="mono">${rel.percentual_avanco}%</span>
                    </div>
                    <div class="meter">
                        <div class="meter-track"><div class="meter-fill ok" style="width:${rel.percentual_avanco || 0}%"></div></div>
                        <span class="meter-value">${rel.percentual_avanco || 0}%</span>
                    </div>
                    <p class="entry-body pre-wrap">${window.escapeHTML(rel.descricao_atividades)}</p>
                </article>
            `;
        });
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = window.UI.errorState('Não foi possível carregar os PTAs aprovados.');
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

window.atualizarPreviewPrazoNovoTopico = function() {
    const anoEl = document.getElementById('novo-topico-ano');
    const iniEl = document.getElementById('novo-topico-mes-inicio');
    const fimEl = document.getElementById('novo-topico-mes-fim');
    const prevEl = document.getElementById('preview-prazo-novo-topico');
    if (!anoEl || !iniEl || !fimEl || !prevEl) return;

    const ini = parseInt(iniEl.value, 10) || 1;
    let fim = parseInt(fimEl.value, 10) || 12;
    if (fim < ini) {
        fim = ini;
        fimEl.value = String(fim);
    }
    const anoCurto = String(anoEl.value || '').slice(-2);
    const qtdMeses = fim - ini + 1;
    prevEl.textContent = `Previsão no ano: ${String(ini).padStart(2, '0')}/${anoCurto} → ${String(fim).padStart(2, '0')}/${anoCurto} (${qtdMeses} ${qtdMeses === 1 ? 'mês' : 'meses'})`;
};

async function criarTopicoAction(e) {
    e.preventDefault();
    const mesInicio = parseInt(document.getElementById('novo-topico-mes-inicio')?.value, 10) || 1;
    const mesFim = parseInt(document.getElementById('novo-topico-mes-fim')?.value, 10) || 12;
    if (mesFim < mesInicio) {
        window.UI.showToast("O mês de término não pode ser anterior ao mês de início.", "error");
        return;
    }
    const payload = {
        titulo: document.getElementById('novo-topico-titulo').value,
        ano: parseInt(document.getElementById('novo-topico-ano').value, 10),
        mes_inicio: mesInicio,
        mes_fim: mesFim
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
    garantirAnoNoSeletor(rel.ano_referencia);
    document.getElementById('pta-ano').value = rel.ano_referencia;

    window.ptaEditandoId = rel.id;

    window.atualizarAvisoUltimoPTA();

    definirAvanco(rel.percentual_avanco);
    document.getElementById('pta-descricao').value = rel.descricao_atividades;
    window.Salvaguardas?.vincularRascunho(document.getElementById('form-pta'), `pta-edicao-${rel.id}`);
    atualizarResumoPTA();

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
    document.getElementById('form-pta').dataset.rascunho = 'pta';
    definirAvanco(50);

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

    container.innerHTML = window.UI.loading('Buscando PTAs da equipe');

    try {
        const res = await window.api.fetchProtected(`/pta/equipe/ptaunificado?topico_id=${topicoId}&mes=${mes}&ano=${ano}`);
        if (!res.ok) throw new Error("Falha na API.");
        const relatoriosApi = await res.json();

        // Garante que todos os meses consolidados do tópico apareçam uma única vez (sem duplicar)
        const mapaPorMes = new Map();
        const doCache = Array.isArray(window.meusPtasCache)
            ? window.meusPtasCache.filter(r => r.topico_id == parseInt(topicoId, 10) && r.status === 'consolidado')
            : [];

        [...relatoriosApi, ...doCache].forEach(r => {
            const m = r.mes_referencia || parseInt(mes, 10);
            const a = r.ano_referencia || parseInt(ano, 10);
            const chave = `${a}-${String(m).padStart(2, '0')}-${r.status === 'consolidado' ? 'cons' : r.id}`;
            if (!mapaPorMes.has(chave)) {
                mapaPorMes.set(chave, {
                    ...r,
                    topico_id: r.topico_id || parseInt(topicoId, 10),
                    mes_referencia: m,
                    ano_referencia: a,
                    descricao: r.descricao || r.descricao_atividades || ''
                });
            }
        });

        const relatoriosExibir = Array.from(mapaPorMes.values()).sort((a, b) =>
            (b.ano_referencia || 0) - (a.ano_referencia || 0) ||
            (b.mes_referencia || 0) - (a.mes_referencia || 0)
        );

        if (relatoriosExibir.length === 0) {
            container.innerHTML = window.UI.emptyState({ title: 'Nenhum registro neste tópico', description: 'Nenhum PTA consolidado ou enviado neste tópico.' });
            return;
        }

        let html = '';

        relatoriosExibir.forEach(rel => {
            const nomeTopico = window.escapeHTML(resolverNomeTopicoPTA(rel));
            const descricaoSegura = window.escapeHTML(rel.descricao || 'Nenhuma descrição fornecida.');
            const numMes = rel.mes_referencia || parseInt(mes, 10);
            const numAno = rel.ano_referencia || parseInt(ano, 10);
            const mesAnoStr = `${String(numMes).padStart(2, '0')}/${numAno}`;
            const meterClass = rel.status === 'consolidado' ? 'ok' : '';

            html += `
                <article class="entry"
                     data-topico="${encodeURIComponent(resolverNomeTopicoPTA(rel) || 'Sem título')}"
                     data-mes="${mesAnoStr}"
                     data-avanco="${rel.percentual_avanco || 0}%"
                     data-descricao="${encodeURIComponent(rel.descricao || 'Nenhuma descrição fornecida.')}">
                    <div class="entry-head">
                        <h4 class="entry-title">${nomeTopico}</h4>
                    </div>
                    <p class="meta">${mesAnoStr}</p>
                    <div class="meter">
                        <div class="meter-track"><div class="meter-fill ${meterClass}" style="width:${rel.percentual_avanco || 0}%"></div></div>
                        <span class="meter-value">${rel.percentual_avanco || 0}%</span>
                    </div>
                    <p class="entry-body pre-wrap">${descricaoSegura}</p>
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
                <p class="dialog-text mb-md">A observação fica anexada ao PTA para orientar a correção.</p>

                <label for="texto-motivo-devolucao">O que precisa ser ajustado</label>
                <textarea id="texto-motivo-devolucao" rows="4" placeholder="Ex.: faltou detalhar a curva de temperatura do experimento 2"></textarea>

                <div class="modal-footer">
                    <button onclick="window.fecharModalDevolucao()" class="btn btn-secondary">Cancelar</button>
                    <button onclick="window.confirmarDevolucao()" class="btn btn-danger">Devolver</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal && !document.getElementById('texto-motivo-devolucao').value.trim()) window.fecharModalDevolucao();
        });
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

// ==========================================
// IMPORTAR EXPERIMENTOS DO RSPACE PARA O PTA DO MÊS
// ==========================================
window.importarExperimentosRSpaceParaPTA = async function() {
    const mes = document.getElementById('pta-mes')?.value;
    const ano = document.getElementById('pta-ano')?.value;
    const textarea = document.getElementById('pta-descricao');
    if (!textarea) return;

    try {
        window.UI.showToast('Consultando experimentos do mês no RSpace...', 'info');
        const res = await window.api.fetchProtected(`/rspace/documents?mes=${encodeURIComponent(mes || '')}&ano=${encodeURIComponent(ano || '')}&limit=30`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data.detail || 'Não foi possível buscar experimentos no RSpace.');
        }

        const docs = data.documents || [];
        if (!docs.length) {
            window.UI.showToast(`Nenhum experimento modificado em ${mes}/${ano} foi encontrado no RSpace.`, 'warning');
            return;
        }

        const linhas = docs.map((d) => {
            const tags = (d.tags && d.tags.length) ? ` [${d.tags.join(', ')}]` : '';
            return `• [${d.global_id}] ${d.titulo} (${d.formulario || 'ELN'})${tags}`;
        });
        const bloco = `Experimentos registrados no RSpace (${mes}/${ano}):\n${linhas.join('\n')}`;
        textarea.value = textarea.value.trim() ? `${textarea.value.trim()}\n\n${bloco}` : bloco;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        window.UI.showToast(`${docs.length} experimento(s) do RSpace importado(s) para o relato!`, 'success');
    } catch (err) {
        window.UI.showToast(err.message || 'Erro ao importar do RSpace.', 'error');
    }
};
