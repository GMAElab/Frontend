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
    
    const previewProc = document.getElementById('preview-proc');
    if (previewProc) previewProc.style.display = 'none';

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
            <td><strong>${window.escapeHTML(proc.nome_processo)}</strong></td>
            <td>${window.escapeHTML(proc.responsavel || 'Não definido')}</td>
            <td><span class="status-badge status-${proc.status}">${statusFormatado}</span></td>
            <td>${dataFormatada}</td>
            <td style="display:flex; gap: 6px; flex-wrap:wrap; justify-content:flex-end;">
                <button onclick="viewProcessDetails(${proc.id})" class="btn btn-outline-primary btn-sm">+ DETALHES</button>
                <button onclick="openDeepView('processes', ${proc.id}, 'Processo')" class="btn btn-secondary btn-sm">Editar</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

window.handleSaveProcess = async function(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    const textoOriginal = btn.innerText;
    btn.innerText = "Enviando (Aguarde)...";
    btn.disabled = true;

    const checkboxes = document.querySelectorAll('input[name="smart_equipe_cb"]:checked');
    const equipeSelecionada = Array.from(checkboxes).map(cb => cb.value).join(', ');
    const inputTextoOriginal = document.getElementById('proc-equipe').value;
    const equipeFinal = equipeSelecionada ? equipeSelecionada : inputTextoOriginal;

    try {
        let linkDaImagem = null;
        if (window.fazerUploadImagem) {
            linkDaImagem = await window.fazerUploadMultiplo('proc-imagem');
        }
        const processData = {
            nome_processo: document.getElementById('proc-nome').value,
            responsavel: document.getElementById('proc-resp').value, 
            objetivo_fase: document.getElementById('proc-objetivo').value,
            visao_geral: document.getElementById('proc-visao').value,
            equipe: equipeFinal, 
            detalhamento_etapas: document.getElementById('proc-etapas').value,
            indicadores_desempenho: document.getElementById('proc-indicadores').value,
            anexos_url: document.getElementById('proc-anexos').value,
            imagem_url: linkDaImagem,
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
        if (window.UI) window.UI.showToast("Processo salvo com sucesso!", "success");

    } catch (error) {
        console.error("Erro ao salvar:", error);
        if (window.UI) window.UI.showToast("Falha ao salvar processo. Verifique os campos.", "error");
    } finally {
        btn.innerText = textoOriginal;
        btn.disabled = false;
    }
};

// ==========================================
// DETALHES DO PROCESSO
// ==========================================
window.viewProcessDetails = async function(id) {
    if (window.UI) window.UI.showToast("Buscando detalhes do processo...", "info");
    try {
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
        if (window.UI) window.UI.showToast("Falha ao abrir detalhes.", "error");
    }
};

window.renderProcessDetailsModal = function(proc, atividades) {
    const oldModal = document.getElementById('processDetailsModal');
    if (oldModal) oldModal.remove();
    
    window.currentProcessActivities = atividades;

    let actHtml = atividades.map((a, index) => {
        const stringDataUTC = a.entry_date.endsWith('Z') ? a.entry_date : a.entry_date + 'Z';
        const dataLocal = new Date(stringDataUTC);
        
        const safeTitle = window.escapeHTML ? window.escapeHTML(a.title) : a.title;
        const safeNote = window.escapeHTML ? window.escapeHTML(a.note) : a.note;
        const temImagem = !!a.imagem_url;
        return `
        <div onclick="window.handleActivityClick(${index})" style="border-left: 3px solid var(--primary); padding-left: 12px; margin-bottom: 15px; cursor: pointer; transition: background 0.2s; padding: 8px 12px; border-radius: 0 8px 8px 0;" onmouseover="this.style.background='#F1F5F9'" onmouseout="this.style.background='transparent'">
            <div style="font-size: 11px; color: #777f8a; font-weight:bold; margin-bottom: 3px;">
                Data: ${dataLocal.toLocaleDateString('pt-BR')} às ${dataLocal.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
            </div>
            <strong style="display:block; font-size: 14px; color: #191f29;">${safeTitle}</strong>
            <p style="margin: 5px 0 0 0; font-size: 13px; color: #424850; white-space: pre-wrap; word-break: break-word; line-height: 1.5;">${safeNote}</p>
        </div>
        `;
    }).join('');
    
    if(!actHtml) actHtml = '<p style="color:#94A3B8; font-size:13px; text-align:center; padding:20px;">Nenhuma anotação registrada ainda. Crie a primeira abaixo!</p>';

    const modalHTML = `
    <div id="processDetailsModal" class="modal-overlay" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 999999; justify-content: center; align-items: center;">
        <div class="modal-content" style="background: white; padding: 0; border-radius: 12px; width: 95%; max-width: 1000px; max-height: 90vh; overflow-y: auto; display: flex; flex-wrap: wrap; box-shadow: 0 10px 40px rgba(0,0,0,0.6);">

            <div style="width: 100%; padding: 20px 25px; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: white; z-index: 10;">
                <div>
                    <h2 style="margin:0; color:#0F172A; font-size: 20px;">${window.escapeHTML ? window.escapeHTML(proc.nome_processo || 'Processo Sem Nome') : (proc.nome_processo || 'Processo Sem Nome')}</h2>
                    <span style="font-size: 13px; color: #64748B;">Responsável: <strong>${window.escapeHTML ? window.escapeHTML(proc.responsavel || 'N/A') : (proc.responsavel || 'N/A')}</strong> | Equipe: ${window.escapeHTML ? window.escapeHTML(proc.equipe || 'N/A') : (proc.equipe || 'N/A')}</span>   
                </div>
                <div style="display:flex; align-items:center; gap: 15px;">
                    <span class="badge" style="background: #e7f3ff; color: #004080; padding: 6px 12px; border-radius: 6px; font-weight:bold;">${(proc.status || 'RASCUNHO').toUpperCase()}</span>
                    <button onclick="document.getElementById('processDetailsModal').remove()" style="background:none; border:none; font-size:28px; cursor:pointer; color:#94A3B8; line-height: 1;">&times;</button>
                </div>
            </div>

            <div style="display: flex; flex-wrap: wrap; width: 100%; gap: 0;">
                
                <div style="flex: 2 1 400px; padding: 25px; border-right: 1px solid #E2E8F0;">
                    
                    <h4 style="color:#1E293B; margin-bottom: 8px; font-size: 14px;">Visão Geral</h4>
                    <div style="background:#F8FAFC; padding:15px; border-radius:8px; font-size:13px; color: #334155; margin-bottom:20px;">${window.escapeHTML ? window.escapeHTML(proc.visao_geral || 'Nenhuma visão geral definida.') : (proc.visao_geral || 'Nenhuma visão geral definida.')}</div>

                    <h4 style="color:#1E293B; margin-bottom: 8px; font-size: 14px;">Objetivo da Fase</h4>
                    <div style="background:#F8FAFC; padding:15px; border-radius:8px; font-size:13px; color: #334155; margin-bottom:20px;">${window.escapeHTML ? window.escapeHTML(proc.objetivo_fase || 'Nenhum objetivo definido.') : (proc.objetivo_fase || 'Nenhum objetivo definido.')}</div>

                    <h4 style="color:#1E293B; margin-bottom: 8px; font-size: 14px;">Detalhamento das Etapas</h4>
                    <div style="background:#F8FAFC; padding:15px; border-radius:8px; font-size:13px; color: #334155; margin-bottom:20px; white-space:pre-wrap;">${window.escapeHTML ? window.escapeHTML(proc.detalhamento_etapas || 'Nenhuma etapa registrada.') : (proc.detalhamento_etapas || 'Nenhuma etapa registrada.')}</div>

                    ${proc.imagem_url ? `
                    <h4 style="color:#1E293B; margin-bottom: 8px; font-size: 14px;">Anexos</h4>
                    <div style="background:#F8FAFC; padding:15px; border-radius:8px; margin-bottom:20px; display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
                        ${proc.imagem_url.split(',').map(url => `
                            <img src="${window.escapeHTML ? window.escapeHTML(url.trim()) : url.trim()}" style="max-width: 100%; max-height: 250px; border-radius: 6px; cursor: pointer; object-fit: contain; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" onclick="window.open(this.src, '_blank')" title="Clique para ampliar" />
                        `).join('')}
                    </div>` : ''}

                    <h4 style="color:#1E293B; margin-bottom: 8px; font-size: 14px;">Indicadores de Desempenho</h4>
                    <div style="background:#F8FAFC; padding:15px; border-radius:8px; font-size:13px; color: #334155; margin-bottom:20px; white-space:pre-wrap;">${window.escapeHTML ? window.escapeHTML(proc.indicadores_desempenho || 'Nenhum indicador registrado.') : (proc.indicadores_desempenho || 'Nenhum indicador registrado.')}</div>
                </div>

                <div style="flex: 1 1 300px; padding: 25px; background: #F8FAFC;">
                    <h3 style="margin:0 0 20px 0; font-size:16px; color:#0F172A; display:flex; align-items:center; gap:8px;">
                        <span>Linha do Tempo (Atividades)</span>
                    </h3>

                    <div style="max-height: 400px; overflow-y:auto; margin-bottom: 25px; padding-right: 5px;">
                        ${actHtml}
                    </div>

                    <form onsubmit="submitProcessActivity(event, ${proc.id})" style="background:white; padding:18px; border-radius:8px; border:1px solid #E2E8F0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                        <h4 style="margin:0 0 12px 0; font-size:14px; color:#1E293B;">+ Adicionar Atividade</h4>
                        <input type="text" id="act-title" placeholder="Título (Ex: Teste Finalizado)" required class="form-control" style="width:100%; padding:10px; margin-bottom:12px; font-size:13px;">
                        <textarea id="act-note" placeholder="Descreva os resultados ou o que foi feito..." required class="form-control" rows="3" style="width:100%; padding:10px; margin-bottom:12px; font-size:13px;"></textarea>
                        
                        <div class="input-group" style="margin-bottom: 12px; background: #F8FAFC; padding: 10px; border-radius: 6px; border: 1px dashed #CBD5E1;">
                            <label style="font-size: 11px; font-weight: bold; color: #475569; display:block; margin-bottom: 5px;">Anexar Imagens (Múltiplas - Opcional)</label>
                            <input type="file" id="act-imagem" class="form-control" accept="image/png, image/jpeg, image/jpg" multiple style="font-size: 12px; padding: 5px;" onchange="window.previewMultiplasImagens(event, 'preview-act')">
                            <div id="preview-act" style="display: none; margin-top: 10px; text-align: center; gap: 10px; flex-wrap: wrap; justify-content: center;"></div>
                        </div>

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
    btn.innerText = "Salvando (Aguarde)..."; 
    btn.disabled = true;

    try {
        let linkImagem = null;
        if (window.fazerUploadMultiplo) {
            linkImagem = await window.fazerUploadMultiplo('act-imagem');
        }

        const payload = {
            title: document.getElementById('act-title').value,
            note: document.getElementById('act-note').value,
            imagem_url: linkImagem
        };

        const res = await window.api.fetchProtected(`/processes/${processId}/activities`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Erro ao salvar nota");

        if (window.UI) window.UI.showToast("Atividade registrada na linha do tempo!", "success");
        viewProcessDetails(processId); 
    } catch(err) {
        if (window.UI) window.UI.showToast("Falha ao registrar atividade.", "error");
    } finally {
        btn.innerText = originalText; 
        btn.disabled = false;
    }
};

window.abrirModalAtividade = function(title, note, imgUrl) {
    const modalId = 'activityDetailsModal';
    const modalAntigo = document.getElementById(modalId);
    if(modalAntigo) modalAntigo.remove();

    let imgHtml = '';
    if (imgUrl) {
        const urls = imgUrl.split(',');
        const imagensRenderizadas = urls.map(u => `
            <img src="${u.trim()}" style="width: 100%; height: auto; max-height: 280px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); cursor: pointer; object-fit: contain; background: #fff;" onclick="window.open(this.src, '_blank')" title="Clique para ampliar">
        `).join('');
        
        imgHtml = `
        <div style="margin-top: 24px; border-top: 1px solid #E2E8F0; padding-top: 20px;">
             <label style="font-size: 12px; font-weight: bold; color: #64748B; text-transform: uppercase; display: block; margin-bottom: 16px; text-align: center;">Galeria de Anexos</label>
             <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; align-items: center; justify-items: center; background: #F1F5F9; padding: 16px; border-radius: 8px;">
                 ${imagensRenderizadas}
             </div>
        </div>`;
    }

    const html = `
    <div id="${modalId}" class="modal-overlay" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px); z-index: 10000000; justify-content: center; align-items: center; padding: 20px;">
        
        <!-- A MÁGICA ESTÁ AQUI: max-height: 90vh e overflow-y: auto -->
        <div class="modal-content fade-in" style="background: white; padding: 32px; border-radius: 12px; width: 100%; max-width: 650px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); position: relative;">
            
            <button onclick="document.getElementById('${modalId}').remove()" style="position: absolute; top: 16px; right: 20px; background: none; border: none; font-size: 28px; cursor: pointer; color: #94A3B8; line-height: 1; transition: color 0.2s;" onmouseover="this.style.color='#0F172A'" onmouseout="this.style.color='#94A3B8'">&times;</button>
            
            <h3 style="margin: 0 0 16px 0; color: #0F172A; font-size: 20px; padding-right: 30px; border-bottom: 1px solid #F1F5F9; padding-bottom: 12px;">${title}</h3>
            
            <div style="background: #F8FAFC; padding: 20px; border-radius: 8px; font-size: 14.5px; color: #334155; white-space: pre-wrap; word-break: break-word; line-height: 1.6; border: 1px solid #E2E8F0;">${note}</div>
            
            ${imgHtml}
            
            <div style="margin-top: 24px; text-align: right; border-top: 1px solid #F1F5F9; padding-top: 16px;">
                <button onclick="document.getElementById('${modalId}').remove()" class="btn btn-secondary">Fechar</button>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', html);
};
window.handleActivityClick = function(index) {
    const atividade = window.currentProcessActivities[index];
    if (!atividade) return;
    
    console.log("Abrindo nota da linha do tempo:", atividade); 
    window.abrirModalAtividade(atividade.title, atividade.note, atividade.imagem_url);
};

window.previewMultiplasImagens = function(event, previewContainerId) {
    const files = event.target.files;
    const container = document.getElementById(previewContainerId);
    container.innerHTML = ''; 

    if (files.length > 0) {
        container.style.display = 'flex';
        
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const imgHTML = `
                <div style="position: relative; display: inline-block;">
                    <img src="${e.target.result}" style="max-width: 120px; max-height: 120px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); object-fit: cover;" />
                </div>`;
                container.insertAdjacentHTML('beforeend', imgHTML);
            };
            reader.readAsDataURL(file);
        });

        const clearBtn = `<p style="width: 100%; margin: 8px 0 0 0; font-size: 13px; color: #DC2626; cursor: pointer; font-weight: bold;" onclick="document.getElementById('${event.target.id}').value = ''; document.getElementById('${previewContainerId}').style.display = 'none';"> Remover Imagens</p>`;
        container.insertAdjacentHTML('beforeend', clearBtn);
    } else {
        container.style.display = 'none';
    }
};

window.fazerUploadMultiplo = async function(inputId) {
    const input = document.getElementById(inputId);
    if (!input || !input.files || input.files.length === 0) return null;

    let urls = [];
    const arquivosOriginais = Array.from(input.files);

    for (let i = 0; i < arquivosOriginais.length; i++) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(arquivosOriginais[i]);
        input.files = dataTransfer.files; 

        const url = await window.fazerUploadImagem(inputId);
        if (url) urls.push(url);
    }

    const dtRestore = new DataTransfer();
    arquivosOriginais.forEach(f => dtRestore.items.add(f));
    input.files = dtRestore.files;

    return urls.length > 0 ? urls.join(',') : null;
};