// ==========================================
// CASCA: TEMA, PALETA DE COMANDOS, ATALHOS E CONEXÃO
// ==========================================
(function () {
    const CHAVE_TEMA = 'sgci-theme';
    const JANELA_DO_G_MS = 1000;
    const ehMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

    const usuario = () => {
        try { return JSON.parse(localStorage.getItem('user_data') || '{}'); } catch (e) { return {}; }
    };
    const ehGestor = () => ['admin', 'tecnico', 'coordenador'].includes(usuario().role);

    // ==========================================
    // TEMA
    // ==========================================
    function temaAtual() {
        return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    }

    function aplicarTema(tema) {
        document.documentElement.dataset.theme = tema;
        try { localStorage.setItem(CHAVE_TEMA, tema); } catch (e) { /* armazenamento bloqueado */ }
        const btn = document.getElementById('btn-theme');
        if (btn) btn.innerHTML = window.Icon(tema === 'dark' ? 'sun' : 'moon', { size: 15 });
    }

    function alternarTema() {
        aplicarTema(temaAtual() === 'dark' ? 'light' : 'dark');
    }

    // ==========================================
    // CONTEXTO DE DIGITAÇÃO
    // ==========================================
    function digitando(alvo) {
        if (!alvo) return false;
        const tag = alvo.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || alvo.isContentEditable;
    }

    function haModalAberto() {
        return Array.from(document.querySelectorAll('.modal-overlay, .doc-viewer'))
            .some(m => getComputedStyle(m).display !== 'none');
    }

    // ==========================================
    // COMANDOS
    // ==========================================
    function irPara(view) {
        window.UI.switchView(view);
        document.getElementById('sidebar')?.classList.remove('open');
    }

    function abrirEm(view, abrir) {
        return () => {
            irPara(view);
            if (typeof abrir === 'function') abrir();
        };
    }

    const ICONE_DA_VIEW = {
        inicio: 'home', equipments: 'microscope', processes: 'flask', pops: 'file-text',
        pta: 'calendar', tarefas: 'check-square', articles: 'book-open', admin: 'shield',
    };

    function comandos() {
        const navegar = Array.from(document.querySelectorAll('.nav-item[data-view]'))
            .filter(btn => !btn.closest('#menu-admin') || btn.closest('#menu-admin').style.display !== 'none')
            .map(btn => ({
                grupo: 'Ir para',
                rotulo: btn.dataset.label,
                icone: ICONE_DA_VIEW[btn.dataset.view] || 'arrow-right',
                teclas: btn.dataset.key ? ['G', btn.dataset.key.toUpperCase()] : [],
                executar: () => irPara(btn.dataset.view),
            }));

        const acoes = [
            { rotulo: 'Novo equipamento', icone: 'plus', termos: 'cadastrar ativo', executar: abrirEm('equipments', () => window.openAddEquipmentModal?.()) },
            { rotulo: 'Novo processo de P&D', icone: 'plus', termos: 'mapear pesquisa', executar: abrirEm('processes', () => window.openProcessModal?.()) },
            { rotulo: 'Novo POP', icone: 'file-plus', termos: 'procedimento operacional', executar: abrirEm('pops', () => window.openPopModal?.()) },
            ehGestor() && { rotulo: 'Nova tarefa', icone: 'plus', termos: 'atribuir', executar: abrirEm('tarefas', () => window.abrirModalTarefa?.()) },
            { rotulo: 'Registrar relato do mês', icone: 'calendar', termos: 'planejamento pta avanço', executar: () => irPara('pta') },
        ].filter(Boolean).map(c => ({ grupo: 'Criar', ...c }));

        const btn2fa = document.getElementById('btn-setup-2fa');
        const sistema = [
            { rotulo: temaAtual() === 'dark' ? 'Usar tema claro' : 'Usar tema escuro', icone: temaAtual() === 'dark' ? 'sun' : 'moon', termos: 'tema aparência modo', executar: alternarTema },
            btn2fa && btn2fa.style.display !== 'none' && { rotulo: 'Ativar verificação em duas etapas', icone: 'lock', termos: '2fa segurança', executar: () => window.abrirSetup2FA?.() },
            { rotulo: 'Sair', icone: 'log-out', termos: 'logout encerrar sessão', executar: () => document.getElementById('btn-logout')?.click() },
        ].filter(Boolean).map(c => ({ grupo: 'Sistema', ...c }));

        return [...navegar, ...acoes, ...sistema];
    }

    // ==========================================
    // PALETA (Ctrl/⌘ + K)
    // ==========================================
    const normalizar = (texto) => String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

    let paleta = null;

    function fecharPaleta() {
        if (!paleta) return;
        paleta.overlay.remove();
        paleta.foco?.focus?.();
        paleta = null;
    }

    function renderLista() {
        const termos = normalizar(paleta.input.value).split(/\s+/).filter(Boolean);
        paleta.visiveis = paleta.todos.filter(c => {
            const alvo = normalizar(`${c.rotulo} ${c.termos || ''} ${c.grupo}`);
            return termos.every(t => alvo.includes(t));
        });
        paleta.indice = Math.min(paleta.indice, Math.max(0, paleta.visiveis.length - 1));

        if (!paleta.visiveis.length) {
            paleta.lista.innerHTML = '<p class="cmdk-empty">Nenhum comando encontrado.</p>';
            return;
        }

        let grupo = null;
        paleta.lista.innerHTML = paleta.visiveis.map((c, i) => {
            const cabecalho = c.grupo !== grupo ? `<p class="cmdk-group">${c.grupo}</p>` : '';
            grupo = c.grupo;
            const teclas = (c.teclas || []).map(t => `<kbd>${t}</kbd>`).join('');
            return `${cabecalho}
                <button type="button" class="cmdk-item" role="option" data-i="${i}" aria-selected="${i === paleta.indice}">
                    ${window.Icon(c.icone, { size: 15 })}
                    <span class="label">${window.escapeHTML(c.rotulo)}</span>
                    ${teclas ? `<span class="keys">${teclas}</span>` : ''}
                </button>`;
        }).join('');
    }

    function marcar(indice) {
        if (!paleta || !paleta.visiveis.length) return;
        paleta.indice = (indice + paleta.visiveis.length) % paleta.visiveis.length;
        paleta.lista.querySelectorAll('.cmdk-item').forEach(el => {
            const ativo = Number(el.dataset.i) === paleta.indice;
            el.setAttribute('aria-selected', String(ativo));
            if (ativo) el.scrollIntoView({ block: 'nearest' });
        });
    }

    function executar(indice) {
        const comando = paleta?.visiveis[indice];
        if (!comando) return;
        fecharPaleta();
        comando.executar();
    }

    function abrirPaleta() {
        if (paleta) return fecharPaleta();

        const overlay = document.createElement('div');
        overlay.className = 'cmdk-overlay';
        overlay.innerHTML = `
            <div class="cmdk" role="dialog" aria-modal="true" aria-label="Paleta de comandos">
                <div class="cmdk-input-row">
                    ${window.Icon('search', { size: 16 })}
                    <input type="text" placeholder="Ir para uma seção ou executar uma ação" aria-label="Comando" autocomplete="off" spellcheck="false">
                    <kbd>Esc</kbd>
                </div>
                <div class="cmdk-list" role="listbox"></div>
                <div class="cmdk-foot">
                    <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
                    <span><kbd>↵</kbd> abrir</span>
                    <span><kbd>/</kbd> buscar na lista</span>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        paleta = {
            overlay,
            input: overlay.querySelector('input'),
            lista: overlay.querySelector('.cmdk-list'),
            todos: comandos(),
            visiveis: [],
            indice: 0,
            foco: document.activeElement,
        };

        paleta.input.addEventListener('input', () => { paleta.indice = 0; renderLista(); });
        paleta.input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); marcar(paleta.indice + 1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); marcar(paleta.indice - 1); }
            else if (e.key === 'Enter') { e.preventDefault(); executar(paleta.indice); }
            else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fecharPaleta(); }
        });
        paleta.lista.addEventListener('mousemove', (e) => {
            const item = e.target.closest('.cmdk-item');
            if (item && Number(item.dataset.i) !== paleta.indice) marcar(Number(item.dataset.i));
        });
        paleta.lista.addEventListener('click', (e) => {
            const item = e.target.closest('.cmdk-item');
            if (item) executar(Number(item.dataset.i));
        });
        overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) fecharPaleta(); });

        renderLista();
        paleta.input.focus();
    }

    // ==========================================
    // ATALHOS DE TECLADO
    // ==========================================
    let esperandoG = 0;

    function focarBusca() {
        const campo = document.querySelector('#dynamic-content [data-busca], #dynamic-content input[type="search"]');
        if (!campo) return false;
        campo.focus();
        campo.select?.();
        return true;
    }

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            abrirPaleta();
            return;
        }

        if (paleta || e.ctrlKey || e.metaKey || e.altKey || digitando(e.target) || haModalAberto()) return;

        if (e.key === 'Escape') {
            document.getElementById('sidebar')?.classList.remove('open');
            return;
        }

        if (e.key === '/') {
            if (focarBusca()) e.preventDefault();
            return;
        }

        const tecla = e.key.toLowerCase();
        if (tecla === 'g') {
            esperandoG = Date.now();
            return;
        }

        if (esperandoG && Date.now() - esperandoG < JANELA_DO_G_MS) {
            esperandoG = 0;
            const destino = document.querySelector(`.nav-item[data-key="${CSS.escape(tecla)}"]`);
            if (destino && destino.closest('li')?.style.display !== 'none') {
                e.preventDefault();
                irPara(destino.dataset.view);
            }
        }
    });

    // ==========================================
    // CONEXÃO
    // ==========================================
    function atualizarConexao() {
        const el = document.getElementById('sys-status');
        if (!el) return;
        const online = navigator.onLine;
        el.classList.toggle('is-offline', !online);
        el.querySelector('.label').textContent = online ? 'online' : 'sem conexão';
        el.title = online ? 'Conectado' : 'Sem conexão: alterações não serão salvas até a rede voltar.';
    }

    // ==========================================
    // INICIALIZAÇÃO
    // ==========================================
    document.addEventListener('DOMContentLoaded', () => {
        aplicarTema(temaAtual());

        document.getElementById('btn-theme')?.addEventListener('click', alternarTema);
        document.getElementById('btn-palette')?.addEventListener('click', abrirPaleta);
        document.querySelectorAll('kbd[data-mod]').forEach(k => { k.textContent = ehMac ? '⌘' : 'Ctrl'; });

        const sidebar = document.getElementById('sidebar');
        document.getElementById('sidebar-backdrop')?.addEventListener('click', () => sidebar?.classList.remove('open'));

        const avatar = document.getElementById('user-avatar');
        if (avatar) {
            const partes = String(usuario().nome || '').trim().split(/\s+/).filter(Boolean);
            avatar.textContent = partes.length ? (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : '')) : '·';
        }

        atualizarConexao();
        window.addEventListener('online', atualizarConexao);
        window.addEventListener('offline', () => {
            atualizarConexao();
            window.UI?.showToast('Sem conexão. O que você salvar agora não chega ao servidor.', 'warning');
        });
    });

    window.Shell = { abrirPaleta, alternarTema };
})();
