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
    } catch (err) {
        select.innerHTML = '<option value="">Erro ao carregar tópicos</option>';
    }
}

// ==========================================
// TELA 1: VISÃO DO PESQUISADOR (COM HISTÓRICO)
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
                <h3 style="margin-bottom: 20px; color: #1e293b; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">📝 Novo Relatório</h3>
                <form id="form-pta">
                    <div style="margin-bottom: 15px;">
                        <label style="font-weight: bold; font-size: 14px;">Tópico de Pesquisa:</label>
                        <select id="pta-topico" class="form-control" required style="width: 100%; padding: 8px;"></select>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div>
                            <label style="font-weight: bold; font-size: 14px;">Mês:</label>
                            <input type="number" id="pta-mes" class="form-control" value="${dataAtual.getMonth() + 1}" required style="width: 100%; padding: 8px;">
                        </div>
                        <div>
                            <label style="font-weight: bold; font-size: 14px;">Ano:</label>
                            <input type="number" id="pta-ano" class="form-control" value="${dataAtual.getFullYear()}" required style="width: 100%; padding: 8px;">
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 25px; padding: 15px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px;">
                        <label style="display: flex; justify-content: space-between; margin-bottom: 10px; font-weight: bold;">
                            <span>Avanço Geral da Pesquisa:</span>
                            <span id="valor-avanco" style="color: #2563EB;">50%</span>
                        </label>
                        <input type="range" id="pta-avanco" min="0" max="100" value="50" style="width: 100%; cursor: pointer;" 
                               oninput="document.getElementById('valor-avanco').innerText = this.value + '%'">
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="font-weight: bold; font-size: 14px;">Descrição das Atividades no Mês</label>
                        <textarea id="pta-descricao" class="form-control" rows="6" placeholder="Descreva os experimentos, resultados e artigos lidos neste mês..." required style="width: 100%; padding: 8px;"></textarea>
                    </div>
                    
                    <button type="submit" class="btn btn-primary" style="width: 100%; font-weight: bold; padding: 10px;">📤 Enviar para Chefia</button>
                </form>
            </div>

            <div class="card-responsivo" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); align-self: start;">
                <h3 style="margin-bottom: 20px; color: #1e293b; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">🕰️ Meus Últimos Envios</h3>
                <div id="meus-ptas-lista" style="display: flex; flex-direction: column; gap: 15px; max-height: 600px; overflow-y: auto; padding-right: 5px;">
                    <span class="spinner"></span> Carregando seu histórico...
                </div>
            </div>

        </div>
    `;

    carregarDropdownTopicos('pta-topico');
    carregarMeusPTAs();
    document.getElementById('form-pta').addEventListener('submit', enviarRelatorio);
}

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

        let html = '';
        relatorios.forEach(rel => {
            const statusColor = rel.status === 'consolidado' ? '#10B981' : '#F59E0B';
            const statusText = rel.status === 'consolidado' ? '✅ Aprovado' : '⏳ Em Avaliação';
            
            html += `
                <div style="border: 1px solid #E2E8F0; border-left: 4px solid ${statusColor}; border-radius: 6px; padding: 15px; background: #F8FAFC;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <strong style="color: #334155;">Mês ${rel.mes_referencia}/${rel.ano_referencia}</strong>
                        <span style="font-size: 12px; font-weight: bold; color: ${statusColor};">${statusText}</span>
                    </div>
                    <div style="font-size: 13px; color: #64748B; margin-bottom: 8px;">Tópico ID: ${rel.topico_id}</div>
                    
                    <div style="width: 100%; background: #E2E8F0; border-radius: 4px; height: 8px; margin-bottom: 10px;">
                        <div style="background: #3B82F6; height: 100%; border-radius: 4px; width: ${rel.percentual_avanco}%;"></div>
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
// TELA 2: VISÃO DO ADMIN (CALENDÁRIO INTERATIVO)
// ==========================================
function renderPTACoordenador() {
    const main = document.getElementById('dynamic-content');
    const dataAtual = new Date();
    const anoAtual = dataAtual.getFullYear();

    main.innerHTML = `
        <div class="view-header">
            <h2>Gestão de PTA e Síntese</h2>
            <p class="text-muted">Crie tópicos e navegue pelo calendário para avaliar relatórios e gerar textos com IA.</p>
        </div>

        <div class="grid-admin">
            <div class="card-responsivo" style="background: white; border-radius: 8px; padding: 20px; border-top: 4px solid #10B981;">
                <h4 style="margin-bottom: 15px; color: #047857;">+ Novo Tópico de Pesquisa</h4>
                <form id="form-novo-topico">
                    <div style="margin-bottom: 10px;">
                        <label style="font-size: 13px; font-weight:bold;">Título do Tópico:</label>
                        <input type="text" id="novo-topico-titulo" class="form-control" placeholder="Ex: Síntese de Grafeno" required>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="font-size: 13px; font-weight:bold;">Ano Vigente:</label>
                        <input type="number" id="novo-topico-ano" class="form-control" value="${anoAtual}" required>
                    </div>
                    <button type="submit" class="btn btn-primary" style="background: #10B981; border: none; width: 100%;">Cadastrar Tópico</button>
                </form>
            </div>

            <div class="card-responsivo" style="background: white; border-radius: 8px; padding: 20px; border-top: 4px solid #3B82F6;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h4 style="color: #1E3A8A; margin: 0;">📅 Navegação do Ano</h4>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <button class="btn btn-sm btn-secondary" onclick="mudarAnoCalendario(-1)">◀</button>
                        <h3 id="calendario-ano-display" style="margin: 0; min-width: 60px; text-align: center;">${anoAtual}</h3>
                        <button class="btn btn-sm btn-secondary" onclick="mudarAnoCalendario(1)">▶</button>
                    </div>
                </div>
                
                <div class="meses-grid" id="grid-meses">
                    </div>
            </div>
        </div>

        <div id="painel-mes-detalhe" class="painel-detalhe">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #F1F5F9; padding-bottom: 15px; margin-bottom: 20px;">
                <h3 id="painel-titulo" style="margin: 0; color: #0F172A;">Progresso do Mês</h3>
                <button class="btn btn-sm btn-secondary" onclick="fecharPainelMes()">✖ Fechar</button>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                
                <div>
                    <h4 style="color: #F59E0B; margin-bottom: 15px;">⏳ Relatórios Pendentes</h4>
                    <div id="lista-pendencias" style="max-height: 400px; overflow-y: auto; padding-right: 5px;">
                        Clique em um mês para carregar.
                    </div>
                </div>

                <div style="background: #F0FDF4; padding: 20px; border-radius: 8px; border: 1px solid #BBF7D0;">
                    <h4 style="color: #166534; margin-bottom: 10px;">✨ Gerar Síntese (Inteligência Artificial)</h4>
                    <p style="font-size: 13px; color: #15803D; margin-bottom: 15px;">A IA irá ler todos os relatórios <b>aprovados</b> deste mês e gerar um parágrafo consolidado.</p>
                    
                    <label style="font-size: 13px; font-weight:bold; color: #166534;">Escolha o Tópico para resumir:</label>
                    <select id="ia-topico-id" class="form-control" style="border-color: #22C55E; margin-bottom: 15px;"></select>
                    
                    <button id="btn-gerar-ia" class="btn btn-primary" onclick="gerarSinteseIA()" style="background: #166534; border: none; width: 100%; font-weight:bold;">
                        🧠 Unificar textos aprovados
                    </button>
                    
                    <div id="resultado-ia" style="display: none; background: white; border-left: 4px solid #166534; padding: 15px; margin-top: 15px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        <strong style="color: #166534;">Texto Consolidado (Copie e cole no relatório oficial):</strong>
                        <p id="texto-ia" style="margin-top: 10px; line-height: 1.6; color: #334155; font-size: 14px;"></p>
                    </div>
                </div>

            </div>
        </div>
    `;

    document.getElementById('form-novo-topico').addEventListener('submit', criarTopicoAction);
    window.estadoCalendario = { ano: anoAtual, mesSelecionado: null };
    renderizarMeses();
    carregarDropdownTopicos('ia-topico-id'); 
}

// ==========================================
// FUNÇÕES DO CALENDÁRIO E PAINEL (ADMIN)
// ==========================================
window.mudarAnoCalendario = function(delta) {
    window.estadoCalendario.ano += delta;
    document.getElementById('calendario-ano-display').innerText = window.estadoCalendario.ano;
    window.estadoCalendario.mesSelecionado = null; 
    document.getElementById('painel-mes-detalhe').style.display = 'none';
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
    document.getElementById('painel-titulo').innerText = `Gestão do Mês: ${nomeMes} / ${window.estadoCalendario.ano}`;
    document.getElementById('resultado-ia').style.display = 'none'; 

    carregarPendenciasChefia(mes, window.estadoCalendario.ano);
}

window.fecharPainelMes = function() {
    document.getElementById('painel-mes-detalhe').style.display = 'none';
    window.estadoCalendario.mesSelecionado = null;
    document.querySelectorAll('.mes-card').forEach(el => el.classList.remove('active'));
}

window.carregarPendenciasChefia = async function(mes, ano) {
    const container = document.getElementById('lista-pendencias');
    container.innerHTML = '<span class="spinner"></span> Buscando relatórios...';

    try {
        const res = await window.api.fetchProtected(`/pta/chefia/pendentes?mes=${mes}&ano=${ano}`);
        const relatorios = await res.json();

        if (relatorios.length === 0) {
            container.innerHTML = '<div style="background:#F8FAFC; padding: 20px; border-radius: 6px; text-align:center; color:#94A3B8;">Nenhum relatório aguardando aprovação.</div>';
            return;
        }

        let html = '';
        relatorios.forEach(rel => {
            html += `
                <div class="card mb-sm" id="card-relatorio-${rel.id}" style="border-left: 4px solid #F59E0B; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="font-size: 12px; color: #64748B; font-weight: bold;">Pesquisador ID: ${rel.usuario_id} | Tópico: ${rel.topico_id}</span>
                        <span style="font-size: 13px; font-weight: bold; color: #2563EB;">Avanco: ${rel.percentual_avanco}%</span>
                    </div>
                    <div style="background: #F8FAFC; padding: 12px; border-radius: 4px; margin-bottom: 10px; font-size: 13px; color: #334155;">
                        ${rel.descricao_atividades}
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 10px;">
                        <button class="btn btn-sm" style="background:#FEE2E2; color:#DC2626; border:1px solid #FCA5A5; font-weight:bold;" onclick="avaliarRelato(${rel.id}, false)">Devolver ❌</button>
                        <button class="btn btn-sm" style="background:#DCFCE7; color:#16A34A; border:1px solid #86EFAC; font-weight:bold;" onclick="avaliarRelato(${rel.id}, true)">Aprovar ✅</button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = '<div style="color:red;">Erro ao carregar dados.</div>';
    }
}

window.avaliarRelato = async function(id, aprovado) {
    try {
        const res = await window.api.fetchProtected(`/pta/chefia/avaliar/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ aprovado: aprovado })
        });

        if (res.ok) {
            window.UI.showToast(aprovado ? "Relatório Aprovado para Síntese!" : "Devolvido para o pesquisador.", "success");
            const card = document.getElementById(`card-relatorio-${id}`);
            if (card) card.style.display = 'none';
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
        window.UI.showToast("Selecione um tópico na lista acima primeiro.", "error");
        return;
    }
    if (!mes) {
        window.UI.showToast("Erro: Nenhum mês selecionado no calendário.", "error");
        return;
    }

    const btn = document.getElementById('btn-gerar-ia');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner" style="border-color: white transparent transparent transparent;"></span> Analisando...';
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

// ==========================================
// AÇÃO: CRIAR TÓPICO (Coordenador ou ADMIN)
// ==========================================
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