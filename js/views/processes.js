// ==========================================
// GESTÃO DE PROCESSOS P&D (processes.js)
// ==========================================

// Função para abrir o modal
function openProcessModal() {
    document.getElementById('processForm').reset();
    document.getElementById('processModal').style.display = 'flex';
    
    // Resetar para a primeira aba sempre que abrir
    const firstTab = document.querySelector('.tab-btn');
    if (firstTab) firstTab.click();
}

// Função para fechar o modal
function closeProcessModal() {
    document.getElementById('processModal').style.display = 'none';
}

// Lógica das Abas (Tabs)
function openTab(evt, tabName) {
    // Esconder todo o conteúdo das abas
    const tabContents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].style.display = "none";
    }

    // Remover a classe "active" de todos os botões
    const tabBtns = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < tabBtns.length; i++) {
        tabBtns[i].classList.remove("active");
        // Estilo visual básico para botões inativos
        tabBtns[i].style.fontWeight = "normal";
        tabBtns[i].style.borderBottom = "none";
    }

    // Mostrar a aba atual e adicionar a classe "active" no botão clicado
    const targetTab = document.getElementById(tabName);
    if (targetTab) targetTab.style.display = "block";
    
    evt.currentTarget.classList.add("active");
    evt.currentTarget.style.fontWeight = "bold";
    evt.currentTarget.style.borderBottom = "3px solid #0056b3"; // Cor de destaque
}

// Buscar processos do Backend e renderizar na tabela
async function loadProcessesTable() {
    try {
        // CORREÇÃO: Usando API.fetchProtected
        const response = await api.fetchProtected('/processes');
        
        if (!response.ok) throw new Error('Falha ao carregar processos');
        
        const processes = await response.json();
        renderProcesses(processes);
    } catch (error) {
        console.error("Erro:", error);
        if (window.UI) UI.showToast("Erro ao carregar processos", "error");
    }
}

// Renderizar a tabela no HTML
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
        
        // Formatação simples de data para o padrão do Brasil/Portugal
        const dataFormatada = new Date(proc.data_registro).toLocaleDateString('pt-BR');
        
        // Formatar o status tirando o underline e deixando maiúsculo
        const statusFormatado = proc.status.replace('_', ' ').toUpperCase();

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

// Salvar um novo processo (Envia o "Canvas" para a API)
async function handleSaveProcess(event) {
    event.preventDefault();

    // Capturar todos os 14 campos do formulário
    const processData = {
        nome_processo: document.getElementById('proc_nome').value,
        responsavel: document.getElementById('proc_responsavel').value,
        objetivo_fase: document.getElementById('proc_objetivo').value,
        visao_geral: document.getElementById('proc_visao').value,
        equipe: document.getElementById('proc_equipe').value,
        escopo: document.getElementById('proc_escopo').value,
        definicao_processos: document.getElementById('proc_definicao').value,
        fluxograma_url: document.getElementById('proc_fluxograma').value,
        detalhamento_etapas: document.getElementById('proc_etapas').value,
        indicadores_desempenho: document.getElementById('proc_indicadores').value,
        melhorias_sugeridas: document.getElementById('proc_melhorias').value,
        licoes_aprendidas: document.getElementById('proc_licoes').value,
        anexos_url: document.getElementById('proc_anexos').value,
        status: document.getElementById('proc_status').value
    };

    try {
        // CORREÇÃO: Usando API.fetchProtected e passando o body convertido em JSON
        const response = await api.fetchProtected('/processes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(processData)
        });

        if (!response.ok) {
            throw new Error('Falha ao salvar o processo');
        }

        // Sucesso! Fechar modal, limpar e recarregar tabela
        closeProcessModal();
        loadProcessesTable();
        
        // Exibe o Toast de sucesso usando o seu controlador UI!
        if (window.UI) UI.showToast("Processo P&D salvo com sucesso!", "success");

    } catch (error) {
        console.error("Erro ao salvar:", error);
        if (window.UI) UI.showToast("Erro ao comunicar com o servidor", "error");
    }
}

function viewProcessDetails(id) {
    // Aqui no futuro faremos um modal para ver o dossiê detalhado
    alert(`Visualizar dossiê completo do processo ID: ${id} (Em desenvolvimento)`);
}