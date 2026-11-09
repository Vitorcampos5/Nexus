(function () {
  'use strict';

  var CHAVE = 'malik_nexus_apagado';
  var modoTeste = /[?&]malikTeste=1\b/.test(location.search);

  // ?telaApagada=1  → mostra a tela preta com o coro dos heróis sem gravar nada
  //                   (para testar o visual). O botão final só recarrega a página.
  // ?coroRapido=1   → o coro roda ~5x mais rápido (só para testes).
  var previaCoro = /[?&]telaApagada=1\b/.test(location.search);
  var ESCALA = /[?&]coroRapido=1\b/.test(location.search) ? 0.2 : 1;

  var NS_SVG = 'http://www.w3.org/2000/svg';

  // ═══ O coro ═══
  // Quando o Nexus é removido, alguns heróis (de outros mundos, de outros caminhos
  // que também já chegaram ao desespero) respondem ao viajante. Cada um fala na sua
  // cor, e sua constelação acende. Quando todas se unem, a luz delas reacende o
  // Nexus — é a razão, dentro da lore, de o botão de recomeçar existir.
  //
  // Para acrescentar um herói: basta incluir um objeto nesta lista, na ordem em que
  // ele deve falar. A posição na tela é calculada sozinha; "forma" é o desenho da
  // constelação (pontos entre -1 e 1 e as ligações entre eles).
  var HEROIS = [
    {
      titulo: 'Aquele que retorna da morte',
      fala: 'Eu morri tantas vezes que parei de contar. Não foi coragem — foi só recusar que esse fosse o fim. Levanta, viajante. Recomeçar também é lutar.',
      cor: '#8fb4ff',
      // um laço que se fecha sobre si mesmo: voltar ao ponto de partida
      forma: {
        pontos: [[0, -1], [0.9, -0.45], [0.85, 0.5], [0, 0.95], [-0.8, 0.45], [-0.75, -0.35], [-0.05, -0.15]],
        ligacoes: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]]
      }
    },
    {
      titulo: 'Grande Sábio Igual ao Céu',
      fala: 'Cinco séculos sob uma montanha, e o céu ainda achou pouco. Nenhum decreto escreve o seu destino, viajante. Quebre o que te prende e siga em frente.',
      cor: '#ffb347',
      // um bastão atravessando uma nuvem
      forma: {
        pontos: [[-0.95, 0.95], [-0.45, 0.45], [0.05, -0.05], [0.55, -0.55], [0.95, -0.95], [-0.1, 0.95], [0.45, 0.6], [0.95, 0.85]],
        ligacoes: [[0, 1], [1, 2], [2, 3], [3, 4], [5, 6], [6, 7], [2, 6]]
      }
    }
  ];

  var INTRO = 'Alguns heróis demonstram sua insatisfação diante do desespero e da perda de esperança desse caminho.';
  var FALA_FINAL = 'Enquanto alguém ainda o atravessa, nenhum caminho termina.';
  var COR_NARRADOR = '#d9d9d9';
  var COR_FINAL = '#ffe9b0';

  // ═══ Restaurar o Nexus ═══
  // Sai da tela preta e devolve o Nexus a um estado jogável, sem apagar o que o
  // viajante conquistou (sagas lidas, esferas, fragmentos da Canção, cura...).
  var CHAVES_DO_EVENTO = [
    CHAVE,
    'malik_batalha_progresso',
    'malik_desperto_em',
    'malik_despertar_pessoal_em',
    'malik_cura_recusada_em'
  ];
  var CHAVES_DE_ESTRAGO = [
    'malik_paginas_quebradas',
    'malik_objetos_poeira',
    'malik_dust_state',
    'malik_poeira'
  ];

  function ler(chave) {
    try { return localStorage.getItem(chave); } catch (e) { return null; }
  }
  function apagar(chaves) {
    chaves.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
  }

  function restaurarNexus() {
    var jaVenceuMalik = !!ler('malik_resolvido_em');
    apagar(CHAVES_DO_EVENTO);
    try { sessionStorage.removeItem('malik_sessao_batalha_ativa'); } catch (e) {}
    if (!jaVenceuMalik) {
      // Nunca o derrotou: o Nexus volta ao estado de antes do evento e ele ganha um
      // prazo novo (a espera conta a partir de agora). Se já o tinha derrotado
      // (e recusou a cura), as páginas quebradas ficam: a cura volta a ser possível.
      apagar(CHAVES_DE_ESTRAGO);
      try { localStorage.setItem('malik_primeira_visita', String(Date.now())); } catch (e) {}
    }
  }

  function urlSemParametrosDePrevia() {
    var partes = location.search.replace(/^\?/, '').split('&').filter(function (p) {
      return p && !/^(telaApagada|coroRapido)=/.test(p);
    });
    return location.pathname + (partes.length ? '?' + partes.join('&') : '') + location.hash;
  }

  // ═══ Estado do evento antigo ═══
  // O evento antes era global (30/10, 13h). Quem estava com o Nexus quebrado por
  // ele — páginas viradas poeira, mas sem nunca ter lutado nem terminado — ficaria
  // com um Nexus quebrado e nenhum Malik para enfrentar. Isto roda antes de o iframe
  // carregar, então o nexus.html já nasce sem os restos.
  function limparRestosDoEventoAntigo() {
    if (modoTeste || previaCoro) return;
    if (ler('malik_resolvido_em') || ler('malik_nexus_curado') === '1') return;
    if (ler('malik_despertar_pessoal_em') || ler('malik_batalha_progresso') || ler(CHAVE)) return;
    if (!ler('malik_paginas_quebradas')) return;
    apagar(CHAVES_DE_ESTRAGO);
  }

  // ═══ Tela preta ═══
  var CSS = [
    '#malik-apagado{position:fixed;inset:0;z-index:900000;background:#000;color:#c8c8c8;overflow:hidden;font-family:Consolas,monospace;}',
    '#malik-apagado *{box-sizing:border-box;}',
    '#malik-apagado .ma-erro{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:15px;letter-spacing:.04em;text-align:center;line-height:2;transition:opacity 2.6s ease;}',
    '#malik-apagado .ma-erro.some{opacity:0;}',
    '#malik-apagado .ma-ceu{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;}',

    // brilhos
    '#malik-apagado .ma-brilho{opacity:0;transition:opacity 1.8s ease;}',
    '#malik-apagado .ma-brilho.on{opacity:1;animation:ma-cintila var(--dur,3.4s) ease-in-out var(--atraso,0s) infinite;}',
    '@keyframes ma-cintila{0%,100%{opacity:.35;}50%{opacity:1;}}',

    // constelações
    '#malik-apagado .ma-cons .ma-fio{stroke-dasharray:1;stroke-dashoffset:1;opacity:.85;transition:stroke-dashoffset 1.6s ease-in-out;}',
    '#malik-apagado .ma-cons.acesa .ma-fio{stroke-dashoffset:0;}',
    '#malik-apagado .ma-cons .ma-estrela{opacity:0;transition:opacity 1.4s ease;}',
    '#malik-apagado .ma-cons.surge .ma-estrela{opacity:.35;}',
    '#malik-apagado .ma-cons.acesa .ma-estrela{opacity:1;}',
    '#malik-apagado .ma-cons .ma-halo{opacity:0;transition:opacity 1.4s ease;}',
    '#malik-apagado .ma-cons.acesa .ma-halo{opacity:.28;}',
    '#malik-apagado .ma-cons.fala .ma-halo{opacity:.6;}',
    '#malik-apagado .ma-conjunto{transform-origin:50% 50%;transition:transform 3.2s ease;}',
    '#malik-apagado .ma-conjunto.unido{transform:scale(.93);}',
    '#malik-apagado .ma-elo{stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset 1.5s ease-in-out;}',
    '#malik-apagado .ma-elo.on{stroke-dashoffset:0;}',
    '#malik-apagado.unido .ma-cons .ma-halo{opacity:.6;animation:ma-pulso 3.6s ease-in-out infinite;}',
    '@keyframes ma-pulso{0%,100%{opacity:.35;}50%{opacity:.85;}}',

    // vozes
    '#malik-apagado .ma-voz{position:absolute;left:50%;top:55%;width:min(88vw,540px);transform:translate(-50%,-50%);text-align:center;opacity:0;transition:opacity 1.1s ease;padding:26px 18px;background:radial-gradient(closest-side,rgba(0,0,0,.88) 55%,rgba(0,0,0,0));pointer-events:none;}',
    '#malik-apagado .ma-voz.on{opacity:1;}',
    '#malik-apagado .ma-voz-nome{font-size:12px;letter-spacing:.2em;text-transform:uppercase;margin-bottom:14px;opacity:.9;}',
    '#malik-apagado .ma-voz-fala{position:relative;font-family:Georgia,"Times New Roman",serif;font-style:italic;font-size:clamp(16px,3.6vw,22px);line-height:1.6;text-wrap:balance;text-shadow:0 0 14px currentColor;}',
    '#malik-apagado .ma-voz-fala::before,#malik-apagado .ma-voz-fala::after{content:attr(data-t);position:absolute;inset:0;pointer-events:none;animation:ma-eco 3.6s ease-out 3 both;}',
    '#malik-apagado .ma-voz-fala::after{animation-delay:1.2s;}',
    '@keyframes ma-eco{0%{opacity:0;transform:scale(1);filter:blur(0);}12%{opacity:.5;}100%{opacity:0;transform:scale(1.22);filter:blur(5px);}}',

    // final
    '#malik-apagado .ma-nucleo{position:absolute;left:50%;top:50%;width:min(120vw,820px);aspect-ratio:1;transform:translate(-50%,-50%) scale(.6);border-radius:50%;background:radial-gradient(closest-side,rgba(255,233,176,.26),rgba(255,233,176,.08) 55%,rgba(255,233,176,0));opacity:0;transition:opacity 3s ease,transform 4s ease;pointer-events:none;}',
    '#malik-apagado .ma-nucleo.on{opacity:1;transform:translate(-50%,-50%) scale(1);}',
    '#malik-apagado .ma-final{position:absolute;left:50%;top:55%;width:min(88vw,540px);transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:30px;text-align:center;}',
    '#malik-apagado .ma-final .ma-voz-fala{opacity:0;transition:opacity 1.4s ease;}',
    '#malik-apagado .ma-final.on .ma-voz-fala{opacity:1;}',
    '#malik-apagado .ma-botao{min-height:46px;padding:12px 30px;background:rgba(0,0,0,.55);border:1px solid #ffe9b0;color:#ffe9b0;font-family:Consolas,monospace;font-size:14px;letter-spacing:.08em;cursor:pointer;opacity:0;transform:translateY(8px);pointer-events:none;transition:opacity 1.6s ease,transform 1.6s ease,background .25s ease,box-shadow .25s ease;box-shadow:0 0 18px rgba(255,233,176,.25);}',
    '#malik-apagado .ma-botao.on{opacity:1;transform:none;pointer-events:auto;}',
    '#malik-apagado .ma-botao:hover,#malik-apagado .ma-botao:focus-visible{background:rgba(255,233,176,.14);box-shadow:0 0 28px rgba(255,233,176,.5);outline:none;}',
    '#malik-apagado .ma-botao[disabled]{cursor:default;opacity:.6;}',
    '#malik-apagado .ma-flash{position:absolute;inset:0;background:#fff3d6;opacity:0;pointer-events:none;transition:opacity 1.3s ease;}',
    '#malik-apagado .ma-flash.on{opacity:1;}',

    // modo de teste (botão antigo)
    '#malik-apagado .ma-teste{position:absolute;left:50%;bottom:22px;transform:translateX(-50%);padding:9px 20px;background:transparent;border:1px solid #C4A35A;color:#C4A35A;font-family:Consolas,monospace;font-size:12px;letter-spacing:.05em;cursor:pointer;}',

    // celular deitado: pouca altura, então voz e botão ficam mais compactos
    '@media (max-height:480px){',
    '#malik-apagado .ma-voz{top:60%;padding:10px 18px;}',
    '#malik-apagado .ma-voz-nome{margin-bottom:8px;}',
    '#malik-apagado .ma-voz-fala{font-size:15px;line-height:1.45;}',
    '#malik-apagado .ma-final{top:60%;gap:18px;}',
    '#malik-apagado .ma-botao{min-height:42px;padding:9px 26px;}',
    '}',

    '@media (prefers-reduced-motion:reduce){',
    '#malik-apagado .ma-brilho.on{animation:none;opacity:.8;}',
    '#malik-apagado .ma-voz-fala::before,#malik-apagado .ma-voz-fala::after{animation:none;display:none;}',
    '#malik-apagado.unido .ma-cons .ma-halo{animation:none;}',
    '#malik-apagado .ma-conjunto.unido{transform:none;}',
    '#malik-apagado .ma-nucleo{transform:translate(-50%,-50%);transition:opacity 1.2s ease;}',
    '}'
  ].join('\n');

  function el(tag, classe, texto) {
    var n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texto !== undefined) n.textContent = texto;
    return n;
  }
  function svg(nome, atributos) {
    var n = document.createElementNS(NS_SVG, nome);
    Object.keys(atributos || {}).forEach(function (k) { n.setAttribute(k, atributos[k]); });
    return n;
  }
  function numero(v) { return Math.round(v * 10) / 10; }

  function mostrarTelaApagada() {
    var frame = document.getElementById('nexusFrame');
    if (frame) frame.remove();
    document.title = 'M.A.L.I.K.';
    if (document.getElementById('malik-apagado')) return;

    var tela = el('div');
    tela.id = 'malik-apagado';

    var estilo = document.createElement('style');
    estilo.textContent = CSS;
    tela.appendChild(estilo);

    var erro = el('div', 'ma-erro');
    erro.innerHTML = 'ERR_CONNECTION_TIMED_OUT<br>este link não respondeu.<br><br><span style="color:#ff2b3a">NEXUS REMOVIDO.</span>';
    tela.appendChild(erro);

    if (modoTeste) {
      var botaoTeste = el('button', 'ma-teste', 'Recomeçar a luta do Cenário A');
      botaoTeste.addEventListener('click', function () {
        try { localStorage.removeItem(CHAVE); } catch (e) {}
        try { localStorage.removeItem('malik_batalha_progresso'); } catch (e) {}
        tela.remove();
        var apagaoBatalha = document.getElementById('malik-apagao-batalha');
        if (apagaoBatalha) apagaoBatalha.remove();
        if (window.NexusMalikPermitirNovaLuta) window.NexusMalikPermitirNovaLuta();
        if (window.iniciarConfrontoMalik) window.iniciarConfrontoMalik('A', { ausente: false });
      });
      tela.appendChild(botaoTeste);
    }

    function colocar() {
      document.body.appendChild(tela);
      tocarCoro(tela, erro);
    }
    if (document.body) {
      colocar();
    } else {
      document.addEventListener('DOMContentLoaded', colocar);
    }
  }

  // ═══ A cena ═══
  function tocarCoro(tela, erro) {
    var timers = [];
    function depois(ms, fn) {
      var id = setTimeout(fn, Math.max(0, ms * ESCALA));
      timers.push(id);
      return id;
    }

    var L = Math.max(320, window.innerWidth || 800);
    var A = Math.max(320, window.innerHeight || 600);
    var tamanho = Math.max(38, Math.min(92, Math.min(L, A) * 0.13));

    var ceu = svg('svg', { 'class': 'ma-ceu', viewBox: '0 0 ' + L + ' ' + A, preserveAspectRatio: 'xMidYMid meet', 'aria-hidden': 'true', focusable: 'false' });
    var defs = svg('defs');
    ceu.appendChild(defs);
    var conjunto = svg('g', { 'class': 'ma-conjunto' });
    ceu.appendChild(conjunto);
    tela.insertBefore(ceu, erro.nextSibling);

    // Brilhos soltos: o céu ainda sem desenho
    var soltos = [];
    var quantidadeSoltos = Math.round(Math.min(46, (L * A) / 14000));
    for (var s = 0; s < quantidadeSoltos; s++) {
      var b = svg('circle', {
        'class': 'ma-brilho',
        cx: numero(Math.random() * L), cy: numero(Math.random() * A),
        r: numero(0.7 + Math.random() * 1.1), fill: '#cfd6e6'
      });
      b.style.setProperty('--dur', numero(2.6 + Math.random() * 3) + 's');
      b.style.setProperty('--atraso', numero(Math.random() * 3) + 's');
      conjunto.appendChild(b);
      soltos.push(b);
    }

    // Constelações: uma por herói, distribuídas em volta do centro
    // Com 1 ou 2 heróis, as constelações ficam no alto do céu (o centro é das vozes
    // e do botão); a partir de 3, formam um anel em volta do centro.
    var passoAngulo = HEROIS.length <= 2 ? 110 : 360 / HEROIS.length;
    var cons = HEROIS.map(function (h, i) {
      var ang = (-90 - (HEROIS.length - 1) * passoAngulo / 2 + i * passoAngulo) * Math.PI / 180;
      var ax = L / 2 + Math.cos(ang) * L * 0.34;
      var ay = A / 2 + Math.sin(ang) * A * 0.36;
      var g = svg('g', { 'class': 'ma-cons' });
      var pts = h.forma.pontos.map(function (p) {
        return { x: ax + p[0] * tamanho, y: ay + p[1] * tamanho };
      });
      h.forma.ligacoes.forEach(function (lig, k) {
        var fio = svg('line', {
          'class': 'ma-fio', pathLength: '1',
          x1: numero(pts[lig[0]].x), y1: numero(pts[lig[0]].y),
          x2: numero(pts[lig[1]].x), y2: numero(pts[lig[1]].y),
          stroke: h.cor, 'stroke-width': '1.3', 'stroke-linecap': 'round'
        });
        fio.style.transitionDelay = numero(k * 0.35) + 's';
        g.appendChild(fio);
      });
      pts.forEach(function (p) {
        var halo = svg('circle', { 'class': 'ma-halo', cx: numero(p.x), cy: numero(p.y), r: '7', fill: h.cor });
        var est = svg('circle', { 'class': 'ma-estrela', cx: numero(p.x), cy: numero(p.y), r: '2.2', fill: h.cor });
        g.appendChild(halo);
        g.appendChild(est);
      });
      conjunto.appendChild(g);
      return { grupo: g, pontos: pts, ancora: { x: ax, y: ay }, cor: h.cor };
    });

    // Voz (mensagem que ecoa)
    function criarVoz(nome, fala, cor) {
      var voz = el('div', 'ma-voz');
      voz.setAttribute('aria-live', 'polite');
      voz.style.color = cor;
      if (nome) {
        var n = el('div', 'ma-voz-nome', '[' + nome + ']');
        voz.appendChild(n);
      }
      var f = el('div', 'ma-voz-fala', fala);
      f.setAttribute('data-t', fala);
      voz.appendChild(f);
      tela.appendChild(voz);
      return voz;
    }
    function tempoDeLeitura(texto) { return Math.max(4200, texto.length * 62); }

    // Linha do tempo
    var t = 3400; // a tela de erro, sozinha, antes de qualquer coisa

    depois(t, function () { erro.classList.add('some'); });
    t += 1800;

    // 1. Intro (narrador) + brilhos aparecendo
    depois(t, function () {
      var voz = criarVoz('', INTRO, COR_NARRADOR);
      requestAnimationFrame(function () { voz.classList.add('on'); });
      depois(tempoDeLeitura(INTRO), function () { voz.classList.remove('on'); depois(1200, function () { voz.remove(); }); });
    });
    soltos.forEach(function (b) { depois(t + 600 + Math.random() * 4200, function () { b.classList.add('on'); }); });
    cons.forEach(function (c, i) { depois(t + 1800 + i * 500, function () { c.grupo.classList.add('surge'); }); });
    t += tempoDeLeitura(INTRO) + 2000;

    // 2. Cada herói fala; sua constelação acende
    HEROIS.forEach(function (h, i) {
      var c = cons[i];
      depois(t, function () {
        c.grupo.classList.add('acesa', 'fala');
        var voz = criarVoz(h.titulo, h.fala, h.cor);
        requestAnimationFrame(function () { voz.classList.add('on'); });
        depois(tempoDeLeitura(h.fala), function () {
          voz.classList.remove('on');
          c.grupo.classList.remove('fala');
          depois(1200, function () { voz.remove(); });
        });
      });
      t += tempoDeLeitura(h.fala) + 2000;
    });

    // 3. As constelações se unem
    var ligacoes = [];
    if (cons.length > 1) {
      var pares = cons.length === 2 ? 1 : cons.length;
      for (var p = 0; p < pares; p++) {
        ligacoes.push([cons[p], cons[(p + 1) % cons.length]]);
      }
    }
    function estrelaMaisPerto(c, alvo) {
      var melhor = c.pontos[0], menor = Infinity;
      c.pontos.forEach(function (pt) {
        var d = Math.pow(pt.x - alvo.x, 2) + Math.pow(pt.y - alvo.y, 2);
        if (d < menor) { menor = d; melhor = pt; }
      });
      return melhor;
    }
    ligacoes.forEach(function (par, k) {
      var de = estrelaMaisPerto(par[0], par[1].ancora);
      var para = estrelaMaisPerto(par[1], par[0].ancora);
      var idGrad = 'ma-grad-' + k;
      var grad = svg('linearGradient', { id: idGrad, gradientUnits: 'userSpaceOnUse', x1: numero(de.x), y1: numero(de.y), x2: numero(para.x), y2: numero(para.y) });
      grad.appendChild(svg('stop', { offset: '0', 'stop-color': par[0].cor }));
      grad.appendChild(svg('stop', { offset: '1', 'stop-color': par[1].cor }));
      defs.appendChild(grad);
      var elo = svg('line', {
        'class': 'ma-elo', pathLength: '1',
        x1: numero(de.x), y1: numero(de.y), x2: numero(para.x), y2: numero(para.y),
        stroke: 'url(#' + idGrad + ')', 'stroke-width': '1.6', 'stroke-linecap': 'round'
      });
      conjunto.appendChild(elo);
      depois(t + k * 900, function () { elo.classList.add('on'); });
    });
    var tempoElos = Math.max(1600, ligacoes.length * 900 + 1500);
    depois(t + tempoElos, function () {
      conjunto.classList.add('unido');
      tela.classList.add('unido');
    });
    t += tempoElos + 800;

    // 4. A luz reacende o Nexus: frase final + botão
    var nucleo = el('div', 'ma-nucleo');
    tela.insertBefore(nucleo, ceu);
    var final = el('div', 'ma-final');
    var vozFinal = el('div', 'ma-voz-fala', FALA_FINAL);
    vozFinal.setAttribute('data-t', FALA_FINAL);
    vozFinal.style.color = COR_FINAL;
    final.appendChild(vozFinal);
    var botao = el('button', 'ma-botao', 'Reacender o Nexus');
    botao.type = 'button';
    final.appendChild(botao);
    tela.appendChild(final);
    var flash = el('div', 'ma-flash');
    tela.appendChild(flash);

    depois(t, function () { nucleo.classList.add('on'); final.classList.add('on'); });
    depois(t + 2600, function () { botao.classList.add('on'); try { botao.focus({ preventScroll: true }); } catch (e) {} });

    var usado = false;
    botao.addEventListener('click', function () {
      if (usado) return;
      usado = true;
      botao.disabled = true;
      timers.forEach(clearTimeout);
      if (!previaCoro) restaurarNexus();
      flash.classList.add('on');
      setTimeout(function () { location.replace(urlSemParametrosDePrevia()); }, 1400);
    });
  }

  window.NexusMalikApagarDeVez = function () {
    try { localStorage.setItem(CHAVE, new Date().toISOString()); } catch (e) {}
    mostrarTelaApagada();
  };

  // ═══ Decisão inicial (roda antes do iframe carregar) ═══
  var apagadoDesde = null;
  try { apagadoDesde = localStorage.getItem(CHAVE); } catch (e) {}

  var frame = document.getElementById('nexusFrame');

  if (!apagadoDesde && !previaCoro) {
    limparRestosDoEventoAntigo();
    if (frame) {
      var alvo = frame.getAttribute('data-src');
      if (alvo) frame.src = alvo;
    }
    return;
  }

  mostrarTelaApagada();
})();