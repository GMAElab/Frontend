// ==========================================
// CASCA: TEMA, PALETA DE COMANDOS, ATALHOS E CONEXÃO
// ==========================================
(function () {
    const CHAVE_TEMA = 'sgci-theme-v3';
    const CHAVE_DENSIDADE = 'sgci-densidade';
    const JANELA_DO_G_MS = 1000;
    const ehMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

    const usuario = () => {
        try { return JSON.parse(localStorage.getItem('user_data') || '{}'); } catch (e) { return {}; }
    };
    const ehGestor = () => ['admin', 'tecnico', 'coordenador'].includes(usuario().role);
    const ehConvidado = () => usuario().role === 'guest' || !!usuario().is_guest;

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
        // A barra do navegador acompanha o fundo da página no tema escolhido
        const corDoFundo = getComputedStyle(document.documentElement).getPropertyValue('--bg-canvas').trim();
        if (corDoFundo) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', corDoFundo);
    }

    function alternarTema() {
        aplicarTema(temaAtual() === 'dark' ? 'light' : 'dark');
    }

    // ==========================================
    // MODO BANCADA: letras e botões maiores
    // Para tablet, luvas ou leitura a distância.
    // ==========================================
    const emModoBancada = () => document.documentElement.dataset.densidade === 'bancada';

    function aplicarDensidade(bancada) {
        if (bancada) document.documentElement.dataset.densidade = 'bancada';
        else delete document.documentElement.dataset.densidade;
        try { localStorage.setItem(CHAVE_DENSIDADE, bancada ? 'bancada' : 'compacta'); } catch (e) { /* bloqueado */ }
        document.getElementById('btn-densidade')?.setAttribute('aria-pressed', String(bancada));
    }

    function alternarDensidade() {
        aplicarDensidade(!emModoBancada());
        window.UI?.showToast(emModoBancada() ? 'Modo bancada ativado: letras e botões maiores.' : 'Modo compacto ativado.', 'info');
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
    // Respeita a pergunta "Sair sem enviar?": só segue se a troca de tela aconteceu.
    async function irPara(view) {
        document.getElementById('sidebar')?.classList.remove('open');
        return window.UI.switchView(view);
    }

    function abrirEm(view, abrir) {
        return async () => {
            const trocou = await irPara(view);
            if (trocou && typeof abrir === 'function') abrir();
        };
    }

    const ICONE_DA_VIEW = {
        inicio: 'home', equipments: 'microscope', processes: 'flask', pops: 'file-text',
        rspace: 'layers', pta: 'calendar', tarefas: 'check-square', articles: 'book-open', admin: 'shield',
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

        const acoes = ehConvidado() ? [] : [
            { rotulo: 'Novo equipamento', icone: 'plus', termos: 'cadastrar ativo', executar: abrirEm('equipments', () => window.openAddEquipmentModal?.()) },
            { rotulo: 'Novo processo de P&D', icone: 'plus', termos: 'mapear pesquisa', executar: abrirEm('processes', () => window.openProcessModal?.()) },
            { rotulo: 'Novo POP', icone: 'file-plus', termos: 'procedimento operacional', executar: abrirEm('pops', () => window.openPopModal?.()) },
            { rotulo: 'Novo documento no RSpace ELN', icone: 'layers', termos: 'rspace caderno experimento eln', executar: abrirEm('rspace', () => window.rspaceAbrirModalNovoDoc?.()) },
            ehGestor() && { rotulo: 'Nova tarefa', icone: 'plus', termos: 'atribuir', executar: abrirEm('tarefas', () => window.abrirModalTarefa?.()) },
            { rotulo: 'Registrar PTA do mês', icone: 'calendar', termos: 'planejamento pta avanço', executar: () => irPara('pta') },
        ].filter(Boolean).map(c => ({ grupo: 'Criar', ...c }));

        const btn2fa = document.getElementById('btn-setup-2fa');
        const sistema = [
            { rotulo: temaAtual() === 'dark' ? 'Usar tema claro' : 'Usar tema escuro', icone: temaAtual() === 'dark' ? 'sun' : 'moon', termos: 'tema aparência modo', executar: alternarTema },
            { rotulo: emModoBancada() ? 'Voltar ao modo compacto' : 'Modo bancada (letras e botões maiores)', icone: 'eye', termos: 'acessibilidade tamanho fonte zoom tablet luva densidade', executar: alternarDensidade },
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

    // termoInicial (opcional) já filtra a lista — ex.: "Criar" no botão "Novo" da topbar.
    // Quando chamada por addEventListener o argumento é o evento, então só vale texto.
    function abrirPaleta(termoInicial) {
        if (paleta) return fecharPaleta();
        const termo = typeof termoInicial === 'string' ? termoInicial : '';

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

        paleta.input.value = termo;
        renderLista();
        paleta.input.focus();
        if (termo) paleta.input.select();
    }

    // ==========================================
    // NAVEGAÇÃO: ACORDEÃO DA SIDEBAR, MENU DA TOPBAR E SIDEBAR RECOLHÍVEL
    // A topbar usa .topnav-link[data-nav-view] (nunca .nav-item: ui.js, a paleta
    // e o modo convidado varrem .nav-item).
    // ==========================================
    const CHAVE_SIDEBAR = 'sgci-sidebar';
    const CONSULTA_GAVETA = window.matchMedia('(max-width: 1199px)');
    const modoGaveta = () => CONSULTA_GAVETA.matches;

    function definirPainel(botao, aberto) {
        const painel = document.getElementById(botao.getAttribute('aria-controls'));
        botao.setAttribute('aria-expanded', String(aberto));
        if (painel) painel.hidden = !aberto;
    }

    // Grupos da sidebar: cada um abre e fecha; o grupo da tela atual abre sozinho.
    function iniciarAcordeao() {
        document.querySelectorAll('.nav-acc-toggle').forEach(botao => {
            botao.addEventListener('click', () => definirPainel(botao, botao.getAttribute('aria-expanded') !== 'true'));
        });
    }

    function fecharMenusSuperiores(exceto) {
        document.querySelectorAll('.topnav-trigger[aria-expanded="true"]').forEach(b => {
            if (b !== exceto) definirPainel(b, false);
        });
    }

    function iniciarMenuSuperior() {
        const nav = document.querySelector('.topnav');
        if (!nav) return;

        const itemAdmin = nav.querySelector('[data-topnav-admin]');
        if (usuario().role === 'admin') itemAdmin?.removeAttribute('hidden');
        else itemAdmin?.remove();

        nav.querySelectorAll('.topnav-trigger').forEach(botao => {
            botao.addEventListener('click', () => {
                const abrir = botao.getAttribute('aria-expanded') !== 'true';
                fecharMenusSuperiores(botao);
                definirPainel(botao, abrir);
            });
        });

        nav.querySelectorAll('.topnav-link').forEach(link => {
            link.addEventListener('click', () => {
                fecharMenusSuperiores();
                irPara(link.dataset.navView);
            });
        });

        // Teclado: ↓ abre o menu e entra nele; ↑/↓ percorrem; Esc fecha e devolve o foco.
        nav.addEventListener('keydown', (e) => {
            const gatilho = e.target.closest('.topnav-item')?.querySelector('.topnav-trigger');
            if (e.key === 'Escape' && gatilho && gatilho.getAttribute('aria-expanded') === 'true') {
                e.stopPropagation();
                definirPainel(gatilho, false);
                gatilho.focus();
                return;
            }
            if (!gatilho || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
            e.preventDefault();
            definirPainel(gatilho, true);
            const itens = Array.from(document.getElementById(gatilho.getAttribute('aria-controls'))?.querySelectorAll('.topnav-link') || []);
            if (!itens.length) return;
            const atual = itens.indexOf(e.target);
            const proximo = e.key === 'ArrowDown' ? atual + 1 : (atual <= 0 ? itens.length - 1 : atual - 1);
            itens[(proximo + itens.length) % itens.length].focus();
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.topnav-item')) fecharMenusSuperiores();
        });
        nav.addEventListener('focusout', (e) => {
            if (!e.relatedTarget || !e.relatedTarget.closest('.topnav-item')) fecharMenusSuperiores();
        });
    }

    // Marca a seção atual na topbar e abre o grupo dela na sidebar.
    function sincronizarNavegacao(view) {
        if (!view) return;
        const alvo = `[data-nav-view="${CSS.escape(view)}"]`;
        document.querySelectorAll('.topnav-link').forEach(link => {
            if (link.dataset.navView === view) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });
        document.querySelectorAll('.topnav-trigger').forEach(gatilho => {
            const menu = document.getElementById(gatilho.getAttribute('aria-controls'));
            gatilho.classList.toggle('is-active', !!menu?.querySelector(alvo));
        });
        document.querySelectorAll('.nav-acc').forEach(grupo => {
            const botao = grupo.querySelector('.nav-acc-toggle');
            if (botao && grupo.querySelector(`.nav-item[data-view="${CSS.escape(view)}"]`)) definirPainel(botao, true);
        });
    }

    // ≡ no desktop recolhe/expande a sidebar (e lembra a escolha); ≤ 1199px abre a gaveta.
    function atualizarBotaoMenu() {
        const botao = document.getElementById('menu-toggle');
        const sidebar = document.getElementById('sidebar');
        if (!botao || !sidebar) return;
        const visivel = modoGaveta()
            ? sidebar.classList.contains('open')
            : document.documentElement.dataset.sidebar !== 'recolhida';
        botao.setAttribute('aria-expanded', String(visivel));
        botao.setAttribute('aria-label', modoGaveta()
            ? (visivel ? 'Fechar menu' : 'Abrir menu')
            : (visivel ? 'Recolher menu lateral' : 'Mostrar menu lateral'));
    }

    function iniciarSidebarRecolhivel() {
        const botao = document.getElementById('menu-toggle');
        const sidebar = document.getElementById('sidebar');
        if (!botao || !sidebar) return;

        // ui.js já alternou .open neste mesmo clique (o ouvinte dele foi registrado antes).
        botao.addEventListener('click', () => {
            if (modoGaveta()) return;
            sidebar.classList.remove('open');
            const recolher = document.documentElement.dataset.sidebar !== 'recolhida';
            if (recolher) document.documentElement.dataset.sidebar = 'recolhida';
            else delete document.documentElement.dataset.sidebar;
            try { localStorage.setItem(CHAVE_SIDEBAR, recolher ? 'recolhida' : 'aberta'); } catch (e) { /* bloqueado */ }
            atualizarBotaoMenu();
        });

        document.querySelector('[data-fechar-gaveta]')?.addEventListener('click', () => {
            sidebar.classList.remove('open');
            botao.focus();
        });
        // ui.js só fecha a gaveta em ≤ 991px; aqui a gaveta vale até 1199px.
        document.querySelectorAll('.sidebar .nav-item').forEach(item => {
            item.addEventListener('click', () => { if (modoGaveta()) sidebar.classList.remove('open'); });
        });
        CONSULTA_GAVETA.addEventListener('change', () => { sidebar.classList.remove('open'); atualizarBotaoMenu(); });
        // Fundo escuro, Esc e cliques fecham a gaveta mudando a classe: o botão acompanha.
        new MutationObserver(atualizarBotaoMenu).observe(sidebar, { attributes: true, attributeFilter: ['class'] });
        atualizarBotaoMenu();
    }

    // Saudação da barra abaixo da topbar
    function atualizarSaudacao() {
        const el = document.getElementById('shell-greeting');
        if (!el) return;
        const agora = new Date();
        const hora = agora.getHours();
        const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
        const nome = String(usuario().nome || '').trim().split(/\s+/)[0];
        el.textContent = nome ? `${saudacao}, ${nome}` : saudacao;
        const data = document.getElementById('shell-date');
        if (data) data.textContent = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(agora);
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
        aplicarDensidade(emModoBancada());

        document.getElementById('btn-theme')?.addEventListener('click', alternarTema);
        document.getElementById('btn-densidade')?.addEventListener('click', alternarDensidade);
        document.getElementById('btn-palette')?.addEventListener('click', () => abrirPaleta());
        document.getElementById('btn-novo-global')?.addEventListener('click', () => abrirPaleta('Criar'));
        iniciarAcordeao();
        iniciarMenuSuperior();
        iniciarSidebarRecolhivel();
        atualizarSaudacao();
        document.addEventListener('viewChanged', (e) => sincronizarNavegacao(e.detail.view));
        // ui.js já abriu a primeira tela antes deste script registrar o ouvinte
        sincronizarNavegacao(document.querySelector('.sidebar .nav-item.active')?.dataset.view);
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

    window.Shell = { abrirPaleta, alternarTema, alternarDensidade };
})();
