// ==========================================
// SALVAGUARDAS: PROTEÇÃO CONTRA ERROS E ACESSIBILIDADE
// Comportamentos aplicados ao sistema inteiro, sem
// depender de cada tela:
//   · modais com foco gerenciado e anunciados como diálogo
//   · aviso antes de descartar texto não salvo
//   · rascunho automático dos formulários longos
//   · bloqueio de envio em duplicidade
//   · teclado em elementos clicáveis que não são botões
//   · mensagem de erro ao lado do campo inválido
// ==========================================
(function () {
    const PREFIXO_RASCUNHO = 'sgci-rascunho:';
    const VALIDADE_RASCUNHO_MS = 7 * 24 * 60 * 60 * 1000;
    const ATRASO_RASCUNHO_MS = 600;
    const JANELA_DO_ULTIMO_ENVIO_MS = 60 * 1000;

    // Campos em que a pessoa digita: são eles que fazem falta se sumirem.
    const CAMPOS_DE_TEXTO = 'textarea, input[type="text"], input[type="url"], input[type="email"], input[type="date"], input[type="datetime-local"], input:not([type])';
    const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const visivel = (el) => el.isConnected && getComputedStyle(el).display !== 'none';
    const focaveis = (raiz) => Array.from(raiz.querySelectorAll(FOCAVEIS)).filter(el => el.offsetParent !== null);

    // ==========================================
    // MODAIS: PAPEL, FOCO E PILHA
    // ==========================================
    let abertos = [];

    function aoAbrir(modal) {
        const conteudo = modal.querySelector('.modal-content') || modal;
        const ehConfirmacao = !!modal.querySelector('[data-role="ok"]') || modal.classList.contains('is-locked');
        conteudo.setAttribute('role', ehConfirmacao ? 'alertdialog' : 'dialog');
        conteudo.setAttribute('aria-modal', 'true');

        const titulo = conteudo.querySelector('h2, h3');
        if (titulo) {
            if (!titulo.id) titulo.id = `dialogo-${Math.random().toString(36).slice(2, 8)}`;
            conteudo.setAttribute('aria-labelledby', titulo.id);
        }

        // Modal fixo reaberto começa limpo.
        conteudo.querySelectorAll('[data-sujo]').forEach(el => delete el.dataset.sujo);
        abertos.push({ modal, foco: document.activeElement });

        setTimeout(() => {
            if (!modal.isConnected || conteudo.contains(document.activeElement)) return;
            // Com formulário: cursor no primeiro campo. Sem formulário: o leitor de tela começa pelo título.
            const form = conteudo.querySelector('form');
            const campo = form && Array.from(form.querySelectorAll('input, select, textarea'))
                .find(el => el.offsetParent !== null && !el.readOnly && !el.disabled && el.type !== 'hidden' && el.type !== 'file');
            const alvo = conteudo.querySelector('[autofocus]') || campo || conteudo;
            if (alvo === conteudo) conteudo.tabIndex = -1;
            alvo.focus({ preventScroll: true });
        }, 0);
    }

    function aoFechar(item) {
        item.modal.querySelectorAll('[data-sujo]').forEach(el => delete el.dataset.sujo);
        const voltarPara = item.foco;
        if (voltarPara && voltarPara.isConnected && voltarPara !== document.body) {
            setTimeout(() => {
                if (!modalDoTopo()) voltarPara.focus({ preventScroll: true });
            }, 0);
        }
    }

    function sincronizarModais() {
        const atuais = Array.from(document.querySelectorAll('.modal-overlay')).filter(visivel);
        abertos = abertos.filter(item => {
            if (atuais.includes(item.modal)) return true;
            aoFechar(item);
            return false;
        });
        atuais.forEach(m => { if (!abertos.some(item => item.modal === m)) aoAbrir(m); });
    }

    function modalDoTopo() {
        for (let i = abertos.length - 1; i >= 0; i--) {
            if (visivel(abertos[i].modal)) return abertos[i].modal;
        }
        return null;
    }

    // Tab não escapa para a página atrás do modal.
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab' || document.querySelector('.cmdk-overlay')) return;
        const topo = modalDoTopo();
        if (!topo) return;
        const conteudo = topo.querySelector('.modal-content') || topo;
        const lista = focaveis(conteudo);
        if (!lista.length) { e.preventDefault(); return; }
        const primeiro = lista[0];
        const ultimo = lista[lista.length - 1];
        if (!conteudo.contains(document.activeElement)) { e.preventDefault(); primeiro.focus(); }
        else if (e.shiftKey && (document.activeElement === primeiro || document.activeElement === conteudo)) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    });

    // ==========================================
    // TEXTO NÃO SALVO
    // ==========================================
    function donoDoCampo(campo) {
        if (!campo.closest('.modal-overlay, #dynamic-content')) return null;
        return campo.closest('form') || campo.closest('.modal-content');
    }

    function marcarSujo(e) {
        const campo = e.target;
        if (!campo.matches || !campo.matches(CAMPOS_DE_TEXTO) || campo.matches('[data-busca], [type="search"]')) return;
        const dono = donoDoCampo(campo);
        if (dono) dono.dataset.sujo = '1';
    }

    function temTextoNaoSalvo(raiz) {
        return !!(raiz && raiz.querySelector('[data-sujo]'));
    }

    async function podeDescartar(modal) {
        if (!temTextoNaoSalvo(modal)) return true;
        const comRascunho = !!modal.querySelector('form[data-rascunho]');
        return window.UI.confirm(
            comRascunho
                ? 'O que você escreveu ainda não foi salvo. Se fechar agora, o texto fica guardado como rascunho neste navegador e poderá ser restaurado.'
                : 'O que você escreveu ainda não foi salvo e será perdido.',
            { title: 'Fechar sem salvar?', confirmText: 'Fechar', cancelText: 'Continuar editando' }
        );
    }

    function formularioSujoNaTela() {
        return temTextoNaoSalvo(document.getElementById('dynamic-content'));
    }

    window.addEventListener('beforeunload', (e) => {
        const sujo = Array.from(document.querySelectorAll('[data-sujo]')).some(el => el.offsetParent !== null);
        if (!sujo) return;
        e.preventDefault();
        e.returnValue = '';
    });

    // ==========================================
    // RASCUNHOS
    // Ficam no navegador, separados por pessoa, por 7 dias.
    // ==========================================
    function donoDosRascunhos() {
        try {
            const u = JSON.parse(localStorage.getItem('user_data') || '{}');
            return String(u.id || u.email || u.nome || 'anonimo');
        } catch (e) { return 'anonimo'; }
    }

    const chaveDoRascunho = (form) => `${PREFIXO_RASCUNHO}${donoDosRascunhos()}:${form.dataset.rascunho}`;

    function camposDoRascunho(form) {
        return Array.from(form.elements).filter(el =>
            !['file', 'password', 'hidden', 'submit', 'button', 'reset'].includes(el.type) &&
            (el.id || (el.type === 'checkbox' && el.name)));
    }

    function lerRascunho(form) {
        try {
            const salvo = JSON.parse(localStorage.getItem(chaveDoRascunho(form)) || 'null');
            if (!salvo || Date.now() - salvo.em > VALIDADE_RASCUNHO_MS) return null;
            return salvo;
        } catch (e) { return null; }
    }

    function salvarRascunho(form) {
        if (!form || !form.dataset.rascunho || !form.isConnected) return;
        const campos = camposDoRascunho(form);
        const temTexto = campos.some(el => el.matches(CAMPOS_DE_TEXTO) && el.value.trim());
        try {
            if (!temTexto) { localStorage.removeItem(chaveDoRascunho(form)); return; }
            const dados = {};
            campos.forEach(el => {
                if (el.type === 'checkbox' && !el.id) dados[`cb:${el.name}:${el.value}`] = el.checked;
                else dados[el.id] = el.type === 'checkbox' ? el.checked : el.value;
            });
            localStorage.setItem(chaveDoRascunho(form), JSON.stringify({ em: Date.now(), dados }));
        } catch (e) { /* armazenamento cheio ou bloqueado: segue sem rascunho */ }
    }

    function apagarRascunho(form) {
        if (!form || !form.dataset.rascunho) return;
        try { localStorage.removeItem(chaveDoRascunho(form)); } catch (e) { /* bloqueado */ }
        form.querySelector('.draft-bar')?.remove();
    }

    const temporizadores = new WeakMap();
    function salvarRascunhoAdiado(form) {
        if (!form || !form.dataset.rascunho) return;
        clearTimeout(temporizadores.get(form));
        temporizadores.set(form, setTimeout(() => salvarRascunho(form), ATRASO_RASCUNHO_MS));
    }

    function restaurarRascunho(form, salvo) {
        Object.entries(salvo.dados).forEach(([chave, valor]) => {
            let el;
            if (chave.startsWith('cb:')) {
                const [, nome, valorDoCampo] = chave.split(':');
                el = form.querySelector(`input[type="checkbox"][name="${CSS.escape(nome)}"][value="${CSS.escape(valorDoCampo)}"]`);
                if (el) el.checked = !!valor;
            } else {
                el = document.getElementById(chave);
                if (!el || !form.contains(el)) return;
                if (el.type === 'checkbox') el.checked = !!valor;
                else el.value = valor;
            }
            if (el) {
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        form.dataset.sujo = '1';
    }

    function oferecerRascunho(form) {
        const salvo = lerRascunho(form);
        form.querySelector('.draft-bar')?.remove();
        if (!salvo) return;

        const quando = new Date(salvo.em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        const barra = document.createElement('div');
        barra.className = 'draft-bar';
        barra.setAttribute('role', 'status');
        barra.innerHTML = `
            <span>Há um rascunho não enviado deste formulário, de <span class="mono">${quando}</span>.</span>
            <span class="cluster">
                <button type="button" class="link-btn" data-acao="restaurar">Restaurar</button>
                <button type="button" class="link-btn muted" data-acao="descartar">Descartar</button>
            </span>`;
        barra.querySelector('[data-acao="restaurar"]').addEventListener('click', () => {
            restaurarRascunho(form, salvo);
            barra.remove();
            window.UI.showToast('Rascunho restaurado.', 'success');
        });
        barra.querySelector('[data-acao="descartar"]').addEventListener('click', () => apagarRascunho(form));
        form.prepend(barra);
    }

    function vincularRascunho(form, chave) {
        if (!form) return;
        form.dataset.rascunho = chave;
        oferecerRascunho(form);
    }

    // ==========================================
    // ENVIO EM ANDAMENTO
    // O que disparou a requisição (formulário ou botão)
    // fica travado até a resposta chegar.
    // ==========================================
    let origemAtual = null;
    let ultimoEnvio = null;

    function definirOrigem(el) {
        origemAtual = el;
        setTimeout(() => { if (origemAtual === el) origemAtual = null; }, 0);
    }

    function ocupar(el, delta) {
        el._requisicoes = Math.max(0, (el._requisicoes || 0) + delta);
        const ocupado = el._requisicoes > 0;
        const botoes = el.tagName === 'FORM' ? el.querySelectorAll('button[type="submit"]') : [el];
        if (ocupado) el.dataset.ocupado = '1';
        else delete el.dataset.ocupado;
        botoes.forEach(b => (ocupado ? b.setAttribute('aria-busy', 'true') : b.removeAttribute('aria-busy')));
    }

    document.addEventListener('submit', (e) => {
        const form = e.target;
        if (form.dataset.ocupado) {
            e.preventDefault();
            e.stopImmediatePropagation();
            return;
        }
        ultimoEnvio = { form, em: Date.now() };
        definirOrigem(form);
    }, true);

    document.addEventListener('click', (e) => {
        const botao = e.target.closest && e.target.closest('button, [role="button"]');
        if (!botao) return;
        if (botao.dataset.ocupado || (botao.form && botao.type === 'submit' && botao.form.dataset.ocupado)) {
            e.preventDefault();
            e.stopImmediatePropagation();
            return;
        }
        if (!(botao.type === 'submit' && botao.form)) definirOrigem(botao);
    }, true);

    function formDoSucesso(origem) {
        if (origem && origem.tagName === 'FORM') return origem;
        if (origem && origem.form) return origem.form;
        // Envio confirmado num diálogo intermediário (ex.: "Enviar assim mesmo").
        if (ultimoEnvio && Date.now() - ultimoEnvio.em < JANELA_DO_ULTIMO_ENVIO_MS) return ultimoEnvio.form;
        return null;
    }

    function envolverApi() {
        if (!window.api || window.api._comSalvaguardas) return;
        const original = window.api.fetchProtected;
        window.api.fetchProtected = function (endpoint, opcoes = {}) {
            const origem = origemAtual;
            const mutacao = (opcoes.method || 'GET').toUpperCase() !== 'GET';
            if (origem) ocupar(origem, +1);

            const promessa = original.apply(this, arguments);
            promessa.then(res => {
                if (!mutacao || !res || !res.ok) return;
                const form = formDoSucesso(origem);
                if (!form) return;
                apagarRascunho(form);
                delete form.dataset.sujo;
                if (ultimoEnvio && ultimoEnvio.form === form) ultimoEnvio = null;
            }).catch(() => {}).finally(() => { if (origem) ocupar(origem, -1); });
            return promessa;
        };
        window.api._comSalvaguardas = true;
    }

    // ==========================================
    // TECLADO EM ELEMENTOS CLICÁVEIS
    // Linhas, cartões e meses que abrem algo também
    // respondem a Tab + Enter/Espaço.
    // ==========================================
    const SELETOR_CLICAVEL = '[onclick]:not(button):not(a):not(input):not(select):not(textarea):not(label):not(.modal-overlay):not([tabindex])';

    function tornarAcionaveis() {
        document.querySelectorAll(SELETOR_CLICAVEL).forEach(el => {
            const acao = (el.getAttribute('onclick') || '').trim();
            if (/^event\.stopPropagation\(\);?$/.test(acao)) return;
            el.tabIndex = 0;
            // Linha de tabela continua linha para o leitor de tela.
            if (el.tagName !== 'TR' && !el.hasAttribute('role')) el.setAttribute('role', 'button');
            if (el.tagName === 'IMG' && !el.getAttribute('alt')) el.setAttribute('alt', el.title || 'Abrir imagem em tamanho real');
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const el = e.target;
        if (!el.hasAttribute || !el.hasAttribute('onclick') || el.matches('button, a, input, select, textarea, label')) return;
        e.preventDefault();
        el.click();
    });

    // ==========================================
    // VALIDAÇÃO AO LADO DO CAMPO
    // ==========================================
    function mostrarErro(campo) {
        if (!campo.id) campo.id = `campo-${Math.random().toString(36).slice(2, 8)}`;
        const idErro = `erro-${campo.id}`;
        let erro = document.getElementById(idErro);
        if (!erro) {
            erro = document.createElement('span');
            erro.className = 'field-error';
            erro.id = idErro;
            const grupo = campo.closest('.input-group') || campo.parentElement;
            grupo.appendChild(erro);
            const descritores = (campo.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
            if (!descritores.includes(idErro)) campo.setAttribute('aria-describedby', [...descritores, idErro].join(' '));
        }
        erro.textContent = campo.validationMessage;
        campo.setAttribute('aria-invalid', 'true');
    }

    function limparErro(campo) {
        document.getElementById(`erro-${campo.id}`)?.remove();
        campo.removeAttribute('aria-invalid');
        const descritores = (campo.getAttribute('aria-describedby') || '').split(' ').filter(d => d && d !== `erro-${campo.id}`);
        if (descritores.length) campo.setAttribute('aria-describedby', descritores.join(' '));
        else campo.removeAttribute('aria-describedby');
    }

    const validavel = (el) => el.willValidate && el.form && el.type !== 'range' && !el.matches('[data-busca], [type="search"]');

    // Ao sair do campo: só avisa formato/faixa. "Obrigatório" aparece ao enviar,
    // para não acusar erro em quem só está passando pelo campo com Tab.
    document.addEventListener('focusout', (e) => {
        const campo = e.target;
        if (!validavel(campo) || campo.value === '') return;
        if (!campo.checkValidity()) mostrarErro(campo);
    });
    document.addEventListener('invalid', (e) => { if (validavel(e.target)) mostrarErro(e.target); }, true);
    document.addEventListener('input', (e) => {
        const campo = e.target;
        if (campo.getAttribute && campo.getAttribute('aria-invalid') === 'true' && campo.validity.valid) limparErro(campo);
    });

    // ==========================================
    // OBSERVAÇÃO DO DOM
    // Uma vez por lote de mudanças, logo em seguida (microtarefa):
    // o modal precisa estar registrado antes de a pessoa digitar.
    // ==========================================
    let agendado = false;
    function agendar() {
        if (agendado) return;
        agendado = true;
        queueMicrotask(() => {
            agendado = false;
            sincronizarModais();
            tornarAcionaveis();
        });
    }

    document.addEventListener('input', (e) => {
        marcarSujo(e);
        salvarRascunhoAdiado(e.target.closest && e.target.closest('form[data-rascunho]'));
    }, true);
    document.addEventListener('change', (e) => {
        salvarRascunhoAdiado(e.target.closest && e.target.closest('form[data-rascunho]'));
    }, true);
    // Reset limpa o estado, não o rascunho: algumas telas resetam o formulário
    // ao abrir. O rascunho só é apagado quando o envio dá certo (ver envolverApi).
    document.addEventListener('reset', (e) => {
        const form = e.target;
        delete form.dataset.sujo;
        form.querySelectorAll('[aria-invalid="true"]').forEach(limparErro);
    }, true);

    envolverApi();
    document.addEventListener('DOMContentLoaded', () => {
        envolverApi();
        document.querySelectorAll('.modal-overlay').forEach(m => { m.dataset.fixo = '1'; });
        new MutationObserver(agendar).observe(document.body, {
            childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'],
        });
        agendar();
    });

    window.Salvaguardas = {
        modalDoTopo,
        podeDescartar,
        formularioSujoNaTela,
        vincularRascunho,
        apagarRascunho,
    };
})();
