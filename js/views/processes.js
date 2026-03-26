// ==========================================
// GESTÃO DE PROCESSOS P&D (processes.js)
// ==========================================

// Função para abrir o modal
function openProcessModal() {
    document.getElementById('processForm').reset();
    document.getElementById('processModal').style.display = 'flex';
    // Resetar para a primeira aba sempre que abrir
    document.querySelector('.tab-btn').click();
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
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.classList.add("active");
    evt.currentTarget.style.fontWeight = "bold";
    evt.currentTarget.style.borderBottom = "3px solid #0056b3"; // Cor de destaque (ajuste para a cor do seu sistema)
}

// Buscar processos do Backend e renderizar na tabela
async function loadProcessesTable() {
    try {
        // Assume-se que api.fetchProtected está disponível no seu escopo (como no equipments.js)
        // Caso use fetch direto, adapte para a sua função de requisição autenticada
        const response = await fetchProtected('/processes');
        
        if (!response.ok) throw new Error('Falha ao carregar processos');
        
        const processes = await response.json();
        renderProcesses(processes);
    } catch (error) {
        console.error("Erro:", error);
        // Exibir Toast ou alerta de erro aqui
    }
}

// Renderizar a tabela no HTML
function renderProcesses(processes) {
    const tbody = document.getElementById('processesTableBody'); // Certifique-se que sua tabela tem este ID
    if (!tbody) return;

    tbody.innerHTML = '';

    if (processes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum processo registado ainda.</td></tr>';
        return;
    }

    processes.forEach(proc => {
        const row = document.createElement('tr');
        
        // Formatação simples de data
        const dataFormatada = new Date(proc.data_registro).toLocaleDateString('pt-PT');

        row.innerHTML = `
            <td><strong>${proc.nome_processo}</strong></td>
            <td>${proc.responsavel || 'Não definido'}</td>
            <td><span class="status-badge status-${proc.status}">${proc.status.replace('_', ' ').toUpperCase()}</span></td>
            <td>${dataFormatada}</td>
            <td>
                <button onclick="viewProcessDetails(${proc.id})" class="btn-icon">👁️ Ver Dossiê</button>
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
        const response = await fetchProtected('/processes', {
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
        
        // Se tiver função de Toast global, chame-a aqui
        alert("Processo P&D salvo com sucesso!"); 

    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao comunicar com o servidor. Verifique a consola.");
    }
}

function viewProcessDetails(id) {
    // Aqui no futuro podemos abrir uma página exclusiva ou modal gigante com os detalhes!
    alert(`Visualizar dossiê completo do processo ID: ${id} (Em desenvolvimento)`);
}

// Inicializar quando o script for carregado
document.addEventListener('DOMContentLoaded', () => {
    // Só carrega a tabela se a View estiver ativa (opcional, dependendo de como funciona o seu ui.js)
    if (document.getElementById('processesTableBody')) {
        loadProcessesTable();
    }
});