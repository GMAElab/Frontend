// ==========================================
// 1. CONSTRUÇÃO DA TELA DE EQUIPAMENTOS
// ==========================================
document.addEventListener('viewChanged', (e) => {
    if (e.detail.view === 'equipments') {
        renderEquipments();
    }
});

function ehUsuarioConvidado() {
    try {
        const u = JSON.parse(localStorage.getItem('user_data') || '{}');
        return u.role === 'guest' || !!u.is_guest;
    } catch (e) {
        return false;
    }
}

function renderEquipments() {
    const main = document.getElementById('dynamic-content');
    if (!main) return;
    const convidado = ehUsuarioConvidado();

    main.innerHTML = `
        <header class="page-head fade-in">
            <div>
                <p class="eyebrow">laboratório</p>
                <h1>Equipamentos</h1>
                <p class="lede">${convidado
                    ? 'Consulte os equipamentos, seus POPs e agende horários de uso.'
                    : 'Vídeos de treinamento, POPs, processos vinculados e agenda de reservas.'}</p>
            </div>
            <div class="page-actions">
                <button id="btn-minhas-reservas" class="btn btn-secondary" onclick="window.openMyReservations()">${window.Icon ? window.Icon('calendar', { size: 14 }) : ''} Minhas reservas</button>
                ${convidado ? '' : `<button id="btn-novo-equip" class="btn btn-primary">${window.Icon ? window.Icon('plus', { size: 14 }) : ''} Novo equipamento</button>`}
            </div>
        </header>
        <div id="eq-container" class="fade-in"></div>
    `;

    const btnNovo = document.getElementById('btn-novo-equip');
    if (btnNovo) {
        btnNovo.addEventListener('click', () => window.openAddEquipmentModal());
    }

    loadEquipmentsTable();
}

// ==========================================
// 2. LISTA COM BUSCA E PAGINAÇÃO
// ==========================================
function loadEquipmentsTable() {
    const convidado = ehUsuarioConvidado();
    const esc = window.escapeHTML;
    const icone = (nome, tamanho) => (window.Icon ? window.Icon(nome, { size: tamanho }) : '');
    // Só vira link o que for http(s): impede javascript: e afins no href.
    const urlSegura = (url) => /^https?:\/\//i.test(String(url || '').trim()) ? esc(String(url).trim()) : '';

    // Célula de link: se a listagem não trouxer o campo, não afirma ausência — remete aos detalhes.
    const celulaDeLink = (eq, campo, rotulo, rotuloAusente) => {
        if (!(campo in eq)) return `<span class="eq-none">Nos detalhes</span>`;
        const url = urlSegura(eq[campo]);
        if (url) return `<a class="eq-link" href="${url}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${icone(campo === 'video_url' ? 'play' : 'file-text', 13)}${rotulo}</a>`;
        return `<span class="eq-none">${rotuloAusente}</span>`;
    };

    window.listagemAtual = window.Listagem.criar({
        alvo: 'eq-container',
        endpoint: '/equipments/',
        rotulos: ['equipamento', 'equipamentos'],
        placeholder: 'Buscar equipamento',
        cabecalho: '<th>Equipamento</th><th>Status</th><th class="col-hide-sm">Treinamento</th><th class="col-hide-xs">POP</th><th class="end">Ações</th>',
        vazio: { title: 'Nenhum equipamento registrado', description: convidado ? 'Nenhum equipamento disponível no momento.' : 'Cadastre o primeiro equipamento do laboratório.' },
        erro: 'Não foi possível carregar os equipamentos.',
        aoCarregar: () => document.querySelector('#eq-container .data-table')?.classList.add('eq-table'),
        renderLinha: (eq) => {
            const nome = esc(eq.nome);
            const desc = eq.description ? esc(eq.description) : '';
            const ativo = window.sgciEquipamentoAtivo
                ? window.sgciEquipamentoAtivo(eq)
                : !['inativ', 'manutenc', 'indispon', 'quebrad', 'desativ', 'bloquead', 'offline'].some(t => String(eq.status || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(t));

            return `
            <tr class="clickable" tabindex="0" onclick="window.viewDossier(${eq.id})" aria-labelledby="eq-card-${eq.id}">
                <td class="eq-main">
                    <button type="button" class="eq-name" id="eq-card-${eq.id}" onclick="event.stopPropagation(); window.viewDossier(${eq.id})">${nome}</button>
                    ${desc ? `<span class="eq-desc" title="${desc}">${desc}</span>` : ''}
                </td>
                <td><span class="badge ${ativo ? 'badge-success' : 'badge-warning'}">${esc(eq.status || 'ativo')}</span></td>
                <td class="col-hide-sm">${celulaDeLink(eq, 'video_url', 'Vídeo de treinamento', 'Sem vídeo')}</td>
                <td class="col-hide-xs">${celulaDeLink(eq, 'manual_url', 'POP', 'Nos vínculos')}</td>
                <td class="end" onclick="event.stopPropagation()">
                    <div class="row-actions">
                        <button type="button" class="link-btn" onclick="window.viewDossier(${eq.id})">Detalhes</button>
                        <button type="button" class="link-btn" onclick="window.openEquipmentCalendar(${eq.id})">${icone('calendar', 13)} Agendar</button>
                        ${convidado ? '' : `<button type="button" class="link-btn muted" onclick="openDeepView('equipments', ${eq.id}, 'Equipamento')" aria-label="Editar ${nome}">Editar</button>`}
                    </div>
                </td>
            </tr>`;
        }
    });
    // A tabela já existe logo após criar(): a classe vale também para o esqueleto.
    document.querySelector('#eq-container .data-table')?.classList.add('eq-table');
}

// ==========================================
// 3. MODAL DE NOVO EQUIPAMENTO
// ==========================================
window.openAddEquipmentModal = function() {
    const modal = document.getElementById('modal-eq');
    if (modal) {
        modal.style.setProperty('display', 'flex', 'important');
        document.body.style.overflow = 'hidden';
        window.Salvaguardas?.vincularRascunho(document.getElementById('form-new-eq'), 'equipamento-novo');
    }
};

// ==========================================
// AJUDA AO PREENCHER: VÍDEO E NOME REPETIDO
// ==========================================
function conferirLinkDoVideo() {
    const input = document.getElementById('eq-video');
    const ajuda = document.getElementById('eq-video-ajuda');
    if (!input || !ajuda) return;
    const url = input.value.trim();
    const embed = window.UI.youtubeEmbed(url);

    ajuda.classList.remove('text-warning');
    if (!url) {
        ajuda.textContent = 'Cole o link do YouTube como aparece no navegador. Qualquer formato serve.';
    } else if (embed) {
        const id = embed.split('/').pop();
        ajuda.innerHTML = `<span class="video-ok"><img src="https://img.youtube.com/vi/${id}/default.jpg" alt="" width="48" height="36" loading="lazy"> Vídeo do YouTube reconhecido.</span>`;
    } else {
        ajuda.classList.add('text-warning');
        ajuda.textContent = 'Não parece um link do YouTube. Ele será mostrado como link externo, não como vídeo na página.';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('eq-video')?.addEventListener('input', conferirLinkDoVideo);
    conferirLinkDoVideo();
    window.UI.avisarSemelhantes({ campo: 'eq-name', endpoint: '/equipments/', rotulo: e => e.nome, tipo: 'equipamento' });
});

window.closeEquipModal = function() {
    const modal = document.getElementById('modal-eq');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
};

window.handleSaveEquipment = async function(e) {
    e.preventDefault();
    if (window.UI) UI.setButtonLoading('btn-save-eq', true);
    const payload = {
        nome: document.getElementById('eq-name').value,
        description: document.getElementById('eq-desc').value,
        video_url: document.getElementById('eq-video').value,
        manual_url: document.getElementById('eq-manual').value,
        status: "ativo"
    };

    try {
        const res = await api.fetchProtected('equipments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            UI.showToast('Equipamento registrado.', 'success');
            window.closeEquipModal();
            e.target.reset();
            if (window.listagemAtual) window.listagemAtual.recarregar();
        } else {
            const errData = await res.json().catch(() => ({}));
            let msg = 'Erro ao processar registro.';
            if (Array.isArray(errData.detail)) {
                msg = (errData.detail[0].msg || msg).replace(/^Value error,\s*/, '');
            } else if (errData.detail) {
                msg = errData.detail;
            }
            throw new Error(msg);
        }
    } catch (err) {
        UI.showToast(err.message || 'Erro ao processar registro', 'error');
    } finally {
        if (window.UI) UI.setButtonLoading('btn-save-eq', false);
    }
};

// ==========================================
// 4. VÍNCULOS DO EQUIPAMENTO
// ==========================================
function renderVinculosEquipamento(vinculos, manualUrl) {
    const esc = window.escapeHTML;
    const convidado = ehUsuarioConvidado();

    const pops = (vinculos.pops || []).map(p => `
        <li><button type="button" class="link-btn" data-codigo="${esc(p.codigo)}" onclick="window.closeDossierModal(); window.abrirPopPorCodigo(this.dataset.codigo)">${esc(p.codigo)} · ${esc(p.titulo)}</button></li>`).join('');

    const linkExterno = manualUrl
        ? `<li><a href="${esc(manualUrl)}" target="_blank" rel="noopener">Abrir link externo do POP</a></li>`
        : '';

    const blocoPops = `
        <div>
            <dt>pops</dt>
            <dd class="plain">${pops || linkExterno
                ? `<ul class="link-list">${pops}${linkExterno}</ul>`
                : '<span class="text-faint">Nenhum POP vinculado a este equipamento.</span>'}</dd>
        </div>`;

    if (convidado) {
        return blocoPops;
    }

    const processos = (vinculos.processos || []).map(p => `
        <li><button type="button" class="link-btn" onclick="window.closeDossierModal(); viewProcessDetails(${p.id})">${esc(p.nome_processo)}</button>
        <span class="meta"> · ${esc((p.status || 'rascunho').replace('_', ' '))}</span></li>`).join('');

    return `
        ${blocoPops}
        <div>
            <dt>processos</dt>
            <dd class="plain">${processos
                ? `<ul class="link-list">${processos}</ul>`
                : '<span class="text-faint">Nenhum processo usa este equipamento.</span>'}</dd>
        </div>`;
}

// ==========================================
// 5. DETALHES DO EQUIPAMENTO
// ==========================================
window.viewDossier = async function(id) {
    try {
        const [res, resVinculos] = await Promise.all([
            api.fetchProtected(`equipments/${id}`),
            api.fetchProtected(`equipments/${id}/vinculos`)
        ]);

        if (!res.ok) throw new Error('Equipamento não encontrado');

        const eq = await res.json();
        const vinculos = resVinculos.ok ? await resVinculos.json() : { pops: [], processos: [] };

        const embed = window.UI.youtubeEmbed(eq.video_url);
        const videoEmbed = embed ? window.escapeHTML(embed) : '';
        const linkExterno = !embed && eq.video_url ? window.escapeHTML(eq.video_url) : '';

        const dossierTitle = document.getElementById('dossier-title');
        const dossierBody = document.getElementById('dossier-body');
        const modalDossier = document.getElementById('modal-dossier');

        if (dossierTitle) dossierTitle.textContent = eq.nome;

        if (dossierBody) {
            dossierBody.innerHTML = `
                ${videoEmbed ? `<iframe class="video-frame" src="${videoEmbed}" frameborder="0" allowfullscreen title="Vídeo de treinamento"></iframe>` : ''}
                <dl class="dl">
                    <div>
                        <dt>descrição</dt>
                        <dd>${eq.description ? window.escapeHTML(eq.description) : '<span class="text-faint">Sem descrição registrada.</span>'}</dd>
                    </div>
                    <div>
                        <dt>treinamento</dt>
                        <dd class="plain">${videoEmbed ? 'Vídeo acima.' : linkExterno ? `<a href="${linkExterno}" target="_blank" rel="noopener">Abrir vídeo (link externo)</a>` : '<span class="text-faint">Nenhum vídeo cadastrado.</span>'}</dd>
                    </div>
                    ${renderVinculosEquipamento(vinculos, eq.manual_url)}
                </dl>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="window.closeDossierModal()">Fechar</button>
                    <button type="button" class="btn btn-primary" onclick="window.closeDossierModal(); window.openEquipmentCalendar(${eq.id})">
                        ${window.Icon ? window.Icon('calendar', { size: 14 }) : ''} Agendar uso
                    </button>
                </div>
            `;
        }

        if (modalDossier) {
            modalDossier.style.setProperty('display', 'flex', 'important');
            document.body.style.overflow = 'hidden';
        }

    } catch (err) {
        console.error("Erro no processo:", err);
        if (window.UI) UI.showToast('Erro ao carregar detalhes do equipamento', 'error');
    }
};

window.closeDossierModal = function() {
    const modal = document.getElementById('modal-dossier');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
};
