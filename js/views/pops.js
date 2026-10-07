// ==========================================
// 1. CONSTRUÇÃO DA TELA DE POPs
// ==========================================
document.addEventListener('viewChanged', (e) => {
    if (e.detail.view === 'pops' || e.detail.view === 'pop') {
        const container = document.getElementById('dynamic-content');

        container.innerHTML = `
            <header class="page-head fade-in">
                <div>
                    <p class="eyebrow">laboratório</p>
                    <h1>Procedimentos operacionais padrão</h1>
                    <p class="lede">Os POPs vigentes do laboratório, com histórico de revisões e exportação em .docx.</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-primary" onclick="window.openPopModal()">Novo POP</button>
                </div>
            </header>
            <div id="pops-container" class="fade-in"></div>
        `;
        loadPopsTable();
    }
});

const SECOES_DO_POP = [
    ['pop-obj', 'Objetivo', 'objetivo', 2],
    ['pop-escopo', 'Aplicação e escopo', 'escopo', 2],
    ['pop-resp-detalhe', 'Responsabilidades', 'responsabilidades', 2],
    ['pop-materiais', 'Materiais e equipamentos necessários', 'materiais', 2],
    ['pop-procedimento', 'Procedimento operacional', 'procedimento', 6],
    ['pop-qualidade', 'Controle de qualidade', 'qualidade', 2],
    ['pop-seguranca', 'Segurança e riscos', 'seguranca', 2],
    ['pop-manutencao', 'Manutenção e calibração', 'manutencao', 2],
    ['pop-referencias', 'Referências', 'referencias', 2],
];

// ==========================================
// 2. LEITURA DE UM POP
// ==========================================
function lerSecoesDoPop(descricao) {
    try {
        const dados = JSON.parse(descricao);
        return dados && typeof dados === 'object' ? dados : { objetivo: descricao };
    } catch (e) {
        return { objetivo: descricao };
    }
}

async function buscarPop(codigo) {
    try {
        const res = await window.api.fetchProtected(`/pops/${encodeURIComponent(codigo)}`);
        return res.ok ? await res.json() : null;
    } catch (e) {
        return null;
    }
}

async function buscarRevisoesDoPop(codigo) {
    try {
        const res = await window.api.fetchProtected(`/pops/${encodeURIComponent(codigo)}/revisoes`);
        return res.ok ? await res.json() : [];
    } catch (e) {
        return [];
    }
}

// ==========================================
// 3. CRIAR E EDITAR POP
// ==========================================
window.openPopModal = async function(codigoEdicao = null) {
    const modalAntigo = document.getElementById('popModal');
    if (modalAntigo) modalAntigo.remove();

    const user = JSON.parse(localStorage.getItem('user_data') || '{}');
    const dataHoje = new Date().toLocaleDateString('pt-BR');

    let popEdit = null;
    let dadosEdit = {};

    if (codigoEdicao) {
        popEdit = await buscarPop(codigoEdicao);
        if (!popEdit) {
            window.UI.showToast('POP não encontrado.', 'error');
            return;
        }
        dadosEdit = lerSecoesDoPop(popEdit.descricao);
    }
    window.currentEditPopCode = popEdit ? popEdit.codigo : null;

    const tituloModal = popEdit ? `Editar ${window.escapeHTML(popEdit.codigo)}` : 'Novo POP';
    const textoBotaoSalvar = popEdit ? 'Salvar alterações' : 'Salvar POP';
    const versaoAtual = dadosEdit.versao || '1.0';
    const escapeQuote = (str) => str ? String(str).replace(/"/g, '&quot;') : '';

    const blocoRevisao = popEdit ? `
                <div class="note accent">
                    <strong>Controle de revisão.</strong>
                    Se você alterar o título ou alguma seção, o sistema registra uma nova versão a partir da ${window.escapeHTML(versaoAtual)} e guarda a anterior no histórico.
                </div>
                <div class="field-grid">
                    <div class="input-group span-2">
                        <label for="pop-mudancas">O que mudou nesta revisão</label>
                        <textarea id="pop-mudancas" rows="2" placeholder="Ex.: atualizado o passo de calibração conforme o novo manual"></textarea>
                        <span class="help">Obrigatório quando o conteúdo do POP é alterado.</span>
                    </div>
                    <div class="input-group">
                        <label for="pop-tipo-revisao">Tipo de revisão</label>
                        <select id="pop-tipo-revisao">
                            <option value="menor">Menor (ex.: 1.0 para 1.1)</option>
                            <option value="maior">Maior (ex.: 1.0 para 2.0)</option>
                        </select>
                    </div>
                </div>` : '';

    const modalHTML = `
    <div id="popModal" class="modal-overlay is-open">
        <div class="modal-content modal-lg">
            <div class="modal-header">
                <div>
                    <p class="eyebrow">procedimento operacional padrão</p>
                    <h3>${tituloModal}</h3>
                </div>
                ${window.UI.closeButton("document.getElementById('popModal').remove()")}
            </div>

            <form id="popForm" onsubmit="window.handleSavePop(event)">
                <div class="field-grid">
                    <div class="input-group">
                        <label for="pop-codigo">Código do documento</label>
                        <input type="text" id="pop-codigo" class="mono" value="${escapeQuote(popEdit ? popEdit.codigo : '')}" ${popEdit ? 'readonly' : ''} required>
                    </div>
                    <div class="input-group">
                        <label for="pop-titulo">Título</label>
                        <input type="text" id="pop-titulo" value="${escapeQuote(popEdit ? popEdit.titulo : '')}" required>
                    </div>
                    <div class="input-group">
                        <label for="pop-versao">Versão</label>
                        <input type="text" id="pop-versao" class="mono" value="${escapeQuote(versaoAtual)}" ${popEdit ? 'readonly' : ''}>
                    </div>
                    <div class="input-group">
                        <label for="pop-data">Data de emissão</label>
                        <input type="text" id="pop-data" class="mono" value="${escapeQuote(dadosEdit.data_emissao || dataHoje)}" readonly>
                    </div>
                    <div class="input-group">
                        <label for="pop-responsavel">Responsável</label>
                        <input type="text" id="pop-responsavel" value="${escapeQuote(dadosEdit.responsavel || user.nome || '')}" readonly>
                    </div>
                    <div class="input-group">
                        <label for="pop-equipamento">Equipamento</label>
                        <select id="pop-equipamento">
                            <option value="">Sem equipamento vinculado</option>
                        </select>
                    </div>
                </div>

                <div class="file-field">
                    <label for="manual-ia">Preencher a partir do manual do equipamento</label>
                    <div class="inline-form">
                        <input type="file" id="manual-ia" class="form-control" accept=".pdf">
                        <button type="button" id="btn-ia" onclick="gerarComIA()" class="btn btn-secondary">Extrair do PDF</button>
                    </div>
                    <span class="help">Opcional. O PDF é lido por IA e as seções abaixo são pré-preenchidas. Revise tudo antes de salvar.</span>
                    <span id="ia-loading" class="help hidden">Lendo o manual. Isso pode levar um minuto.</span>
                </div>

                ${SECOES_DO_POP.map(([id, rotulo, chave, linhas], i) => `
                <div class="input-group">
                    <label for="${id}"><span class="mono text-faint">${i + 1}</span> ${rotulo}</label>
                    <textarea id="${id}" rows="${linhas}">${window.escapeHTML(dadosEdit[chave] || '')}</textarea>
                </div>`).join('')}

                <div class="file-field">
                    <label for="pop-imagem-visual">Imagem de referência (opcional)</label>
                    <input type="file" id="pop-imagem-visual" accept="image/png, image/jpeg, image/jpg" onchange="previewImagem(event, 'preview-pop', 'img-preview-pop')">
                    <span class="help">PNG ou JPG, até 10 MB.</span>
                    <div id="preview-pop" class="preview-single">
                        <img id="img-preview-pop" src="" alt="">
                        <button type="button" class="link-btn danger" onclick="removerImagem('pop-imagem-visual', 'preview-pop')">Remover imagem</button>
                    </div>
                </div>

                <div class="file-field">
                    <label for="pop-anexos-file"><span class="mono text-faint">10</span> Anexo</label>
                    <input type="file" id="pop-anexos-file" accept=".pdf, .doc, .docx, .xls, .xlsx, image/*">
                    <span class="help">PDF, DOCX, XLSX ou imagem, até 10 MB.</span>
                    <input type="hidden" id="pop-anexos-b64" value="${escapeQuote(dadosEdit.anexo_dados || '')}">
                    <input type="hidden" id="pop-anexos-meta" value="${escapeQuote(dadosEdit.anexo_meta || '')}">
                    <p id="anexo-status" class="help text-success${dadosEdit.anexo_dados ? '' : ' hidden'}">Há um arquivo anexado. Envie outro para substituir.</p>
                </div>

                ${blocoRevisao}

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('popModal').remove()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">${textoBotaoSalvar}</button>
                </div>
            </form>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('popModal').dataset.imagemAtual = popEdit && popEdit.imagem_url ? popEdit.imagem_url : '';

    preencherEquipamentosDoPop(popEdit ? popEdit.equipamento_id : null);
    ligarEnvioDeAnexoDoPop();
};

// ==========================================
// 4. CAMPOS AUXILIARES DO FORMULÁRIO
// ==========================================
async function preencherEquipamentosDoPop(selecionado) {
    const select = document.getElementById('pop-equipamento');
    if (!select) return;
    try {
        const opcoes = await window.Vinculos.opcoesDeEquipamento();
        select.insertAdjacentHTML('beforeend', opcoes.map(o =>
            `<option value="${o.valor}" ${o.valor === selecionado ? 'selected' : ''}>${window.escapeHTML(o.rotulo)}</option>`
        ).join(''));
    } catch (e) {
        select.disabled = true;
    }
}

function ligarEnvioDeAnexoDoPop() {
    const fileInput = document.getElementById('pop-anexos-file');
    if (!fileInput) return;

    fileInput.addEventListener('change', async function(e) {
        if (!e.target.files[0]) return;
        const file = await window.comprimirImagem(e.target.files[0]);
        if (file.size > 10 * 1024 * 1024) {
            window.UI.showToast("Arquivo muito grande! Máximo de 10MB.", "error");
            this.value = ''; return;
        }

        const statusText = document.getElementById('anexo-status');
        statusText.className = 'help';
        statusText.innerText = 'Enviando arquivo...';

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await window.api.fetchProtected('/upload-anexo', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error("Erro ao fazer upload do anexo");

            const data = await res.json();

            document.getElementById('pop-anexos-b64').value = data.url_arquivo;
            document.getElementById('pop-anexos-meta').value = JSON.stringify({ name: data.nome_original });

            statusText.className = 'help text-success';
            statusText.innerText = 'Arquivo anexado.';

        } catch (err) {
            statusText.className = 'help text-danger';
            statusText.innerText = 'O envio falhou. Tente novamente.';
            window.UI.showToast("Falha ao anexar arquivo.", "error");
        }
    });
}

// ==========================================
// 5. SALVAR / ATUALIZAR POP
// ==========================================
window.handleSavePop = async function(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    const textoOriginal = btn.innerText;
    btn.innerText = "Salvando...";
    btn.disabled = true;

    const editando = window.currentEditPopCode;
    const valor = (id) => document.getElementById(id).value;

    try {
        const novaImagem = await window.fazerUploadImagem('pop-imagem-visual');
        const imagemAtual = document.getElementById('popModal').dataset.imagemAtual || null;

        const conteudoCompleto = {
            versao: valor('pop-versao'),
            data_emissao: valor('pop-data'),
            responsavel: valor('pop-responsavel'),
            objetivo: valor('pop-obj'),
            escopo: valor('pop-escopo'),
            responsabilidades: valor('pop-resp-detalhe'),
            materiais: valor('pop-materiais'),
            procedimento: valor('pop-procedimento'),
            qualidade: valor('pop-qualidade'),
            seguranca: valor('pop-seguranca'),
            manutencao: valor('pop-manutencao'),
            referencias: valor('pop-referencias'),
            anexo_dados: valor('pop-anexos-b64'),
            anexo_meta: valor('pop-anexos-meta')
        };

        const popData = {
            codigo: valor('pop-codigo'),
            titulo: valor('pop-titulo'),
            descricao: JSON.stringify(conteudoCompleto),
            imagem_url: novaImagem || imagemAtual,
            equipamento_id: valor('pop-equipamento') ? Number(valor('pop-equipamento')) : null
        };

        if (editando) {
            popData.mudancas = valor('pop-mudancas').trim();
            popData.tipo_revisao = valor('pop-tipo-revisao');
        }

        const res = await window.api.fetchProtected(editando ? `/pops/${encodeURIComponent(editando)}` : '/pops/', {
            method: editando ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(popData)
        });

        if (!res.ok) {
            const erro = await res.json().catch(() => ({}));
            throw new Error(typeof erro.detail === 'string' ? erro.detail : "Erro ao salvar no banco de dados.");
        }

        document.getElementById('popModal').remove();
        if (window.listagemAtual) window.listagemAtual.recarregar();
        window.UI.showToast(editando ? "POP atualizado com sucesso!" : "Procedimento salvo com sucesso!", "success");

    } catch (err) {
        window.UI.showToast(err.message || "Erro ao salvar POP.", "error");
        if (/mudou/.test(err.message || '')) {
            const campo = document.getElementById('pop-mudancas');
            if (campo) campo.focus();
        }
    } finally {
        btn.innerText = textoOriginal;
        btn.disabled = false;
    }
};

// ==========================================
// 6. LISTA COM BUSCA E PAGINAÇÃO
// ==========================================
function loadPopsTable() {
    window.listagemAtual = window.Listagem.criar({
        alvo: 'pops-container',
        endpoint: '/pops/',
        placeholder: 'Buscar por código, título ou conteúdo',
        cabecalho: '<th>Código</th><th>Título</th><th>Equipamento</th><th>Versão</th><th>Status</th><th class="end">Ações</th>',
        filtros: [{ param: 'equipamento_id', rotulo: 'Todos os equipamentos', opcoes: window.Vinculos.opcoesDeEquipamento }],
        vazio: { title: 'Nenhum POP registrado', description: 'Crie o primeiro Procedimento Operacional Padrão do laboratório.' },
        erro: 'Erro ao carregar lista de procedimentos.',
        renderLinha: (pop) => {
            const codigo = window.escapeHTML(pop.codigo);
            const status = pop.status || 'ativo';
            return `
                <tr>
                    <td class="code">${codigo}</td>
                    <td><strong>${window.escapeHTML(pop.titulo)}</strong></td>
                    <td>${pop.equipamento_nome ? window.escapeHTML(pop.equipamento_nome) : '<span class="text-faint">—</span>'}</td>
                    <td class="num">${window.escapeHTML(lerSecoesDoPop(pop.descricao).versao || '1.0')}</td>
                    <td><span class="badge ${status === 'ativo' ? 'badge-success' : ''}">${window.escapeHTML(status)}</span></td>
                    <td>
                        <div class="row-actions">
                            <button onclick="viewPopDetails(this.getAttribute('data-id'))" data-id="${codigo}" class="link-btn">Abrir</button>
                            <button onclick="window.openPopModal(this.getAttribute('data-id'))" data-id="${codigo}" class="link-btn muted">Editar</button>
                            <button onclick="window.removerPopOficial(this.getAttribute('data-id'))" data-id="${codigo}" class="link-btn danger">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        }
    });
}

// ==========================================
// 7. DOCUMENTO DO POP
// ==========================================
function formatPopSection(title, content) {
    return `<div class="pop-sec" style="margin-bottom: 15px; width: 100%; max-width: 100%;">
                <h4 style="margin: 0 0 5px 0; font-size: 12pt; font-weight: bold; color: #000;">${window.escapeHTML(title)}</h4>
                <div style="margin: 0; white-space: pre-wrap; word-wrap: break-word; text-align: justify; color: #000; font-size: 11pt;">${content ? window.escapeHTML(content) : 'Não informado.'}</div>
            </div>`;
}

function renderHistoricoDeRevisoes(pop, dados, revisoes, revisaoAberta) {
    const celula = 'border: 1px solid #000; padding: 8px;';
    const dataDe = (iso) => iso ? new Date(iso.endsWith('Z') ? iso : iso + 'Z').toLocaleDateString('pt-BR') : '';

    const linhas = revisoes.length
        ? revisoes.slice().reverse().map((r, indice, lista) => {
            const vigente = indice === lista.length - 1;
            const aberta = revisaoAberta ? revisaoAberta === r.id : vigente;
            const acao = aberta
                ? '<span data-html2canvas-ignore="true">aberta</span>'
                : `<button type="button" class="link-btn" data-html2canvas-ignore="true" data-codigo="${window.escapeHTML(pop.codigo)}" onclick="viewPopDetails(this.dataset.codigo, ${vigente ? 'null' : r.id})">ver</button>`;
            return `
                <tr>
                    <td style="${celula}">${dataDe(r.criado_em)}</td>
                    <td style="${celula}">${window.escapeHTML(r.versao)}${vigente ? ' (vigente)' : ''}</td>
                    <td style="${celula}">${window.escapeHTML(r.mudancas)}</td>
                    <td style="${celula}">${window.escapeHTML(r.autor_nome || '')}</td>
                    <td style="${celula}">${acao}</td>
                </tr>`;
        }).join('')
        : `
                <tr>
                    <td style="${celula}">${window.escapeHTML(dados.data_emissao || '')}</td>
                    <td style="${celula}">${window.escapeHTML(dados.versao || '1.0')}</td>
                    <td style="${celula}">Criação do documento</td>
                    <td style="${celula}">${window.escapeHTML(dados.responsavel || '')}</td>
                    <td style="${celula}"></td>
                </tr>`;

    return `
        <div class="pop-sec" style="margin-top: 25px; width: 100%; max-width: 100%; overflow-x: auto;">
            <h4 style="margin: 0 0 10px 0; font-size: 12pt; font-weight: bold; color: #000;">11. Histórico de Revisões</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 11pt; border: 1px solid #000; text-align: left;">
                <thead>
                    <tr style="background: #f9f9f9;">
                        <th style="${celula}">Data</th>
                        <th style="${celula}">Versão</th>
                        <th style="${celula}">Descrição das Alterações</th>
                        <th style="${celula}">Responsável</th>
                        <th style="${celula}"></th>
                    </tr>
                </thead>
                <tbody>${linhas}</tbody>
            </table>
        </div>`;
}

function renderPopDocxTemplate(pop, dados, revisoes = [], revisaoAberta = null) {
    const renderField = (value) => {
        if (!value) return 'Não informado.';
        if (value === '[object Object]') return 'Aviso: dados corrompidos. Edite o POP e passe a IA novamente.';

        let strValue = typeof value === 'object' ? JSON.stringify(value, null, 2).replace(/[\{\}\[\]"]/g, '') : String(value);
        return window.escapeHTML(strValue);
    };

    return `
        <div style="font-family: Arial, sans-serif; color: #000; width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden;">

            <h2 style="text-align: center; font-size: 16pt; margin-bottom: 20px; color: #000; font-weight: bold;">Prévia do Procedimento Operacional Padrão (POP)</h2>

            <div style="margin-bottom: 25px; line-height: 1.6; font-size: 11pt; word-wrap: break-word;">
                <strong>Título do Procedimento:</strong> ${renderField(pop.titulo)}<br>
                <strong>Código do Documento:</strong> ${renderField(pop.codigo)}<br>
                <strong>Versão:</strong> ${renderField(dados.versao || '1.0')}<br>
                <strong>Data de Emissão:</strong> ${renderField(dados.data_emissao)}<br>
                <strong>Responsável:</strong> ${renderField(dados.responsavel)}<br>
                <strong>Equipamento:</strong> ${renderField(pop.equipamento_nome)}
            </div>

            ${formatPopSection('1. Objetivo', dados.objetivo)}
            ${formatPopSection('2. Aplicação e Escopo', dados.escopo)}
            ${formatPopSection('3. Responsabilidades', dados.responsabilidades)}
            ${formatPopSection('4. Materiais e Equipamentos Necessários', dados.materiais)}
            ${formatPopSection('5. Procedimento Operacional', dados.procedimento)}
            ${formatPopSection('6. Controle de Qualidade', dados.qualidade)}
            ${formatPopSection('7. Segurança e Riscos', dados.seguranca)}
            ${formatPopSection('8. Manutenção e Calibração', dados.manutencao)}
            ${formatPopSection('9. Referências', dados.referencias)}

            ${pop.imagem_url ? `
            <div class="pop-sec" style="margin-bottom: 15px; width: 100%; max-width: 100%;">
                <h4 style="margin: 0 0 5px 0; font-size: 12pt; font-weight: bold; color: #000;">Imagens</h4>
                <div style="margin: 0; text-align: center;">
                    <img src="${window.escapeHTML(pop.imagem_url)}" style="max-width: 400px; border: 1px solid #000;" />
                </div>
            </div>` : ''}

            <div class="pop-sec" style="margin-bottom: 15px; width: 100%; max-width: 100%;">
                <h4 style="margin: 0 0 5px 0; font-size: 12pt; font-weight: bold; color: #000;">10. Anexos</h4>
                <div style="margin: 0; font-size: 11pt; color: #000;">
                    ${dados.anexo_dados
                        ? `<a href="${window.escapeHTML(dados.anexo_dados.startsWith('http') ? dados.anexo_dados : window.API_URL + dados.anexo_dados)}" target="_blank" style="display: inline-block; padding: 8px 15px; background: #333; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; font-family: Arial;">Baixar Anexo Oficial</a>`
                        : 'Não informado.'}
                </div>
            </div>

            ${renderHistoricoDeRevisoes(pop, dados, revisoes, revisaoAberta)}
        </div>`;
}

// ==========================================
// 8. ABRIR O POP OU UMA VERSÃO ANTERIOR
// ==========================================
window.viewPopDetails = async function(codigo, revisaoId = null) {
    const pop = await buscarPop(codigo);
    if (!pop) {
        window.UI.showToast('POP não encontrado.', 'error');
        return;
    }

    const revisoes = await buscarRevisoesDoPop(codigo);
    let exibido = pop;
    let avisoVersao = '';

    if (revisaoId) {
        const res = await window.api.fetchProtected(`/pops/${encodeURIComponent(codigo)}/revisoes/${revisaoId}`);
        if (!res.ok) {
            window.UI.showToast('Não foi possível abrir esta versão.', 'error');
            return;
        }
        const revisao = await res.json();
        exibido = { ...pop, titulo: revisao.titulo, descricao: revisao.descricao };
        avisoVersao = `
            <div class="note warn" data-html2canvas-ignore="true">
                <strong>Versão ${window.escapeHTML(revisao.versao)}, que não é a vigente.</strong>
                <button type="button" class="link-btn" data-codigo="${window.escapeHTML(pop.codigo)}" onclick="viewPopDetails(this.dataset.codigo)">Abrir a versão vigente</button>
            </div>`;
    }

    const antigo = document.getElementById('pop-document-container');
    if (antigo) antigo.remove();

    const divDocumento = document.createElement('div');
    divDocumento.id = "pop-document-container";
    divDocumento.className = 'doc-viewer';

    divDocumento.innerHTML = `
        <div class="doc-toolbar" data-html2canvas-ignore="true">
            <button onclick="document.getElementById('pop-document-container').remove()" class="link-btn">${window.Icon('arrow-left', { size: 14 })} Voltar</button>
            ${revisaoId ? '' : `<button onclick="downloadPopDocx(this.getAttribute('data-id'), this)" data-id="${window.escapeHTML(pop.codigo)}" class="btn btn-secondary btn-sm">Baixar .docx</button>`}
        </div>
        <div class="doc-page">
            ${avisoVersao}
            <div id="conteudo-para-pdf">
                ${renderPopDocxTemplate(exibido, lerSecoesDoPop(exibido.descricao), revisoes, revisaoId)}
            </div>
        </div>`;
    document.body.appendChild(divDocumento);
};

window.abrirPopPorCodigo = function(codigo) {
    return window.viewPopDetails(codigo);
};

window.downloadPopDocx = async function(codigo, btn) {
    const textoOriginal = btn ? btn.innerText : null;
    if (btn) { btn.disabled = true; btn.innerText = 'Gerando...'; }

    try {
        const res = await window.api.fetchProtected(`/pops/${encodeURIComponent(codigo)}/export-docx`);
        if (!res.ok) throw new Error('Erro ao gerar o documento .docx.');

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `POP_${codigo}.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (err) {
        window.UI.showToast(err.message || 'Erro ao baixar o POP.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = textoOriginal; }
    }
};

// ==========================================
// 9. INTEGRAÇÃO COM IA
// ==========================================
window.gerarComIA = async function() {
    const fileInput = document.getElementById('manual-ia');
    const btn = document.getElementById('btn-ia');
    const aviso = document.getElementById('ia-loading');

    if (!fileInput || !fileInput.files[0]) { window.UI.showToast("Selecione o PDF do manual.", "error"); return; }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("file", file);

    if (btn) { btn.disabled = true; btn.innerText = "Analisando..."; }
    if (aviso) aviso.classList.remove('hidden');

    try {
        const res = await window.api.fetchProtected('/pops/ai/gerar-pop/', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) throw new Error("A IA não conseguiu ler este PDF.");
        const dados = await res.json();

        const injetar = (idHTML, chave1, chave2) => {
            const el = document.getElementById(idHTML);
            let valor = dados[chave1] || dados[chave2] || dados[chave1.toLowerCase()] || dados[chave1.toUpperCase()];

            if (el && valor && valor !== "...") {
                if (typeof valor === 'object') {
                    el.value = JSON.stringify(valor, null, 2);
                } else {
                    el.value = valor;
                }
            }
        };

        injetar('pop-obj', 'objetivo', 'Objetivo');
        injetar('pop-escopo', 'escopo', 'Escopo');
        injetar('pop-resp-detalhe', 'responsabilidades', 'Responsabilidades');
        injetar('pop-materiais', 'materiais', 'Materiais');
        injetar('pop-procedimento', 'procedimento', 'Procedimento');
        injetar('pop-qualidade', 'qualidade', 'Qualidade');
        injetar('pop-seguranca', 'seguranca', 'Segurança');
        injetar('pop-manutencao', 'manutencao', 'Manutencao');
        injetar('pop-referencias', 'referencias', 'Referências');

        window.UI.showToast("Seções preenchidas a partir do manual. Revise antes de salvar.", "success");

    } catch (err) {
        window.UI.showToast(err.message, "error");
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = "Extrair do PDF"; }
        if (aviso) aviso.classList.add('hidden');
    }
};

// ==========================================
// 10. EXCLUSÃO
// ==========================================
window.removerPopOficial = async function(codigo) {
    const ok = await window.UI.confirm(
        `Você está prestes a excluir permanentemente o POP ${codigo} e todo o seu histórico de revisões. Essa ação não pode ser desfeita.`,
        { title: 'Excluir POP?', danger: true }
    );
    if (!ok) return;

    try {
        const res = await window.api.fetchProtected(`/pops/admin/${encodeURIComponent(codigo)}`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            const erro = await res.json();
            throw new Error(erro.detail || "Erro ao excluir.");
        }

        window.UI.showToast("POP removido com sucesso!", "success");
        if (window.listagemAtual) window.listagemAtual.recarregar();
    } catch (err) {
        window.UI.showToast(err.message, "error");
    }
};
