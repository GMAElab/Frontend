// ==========================================
// MÓDULO RSPACE ELN & INVENTORY (INTEGRAÇÃO COMPLETA v1)
// ==========================================

(function () {
    const state = {
        tab: 'documents',
        config: null,
        docsPage: 1,
        docsCache: [],
        currentFolderId: null,
        folderTrail: [{ id: null, nome: 'Workspace Raiz' }],
        filesPage: 1,
        formsPage: 1,
        invResource: 'samples',
        invPage: 1,
        activeJobId: null,
        jobTimer: null,
    };

    document.addEventListener('viewChanged', (e) => {
        if (e.detail.view === 'rspace') {
            iniciarModuloRSpace();
        } else if (state.jobTimer) {
            clearInterval(state.jobTimer);
            state.jobTimer = null;
        }
    });

    async function iniciarModuloRSpace() {
        const container = document.getElementById('dynamic-content');
        if (!container) return;

        container.innerHTML = `
            <header class="page-head fade-in">
                <div>
                    <p class="eyebrow">caderno eletrônico de laboratório &amp; inventário · api v1</p>
                    <h1>RSpace ELN</h1>
                    <p class="lede">Gerencie experimentos, cadernos, galeria de arquivos, formulários, amostras de inventário, auditoria e integração direta com Processos, POPs e PTA.</p>
                </div>
                <div class="page-actions" style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button type="button" class="btn btn-secondary" onclick="window.rspaceAbrirModalExportarSGCI()">
                        ${window.Icon('upload', { size: 14 })} Enviar do SGCI
                    </button>
                    <button type="button" class="btn btn-primary" onclick="window.rspaceAbrirModalNovoDoc()">
                        ${window.Icon('plus', { size: 14 })} Novo documento
                    </button>
                </div>
            </header>

            <div class="tabs-nav fade-in" style="margin-bottom: 18px; overflow-x: auto;">
                <button type="button" class="tab-btn active" data-rtab="documents" onclick="window.rspaceTrocarAba('documents')">
                    ${window.Icon('file-text', { size: 14 })} Documentos
                </button>
                <button type="button" class="tab-btn" data-rtab="folders" onclick="window.rspaceTrocarAba('folders')">
                    ${window.Icon('folder', { size: 14 })} Pastas &amp; Cadernos
                </button>
                <button type="button" class="tab-btn" data-rtab="files" onclick="window.rspaceTrocarAba('files')">
                    ${window.Icon('image', { size: 14 })} Galeria / Arquivos
                </button>
                <button type="button" class="tab-btn" data-rtab="forms" onclick="window.rspaceTrocarAba('forms')">
                    ${window.Icon('clipboard', { size: 14 })} Formulários
                </button>
                <button type="button" class="tab-btn" data-rtab="inventory" onclick="window.rspaceTrocarAba('inventory')">
                    ${window.Icon('package', { size: 14 })} Inventário
                </button>
                <button type="button" class="tab-btn" data-rtab="share" onclick="window.rspaceTrocarAba('share')">
                    ${window.Icon('share-2', { size: 14 })} Grupos &amp; Compartilhamento
                </button>
                <button type="button" class="tab-btn" data-rtab="tools" onclick="window.rspaceTrocarAba('tools')">
                    ${window.Icon('activity', { size: 14 })} Auditoria, Exportar &amp; Word
                </button>
            </div>

            <div id="rspace-tab-body" class="fade-in"></div>
        `;

        await carregarConfigRSpace();
        window.rspaceTrocarAba(state.tab || 'documents');
    }

    // ==========================================
    // STATUS E CONFIGURAÇÃO DE CREDENCIAIS
    // ==========================================

    async function carregarConfigRSpace() {
        const banner = document.getElementById('rspace-status-banner');
        if (!banner) return;

        try {
            const res = await window.api.fetchProtected('/rspace/config');
            if (!res.ok) throw new Error('Falha ao consultar configuração do RSpace.');
            const cfg = await res.json();
            state.config = cfg;

            if (!cfg.configured) {
                banner.innerHTML = `
                    <div class="note" style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; border-left: 3px solid var(--warning);">
                        <div>
                            <strong>${window.Icon('alert-triangle', { size: 14 })} Chave do RSpace ainda não configurada</strong>
                            <p class="help" style="margin-top:4px;">
                                Insira a variável <code class="mono">RSPACE_API_KEY</code> no arquivo <code class="mono">API/.env</code> (ou no Render) ou clique ao lado para vincular sua API Key pessoal cifrada.
                            </p>
                        </div>
                        <button type="button" class="btn btn-primary btn-sm" onclick="window.rspaceAbrirModalConfig()">
                            Conectar API Key
                        </button>
                    </div>`;
                return;
            }

            const modoLabel = cfg.mode === 'pessoal' ? 'Chave Pessoal (Cifrada)' : 'Chave Institucional (.env)';
            banner.innerHTML = `
                <div class="note" style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
                    <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                        <span class="code-pill">${window.Icon('check-circle', { size: 12 })} Conectado</span>
                        <span class="mono" style="font-size:12px;">${window.escapeHTML(modoLabel)}</span>
                        ${cfg.masked_key ? `<span class="mono text-faint" style="font-size:12px;">Key: ${window.escapeHTML(cfg.masked_key)}</span>` : ''}
                        <span class="mono text-faint" style="font-size:12px;">Servidor: <a href="${window.escapeHTML(cfg.base_url)}" target="_blank" rel="noopener" class="link-btn">${window.escapeHTML(cfg.base_url)}</a></span>
                        <span id="rspace-live-ping" class="mono text-faint" style="font-size:12px;"></span>
                    </div>
                    <div style="display:flex; gap:6px; align-items:center;">
                        <button type="button" class="link-btn" onclick="window.rspaceTestarStatusAoVivo()">
                            ${window.Icon('refresh-cw', { size: 13 })} Testar status
                        </button>
                        <a href="${window.escapeHTML(cfg.api_docs_url || 'https://community.researchspace.com/public/apiDocs')}" target="_blank" rel="noopener" class="link-btn muted">
                            ${window.Icon('external-link', { size: 13 })} Swagger Docs
                        </a>
                    </div>
                </div>`;
        } catch (err) {
            banner.innerHTML = `<div class="feedback-msg error">Não foi possível verificar o status do RSpace.</div>`;
        }
    }

    window.rspaceTestarStatusAoVivo = async function () {
        const pingEl = document.getElementById('rspace-live-ping');
        if (pingEl) pingEl.textContent = 'Verificando servidor...';
        try {
            const res = await window.api.fetchProtected('/rspace/status');
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || 'Erro ao testar status');
            if (pingEl) {
                pingEl.textContent = `· Versão ${data.rspace_version || 'v1'} · ${data.total_documentos ?? 0} docs acessíveis`;
            }
            window.UI.showToast(`RSpace Online (${data.rspace_version || 'v1'}) — ${data.total_documentos ?? 0} documentos disponíveis.`, 'success');
        } catch (err) {
            if (pingEl) pingEl.textContent = '· falha na verificação';
            window.UI.showToast(err.message || 'Falha ao conectar com o RSpace.', 'error');
        }
    };

    window.rspaceAbrirModalConfig = function () {
        const old = document.getElementById('rspace-config-modal');
        if (old) old.remove();

        const cfg = state.config || {};
        const modal = document.createElement('div');
        modal.id = 'rspace-config-modal';
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content modal-md">
                <div class="modal-header">
                    <div>
                        <p class="eyebrow">segurança &amp; autenticação</p>
                        <h3>Configurar API Key do RSpace</h3>
                    </div>
                    ${window.UI.closeButton("document.getElementById('rspace-config-modal')?.remove()")}
                </div>
                <form id="form-rspace-config">
                    <p class="dialog-text mb-md">
                        Sua chave pessoal é validada junto ao servidor RSpace e gravada no banco com criptografia simétrica <strong>Fernet (AES-128 + HMAC-SHA256)</strong>. Se preferir usar a chave institucional padrão do laboratório, basta configurá-la em <code class="mono">RSPACE_API_KEY</code> no <code class="mono">.env</code> / Render.
                    </p>
                    <div class="input-group">
                        <label for="rspace-cfg-url">URL do Servidor RSpace (HTTPS obrigatório)</label>
                        <input type="url" id="rspace-cfg-url" value="${window.escapeHTML(cfg.base_url || 'https://community.researchspace.com')}" placeholder="https://community.researchspace.com" required>
                        <span class="help">Protegido contra SSRF: apenas servidores HTTPS públicos são aceitos.</span>
                    </div>
                    <div class="input-group">
                        <label for="rspace-cfg-key">Sua RSpace API Key</label>
                        <input type="password" id="rspace-cfg-key" placeholder="Cole sua API Key gerada em MyRSpace -> Profile" required minlength="6" autocomplete="off">
                        <span class="help">No RSpace, acesse <strong>MyRSpace → Profile → Manage API Key</strong> para copiar sua chave.</span>
                    </div>
                    <div class="modal-footer split">
                        ${cfg.has_personal_key
                            ? `<button type="button" class="btn btn-danger-outline" onclick="window.rspaceRemoverChavePessoal()">Remover chave pessoal</button>`
                            : `<span></span>`}
                        <div style="display:flex; gap:8px;">
                            <button type="button" class="btn btn-secondary" onclick="document.getElementById('rspace-config-modal')?.remove()">Cancelar</button>
                            <button type="submit" id="btn-save-rspace-cfg" class="btn btn-primary">Testar e salvar</button>
                        </div>
                    </div>
                </form>
            </div>`;
        document.body.appendChild(modal);

        document.getElementById('form-rspace-config').onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-save-rspace-cfg');
            btn.disabled = true;
            btn.textContent = 'Testando conexão...';
            try {
                const payload = {
                    base_url: document.getElementById('rspace-cfg-url').value.trim(),
                    api_key: document.getElementById('rspace-cfg-key').value.trim(),
                };
                const res = await window.api.fetchProtected('/rspace/config', {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.detail || 'Não foi possível validar a chave.');

                window.UI.showToast(`Conectado ao RSpace! (${data.total_documentos ?? 0} documentos encontrados)`, 'success');
                modal.remove();
                await carregarConfigRSpace();
                window.rspaceTrocarAba(state.tab);
            } catch (err) {
                window.UI.showToast(err.message || 'Erro ao salvar configuração.', 'error');
                btn.disabled = false;
                btn.textContent = 'Testar e salvar';
            }
        };
    };

    window.rspaceRemoverChavePessoal = async function () {
        const ok = await window.UI.confirm(
            'Sua API Key pessoal será removida do banco de dados. O sistema passará a usar a chave institucional do .env (se configurada).',
            { title: 'Remover chave pessoal?', danger: true }
        );
        if (!ok) return;

        try {
            const res = await window.api.fetchProtected('/rspace/config', { method: 'DELETE' });
            if (!res.ok) throw new Error('Falha ao remover chave.');
            window.UI.showToast('Chave pessoal removida.', 'info');
            document.getElementById('rspace-config-modal')?.remove();
            await carregarConfigRSpace();
            window.rspaceTrocarAba(state.tab);
        } catch (err) {
            window.UI.showToast(err.message, 'error');
        }
    };

    // ==========================================
    // NAVEGAÇÃO ENTRE AS 7 ABAS DO RSPACE
    // ==========================================

    window.rspaceTrocarAba = function (aba) {
        state.tab = aba;
        document.querySelectorAll('[data-rtab]').forEach((btn) => {
            btn.classList.toggle('active', btn.getAttribute('data-rtab') === aba);
        });

        if (aba === 'documents') renderAbaDocumentos();
        else if (aba === 'folders') renderAbaPastas();
        else if (aba === 'files') renderAbaArquivos();
        else if (aba === 'forms') renderAbaFormularios();
        else if (aba === 'inventory') renderAbaInventario();
        else if (aba === 'share') renderAbaCompartilhamento();
        else if (aba === 'tools') renderAbaFerramentas();
    };

    // ==========================================
    // ABA 1: DOCUMENTOS (/api/v1/documents)
    // ==========================================

    function renderAbaDocumentos() {
        const body = document.getElementById('rspace-tab-body');
        if (!body) return;

        body.innerHTML = `
            <div class="toolbar">
                <div class="search-box grow">
                    ${window.Icon('search', { size: 15 })}
                    <input type="search" id="rspace-doc-q" class="form-control" data-busca placeholder="Buscar por termo, título, conteúdo ou Global ID (ex.: SD123)" onkeypress="if(event.key==='Enter') window.rspaceCarregarDocumentos(1)">
                </div>
                <input type="text" id="rspace-doc-tag" class="form-control" style="max-width:170px;" placeholder="Filtrar por tag" onkeypress="if(event.key==='Enter') window.rspaceCarregarDocumentos(1)">
                <select id="rspace-doc-order" class="form-control" onchange="window.rspaceCarregarDocumentos(1)">
                    <option value="lastModified desc">Modificados recentemente</option>
                    <option value="created desc">Criados recentemente</option>
                    <option value="name asc">Nome (A → Z)</option>
                    <option value="name desc">Nome (Z → A)</option>
                </select>
                <button type="button" class="btn btn-primary" onclick="window.rspaceCarregarDocumentos(1)">Buscar</button>
            </div>

            <div id="rspace-docs-list">${window.UI.loading('Consultando documentos no RSpace')}</div>

            <div id="rspace-docs-pagination" class="pagination hidden">
                <button type="button" id="rspace-docs-prev" class="link-btn" onclick="window.rspaceCarregarDocumentos(state.docsPage - 1)">
                    ${window.Icon('arrow-left', { size: 14 })} Anterior
                </button>
                <span id="rspace-docs-page-info" class="mono">página 1</span>
                <button type="button" id="rspace-docs-next" class="link-btn" onclick="window.rspaceCarregarDocumentos(state.docsPage + 1)">
                    Próxima ${window.Icon('arrow-right', { size: 14 })}
                </button>
            </div>
        `;

        window.rspaceCarregarDocumentos(1);
    }

    window.rspaceCarregarDocumentos = async function (pagina = 1) {
        state.docsPage = Math.max(1, pagina);
        const listEl = document.getElementById('rspace-docs-list');
        const pagEl = document.getElementById('rspace-docs-pagination');
        if (!listEl) return;

        const q = document.getElementById('rspace-doc-q')?.value.trim() || '';
        const tag = document.getElementById('rspace-doc-tag')?.value.trim() || '';
        const order = document.getElementById('rspace-doc-order')?.value || 'lastModified desc';

        listEl.innerHTML = window.UI.loading('Buscando documentos no RSpace');
        pagEl?.classList.add('hidden');

        try {
            const params = new URLSearchParams({
                page: String(state.docsPage),
                limit: '20',
                order_by: order,
            });
            if (q) params.set('q', q);
            if (tag) params.set('tag', tag);

            const res = await window.api.fetchProtected(`/rspace/documents?${params.toString()}`);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                if (res.status === 428) {
                    listEl.innerHTML = window.UI.emptyState({
                        title: 'Conecte sua API Key do RSpace',
                        description: data.detail || 'Configure a variável RSPACE_API_KEY no .env ou informe sua chave pessoal.',
                        actionLabel: 'Configurar API Key',
                        actionOnclick: 'window.rspaceAbrirModalConfig()',
                    });
                    return;
                }
                throw new Error(data.detail || 'Erro ao listar documentos.');
            }

            const docs = data.documents || [];
            state.docsCache = docs;

            if (!docs.length) {
                listEl.innerHTML = window.UI.emptyState({
                    title: 'Nenhum documento encontrado no RSpace',
                    description: 'Tente outros termos de busca ou crie um novo documento ELN.',
                    actionLabel: 'Novo documento',
                    actionOnclick: 'window.rspaceAbrirModalNovoDoc()',
                });
                return;
            }

            listEl.innerHTML = `
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID Global</th>
                                <th>Documento &amp; Tags</th>
                                <th class="col-hide-sm">Formulário</th>
                                <th class="col-hide-xs">Autor</th>
                                <th class="col-hide-sm">Modificado em</th>
                                <th class="end">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${docs.map((d) => {
                                const tagsHtml = (d.tags || []).map((t) => `<span class="code-pill" style="font-size:10.5px;">${window.escapeHTML(t)}</span>`).join(' ');
                                const dataMod = d.modificado_em ? new Date(d.modificado_em).toLocaleDateString('pt-BR') : '—';
                                return `
                                    <tr class="clickable" onclick="window.rspaceVerDocumento(${d.id})">
                                        <td class="code"><span class="code-pill">${window.escapeHTML(d.global_id || `SD${d.id}`)}</span></td>
                                        <td>
                                            <div class="cell-stack">
                                                <strong>${window.escapeHTML(d.titulo)}</strong>
                                                ${tagsHtml ? `<div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:3px;">${tagsHtml}</div>` : ''}
                                            </div>
                                        </td>
                                        <td class="col-hide-sm">${window.escapeHTML(d.formulario || 'Básico')}</td>
                                        <td class="col-hide-xs">${window.UI.avatar(d.autor || 'Pesquisador')}</td>
                                        <td class="num col-hide-sm">${dataMod}</td>
                                        <td class="end" onclick="event.stopPropagation()">
                                            <div class="row-actions">
                                                <button type="button" class="link-btn" onclick="window.rspaceVerDocumento(${d.id})">Abrir</button>
                                                <button type="button" class="link-btn muted" onclick="window.rspaceAbrirModalEditarDoc(${d.id})">Editar</button>
                                                <button type="button" class="link-btn danger" onclick="window.rspaceExcluirDocumento(${d.id})">Excluir</button>
                                            </div>
                                        </td>
                                    </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>`;

            if (pagEl) {
                pagEl.classList.remove('hidden');
                document.getElementById('rspace-docs-page-info').textContent = `página ${state.docsPage} · total ${data.total ?? docs.length}`;
                document.getElementById('rspace-docs-prev').style.visibility = state.docsPage > 1 ? 'visible' : 'hidden';
                document.getElementById('rspace-docs-next').style.visibility = docs.length >= 20 ? 'visible' : 'hidden';
            }
        } catch (err) {
            listEl.innerHTML = window.UI.errorState(err.message || 'Falha ao carregar documentos do RSpace.');
        }
    };

    // ==========================================
    // DETALHES DO DOCUMENTO + INTEGRAÇÃO PROCESSOS / PTA
    // ==========================================

    window.rspaceVerDocumento = async function (docId) {
        const old = document.getElementById('rspace-doc-modal');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'rspace-doc-modal';
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content modal-lg">
                <div class="modal-header">
                    <div>
                        <p class="eyebrow" id="rdoc-eyebrow">carregando experimento</p>
                        <h3 id="rdoc-title">Consultando RSpace...</h3>
                    </div>
                    ${window.UI.closeButton("document.getElementById('rspace-doc-modal')?.remove()")}
                </div>
                <div id="rdoc-body">${window.UI.loading('Lendo campos e anexos do documento')}</div>
            </div>`;
        document.body.appendChild(modal);

        try {
            const res = await window.api.fetchProtected(`/rspace/documents/${docId}`);
            const doc = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(doc.detail || 'Não foi possível abrir o documento.');

            document.getElementById('rdoc-eyebrow').textContent = `${doc.global_id} · ${doc.formulario || 'Documento ELN'} · por ${doc.autor}`;
            document.getElementById('rdoc-title').textContent = doc.titulo;

            const tagsHtml = (doc.tags || []).map((t) => `<span class="code-pill">${window.escapeHTML(t)}</span>`).join(' ');
            const fieldsHtml = (doc.fields || []).map((f, idx) => {
                const arquivosHtml = (f.arquivos || []).map((arq) => `
                    <button type="button" class="btn btn-secondary btn-sm" onclick="window.rspaceBaixarArquivo(${arq.id}, '${window.escapeHTML(arq.nome)}')">
                        ${window.Icon('download', { size: 13 })} ${window.escapeHTML(arq.global_id)}: ${window.escapeHTML(arq.nome)}
                    </button>
                `).join(' ');

                return `
                    <section class="note" style="margin-bottom: 12px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                            <strong>${idx + 1}. ${window.escapeHTML(f.nome || 'Seção')}</strong>
                            <span class="mono text-faint" style="font-size:11px;">tipo: ${window.escapeHTML(f.tipo || 'text')}</span>
                        </div>
                        <div class="entry-body" style="line-height:1.6;">
                            ${f.html_seguro || (f.texto ? `<p class="pre-wrap">${window.escapeHTML(f.texto)}</p>` : '<span class="text-faint">Campo vazio.</span>')}
                        </div>
                        ${arquivosHtml ? `<div style="margin-top:10px; display:flex; gap:6px; flex-wrap:wrap;">${arquivosHtml}</div>` : ''}
                    </section>`;
            }).join('');

            document.getElementById('rdoc-body').innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:14px;">
                    <div style="display:flex; gap:6px; flex-wrap:wrap;">${tagsHtml || '<span class="text-faint">Sem tags</span>'}</div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button type="button" class="btn btn-secondary btn-sm" onclick="window.rspaceCopiarTextoPTA()">
                            ${window.Icon('clipboard', { size: 13 })} Copiar resumo para PTA
                        </button>
                        <a href="${window.escapeHTML(doc.url_rspace)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">
                            ${window.Icon('external-link', { size: 13 })} Abrir no RSpace
                        </a>
                    </div>
                </div>

                <div style="max-height: 52vh; overflow-y: auto; padding-right: 4px;">
                    ${fieldsHtml || '<p class="text-faint">Este documento não possui campos preenchidos.</p>'}
                </div>

                <hr style="border:0; border-top:1px solid var(--line); margin:16px 0;">

                <div class="inline-form">
                    <select id="rdoc-link-process-select" class="form-control">
                        <option value="">Carregando processos de P&amp;D do SGCI...</option>
                    </select>
                    <button type="button" class="btn btn-primary" onclick="window.rspaceVincularAoProcesso(${doc.id})">
                        ${window.Icon('link', { size: 14 })} Registrar na linha do tempo do Processo
                    </button>
                </div>
            `;

            window._ultimoDocRSpace = doc;

            // Carrega processos do SGCI para permitir vinculação imediata
            const resProc = await window.api.fetchProtected('/processes/?limit=100');
            if (resProc.ok) {
                const listaProc = await resProc.json();
                const sel = document.getElementById('rdoc-link-process-select');
                if (sel) {
                    sel.innerHTML = listaProc.length
                        ? `<option value="">Selecione um Processo de P&amp;D para vincular este experimento...</option>` +
                          listaProc.map((p) => `<option value="${p.id}">${window.escapeHTML(p.nome_processo)}</option>`).join('')
                        : `<option value="">Nenhum processo cadastrado no SGCI</option>`;
                }
            }
        } catch (err) {
            document.getElementById('rdoc-body').innerHTML = window.UI.errorState(err.message);
        }
    };

    window.rspaceCopiarTextoPTA = function () {
        const doc = window._ultimoDocRSpace;
        if (!doc || !doc.texto_importacao) return;
        navigator.clipboard.writeText(doc.texto_importacao).then(() => {
            window.UI.showToast('Resumo copiado! Cole no seu relatório PTA ou tarefa.', 'success');
        }).catch(() => {
            window.UI.showToast('Não foi possível copiar automaticamente.', 'warning');
        });
    };

    window.rspaceVincularAoProcesso = async function (docId) {
        const sel = document.getElementById('rdoc-link-process-select');
        const procId = sel ? sel.value : '';
        if (!procId) {
            window.UI.showToast('Escolha um Processo de P&D na lista antes de vincular.', 'warning');
            return;
        }
        try {
            const res = await window.api.fetchProtected(`/rspace/documents/${docId}/link-process/${procId}`, {
                method: 'POST',
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || 'Erro ao vincular documento ao processo.');
            window.UI.showToast(`Experimento registrado na linha do tempo de "${data.process_name}"!`, 'success');
        } catch (err) {
            window.UI.showToast(err.message, 'error');
        }
    };

    // ==========================================
    // CRIAR E EDITAR DOCUMENTO NO RSPACE
    // ==========================================

    window.rspaceAbrirModalNovoDoc = async function (formIdPreselecionado = null) {
        const old = document.getElementById('rspace-edit-doc-modal');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'rspace-edit-doc-modal';
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content modal-lg">
                <div class="modal-header">
                    <div>
                        <p class="eyebrow">rspace eln · post /api/v1/documents</p>
                        <h3>Novo Documento no RSpace</h3>
                    </div>
                    ${window.UI.closeButton("document.getElementById('rspace-edit-doc-modal')?.remove()")}
                </div>
                <form id="form-rspace-new-doc">
                    <div class="field-grid">
                        <div class="input-group span-2">
                            <label for="rnew-name">Título do documento / experimento</label>
                            <input type="text" id="rnew-name" required placeholder="Ex.: Síntese hidrotérmica de nanopartículas TiO2 - Lote 04">
                        </div>
                        <div class="input-group">
                            <label for="rnew-tags">Tags (separadas por vírgula)</label>
                            <input type="text" id="rnew-tags" placeholder="SGCI, Síntese, DRX">
                        </div>
                        <div class="input-group">
                            <label for="rnew-folder">ID da Pasta ou Caderno destino (opcional)</label>
                            <input type="number" id="rnew-folder" value="${state.currentFolderId || ''}" placeholder="Raiz do Workspace">
                        </div>
                        <div class="input-group span-2">
                            <label for="rnew-form">Formulário estruturado (opcional)</label>
                            <select id="rnew-form">
                                <option value="">Documento Básico (Texto Livre)</option>
                            </select>
                        </div>
                    </div>
                    <div class="input-group" style="margin-top:12px;">
                        <label for="rnew-content">Conteúdo experimental (HTML ou texto)</label>
                        <textarea id="rnew-content" rows="8" placeholder="Descreva objetivos, reagentes, parâmetros de bancada e observações..."></textarea>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('rspace-edit-doc-modal')?.remove()">Cancelar</button>
                        <button type="submit" id="btn-rnew-submit" class="btn btn-primary">Criar no RSpace</button>
                    </div>
                </form>
            </div>`;
        document.body.appendChild(modal);

        // Carrega formulários publicados para o select
        try {
            const resF = await window.api.fetchProtected('/rspace/forms?filter_state=PUBLISHED&limit=50');
            if (resF.ok) {
                const dataF = await resF.json();
                const sel = document.getElementById('rnew-form');
                if (sel && Array.isArray(dataF.forms)) {
                    dataF.forms.forEach((f) => {
                        const opt = document.createElement('option');
                        opt.value = f.id;
                        opt.textContent = `${f.nome} (${f.global_id})`;
                        if (formIdPreselecionado && Number(formIdPreselecionado) === Number(f.id)) opt.selected = true;
                        sel.appendChild(opt);
                    });
                }
            }
        } catch (e) {}

        document.getElementById('form-rspace-new-doc').onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-rnew-submit');
            btn.disabled = true;
            btn.textContent = 'Criando...';
            try {
                const rawTags = document.getElementById('rnew-tags').value;
                const tags = rawTags ? rawTags.split(',').map((t) => t.trim()).filter(Boolean) : [];
                const folderVal = document.getElementById('rnew-folder').value;
                const formVal = document.getElementById('rnew-form').value;
                const texto = document.getElementById('rnew-content').value;
                const htmlContent = texto.includes('<') ? texto : `<p>${window.escapeHTML(texto).replace(/\n/g, '<br/>')}</p>`;

                const payload = {
                    name: document.getElementById('rnew-name').value.trim(),
                    tags,
                    parent_folder_id: folderVal ? Number(folderVal) : null,
                    form_id: formVal ? Number(formVal) : null,
                    fields: [{ content: htmlContent }],
                };

                const res = await window.api.fetchProtected('/rspace/documents', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
                const criado = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(criado.detail || 'Falha ao criar documento no RSpace.');

                window.UI.showToast(`Documento ${criado.global_id} criado com sucesso no RSpace!`, 'success');
                modal.remove();
                if (state.tab === 'documents') window.rspaceCarregarDocumentos(1);
                else if (state.tab === 'folders') window.rspaceCarregarPastas(state.currentFolderId);
            } catch (err) {
                window.UI.showToast(err.message, 'error');
                btn.disabled = false;
                btn.textContent = 'Criar no RSpace';
            }
        };
    };

    window.rspaceAbrirModalEditarDoc = async function (docId) {
        try {
            const res = await window.api.fetchProtected(`/rspace/documents/${docId}`);
            const doc = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(doc.detail || 'Erro ao carregar documento para edição.');

            const old = document.getElementById('rspace-edit-doc-modal');
            if (old) old.remove();

            const primeiroCampo = (doc.fields && doc.fields[0]) || { id: null, texto: '' };

            const modal = document.createElement('div');
            modal.id = 'rspace-edit-doc-modal';
            modal.className = 'modal-overlay';
            modal.style.display = 'flex';
            modal.innerHTML = `
                <div class="modal-content modal-lg">
                    <div class="modal-header">
                        <div>
                            <p class="eyebrow">editar ${window.escapeHTML(doc.global_id)}</p>
                            <h3>Editar Documento no RSpace</h3>
                        </div>
                        ${window.UI.closeButton("document.getElementById('rspace-edit-doc-modal')?.remove()")}
                    </div>
                    <form id="form-rspace-edit-doc">
                        <div class="field-grid">
                            <div class="input-group">
                                <label for="redit-name">Título</label>
                                <input type="text" id="redit-name" value="${window.escapeHTML(doc.titulo)}" required>
                            </div>
                            <div class="input-group">
                                <label for="redit-tags">Tags (separadas por vírgula)</label>
                                <input type="text" id="redit-tags" value="${window.escapeHTML((doc.tags || []).join(', '))}">
                            </div>
                        </div>
                        <div class="input-group" style="margin-top:12px;">
                            <label for="redit-content">Conteúdo da Seção Principal</label>
                            <textarea id="redit-content" rows="9">${window.escapeHTML(primeiroCampo.conteudo_original || primeiroCampo.texto || '')}</textarea>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="document.getElementById('rspace-edit-doc-modal')?.remove()">Cancelar</button>
                            <button type="submit" id="btn-redit-submit" class="btn btn-primary">Salvar no RSpace</button>
                        </div>
                    </form>
                </div>`;
            document.body.appendChild(modal);

            document.getElementById('form-rspace-edit-doc').onsubmit = async (e) => {
                e.preventDefault();
                const btn = document.getElementById('btn-redit-submit');
                btn.disabled = true;
                btn.textContent = 'Salvando...';
                try {
                    const tags = document.getElementById('redit-tags').value
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean);
                    const rawContent = document.getElementById('redit-content').value;
                    const htmlContent = rawContent.includes('<') ? rawContent : `<p>${window.escapeHTML(rawContent).replace(/\n/g, '<br/>')}</p>`;

                    const payload = {
                        name: document.getElementById('redit-name').value.trim(),
                        tags,
                        fields: [{ id: primeiroCampo.id || undefined, content: htmlContent }],
                    };

                    const resPut = await window.api.fetchProtected(`/rspace/documents/${docId}`, {
                        method: 'PUT',
                        body: JSON.stringify(payload),
                    });
                    const atualizado = await resPut.json().catch(() => ({}));
                    if (!resPut.ok) throw new Error(atualizado.detail || 'Erro ao atualizar documento.');

                    window.UI.showToast('Documento atualizado no RSpace!', 'success');
                    modal.remove();
                    window.rspaceCarregarDocumentos(state.docsPage);
                } catch (err) {
                    window.UI.showToast(err.message, 'error');
                    btn.disabled = false;
                    btn.textContent = 'Salvar no RSpace';
                }
            };
        } catch (err) {
            window.UI.showToast(err.message, 'error');
        }
    };

    window.rspaceExcluirDocumento = async function (docId) {
        const ok = await window.UI.confirm(
            `Deseja excluir o documento #${docId} no RSpace?`,
            { title: 'Excluir documento no RSpace?', danger: true }
        );
        if (!ok) return;

        try {
            const res = await window.api.fetchProtected(`/rspace/documents/${docId}`, { method: 'DELETE' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || 'Erro ao excluir documento.');
            window.UI.showToast('Documento excluído do RSpace.', 'success');
            window.rspaceCarregarDocumentos(state.docsPage);
        } catch (err) {
            window.UI.showToast(err.message, 'error');
        }
    };

    // ==========================================
    // EXPORTAR PROCESSO OU POP DO SGCI PARA O RSPACE
    // ==========================================

    window.rspaceAbrirModalExportarSGCI = async function () {
        const old = document.getElementById('rspace-push-sgci-modal');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'rspace-push-sgci-modal';
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content modal-md">
                <div class="modal-header">
                    <div>
                        <p class="eyebrow">integração sgci → rspace</p>
                        <h3>Enviar Processo ou POP para o RSpace</h3>
                    </div>
                    ${window.UI.closeButton("document.getElementById('rspace-push-sgci-modal')?.remove()")}
                </div>
                <div class="input-group">
                    <label for="rpush-tipo">Tipo de registro do SGCI</label>
                    <select id="rpush-tipo" onchange="window.rspaceCarregarItensSGCI()">
                        <option value="process">Processo de P&amp;D</option>
                        <option value="pop">Procedimento Operacional Padrão (POP)</option>
                    </select>
                </div>
                <div class="input-group">
                    <label for="rpush-item">Selecione o registro</label>
                    <select id="rpush-item"><option value="">Carregando...</option></select>
                </div>
                <div class="input-group">
                    <label for="rpush-folder">ID da Pasta/Caderno no RSpace (opcional)</label>
                    <input type="number" id="rpush-folder" placeholder="Deixe em branco para criar na raiz">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('rspace-push-sgci-modal')?.remove()">Cancelar</button>
                    <button type="button" id="btn-rpush-go" class="btn btn-primary" onclick="window.rspaceConfirmarEnvioSGCI()">Enviar para o RSpace</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        window.rspaceCarregarItensSGCI();
    };

    window.rspaceCarregarItensSGCI = async function () {
        const tipo = document.getElementById('rpush-tipo')?.value || 'process';
        const sel = document.getElementById('rpush-item');
        if (!sel) return;
        sel.innerHTML = '<option value="">Carregando...</option>';
        try {
            const endpoint = tipo === 'process' ? '/processes/?limit=100' : '/pops?limit=100';
            const res = await window.api.fetchProtected(endpoint);
            const itens = await res.json().catch(() => []);
            if (!Array.isArray(itens) || !itens.length) {
                sel.innerHTML = '<option value="">Nenhum item encontrado</option>';
                return;
            }
            sel.innerHTML = itens.map((item) => {
                const label = tipo === 'process' ? item.nome_processo : `${item.codigo} — ${item.titulo}`;
                return `<option value="${item.id}">${window.escapeHTML(label)}</option>`;
            }).join('');
        } catch (e) {
            sel.innerHTML = '<option value="">Erro ao carregar lista</option>';
        }
    };

    window.rspaceConfirmarEnvioSGCI = async function () {
        const tipo = document.getElementById('rpush-tipo')?.value || 'process';
        const itemId = document.getElementById('rpush-item')?.value;
        const folderId = document.getElementById('rpush-folder')?.value;
        if (!itemId) {
            window.UI.showToast('Selecione um registro para enviar.', 'warning');
            return;
        }
        const btn = document.getElementById('btn-rpush-go');
        btn.disabled = true;
        btn.textContent = 'Enviando ao RSpace...';
        try {
            const baseEndpoint = tipo === 'process'
                ? `/rspace/documents/from-process/${itemId}`
                : `/rspace/documents/from-pop/${itemId}`;
            const url = folderId ? `${baseEndpoint}?parent_folder_id=${encodeURIComponent(folderId)}` : baseEndpoint;

            const res = await window.api.fetchProtected(url, { method: 'POST' });
            const criado = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(criado.detail || 'Falha ao exportar para o RSpace.');

            window.UI.showToast(`Criado no RSpace como ${criado.global_id} (${criado.titulo})!`, 'success');
            document.getElementById('rspace-push-sgci-modal')?.remove();
            if (state.tab === 'documents') window.rspaceCarregarDocumentos(1);
        } catch (err) {
            window.UI.showToast(err.message, 'error');
            btn.disabled = false;
            btn.textContent = 'Enviar para o RSpace';
        }
    };

    // ==========================================
    // ABA 2: PASTAS E CADERNOS (/api/v1/folders)
    // ==========================================

    function renderAbaPastas() {
        const body = document.getElementById('rspace-tab-body');
        if (!body) return;

        body.innerHTML = `
            <div class="toolbar" style="justify-content:space-between;">
                <div id="rspace-folder-breadcrumbs" style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;"></div>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <select id="rspace-folder-filter" class="form-control" onchange="window.rspaceCarregarPastas(state.currentFolderId)">
                        <option value="">Todos (Pastas, Cadernos e Docs)</option>
                        <option value="FOLDER,NOTEBOOK">Apenas Pastas e Cadernos</option>
                        <option value="NOTEBOOK">Apenas Cadernos (Notebooks)</option>
                        <option value="DOCUMENT">Apenas Documentos</option>
                    </select>
                    <button type="button" class="btn btn-secondary" onclick="window.rspaceAbrirModalNovaPasta(false)">
                        ${window.Icon('plus', { size: 14 })} Nova Pasta
                    </button>
                    <button type="button" class="btn btn-primary" onclick="window.rspaceAbrirModalNovaPasta(true)">
                        ${window.Icon('book-open', { size: 14 })} Novo Caderno
                    </button>
                </div>
            </div>
            <div id="rspace-folders-list">${window.UI.loading('Carregando árvore do Workspace')}</div>
        `;

        window.rspaceCarregarPastas(state.currentFolderId);
    }

    function atualizarBreadcrumbsPastas() {
        const el = document.getElementById('rspace-folder-breadcrumbs');
        if (!el) return;
        el.innerHTML = state.folderTrail.map((item, idx) => {
            const ativo = idx === state.folderTrail.length - 1;
            return `
                <button type="button" class="link-btn ${ativo ? '' : 'muted'}" onclick="window.rspaceNavegarTrilha(${idx})">
                    ${window.escapeHTML(item.nome)}
                </button>
                ${!ativo ? '<span class="text-faint">/</span>' : ''}
            `;
        }).join('');
    }

    window.rspaceNavegarTrilha = function (indice) {
        state.folderTrail = state.folderTrail.slice(0, indice + 1);
        const atual = state.folderTrail[state.folderTrail.length - 1];
        state.currentFolderId = atual ? atual.id : null;
        window.rspaceCarregarPastas(state.currentFolderId);
    };

    window.rspaceEntrarPasta = function (id, nome) {
        state.currentFolderId = id;
        state.folderTrail.push({ id, nome });
        window.rspaceCarregarPastas(id);
    };

    window.rspaceCarregarPastas = async function (folderId = null) {
        state.currentFolderId = folderId;
        atualizarBreadcrumbsPastas();
        const listEl = document.getElementById('rspace-folders-list');
        if (!listEl) return;

        const filtro = document.getElementById('rspace-folder-filter')?.value || '';
        listEl.innerHTML = window.UI.loading('Lendo estrutura de pastas e cadernos');

        try {
            const params = new URLSearchParams({ limit: '50' });
            if (folderId) params.set('folder_id', String(folderId));
            if (filtro) params.set('types_to_include', filtro);

            const res = await window.api.fetchProtected(`/rspace/folders/tree?${params.toString()}`);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || 'Erro ao carregar pastas.');

            const records = data.records || [];
            if (!records.length) {
                listEl.innerHTML = window.UI.emptyState({
                    title: 'Esta pasta está vazia',
                    description: 'Crie uma subpasta, um caderno de laboratório ou um documento aqui.',
                });
                return;
            }

            listEl.innerHTML = `
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID Global</th>
                                <th>Nome</th>
                                <th>Tipo</th>
                                <th class="col-hide-sm">Modificado em</th>
                                <th class="end">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${records.map((r) => {
                                const ehDoc = r.tipo === 'DOCUMENT';
                                const icone = ehDoc ? 'file-text' : (r.tipo === 'NOTEBOOK' ? 'book-open' : 'folder');
                                const acaoClique = ehDoc
                                    ? `window.rspaceVerDocumento(${r.id})`
                                    : `window.rspaceEntrarPasta(${r.id}, '${window.escapeHTML(r.nome).replace(/'/g, "\\'")}')`;

                                return `
                                    <tr class="clickable" onclick="${acaoClique}">
                                        <td class="code"><span class="code-pill">${window.escapeHTML(r.global_id)}</span></td>
                                        <td>
                                            <div class="cell-title-row">
                                                <span class="cell-icon">${window.Icon(icone, { size: 14 })}</span>
                                                <strong>${window.escapeHTML(r.nome)}</strong>
                                            </div>
                                        </td>
                                        <td><span class="mono" style="font-size:11.5px;">${window.escapeHTML(r.tipo)}</span></td>
                                        <td class="num col-hide-sm">${r.modificado_em ? new Date(r.modificado_em).toLocaleDateString('pt-BR') : '—'}</td>
                                        <td class="end" onclick="event.stopPropagation()">
                                            <div class="row-actions">
                                                <button type="button" class="link-btn" onclick="${acaoClique}">${ehDoc ? 'Ver doc' : 'Abrir'}</button>
                                                ${!ehDoc ? `<button type="button" class="link-btn danger" onclick="window.rspaceExcluirPasta(${r.id})">Excluir</button>` : ''}
                                            </div>
                                        </td>
                                    </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>`;
        } catch (err) {
            listEl.innerHTML = window.UI.errorState(err.message);
        }
    };

    window.rspaceAbrirModalNovaPasta = function (ehCaderno = false) {
        const old = document.getElementById('rspace-new-folder-modal');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'rspace-new-folder-modal';
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content modal-sm">
                <div class="modal-header">
                    <h3>${ehCaderno ? 'Novo Caderno (Notebook)' : 'Nova Pasta'}</h3>
                    ${window.UI.closeButton("document.getElementById('rspace-new-folder-modal')?.remove()")}
                </div>
                <form id="form-rspace-folder">
                    <div class="input-group">
                        <label for="rfolder-name">Nome ${ehCaderno ? 'do caderno' : 'da pasta'}</label>
                        <input type="text" id="rfolder-name" required placeholder="${ehCaderno ? 'Ex.: Caderno de Síntese 2026' : 'Ex.: Difração de Raios X'}">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('rspace-new-folder-modal')?.remove()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Criar</button>
                    </div>
                </form>
            </div>`;
        document.body.appendChild(modal);

        document.getElementById('form-rspace-folder').onsubmit = async (e) => {
            e.preventDefault();
            try {
                const res = await window.api.fetchProtected('/rspace/folders', {
                    method: 'POST',
                    body: JSON.stringify({
                        name: document.getElementById('rfolder-name').value.trim(),
                        parent_folder_id: state.currentFolderId || null,
                        notebook: ehCaderno,
                    }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.detail || 'Erro ao criar pasta/caderno.');
                window.UI.showToast(`${ehCaderno ? 'Caderno' : 'Pasta'} "${data.nome}" criado(a)!`, 'success');
                modal.remove();
                window.rspaceCarregarPastas(state.currentFolderId);
            } catch (err) {
                window.UI.showToast(err.message, 'error');
            }
        };
    };

    window.rspaceExcluirPasta = async function (folderId) {
        const ok = await window.UI.confirm('Deseja excluir esta pasta/caderno do RSpace?', { danger: true });
        if (!ok) return;
        try {
            const res = await window.api.fetchProtected(`/rspace/folders/${folderId}`, { method: 'DELETE' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || 'Não foi possível excluir.');
            window.UI.showToast('Pasta/caderno excluído.', 'success');
            window.rspaceCarregarPastas(state.currentFolderId);
        } catch (err) {
            window.UI.showToast(err.message, 'error');
        }
    };

    // ==========================================
    // ABA 3: ARQUIVOS E GALERIA (/api/v1/files)
    // ==========================================

    function renderAbaArquivos() {
        const body = document.getElementById('rspace-tab-body');
        if (!body) return;

        body.innerHTML = `
            <div class="toolbar" style="justify-content:space-between;">
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <select id="rspace-files-type" class="form-control" onchange="window.rspaceCarregarArquivos(1)">
                        <option value="image">Imagens (PNG, JPG, GIF, TIFF)</option>
                        <option value="document">Documentos (PDF, DOCX, XLSX, CSV)</option>
                        <option value="av">Áudio &amp; Vídeo</option>
                        <option value="other">Outros Arquivos Cientificos</option>
                    </select>
                    <select id="rspace-files-order" class="form-control" onchange="window.rspaceCarregarArquivos(1)">
                        <option value="created desc">Mais recentes primeiro</option>
                        <option value="created asc">Mais antigos primeiro</option>
                        <option value="name asc">Nome (A → Z)</option>
                    </select>
                </div>
                <button type="button" class="btn btn-primary" onclick="window.rspaceAbrirModalUploadArquivo()">
                    ${window.Icon('upload', { size: 14 })} Enviar arquivo para a Galeria
                </button>
            </div>
            <div id="rspace-files-list">${window.UI.loading('Carregando Galeria do RSpace')}</div>
        `;

        window.rspaceCarregarArquivos(1);
    }

    window.rspaceCarregarArquivos = async function (page = 1) {
        state.filesPage = Math.max(1, page);
        const listEl = document.getElementById('rspace-files-list');
        if (!listEl) return;

        const mediaType = document.getElementById('rspace-files-type')?.value || 'image';
        const orderBy = document.getElementById('rspace-files-order')?.value || 'created desc';
        listEl.innerHTML = window.UI.loading('Consultando Galeria RSpace');

        try {
            const res = await window.api.fetchProtected(
                `/rspace/files?page=${state.filesPage}&limit=25&media_type=${encodeURIComponent(mediaType)}&order_by=${encodeURIComponent(orderBy)}`
            );
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || 'Erro ao carregar arquivos.');

            const files = data.files || [];
            if (!files.length) {
                listEl.innerHTML = window.UI.emptyState({
                    title: 'Nenhum arquivo nesta categoria da Galeria',
                    description: 'Envie imagens de microscopia, espectros, planilhas ou PDFs para a Galeria do RSpace.',
                    actionLabel: 'Enviar arquivo',
                    actionOnclick: 'window.rspaceAbrirModalUploadArquivo()',
                });
                return;
            }

            listEl.innerHTML = `
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID Global</th>
                                <th>Arquivo &amp; Legenda</th>
                                <th class="col-hide-sm">Tipo MIME</th>
                                <th class="col-hide-xs">Tamanho</th>
                                <th class="col-hide-sm">Criado em</th>
                                <th class="end">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${files.map((f) => {
                                const kb = f.tamanho ? `${(f.tamanho / 1024).toFixed(1)} KB` : '—';
                                return `
                                    <tr>
                                        <td class="code"><span class="code-pill">${window.escapeHTML(f.global_id)}</span></td>
                                        <td>
                                            <div class="cell-stack">
                                                <strong>${window.escapeHTML(f.nome)}</strong>
                                                ${f.caption ? `<span class="cell-sub">${window.escapeHTML(f.caption)}</span>` : ''}
                                            </div>
                                        </td>
                                        <td class="mono col-hide-sm" style="font-size:11.5px;">${window.escapeHTML(f.content_type)}</td>
                                        <td class="num col-hide-xs">${kb}</td>
                                        <td class="num col-hide-sm">${f.criado_em ? new Date(f.criado_em).toLocaleDateString('pt-BR') : '—'}</td>
                                        <td class="end">
                                            <button type="button" class="link-btn" onclick="window.rspaceBaixarArquivo(${f.id}, '${window.escapeHTML(f.nome).replace(/'/g, "\\'")}')">
                                                ${window.Icon('download', { size: 13 })} Baixar
                                            </button>
                                        </td>
                                    </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>`;
        } catch (err) {
            listEl.innerHTML = window.UI.errorState(err.message);
        }
    };

    window.rspaceBaixarArquivo = async function (fileId, filename) {
        try {
            window.UI.showToast(`Baixando ${filename || 'arquivo'} do RSpace...`, 'info');
            const res = await window.api.fetchProtected(`/rspace/files/${fileId}/download`);
            if (!res.ok) throw new Error('Falha ao baixar arquivo do RSpace.');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || `rspace_${fileId}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            window.UI.showToast(err.message, 'error');
        }
    };

    window.rspaceAbrirModalUploadArquivo = function () {
        const old = document.getElementById('rspace-upload-modal');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'rspace-upload-modal';
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content modal-sm">
                <div class="modal-header">
                    <h3>Enviar para a Galeria RSpace</h3>
                    ${window.UI.closeButton("document.getElementById('rspace-upload-modal')?.remove()")}
                </div>
                <form id="form-rspace-upload">
                    <div class="input-group">
                        <label for="rupload-file">Arquivo ( até 15 MB )</label>
                        <input type="file" id="rupload-file" required>
                    </div>
                    <div class="input-group">
                        <label for="rupload-caption">Legenda / Descrição</label>
                        <input type="text" id="rupload-caption" placeholder="Ex.: Micrografia MEV amostra A2">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('rspace-upload-modal')?.remove()">Cancelar</button>
                        <button type="submit" id="btn-rupload-go" class="btn btn-primary">Enviar</button>
                    </div>
                </form>
            </div>`;
        document.body.appendChild(modal);

        document.getElementById('form-rspace-upload').onsubmit = async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('rupload-file');
            if (!fileInput.files.length) return;

            const btn = document.getElementById('btn-rupload-go');
            btn.disabled = true;
            btn.textContent = 'Enviando...';

            try {
                const fd = new FormData();
                fd.append('file', fileInput.files[0]);
                const cap = document.getElementById('rupload-caption').value.trim();
                if (cap) fd.append('caption', cap);

                const res = await window.api.fetchProtected('/rspace/files', {
                    method: 'POST',
                    body: fd,
                });
                const enviado = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(enviado.detail || 'Falha ao enviar arquivo.');

                window.UI.showToast(`Arquivo ${enviado.global_id} enviado para a Galeria RSpace!`, 'success');
                modal.remove();
                window.rspaceCarregarArquivos(1);
            } catch (err) {
                window.UI.showToast(err.message, 'error');
                btn.disabled = false;
                btn.textContent = 'Enviar';
            }
        };
    };

    // ==========================================
    // ABA 4: FORMULÁRIOS (/api/v1/forms)
    // ==========================================

    function renderAbaFormularios() {
        const body = document.getElementById('rspace-tab-body');
        if (!body) return;

        body.innerHTML = `
            <div class="toolbar" style="justify-content:space-between;">
                <select id="rspace-forms-state" class="form-control" onchange="window.rspaceCarregarFormularios(1)">
                    <option value="ALL">Todos os status</option>
                    <option value="PUBLISHED">Publicados (PUBLISHED)</option>
                    <option value="NEW">Novos / Rascunho (NEW)</option>
                    <option value="UNPUBLISHED">Despublicados (UNPUBLISHED)</option>
                </select>
                <button type="button" class="btn btn-primary" onclick="window.rspaceAbrirModalNovoFormulario()">
                    ${window.Icon('plus', { size: 14 })} Novo Formulário RSpace
                </button>
            </div>
            <div id="rspace-forms-list">${window.UI.loading('Carregando formulários do RSpace')}</div>
        `;

        window.rspaceCarregarFormularios(1);
    }

    window.rspaceCarregarFormularios = async function (page = 1) {
        state.formsPage = Math.max(1, page);
        const listEl = document.getElementById('rspace-forms-list');
        if (!listEl) return;

        const filterState = document.getElementById('rspace-forms-state')?.value || 'ALL';
        listEl.innerHTML = window.UI.loading('Buscando formulários no RSpace');

        try {
            const res = await window.api.fetchProtected(`/rspace/forms?page=${state.formsPage}&limit=25&filter_state=${encodeURIComponent(filterState)}`);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || 'Erro ao listar formulários.');

            const forms = data.forms || [];
            if (!forms.length) {
                listEl.innerHTML = window.UI.emptyState({
                    title: 'Nenhum formulário encontrado',
                    description: 'Crie formulários padronizados para estruturar os experimentos da equipe.',
                    actionLabel: 'Novo formulário',
                    actionOnclick: 'window.rspaceAbrirModalNovoFormulario()',
                });
                return;
            }

            listEl.innerHTML = `
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID Global</th>
                                <th>Nome do Formulário</th>
                                <th>Estado</th>
                                <th class="end">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${forms.map((f) => `
                                <tr>
                                    <td class="code"><span class="code-pill">${window.escapeHTML(f.global_id)}</span></td>
                                    <td><strong>${window.escapeHTML(f.nome)}</strong></td>
                                    <td><span class="mono" style="font-size:11.5px;">${window.escapeHTML(f.estado)}</span></td>
                                    <td class="end">
                                        <div class="row-actions">
                                            <button type="button" class="link-btn" onclick="window.rspaceAbrirModalNovoDoc(${f.id})">Usar em doc</button>
                                            <button type="button" class="link-btn muted" onclick="window.rspaceAcaoFormulario(${f.id}, 'publish')">Publicar</button>
                                            <button type="button" class="link-btn muted" onclick="window.rspaceAcaoFormulario(${f.id}, 'share')">Compartilhar</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>`;
        } catch (err) {
            listEl.innerHTML = window.UI.errorState(err.message);
        }
    };

    window.rspaceAcaoFormulario = async function (formId, acao) {
        try {
            const res = await window.api.fetchProtected(`/rspace/forms/${formId}/${acao}`, { method: 'POST' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || `Erro ao executar ${acao} no formulário.`);
            window.UI.showToast(`Ação "${acao}" aplicada com sucesso ao formulário!`, 'success');
            window.rspaceCarregarFormularios(state.formsPage);
        } catch (err) {
            window.UI.showToast(err.message, 'error');
        }
    };

    window.rspaceAbrirModalNovoFormulario = function () {
        const old = document.getElementById('rspace-new-form-modal');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'rspace-new-form-modal';
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content modal-md">
                <div class="modal-header">
                    <h3>Criar Formulário no RSpace</h3>
                    ${window.UI.closeButton("document.getElementById('rspace-new-form-modal')?.remove()")}
                </div>
                <form id="form-rspace-create-form">
                    <div class="input-group">
                        <label for="rfm-name">Nome do Formulário</label>
                        <input type="text" id="rfm-name" required placeholder="Ex.: Ficha de Caracterização Reológica">
                    </div>
                    <div class="input-group">
                        <label for="rfm-fields">Campos (um por linha no formato: Nome do Campo | Tipo)</label>
                        <textarea id="rfm-fields" rows="5" placeholder="Amostra | String&#10;Temperatura (°C) | Number&#10;Procedimento e Observações | Text&#10;Data do Ensaio | Date">Amostra | String
Temperatura (°C) | Number
Procedimento e Observações | Text</textarea>
                        <span class="help">Tipos aceitos pelo RSpace: <code>Text</code>, <code>String</code>, <code>Number</code>, <code>Date</code>, <code>Time</code>.</span>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('rspace-new-form-modal')?.remove()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Criar formulário</button>
                    </div>
                </form>
            </div>`;
        document.body.appendChild(modal);

        document.getElementById('form-rspace-create-form').onsubmit = async (e) => {
            e.preventDefault();
            try {
                const linhas = document.getElementById('rfm-fields').value.split('\n').map((l) => l.trim()).filter(Boolean);
                const fields = linhas.map((ln) => {
                    const partes = ln.split('|').map((p) => p.trim());
                    return { name: partes[0] || 'Campo', type: partes[1] || 'Text' };
                });

                const res = await window.api.fetchProtected('/rspace/forms', {
                    method: 'POST',
                    body: JSON.stringify({
                        name: document.getElementById('rfm-name').value.trim(),
                        fields,
                    }),
                });
                const criado = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(criado.detail || 'Erro ao criar formulário.');
                window.UI.showToast(`Formulário ${criado.global_id} criado!`, 'success');
                modal.remove();
                window.rspaceCarregarFormularios(1);
            } catch (err) {
                window.UI.showToast(err.message, 'error');
            }
        };
    };

    // ==========================================
    // ABA 5: RSPACE INVENTORY (/api/inventory/v1)
    // ==========================================

    function renderAbaInventario() {
        const body = document.getElementById('rspace-tab-body');
        if (!body) return;

        body.innerHTML = `
            <div class="toolbar" style="justify-content:space-between;">
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <select id="rspace-inv-resource" class="form-control" onchange="window.rspaceCarregarInventario(1)">
                        <option value="samples" ${state.invResource === 'samples' ? 'selected' : ''}>Amostras (Samples)</option>
                        <option value="subsamples" ${state.invResource === 'subsamples' ? 'selected' : ''}>Alíquotas / Subamostras (Subsamples)</option>
                        <option value="containers" ${state.invResource === 'containers' ? 'selected' : ''}>Containers &amp; Caixas (Containers)</option>
                        <option value="templates" ${state.invResource === 'templates' ? 'selected' : ''}>Templates de Amostra</option>
                    </select>
                    <input type="search" id="rspace-inv-barcode" class="form-control" placeholder="Buscar Barcode / Código" onkeypress="if(event.key==='Enter') window.rspaceBuscarBarcode()">
                    <button type="button" class="btn btn-secondary" onclick="window.rspaceBuscarBarcode()">Ler Barcode</button>
                </div>
                <div style="display:flex; gap:8px;">
                    <button type="button" class="btn btn-secondary" onclick="window.rspaceAbrirModalNovoContainer()">
                        ${window.Icon('plus', { size: 14 })} Novo Container
                    </button>
                    <button type="button" class="btn btn-primary" onclick="window.rspaceAbrirModalNovaAmostra()">
                        ${window.Icon('plus', { size: 14 })} Nova Amostra
                    </button>
                </div>
            </div>
            <div id="rspace-inv-list">${window.UI.loading('Consultando RSpace Inventory')}</div>
        `;

        window.rspaceCarregarInventario(1);
    }

    window.rspaceCarregarInventario = async function (page = 1) {
        state.invPage = Math.max(1, page);
        state.invResource = document.getElementById('rspace-inv-resource')?.value || 'samples';
        const listEl = document.getElementById('rspace-inv-list');
        if (!listEl) return;

        listEl.innerHTML = window.UI.loading('Carregando itens do RSpace Inventory');

        try {
            const res = await window.api.fetchProtected(`/rspace/inventory/${state.invResource}?page=${state.invPage}&limit=25`);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || 'Erro ao consultar RSpace Inventory.');

            const items = data.items || [];
            if (!items.length) {
                listEl.innerHTML = window.UI.emptyState({
                    title: 'Nenhum item encontrado no Inventário',
                    description: 'Cadastre amostras, reagentes, alíquotas ou containers de armazenamento no RSpace Inventory.',
                    actionLabel: 'Nova Amostra',
                    actionOnclick: 'window.rspaceAbrirModalNovaAmostra()',
                });
                return;
            }

            listEl.innerHTML = `
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID Global</th>
                                <th>Nome &amp; Descrição</th>
                                <th>Tipo</th>
                                <th class="col-hide-sm">Subamostras / Qtd</th>
                                <th class="col-hide-xs">Autor</th>
                                <th class="end">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map((item) => `
                                <tr>
                                    <td class="code"><span class="code-pill">${window.escapeHTML(item.global_id)}</span></td>
                                    <td>
                                        <div class="cell-stack">
                                            <strong>${window.escapeHTML(item.nome)}</strong>
                                            ${item.descricao ? `<span class="cell-sub">${window.escapeHTML(item.descricao)}</span>` : ''}
                                        </div>
                                    </td>
                                    <td><span class="mono" style="font-size:11.5px;">${window.escapeHTML(item.tipo)}</span></td>
                                    <td class="num col-hide-sm">${item.subsamples_count || '—'}</td>
                                    <td class="col-hide-xs">${window.UI.avatar(item.autor || 'Pesquisador')}</td>
                                    <td class="end">
                                        ${state.invResource === 'samples'
                                            ? `<button type="button" class="link-btn danger" onclick="window.rspaceExcluirAmostra(${item.id})">Excluir</button>`
                                            : `<span class="text-faint">—</span>`}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>`;
        } catch (err) {
            listEl.innerHTML = window.UI.errorState(err.message);
        }
    };

    window.rspaceBuscarBarcode = async function () {
        const codigo = document.getElementById('rspace-inv-barcode')?.value.trim();
        if (!codigo) return;
        const listEl = document.getElementById('rspace-inv-list');
        if (listEl) listEl.innerHTML = window.UI.loading(`Buscando código de barras ${codigo}`);
        try {
            const res = await window.api.fetchProtected(`/rspace/inventory/barcode/${encodeURIComponent(codigo)}`);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || 'Código de barras não encontrado.');
            listEl.innerHTML = `
                <div class="note">
                    <h4>Resultado para Barcode: <span class="mono">${window.escapeHTML(codigo)}</span></h4>
                    <pre class="mono" style="font-size:12px; overflow-x:auto; margin-top:8px;">${window.escapeHTML(JSON.stringify(data, null, 2))}</pre>
                </div>`;
        } catch (err) {
            window.UI.showToast(err.message, 'error');
            window.rspaceCarregarInventario(1);
        }
    };

    window.rspaceAbrirModalNovaAmostra = function () {
        const old = document.getElementById('rspace-sample-modal');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'rspace-sample-modal';
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content modal-sm">
                <div class="modal-header">
                    <h3>Nova Amostra (RSpace Inventory)</h3>
                    ${window.UI.closeButton("document.getElementById('rspace-sample-modal')?.remove()")}
                </div>
                <form id="form-rspace-sample">
                    <div class="input-group">
                        <label for="rsamp-name">Nome da Amostra / Reagente</label>
                        <input type="text" id="rsamp-name" required placeholder="Ex.: Solução Precursora Grafeno Óxido 2mg/mL">
                    </div>
                    <div class="input-group">
                        <label for="rsamp-desc">Descrição / Condições de armazenamento</label>
                        <textarea id="rsamp-desc" rows="3" placeholder="Armazenar a 4 °C ao abrigo de luz"></textarea>
                    </div>
                    <div class="field-grid">
                        <div class="input-group">
                            <label for="rsamp-count">Nº de Alíquotas (Subsamples)</label>
                            <input type="number" id="rsamp-count" value="1" min="1" max="100" required>
                        </div>
                        <div class="input-group">
                            <label for="rsamp-tags">Tags</label>
                            <input type="text" id="rsamp-tags" placeholder="SGCI, Reagente">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('rspace-sample-modal')?.remove()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Cadastrar Amostra</button>
                    </div>
                </form>
            </div>`;
        document.body.appendChild(modal);

        document.getElementById('form-rspace-sample').onsubmit = async (e) => {
            e.preventDefault();
            try {
                const tags = document.getElementById('rsamp-tags').value.split(',').map((t) => t.trim()).filter(Boolean);
                const res = await window.api.fetchProtected('/rspace/inventory/samples', {
                    method: 'POST',
                    body: JSON.stringify({
                        name: document.getElementById('rsamp-name').value.trim(),
                        description: document.getElementById('rsamp-desc').value.trim(),
                        subsample_count: Number(document.getElementById('rsamp-count').value) || 1,
                        tags,
                    }),
                });
                const criado = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(criado.detail || 'Erro ao cadastrar amostra.');
                window.UI.showToast(`Amostra ${criado.global_id} cadastrada no RSpace Inventory!`, 'success');
                modal.remove();
                document.getElementById('rspace-inv-resource').value = 'samples';
                window.rspaceCarregarInventario(1);
            } catch (err) {
                window.UI.showToast(err.message, 'error');
            }
        };
    };

    window.rspaceAbrirModalNovoContainer = function () {
        const old = document.getElementById('rspace-container-modal');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'rspace-container-modal';
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content modal-sm">
                <div class="modal-header">
                    <h3>Novo Container (RSpace Inventory)</h3>
                    ${window.UI.closeButton("document.getElementById('rspace-container-modal')?.remove()")}
                </div>
                <form id="form-rspace-container">
                    <div class="input-group">
                        <label for="rcont-name">Nome do Container / Local</label>
                        <input type="text" id="rcont-name" required placeholder="Ex.: Freezer -80°C · Prateleira B2">
                    </div>
                    <div class="input-group">
                        <label for="rcont-desc">Descrição</label>
                        <textarea id="rcont-desc" rows="2"></textarea>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('rspace-container-modal')?.remove()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Criar Container</button>
                    </div>
                </form>
            </div>`;
        document.body.appendChild(modal);

        document.getElementById('form-rspace-container').onsubmit = async (e) => {
            e.preventDefault();
            try {
                const res = await window.api.fetchProtected('/rspace/inventory/containers', {
                    method: 'POST',
                    body: JSON.stringify({
                        name: document.getElementById('rcont-name').value.trim(),
                        description: document.getElementById('rcont-desc').value.trim(),
                    }),
                });
                const criado = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(criado.detail || 'Erro ao criar container.');
                window.UI.showToast(`Container ${criado.global_id} criado!`, 'success');
                modal.remove();
                document.getElementById('rspace-inv-resource').value = 'containers';
                window.rspaceCarregarInventario(1);
            } catch (err) {
                window.UI.showToast(err.message, 'error');
            }
        };
    };

    window.rspaceExcluirAmostra = async function (sampleId) {
        const ok = await window.UI.confirm('Deseja excluir esta amostra do RSpace Inventory?', { danger: true });
        if (!ok) return;
        try {
            const res = await window.api.fetchProtected(`/rspace/inventory/samples/${sampleId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Erro ao excluir amostra.');
            window.UI.showToast('Amostra excluída.', 'success');
            window.rspaceCarregarInventario(state.invPage);
        } catch (err) {
            window.UI.showToast(err.message, 'error');
        }
    };

    // ==========================================
    // ABA 6: GRUPOS & COMPARTILHAMENTO (/api/v1/groups & /api/v1/share)
    // ==========================================

    async function renderAbaCompartilhamento() {
        const body = document.getElementById('rspace-tab-body');
        if (!body) return;

        body.innerHTML = `
            <div class="columns">
                <section>
                    <div class="section-head"><h3>Compartilhar Documento ou Caderno</h3></div>
                    <form id="form-rspace-share">
                        <div class="input-group">
                            <label for="rshare-item-id">ID do Documento ou Caderno no RSpace</label>
                            <input type="text" id="rshare-item-id" required placeholder="Ex.: SD123456 ou 123456">
                        </div>
                        <div class="input-group">
                            <label for="rshare-group-id">Grupo de Pesquisa destino</label>
                            <select id="rshare-group-id"><option value="">Carregando grupos...</option></select>
                        </div>
                        <div class="input-group">
                            <label for="rshare-perm">Permissão de acesso</label>
                            <select id="rshare-perm">
                                <option value="READ">Leitura (READ)</option>
                                <option value="EDIT">Edição (EDIT)</option>
                            </select>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block">Compartilhar no RSpace</button>
                    </form>
                </section>

                <div class="stack-lg">
                    <section>
                        <div class="section-head"><h3>Meus Grupos no RSpace</h3></div>
                        <div id="rspace-groups-box">${window.UI.loading('Carregando grupos')}</div>
                    </section>
                    <section>
                        <div class="section-head"><h3>Compartilhamentos Ativos</h3></div>
                        <div id="rspace-shares-box">${window.UI.loading('Carregando compartilhamentos')}</div>
                    </section>
                </div>
            </div>
        `;

        // Carrega grupos
        try {
            const resG = await window.api.fetchProtected('/rspace/groups');
            const grupos = await resG.json().catch(() => []);
            const selG = document.getElementById('rshare-group-id');
            const boxG = document.getElementById('rspace-groups-box');

            if (Array.isArray(grupos) && grupos.length) {
                if (selG) {
                    selG.innerHTML = grupos.map((g) => `<option value="${g.id}">${window.escapeHTML(g.nome)} (ID ${g.id})</option>`).join('');
                }
                if (boxG) {
                    boxG.innerHTML = grupos.map((g) => `
                        <div class="note" style="margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <strong>${window.escapeHTML(g.nome)}</strong>
                                <span class="mono text-faint" style="font-size:11.5px; margin-left:8px;">${window.escapeHTML(g.tipo)}</span>
                            </div>
                            <span class="code-pill">${g.membros_count} membros</span>
                        </div>`).join('');
                }
            } else {
                if (selG) selG.innerHTML = '<option value="">Nenhum grupo encontrado no RSpace</option>';
                if (boxG) boxG.innerHTML = '<p class="text-faint">Você ainda não participa de grupos no RSpace.</p>';
            }
        } catch (e) {
            document.getElementById('rspace-groups-box').innerHTML = '<p class="text-faint">Não foi possível listar os grupos.</p>';
        }

        // Carrega compartilhamentos
        carregarListaShares();

        document.getElementById('form-rspace-share').onsubmit = async (e) => {
            e.preventDefault();
            const rawShareId = (document.getElementById('rshare-item-id').value || '').trim().replace(/^[A-Za-z]+/, '');
            const itemId = Number(rawShareId);
            const groupId = Number(document.getElementById('rshare-group-id').value);
            const perm = document.getElementById('rshare-perm').value;
            if (!itemId || !groupId) {
                window.UI.showToast('Informe o ID do documento e escolha um grupo.', 'warning');
                return;
            }
            try {
                const res = await window.api.fetchProtected('/rspace/share', {
                    method: 'POST',
                    body: JSON.stringify({
                        item_ids: [itemId],
                        group_ids: [groupId],
                        group_permission: perm,
                    }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.detail || 'Erro ao compartilhar.');
                window.UI.showToast('Item compartilhado com sucesso!', 'success');
                carregarListaShares();
            } catch (err) {
                window.UI.showToast(err.message, 'error');
            }
        };
    }

    async function carregarListaShares() {
        const boxS = document.getElementById('rspace-shares-box');
        if (!boxS) return;
        try {
            const resS = await window.api.fetchProtected('/rspace/share?limit=25');
            const dataS = await resS.json().catch(() => ({}));
            const shares = dataS.shares || [];
            if (!shares.length) {
                boxS.innerHTML = '<p class="text-faint">Nenhum item compartilhado listado.</p>';
                return;
            }
            boxS.innerHTML = shares.map((s) => `
                <div class="note" style="margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong>${window.escapeHTML(s.itemName || s.name || `Item #${s.itemId || s.id}`)}</strong>
                        <span class="mono text-faint" style="font-size:11.5px; margin-left:6px;">${window.escapeHTML(s.permission || 'READ')}</span>
                    </div>
                    ${s.id ? `<button type="button" class="link-btn danger" onclick="window.rspaceRevogarShare(${s.id})">Revogar</button>` : ''}
                </div>`).join('');
        } catch (e) {
            boxS.innerHTML = '<p class="text-faint">Não foi possível consultar compartilhamentos.</p>';
        }
    }

    window.rspaceRevogarShare = async function (shareId) {
        try {
            const res = await window.api.fetchProtected(`/rspace/share/${shareId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Falha ao revogar compartilhamento.');
            window.UI.showToast('Compartilhamento revogado.', 'info');
            carregarListaShares();
        } catch (err) {
            window.UI.showToast(err.message, 'error');
        }
    };

    // ==========================================
    // ABA 7: AUDITORIA (ACTIVITY), EXPORTAÇÃO (JOBS) & IMPORTAÇÃO WORD
    // ==========================================

    async function renderAbaFerramentas() {
        const body = document.getElementById('rspace-tab-body');
        if (!body) return;

        body.innerHTML = `
            <div class="columns" style="margin-bottom:24px;">
                <section>
                    <div class="section-head">
                        <h3>Exportar Backup / Documentos (/api/v1/export)</h3>
                    </div>
                    <form id="form-rspace-export">
                        <div class="field-grid">
                            <div class="input-group">
                                <label for="rexp-format">Formato do pacote</label>
                                <select id="rexp-format">
                                    <option value="html">HTML Navegável (ZIP)</option>
                                    <option value="xml">RSpace XML Archive (.eln)</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label for="rexp-scope">Escopo</label>
                                <select id="rexp-scope" onchange="document.getElementById('rexp-ids-group').style.display = this.value==='selection' ? 'flex' : 'none'">
                                    <option value="selection">IDs Selecionados</option>
                                    <option value="user">Todo o meu Workspace (User)</option>
                                </select>
                            </div>
                        </div>
                        <div class="input-group" id="rexp-ids-group" style="margin-top:12px;">
                            <label for="rexp-ids">IDs dos Documentos ou Cadernos (separados por vírgula)</label>
                            <input type="text" id="rexp-ids" placeholder="Ex.: SD10452, 10459">
                            <select id="rexp-quick-doc" style="margin-top:6px;" onchange="if(this.value){ const inp=document.getElementById('rexp-ids'); inp.value = inp.value.trim() ? inp.value.trim()+', '+this.value : this.value; this.value=''; }">
                                <option value="">+ Adicionar documento recente à seleção...</option>
                            </select>
                            <span class="help">Aceita tanto o ID numérico (ex.: 10452) quanto o Global ID (ex.: SD10452).</span>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block" style="margin-top:12px;">Iniciar Job de Exportação</button>
                    </form>
                    <div id="rspace-job-monitor" style="margin-top:12px;"></div>
                </section>

                <section>
                    <div class="section-head">
                        <h3>Importar MS Word para RSpace (/api/v1/import/word)</h3>
                    </div>
                    <form id="form-rspace-import-word">
                        <div class="input-group">
                            <label for="rimp-word-file">Arquivo Word (.docx ou .doc)</label>
                            <input type="file" id="rimp-word-file" accept=".doc,.docx" required>
                            <span class="help">Converte automaticamente um relatório ou POP em Word para um Documento estruturado no RSpace.</span>
                        </div>
                        <div class="input-group">
                            <label for="rimp-folder-id">ID da Pasta destino (opcional)</label>
                            <input type="number" id="rimp-folder-id" placeholder="Raiz do Workspace">
                        </div>
                        <button type="submit" id="btn-rimp-word" class="btn btn-secondary btn-block">
                            ${window.Icon('upload', { size: 14 })} Converter Word em Documento RSpace
                        </button>
                    </form>
                </section>
            </div>

            <section>
                <div class="section-head">
                    <h3>Trilha de Auditoria RSpace (/api/v1/activity)</h3>
                </div>
                <div class="toolbar">
                    <input type="text" id="ract-global-id" class="form-control" placeholder="Filtrar por Global ID (ex.: SD123)" onkeypress="if(event.key==='Enter') window.rspaceCarregarAtividades()">
                    <select id="ract-domain" class="form-control" onchange="window.rspaceCarregarAtividades()">
                        <option value="">Todos os domínios</option>
                        <option value="RECORD">Documentos (RECORD)</option>
                        <option value="FILE">Arquivos (FILE)</option>
                        <option value="FOLDER">Pastas / Cadernos (FOLDER)</option>
                    </select>
                    <select id="ract-action" class="form-control" onchange="window.rspaceCarregarAtividades()">
                        <option value="">Todas as ações</option>
                        <option value="CREATE">Criação (CREATE)</option>
                        <option value="WRITE">Edição (WRITE)</option>
                        <option value="READ">Leitura (READ)</option>
                        <option value="DELETE">Exclusão (DELETE)</option>
                        <option value="SHARE">Compartilhamento (SHARE)</option>
                    </select>
                    <button type="button" class="btn btn-primary" onclick="window.rspaceCarregarAtividades()">Filtrar Auditoria</button>
                </div>
                <div id="rspace-activity-list">${window.UI.loading('Consultando log de auditoria do RSpace')}</div>
            </section>
        `;

        // Popula seletor rápido de documentos para exportação
        (async () => {
            try {
                let docs = state.docs || [];
                if (!docs.length) {
                    const rDocs = await window.api.fetchProtected('/rspace/documents?limit=25');
                    const dJson = await rDocs.json().catch(() => ({}));
                    docs = dJson.documents || [];
                }
                const selQuick = document.getElementById('rexp-quick-doc');
                if (selQuick && docs.length) {
                    selQuick.innerHTML = `<option value="">+ Adicionar documento recente à seleção...</option>` +
                        docs.map((d) => `<option value="${d.id}">${window.escapeHTML(d.global_id || ('ID ' + d.id))} — ${window.escapeHTML(d.nome || 'Sem título')}</option>`).join('');
                }
            } catch (_) {
                // ignora silenciosamente se falhar
            }
        })();

        // Handler Export
        document.getElementById('form-rspace-export').onsubmit = async (e) => {
            e.preventDefault();
            const fmt = document.getElementById('rexp-format').value;
            const scope = document.getElementById('rexp-scope').value;
            const rawIds = document.getElementById('rexp-ids').value || '';
            const itemIds = scope === 'selection'
                ? rawIds
                    .split(',')
                    .map((x) => parseInt(x.trim().replace(/^[A-Za-z]+/, ''), 10))
                    .filter((n) => Number.isFinite(n) && n > 0)
                : [];

            if (scope === 'selection' && !itemIds.length) {
                window.UI.showToast('Informe pelo menos um ID de documento ou caderno (ex.: SD10452 ou 10452) para exportar.', 'warning');
                return;
            }

            try {
                const res = await window.api.fetchProtected('/rspace/export', {
                    method: 'POST',
                    body: JSON.stringify({ format: fmt, scope, item_ids: itemIds }),
                });
                const job = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(job.detail || 'Erro ao iniciar exportação.');

                window.UI.showToast(`Job de exportação #${job.job_id} iniciado!`, 'info');
                monitorarJobExportacao(job.job_id);
            } catch (err) {
                window.UI.showToast(err.message, 'error');
            }
        };

        // Handler Import Word
        document.getElementById('form-rspace-import-word').onsubmit = async (e) => {
            e.preventDefault();
            const fileIn = document.getElementById('rimp-word-file');
            if (!fileIn.files.length) return;
            const btn = document.getElementById('btn-rimp-word');
            btn.disabled = true;
            btn.textContent = 'Importando Word...';

            try {
                const fd = new FormData();
                fd.append('file', fileIn.files[0]);
                const fld = document.getElementById('rimp-folder-id').value;
                if (fld) fd.append('folder_id', fld);

                const res = await window.api.fetchProtected('/rspace/import/word', {
                    method: 'POST',
                    body: fd,
                });
                const doc = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(doc.detail || 'Erro ao importar arquivo Word.');

                window.UI.showToast(`Arquivo Word importado com sucesso (${doc.global_id || 'OK'})!`, 'success');
                fileIn.value = '';
            } catch (err) {
                window.UI.showToast(err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Converter Word em Documento RSpace';
            }
        };

        window.rspaceCarregarAtividades();
    }

    function monitorarJobExportacao(jobId) {
        if (!jobId) return;
        if (state.jobTimer) clearInterval(state.jobTimer);

        const box = document.getElementById('rspace-job-monitor');
        const consultar = async () => {
            try {
                const res = await window.api.fetchProtected(`/rspace/jobs/${jobId}`);
                const info = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(info.detail || 'Erro ao consultar job');

                const pct = info.percent_complete ?? 0;
                if (box) {
                    box.innerHTML = `
                        <div class="note">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                <strong>Job #${info.job_id} · ${window.escapeHTML(info.status)}</strong>
                                ${window.UI.progressBar(pct)}
                            </div>
                            ${info.download_ready
                                ? `<button type="button" class="btn btn-success btn-sm" onclick="window.rspaceBaixarJob(${info.job_id})">
                                       ${window.Icon('download', { size: 13 })} Baixar Arquivo Exportado
                                   </button>`
                                : `<span class="help">Aguardando conclusão no servidor RSpace...</span>`}
                        </div>`;
                }
                if (info.status === 'COMPLETED' || info.status === 'FAILED' || info.status === 'ABANDONED') {
                    clearInterval(state.jobTimer);
                    state.jobTimer = null;
                }
            } catch (e) {
                clearInterval(state.jobTimer);
                state.jobTimer = null;
            }
        };

        consultar();
        state.jobTimer = setInterval(consultar, 3000);
    }

    window.rspaceBaixarJob = async function (jobId) {
        try {
            window.UI.showToast('Iniciando download do pacote exportado...', 'info');
            const res = await window.api.fetchProtected(`/rspace/jobs/${jobId}/download`);
            if (!res.ok) throw new Error('Falha ao baixar pacote do Job.');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rspace_export_${jobId}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            window.UI.showToast(err.message, 'error');
        }
    };

    window.rspaceCarregarAtividades = async function () {
        const listEl = document.getElementById('rspace-activity-list');
        if (!listEl) return;

        const gid = document.getElementById('ract-global-id')?.value.trim() || '';
        const dom = document.getElementById('ract-domain')?.value || '';
        const act = document.getElementById('ract-action')?.value || '';

        listEl.innerHTML = window.UI.loading('Carregando trilha de auditoria do RSpace');

        try {
            const params = new URLSearchParams({ limit: '30' });
            if (gid) params.set('global_id', gid);
            if (dom) params.set('domains', dom);
            if (act) params.set('actions', act);

            const res = await window.api.fetchProtected(`/rspace/activity?${params.toString()}`);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || 'Erro ao consultar auditoria.');

            const activities = data.activities || [];
            if (!activities.length) {
                listEl.innerHTML = window.UI.emptyState({
                    title: 'Nenhum evento de auditoria encontrado',
                    description: 'Altere os filtros para visualizar outras ações registradas no RSpace.',
                });
                return;
            }

            listEl.innerHTML = `
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Data / Hora</th>
                                <th>Pesquisador</th>
                                <th>Domínio &amp; Ação</th>
                                <th>ID Global</th>
                                <th>Descrição</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${activities.map((a) => `
                                <tr>
                                    <td class="num">${a.timestamp ? new Date(a.timestamp).toLocaleString('pt-BR') : '—'}</td>
                                    <td>${window.UI.avatar(a.full_name || a.username)}</td>
                                    <td><span class="code-pill">${window.escapeHTML(a.domain)} · ${window.escapeHTML(a.action)}</span></td>
                                    <td class="code">${window.escapeHTML(a.global_id || '—')}</td>
                                    <td>${window.escapeHTML(a.description || '—')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>`;
        } catch (err) {
            listEl.innerHTML = window.UI.errorState(err.message);
        }
    };
})();
