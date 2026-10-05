// ==========================================
// 1. MODAL DE NOVO PROCESSO
// ==========================================
window.openProcessModal = async function() {

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

    const firstTab = document.querySelector('#processModal .tab-btn');
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

        containerEquipe.innerHTML = window.UI.loading('Carregando equipe');

        try {
            const res = await window.api.fetchProtected('/usuarios/equipe');
            if (res.ok) {
                const equipe = await res.json();
                let htmlEquipe = '<div class="check-chips">';

                equipe.forEach(membro => {
                    if (membro.nome !== nomeLogado) {
                        const nomeSeguro = window.escapeHTML(membro.nome);
                        htmlEquipe += `
                        <label class="check-chip">
                            <input type="checkbox" name="smart_equipe_cb" value="${nomeSeguro}">
                            ${nomeSeguro}
                        </label>`;
                    }
                });
                htmlEquipe += '</div>';
                containerEquipe.innerHTML = htmlEquipe;
            }
        } catch (err) {
            containerEquipe.innerHTML = '<span class="help text-danger">Não foi possível carregar a equipe.</span>';
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
    const modal = document.getElementById('processModal');
    if (!modal) return;

    modal.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    modal.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    const targetTab = document.getElementById(tabName);
    if (targetTab) targetTab.classList.remove('hidden');
    evt.currentTarget.classList.add('active');
};

// ==========================================
// 2. TABELA DE PROCESSOS
// ==========================================
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
        tbody.innerHTML = `<tr><td colspan="5">${window.UI.emptyState({ title: 'Nenhum processo registrado', description: 'Use “Novo processo” para mapear o primeiro.' })}</td></tr>`;
        return;
    }

    processes.forEach(proc => {
        const row = document.createElement('tr');
        const dataFormatada = new Date(proc.data_registro).toLocaleDateString('pt-BR');
        const statusFormatado = (proc.status || 'rascunho').replace('_', ' ');

        row.innerHTML = `
            <td><strong>${window.escapeHTML(proc.nome_processo)}</strong></td>
            <td>${window.escapeHTML(proc.responsavel || 'Não definido')}</td>
            <td><span class="status-badge status-${window.escapeHTML(proc.status)}">${window.escapeHTML(statusFormatado)}</span></td>
            <td class="num">${dataFormatada}</td>
            <td>
                <div class="row-actions">
                    <button onclick="viewProcessDetails(${proc.id})" class="link-btn">Abrir</button>
                    <button onclick="openDeepView('processes', ${proc.id}, 'Processo')" class="link-btn muted">Editar</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// ==========================================
// 3. SALVAR NOVO PROCESSO
// ==========================================
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
// 4. DETALHES DO PROCESSO
// ==========================================
window.viewProcessDetails = async function(id) {
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

    const esc = window.escapeHTML;
    const campo = (rotulo, valor, vazio) => `
        <div>
            <dt>${rotulo}</dt>
            <dd>${valor ? esc(valor) : `<span class="text-faint">${vazio}</span>`}</dd>
        </div>`;

    let actHtml = atividades.map((a, index) => {
        const stringDataUTC = a.entry_date.endsWith('Z') ? a.entry_date : a.entry_date + 'Z';
        const dataLocal = new Date(stringDataUTC);

        return `
        <li class="tl-item clickable" onclick="window.handleActivityClick(${index})">
            <div class="meta">${dataLocal.toLocaleDateString('pt-BR')} · ${dataLocal.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}${a.imagem_url ? ' · com imagem' : ''}</div>
            <span class="tl-title">${esc(a.title)}</span>
            <p class="pre-wrap">${esc(a.note)}</p>
        </li>
        `;
    }).join('');

    if (!actHtml) actHtml = '<li class="text-faint text-small">Nenhuma atividade registrada ainda.</li>';

    const statusProc = (proc.status || 'rascunho');

    const modalHTML = `
    <div id="processDetailsModal" class="modal-overlay is-open">
        <div class="modal-content modal-xl modal-flush">

            <div class="sheet-head">
                <div>
                    <p class="eyebrow">processo de P&amp;D</p>
                    <h3>${esc(proc.nome_processo || 'Processo sem nome')}</h3>
                    <p class="meta">responsável: ${esc(proc.responsavel || 'não definido')} · equipe: ${esc(proc.equipe || 'não definida')}</p>
                </div>
                <div class="cluster">
                    <span class="status-badge status-${esc(statusProc)}">${esc(statusProc.replace('_', ' '))}</span>
                    ${window.UI.closeButton("document.getElementById('processDetailsModal').remove()")}
                </div>
            </div>

            <div class="split-sheet">
                <section>
                    <dl class="dl">
                        ${campo('visão geral', proc.visao_geral, 'Não definida.')}
                        ${campo('objetivo da fase', proc.objetivo_fase, 'Não definido.')}
                        ${campo('etapas', proc.detalhamento_etapas, 'Nenhuma etapa registrada.')}
                        ${campo('indicadores', proc.indicadores_desempenho, 'Nenhum indicador registrado.')}
                        ${proc.imagem_url ? `
                        <div>
                            <dt>imagens</dt>
                            <dd class="plain">
                                <div class="gallery">
                                    ${proc.imagem_url.split(',').map(url => `<img src="${esc(url.trim())}" alt="" onclick="window.open(this.src, '_blank')" title="Abrir em tamanho real">`).join('')}
                                </div>
                            </dd>
                        </div>` : ''}
                    </dl>
                </section>

                <section>
                    <div class="section-head"><h3>Linha do tempo</h3></div>

                    <ul class="timeline scroll-pane mb-md">
                        ${actHtml}
                    </ul>

                    <form onsubmit="submitProcessActivity(event, ${proc.id})">
                        <div class="section-head"><h3>Registrar atividade</h3></div>
                        <div class="input-group">
                            <label for="act-title">Título</label>
                            <input type="text" id="act-title" required placeholder="Ex.: Teste de tração finalizado">
                        </div>
                        <div class="input-group">
                            <label for="act-note">O que foi feito</label>
                            <textarea id="act-note" required rows="3"></textarea>
                        </div>
                        <div class="input-group">
                            <label for="act-imagem">Imagens (opcional)</label>
                            <input type="file" id="act-imagem" accept="image/png, image/jpeg, image/jpg" multiple onchange="window.previewMultiplasImagens(event, 'preview-act')">
                            <div id="preview-act" class="thumbs"></div>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block">Registrar</button>
                    </form>
                </section>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

// ==========================================
// 5. REGISTRAR ATIVIDADE NA LINHA DO TEMPO
// ==========================================
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

// ==========================================
// 6. MODAL DE DETALHE DE ATIVIDADE
// ==========================================
window.abrirModalAtividade = function(title, note, imgUrl) {
    const modalId = 'activityDetailsModal';
    const modalAntigo = document.getElementById(modalId);
    if(modalAntigo) modalAntigo.remove();

    let imgHtml = '';
    if (imgUrl) {
        const imagens = imgUrl.split(',').map(u =>
            `<img src="${window.escapeHTML(u.trim())}" alt="" onclick="window.open(this.src, '_blank')" title="Abrir em tamanho real">`
        ).join('');

        imgHtml = `
        <div>
            <dt>imagens</dt>
            <dd class="plain"><div class="gallery">${imagens}</div></dd>
        </div>`;
    }

    const html = `
    <div id="${modalId}" class="modal-overlay is-open is-top">
        <div class="modal-content modal-md">
            <div class="modal-header">
                <div>
                    <p class="eyebrow">atividade</p>
                    <h3>${window.escapeHTML(title)}</h3>
                </div>
                ${window.UI.closeButton(`document.getElementById('${modalId}').remove()`)}
            </div>
            <dl class="dl">
                <div>
                    <dt>registro</dt>
                    <dd>${window.escapeHTML(note)}</dd>
                </div>
                ${imgHtml}
            </dl>
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

// ==========================================
// 7. UPLOAD DE IMAGENS (PREVIEW E MÚLTIPLO)
// ==========================================
window.previewMultiplasImagens = function(event, previewContainerId) {
    const files = event.target.files;
    const container = document.getElementById(previewContainerId);
    container.innerHTML = '';

    if (files.length > 0) {
        container.style.display = 'flex';

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                container.insertAdjacentHTML('afterbegin', `<img src="${e.target.result}" alt="">`);
            };
            reader.readAsDataURL(file);
        });

        const clearBtn = `<button type="button" class="link-btn danger" onclick="document.getElementById('${event.target.id}').value = ''; document.getElementById('${previewContainerId}').style.display = 'none';">Remover imagens</button>`;
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