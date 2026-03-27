// ==========================================
// GESTÃO DE PROCESSOS P&D (processes.js)
// ==========================================

window.openProcessModal = function() {
    console.log("--> Função openProcessModal ACIONADA no processes.js"); 
    
    const modal = document.getElementById('processModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; 
    } else {
        console.error("ERRO: Elemento 'processModal' não encontrado no HTML!");
    }
    
    const form = document.getElementById('processForm');
    if (form) {
        form.reset();
    }

    // Aciona a aba inicial
    const firstTab = document.querySelector('.tab-btn');
    if (firstTab) firstTab.click();
};

window.closeProcessModal = function() {
    const modal = document.getElementById('processModal');
    if (modal) {
        modal.classList.remove('active');
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
        tabBtns[i].style.fontWeight = "normal";
        tabBtns[i].style.borderBottom = "none";
    }

    const targetTab = document.getElementById(tabName);
    if (targetTab) targetTab.style.display = "block";
    
    evt.currentTarget.classList.add("active");
    evt.currentTarget.style.fontWeight = "bold";
    evt.currentTarget.style.borderBottom = "3px solid #0056b3";
};

async function loadProcessesTable() {
    try {
        const response = await api.fetchProtected('/processes');
        if (!response.ok) throw new Error('Falha ao carregar processos');
        const processes = await response.json();
        renderProcesses(processes);
    } catch (error) {
        console.error("Erro ao carregar tabela:", error);
        if (window.UI) UI.showToast("Erro ao carregar processos", "error");
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

async function handleSaveProcess(event) {
    event.preventDefault();

    const processData = {
        nome_processo: document.getElementById('proc_nome').value,
        responsavel: document.getElementById('proc_responsavel').value,
        objetivo_fase: document.getElementById('proc_objetivo').value,
        visao_geral: document.getElementById('proc_visao').value,
        // Adicionados campos que podem estar em falta no seu form simplificado para evitar erro de objeto
        equipe: document.getElementById('proc_equipe')?.value || "",
        escopo: document.getElementById('proc_escopo')?.value || "",
        definicao_processos: document.getElementById('proc_definicao')?.value || "",
        status: document.getElementById('proc_status')?.value || "rascunho"
    };

    try {
        const response = await api.fetchProtected('/processes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(processData)
        });

        if (!response.ok) throw new Error('Falha ao salvar o processo');

        window.closeProcessModal();
        loadProcessesTable();
        
        if (window.UI) UI.showToast("Processo P&D salvo com sucesso!", "success");
    } catch (error) {
        console.error("Erro ao salvar:", error);
        if (window.UI) UI.showToast("Erro ao comunicar com o servidor", "error");
    }
}

function viewProcessDetails(id) {
    alert(`Visualizar dossiê completo do processo ID: ${id} (Em desenvolvimento)`);
}