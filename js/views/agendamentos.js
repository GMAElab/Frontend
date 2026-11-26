// ==========================================
// MÓDULO DE AGENDAMENTO DE EQUIPAMENTOS
// Calendário estilo Google Calendar (1 dia ou intervalo de dias) +
// Minhas Reservas + Feedback Pós-Uso + Feriados/Bloqueios
// ==========================================
(function () {
    const HORA_INICIO_GRADE = 8;  // 08:00 (sexta abre às 08:00)
    const HORA_FIM_GRADE = 17;    // 17:00 (seg-qui fecha às 17:00)
    const PX_POR_HORA = 56;
    const PX_POR_SLOT = 28;       // 30 minutos

    const EXPEDIENTE = {
        1: { inicio: '09:00', fim: '17:00', nome: 'Segunda-feira' },
        2: { inicio: '09:00', fim: '17:00', nome: 'Terça-feira' },
        3: { inicio: '09:00', fim: '17:00', nome: 'Quarta-feira' },
        4: { inicio: '09:00', fim: '17:00', nome: 'Quinta-feira' },
        5: { inicio: '08:00', fim: '12:00', nome: 'Sexta-feira' },
    };

    const TERMOS_INDISPONIVEL = [
        'inativ', 'manutenc', 'indispon', 'quebrad',
        'desativ', 'bloquead', 'offline', 'parado', 'fora de uso',
    ];

    const CONDICAO_LABEL = {
        normal: { texto: 'Uso normal · sem ocorrências', badge: 'badge-success' },
        atencao: { texto: 'Ponto de atenção relatado', badge: 'badge-warning' },
        problema: { texto: 'Problema / ocorrência relatada', badge: 'badge-danger' },
    };

    const MESES_PT = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ];
    const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const state = {
        equipmentId: null,
        equipments: [],
        view: 'week',         // 'week' | 'month' | 'mine'
        anchorDate: new Date(),
        agendamentos: [],
        bloqueios: [],
        minhasReservas: [],
    };

    function getUser() {
        try { return JSON.parse(localStorage.getItem('user_data') || '{}'); } catch (e) { return {}; }
    }

    function ehGestor() {
        const u = getUser();
        return !u.is_guest && ['admin', 'tecnico', 'coordenador'].includes(u.role);
    }

    function normalizarTexto(txt) {
        return String(txt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    }

    function equipamentoAtivo(eq) {
        if (!eq) return false;
        const st = normalizarTexto(eq.status);
        if (!st) return true;
        return !TERMOS_INDISPONIVEL.some(t => st.includes(t));
    }

    window.sgciEquipamentoAtivo = equipamentoAtivo;

    function pad2(n) { return String(n).padStart(2, '0'); }

    function toISODate(d) {
        return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    }

    function parseLocalDate(isoStr) {
        const [y, m, d] = isoStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    }

    function parseDateTimeStr(str) {
        if (!str) return null;
        const limpo = String(str).replace(' ', 'T');
        const m = limpo.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
        if (!m) return new Date(str);
        return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
    }

    function formatDateBR(d) {
        return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
    }

    function formatTimeBR(d) {
        return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    }

    function formatPeriodoBR(dtIni, dtFim) {
        const isoIni = toISODate(dtIni);
        const isoFim = toISODate(dtFim);
        if (isoIni === isoFim) {
            return `${formatDateBR(dtIni)} · ${formatTimeBR(dtIni)} às ${formatTimeBR(dtFim)}`;
        }
        const diffDias = Math.round((parseLocalDate(isoFim) - parseLocalDate(isoIni)) / 86400000) + 1;
        return `${formatDateBR(dtIni)} ${formatTimeBR(dtIni)} → ${formatDateBR(dtFim)} ${formatTimeBR(dtFim)} (${diffDias} dias)`;
    }

    function getMonday(date) {
        const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        return d;
    }

    function addDays(date, days) {
        const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        d.setDate(d.getDate() + days);
        return d;
    }

    function timeToMinutes(hhmm) {
        const [h, m] = hhmm.split(':').map(Number);
        return h * 60 + m;
    }

    function minutesToTime(totalMin) {
        return `${pad2(Math.floor(totalMin / 60))}:${pad2(totalMin % 60)}`;
    }

    function getExpedienteDia(dateObj) {
        return EXPEDIENTE[dateObj.getDay()] || null;
    }

    function getBloqueioDia(isoDate, eqId) {
        return state.bloqueios.find(b =>
            b.data === isoDate && (b.equipamento_id === null || b.equipamento_id === eqId)
        ) || null;
    }

    function getBloqueioNoIntervalo(isoIni, isoFim, eqId) {
        if (!isoIni || !isoFim) return null;
        return state.bloqueios.find(b =>
            b.data >= isoIni && b.data <= isoFim && (b.equipamento_id === null || b.equipamento_id === eqId)
        ) || null;
    }

    function getEquipamentoAtual() {
        return state.equipments.find(e => e.id === state.equipmentId) || null;
    }

    // ==========================================
    // CARREGAMENTO DE DADOS
    // ==========================================
    async function carregarEquipamentos() {
        const res = await window.api.fetchProtected('/equipments/?limit=500');
        if (!res.ok) throw new Error('Não foi possível carregar os equipamentos.');
        state.equipments = await res.json();
    }

    function calcularJanelaConsulta() {
        if (state.view === 'month') {
            const primeiro = new Date(state.anchorDate.getFullYear(), state.anchorDate.getMonth(), 1);
            const ultimo = new Date(state.anchorDate.getFullYear(), state.anchorDate.getMonth() + 1, 0);
            return { inicio: toISODate(addDays(primeiro, -7)), fim: toISODate(addDays(ultimo, 7)) };
        }
        const seg = getMonday(state.anchorDate);
        return { inicio: toISODate(seg), fim: toISODate(addDays(seg, 6)) };
    }

    async function recarregarDadosAgenda() {
        const { inicio, fim } = calcularJanelaConsulta();
        const promises = [];

        if (state.equipmentId) {
            promises.push(
                window.api.fetchProtected(`/agendamentos/?equipamento_id=${state.equipmentId}&inicio=${inicio}&fim=${fim}`)
                    .then(r => (r.ok ? r.json() : []))
                    .then(data => { state.agendamentos = Array.isArray(data) ? data : []; }),
                window.api.fetchProtected(`/agendamentos/bloqueios?equipamento_id=${state.equipmentId}&inicio=${inicio}&fim=${fim}`)
                    .then(r => (r.ok ? r.json() : []))
                    .then(data => { state.bloqueios = Array.isArray(data) ? data : []; })
            );
        }

        promises.push(
            window.api.fetchProtected('/agendamentos/minhas')
                .then(r => (r.ok ? r.json() : []))
                .then(data => { state.minhasReservas = Array.isArray(data) ? data : []; })
        );

        await Promise.all(promises);
    }

    // ==========================================
    // PONTOS DE ENTRADA PÚBLICOS
    // ==========================================
    window.openEquipmentCalendar = async function (equipmentId, initialTab = 'week') {
        const main = document.getElementById('dynamic-content');
        if (!main) return;
        main.innerHTML = window.UI.loading('Carregando agenda do equipamento');

        try {
            await carregarEquipamentos();
            if (!state.equipments.length) {
                main.innerHTML = window.UI.emptyState({
                    title: 'Nenhum equipamento cadastrado',
                    description: 'Cadastre equipamentos antes de abrir o calendário.',
                    actionLabel: 'Voltar para equipamentos',
                    actionOnclick: "window.UI.switchView('equipments')",
                });
                return;
            }

            state.equipmentId = Number(equipmentId) || state.equipments[0].id;
            state.view = initialTab || 'week';

            const hoje = new Date();
            if (hoje.getDay() === 6) state.anchorDate = addDays(hoje, 2);
            else if (hoje.getDay() === 0) state.anchorDate = addDays(hoje, 1);
            else state.anchorDate = hoje;

            await recarregarDadosAgenda();
            renderizarTelaCalendario();
        } catch (err) {
            main.innerHTML = window.UI.errorState(err.message || 'Erro ao carregar agenda.');
        }
    };

    window.openMyReservations = async function () {
        const main = document.getElementById('dynamic-content');
        if (!main) return;
        main.innerHTML = window.UI.loading('Carregando suas reservas');

        try {
            await carregarEquipamentos();
            if (!state.equipmentId && state.equipments.length) {
                state.equipmentId = state.equipments[0].id;
            }
            state.view = 'mine';
            await recarregarDadosAgenda();
            renderizarTelaCalendario();
        } catch (err) {
            main.innerHTML = window.UI.errorState(err.message || 'Erro ao carregar suas reservas.');
        }
    };

    // ==========================================
    // RENDERIZAÇÃO PRINCIPAL
    // ==========================================
    function tituloPeriodo() {
        if (state.view === 'month') {
            return `${MESES_PT[state.anchorDate.getMonth()]} de ${state.anchorDate.getFullYear()}`;
        }
        const seg = getMonday(state.anchorDate);
        const sex = addDays(seg, 4);
        if (seg.getMonth() === sex.getMonth()) {
            return `${pad2(seg.getDate())} – ${pad2(sex.getDate())} de ${MESES_PT[seg.getMonth()]} ${seg.getFullYear()}`;
        }
        return `${pad2(seg.getDate())}/${pad2(seg.getMonth() + 1)} – ${pad2(sex.getDate())}/${pad2(sex.getMonth() + 1)}/${sex.getFullYear()}`;
    }

    function renderizarTelaCalendario() {
        const main = document.getElementById('dynamic-content');
        if (!main) return;

        const eq = getEquipamentoAtual();
        const esc = window.escapeHTML;
        const eqAtivo = equipamentoAtivo(eq);
        const reservasAtivasCount = state.minhasReservas.filter(r => r.status === 'confirmado' && parseDateTimeStr(r.fim) > new Date()).length;
        const feedbacksPendentes = state.minhasReservas.filter(r => r.feedback_pendente);

        const opcoesEq = state.equipments.map(e =>
            `<option value="${e.id}" ${e.id === state.equipmentId ? 'selected' : ''}>${esc(e.nome)}${equipamentoAtivo(e) ? '' : ' (indisponível)'}</option>`
        ).join('');

        main.innerHTML = `
            <header class="page-head fade-in">
                <div>
                    <p class="eyebrow">agenda do laboratório</p>
                    <h1>${state.view === 'mine' ? 'Minhas reservas' : esc(eq ? eq.nome : 'Agendamento')}</h1>
                    <p class="lede">
                        Expediente: <strong>Seg a Qui 09:00–17:00</strong> · <strong>Sex 08:00–12:00</strong>. Você pode reservar por horas ou por intervalo de vários dias.
                    </p>
                </div>
                <div class="page-actions">
                    <button type="button" class="btn btn-secondary" onclick="window.UI.switchView('equipments')">
                        ${window.Icon('arrow-left', { size: 14 })} Equipamentos
                    </button>
                    ${ehGestor() ? `
                    <button type="button" class="btn btn-secondary" id="btn-cal-bloqueios">
                        ${window.Icon('ban', { size: 14 })} Feriados / Bloqueios
                    </button>` : ''}
                    ${eq && eqAtivo ? `
                    <button type="button" class="btn btn-primary" id="btn-cal-novo">
                        ${window.Icon('plus', { size: 14 })} Novo agendamento
                    </button>` : ''}
                </div>
            </header>

            ${eq && !eqAtivo && state.view !== 'mine' ? `
            <div class="note warn mb-md">
                <strong>Equipamento indisponível.</strong> Este equipamento está com status "${esc(eq.status)}" e não aceita novos agendamentos no momento.
            </div>` : ''}

            ${feedbacksPendentes.length ? `
            <div class="note accent mb-md" style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:10px;">
                <span>
                    <strong>Feedback pós-uso pendente:</strong> você tem ${feedbacksPendentes.length} uso(s) encerrado(s) aguardando relato do que foi feito e do resultado.
                </span>
                ${state.view !== 'mine' ? `<button type="button" class="btn btn-secondary btn-sm" id="btn-ir-feedbacks">Registrar feedback</button>` : ''}
            </div>` : ''}

            <div class="cal-shell fade-in">
                <div class="cal-toolbar">
                    <div class="cal-toolbar-group">
                        ${state.equipments.length ? `
                        <select id="cal-eq-select" class="cal-eq-select" aria-label="Selecionar equipamento">
                            ${opcoesEq}
                        </select>` : ''}
                        ${eq ? `
                        <button type="button" class="link-btn" onclick="window.viewDossier(${eq.id})" title="Ver manual, vídeo e POPs vinculados">
                            ${window.Icon('file-text', { size: 14 })} Ver POPs e manual
                        </button>` : ''}
                    </div>

                    ${state.view !== 'mine' ? `
                    <div class="cal-toolbar-group">
                        <button type="button" class="btn btn-secondary btn-sm" id="btn-cal-prev" aria-label="Período anterior">${window.Icon('chevron-left', { size: 14 })}</button>
                        <button type="button" class="btn btn-secondary btn-sm" id="btn-cal-today">Hoje</button>
                        <button type="button" class="btn btn-secondary btn-sm" id="btn-cal-next" aria-label="Próximo período">${window.Icon('chevron-right', { size: 14 })}</button>
                        <span class="cal-nav-range">${esc(tituloPeriodo())}</span>
                    </div>` : ''}

                    <div class="cal-view-switch" role="tablist" aria-label="Modo de visualização">
                        <button type="button" class="cal-view-btn ${state.view === 'week' ? 'active' : ''}" data-cal-view="week">Semana</button>
                        <button type="button" class="cal-view-btn ${state.view === 'month' ? 'active' : ''}" data-cal-view="month">Mês</button>
                        <button type="button" class="cal-view-btn ${state.view === 'mine' ? 'active' : ''}" data-cal-view="mine">
                            Minhas reservas${reservasAtivasCount ? ` (${reservasAtivasCount})` : ''}${feedbacksPendentes.length ? ' · !' : ''}
                        </button>
                    </div>
                </div>

                <div id="cal-body"></div>
            </div>
        `;

        vincularEventosToolbar();
        renderizarCorpoCalendario();
    }

    function vincularEventosToolbar() {
        document.getElementById('cal-eq-select')?.addEventListener('change', async (e) => {
            state.equipmentId = Number(e.target.value);
            if (state.view === 'mine') state.view = 'week';
            await atualizarView();
        });

        document.getElementById('btn-cal-prev')?.addEventListener('click', async () => {
            if (state.view === 'month') {
                state.anchorDate = new Date(state.anchorDate.getFullYear(), state.anchorDate.getMonth() - 1, 1);
            } else {
                state.anchorDate = addDays(state.anchorDate, -7);
            }
            await atualizarView();
        });

        document.getElementById('btn-cal-next')?.addEventListener('click', async () => {
            if (state.view === 'month') {
                state.anchorDate = new Date(state.anchorDate.getFullYear(), state.anchorDate.getMonth() + 1, 1);
            } else {
                state.anchorDate = addDays(state.anchorDate, 7);
            }
            await atualizarView();
        });

        document.getElementById('btn-cal-today')?.addEventListener('click', async () => {
            const hoje = new Date();
            if (hoje.getDay() === 6) state.anchorDate = addDays(hoje, 2);
            else if (hoje.getDay() === 0) state.anchorDate = addDays(hoje, 1);
            else state.anchorDate = hoje;
            await atualizarView();
        });

        document.querySelectorAll('[data-cal-view]').forEach(btn => {
            btn.addEventListener('click', async () => {
                state.view = btn.getAttribute('data-cal-view');
                await atualizarView();
            });
        });

        document.getElementById('btn-ir-feedbacks')?.addEventListener('click', async () => {
            state.view = 'mine';
            await atualizarView();
        });

        document.getElementById('btn-cal-novo')?.addEventListener('click', () => {
            abrirModalAgendamento();
        });

        document.getElementById('btn-cal-bloqueios')?.addEventListener('click', () => {
            abrirModalBloqueios();
        });
    }

    async function atualizarView() {
        const body = document.getElementById('cal-body');
        if (body) body.innerHTML = window.UI.loading('Atualizando agenda');
        try {
            await recarregarDadosAgenda();
            renderizarTelaCalendario();
        } catch (err) {
            window.UI.showToast(err.message || 'Erro ao atualizar calendário.', 'error');
        }
    }

    function renderizarCorpoCalendario() {
        const body = document.getElementById('cal-body');
        if (!body) return;
        if (state.view === 'week') renderizarSemana(body);
        else if (state.view === 'month') renderizarMes(body);
        else renderizarMinhasReservas(body);
    }

    // ==========================================
    // VISÃO SEMANAL (GOOGLE CALENDAR — SUPORTA MULTI-DIA)
    // ==========================================
    function renderizarSemana(container) {
        const esc = window.escapeHTML;
        const seg = getMonday(state.anchorDate);
        const dias = [0, 1, 2, 3, 4].map(i => addDays(seg, i));
        const hojeISO = toISODate(new Date());
        const agora = new Date();
        const eq = getEquipamentoAtual();
        const eqAtivo = equipamentoAtivo(eq);

        const cabecalhos = dias.map(d => {
            const iso = toISODate(d);
            const exp = getExpedienteDia(d);
            const bloqueio = getBloqueioDia(iso, state.equipmentId);
            const ehHoje = iso === hojeISO;
            return `
                <div class="cal-day-head ${ehHoje ? 'is-today' : ''}">
                    <span class="cal-day-name">${DIAS_CURTOS[d.getDay()]}</span>
                    <span class="cal-day-num">${pad2(d.getDate())}</span>
                    <span class="cal-day-hours-hint">${exp ? `${exp.inicio}–${exp.fim}` : 'Fechado'}</span>
                    ${bloqueio ? `<span class="cal-day-holiday-tag" title="${esc(bloqueio.motivo)}">${esc(bloqueio.motivo)}</span>` : ''}
                </div>`;
        }).join('');

        const labelsHora = [];
        for (let h = HORA_INICIO_GRADE; h <= HORA_FIM_GRADE; h++) {
            const topPx = (h - HORA_INICIO_GRADE) * PX_POR_HORA;
            labelsHora.push(`<span class="cal-time-label" style="top:${topPx}px;">${pad2(h)}:00</span>`);
        }

        const colunasDias = dias.map(d => {
            const iso = toISODate(d);
            const exp = getExpedienteDia(d);
            const bloqueio = getBloqueioDia(iso, state.equipmentId);
            const ehHoje = iso === hojeISO;
            const minAbertura = exp ? timeToMinutes(exp.inicio) : 9999;
            const minFechamento = exp ? timeToMinutes(exp.fim) : -1;

            const slots = [];
            for (let idx = 0; idx < (HORA_FIM_GRADE - HORA_INICIO_GRADE) * 2; idx++) {
                const startMin = HORA_INICIO_GRADE * 60 + idx * 30;
                const endMin = startMin + 30;
                const slotEndDt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(endMin / 60), endMin % 60);
                const dentroExp = exp && startMin >= minAbertura && endMin <= minFechamento;
                // Só considera passado quando o bloco de 30 min já encerrou
                const passado = slotEndDt <= agora;
                const aberto = eqAtivo && !bloqueio && dentroExp && !passado;
                const isHourEnd = (idx % 2 === 1);

                let motivoBloqueio = '';
                if (!eqAtivo) motivoBloqueio = `Equipamento indisponível (${eq ? eq.status : ''}).`;
                else if (bloqueio) motivoBloqueio = `Dia bloqueado: ${bloqueio.motivo}.`;
                else if (!dentroExp) motivoBloqueio = `Fora do expediente (${exp ? exp.nome + ': ' + exp.inicio + '–' + exp.fim : 'Fechado'}).`;
                else if (passado) motivoBloqueio = 'Este horário já passou. Escolha um horário futuro ou clique em "Novo agendamento".';

                const cls = [
                    'cal-slot',
                    isHourEnd ? 'is-hour-end' : '',
                    aberto ? 'is-open' : (!dentroExp || bloqueio || !eqAtivo ? 'is-closed' : 'is-past'),
                ].filter(Boolean).join(' ');

                const attrs = aberto
                    ? `data-slot-date="${iso}" data-slot-start="${minutesToTime(startMin)}" title="Agendar em ${formatDateBR(d)} às ${minutesToTime(startMin)}"`
                    : `data-slot-reason="${esc(motivoBloqueio)}" title="${esc(motivoBloqueio)}"`;

                slots.push(`<div class="${cls}" style="top:${idx * PX_POR_SLOT}px;" ${attrs}></div>`);
            }

            let linhaAgora = '';
            if (ehHoje) {
                const minAgora = agora.getHours() * 60 + agora.getMinutes();
                if (minAgora >= HORA_INICIO_GRADE * 60 && minAgora <= HORA_FIM_GRADE * 60) {
                    const topAgora = ((minAgora - HORA_INICIO_GRADE * 60) / 60) * PX_POR_HORA;
                    linhaAgora = `<div class="cal-now-line" style="top:${topAgora}px;"></div>`;
                }
            }

            // Renderiza tanto reservas do dia quanto reservas MULTI-DIA que cobrem este dia
            const eventosDia = state.agendamentos
                .filter(ag => {
                    const isoIni = toISODate(parseDateTimeStr(ag.inicio));
                    const isoFim = toISODate(parseDateTimeStr(ag.fim));
                    return iso >= isoIni && iso <= isoFim;
                })
                .map(ag => {
                    const dtIni = parseDateTimeStr(ag.inicio);
                    const dtFim = parseDateTimeStr(ag.fim);
                    const isoIni = toISODate(dtIni);
                    const isoFim = toISODate(dtFim);
                    const ehMultiDia = isoIni !== isoFim;

                    let minIniDia = dtIni.getHours() * 60 + dtIni.getMinutes();
                    let minFimDia = dtFim.getHours() * 60 + dtFim.getMinutes();
                    let etiquetaTempo = `${formatTimeBR(dtIni)}–${formatTimeBR(dtFim)}`;

                    if (ehMultiDia) {
                        const inicioExp = exp ? minAbertura : HORA_INICIO_GRADE * 60;
                        const fimExp = exp ? minFechamento : HORA_FIM_GRADE * 60;

                        if (iso === isoIni) {
                            minFimDia = fimExp;
                            etiquetaTempo = `${formatTimeBR(dtIni)} → continua`;
                        } else if (iso === isoFim) {
                            minIniDia = inicioExp;
                            etiquetaTempo = `← até ${formatTimeBR(dtFim)}`;
                        } else {
                            minIniDia = inicioExp;
                            minFimDia = fimExp;
                            etiquetaTempo = `Dia inteiro (${formatDateBR(dtIni).slice(0, 5)}–${formatDateBR(dtFim).slice(0, 5)})`;
                        }
                    }

                    minIniDia = Math.max(HORA_INICIO_GRADE * 60, minIniDia);
                    minFimDia = Math.min(HORA_FIM_GRADE * 60, Math.max(minIniDia + 30, minFimDia));

                    const top = ((minIniDia - HORA_INICIO_GRADE * 60) / 60) * PX_POR_HORA + 2;
                    const height = Math.max(24, ((minFimDia - minIniDia) / 60) * PX_POR_HORA - 4);

                    const classe = ag.eh_meu ? 'is-mine' : 'is-other';
                    const sub = ag.eh_meu
                        ? (ag.feedback_pendente ? 'Minha reserva · Feedback pendente' : 'Minha reserva')
                        : (ag.tipo_solicitante === 'convidado' ? 'Convidado' : 'Membro');

                    return `
                        <button type="button" class="cal-event ${classe}${ehMultiDia ? ' is-multiday' : ''}" style="top:${top}px; height:${height}px;" data-ag-id="${ag.id}">
                            <span class="cal-event-time">${esc(etiquetaTempo)}</span>
                            <span class="cal-event-title">${esc(ag.solicitante_nome)}</span>
                            ${height >= 46 ? `<span class="cal-event-meta">${esc(sub)}</span>` : ''}
                        </button>`;
                }).join('');

            const overlayFeriado = bloqueio
                ? `<div class="cal-holiday-overlay">Indisponível · ${esc(bloqueio.motivo)}</div>`
                : '';

            return `
                <div class="cal-day-col ${ehHoje ? 'is-today' : ''} ${bloqueio ? 'is-holiday' : ''}">
                    ${slots.join('')}
                    ${linhaAgora}
                    ${overlayFeriado}
                    ${eventosDia}
                </div>`;
        }).join('');

        container.innerHTML = `
            <div class="cal-legend">
                <div class="cal-legend-items">
                    <span class="cal-legend-item"><span class="cal-dot mine"></span> Minhas reservas</span>
                    <span class="cal-legend-item"><span class="cal-dot other"></span> Reservado por outro usuário</span>
                    <span class="cal-legend-item"><span class="cal-dot closed"></span> Fora do expediente</span>
                    <span class="cal-legend-item"><span class="cal-dot holiday"></span> Feriado / Bloqueio</span>
                </div>
                <span>Clique em um horário livre ou em "Novo agendamento" (suporta vários dias)</span>
            </div>
            <div class="cal-week-wrap">
                <div class="cal-week-grid">
                    <div class="cal-week-head-corner">BRT</div>
                    ${cabecalhos}
                    <div class="cal-time-col">${labelsHora.join('')}</div>
                    ${colunasDias}
                </div>
            </div>
        `;

        container.querySelectorAll('.cal-slot.is-open').forEach(slot => {
            slot.addEventListener('click', () => {
                const data = slot.getAttribute('data-slot-date');
                const start = slot.getAttribute('data-slot-start');
                abrirModalAgendamento({ dataInicio: data, dataFim: data, inicio: start });
            });
        });

        container.querySelectorAll('.cal-slot[data-slot-reason]').forEach(slot => {
            slot.addEventListener('click', () => {
                const reason = slot.getAttribute('data-slot-reason');
                if (reason) window.UI.showToast(reason, 'info');
            });
        });

        container.querySelectorAll('.cal-event[data-ag-id]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = Number(btn.getAttribute('data-ag-id'));
                const ag = state.agendamentos.find(a => a.id === id);
                if (ag) abrirModalDetalheReserva(ag);
            });
        });
    }

    // ==========================================
    // VISÃO MENSAL (SUPORTA MULTI-DIA)
    // ==========================================
    function renderizarMes(container) {
        const esc = window.escapeHTML;
        const ano = state.anchorDate.getFullYear();
        const mes = state.anchorDate.getMonth();
        const primeiroDia = new Date(ano, mes, 1);
        const inicioGrade = getMonday(primeiroDia);
        const hojeISO = toISODate(new Date());

        const porDia = {};
        state.agendamentos.forEach(ag => {
            const dIni = parseLocalDate(toISODate(parseDateTimeStr(ag.inicio)));
            const dFim = parseLocalDate(toISODate(parseDateTimeStr(ag.fim)));
            for (let cur = dIni; cur <= dFim; cur = addDays(cur, 1)) {
                const iso = toISODate(cur);
                (porDia[iso] = porDia[iso] || []).push(ag);
            }
        });

        const celulas = [];
        for (let i = 0; i < 42; i++) {
            const d = addDays(inicioGrade, i);
            const iso = toISODate(d);
            const foraDoMes = d.getMonth() !== mes;
            const fimDeSemana = d.getDay() === 0 || d.getDay() === 6;
            const ehHoje = iso === hojeISO;
            const bloqueio = getBloqueioDia(iso, state.equipmentId);
            const eventos = porDia[iso] || [];

            const pills = [];
            if (bloqueio) {
                pills.push(`<div class="cal-month-pill holiday" title="${esc(bloqueio.motivo)}">${esc(bloqueio.motivo)}</div>`);
            }
            eventos.slice(0, 3).forEach(ag => {
                const dtIni = parseDateTimeStr(ag.inicio);
                const dtFim = parseDateTimeStr(ag.fim);
                const multi = toISODate(dtIni) !== toISODate(dtFim);
                const label = multi
                    ? `${formatDateBR(dtIni).slice(0, 5)}–${formatDateBR(dtFim).slice(0, 5)} · ${ag.solicitante_nome}`
                    : `${formatTimeBR(dtIni)} · ${ag.solicitante_nome}`;
                pills.push(`<div class="cal-month-pill ${ag.eh_meu ? 'mine' : 'other'}" title="${esc(label)}">${esc(label)}</div>`);
            });
            if (eventos.length > 3) {
                pills.push(`<span class="cal-month-more">+${eventos.length - 3} reserva(s)</span>`);
            }

            celulas.push(`
                <div class="cal-month-cell ${foraDoMes ? 'is-outside' : ''} ${fimDeSemana ? 'is-weekend' : ''} ${ehHoje ? 'is-today' : ''} ${bloqueio ? 'is-holiday' : ''}" data-month-day="${iso}">
                    <div class="cal-month-day-row">
                        <span class="cal-month-day-num">${pad2(d.getDate())}</span>
                        ${fimDeSemana ? '<span class="cal-day-hours-hint">Fechado</span>' : ''}
                    </div>
                    ${pills.join('')}
                </div>`);
        }

        container.innerHTML = `
            <div class="cal-legend">
                <div class="cal-legend-items">
                    <span class="cal-legend-item"><span class="cal-dot mine"></span> Minhas reservas</span>
                    <span class="cal-legend-item"><span class="cal-dot other"></span> Outros agendamentos</span>
                    <span class="cal-legend-item"><span class="cal-dot holiday"></span> Feriado / Bloqueio</span>
                </div>
                <span>Clique em um dia para abrir a grade semanal</span>
            </div>
            <div class="cal-month-wrap">
                <div class="cal-month-grid">
                    ${['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => `<div class="cal-month-dow">${d}</div>`).join('')}
                    ${celulas.join('')}
                </div>
            </div>
        `;

        container.querySelectorAll('.cal-month-cell[data-month-day]').forEach(cell => {
            cell.addEventListener('click', async () => {
                const d = parseLocalDate(cell.getAttribute('data-month-day'));
                state.anchorDate = d;
                state.view = 'week';
                await atualizarView();
            });
        });
    }

    // ==========================================
    // VISÃO MINHAS RESERVAS (COM FEEDBACK PÓS-USO)
    // ==========================================
    function renderizarBlocoFeedback(ag) {
        if (!ag.feedback_enviado_em) return '';
        const esc = window.escapeHTML;
        const cond = CONDICAO_LABEL[ag.feedback_condicao || 'normal'] || CONDICAO_LABEL.normal;
        return `
            <div class="res-feedback-box">
                <div class="res-feedback-head">
                    <strong>Feedback pós-uso</strong>
                    <span class="badge ${cond.badge}">${esc(cond.texto)}</span>
                </div>
                <div><strong>O que foi feito:</strong> ${esc(ag.feedback_atividades || '')}</div>
                <div><strong>Resultado:</strong> ${esc(ag.feedback_resultado || '')}</div>
                ${ag.feedback_observacoes ? `<div><strong>Observações / Atenção:</strong> ${esc(ag.feedback_observacoes)}</div>` : ''}
            </div>`;
    }

    function renderizarMinhasReservas(container) {
        const esc = window.escapeHTML;
        const agora = new Date();
        const futuras = state.minhasReservas
            .filter(r => r.status === 'confirmado' && parseDateTimeStr(r.fim) > agora)
            .sort((a, b) => parseDateTimeStr(a.inicio) - parseDateTimeStr(b.inicio));
        const historico = state.minhasReservas
            .filter(r => r.status !== 'confirmado' || parseDateTimeStr(r.fim) <= agora);

        const renderCard = (ag) => {
            const dtIni = parseDateTimeStr(ag.inicio);
            const dtFim = parseDateTimeStr(ag.fim);
            const cancelado = ag.status === 'cancelado';
            const badge = cancelado
                ? '<span class="badge badge-danger">Cancelado</span>'
                : ag.feedback_pendente
                    ? '<span class="badge badge-warning">Aguardando feedback</span>'
                    : (dtFim <= agora ? '<span class="badge">Encerrado</span>' : '<span class="badge badge-success">Confirmado</span>');

            const temFeedback = !!ag.feedback_enviado_em;

            return `
                <article class="res-card ${cancelado ? 'is-cancelled' : ''}">
                    <div class="res-card-head">
                        <div>
                            <div class="res-card-eq">${esc(ag.equipamento_nome || `Equipamento #${ag.equipamento_id}`)}</div>
                            <div class="res-card-time">${esc(formatPeriodoBR(dtIni, dtFim))}</div>
                        </div>
                        ${badge}
                    </div>
                    <div class="meta">Responsável: <strong>${esc(ag.solicitante_nome)}</strong></div>
                    ${ag.insumos ? `<div class="res-card-insumos"><strong>Insumos:</strong> ${esc(ag.insumos)}</div>` : ''}
                    ${renderizarBlocoFeedback(ag)}
                    ${cancelado && ag.motivo_cancelamento ? `<div class="meta">Motivo: ${esc(ag.motivo_cancelamento)}</div>` : ''}
                    <div class="res-card-actions">
                        <button type="button" class="link-btn" data-open-eq="${ag.equipamento_id}" data-open-date="${toISODate(dtIni)}">Ver no calendário</button>
                        ${ag.pode_gerenciar ? `
                            <button type="button" class="btn btn-secondary btn-sm" data-remarcar="${ag.id}">Remarcar</button>
                            <button type="button" class="btn btn-danger btn-sm" data-desmarcar="${ag.id}">Desmarcar</button>
                        ` : ''}
                        ${ag.pode_dar_feedback ? `
                            <button type="button" class="btn ${temFeedback ? 'btn-secondary' : 'btn-primary'} btn-sm" data-feedback="${ag.id}">
                                ${temFeedback ? 'Editar feedback' : 'Registrar feedback'}
                            </button>
                        ` : ''}
                    </div>
                </article>`;
        };

        if (!state.minhasReservas.length) {
            container.innerHTML = window.UI.emptyState({
                title: 'Você ainda não tem agendamentos',
                description: 'Escolha um equipamento na tabela e clique em "Agendar" para reservar um horário ou intervalo de dias.',
                actionLabel: 'Ir para Equipamentos',
                actionOnclick: "window.UI.switchView('equipments')",
            });
            return;
        }

        container.innerHTML = `
            <h3 class="res-section-title">Próximas reservas (${futuras.length})</h3>
            ${futuras.length
                ? `<div class="res-list">${futuras.map(renderCard).join('')}</div>`
                : '<p class="text-faint mb-md">Nenhuma reserva futura ativa.</p>'}

            ${historico.length ? `
                <h3 class="res-section-title">Histórico, feedbacks e cancelamentos (${historico.length})</h3>
                <div class="res-list">${historico.map(renderCard).join('')}</div>
            ` : ''}
        `;

        container.querySelectorAll('[data-open-eq]').forEach(btn => {
            btn.addEventListener('click', async () => {
                state.equipmentId = Number(btn.getAttribute('data-open-eq'));
                state.anchorDate = parseLocalDate(btn.getAttribute('data-open-date'));
                state.view = 'week';
                await atualizarView();
            });
        });

        container.querySelectorAll('[data-remarcar]').forEach(btn => {
            btn.addEventListener('click', () => {
                const ag = state.minhasReservas.find(r => r.id === Number(btn.getAttribute('data-remarcar')));
                if (ag) abrirModalAgendamento({ edicao: ag });
            });
        });

        container.querySelectorAll('[data-desmarcar]').forEach(btn => {
            btn.addEventListener('click', () => {
                const ag = state.minhasReservas.find(r => r.id === Number(btn.getAttribute('data-desmarcar')));
                if (ag) confirmarDesmarcar(ag);
            });
        });

        container.querySelectorAll('[data-feedback]').forEach(btn => {
            btn.addEventListener('click', () => {
                const ag = state.minhasReservas.find(r => r.id === Number(btn.getAttribute('data-feedback')));
                if (ag) abrirModalFeedback(ag);
            });
        });
    }

    // ==========================================
    // MODAL DE AGENDAR / REMARCAR (1 DIA OU MULTI-DIA)
    // ==========================================
    function gerarOpcoesHorario(exp) {
        if (!exp) return [];
        const minIni = timeToMinutes(exp.inicio);
        const minFim = timeToMinutes(exp.fim);
        const out = [];
        for (let m = minIni; m <= minFim; m += 30) {
            out.push(minutesToTime(m));
        }
        return out;
    }

    function abrirModalAgendamento(opts = {}) {
        const antigo = document.getElementById('modal-agendamento-form');
        if (antigo) antigo.remove();

        const edicao = opts.edicao || null;
        const eqId = edicao ? edicao.equipamento_id : state.equipmentId;
        const eq = state.equipments.find(e => e.id === eqId) || getEquipamentoAtual();
        const user = getUser();
        const esc = window.escapeHTML;

        let dataIniPadrao = opts.dataInicio || opts.data;
        let dataFimPadrao = opts.dataFim || opts.data;
        let inicioPadrao = opts.inicio;
        let fimPadrao = opts.fim;

        if (edicao) {
            const dtIni = parseDateTimeStr(edicao.inicio);
            const dtFim = parseDateTimeStr(edicao.fim);
            dataIniPadrao = toISODate(dtIni);
            dataFimPadrao = toISODate(dtFim);
            inicioPadrao = formatTimeBR(dtIni);
            fimPadrao = formatTimeBR(dtFim);
        } else if (!dataIniPadrao) {
            let d = new Date();
            if (d.getDay() === 6) d = addDays(d, 2);
            else if (d.getDay() === 0) d = addDays(d, 1);
            dataIniPadrao = toISODate(d);
            dataFimPadrao = dataIniPadrao;
        }
        if (!dataFimPadrao) dataFimPadrao = dataIniPadrao;

        const hojeISO = toISODate(new Date());

        const modalHtml = `
        <div id="modal-agendamento-form" class="modal-overlay is-open">
            <div class="modal-content modal-md">
                <div class="modal-header">
                    <div>
                        <p class="eyebrow">${edicao ? 'remarcar agendamento' : 'novo agendamento'}</p>
                        <h3>${esc(eq ? eq.nome : 'Agendar equipamento')}</h3>
                    </div>
                    ${window.UI.closeButton("document.getElementById('modal-agendamento-form')?.remove()")}
                </div>

                <form id="form-agendamento-eq">
                    <div class="input-group">
                        <label for="ag-nome">Nome do solicitante</label>
                        <input type="text" id="ag-nome" required minlength="2" maxlength="120" value="${esc(edicao ? edicao.solicitante_nome : (user.nome || ''))}" placeholder="Seu nome completo">
                    </div>

                    <div class="field-grid">
                        <div class="input-group">
                            <label for="ag-data-inicio">Data de início</label>
                            <input type="date" id="ag-data-inicio" required value="${esc(dataIniPadrao)}" min="${hojeISO}">
                        </div>
                        <div class="input-group">
                            <label for="ag-inicio">Hora de início</label>
                            <select id="ag-inicio" required></select>
                        </div>
                    </div>

                    <div class="field-grid">
                        <div class="input-group">
                            <label for="ag-data-fim">Data de término</label>
                            <input type="date" id="ag-data-fim" required value="${esc(dataFimPadrao)}" min="${esc(dataIniPadrao)}">
                        </div>
                        <div class="input-group">
                            <label for="ag-fim">Hora de término</label>
                            <select id="ag-fim" required></select>
                        </div>
                    </div>

                    <p id="ag-horario-hint" class="help" aria-live="polite"></p>

                    <div class="input-group">
                        <label for="ag-insumos">Insumos que precisará usar</label>
                        <textarea id="ag-insumos" rows="3" required minlength="2" maxlength="1500" placeholder="Liste reagentes, consumíveis, vidrarias ou materiais que serão utilizados neste uso.">${esc(edicao ? (edicao.insumos || '') : '')}</textarea>
                    </div>

                    <div id="ag-feedback" class="feedback-msg" aria-live="polite"></div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-agendamento-form')?.remove()">Cancelar</button>
                        <button type="submit" id="btn-salvar-agendamento" class="btn btn-primary">
                            <span class="btn-text">${edicao ? 'Salvar remarcação' : 'Confirmar agendamento'}</span>
                            <span class="spinner hidden" aria-hidden="true"></span>
                        </button>
                    </div>
                </form>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const dataIniInput = document.getElementById('ag-data-inicio');
        const dataFimInput = document.getElementById('ag-data-fim');
        const selInicio = document.getElementById('ag-inicio');
        const selFim = document.getElementById('ag-fim');
        const hint = document.getElementById('ag-horario-hint');
        const btnSalvar = document.getElementById('btn-salvar-agendamento');
        let usuarioEditouDataFim = dataFimPadrao !== dataIniPadrao;

        function atualizarSelectsHorario(prefInicio, prefFim) {
            const isoIni = dataIniInput.value;
            if (!isoIni) return;

            dataFimInput.min = isoIni;
            if (!usuarioEditouDataFim || !dataFimInput.value || dataFimInput.value < isoIni) {
                dataFimInput.value = isoIni;
            }
            const isoFim = dataFimInput.value;

            const dIni = parseLocalDate(isoIni);
            const dFim = parseLocalDate(isoFim);
            const expIni = getExpedienteDia(dIni);
            const expFim = getExpedienteDia(dFim);
            const bloqueio = getBloqueioNoIntervalo(isoIni, isoFim, eqId);

            if (!expIni || !expFim) {
                selInicio.innerHTML = '<option value="">Fechado</option>';
                selFim.innerHTML = '<option value="">Fechado</option>';
                selInicio.disabled = true;
                selFim.disabled = true;
                btnSalvar.disabled = true;
                hint.textContent = 'O laboratório não funciona aos sábados e domingos. Escolha datas de início e término entre segunda e sexta.';
                hint.classList.add('text-warning');
                return;
            }

            if (bloqueio) {
                selInicio.innerHTML = '<option value="">Indisponível</option>';
                selFim.innerHTML = '<option value="">Indisponível</option>';
                selInicio.disabled = true;
                selFim.disabled = true;
                btnSalvar.disabled = true;
                hint.textContent = `Há um bloqueio no intervalo (${formatDateBR(parseLocalDate(bloqueio.data))}): ${bloqueio.motivo}.`;
                hint.classList.add('text-warning');
                return;
            }

            hint.classList.remove('text-warning');
            selInicio.disabled = false;
            selFim.disabled = false;
            btnSalvar.disabled = false;

            const opcoesIni = gerarOpcoesHorario(expIni).slice(0, -1);
            const atualIni = prefInicio || selInicio.value;
            selInicio.innerHTML = opcoesIni.map(h => `<option value="${h}">${h}</option>`).join('');
            selInicio.value = opcoesIni.includes(atualIni) ? atualIni : opcoesIni[0];

            atualizarSelectFim(prefFim);
        }

        function atualizarSelectFim(prefFim) {
            const isoIni = dataIniInput.value;
            const isoFim = dataFimInput.value;
            if (!isoIni || !isoFim) return;

            const dIni = parseLocalDate(isoIni);
            const dFim = parseLocalDate(isoFim);
            const expIni = getExpedienteDia(dIni);
            const expFim = getExpedienteDia(dFim);
            if (!expIni || !expFim) return;

            const todosFim = gerarOpcoesHorario(expFim);
            let opcoesFim;
            if (isoIni === isoFim) {
                const minIni = timeToMinutes(selInicio.value);
                opcoesFim = todosFim.filter(h => timeToMinutes(h) > minIni);
            } else {
                opcoesFim = todosFim.slice(1); // qualquer horário após a abertura do último dia
            }

            const atualFim = prefFim || selFim.value;
            selFim.innerHTML = opcoesFim.map(h => `<option value="${h}">${h}</option>`).join('');

            if (opcoesFim.includes(atualFim)) {
                selFim.value = atualFim;
            } else if (isoIni !== isoFim) {
                // Em reserva multi-dia, padrão é até o final do expediente do último dia
                selFim.value = opcoesFim[opcoesFim.length - 1];
            } else {
                const padrao1h = minutesToTime(timeToMinutes(selInicio.value) + 60);
                selFim.value = opcoesFim.includes(padrao1h) ? padrao1h : opcoesFim[0];
            }

            if (isoIni === isoFim) {
                hint.textContent = `Expediente em ${expIni.nome}: ${expIni.inicio} às ${expIni.fim}. Para vários dias, basta alterar a Data de término.`;
            } else {
                const qtdDias = Math.round((dFim - dIni) / 86400000) + 1;
                hint.textContent = `Reserva contínua de ${qtdDias} dias (${formatDateBR(dIni)} ${selInicio.value} → ${formatDateBR(dFim)} ${selFim.value}). Os gestores serão notificados por e-mail.`;
            }
        }

        dataIniInput.addEventListener('change', () => atualizarSelectsHorario());
        dataFimInput.addEventListener('change', () => {
            usuarioEditouDataFim = dataFimInput.value !== dataIniInput.value;
            atualizarSelectsHorario();
        });
        selInicio.addEventListener('change', () => atualizarSelectFim());
        selFim.addEventListener('change', () => {
            const dIni = parseLocalDate(dataIniInput.value);
            const dFim = parseLocalDate(dataFimInput.value);
            if (dataIniInput.value !== dataFimInput.value) {
                const qtdDias = Math.round((dFim - dIni) / 86400000) + 1;
                hint.textContent = `Reserva contínua de ${qtdDias} dias (${formatDateBR(dIni)} ${selInicio.value} → ${formatDateBR(dFim)} ${selFim.value}). Os gestores serão notificados por e-mail.`;
            }
        });

        atualizarSelectsHorario(inicioPadrao, fimPadrao);

        document.getElementById('form-agendamento-eq').addEventListener('submit', async (e) => {
            e.preventDefault();
            const nome = document.getElementById('ag-nome').value.trim();
            const insumos = document.getElementById('ag-insumos').value.trim();
            const dataIni = dataIniInput.value;
            const dataFim = dataFimInput.value;
            const horaIni = selInicio.value;
            const horaFim = selFim.value;

            if (!dataIni || !dataFim || !horaIni || !horaFim) {
                window.UI.showFormFeedback('ag-feedback', 'Selecione datas e horários dentro do expediente.', true);
                return;
            }

            window.UI.showFormFeedback('ag-feedback', '', false);
            window.UI.setButtonLoading('btn-salvar-agendamento', true);

            const body = {
                solicitante_nome: nome,
                insumos: insumos,
                inicio: `${dataIni}T${horaIni}:00`,
                fim: `${dataFim}T${horaFim}:00`,
            };
            if (!edicao) body.equipamento_id = eqId;

            try {
                const endpoint = edicao ? `/agendamentos/${edicao.id}` : '/agendamentos/';
                const method = edicao ? 'PUT' : 'POST';
                const res = await window.api.fetchProtected(endpoint, {
                    method,
                    body: JSON.stringify(body),
                });
                const respData = await res.json().catch(() => ({}));
                if (!res.ok) {
                    window.UI.showFormFeedback('ag-feedback', window.UI.mensagemLegivel(respData.detail || 'Não foi possível salvar o agendamento.'), true);
                    return;
                }

                document.getElementById('modal-agendamento-form')?.remove();
                window.UI.showToast(
                    edicao
                        ? 'Agendamento remarcado! Os gestores do laboratório foram notificados por e-mail.'
                        : 'Agendamento confirmado! Os gestores do laboratório foram notificados por e-mail.',
                    'success'
                );
                await atualizarView();
            } catch (err) {
                window.UI.showFormFeedback('ag-feedback', 'Erro de conexão com o servidor.', true);
            } finally {
                window.UI.setButtonLoading('btn-salvar-agendamento', false);
            }
        });
    }

    // ==========================================
    // MODAL DE FEEDBACK PÓS-USO
    // ==========================================
    function abrirModalFeedback(ag) {
        const antigo = document.getElementById('modal-feedback-ag');
        if (antigo) antigo.remove();

        const esc = window.escapeHTML;
        const dtIni = parseDateTimeStr(ag.inicio);
        const dtFim = parseDateTimeStr(ag.fim);
        const condAtual = ag.feedback_condicao || 'normal';

        const modalHtml = `
        <div id="modal-feedback-ag" class="modal-overlay is-open">
            <div class="modal-content modal-md">
                <div class="modal-header">
                    <div>
                        <p class="eyebrow">feedback pós-uso</p>
                        <h3>${esc(ag.equipamento_nome || 'Equipamento')}</h3>
                    </div>
                    ${window.UI.closeButton("document.getElementById('modal-feedback-ag')?.remove()")}
                </div>

                <p class="dialog-text mb-md">
                    Período: <strong class="mono">${esc(formatPeriodoBR(dtIni, dtFim))}</strong>.
                    Conte o que foi realizado, o resultado obtido e qualquer ponto de atenção para a gestão do laboratório.
                </p>

                <form id="form-feedback-ag">
                    <div class="input-group">
                        <label for="fb-atividades">O que foi feito no equipamento?</label>
                        <textarea id="fb-atividades" rows="3" required minlength="3" maxlength="2000" placeholder="Descreva brevemente o ensaio, análise ou preparo realizado.">${esc(ag.feedback_atividades || '')}</textarea>
                    </div>

                    <div class="input-group">
                        <label for="fb-resultado">Qual foi o resultado?</label>
                        <textarea id="fb-resultado" rows="3" required minlength="2" maxlength="2000" placeholder="Ex.: Curva de adsorção obtida com sucesso, amostra caracterizada sem desvios...">${esc(ag.feedback_resultado || '')}</textarea>
                    </div>

                    <div class="input-group">
                        <label for="fb-condicao">Condição do equipamento após o uso</label>
                        <select id="fb-condicao" required>
                            <option value="normal" ${condAtual === 'normal' ? 'selected' : ''}>Normal — funcionando normalmente, sem ocorrências</option>
                            <option value="atencao" ${condAtual === 'atencao' ? 'selected' : ''}>Ponto de atenção — observação importante (calibração, insumo acabando etc.)</option>
                            <option value="problema" ${condAtual === 'problema' ? 'selected' : ''}>Problema / ocorrência — equipamento apresentou falha ou precisa de revisão</option>
                        </select>
                    </div>

                    <div class="input-group">
                        <label for="fb-observacoes">Observações ou pontos de atenção (opcional)</label>
                        <textarea id="fb-observacoes" rows="2" maxlength="2000" placeholder="Alguma anomalia, desgaste, necessidade de reposição de insumo ou recado para o próximo usuário?">${esc(ag.feedback_observacoes || '')}</textarea>
                    </div>

                    <div id="fb-feedback-msg" class="feedback-msg" aria-live="polite"></div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-feedback-ag')?.remove()">Cancelar</button>
                        <button type="submit" id="btn-enviar-feedback" class="btn btn-primary">
                            <span class="btn-text">${ag.feedback_enviado_em ? 'Atualizar feedback' : 'Enviar feedback'}</span>
                            <span class="spinner hidden" aria-hidden="true"></span>
                        </button>
                    </div>
                </form>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('form-feedback-ag').addEventListener('submit', async (e) => {
            e.preventDefault();
            const atividades = document.getElementById('fb-atividades').value.trim();
            const resultado = document.getElementById('fb-resultado').value.trim();
            const condicao = document.getElementById('fb-condicao').value;
            const observacoes = document.getElementById('fb-observacoes').value.trim() || null;

            window.UI.showFormFeedback('fb-feedback-msg', '', false);
            window.UI.setButtonLoading('btn-enviar-feedback', true);

            try {
                const res = await window.api.fetchProtected(`/agendamentos/${ag.id}/feedback`, {
                    method: 'POST',
                    body: JSON.stringify({
                        atividades,
                        resultado,
                        observacoes,
                        condicao_equipamento: condicao,
                    }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    window.UI.showFormFeedback('fb-feedback-msg', window.UI.mensagemLegivel(data.detail || 'Não foi possível salvar o feedback.'), true);
                    return;
                }
                document.getElementById('modal-feedback-ag')?.remove();
                window.UI.showToast('Feedback registrado e enviado aos gestores do laboratório!', 'success');
                await atualizarView();
            } catch (err) {
                window.UI.showFormFeedback('fb-feedback-msg', 'Erro de conexão com o servidor.', true);
            } finally {
                window.UI.setButtonLoading('btn-enviar-feedback', false);
            }
        });
    }

    // ==========================================
    // MODAL DE DETALHE & CANCELAMENTO
    // ==========================================
    function abrirModalDetalheReserva(ag) {
        const antigo = document.getElementById('modal-agendamento-detalhe');
        if (antigo) antigo.remove();

        const esc = window.escapeHTML;
        const dtIni = parseDateTimeStr(ag.inicio);
        const dtFim = parseDateTimeStr(ag.fim);
        const tipo = ag.tipo_solicitante === 'convidado' ? 'Convidado externo' : 'Membro do laboratório';

        const modalHtml = `
        <div id="modal-agendamento-detalhe" class="modal-overlay is-open">
            <div class="modal-content modal-md">
                <div class="modal-header">
                    <div>
                        <p class="eyebrow">${ag.eh_meu ? 'sua reserva' : 'horário reservado'}</p>
                        <h3>${esc(ag.equipamento_nome || 'Agendamento')}</h3>
                    </div>
                    ${window.UI.closeButton("document.getElementById('modal-agendamento-detalhe')?.remove()")}
                </div>

                <dl class="dl">
                    <div>
                        <dt>período</dt>
                        <dd class="mono">${esc(formatPeriodoBR(dtIni, dtFim))}</dd>
                    </div>
                    <div>
                        <dt>solicitante</dt>
                        <dd>${esc(ag.solicitante_nome)} <span class="meta">(${tipo})</span>${ag.solicitante_email ? `<br><span class="meta">${esc(ag.solicitante_email)}</span>` : ''}</dd>
                    </div>
                    ${ag.insumos ? `
                    <div>
                        <dt>insumos</dt>
                        <dd>${esc(ag.insumos)}</dd>
                    </div>` : ''}
                </dl>

                ${renderizarBlocoFeedback(ag)}

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-agendamento-detalhe')?.remove()">Fechar</button>
                    ${ag.pode_dar_feedback ? `
                        <button type="button" class="btn ${ag.feedback_enviado_em ? 'btn-secondary' : 'btn-primary'}" id="btn-detalhe-feedback">
                            ${ag.feedback_enviado_em ? 'Editar feedback' : 'Registrar feedback'}
                        </button>
                    ` : ''}
                    ${ag.pode_gerenciar ? `
                        <button type="button" class="btn btn-secondary" id="btn-detalhe-remarcar">Remarcar</button>
                        <button type="button" class="btn btn-danger" id="btn-detalhe-desmarcar">Desmarcar</button>
                    ` : ''}
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('btn-detalhe-feedback')?.addEventListener('click', () => {
            document.getElementById('modal-agendamento-detalhe')?.remove();
            abrirModalFeedback(ag);
        });

        document.getElementById('btn-detalhe-remarcar')?.addEventListener('click', () => {
            document.getElementById('modal-agendamento-detalhe')?.remove();
            abrirModalAgendamento({ edicao: ag });
        });

        document.getElementById('btn-detalhe-desmarcar')?.addEventListener('click', () => {
            document.getElementById('modal-agendamento-detalhe')?.remove();
            confirmarDesmarcar(ag);
        });
    }

    function confirmarDesmarcar(ag) {
        const antigo = document.getElementById('modal-desmarcar-ag');
        if (antigo) antigo.remove();

        const esc = window.escapeHTML;
        const dtIni = parseDateTimeStr(ag.inicio);
        const dtFim = parseDateTimeStr(ag.fim);

        const modalHtml = `
        <div id="modal-desmarcar-ag" class="modal-overlay is-open">
            <div class="modal-content modal-sm">
                <div class="modal-header">
                    <h3>Desmarcar agendamento</h3>
                    ${window.UI.closeButton("document.getElementById('modal-desmarcar-ag')?.remove()")}
                </div>
                <p class="dialog-text mb-md">
                    Deseja cancelar a reserva de <strong>${esc(ag.equipamento_nome || 'equipamento')}</strong> em
                    <strong>${esc(formatPeriodoBR(dtIni, dtFim))}</strong>?
                    O período voltará a ficar livre e os gestores serão avisados por e-mail.
                </p>
                <div class="input-group">
                    <label for="cancel-motivo">Motivo do cancelamento (opcional)</label>
                    <input type="text" id="cancel-motivo" maxlength="500" placeholder="Ex.: Ensaio adiado para a próxima semana">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-desmarcar-ag')?.remove()">Manter reserva</button>
                    <button type="button" class="btn btn-danger" id="btn-confirmar-cancelamento">Desmarcar</button>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('btn-confirmar-cancelamento').addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            btn.disabled = true;
            btn.textContent = 'Desmarcando...';
            const motivo = (document.getElementById('cancel-motivo')?.value || '').trim() || null;

            try {
                const res = await window.api.fetchProtected(`/agendamentos/${ag.id}`, {
                    method: 'DELETE',
                    body: JSON.stringify({ motivo }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    window.UI.showToast(window.UI.mensagemLegivel(data.detail || 'Não foi possível desmarcar.'), 'error');
                    btn.disabled = false;
                    btn.textContent = 'Desmarcar';
                    return;
                }
                document.getElementById('modal-desmarcar-ag')?.remove();
                window.UI.showToast('Agendamento desmarcado e gestores notificados por e-mail.', 'success');
                await atualizarView();
            } catch (err) {
                window.UI.showToast('Erro de conexão ao desmarcar.', 'error');
                btn.disabled = false;
                btn.textContent = 'Desmarcar';
            }
        });
    }

    // ==========================================
    // MODAL DE FERIADOS / BLOQUEIOS (GESTORES)
    // ==========================================
    async function abrirModalBloqueios() {
        const antigo = document.getElementById('modal-bloqueios-cal');
        if (antigo) antigo.remove();

        const esc = window.escapeHTML;
        const eqOptions = `<option value="">Laboratório inteiro (feriado / recesso)</option>` +
            state.equipments.map(e => `<option value="${e.id}">Apenas: ${esc(e.nome)}</option>`).join('');

        const modalHtml = `
        <div id="modal-bloqueios-cal" class="modal-overlay is-open">
            <div class="modal-content modal-md">
                <div class="modal-header">
                    <div>
                        <p class="eyebrow">gestão do calendário</p>
                        <h3>Feriados e dias especiais</h3>
                    </div>
                    ${window.UI.closeButton("document.getElementById('modal-bloqueios-cal')?.remove()")}
                </div>

                <form id="form-novo-bloqueio">
                    <div class="field-grid">
                        <div class="input-group">
                            <label for="bloq-data">Data inicial</label>
                            <input type="date" id="bloq-data" required min="${toISODate(new Date())}">
                        </div>
                        <div class="input-group">
                            <label for="bloq-data-fim">Data final <span class="text-faint">(opcional)</span></label>
                            <input type="date" id="bloq-data-fim" min="${toISODate(new Date())}" aria-describedby="bloq-periodo-help">
                        </div>
                    </div>
                    <p id="bloq-periodo-help" class="help">Deixe a data final em branco para bloquear um único dia. Com ela, todos os dias do período ficam bloqueados.</p>
                    <div class="input-group">
                        <label for="bloq-escopo">Abrangência</label>
                        <select id="bloq-escopo">${eqOptions}</select>
                    </div>
                    <div class="input-group">
                        <label for="bloq-motivo">Motivo</label>
                        <input type="text" id="bloq-motivo" required minlength="2" maxlength="200" placeholder="Ex.: Feriado Nacional, Manutenção preventiva, Recesso">
                    </div>
                    <div id="bloq-feedback" class="feedback-msg"></div>
                    <button type="submit" class="btn btn-primary btn-sm">Adicionar bloqueio</button>
                </form>

                <h4 class="res-section-title">Bloqueios cadastrados</h4>
                <div id="lista-bloqueios-modal" class="bloqueios-list">${window.UI.loading('Carregando')}</div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-bloqueios-cal')?.remove()">Fechar</button>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        async function carregarListaBloqueios() {
            const box = document.getElementById('lista-bloqueios-modal');
            if (!box) return;
            const res = await window.api.fetchProtected(`/agendamentos/bloqueios?inicio=${toISODate(new Date())}`);
            const itens = res.ok ? await res.json() : [];
            if (!itens.length) {
                box.innerHTML = '<p class="text-faint">Nenhum feriado ou bloqueio futuro cadastrado.</p>';
                return;
            }
            // Agrupa dias consecutivos com o mesmo motivo e abrangência num só período
            const periodos = [];
            itens.forEach(b => {
                const ultimo = periodos[periodos.length - 1];
                const dia = parseLocalDate(b.data);
                if (ultimo && ultimo.motivo === b.motivo && ultimo.equipamento_id === b.equipamento_id
                    && Math.round((dia - ultimo.fim) / 86400000) === 1) {
                    ultimo.fim = dia;
                    ultimo.ids.push(b.id);
                } else {
                    periodos.push({ motivo: b.motivo, equipamento_id: b.equipamento_id, equipamento_nome: b.equipamento_nome,
                        inicio: dia, fim: dia, ids: [b.id] });
                }
            });

            box.innerHTML = periodos.map((p, i) => {
                const dias = p.ids.length;
                const quando = dias === 1
                    ? formatDateBR(p.inicio)
                    : `${formatDateBR(p.inicio)} → ${formatDateBR(p.fim)}`;
                return `
                <div class="bloqueio-row">
                    <div>
                        <strong class="mono">${quando}</strong>
                        ${dias > 1 ? `<span class="meta">(${dias} dias)</span>` : ''}
                        · ${esc(p.motivo)}
                        <span class="meta">(${p.equipamento_nome ? esc(p.equipamento_nome) : 'Laboratório inteiro'})</span>
                    </div>
                    <button type="button" class="link-btn danger" data-del-periodo="${i}">${dias > 1 ? 'Remover período' : 'Remover'}</button>
                </div>`;
            }).join('');

            box.querySelectorAll('[data-del-periodo]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const { ids } = periodos[Number(btn.getAttribute('data-del-periodo'))];
                    btn.disabled = true;
                    const r = await window.api.fetchProtected('/agendamentos/bloqueios/remover-lote', {
                        method: 'POST',
                        body: JSON.stringify({ ids }),
                    });
                    btn.disabled = false;
                    if (r.ok) {
                        window.UI.showToast(ids.length > 1 ? 'Período desbloqueado.' : 'Bloqueio removido.', 'success');
                        await carregarListaBloqueios();
                        await atualizarView();
                    } else {
                        window.UI.showToast('Erro ao remover bloqueio.', 'error');
                    }
                });
            });
        }

        // A data final não pode ser escolhida antes da inicial
        document.getElementById('bloq-data').addEventListener('change', (e) => {
            const fim = document.getElementById('bloq-data-fim');
            fim.min = e.target.value || toISODate(new Date());
            if (fim.value && e.target.value && fim.value < e.target.value) fim.value = '';
        });

        document.getElementById('form-novo-bloqueio').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = document.getElementById('bloq-data').value;
            const dataFim = document.getElementById('bloq-data-fim').value;
            const eqVal = document.getElementById('bloq-escopo').value;
            const motivo = document.getElementById('bloq-motivo').value.trim();

            if (dataFim && dataFim < data) {
                window.UI.showFormFeedback('bloq-feedback', 'A data final não pode ser anterior à data inicial.', true);
                return;
            }

            const res = await window.api.fetchProtected('/agendamentos/bloqueios', {
                method: 'POST',
                body: JSON.stringify({
                    data,
                    data_fim: dataFim && dataFim !== data ? dataFim : null,
                    equipamento_id: eqVal ? Number(eqVal) : null,
                    motivo,
                }),
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                window.UI.showFormFeedback('bloq-feedback', window.UI.mensagemLegivel(payload.detail || 'Não foi possível salvar.'), true);
                return;
            }
            window.UI.showFormFeedback('bloq-feedback', '', false);
            e.target.reset();
            const criados = (payload.criados || []).length;
            const ignorados = (payload.ignorados || []).length;
            let msg = criados > 1 ? `${criados} dias bloqueados.` : 'Feriado/bloqueio cadastrado.';
            if (ignorados) msg += ` ${ignorados} ${ignorados === 1 ? 'dia já estava bloqueado' : 'dias já estavam bloqueados'}.`;
            window.UI.showToast(msg, 'success');
            await carregarListaBloqueios();
            await atualizarView();
        });

        await carregarListaBloqueios();
    }
})();
