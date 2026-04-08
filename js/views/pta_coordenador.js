document.addEventListener('viewChanged', (e) => {
    if (e.detail.view === 'pta_coordenador') renderChefiaPTA();
});

async function renderChefiaPTA() {
    const main = document.getElementById('dynamic-content');
    const dataAtual = new Date();
    const mesAtual = dataAtual.getMonth() + 1;
    const anoAtual = dataAtual.getFullYear();

    main.innerHTML = `
        <div class="view-header" style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h2>Aprovação de PTA</h2>
                <p class="text-muted">Triagem de relatórios e Síntese por Inteligência Artificial</p>
            </div>
            
            <div style="display: flex; gap: 10px;">
                <input type="number" id="filtro-mes" class="form-control" value="${mesAtual}" min="1" max="12" style="width: 80px;">
                <input type="number" id="filtro-ano" class="form-control" value="${anoAtual}" min="2024" style="width: 100px;">
                <button class="btn btn-secondary" onclick="carregarPendenciasChefia()">Filtrar</button>
            </div>
        </div>

        <hr class="mt-md mb-md" style="border: 0; border-top: 1px solid var(--border-light);">

        <div style="background: #FAF5FF; border: 1px solid #E9D5FF; padding: 20px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h4 style="color: #6B21A8; margin-bottom: 5px;">Motor de Síntese Acadêmica</h4>
                <p style="color: #9333EA; font-size: 14px; margin: 0;">Gere um relatório consolidado com todos os textos que você aprovou neste mês.</p>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
                <input type="number" id="ia-topico-id" class="form-control" placeholder="ID do Tópico" style="width: 120px;" title="ID do Tópico para sintetizar">
                <button class="btn btn-primary" onclick="gerarSinteseIA()" style="background: #9333EA; border-color: #9333EA;">
                    ✨ Gerar Síntese IA
                </button>
            </div>
        </div>

        <div id="resultado-ia" style="display: none; background: #fff; border-left: 4px solid #9333EA; padding: 15px; margin-bottom: 20px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <strong style="color: #6B21A8;">Relatório Consolidado (IA):</strong>
            <p id="texto-ia" style="margin-top: 10px; line-height: 1.6;"></p>
        </div>

        <h3>Relatórios Pendentes de Avaliação</h3>
        <div id="lista-pendencias" class="mt-sm">
            <span class="spinner"></span> Buscando relatórios da equipe...
        </div>
    `;

    carregarPendenciasChefia();
}

// ==========================================
// FUNÇÕES DE COMUNICAÇÃO COM A API
// ==========================================

async function carregarPendenciasChefia() {
    const mes = document.getElementById('filtro-mes').value;
    const ano = document.getElementById('filtro-ano').value;
    const container = document.getElementById('lista-pendencias');

    container.innerHTML = '<span class="spinner"></span> Carregando...';

    try {
        const res = await window.api.fetchProtected(`/pta/chefia/pendentes?mes=${mes}&ano=${ano}`);
        if (!res.ok) throw new Error("Falha ao buscar dados");
        
        const relatorios = await res.json();

        if (relatorios.length === 0) {
            container.innerHTML = '<div class="card"><p class="text-muted">Nenhum relatório aguardando aprovação para este período.</p></div>';
            return;
        }

        let html = '';
        relatorios.forEach(rel => {
            html += `
                <div class="card mb-sm" id="card-relatorio-${rel.id}" style="border-left: 4px solid #E5E7EB;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                        <div>
                            <span style="font-size: 12px; color: #6B7280; font-weight: bold; text-transform: uppercase;">Pesquisador ID: ${rel.usuario_id} | Tópico ID: ${rel.topico_id}</span>
                            <h4 style="margin-top: 5px;">Avanço Reportado: <span style="color: #2563EB;">${rel.percentual_avanco}%</span></h4>
                        </div>
                        <span style="background: #FEFCE8; color: #A16207; padding: 4px 8px; border-radius: 4px; font-size: 12px; height: fit-content;">Aguardando</span>
                    </div>
                    
                    <div style="background: #F9FAFB; padding: 15px; border-radius: 6px; margin-bottom: 15px; font-family: monospace; font-size: 14px;">
                        ${rel.descricao_atividades || 'Nenhuma descrição fornecida.'}
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px;">
                        <button class="btn btn-outline-danger" onclick="avaliarRelato(${rel.id}, false)">❌ Rejeitar (Ajuste)</button>
                        <button class="btn btn-primary" onclick="avaliarRelato(${rel.id}, true)">✅ Incorporar Texto</button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = '<div class="alert alert-danger">Erro de permissão ou falha no servidor. Verifique se você é um Coordenador.</div>';
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
            window.UI.showToast(aprovado ? "Texto incorporado com sucesso!" : "Devolvido para ajuste.", "success");
            // Remove o card da tela com um efeito suave
            const card = document.getElementById(`card-relatorio-${id}`);
            card.style.opacity = '0';
            setTimeout(() => card.remove(), 300);
        } else {
            throw new Error("Erro ao avaliar");
        }
    } catch (err) {
        window.UI.showToast("Falha na comunicação com o servidor.", "error");
    }
}

window.gerarSinteseIA = async function() {
    const mes = document.getElementById('filtro-mes').value;
    const ano = document.getElementById('filtro-ano').value;
    const topicoId = document.getElementById('ia-topico-id').value;

    if (!topicoId) {
        window.UI.showToast("Por favor, informe o ID do Tópico que deseja sintetizar.", "error");
        return;
    }

    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Gerando...';
    btn.disabled = true;

    try {
        const res = await window.api.fetchProtected(`/pta/chefia/sintetizar?topico_id=${topicoId}&mes=${mes}&ano=${ano}`, {
            method: 'POST'
        });

        const data = await res.json();

        if (res.ok) {
            document.getElementById('resultado-ia').style.display = 'block';
            document.getElementById('texto-ia').innerText = data.sintese;
            window.UI.showToast(`Síntese gerada a partir de ${data.textos_processados} textos!`, "success");
        } else {
            window.UI.showToast(data.detail || "Erro ao gerar síntese", "error");
        }
    } catch (err) {
        window.UI.showToast("Falha de conexão com a IA.", "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}