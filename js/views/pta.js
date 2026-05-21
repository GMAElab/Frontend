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
// FUNÇÃO COMPARTILHADA: CARREGAR TÓPICOS
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
            html += `<option value="${t.id}">${t.titulo} (${t.ano})</option>`;
        });
        select.innerHTML = html;
        setTimeout(atualizarAvisoUltimoPTA, 300);

    } catch (err) {
        select.innerHTML = '<option value="">Erro ao carregar tópicos</option>';
    }
}

// ==========================================
// VISÃO DO PESQUISADOR (COM HISTÓRICO E LEMBRETE)
// ==========================================
function renderPTAPesquisador() {
    const main = document.getElementById('dynamic-content');
    const dataAtual = new Date();
    
    main.innerHTML = `
        <div class="view-header">
            <h2>Plano de Trabalho (PTA)</h2>
            <p class="text-muted">Envie seus relatórios mensais e acompanhe seu histórico.</p>
        </div>
        
        <div class="grid-fluida" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
            
            <div class="card-responsivo" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); align-self: start;">
                <h3 style="margin-bottom: 20px; color: #111; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">Novo Relatório</h3>
                <form id="form-pta">
                    <div style="margin-bottom: 15px;">
                        <label style="font-weight: bold; font-size: 14px; color: #111;">Tópico de Pesquisa:</label>
                        <select id="pta-topico" class="form-control" required style="width: 100%; padding: 8px;" onchange="atualizarAvisoUltimoPTA()"></select>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div>
                            <label style="font-weight: bold; font-size: 14px; color: #111;">Mês:</label>
                            <input type="number" id="pta-mes" class="form-control" value="${dataAtual.getMonth() + 1}" required style="width: 100%; padding: 8px;">
                        </div>
                        <div>
                            <label style="font-weight: bold; font-size: 14px; color: #111;">Ano:</label>
                            <input type="number" id="pta-ano" class="form-control" value="${dataAtual.getFullYear()}" required style="width: 100%; padding: 8px;">
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 25px; padding: 15px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px;">
                        <label style="display: flex; justify-content: space-between; margin-bottom: 10px; font-weight: bold; color: #111;">
                            <span>Avanço Geral da Pesquisa:</span>
                            <span id="valor-avanco" style="color: #007BFF;">50%</span>
                        </label>
                        <input type="range" id="pta-avanco" min="0" max="100" value="50" style="width: 100%; cursor: pointer;" 
                               oninput="document.getElementById('valor-avanco').innerText = this.value + '%'">
                    </div>
                    
                    <div id="ultimo-pta-aviso" style="display: none; background: #F8FAFC; border: 1px solid #E2E8F0; border-left: 3px solid #007BFF; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <strong style="color: #111; font-size: 13px;">Último relato deste tópico (Mês <span id="ultimo-pta-mes"></span>):</strong>
                            <span style="color: #64748b; font-size: 12px; font-weight: 600;">Avanço anterior: <span id="ultimo-pta-avanco"></span>%</span>
                        </div>
                        <div id="ultimo-pta-texto" style="color: #475569; font-size: 13px; font-style: italic; line-height: 1.6; white-space: pre-wrap; background: #F1F5F9; padding: 10px; border-radius: 4px;"></div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="font-weight: bold; font-size: 14px; color: #111;">Descrição das Atividades no Mês</label>
                        <textarea id="pta-descricao" class="form-control" rows="6" placeholder="Descreva os experimentos, resultados e atividades..." required style="width: 100%; padding: 8px;"></textarea>
                    </div>
                    
                    <button type="submit" class="btn" style="width: 100%; font-weight: bold; padding: 12px; background: #111; color: white; border: none; border-radius: 4px; cursor: pointer;">Enviar PTA</button>
                </form>
            </div>

            <div class="card-responsivo" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); align-self: start;">
                <h3 style="margin-bottom: 20px; color: #111; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">Meus Últimos Envios</h3>
                <div id="meus-ptas-lista" style="display: flex; flex-direction: column; gap: 15px; max-height: 600px; overflow-y: auto; padding-right: 5px;">
                    <span class="spinner" style="border-top-color: #007BFF;"></span> Buscando histórico...
                </div>
            </div>

        </div>
    `;

    carregarDropdownTopicos('pta-topico');
    carregarMeusPTAs();
    document.getElementById('form-pta').addEventListener('submit', enviarRelatorio);
}

// ==========================================
// A MÁGICA: VERIFICA O ÚLTIMO ENVIO E EXIBE
// ==========================================
window.atualizarAvisoUltimoPTA = function() {
    const topicoElement = document.getElementById('pta-topico');
    if (!topicoElement) return;
    
    const topicoId = topicoElement.value;
    const avisoContainer = document.getElementById('ultimo-pta-aviso');
    const inputAvanco = document.getElementById('pta-avanco');
    const spanAvanco = document.getElementById('valor-avanco');
    
    if (!topicoId || !window.meusPtasCache || window.meusPtasCache.length === 0) {
        if (avisoContainer) avisoContainer.style.display = 'none';
        if (inputAvanco) inputAvanco.min = 0; 
        return;
    }
    
    const ultimoRelato = window.meusPtasCache.find(rel => rel.topico_id == parseInt(topicoId));

    if (ultimoRelato) {
        avisoContainer.style.display = 'block';
        document.getElementById('ultimo-pta-mes').innerText = `${ultimoRelato.mes_referencia}/${ultimoRelato.ano_referencia}`;
        document.getElementById('ultimo-pta-texto').innerText = `"${ultimoRelato.descricao_atividades}"`;
        document.getElementById('ultimo-pta-avanco').innerText = ultimoRelato.percentual_avanco;
        
        inputAvanco.min = ultimoRelato.percentual_avanco;
        
        if (parseInt(inputAvanco.value) < ultimoRelato.percentual_avanco) {
            inputAvanco.value = ultimoRelato.percentual_avanco;
            spanAvanco.innerText = ultimoRelato.percentual_avanco + '%';
        }
        
    } else {
        avisoContainer.style.display = 'none';
        inputAvanco.min = 0;
    }
};

async function carregarMeusPTAs() {
    const container = document.getElementById('meus-ptas-lista');
    try {
        const res = await window.api.fetchProtected('/pta/meus-relatorios');
        const relatorios = await res.json();

        if (relatorios.length === 0) {
            container.innerHTML = '<p class="text-muted" style="text-align:center; padding: 20px;">Você ainda não enviou nenhum relatório.</p>';
            return;
        }

        relatorios.sort((a, b) => b.ano_referencia - a.ano_referencia || b.mes_referencia - a.mes_referencia);
        
        window.meusPtasCache = relatorios;
        setTimeout(atualizarAvisoUltimoPTA, 200);

        let html = '';
        relatorios.forEach(rel => {
            let statusColor = '#64748b';
            let statusText = '⏳ Em Avaliação';
            let bgCard = '#F8FAFC';
            let borderCard = '#E2E8F0';

            if (rel.status === 'consolidado') {
                statusColor = '#007BFF'; 
                statusText = '✅ Aprovado';
                borderCard = '#007BFF';
            } else if (rel.status === 'rascunho') {
                statusColor = '#d9534f';
                statusText = '❌ Devolvido (Revisar)';
                bgCard = '#FEF2F2'; 
                borderCard = '#FCA5A5';
            }

            let nomeTopicoFormatado = `Tópico ID: ${rel.topico_id}`;
            const selectTopico = document.getElementById('pta-topico');
            if (selectTopico) {
                const opt = Array.from(selectTopico.options).find(o => o.value == rel.topico_id);
                if (opt) {
                    nomeTopicoFormatado = opt.text;
                }
            }
            
            // Adicionado fallback de segurança no encodeURIComponent
            html += `
                <div style="border: 1px solid ${borderCard}; border-left: 4px solid ${statusColor}; border-radius: 6px; padding: 15px; background: ${bgCard}; cursor: pointer; transition: transform 0.1s ease-in-out;"
                     title="Dê um duplo clique para abrir os detalhes completos"
                     ondblclick="abrirModalDetalhesPTA(this)"
                     data-topico="${encodeURIComponent(nomeTopicoFormatado || 'Sem título')}"
                     data-mes="Mês ${rel.mes_referencia}/${rel.ano_referencia}"
                     data-avanco="${rel.percentual_avanco}%"
                     data-descricao="${encodeURIComponent(rel.descricao_atividades || 'Nenhuma descrição fornecida.')}"
                     onmouseover="this.style.transform='scale(1.02)'" 
                     onmouseout="this.style.transform='scale(1)'">
                     
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <strong style="color: #111;">Mês ${rel.mes_referencia}/${rel.ano_referencia}</strong>
                        <span style="font-size: 12px; font-weight: bold; color: ${statusColor}; text-transform: uppercase;">${statusText}</span>
                    </div>
                    
                    <div style="font-size: 13px; color: #64748B; margin-bottom: 8px; font-weight: 600;">
                        ${nomeTopicoFormatado}
                    </div>
                    
                    <div style="width: 100%; background: #E2E8F0; border-radius: 4px; height: 8px; margin-bottom: 10px;">
                        <div style="background: ${statusColor === '#64748b' ? '#111' : statusColor}; height: 100%; border-radius: 4px; width: ${rel.percentual_avanco}%;"></div>
                    </div>
                    
                    <div style="font-size: 13px; color: #475569; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-style: italic;">
                        "${rel.descricao_atividades}"
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = '<p style="color:red;">Erro ao carregar histórico.</p>';
    }
}

async function enviarRelatorio(e) {
    e.preventDefault();
    const payload = {
        topico_id: parseInt(document.getElementById('pta-topico').value),
        mes_referencia: parseInt(document.getElementById('pta-mes').value),
        ano_referencia: parseInt(document.getElementById('pta-ano').value),
        percentual_avanco: parseInt(document.getElementById('pta-avanco').value),
        descricao_atividades: document.getElementById('pta-descricao').value,
        status: "aguardando_aprovacao"
    };

    const btn = e.target.querySelector('button');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Enviando...';
    btn.disabled = true;

    try {
        const res = await window.api.fetchProtected('/pta/salvar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            window.UI.showToast("PTA enviado com sucesso!", "success");
            e.target.reset(); 
            document.getElementById('valor-avanco').innerText = '50%';
            carregarMeusPTAs(); 
        } else {
            window.UI.showToast("Erro ao salvar o PTA", "error");
        }
    } catch (err) {
        window.UI.showToast("Falha de conexão.", "error");
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}

// ==========================================
// TELA 2: VISÃO DO ADMIN 
// ==========================================
function renderPTACoordenador() {
    const main = document.getElementById('dynamic-content');
    const dataAtual = new Date();
    const anoAtual = dataAtual.getFullYear();

    main.innerHTML = `
        <div class="view-header">
            <h2 style="color: #111;">Gestão de PTA</h2>
            <p class="text-muted">Navegue pelo calendário para avaliar relatórios e gerar textos consolidados.</p>
        </div>

        <div class="grid-admin" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
            
            <div class="card-responsivo" style="background: white; border-radius: 8px; padding: 20px;">
                <h4 style="margin-bottom: 15px; color: #111;">Novo Tópico de Pesquisa</h4>
                <form id="form-novo-topico">
                    <div style="margin-bottom: 10px;">
                        <label style="font-size: 13px; font-weight:600; color: #111;">Título do Tópico:</label>
                        <input type="text" id="novo-topico-titulo" class="form-control" required style="border: 1px solid #111;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="font-size: 13px; font-weight:600; color: #111;">Ano Vigente:</label>
                        <input type="number" id="novo-topico-ano" class="form-control" value="${anoAtual}" required style="border: 1px solid #111;">
                    </div>
                    <button type="submit" class="btn" style="width: 100%; background: #111; color: white; font-weight: bold; padding: 10px; border-radius: 4px; border: none; cursor: pointer;">Cadastrar Tópico</button>
                </form>
            </div>

            <div class="card-responsivo" style="background: white; border-radius: 8px; padding: 20px; border-top: 4px solid #10b981;">
                <h4 style="margin-bottom: 10px; color: #111;">Importar Histórico (Arquivo em .xlsx)</h4>
                <p style="font-size: 12px; color: #64748b; margin-bottom: 15px;">Traga dados da planilha para cá.</p>
                <form id="form-importar-pta">
                    <div style="margin-bottom: 10px;">
                        <label style="font-size: 13px; font-weight:600; color: #111;">Ano de Referência:</label>
                        <input type="number" id="import-pta-ano" class="form-control" value="${anoAtual}" required style="border: 1px solid #111;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="font-size: 13px; font-weight:600; color: #111;">Arquivo Excel:</label>
                        <input type="file" id="import-pta-arquivo" accept=".xlsx, .xls" class="form-control" required style="border: 1px solid #111; padding: 5px; width: 100%;">
                    </div>
                    <button type="submit" class="btn" style="width: 100%; background: #10b981; color: white; font-weight: bold; padding: 10px; border-radius: 4px; border: none; cursor: pointer;">Processar Planilha</button>
                </form>
            </div>

            <div class="card-responsivo" style="background: white; border-radius: 8px; padding: 20px; border-top: 4px solid #007BFF; grid-column: 1 / -1;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h4 style="color: #007BFF; margin: 0;">Navegação do Ano</h4>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <button class="btn btn-sm btn-secondary" onclick="mudarAnoCalendario(-1)" style="border: 1px solid #111; color: #111;">◀</button>
                        <h3 id="calendario-ano-display" style="margin: 0; min-width: 60px; text-align: center; color: #111;">${anoAtual}</h3>
                        <button class="btn btn-sm btn-secondary" onclick="mudarAnoCalendario(1)" style="border: 1px solid #111; color: #111;">▶</button>
                    </div>
                </div>
                
                <div class="meses-grid" id="grid-meses"></div>
            </div>
        </div>

        <div id="painel-mes-detalhe" class="painel-detalhe" style="display: none; background: white; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin-top: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E2E8F0; padding-bottom: 15px; margin-bottom: 20px;">
                <h3 id="painel-titulo" style="margin: 0; color: #111;">Gestão do Mês</h3>
                <button class="btn btn-sm" onclick="fecharPainelMes()" style="background: transparent; color: #111; border: 1px solid #111; cursor: pointer; border-radius: 4px; padding: 5px 10px;">Fechar Painel</button>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
                <div>
                    <h4 style="color: #475569; margin-bottom: 15px; font-size: 15px; text-transform: uppercase;">Relatórios Pendentes</h4>
                    <div id="lista-pendencias" style="max-height: 400px; overflow-y: auto; padding-right: 5px;"></div>
                </div>

                <div style="background: #F8FAFC; padding: 20px; border-radius: 8px; border: 1px solid #E2E8F0;">
                    <h4 style="color: #007BFF; margin-bottom: 10px; font-size: 15px;">Gerar Síntese (Inteligência Artificial)</h4>
                    <p style="font-size: 13px; color: #64748b; margin-bottom: 15px;">Unifica todos os relatórios <b>aprovados</b> do mês atual.</p>
                    
                    <select id="ia-topico-id" class="form-control" style="margin-bottom: 15px; border: 1px solid #111;"></select>
                    
                    <button id="btn-gerar-ia" class="btn" onclick="gerarSinteseIA()" style="width: 100%; background: #007BFF; color: white; font-weight: bold; border: none; padding: 10px; border-radius: 4px; cursor: pointer;">
                        Processar Textos Aprovados
                    </button>
                    
                    <div id="resultado-ia" style="display: none; background: white; border-left: 4px solid #007BFF; padding: 15px; margin-top: 15px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <strong style="color: #007BFF; font-size: 14px;">Texto Consolidado:</strong>
                        <p id="texto-ia" style="margin-top: 10px; line-height: 1.6; color: #334155; font-size: 14px;"></p>
                    </div>
                </div>
            </div>

            <div style="border-top: 1px solid #E2E8F0; padding-top: 25px;">
                <h4 style="color: #111; margin-bottom: 15px; font-size: 15px; text-transform: uppercase;">Relatórios Aprovados (Consolidados)</h4>
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
    painel.style.display = 'block';
    document.getElementById('painel-titulo').innerText = `Gestão: ${nomeMes} / ${window.estadoCalendario.ano}`;
    document.getElementById('resultado-ia').style.display = 'none'; 

    carregarPendenciasChefia(mes, window.estadoCalendario.ano);
    carregarAprovadosChefia(mes, window.estadoCalendario.ano);
}

window.fecharPainelMes = function() {
    document.getElementById('painel-mes-detalhe').style.display = 'none';
    window.estadoCalendario.mesSelecionado = null;
    document.querySelectorAll('.mes-card').forEach(el => el.classList.remove('active'));
}

// ==========================================
// CARREGAR DADOS DO MÊS
// ==========================================
window.carregarPendenciasChefia = async function(mes, ano) {
    const container = document.getElementById('lista-pendencias');
    container.innerHTML = '<span class="spinner" style="border-top-color: #64748b;"></span> <span style="color: #64748b; font-size: 14px;">Buscando...</span>';

    try {
        const res = await window.api.fetchProtected(`/pta/chefia/pendentes?mes=${mes}&ano=${ano}`);
        const relatorios = await res.json();

        if (relatorios.length === 0) {
            container.innerHTML = '<div style="background:#F8FAFC; padding: 20px; border-radius: 6px; text-align:center; color:#94A3B8; font-size: 14px;">Tudo limpo! Nenhuma pendência.</div>';
            return;
        }

        let html = '';
        relatorios.forEach(rel => {
            html += `
                <div class="card mb-sm" id="card-relatorio-${rel.id}" style="border-left: 3px solid #94A3B8; padding: 15px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="font-size: 12px; color: #64748B; font-weight: 600;">Usuário ID: ${rel.usuario_id}</span>
                        <span class="badge" style="background: #F1F5F9; color: #475569;">Avanco: ${rel.percentual_avanco}%</span>
                    </div>
                    <div style="background: #F8FAFC; padding: 12px; border-radius: 4px; margin-bottom: 12px; font-size: 13px; color: #334155; line-height: 1.5;">
                        ${rel.descricao_atividades}
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 8px;">
                        <button class="btn btn-sm" onclick="avaliarRelato(${rel.id}, false)" style="background: white; border: 1px solid #d9534f; color: #d9534f; cursor: pointer; padding: 5px 10px; border-radius: 4px;">Devolver</button>
                        <button class="btn btn-sm" onclick="avaliarRelato(${rel.id}, true)" style="background: #007BFF; color: white; border: none; cursor: pointer; padding: 5px 10px; border-radius: 4px;">Aprovar</button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = '<div style="color:red; font-size: 14px;">Erro ao carregar dados.</div>';
    }
}

window.carregarAprovadosChefia = async function(mes, ano) {
    const container = document.getElementById('lista-aprovados');
    container.innerHTML = '<span class="spinner" style="border-top-color: #007BFF;"></span> <span style="color: #007BFF; font-size: 14px;">Buscando textos aprovados...</span>';

    try {
        const res = await window.api.fetchProtected(`/pta/chefia/aprovados?mes=${mes}&ano=${ano}`);
        if (!res.ok) throw new Error("Rota não encontrada");
        const aprovados = await res.json();

        if (aprovados.length === 0) {
            container.innerHTML = '<div style="background:#F8FAFC; padding: 20px; border-radius: 6px; text-align:center; color:#94A3B8; font-size: 14px; width: 100%;">Nenhum relatório foi consolidado neste mês ainda.</div>';
            return;
        }

        let html = '';
        aprovados.forEach(rel => {
            html += `
                <div style="background: white; border: 1px solid #E2E8F0; border-left: 4px solid #007BFF; border-radius: 6px; padding: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <strong style="color: #007BFF; font-size: 14px;">${window.escapeHTML(rel.usuario_nome)}</strong>
                        <span class="badge" style="background: #eff6ff; color: #007BFF;">Avanço: ${rel.percentual_avanco}%</span>
                    </div>
                    <div style="font-size: 12px; color: #64748B; margin-bottom: 10px; font-weight: 600; text-transform: uppercase;">
                        Tópico: ${window.escapeHTML(rel.topico_titulo)}
                    </div>
                    <div style="font-size: 13px; color: #334155; line-height: 1.6; background: #F8FAFC; padding: 10px; border-radius: 4px;">
                     ${window.escapeHTML(rel.descricao_atividades)}
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = '<div style="color: #d9534f; font-size: 14px;">Não foi possível carregar os aprovados. A rota do backend foi adicionada?</div>';
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
    btn.innerHTML = '<span class="spinner" style="border-color: white transparent transparent transparent;"></span> Processando...';
    btn.disabled = true;
    document.getElementById('resultado-ia').style.display = 'none';

    try {
        const res = await window.api.fetchProtected(`/pta/chefia/sintetizar?topico_id=${topicoId}&mes=${mes}&ano=${ano}`, {
            method: 'POST'
        });
        const data = await res.json();

        if (res.ok) {
            document.getElementById('resultado-ia').style.display = 'block';
            document.getElementById('texto-ia').innerText = data.sintese;
            if(!data.sintese.includes('⚠️')) {
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
// IMPORTAÇÃO DE HISTÓRICO EM LOTE
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
    btn.innerHTML = '<span class="spinner" style="border-color: white transparent transparent transparent;"></span> Processando...';
    btn.disabled = true;
    btn.style.backgroundColor = '#94a3b8';

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
        btn.style.backgroundColor = '#00a0fd';
    }
}

// ==========================================
// Detalhes do mês enviado na direita quando usuário comum
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