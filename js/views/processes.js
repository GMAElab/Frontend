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
                <button onclick="viewProcessDetails(${proc.id})" class="btn btn-outline-primary btn-sm">Detalhes do processo</button>
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

function viewProcessDetails(id) {
    alert(`Visualizar processo ID: ${id} (Em desenvolvimento)`);
}