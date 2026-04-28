window.openProcessModal = async function() {
    console.log("--> Executando abertura visual do modal..."); 
    
    const modal = document.getElementById('processModal');
    if (modal) {
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('opacity', '1', 'important');
        modal.style.setProperty('visibility', 'visible', 'important');
        document.body.style.overflow = 'hidden';
    } else {
        console.error("ERRO: Elemento 'processModal' não encontrado no HTML!");
    }
    
    const form = document.getElementById('processForm');
    if (form) form.reset();

    const firstTab = document.querySelector('.tab-btn');
    if (firstTab) firstTab.click();
    const userString = localStorage.getItem('user_data');
    let nomeLogado = '';
    if (userString) {
        const user = JSON.parse(userString);
        nomeLogado = user.nome;
        const inputResp = document.getElementById('proc-resp');
        if (inputResp) inputResp.value = nomeLogado;
    }
    const equipeInput = document.getElementById('proc-equipe');
    if (equipeInput) {
        equipeInput.style.display = 'none';
        let containerEquipe = document.getElementById('smart-equipe-container');
        if (!containerEquipe) {
            containerEquipe = document.createElement('div');
            containerEquipe.id = 'smart-equipe-container';
            equipeInput.parentNode.insertBefore(containerEquipe, equipeInput.nextSibling);
        }
        
        containerEquipe.innerHTML = '<span class="spinner" style="width: 15px; height: 15px;"></span> <span style="font-size:13px;">Carregando equipe...</span>';

        try {
            const res = await window.api.fetchProtected('/usuarios/equipe');
            if (res.ok) {
                const equipe = await res.json();
                let htmlEquipe = '<div style="display:flex; flex-wrap:wrap; gap:8px; margin-top: 10px;">';
                
                equipe.forEach(membro => {
                    if (membro.nome !== nomeLogado) {
                        htmlEquipe += `
                        <label style="background: #F3F4F6; color: #374151; padding: 6px 12px; border-radius: 20px; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 5px; border: 1px solid #E5E7EB; user-select: none;">
                            <input type="checkbox" name="smart_equipe_cb" value="${membro.nome}" style="cursor: pointer;">
                            ${membro.nome}
                        </label>`;
                    }
                });
                htmlEquipe += '</div>';
                containerEquipe.innerHTML = htmlEquipe;
            }
        } catch (err) {
            containerEquipe.innerHTML = '<span style="color:red; font-size: 12px;">Falha ao carregar lista de equipe.</span>';
        }
    }
};

window.closeProcessModal = function() {
    const modal = document.getElementById('processModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; 
    }
};

window.openTab = function(evt, tabName) {
    const tabContents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].style.display = "none";
    }

    const tabBtns = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < tabBtns.length; i++) {
        tabBtns[i].classList.remove("active");
        tabBtns[i].style.borderBottom = "none";
        tabBtns[i].style.fontWeight = "normal";
    }

    const targetTab = document.getElementById(tabName);
    if (targetTab) targetTab.style.display = "block";
    
    evt.currentTarget.classList.add("active");
    evt.currentTarget.style.borderBottom = "3px solid #0056b3";
    evt.currentTarget.style.fontWeight = "bold";
};

async function loadProcessesTable() {
    try {
        const response = await window.api.fetchProtected('/processes');
        if (!response.ok) throw new Error('Falha ao carregar processos');
        const processes = await response.json();
        renderProcesses(processes);
    } catch (error) {
        console.error("Erro ao carregar tabela:", error);
        if (window.UI) window.UI.showToast("Erro ao carregar lista de processos", "error");
    }
}

function renderProcesses(processes) {
    const tbody = document.getElementById('processesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (processes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Nenhum processo registado ainda.</td></tr>';
        return;
    }

    processes.forEach(proc => {
        const row = document.createElement('tr');
        const dataFormatada = new Date(proc.data_registro).toLocaleDateString('pt-BR');
        const statusFormatado = (proc.status || 'rascunho').replace('_', ' ').toUpperCase();

        row.innerHTML = `
            <td><strong>${proc.nome_processo}</strong></td>
            <td>${proc.responsavel || 'Não definido'}</td>
            <td><span class="status-badge status-${proc.status}">${statusFormatado}</span></td>
            <td>${dataFormatada}</td>
            <td style="display:flex; gap: 6px; flex-wrap:wrap; justify-content:flex-end;">
                <button onclick="viewProcessDetails(${proc.id})" class="btn btn-outline-primary btn-sm">📄 Detalhes e Notas</button>
                <button onclick="openDeepView('processes', ${proc.id}, 'Processo')" class="btn btn-secondary btn-sm">✏️ Editar</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function handleSaveProcess(event) {
    event.preventDefault();
    const checkboxes = document.querySelectorAll('input[name="smart_equipe_cb"]:checked');
    const equipeSelecionada = Array.from(checkboxes).map(cb => cb.value).join(', ');
    const inputTextoOriginal = document.getElementById('proc-equipe').value;
    const equipeFinal = equipeSelecionada ? equipeSelecionada : inputTextoOriginal;

    try {
        const processData = {
            nome_processo: document.getElementById('proc-nome').value,
            responsavel: document.getElementById('proc-resp').value, 
            objetivo_fase: document.getElementById('proc-objetivo').value,
            visao_geral: document.getElementById('proc-visao').value,
            equipe: equipeFinal, 
            detalhamento_etapas: document.getElementById('proc-etapas').value,
            indicadores_desempenho: document.getElementById('proc-indicadores').value,
            anexos_url: document.getElementById('proc-anexos').value,
            status: document.getElementById('proc-status').value || "Em Desenvolvimento" 
        };

        const response = await window.api.fetchProtected('/processes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(processData)
        });

        if (!response.ok) throw new Error('Erro ao salvar');

        window.closeProcessModal();
        if (typeof loadProcessesTable === 'function') loadProcessesTable();
        window.UI.showToast("Processo salvo com sucesso!", "success");

    } catch (error) {
        console.error("Erro ao salvar:", error);
        window.UI.showToast("Falha ao salvar processo. Verifique os campos.", "error");
    }
}

// ==========================================
// DETALHES DO PROCESSO
// ==========================================
window.viewProcessDetails = async function(id) {
    window.UI.showToast("Buscando detalhes do processo...", "info");
    try {
        // 1. Busca os dados do processo
        const resProc = await window.api.fetchProtected(`/processes/${id}`);
        if (!resProc.ok) throw new Error("Erro ao buscar dados do processo.");
        const proc = await resProc.json();
        let atividades = [];
        try {
            const resAct = await window.api.fetchProtected(`/processes/${id}/activities`);
            if (resAct.ok) atividades = await resAct.json();
        } catch (e) {
            console.log("Ainda sem histórico ou erro ao buscar atividades.");
        }

        renderProcessDetailsModal(proc, atividades);
    } catch (err) {
        window.UI.showToast("Falha ao abrir detalhes.", "error");
    }
};

window.renderProcessDetailsModal = function(proc, atividades) {
    const oldModal = document.getElementById('processDetailsModal');
    if (oldModal) oldModal.remove();

    // Constrói o HTML do histórico (Notas)
    let actHtml = atividades.map(a => `
        <div style="border-left: 3px solid var(--primary); padding-left: 12px; margin-bottom: 15px;">
            <div style="font-size: 11px; color: #64748B; font-weight:bold; margin-bottom: 3px;">📅 ${new Date(a.entry_date).toLocaleDateString('pt-BR')} às ${new Date(a.entry_date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</div>
            <strong style="display:block; font-size: 14px; color: #1E293B;">${a.title}</strong>
            <p style="margin: 5px 0 0 0; font-size: 13px; color: #475569;">${a.note}</p>
        </div>
    `).join('');
    
    if(!actHtml) actHtml = '<p style="color:#94A3B8; font-size:13px; text-align:center; padding:20px;">Nenhuma anotação registrada ainda. Crie a primeira abaixo!</p>';

    const modalHTML = `
    <div id="processDetailsModal" class="modal-overlay" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 999999; justify-content: center; align-items: center;">
        <div class="modal-content" style="background: white; padding: 0; border-radius: 12px; width: 95%; max-width: 1000px; max-height: 90vh; overflow-y: auto; display: flex; flex-wrap: wrap; box-shadow: 0 10px 40px rgba(0,0,0,0.6);">

            <div style="width: 100%; padding: 20px 25px; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: white; z-index: 10;">
                <div>
                    <h2 style="margin:0; color:#0F172A; font-size: 20px;">${proc.nome_processo || 'Processo Sem Nome'}</h2>
                    <span style="font-size: 13px; color: #64748B;">Responsável: <strong>${proc.responsavel || 'N/A'}</strong> | Equipe: ${proc.equipe || 'N/A'}</span>
                </div>
                <div style="display:flex; align-items:center; gap: 15px;">
                    <span class="badge" style="background: #e7f3ff; color: #004080; padding: 6px 12px; border-radius: 6px; font-weight:bold;">${(proc.status || 'RASCUNHO').toUpperCase()}</span>
                    <button onclick="document.getElementById('processDetailsModal').remove()" style="background:none; border:none; font-size:28px; cursor:pointer; color:#94A3B8; line-height: 1;">&times;</button>
                </div>
            </div>

            <div style="display: flex; flex-wrap: wrap; width: 100%; gap: 0;">
                
                <div style="flex: 2 1 400px; padding: 25px; border-right: 1px solid #E2E8F0;">
                    
                    <h4 style="color:#1E293B; margin-bottom: 8px; font-size: 14px;">Visão Geral</h4>
                    <div style="background:#F8FAFC; padding:15px; border-radius:8px; font-size:13px; color: #334155; margin-bottom:20px;">${proc.visao_geral || 'Nenhuma visão geral definida.'}</div>

                    <h4 style="color:#1E293B; margin-bottom: 8px; font-size: 14px;">Objetivo da Fase</h4>
                    <div style="background:#F8FAFC; padding:15px; border-radius:8px; font-size:13px; color: #334155; margin-bottom:20px;">${proc.objetivo_fase || 'Nenhum objetivo definido.'}</div>

                    <h4 style="color:#1E293B; margin-bottom: 8px; font-size: 14px;">Detalhamento das Etapas</h4>
                    <div style="background:#F8FAFC; padding:15px; border-radius:8px; font-size:13px; color: #334155; margin-bottom:20px; white-space:pre-wrap;">${proc.detalhamento_etapas || 'Nenhuma etapa registrada.'}</div>

                    <h4 style="color:#1E293B; margin-bottom: 8px; font-size: 14px;">Indicadores de Desempenho</h4>
                    <div style="background:#F8FAFC; padding:15px; border-radius:8px; font-size:13px; color: #334155; margin-bottom:20px; white-space:pre-wrap;">${proc.indicadores_desempenho || 'Nenhum indicador registrado.'}</div>
                </div>

                <div style="flex: 1 1 300px; padding: 25px; background: #F8FAFC;">
                    <h3 style="margin:0 0 20px 0; font-size:16px; color:#0F172A; display:flex; align-items:center; gap:8px;">
                        <span>📋 Rastreabilidade</span>
                    </h3>

                    <div style="max-height: 400px; overflow-y:auto; margin-bottom: 25px; padding-right: 5px;">
                        ${actHtml}
                    </div>

                    <form onsubmit="submitProcessActivity(event, ${proc.id})" style="background:white; padding:18px; border-radius:8px; border:1px solid #E2E8F0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                        <h4 style="margin:0 0 12px 0; font-size:14px; color:#1E293B;">+ Adicionar Atividade</h4>
                        <input type="text" id="act-title" placeholder="Título (Ex: Teste Finalizado)" required class="form-control" style="width:100%; padding:10px; margin-bottom:12px; font-size:13px;">
                        <textarea id="act-note" placeholder="Descreva os resultados ou o que foi feito..." required class="form-control" rows="3" style="width:100%; padding:10px; margin-bottom:12px; font-size:13px;"></textarea>
                        <button type="submit" class="btn btn-primary" style="width:100%; font-weight:bold; padding: 10px;">Registrar na Linha do Tempo</button>
                    </form>
                </div>

            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

window.submitProcessActivity = async function(e, processId) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = "Salvando..."; btn.disabled = true;

    const payload = {
        title: document.getElementById('act-title').value,
        note: document.getElementById('act-note').value
    };

    try {
        const res = await window.api.fetchProtected(`/processes/${processId}/activities`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Erro ao salvar nota");

        window.UI.showToast("Atividade registrada na linha do tempo!", "success");
        viewProcessDetails(processId);
    } catch(err) {
        window.UI.showToast("Falha ao registrar atividade.", "error");
        btn.innerText = originalText; btn.disabled = false;
    }
};