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
// TELA 1: VISÃO DO PESQUISADOR
// ==========================================
function renderPTAPesquisador() {
    const main = document.getElementById('dynamic-content');
    const dataAtual = new Date();
    
    main.innerHTML = `
        <div class="view-header">
            <h2>Meu Plano de Trabalho (PTA)</h2>
            <p class="text-muted">Registre seu progresso mensal.</p>
        </div>
        
        <div class="card-responsivo">
            <h3 style="margin-bottom: 20px;">Novo Relato de Progresso</h3>
            <form id="form-pta">
                
                <div class="grid-fluida" style="margin-bottom: 20px;">
                    <div>
                        <label>Tópico de Pesquisa</label>
                        <select id="pta-topico" class="form-control" required></select>
                    </div>
                    <div>
                        <label>Mês (1-12)</label>
                        <input type="number" id="pta-mes" class="form-control" value="${dataAtual.getMonth() + 1}" required>
                    </div>
                    <div>
                        <label>Ano</label>
                        <input type="number" id="pta-ano" class="form-control" value="${dataAtual.getFullYear()}" required>
                    </div>
                </div>
                
                <div style="margin-bottom: 25px; padding: 15px; background: #F3F4F6; border-radius: 6px;">
                    <label style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span>Avanço no Mês:</span>
                        <span id="valor-avanco" style="font-weight: bold; color: #2563EB;">50%</span>
                    </label>
                    <input type="range" id="pta-avanco" min="0" max="100" value="50" style="width: 100%;" 
                           oninput="document.getElementById('valor-avanco').innerText = this.value + '%'">
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label>Descrição das Atividades</label>
                    <textarea id="pta-descricao" class="form-control" rows="6" placeholder="Descreva os experimentos realizados..." required></textarea>
                </div>
                
                <button type="submit" class="btn btn-primary">🚀 Enviar para Avaliação</button>
            </form>
        </div>
    `;

    carregarDropdownTopicos('pta-topico');
    document.getElementById('form-pta').addEventListener('submit', enviarRelatorio);
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
            window.UI.showToast("Relatório enviado para a chefia!", "success");
            e.target.reset(); 
            document.getElementById('valor-avanco').innerText = '50%';
        } else {
            window.UI.showToast("Erro ao salvar o relato", "error");
        }
    } catch (err) {
        window.UI.showToast("Falha de conexão.", "error");
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}

// ==========================================
// TELA 2: VISÃO DO COORDENADOR E ADMIN
// ==========================================
async function renderPTACoordenador() {
    const main = document.getElementById('dynamic-content');
    const dataAtual = new Date();

    main.innerHTML = `
        <div class="view-header">
            <h2>Gestão de PTA (Chefia)</h2>
            <p class="text-muted">Aprove relatórios, crie tópicos e gere sínteses com IA.</p>
        </div>

        <div class="grid-fluida" style="margin-bottom: 20px;">
            
            <div class="card-responsivo" style="background: #F8FAFC; border: 1px solid #E2E8F0; margin-bottom: 0;">
                <h4 style="margin-bottom: 15px;">Adicionar Novo Tópico</h4>
                <form id="form-novo-topico">
                    <div style="margin-bottom: 10px;">
                        <label>Título do Tópico</label>
                        <input type="text" id="novo-topico-titulo" class="form-control" placeholder="Ex: Síntese de Grafeno" required>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label>Ano Vigente</label>
                        <input type="number" id="novo-topico-ano" class="form-control" value="${dataAtual.getFullYear()}" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Cadastrar Tópico</button>
                </form>
            </div>

            <div class="card-responsivo" style="background: #FAF5FF; border: 1px solid #E9D5FF; margin-bottom: 0;">
                <h4 style="color: #6B21A8; margin-bottom: 15px;">✨ Síntese Acadêmica (IA)</h4>
                
                <div class="grid-fluida" style="margin-bottom: 15px; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));">
                    <div>
                        <label style="color: #6B21A8; font-size: 12px;">Tópico</label>
                        <select id="ia-topico-id" class="form-control" style="border-color: #D8B4FE;" required></select>
                    </div>
                    <div>
                        <label style="color: #6B21A8; font-size: 12px;">Mês / Ano</label>
                        <div style="display: flex; gap: 5px;">
                            <input type="number" id="filtro-mes" class="form-control" value="${dataAtual.getMonth() + 1}" style="border-color: #D8B4FE;">
                            <input type="number" id="filtro-ano" class="form-control" value="${dataAtual.getFullYear()}" style="border-color: #D8B4FE;">
                        </div>
                    </div>
                </div>
                
                <button class="btn btn-primary" onclick="gerarSinteseIA(event)" style="background: #9333EA; border-color: #9333EA;">
                    Unificar textos aprovados
                </button>
                
                <div id="resultado-ia" style="display: none; background: #fff; border-left: 4px solid #9333EA; padding: 15px; margin-top: 15px; border-radius: 4px;">
                    <strong style="color: #6B21A8;">Relatório Consolidado:</strong>
                    <p id="texto-ia" style="margin-top: 10px; line-height: 1.6;"></p>
                </div>
            </div>
        </div>

        <hr style="margin: 30px 0; border: 0; border-top: 1px solid var(--border-light);">

        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; flex-direction: column; gap: 10px;">
            <h3>Relatórios Pendentes</h3>
            <button class="btn btn-secondary" onclick="carregarPendenciasChefia()"><i class="icon-refresh"></i> Atualizar Fila</button>
        </div>
        
        <div id="lista-pendencias">
            <span class="spinner"></span> Buscando...
        </div>
    `;

    carregarDropdownTopicos('ia-topico-id');
    carregarPendenciasChefia();
    document.getElementById('form-novo-topico').addEventListener('submit', criarTopicoAction);
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
    btn.innerHTML = '<span class="spinner"></span> Salvando...';
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

window.carregarPendenciasChefia = async function() {
    const mes = document.getElementById('filtro-mes').value;
    const ano = document.getElementById('filtro-ano').value;
    const container = document.getElementById('lista-pendencias');

    container.innerHTML = '<span class="spinner"></span> Carregando...';

    try {
        const res = await window.api.fetchProtected(`/pta/chefia/pendentes?mes=${mes}&ano=${ano}`);
        const relatorios = await res.json();

        if (relatorios.length === 0) {
            container.innerHTML = '<div class="card"><p class="text-muted">Nenhum relatório pendente neste período.</p></div>';
            return;
        }

        let html = '';
        relatorios.forEach(rel => {
            html += `
                <div class="card mb-sm" id="card-relatorio-${rel.id}" style="border-left: 4px solid #E5E7EB;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                        <div>
                            <span style="font-size: 12px; color: #6B7280; font-weight: bold;">Pesquisador ID: ${rel.usuario_id} | Tópico ID: ${rel.topico_id}</span>
                            <h4 style="margin-top: 5px;">Avanço: <span style="color: #2563EB;">${rel.percentual_avanco}%</span></h4>
                        </div>
                    </div>
                    <div style="background: #F9FAFB; padding: 15px; border-radius: 6px; margin-bottom: 15px; font-family: monospace;">
                        ${rel.descricao_atividades}
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 10px;">
                        <button class="btn btn-outline-danger" onclick="avaliarRelato(${rel.id}, false)">❌ Rejeitar</button>
                        <button class="btn btn-primary" onclick="avaliarRelato(${rel.id}, true)">✅ Incorporar</button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = '<div class="alert alert-danger">Erro ao carregar dados.</div>';
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
            window.UI.showToast(aprovado ? "Texto incorporado!" : "Devolvido para ajuste.", "success");
            document.getElementById(`card-relatorio-${id}`).style.display = 'none';
        }
    } catch (err) {
        window.UI.showToast("Falha ao avaliar.", "error");
    }
}

window.gerarSinteseIA = async function(event) {
    const topicoId = document.getElementById('ia-topico-id').value;
    const mes = document.getElementById('filtro-mes').value;
    const ano = document.getElementById('filtro-ano').value;

    if (!topicoId) {
        window.UI.showToast("Selecione um tópico na lista.", "error");
        return;
    }

    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Analisando textos...';
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
            window.UI.showToast(data.detail, "error");
        }
    } catch (err) {
        window.UI.showToast("Falha na comunicação com a IA.", "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}