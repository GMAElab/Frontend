// ==========================================
// GESTÃO DE PROCESSOS P&D (processes.js)
// ==========================================

/**
 * Abre o modal de processos e limpa o formulário
 */
window.openProcessModal = function() {
    console.log("--> Função openProcessModal ACIONADA no processes.js"); 
    
    const modal = document.getElementById('processModal');
    if (modal) {
        // Força a exibição sobreposta
        modal.style.display = 'flex';
        modal.style.zIndex = '999999'; 
        modal.style.position = 'fixed';
        document.body.style.overflow = 'hidden'; // Bloqueia scroll do fundo
    } else {
        console.error("ERRO: Elemento 'processModal' não encontrado no HTML!");
    }
    
    const form = document.getElementById('processForm');
    if (form) form.reset();

    // Inicia sempre na primeira aba (Planeamento)
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
        document.body.style.overflow = 'auto'; // Devolve o scroll
    }
};

/**
 * Lógica de navegação entre as abas do formulário (Tabs)
 */
window.openTab = function(evt, tabName) {
    // Esconder todos os conteúdos de abas
    const tabContents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].style.display = "none";
    }

    // Remover estado ativo de todos os botões
    const tabBtns = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < tabBtns.length; i++) {
        tabBtns[i].classList.remove("active");
        tabBtns[i].style.fontWeight = "normal";
        tabBtns[i].style.borderBottom = "none";
    }

    // Mostrar a aba selecionada
    const targetTab = document.getElementById(tabName);
    if (targetTab) targetTab.style.display = "block";
    
    // Destacar o botão clicado
    evt.currentTarget.classList.add("active");
    evt.currentTarget.style.fontWeight = "bold";
    evt.currentTarget.style.borderBottom = "3px solid #0056b3";
};

/**
 * Busca a lista de processos no Backend e renderiza a tabela
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
 * Renderiza dinamicamente as linhas da tabela de processos
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
                <button onclick="viewProcessDetails(${proc.id})" class="btn btn-outline-primary btn-sm">👁️ Ver Dossiê</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Captura os dados do formulário e envia para a API (POST)
 */
async function handleSaveProcess(event) {
    event.preventDefault();

    // Captura os 14 campos distribuídos pelas 3 abas
    const processData = {
        // Aba 1: Planeamento
        nome_processo: document.getElementById('proc_nome').value,
        responsavel: document.getElementById('proc_responsavel').value,
        objetivo_fase: document.getElementById('proc_objetivo').value,
        visao_geral: document.getElementById('proc_visao').value,
        equipe: document.getElementById('proc_equipe').value,
        escopo: document.getElementById('proc_escopo').value,
        
        // Aba 2: Execução
        definicao_processos: document.getElementById('proc_definicao').value,
        fluxograma_url: document.getElementById('proc_fluxograma').value,
        detalhamento_etapas: document.getElementById('proc_etapas').value,
        
        // Aba 3: Resultados & Anexos
        indicadores_desempenho: document.getElementById('proc_indicadores').value,
        melhorias_sugeridas: document.getElementById('proc_melhorias').value,
        licoes_aprendidas: document.getElementById('proc_licoes').value,
        anexos_url: document.getElementById('proc_anexos').value,
        status: document.getElementById('proc_status').value
    };

    try {
        const response = await api.fetchProtected('/processes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(processData)
        });

        if (!response.ok) throw new Error('Falha ao salvar o processo no servidor');

        // Sucesso: Fecha modal, limpa campos e atualiza a lista
        window.closeProcessModal();
        loadProcessesTable();
        
        if (window.UI) UI.showToast("Processo P&D guardado com sucesso!", "success");

    } catch (error) {
        console.error("Erro ao salvar:", error);
        if (window.UI) UI.showToast("Erro ao comunicar com o servidor", "error");
    }
}

function viewProcessDetails(id) {
    alert(` ${id} (Funcionalidade em desenvolvimento)`);
}