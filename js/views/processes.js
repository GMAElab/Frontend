// ==========================================
// 1. CONSTRUÇÃO DA TELA DE PROCESSOS
// ==========================================
document.addEventListener('viewChanged', (e) => {
    if (e.detail.view !== 'processes') return;
    const conteudo = document.getElementById('dynamic-content');

    conteudo.innerHTML = `
        <header class="page-head fade-in">
            <div>
                <p class="eyebrow">pesquisa e desenvolvimento</p>
                <h1>Processos</h1>
                <p class="lede">Mapeamento, acompanhamento e histórico de cada processo, com as pessoas e os equipamentos envolvidos.</p>
            </div>
            <div class="page-actions">
                <button class="btn btn-primary" onclick="window.openProcessModal()">Novo processo</button>
            </div>
        </header>
        <div id="processes-container" class="fade-in"></div>
    `;

    loadProcessesTable();
});

const STATUS_DE_PROCESSO = [
    { valor: 'rascunho', rotulo: 'Rascunho' },
    { valor: 'em_andamento', rotulo: 'Em andamento' },
    { valor: 'concluido', rotulo: 'Concluído' },
];

// ==========================================
// 2. LISTA COM BUSCA, FILTROS E PAGINAÇÃO
// ==========================================
function loadProcessesTable() {
    window.listagemAtual = window.Listagem.criar({
        alvo: 'processes-container',
        endpoint: '/processes/',
        placeholder: 'Buscar por processo, responsável ou equipe',
        cabecalho: '<th>Processo</th><th>Responsável</th><th>Equipe</th><th>Status</th><th>Registrado em</th><th class="end">Ações</th>',
        filtros: [
            { param: 'status', rotulo: 'Todos os status', opcoes: STATUS_DE_PROCESSO },
            { param: 'membro_id', rotulo: 'Todas as pessoas', opcoes: window.Vinculos.opcoesDePessoa },
            { param: 'equipamento_id', rotulo: 'Todos os equipamentos', opcoes: window.Vinculos.opcoesDeEquipamento },
        ],
        vazio: { title: 'Nenhum processo registrado', description: 'Use “Novo processo” para mapear o primeiro.' },
        erro: 'Erro ao carregar lista de processos.',
        renderLinha: (proc) => {
            const status = proc.status || 'rascunho';
            return `
                <tr>
                    <td><strong>${window.escapeHTML(proc.nome_processo)}</strong></td>
                    <td>${window.escapeHTML(proc.responsavel || 'Não definido')}</td>
                    <td>${proc.equipe ? window.escapeHTML(proc.equipe) : '<span class="text-faint">—</span>'}</td>
                    <td><span class="status-badge status-${window.escapeHTML(status)}">${window.escapeHTML(status.replace('_', ' '))}</span></td>
                    <td class="num">${new Date(proc.data_registro).toLocaleDateString('pt-BR')}</td>
                    <td>
                        <div class="row-actions">
                            <button onclick="viewProcessDetails(${proc.id})" class="link-btn">Abrir</button>
                            <button onclick="window.openProcessModal(${proc.id})" class="link-btn muted">Editar</button>
                        </div>
                    </td>
                </tr>`;
        }
    });
}

// ==========================================
// 3. ABRIR MODAL DE PROCESSO (NOVO OU EDIÇÃO)
// ==========================================
window.openProcessModal = async function(id = null) {
    const modal = document.getElementById('processModal');
    if (!modal) return;

    let processo = null;
    if (id) {
        const res = await window.api.fetchProtected(`/processes/${id}`);
        if (!res.ok) {
            window.UI.showToast('Processo não encontrado.', 'error');
            return;
        }
        processo = await res.json();
    }
    window.currentEditProcessId = processo ? processo.id : null;
    modal.dataset.imagemAtual = processo && processo.imagem_url ? processo.imagem_url : '';

    const form = document.getElementById('processForm');
    form.reset();
    document.getElementById('processModalTitle').innerHTML = processo ? 'Editar processo de P&amp;D' : 'Novo processo de P&amp;D';
    form.querySelector('button[type="submit"]').innerText = processo ? 'Salvar alterações' : 'Salvar processo';

    const previewProc = document.getElementById('preview-proc');
    if (previewProc) previewProc.style.display = 'none';

    const definir = (campo, valor) => { document.getElementById(campo).value = valor || ''; };
    definir('proc-nome', processo && processo.nome_processo);
    definir('proc-objetivo', processo && processo.objetivo_fase);
    definir('proc-visao', processo && processo.visao_geral);
    definir('proc-etapas', processo && processo.detalhamento_etapas);
    definir('proc-indicadores', processo && processo.indicadores_desempenho);
    definir('proc-anexos', processo && processo.anexos_url);
    document.getElementById('proc-status').value = (processo && processo.status) || 'rascunho';

    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('opacity', '1', 'important');
    modal.style.setProperty('visibility', 'visible', 'important');
    document.body.style.overflow = 'hidden';

    const primeiraAba = modal.querySelector('.tab-btn');
    if (primeiraAba) primeiraAba.click();

    preencherVinculosDoProcesso(processo);
};

// ==========================================
// 4. PESSOAS E EQUIPAMENTOS DO FORMULÁRIO
// ==========================================
async function preencherVinculosDoProcesso(processo) {
    const user = JSON.parse(localStorage.getItem('user_data') || '{}');
    const selectResp = document.getElementById('proc-resp');
    const boxEquipe = document.getElementById('proc-equipe-container');
    const boxEquip = document.getElementById('proc-equipamentos-container');
    const legado = document.getElementById('proc-equipe-legado');

    selectResp.innerHTML = '<option value="">Selecione</option>';
    boxEquipe.innerHTML = window.UI.loading('Carregando equipe');
    boxEquip.innerHTML = window.UI.loading('Carregando equipamentos');
    legado.classList.add('hidden');

    const membros = processo ? processo.membros.map(m => m.id) : [];
    const equipamentos = processo ? processo.equipamentos.map(eq => eq.id) : [];
    const responsavel = processo ? processo.responsavel_id : user.id;

    try {
        const equipe = await window.Vinculos.equipe();
        selectResp.insertAdjacentHTML('beforeend', equipe.map(u =>
            `<option value="${u.id}" ${u.id === responsavel ? 'selected' : ''}>${window.escapeHTML(u.nome)}</option>`
        ).join(''));
        boxEquipe.innerHTML = window.Vinculos.chips('proc_membro', equipe, membros, u => u.nome);

        if (processo && !processo.membros.length && processo.equipe) {
            legado.textContent = `Equipe registrada em texto antes do vínculo por pessoa: ${processo.equipe}. Marque as pessoas acima para substituir.`;
            legado.classList.remove('hidden');
        }
        if (processo && !processo.responsavel_id && processo.responsavel) {
            selectResp.options[0].textContent = `${processo.responsavel} (texto livre)`;
        }
    } catch (err) {
        boxEquipe.innerHTML = '<span class="help text-danger">Não foi possível carregar a equipe.</span>';
    }

    try {
        const lista = await window.Vinculos.equipamentos();
        boxEquip.innerHTML = window.Vinculos.chips('proc_equipamento', lista, equipamentos, eq => eq.nome);
    } catch (err) {
        boxEquip.innerHTML = '<span class="help text-danger">Não foi possível carregar os equipamentos.</span>';
    }
}

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
// 5. SALVAR PROCESSO
// ==========================================
window.handleSaveProcess = async function(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    const textoOriginal = btn.innerText;
    btn.innerText = "Enviando (Aguarde)...";
    btn.disabled = true;

    const editando = window.currentEditProcessId;
    const valor = (id) => document.getElementById(id).value;

    try {
        const novasImagens = await window.fazerUploadMultiplo('proc-imagem');
        const imagemAtual = document.getElementById('processModal').dataset.imagemAtual || null;

        const processData = {
            nome_processo: valor('proc-nome'),
            objetivo_fase: valor('proc-objetivo'),
            visao_geral: valor('proc-visao'),
            detalhamento_etapas: valor('proc-etapas'),
            indicadores_desempenho: valor('proc-indicadores'),
            anexos_url: valor('proc-anexos'),
            imagem_url: novasImagens || imagemAtual,
            status: valor('proc-status') || 'rascunho',
            membros_ids: window.Vinculos.idsMarcados('proc_membro'),
            equipamento_ids: window.Vinculos.idsMarcados('proc_equipamento')
        };
        if (valor('proc-resp')) processData.responsavel_id = Number(valor('proc-resp'));

        const response = await window.api.fetchProtected(editando ? `/processes/${editando}` : '/processes/', {
            method: editando ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(processData)
        });

        if (!response.ok) {
            if (editando && response.status === 404) {
                throw new Error('Você só pode editar processos que você registrou.');
            }
            const erro = await response.json().catch(() => ({}));
            throw new Error(typeof erro.detail === 'string' ? erro.detail : 'Falha ao salvar processo. Verifique os campos.');
        }

        window.closeProcessModal();
        if (window.listagemAtual) window.listagemAtual.recarregar();
        window.UI.showToast(editando ? "Processo atualizado com sucesso!" : "Processo salvo com sucesso!", "success");

    } catch (error) {
        window.UI.showToast(error.message || "Falha ao salvar processo.", "error");
    } finally {
        btn.innerText = textoOriginal;
        btn.disabled = false;
    }
};

// ==========================================
// 6. DETALHES DO PROCESSO
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
            atividades = [];
        }

        renderProcessDetailsModal(proc, atividades);
    } catch (err) {
        if (window.UI) window.UI.showToast("Falha ao abrir detalhes.", "error");
    }
};

function renderVinculosDoProcesso(proc) {
    const esc = window.escapeHTML;

    const pessoas = proc.membros.length
        ? proc.membros.map(m => `<span class="badge">${esc(m.nome)}</span>`).join(' ')
        : (proc.equipe ? esc(proc.equipe) : '<span class="text-faint">Nenhuma pessoa vinculada.</span>');

    const equipamentos = proc.equipamentos.length
        ? `<ul class="link-list">${proc.equipamentos.map(eq => `
            <li><button type="button" class="link-btn" onclick="document.getElementById('processDetailsModal').remove(); window.viewDossier(${eq.id})">${esc(eq.nome)}</button></li>`).join('')}</ul>`
        : '<span class="text-faint">Nenhum equipamento vinculado.</span>';

    return `
        <div>
            <dt>equipe</dt>
            <dd class="plain">${pessoas}</dd>
        </div>
        <div>
            <dt>equipamentos</dt>
            <dd class="plain">${equipamentos}</dd>
        </div>`;
}

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
                    <p class="meta">responsável: ${esc(proc.responsavel || 'não definido')}</p>
                </div>
                <div class="cluster">
                    <span class="status-badge status-${esc(statusProc)}">${esc(statusProc.replace('_', ' '))}</span>
                    ${window.UI.closeButton("document.getElementById('processDetailsModal').remove()")}
                </div>
            </div>

            <div class="split-sheet">
                <section>
                    <dl class="dl">
                        ${renderVinculosDoProcesso(proc)}
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
// 7. REGISTRAR ATIVIDADE NA LINHA DO TEMPO
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
// 8. MODAL DE DETALHE DE ATIVIDADE
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
    window.abrirModalAtividade(atividade.title, atividade.note, atividade.imagem_url);
};

// ==========================================
// 9. UPLOAD DE IMAGENS (PREVIEW E MÚLTIPLO)
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
