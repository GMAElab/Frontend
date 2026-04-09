document.addEventListener('viewChanged', (e) => {
    if (e.detail.view === 'pta') routerPTA();
});

// ==========================================
// ROTEADOR INTELIGENTE DE ACESSO
// ==========================================
function routerPTA() {
    const userString = localStorage.getItem('user_data');
    if (!userString) return;

    const user = JSON.parse(userString);
    
    if (user.role === 'coordenador' || user.role === 'admin') {
        renderPTACoordenador();
    }
    else {
        renderPTAPesquisador();
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
            <h2>Plano de Trabalho Anual (PTA)</h2>
            
        </div>
        
        <div class="card mt-md" style="max-width: 800px;">
            <h3 style="margin-bottom: 20px; color: #1F2937;">Preencher PTA</h3>
            <form id="form-pta">
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div>
                        <label>ID do Tópico</label>
                        <input type="number" id="pta-topico" class="form-control" value="1" required>
                    </div>
                    <div>
                        <label>Mês Referência</label>
                        <input type="number" id="pta-mes" class="form-control" value="${dataAtual.getMonth() + 1}" required>
                    </div>
                    <div>
                        <label>Ano Referência</label>
                        <input type="number" id="pta-ano" class="form-control" value="${dataAtual.getFullYear()}" required>
                    </div>
                </div>
                
                <div style="margin-bottom: 25px; padding: 15px; background: #F3F4F6; border-radius: 6px;">
                    <label style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span>Avanço no Mês:</span>
                        <span id="valor-avanco" style="font-weight: bold; color: #2563EB; font-size: 18px;">50%</span>
                    </label>
                    <input type="range" id="pta-avanco" min="0" max="100" value="50" style="width: 100%; cursor: pointer;" 
                           oninput="document.getElementById('valor-avanco').innerText = this.value + '%'">
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label>Descrição das Atividades (Relatório Científico)</label>
                    <textarea id="pta-descricao" class="form-control" rows="6" placeholder="Descreva os experimentos realizados..." required></textarea>
                </div>
                
                <button type="submit" class="btn btn-primary" style="width: 100%; font-size: 16px; padding: 12px;">
                     Enviar PTA
                </button>
            </form>
        </div>
    `;

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
            window.UI.showToast("Relatório enviado!", "success");
            e.target.reset(); 
            document.getElementById('valor-avanco').innerText = '50%';
        } else {
            const data = await res.json();
            window.UI.showToast(data.detail || "Erro ao salvar", "error");
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
        <div class="view-header" style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h2>PTA</h2>
                <p class="text-muted">Relatório mensal para as atividades realizadas</p>
            </div>
            <div style="display: flex; gap: 10px;">
                <input type="number" id="filtro-mes" class="form-control" value="${dataAtual.getMonth() + 1}" style="width: 80px;">
                <input type="number" id="filtro-ano" class="form-control" value="${dataAtual.getFullYear()}" style="width: 100px;">
                <button class="btn btn-secondary" onclick="carregarPendenciasChefia()">Filtrar</button>
            </div>
        </div>

        <hr class="mt-md mb-md" style="border: 0; border-top: 1px solid var(--border-light);">

        <div style="background: #FAF5FF; border: 1px solid #E9D5FF; padding: 20px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h4 style="color: #6B21A8; margin-bottom: 5px;">IA para a criação do texto de cada tópico para o PTA</h4>
                <p style="color: #9333EA; font-size: 14px; margin: 0;">Gere um relatório consolidado com textos aprovados.</p>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
                <input type="number" id="ia-topico-id" class="form-control" placeholder="ID Tópico" style="width: 100px;">
                <button class="btn btn-primary" onclick="gerarSinteseIA()" style="background: #9333EA; border-color: #9333EA;">
                    ✨ Unificar textos aprovados com a IA
                </button>
            </div>
        </div>

        <div id="resultado-ia" style="display: none; background: hsl(0, 0%, 100%); border-left: 4px solid #9333EA; padding: 15px; margin-bottom: 20px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <strong style="color: #6B21A8;">PTA unificado:</strong>
            <p id="texto-ia" style="margin-top: 10px; line-height: 1.6;"></p>
        </div>

        <h3>PTAs Pendentes</h3>
        <div id="lista-pendencias" class="mt-sm">
            <span class="spinner"></span> Buscando...
        </div>
    `;

    carregarPendenciasChefia();
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
            container.innerHTML = '<div class="card"><p class="text-muted">Nenhum pta foi encontrado.</p></div>';
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
                        <button class="btn btn-outline-danger" onclick="avaliarRelato(${rel.id}, false)">❌</button>
                        <button class="btn btn-primary" onclick="avaliarRelato(${rel.id}, true)">✅</button>
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
            window.UI.showToast(aprovado ? "Texto incorporado!" : "Devolvido.", "success");
            document.getElementById(`card-relatorio-${id}`).style.display = 'none';
        }
    } catch (err) {
        window.UI.showToast("Falha ao avaliar.", "error");
    }
}

window.gerarSinteseIA = async function() {
    const mes = document.getElementById('filtro-mes').value;
    const ano = document.getElementById('filtro-ano').value;
    const topicoId = document.getElementById('ia-topico-id').value;

    if (!topicoId) {
        window.UI.showToast("Informe o ID do Tópico", "error");
        return;
    }

    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span>...';
    btn.disabled = true;

    try {
        const res = await window.api.fetchProtected(`/pta/chefia/sintetizar?topico_id=${topicoId}&mes=${mes}&ano=${ano}`, {
            method: 'POST'
        });
        const data = await res.json();

        if (res.ok) {
            document.getElementById('resultado-ia').style.display = 'block';
            document.getElementById('texto-ia').innerText = data.sintese;
            window.UI.showToast("Texto gerado!", "success");
        } else {
            window.UI.showToast(data.detail, "error");
        }
    } catch (err) {
        window.UI.showToast("Falha na criação do texto.", "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}