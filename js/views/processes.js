/**
 * Abre o modal de processos e limpa o formulário
 */
window.openProcessModal = function() {
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
};

/**
 * Fecha o modal de processos
 */
window.closeProcessModal = function() {
    const modal = document.getElementById('processModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; 
    }
};

/**
 * Navegação entre abas
 */
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

/**
 * Carrega a tabela de processos
 */
async function loadProcessesTable() {
    try {
        const response = await api.fetchProtected('/processes');
        if (!response.ok) throw new Error('Falha ao carregar processos');
        const processes = await response.json();
        renderProcesses(processes);
    } catch (error) {
        console.error("Erro ao carregar tabela:", error);
        if (window.UI) UI.showToast("Erro ao carregar lista de processos", "error");
    }
}

/**
 * Renderiza os dados na tabela
 */
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
            <td>
                <button onclick="viewProcessDetails(${proc.id})" class="btn btn-outline-primary btn-sm">Detalhes do processo</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Salvar o processo
 */
async function handleSaveProcess(event) {
    event.preventDefault();
    
    try {
        const processData = {
            nome_processo: document.getElementById('proc-nome').value,
            responsavel: document.getElementById('proc-resp').value,
            objetivo_fase: document.getElementById('proc-objetivo').value,
            visao_geral: document.getElementById('proc-visao').value,
            equipe: document.getElementById('proc-equipe').value,
            detalhamento_etapas: document.getElementById('proc-etapas').value,
            indicadores_desempenho: document.getElementById('proc-indicadores').value,
            anexos_url: document.getElementById('proc-anexos').value,
            status: document.getElementById('proc-status').value
        };

        const response = await api.fetchProtected('/processes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(processData)
        });

        if (!response.ok) throw new Error('Erro ao salvar');

        window.closeProcessModal();
        if (typeof loadProcessesTable === 'function') loadProcessesTable();
        UI.showToast("Processo salvo com sucesso!", "success");

    } catch (error) {
        console.error("Erro ao salvar:", error);
        UI.showToast("Falha ao salvar processo. Verifique os campos.", "error");
    }
}
function viewProcessDetails(id) {
    alert(`Visualizar processo ID: ${id} (Em desenvolvimento)`);
}