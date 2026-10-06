(function () {
  'use strict';

  var PASTA_ARENA = 'Assets/arena/';
  var PASTA_MALIK = 'Assets/malik/';
  var PASTA_LEYN = 'Assets/leyn/';
  var OURO = '#C4A35A';
  var VERMELHO = '#ff2b3a';
  var TOTAL_ROUNDS = 3;

  var LEYN_IDLE_QUADROS = 5;
  var LEYN_IDLE_LARG_NATURAL = 1700;
  var LEYN_IDLE_ALT_NATURAL = 660;

  var MALIK_IDLE_QUADROS = 5;
  var MALIK_IDLE_LARG_NATURAL = 1425;
  var MALIK_IDLE_ALT_NATURAL = 690;

  var MALIK_CAMINHADA_QUADROS = 5;
  var MALIK_CAMINHADA_LARG_NATURAL = 1950;
  var MALIK_CAMINHADA_ALT_NATURAL = 604;
  var MALIK_CAMINHADA_MS_POR_QUADRO = 190;

  var MALIK_GESTOS_QUADROS = 5;
  var MALIK_GESTOS_LARG_NATURAL = 2100;
  var MALIK_GESTOS_ALT_NATURAL = 675;
  var MALIK_GESTOS_ALT_CORPO = 632;
  var MALIK_GESTO_DURACAO_MIN_MS = 1300;
  var MALIK_GESTO_DURACAO_MAX_MS = 2000;

  var LEYN_SOCO_DIM = [[301, 457], [352, 468], [462, 451], [458, 457], [347, 462]];
  var MALIK_MIRA_DIM = [[331, 559], [351, 542], [366, 520], [433, 561], [366, 684]];
  var MALIK_VORTICE_DIM = [[297, 578], [361, 545], [352, 550], [438, 600], [415, 637]];

  var VELOCIDADE_MOVIMENTO = 260;
  var GRAVIDADE = 2200;
  var VELOCIDADE_PULO = 840;
  var ESCALA_ABAIXADO = 0.72;

  var LEYN_GOLPES = {
    j: { msPorQuadro: 140, dano: 0.06 },
    k: { msPorQuadro: 180, dano: 0.10 },
    l: { msPorQuadro: 230, dano: 0.15 }
  };
  var LEYN_GOLPE_QUADRO_ATIVO_MIN = 2;
  var LEYN_GOLPE_QUADRO_ATIVO_MAX = 3;
  var LEYN_GOLPE_ALCANCE_PX = 90;

  var MALIK_ATAQUE_VORTICE = { pasta: 'malik-gesto-vortice-', dim: MALIK_VORTICE_DIM, msPorQuadro: 190, dano: 0.09, alcancePx: 130, distanciaMaxPx: 210 };
  var MALIK_ATAQUE_MIRA = { pasta: 'malik-gesto-mira-', dim: MALIK_MIRA_DIM, msPorQuadro: 190, dano: 0.09, alcancePx: 260, distanciaMaxPx: 380 };
  var MALIK_ATAQUE_QUADRO_ATIVO_MIN = 3;
  var MALIK_ATAQUE_QUADRO_ATIVO_MAX = 4;
  var MALIK_ATAQUE_COOLDOWN_MS = 1400;
  var MALIK_ATAQUE_CHANCE = 0.55;

  var FRACAO_DANO_BLOQUEADO = 0.2;

  var VELOCIDADE_MOVIMENTO_MALIK = 200;
  var IA_MALIK_DISTANCIA_MIN_PX = 150;
  var IA_MALIK_DISTANCIA_MAX_PX = 320;
  var IA_MALIK_DECISAO_MIN_MS = 550;
  var IA_MALIK_DECISAO_MAX_MS = 950;
  var IA_MALIK_CHANCE_HESITAR = 0.2;

  var modoTeste = /[?&]malikTeste=1\b/.test(location.search);

  function el(tag, css, texto) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  function reduzMovimento() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  function corDaVida(percentual) {
    if (percentual > 0.5) return '#5CDB6A';
    if (percentual > 0.25) return '#E8C13A';
    return VERMELHO;
  }

  function montarPainelLutador(lado, nomeExibido, corVidaInicial) {
    var ehEsquerda = lado === 'esquerda';
    var painel = el('div',
      'position:absolute;top:16px;' + (ehEsquerda ? 'left:16px;' : 'right:16px;') +
      'display:flex;align-items:flex-start;gap:10px;' + (ehEsquerda ? '' : 'flex-direction:row-reverse;') +
      'z-index:2;width:min(46vw,320px);'
    );

    var retratoWrap = el('div',
      'width:54px;height:54px;flex-shrink:0;border:2px solid ' + OURO + ';border-radius:6px;' +
      'background:#0b0710;overflow:hidden;box-shadow:0 0 14px rgba(196,163,90,.5);' +
      'opacity:0;transform:scale(.4);transition:opacity .6s ease,transform .6s cubic-bezier(.2,.8,.2,1);'
    );
    var retratoImg = el('img', 'width:100%;height:100%;object-fit:cover;object-position:top center;');
    retratoImg.alt = nomeExibido;
    retratoImg.onerror = function () { retratoWrap.style.visibility = 'hidden'; };
    retratoWrap.appendChild(retratoImg);

    var coluna = el('div', 'display:flex;flex-direction:column;gap:4px;flex:1;min-width:0;' + (ehEsquerda ? '' : 'align-items:flex-end;'));

    var linhaTopo = el('div', 'display:flex;align-items:center;gap:8px;width:100%;' + (ehEsquerda ? '' : 'flex-direction:row-reverse;'));
    var nomeEl = el('div',
      'font-family:Georgia,"Cormorant Garamond",serif;font-size:12px;letter-spacing:.14em;' +
      'color:#E8E0D0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
      nomeExibido
    );
    var roundsEl = el('div', 'display:flex;gap:4px;margin-' + (ehEsquerda ? 'left' : 'right') + ':auto;');
    linhaTopo.appendChild(nomeEl);
    linhaTopo.appendChild(roundsEl);

    var barraFundo = el('div',
      'width:100%;height:14px;background:#1a1015;border:1px solid rgba(232,224,208,.35);' +
      'border-radius:3px;overflow:hidden;box-shadow:inset 0 0 6px rgba(0,0,0,.6);'
    );
    var barraVida = el('div',
      'height:100%;width:0%;background:' + corVidaInicial + ';' +
      'transition:width .6s ease,background-color .4s ease;' + (ehEsquerda ? '' : 'margin-left:auto;')
    );
    barraFundo.appendChild(barraVida);

    coluna.appendChild(linhaTopo);
    coluna.appendChild(barraFundo);

    if (ehEsquerda) { painel.appendChild(retratoWrap); painel.appendChild(coluna); }
    else { painel.appendChild(coluna); painel.appendChild(retratoWrap); }

    return {
      painel: painel,
      retratoWrap: retratoWrap,
      retratoImg: retratoImg,
      marcarRounds: function (vencidos) {
        roundsEl.innerHTML = '';
        for (var i = 0; i < TOTAL_ROUNDS; i++) {
          roundsEl.appendChild(el('div',
            'width:8px;height:8px;border-radius:50%;border:1px solid ' + OURO + ';' +
            'background:' + (i < vencidos ? OURO : 'transparent') + ';'
          ));
        }
      },
      revelar: function () {
        requestAnimationFrame(function () {
          retratoWrap.style.opacity = '1';
          retratoWrap.style.transform = 'scale(1)';
        });
      },
      definirVida: function (percentual) {
        percentual = Math.max(0, Math.min(1, percentual));
        barraVida.style.width = (percentual * 100) + '%';
        barraVida.style.background = corDaVida(percentual);
      }
    };
  }

  function montarTimer() {
    return el('div',
      'position:absolute;top:12px;left:50%;transform:translateX(-50%);' +
      'font-family:Consolas,monospace;font-size:26px;font-weight:bold;color:#E8E0D0;' +
      'text-shadow:0 0 10px rgba(0,0,0,.9),0 0 16px rgba(196,163,90,.5);z-index:2;' +
      'opacity:0;transition:opacity .8s ease;',
      '99'
    );
  }

  function mostrarAvisoRound(arena, texto, duracaoMs) {
    var aviso = el('div',
      'position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);z-index:3;' +
      'font-family:Georgia,"Cormorant Garamond",serif;font-size:22px;letter-spacing:.2em;' +
      'text-align:center;color:#E8C97A;text-shadow:0 0 10px rgba(255,43,58,.7),0 0 24px rgba(196,163,90,.6);' +
      'opacity:0;transition:opacity .5s ease;',
      texto
    );
    arena.appendChild(aviso);
    requestAnimationFrame(function () { aviso.style.opacity = '1'; });
    setTimeout(function () {
      aviso.style.opacity = '0';
      setTimeout(function () { aviso.remove(); }, 600);
    }, duracaoMs || 1600);
    return aviso;
  }

  function sacudirTela(elemento, duracaoMs, forcaPx) {
    var inicio = null;
    function quadro(agora) {
      if (inicio === null) inicio = agora;
      var decorrido = agora - inicio;
      var progresso = Math.min(1, decorrido / duracaoMs);
      if (progresso >= 1) { elemento.style.transform = ''; return; }
      var atenuacao = 1 - progresso;
      var dx = (Math.random() * 2 - 1) * forcaPx * atenuacao;
      var dy = (Math.random() * 2 - 1) * forcaPx * atenuacao * 0.6;
      elemento.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
      requestAnimationFrame(quadro);
    }
    requestAnimationFrame(quadro);
  }

  var GESTO_MALIK_ARQUIVOS = 5;
  var GESTO_MALIK_MS_POR_QUADRO = 220;
  function tocarAberturaArena(fundo, arena, daquiA, offsetBase, aoTerminar) {
    var img = el('img',
      'position:absolute;right:6%;bottom:4%;max-height:66%;max-width:50%;width:auto;height:auto;' +
      'opacity:0;transition:opacity .25s ease;filter:drop-shadow(0 0 30px rgba(255,43,58,.55));z-index:2;'
    );
    arena.appendChild(img);

    function nomeQuadro(n) { return PASTA_MALIK + 'malik-gesto-erguer-0' + n + '.png'; }

    for (var n = 1; n <= GESTO_MALIK_ARQUIVOS; n++) {
      (function (n, atraso) {
        daquiA(offsetBase + atraso, function () {
          img.src = nomeQuadro(n);
          img.style.opacity = '1';
        });
      })(n, (n - 1) * GESTO_MALIK_MS_POR_QUADRO);
    }

    var tImpacto = offsetBase + (GESTO_MALIK_ARQUIVOS - 1) * GESTO_MALIK_MS_POR_QUADRO;
    var duracaoTremor = 450;

    daquiA(tImpacto, function () {
      sacudirTela(fundo, duracaoTremor, 14);
    });
    daquiA(tImpacto + 260, function () {
      img.style.opacity = '0';
      setTimeout(function () { img.remove(); }, 260);
    });
    daquiA(tImpacto + 380, function () {
      var cenarioAnimado = el('iframe', 'position:absolute;inset:0;width:100%;height:100%;border:0;pointer-events:none;');
      cenarioAnimado.setAttribute('title', 'Cenário do eclipse, animado');
      cenarioAnimado.src = 'cenario-eclipse-animado.html?ui=0';
      arena.insertBefore(cenarioAnimado, fundo.nextSibling);
    });
    daquiA(tImpacto + duracaoTremor + 120, function () {
      if (aoTerminar) aoTerminar();
    });
  }

  function mostrarQuadroAvulso(sprite, pasta, nomeBase, indice1based, dimensoesNaturais, alturaAlvo) {
    var dim = dimensoesNaturais[indice1based - 1];
    var escala = alturaAlvo / dim[1];
    var larguraEscalada = dim[0] * escala;
    sprite.style.backgroundImage = "url('" + pasta + nomeBase + (indice1based < 10 ? '0' + indice1based : indice1based) + ".png')";
    sprite.style.backgroundRepeat = 'no-repeat';
    sprite.style.backgroundPosition = '0 0';
    sprite.style.backgroundSize = larguraEscalada + 'px ' + alturaAlvo + 'px';
    sprite.style.width = larguraEscalada + 'px';
    sprite.style.height = alturaAlvo + 'px';
  }

  function tocarTiraComTempo(elemento, largQuadro, nQuadros, duracoesMs, reverso) {
    var indice = reverso ? nQuadros - 1 : 0;
    var ativo = true;
    var timerId = null;
    function mostrarQuadro() {
      if (!ativo) return;
      elemento.style.backgroundPositionX = (-largQuadro * indice) + 'px';
      timerId = setTimeout(function () {
        indice = reverso ? (indice - 1 + nQuadros) % nQuadros : (indice + 1) % nQuadros;
        mostrarQuadro();
      }, duracoesMs[indice % duracoesMs.length]);
    }
    mostrarQuadro();
    return { parar: function () { ativo = false; if (timerId) clearTimeout(timerId); } };
  }

  var LEYN_IDLE_DURACOES_MS = [820, 480, 540, 480, 660];
  var MALIK_IDLE_DURACOES_MS = [820, 480, 540, 480, 660];

  function prepararTiraLeynIdle(elemento, alturaAlvo) {
    var escala = alturaAlvo / LEYN_IDLE_ALT_NATURAL;
    var largEscalada = LEYN_IDLE_LARG_NATURAL * escala;
    var largQuadro = largEscalada / LEYN_IDLE_QUADROS;
    elemento.style.backgroundImage = "url('" + PASTA_LEYN + "leyn-idle.png')";
    elemento.style.backgroundRepeat = 'no-repeat';
    elemento.style.backgroundSize = largEscalada + 'px ' + alturaAlvo + 'px';
    elemento.style.backgroundPosition = '0 0';
    elemento.style.width = largQuadro + 'px';
    elemento.style.height = alturaAlvo + 'px';
    return tocarTiraComTempo(elemento, largQuadro, LEYN_IDLE_QUADROS, LEYN_IDLE_DURACOES_MS);
  }

  function montarLeynNaPista(pistaLuta) {
    var alturaAlvo = Math.min(window.innerHeight * 0.62, 620);
    var wrapper = el('div', 'position:absolute;left:14%;bottom:8%;opacity:0;transition:opacity 1s ease;');
    var sprite = el('div', 'filter:drop-shadow(0 10px 16px rgba(0,0,0,.65));transform:scaleX(-1);');
    wrapper.appendChild(sprite);
    pistaLuta.appendChild(wrapper);
    if (!reduzMovimento()) wrapper.controleIdle = prepararTiraLeynIdle(sprite, alturaAlvo);
    else {
      sprite.style.backgroundImage = "url('" + PASTA_LEYN + "leyn-idle.png')";
      sprite.style.backgroundRepeat = 'no-repeat';
      sprite.style.backgroundSize = (LEYN_IDLE_LARG_NATURAL * (alturaAlvo / LEYN_IDLE_ALT_NATURAL)) + 'px ' + alturaAlvo + 'px';
      sprite.style.width = (LEYN_IDLE_LARG_NATURAL / LEYN_IDLE_QUADROS * (alturaAlvo / LEYN_IDLE_ALT_NATURAL)) + 'px';
      sprite.style.height = alturaAlvo + 'px';
    }
    requestAnimationFrame(function () { wrapper.style.opacity = '1'; });
    wrapper.spriteEl = sprite;
    wrapper.alturaAlvo = alturaAlvo;
    return wrapper;
  }

  function prepararTiraMalikIdle(elemento, alturaAlvo) {
    var escala = alturaAlvo / MALIK_IDLE_ALT_NATURAL;
    var largEscalada = MALIK_IDLE_LARG_NATURAL * escala;
    var largQuadro = largEscalada / MALIK_IDLE_QUADROS;
    elemento.style.backgroundImage = "url('" + PASTA_MALIK + "malik-idle.png')";
    elemento.style.backgroundRepeat = 'no-repeat';
    elemento.style.backgroundSize = largEscalada + 'px ' + alturaAlvo + 'px';
    elemento.style.backgroundPosition = '0 0';
    elemento.style.width = largQuadro + 'px';
    elemento.style.height = alturaAlvo + 'px';
    elemento.style.marginLeft = '';
    elemento.style.marginRight = '';
    if (reduzMovimento()) return { parar: function () {} };
    return tocarTiraComTempo(elemento, largQuadro, MALIK_IDLE_QUADROS, MALIK_IDLE_DURACOES_MS);
  }

  function larguraQuadroIdleMalik(alturaAlvo) {
    return MALIK_IDLE_LARG_NATURAL / MALIK_IDLE_QUADROS * (alturaAlvo / MALIK_IDLE_ALT_NATURAL);
  }

  function centralizarSpriteMalik(elemento, largQuadro, alturaAlvo) {
    var m = (larguraQuadroIdleMalik(alturaAlvo) - largQuadro) / 2;
    elemento.style.marginLeft = m + 'px';
    elemento.style.marginRight = m + 'px';
  }

  function prepararTiraMalikCaminhada(elemento, alturaAlvo, reverso) {
    var escala = alturaAlvo / MALIK_CAMINHADA_ALT_NATURAL;
    var largEscalada = MALIK_CAMINHADA_LARG_NATURAL * escala;
    var largQuadro = largEscalada / MALIK_CAMINHADA_QUADROS;
    elemento.style.backgroundImage = "url('" + PASTA_MALIK + "malik-caminhada.png')";
    elemento.style.backgroundRepeat = 'no-repeat';
    elemento.style.backgroundSize = largEscalada + 'px ' + alturaAlvo + 'px';
    elemento.style.backgroundPosition = '0 0';
    elemento.style.width = largQuadro + 'px';
    elemento.style.height = alturaAlvo + 'px';
    centralizarSpriteMalik(elemento, largQuadro, alturaAlvo);
    if (reduzMovimento()) return { parar: function () {} };
    return tocarTiraComTempo(elemento, largQuadro, MALIK_CAMINHADA_QUADROS, [MALIK_CAMINHADA_MS_POR_QUADRO], reverso);
  }

  function mostrarGestoMalik(elemento, alturaAlvo, indice) {
    var escala = alturaAlvo / MALIK_GESTOS_ALT_CORPO;
    var largEscalada = MALIK_GESTOS_LARG_NATURAL * escala;
    var altCanvas = MALIK_GESTOS_ALT_NATURAL * escala;
    var largQuadro = largEscalada / MALIK_GESTOS_QUADROS;
    elemento.style.backgroundImage = "url('" + PASTA_MALIK + "malik-gestos.png')";
    elemento.style.backgroundRepeat = 'no-repeat';
    elemento.style.backgroundSize = largEscalada + 'px ' + altCanvas + 'px';
    elemento.style.backgroundPosition = (-largQuadro * indice) + 'px 0';
    elemento.style.width = largQuadro + 'px';
    elemento.style.height = altCanvas + 'px';
    centralizarSpriteMalik(elemento, largQuadro, alturaAlvo);
    return { parar: function () {} };
  }

  function montarMalikNaPista(pistaLuta) {
    var alturaAlvo = Math.min(window.innerHeight * 0.62, 620);
    var wrapper = el('div', 'position:absolute;right:14%;bottom:8%;opacity:0;transition:opacity 1s ease;');
    var sprite = el('div', 'filter:drop-shadow(0 10px 16px rgba(255,43,58,.3));transform:scaleX(-1);');
    wrapper.appendChild(sprite);
    pistaLuta.appendChild(wrapper);
    if (!reduzMovimento()) wrapper.controleIdle = prepararTiraMalikIdle(sprite, alturaAlvo);
    else {
      sprite.style.backgroundImage = "url('" + PASTA_MALIK + "malik-idle.png')";
      sprite.style.backgroundRepeat = 'no-repeat';
      sprite.style.backgroundSize = (MALIK_IDLE_LARG_NATURAL * (alturaAlvo / MALIK_IDLE_ALT_NATURAL)) + 'px ' + alturaAlvo + 'px';
      sprite.style.width = (MALIK_IDLE_LARG_NATURAL / MALIK_IDLE_QUADROS * (alturaAlvo / MALIK_IDLE_ALT_NATURAL)) + 'px';
      sprite.style.height = alturaAlvo + 'px';
    }
    requestAnimationFrame(function () { wrapper.style.opacity = '1'; });
    wrapper.spriteEl = sprite;
    wrapper.alturaAlvo = alturaAlvo;
    return wrapper;
  }

  var TECLAS_CONTROLADAS = { a: 1, d: 1, w: 1, s: 1, j: 1, k: 1, l: 1, u: 1, i: 1, o: 1, enter: 1 };

  function iniciarMovimentoLeyn(pistaLuta, leynEl, malikEl, teclas, opcoes) {
    if (!pistaLuta || !leynEl) return { parar: function () {}, estaBloqueando: function () { return false; } };
    opcoes = opcoes || {};

    leynEl.style.transformOrigin = 'bottom center';
    var sprite = leynEl.spriteEl || null;
    var olhandoDireita = true;

    teclas = teclas || {};
    function aoKeyDown(e) {
      var t = (e.key || '').toLowerCase();
      if (!TECLAS_CONTROLADAS[t]) return;
      teclas[t] = true;
      e.preventDefault();
    }
    function aoKeyUp(e) {
      var t = (e.key || '').toLowerCase();
      if (!TECLAS_CONTROLADAS[t]) return;
      teclas[t] = false;
    }
    document.addEventListener('keydown', aoKeyDown);
    document.addEventListener('keyup', aoKeyUp);

    var xInicialPx = null;
    var deslocamentoX = 0;
    var alturaPulo = 0;
    var velocidadeY = 0;
    var noChao = true;
    var ultimoTempo = null;
    var ativo = true;

    var teclasAnteriores = { j: false, k: false, l: false };
    var atacando = false;
    var golpeAtual = null;
    var tempoInicioGolpe = 0;
    var quadroGolpeAtual = -1;
    var jaAcertouEsseGolpe = false;

    function atualizarFace() {
      if (!sprite || !malikEl) return;
      var retLeyn = leynEl.getBoundingClientRect();
      var retMalik = malikEl.getBoundingClientRect();
      var deveOlharDireita = (retMalik.left + retMalik.width / 2) >= (retLeyn.left + retLeyn.width / 2);
      if (deveOlharDireita !== olhandoDireita) {
        olhandoDireita = deveOlharDireita;
        sprite.style.transform = olhandoDireita ? 'scaleX(-1)' : 'scaleX(1)';
      }
    }

    function transformSocoParaFace() {
      return olhandoDireita ? 'scaleX(1)' : 'scaleX(-1)';
    }

    function iniciarGolpe(tecla, agora) {
      atacando = true;
      golpeAtual = tecla;
      tempoInicioGolpe = agora;
      quadroGolpeAtual = -1;
      jaAcertouEsseGolpe = false;
      if (leynEl.controleIdle) { leynEl.controleIdle.parar(); leynEl.controleIdle = null; }
      if (sprite) sprite.style.transform = transformSocoParaFace();
    }

    function terminarGolpe() {
      atacando = false;
      golpeAtual = null;
      if (sprite && leynEl.alturaAlvo) {
        leynEl.controleIdle = prepararTiraLeynIdle(sprite, leynEl.alturaAlvo);
        sprite.style.transform = olhandoDireita ? 'scaleX(-1)' : 'scaleX(1)';
      }
    }

    function hitboxGolpe() {
      var r = leynEl.getBoundingClientRect();
      return olhandoDireita
        ? { left: r.right, right: r.right + LEYN_GOLPE_ALCANCE_PX, top: r.top, bottom: r.bottom }
        : { left: r.left - LEYN_GOLPE_ALCANCE_PX, right: r.left, top: r.top, bottom: r.bottom };
    }
    function sobrepoe(a, b) {
      return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    }

    function quadro(agora) {
      if (!ativo) return;
      if (xInicialPx === null) {
        var retLeyn = leynEl.getBoundingClientRect();
        var retPista = pistaLuta.getBoundingClientRect();
        xInicialPx = retLeyn.left - retPista.left;
      }
      if (ultimoTempo === null) ultimoTempo = agora;
      var dt = Math.min((agora - ultimoTempo) / 1000, 0.05);
      ultimoTempo = agora;

      if (!atacando && noChao && !teclas.s) {
        if (teclas.j && !teclasAnteriores.j) iniciarGolpe('j', agora);
        else if (teclas.k && !teclasAnteriores.k) iniciarGolpe('k', agora);
        else if (teclas.l && !teclasAnteriores.l) iniciarGolpe('l', agora);
      }
      teclasAnteriores.j = !!teclas.j;
      teclasAnteriores.k = !!teclas.k;
      teclasAnteriores.l = !!teclas.l;

      if (atacando) {
        var golpeInfo = LEYN_GOLPES[golpeAtual];
        var decorrido = agora - tempoInicioGolpe;
        var indiceQuadro = Math.min(4, Math.floor(decorrido / golpeInfo.msPorQuadro));
        if (indiceQuadro !== quadroGolpeAtual) {
          quadroGolpeAtual = indiceQuadro;
          if (sprite && leynEl.alturaAlvo) mostrarQuadroAvulso(sprite, PASTA_LEYN, 'leyn-soco-', quadroGolpeAtual + 1, LEYN_SOCO_DIM, leynEl.alturaAlvo);
        }
        if (!jaAcertouEsseGolpe && malikEl &&
            quadroGolpeAtual >= LEYN_GOLPE_QUADRO_ATIVO_MIN && quadroGolpeAtual <= LEYN_GOLPE_QUADRO_ATIVO_MAX &&
            sobrepoe(hitboxGolpe(), malikEl.getBoundingClientRect())) {
          jaAcertouEsseGolpe = true;
          if (opcoes.aoAcertarMalik) opcoes.aoAcertarMalik(golpeInfo.dano);
        }
        if (decorrido >= golpeInfo.msPorQuadro * 5) terminarGolpe();
      }

      var abaixado = !atacando && !!teclas.s && noChao;

      if (!abaixado && !atacando) {
        var dx = 0;
        if (teclas.a) dx -= 1;
        if (teclas.d) dx += 1;
        deslocamentoX += dx * VELOCIDADE_MOVIMENTO * dt;

        var larguraPista = pistaLuta.getBoundingClientRect().width;
        var margemPx = 24;
        var minX = margemPx - xInicialPx;
        var maxX = (larguraPista - margemPx) - xInicialPx;
        if (deslocamentoX < minX) deslocamentoX = minX;
        if (deslocamentoX > maxX) deslocamentoX = maxX;

        if (teclas.w && noChao) {
          velocidadeY = VELOCIDADE_PULO;
          noChao = false;
        }
      }

      if (!noChao) {
        velocidadeY -= GRAVIDADE * dt;
        alturaPulo += velocidadeY * dt;
        if (alturaPulo <= 0) {
          alturaPulo = 0;
          velocidadeY = 0;
          noChao = true;
        }
      }

      var escalaY = abaixado ? ESCALA_ABAIXADO : 1;
      leynEl.style.transform = 'translate(' + deslocamentoX + 'px,' + (-alturaPulo) + 'px) scaleY(' + escalaY + ')';
      if (!atacando) atualizarFace();

      requestAnimationFrame(quadro);
    }
    requestAnimationFrame(quadro);

    return {
      parar: function () {
        ativo = false;
        document.removeEventListener('keydown', aoKeyDown);
        document.removeEventListener('keyup', aoKeyUp);
      },
      estaBloqueando: function () {
        return olhandoDireita ? !!teclas.a : !!teclas.d;
      }
    };
  }

  function iniciarIAMalik(pistaLuta, malikEl, leynEl, opcoes) {
    if (!pistaLuta || !malikEl || !leynEl) return { parar: function () {} };
    opcoes = opcoes || {};

    malikEl.style.transformOrigin = 'bottom center';
    var sprite = malikEl.spriteEl || null;
    var olhandoEsquerda = true;

    var xInicialPx = null;
    var deslocamentoX = 0;
    var direcaoAtual = 0;
    var ultimoTempo = null;
    var proximaDecisaoEm = 0;
    var ativo = true;

    var atacando = false;
    var ataqueAtual = null;
    var tempoInicioAtaque = 0;
    var quadroAtaqueAtual = -1;
    var jaAcertouEsseAtaque = false;
    var proximoAtaquePermitidoEm = 0;

    var estadoVisual = 'idle';
    var gestoAte = 0;
    var gestoIndice = 0;
    var ultimoGesto = -1;

    function atualizarFace() {
      if (!sprite) return;
      var retMalik = malikEl.getBoundingClientRect();
      var retLeyn = leynEl.getBoundingClientRect();
      var deveOlharEsquerda = (retLeyn.left + retLeyn.width / 2) <= (retMalik.left + retMalik.width / 2);
      if (deveOlharEsquerda !== olhandoEsquerda) {
        olhandoEsquerda = deveOlharEsquerda;
        sprite.style.transform = olhandoEsquerda ? 'scaleX(-1)' : 'scaleX(1)';
      }
    }

    function iniciarAtaque(info, agora) {
      atacando = true;
      ataqueAtual = info;
      tempoInicioAtaque = agora;
      quadroAtaqueAtual = -1;
      jaAcertouEsseAtaque = false;
      direcaoAtual = 0;
      proximoAtaquePermitidoEm = agora + MALIK_ATAQUE_COOLDOWN_MS;
      estadoVisual = 'ataque';
      gestoAte = 0;
      if (malikEl.controleIdle) { malikEl.controleIdle.parar(); malikEl.controleIdle = null; }
      if (sprite) {
        sprite.style.marginLeft = '';
        sprite.style.marginRight = '';
        sprite.style.transform = olhandoEsquerda ? 'scaleX(-1)' : 'scaleX(1)';
      }
    }

    function terminarAtaque() {
      atacando = false;
      ataqueAtual = null;
      estadoVisual = 'idle';
      if (sprite && malikEl.alturaAlvo) {
        malikEl.controleIdle = prepararTiraMalikIdle(sprite, malikEl.alturaAlvo);
        sprite.style.transform = olhandoEsquerda ? 'scaleX(-1)' : 'scaleX(1)';
      }
    }

    function iniciarGesto(agora) {
      var indice;
      do { indice = Math.floor(Math.random() * MALIK_GESTOS_QUADROS); } while (indice === ultimoGesto);
      ultimoGesto = indice;
      gestoIndice = indice;
      gestoAte = agora + MALIK_GESTO_DURACAO_MIN_MS + Math.random() * (MALIK_GESTO_DURACAO_MAX_MS - MALIK_GESTO_DURACAO_MIN_MS);
    }

    function atualizarVisual(agora) {
      if (gestoAte && agora >= gestoAte) gestoAte = 0;
      var desejado;
      if (gestoAte) desejado = 'gesto' + gestoIndice;
      else if (direcaoAtual !== 0) desejado = ((direcaoAtual < 0) === olhandoEsquerda) ? 'andar' : 'recuar';
      else desejado = 'idle';
      if (desejado === estadoVisual) return;
      estadoVisual = desejado;
      if (!sprite || !malikEl.alturaAlvo) return;
      if (malikEl.controleIdle) { malikEl.controleIdle.parar(); malikEl.controleIdle = null; }
      var alt = malikEl.alturaAlvo;
      if (desejado === 'andar') malikEl.controleIdle = prepararTiraMalikCaminhada(sprite, alt, false);
      else if (desejado === 'recuar') malikEl.controleIdle = prepararTiraMalikCaminhada(sprite, alt, true);
      else if (desejado === 'idle') malikEl.controleIdle = prepararTiraMalikIdle(sprite, alt);
      else malikEl.controleIdle = mostrarGestoMalik(sprite, alt, gestoIndice);
    }

    function hitboxAtaque() {
      var r = malikEl.getBoundingClientRect();
      return olhandoEsquerda
        ? { left: r.left - ataqueAtual.alcancePx, right: r.left, top: r.top, bottom: r.bottom }
        : { left: r.right, right: r.right + ataqueAtual.alcancePx, top: r.top, bottom: r.bottom };
    }
    function sobrepoe(a, b) {
      return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    }

    function decidir(agora) {
      proximaDecisaoEm = agora + IA_MALIK_DECISAO_MIN_MS + Math.random() * (IA_MALIK_DECISAO_MAX_MS - IA_MALIK_DECISAO_MIN_MS);
      if (atacando) return;

      var retMalik = malikEl.getBoundingClientRect();
      var retLeyn = leynEl.getBoundingClientRect();
      var centroMalik = retMalik.left + retMalik.width / 2;
      var centroLeyn = retLeyn.left + retLeyn.width / 2;
      var distancia = Math.abs(centroMalik - centroLeyn);
      var leynEstaEsquerda = centroLeyn < centroMalik;

      if (agora >= proximoAtaquePermitidoEm && Math.random() < MALIK_ATAQUE_CHANCE) {
        if (distancia <= MALIK_ATAQUE_VORTICE.distanciaMaxPx) { iniciarAtaque(MALIK_ATAQUE_VORTICE, agora); return; }
        if (distancia <= MALIK_ATAQUE_MIRA.distanciaMaxPx) { iniciarAtaque(MALIK_ATAQUE_MIRA, agora); return; }
      }

      if (gestoAte && agora < gestoAte) { direcaoAtual = 0; return; }

      if (Math.random() < IA_MALIK_CHANCE_HESITAR) {
        direcaoAtual = 0;
        if (distancia >= IA_MALIK_DISTANCIA_MIN_PX) iniciarGesto(agora);
        return;
      }

      if (distancia > IA_MALIK_DISTANCIA_MAX_PX) {
        direcaoAtual = leynEstaEsquerda ? -1 : 1;
      } else if (distancia < IA_MALIK_DISTANCIA_MIN_PX) {
        direcaoAtual = leynEstaEsquerda ? 1 : -1;
      } else {
        direcaoAtual = 0;
      }
    }

    function quadro(agora) {
      if (!ativo) return;
      if (xInicialPx === null) {
        var retMalik = malikEl.getBoundingClientRect();
        var retPista = pistaLuta.getBoundingClientRect();
        xInicialPx = retMalik.left - retPista.left;
        proximaDecisaoEm = agora;
      }
      if (ultimoTempo === null) ultimoTempo = agora;
      var dt = Math.min((agora - ultimoTempo) / 1000, 0.05);
      ultimoTempo = agora;

      if (agora >= proximaDecisaoEm) decidir(agora);

      if (atacando) {
        var decorrido = agora - tempoInicioAtaque;
        var indiceQuadro = Math.min(4, Math.floor(decorrido / ataqueAtual.msPorQuadro));
        if (indiceQuadro !== quadroAtaqueAtual) {
          quadroAtaqueAtual = indiceQuadro;
          if (sprite && malikEl.alturaAlvo) mostrarQuadroAvulso(sprite, PASTA_MALIK, ataqueAtual.pasta, quadroAtaqueAtual + 1, ataqueAtual.dim, malikEl.alturaAlvo);
        }
        if (!jaAcertouEsseAtaque &&
            quadroAtaqueAtual >= MALIK_ATAQUE_QUADRO_ATIVO_MIN && quadroAtaqueAtual <= MALIK_ATAQUE_QUADRO_ATIVO_MAX &&
            sobrepoe(hitboxAtaque(), leynEl.getBoundingClientRect())) {
          jaAcertouEsseAtaque = true;
          var bloqueado = !!(opcoes.estaLeynBloqueando && opcoes.estaLeynBloqueando());
          var dano = ataqueAtual.dano * (bloqueado ? FRACAO_DANO_BLOQUEADO : 1);
          if (opcoes.aoAcertarLeyn) opcoes.aoAcertarLeyn(dano, bloqueado);
        }
        if (decorrido >= ataqueAtual.msPorQuadro * 5) terminarAtaque();
      } else {
        deslocamentoX += direcaoAtual * VELOCIDADE_MOVIMENTO_MALIK * dt;

        var larguraPista = pistaLuta.getBoundingClientRect().width;
        var margemPx = 24;
        var minX = margemPx - xInicialPx;
        var maxX = (larguraPista - margemPx) - xInicialPx;
        if (deslocamentoX < minX) deslocamentoX = minX;
        if (deslocamentoX > maxX) deslocamentoX = maxX;
      }

      malikEl.style.transform = 'translate(' + deslocamentoX + 'px,0)';
      if (!atacando) {
        atualizarFace();
        atualizarVisual(agora);
      }

      requestAnimationFrame(quadro);
    }
    requestAnimationFrame(quadro);

    return { parar: function () { ativo = false; } };
  }

  function ehTelaTocavel() {
    return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  }
  function orientacaoRetrato() {
    return window.innerHeight > window.innerWidth;
  }

  function mostrarAvisoGirar(aoGirar) {
    if (!document.getElementById('malik-girar-css')) {
      var estilo = el('style'); estilo.id = 'malik-girar-css';
      estilo.textContent = '@keyframes malikGirarTelefone{0%,100%{transform:rotate(0deg);}50%{transform:rotate(-90deg);}}';
      document.head.appendChild(estilo);
    }
    var overlay = el('div',
      'position:fixed;inset:0;z-index:700100;background:#050107;display:flex;' +
      'flex-direction:column;align-items:center;justify-content:center;gap:18px;' +
      'font-family:Georgia,"Cormorant Garamond",serif;color:#E8E0D0;text-align:center;padding:0 24px;'
    );
    overlay.appendChild(el('div', 'font-size:44px;animation:malikGirarTelefone 1.6s ease-in-out infinite;', '📱'));
    overlay.appendChild(el('div', 'font-size:15px;letter-spacing:.05em;max-width:280px;', 'Gire o aparelho pra modo paisagem pra continuar a luta'));
    document.body.appendChild(overlay);

    var jaChamou = false, ativo = true;
    function checar() {
      if (!ativo) return;
      if (!orientacaoRetrato()) {
        overlay.style.display = 'none';
        if (!jaChamou) { jaChamou = true; aoGirar(); }
      } else {
        overlay.style.display = 'flex';
      }
    }
    checar();
    window.addEventListener('resize', checar);
    window.addEventListener('orientationchange', checar);
    return {
      parar: function () {
        ativo = false;
        window.removeEventListener('resize', checar);
        window.removeEventListener('orientationchange', checar);
        if (overlay.parentNode) overlay.remove();
      }
    };
  }

  function montarControlesTouch(arena, teclas) {
    var raiz = el('div', 'position:absolute;inset:0;z-index:3;pointer-events:none;');

    function botao(css, rotulo) {
      return el('div',
        'position:absolute;display:flex;align-items:center;justify-content:center;' +
        'border-radius:50%;border:1px solid rgba(232,224,208,.5);background:rgba(20,14,24,.55);' +
        'color:#E8E0D0;font-family:Consolas,monospace;font-weight:bold;user-select:none;' +
        '-webkit-user-select:none;pointer-events:auto;touch-action:none;' + css,
        rotulo
      );
    }
    function ligar(elemento, tecla) {
      function ativar(e) { teclas[tecla] = true; elemento.style.background = 'rgba(196,163,90,.55)'; if (e) e.preventDefault(); }
      function desativar(e) { teclas[tecla] = false; elemento.style.background = 'rgba(20,14,24,.55)'; if (e) e.preventDefault(); }
      elemento.addEventListener('touchstart', ativar, { passive: false });
      elemento.addEventListener('touchend', desativar, { passive: false });
      elemento.addEventListener('touchcancel', desativar, { passive: false });
    }

    var TAM_DPAD = 54, GAP_DPAD = 4;
    var dcima = botao('width:' + TAM_DPAD + 'px;height:' + TAM_DPAD + 'px;left:' + (24 + TAM_DPAD + GAP_DPAD) + 'px;bottom:' + (24 + TAM_DPAD + GAP_DPAD) + 'px;font-size:20px;', '▲');
    var dbaixo = botao('width:' + TAM_DPAD + 'px;height:' + TAM_DPAD + 'px;left:' + (24 + TAM_DPAD + GAP_DPAD) + 'px;bottom:24px;font-size:20px;', '▼');
    var desquerda = botao('width:' + TAM_DPAD + 'px;height:' + TAM_DPAD + 'px;left:24px;bottom:' + (24 + (TAM_DPAD + GAP_DPAD) / 2) + 'px;font-size:20px;', '◀');
    var ddireita = botao('width:' + TAM_DPAD + 'px;height:' + TAM_DPAD + 'px;left:' + (24 + (TAM_DPAD + GAP_DPAD) * 2) + 'px;bottom:' + (24 + (TAM_DPAD + GAP_DPAD) / 2) + 'px;font-size:20px;', '▶');
    ligar(dcima, 'w'); ligar(dbaixo, 's'); ligar(desquerda, 'a'); ligar(ddireita, 'd');
    [dcima, dbaixo, desquerda, ddireita].forEach(function (b) { raiz.appendChild(b); });

    var TAM_GOLPE = 46, GAP_GOLPE = 8;
    var golpes = [
      { tecla: 'j', rotulo: 'J', col: 2, lin: 1 }, { tecla: 'k', rotulo: 'K', col: 1, lin: 1 }, { tecla: 'l', rotulo: 'L', col: 0, lin: 1 },
      { tecla: 'u', rotulo: 'U', col: 2, lin: 0 }, { tecla: 'i', rotulo: 'I', col: 1, lin: 0 }, { tecla: 'o', rotulo: 'O', col: 0, lin: 0 }
    ];
    golpes.forEach(function (g) {
      var direita = 24 + g.col * (TAM_GOLPE + GAP_GOLPE);
      var baixo = 24 + g.lin * (TAM_GOLPE + GAP_GOLPE);
      var b = botao('width:' + TAM_GOLPE + 'px;height:' + TAM_GOLPE + 'px;right:' + direita + 'px;bottom:' + baixo + 'px;font-size:15px;', g.rotulo);
      ligar(b, g.tecla);
      raiz.appendChild(b);
    });
    var provocacao = botao(
      'width:34px;height:34px;right:' + (24 + 3 * (TAM_GOLPE + GAP_GOLPE) + 6) + 'px;bottom:' + (24 + (TAM_GOLPE + GAP_GOLPE) / 2) + 'px;font-size:9px;opacity:.75;',
      '↵'
    );
    ligar(provocacao, 'enter');
    raiz.appendChild(provocacao);

    arena.appendChild(raiz);
    return { remover: function () { raiz.remove(); } };
  }

  function iniciarArenaLuta(opcoes) {
    opcoes = opcoes || {};
    if (ehTelaTocavel() && orientacaoRetrato()) {
      var cancelado = false;
      var avisoGirar = mostrarAvisoGirar(function () {
        if (cancelado) return;
        controladorReal = iniciarArenaLutaDeVerdade(opcoes);
      });
      var controladorReal = null;
      return {
        pararMovimento: function () { if (controladorReal) controladorReal.pararMovimento(); },
        remover: function () {
          cancelado = true;
          avisoGirar.parar();
          if (controladorReal) controladorReal.remover();
        }
      };
    }
    return iniciarArenaLutaDeVerdade(opcoes);
  }

  function iniciarArenaLutaDeVerdade(opcoes) {
    opcoes = opcoes || {};
    var duracaoTransicao = reduzMovimento() ? 200 : 900;
    try {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(function () {});
      }
    } catch (e) {}

    (opcoes.elementosParaApagar || []).forEach(function (elemento) {
      if (!elemento) return;
      elemento.style.transition = 'opacity ' + duracaoTransicao + 'ms ease';
      elemento.style.opacity = '0';
    });

    var arena = el('div',
      'position:fixed;inset:0;z-index:700050;background:#000;overflow:hidden;' +
      'font-family:Georgia,"Cormorant Garamond",serif;color:#E8E0D0;user-select:none;' +
      'opacity:0;transition:opacity ' + duracaoTransicao + 'ms ease;'
    );

    var fundo = el('div',
      'position:absolute;inset:0;background-image:url(\'' + PASTA_ARENA + 'cenario-eclipse.jpg\');' +
      'background-size:cover;background-position:center 30%;filter:brightness(.75);'
    );
    var vinheta = el('div', 'position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 45%,rgba(0,0,0,.55) 100%);');
    var chao = el('div', 'position:absolute;left:0;right:0;bottom:0;height:18%;background:linear-gradient(to bottom,transparent,rgba(0,0,0,.65));');

    arena.appendChild(fundo);
    arena.appendChild(vinheta);
    arena.appendChild(chao);

    var painelLeyn = montarPainelLutador('esquerda', 'LEYN', '#5CDB6A');
    var painelMalik = montarPainelLutador('direita', 'M.A.L.I.K.', VERMELHO);
    if (opcoes.retratoLeynSrc) painelLeyn.retratoImg.src = opcoes.retratoLeynSrc;
    if (opcoes.retratoMalikSrc) painelMalik.retratoImg.src = opcoes.retratoMalikSrc;
    painelLeyn.marcarRounds(0);
    painelMalik.marcarRounds(0);

    var timer = montarTimer();

    var pistaLuta = el('div', 'position:absolute;inset:0;z-index:1;');

    arena.appendChild(pistaLuta);
    arena.appendChild(painelLeyn.painel);
    arena.appendChild(painelMalik.painel);
    arena.appendChild(timer);

    document.body.appendChild(arena);
    requestAnimationFrame(function () { arena.style.opacity = '1'; });

    var teclaVencerHandler = null;
    if (modoTeste && typeof opcoes.aoTerminar === 'function') {
      var avisoTeste = el('div',
        'position:absolute;left:50%;top:52px;transform:translateX(-50%);z-index:2;' +
        'font-family:Consolas,monospace;font-size:11px;letter-spacing:.05em;color:#E8C97A;' +
        'background:rgba(7,8,13,.75);border:1px solid rgba(196,163,90,.4);border-radius:5px;' +
        'padding:.35rem .7rem;pointer-events:none;',
        'V — vencer a luta (teste, sem isso ainda não existe round de verdade)'
      );
      arena.appendChild(avisoTeste);
      teclaVencerHandler = function (e) {
        if ((e.key || '').toLowerCase() === 'v') { pararTodoMovimento(); opcoes.aoTerminar(); }
      };
      document.addEventListener('keydown', teclaVencerHandler);
    }

    var timers = [];
    function daquiA(ms, fn) { timers.push(setTimeout(fn, ms)); }

    daquiA(duracaoTransicao + 150, function () {
      painelLeyn.revelar();
      painelMalik.revelar();
    });
    daquiA(duracaoTransicao + 500, function () {
      painelLeyn.definirVida(1);
      painelMalik.definirVida(1);
    });
    daquiA(duracaoTransicao + 700, function () {
      timer.style.opacity = '1';
    });
    daquiA(duracaoTransicao + 900, function () {
      mostrarAvisoRound(arena, 'ROUND 1');
    });
    var leynSprite = null;
    var malikSprite = null;
    var controleMovimento = null;
    var controleMovimentoMalik = null;
    var controleTouch = null;
    var teclasCompartilhadas = {};

    var hpLeyn = 1, hpMalik = 1;

    function piscarAcerto(wrapperEl) {
      var alvo = wrapperEl && wrapperEl.spriteEl;
      if (!alvo) return;
      var filtroOriginal = alvo.style.filter;
      alvo.style.transition = 'filter .08s ease';
      alvo.style.filter = filtroOriginal + ' brightness(2.4) saturate(2.5)';
      setTimeout(function () { alvo.style.filter = filtroOriginal; }, 110);
    }

    function aplicarDanoEmMalik(fracao) {
      hpMalik = Math.max(0, Math.min(1, hpMalik - fracao));
      painelMalik.definirVida(hpMalik);
      piscarAcerto(malikSprite);
    }
    function aplicarDanoEmLeyn(fracao, bloqueado) {
      hpLeyn = Math.max(0, Math.min(1, hpLeyn - fracao));
      painelLeyn.definirVida(hpLeyn);
      if (!bloqueado) piscarAcerto(leynSprite);
    }

    function pararTodoMovimento() {
      if (controleMovimento) controleMovimento.parar();
      if (controleMovimentoMalik) controleMovimentoMalik.parar();
    }

    tocarAberturaArena(fundo, arena, daquiA, duracaoTransicao + 150, function () {
      leynSprite = montarLeynNaPista(pistaLuta);
      malikSprite = montarMalikNaPista(pistaLuta);
      controleMovimento = iniciarMovimentoLeyn(pistaLuta, leynSprite, malikSprite, teclasCompartilhadas, {
        aoAcertarMalik: aplicarDanoEmMalik
      });
      controleMovimentoMalik = iniciarIAMalik(pistaLuta, malikSprite, leynSprite, {
        aoAcertarLeyn: aplicarDanoEmLeyn,
        estaLeynBloqueando: function () { return !!(controleMovimento && controleMovimento.estaBloqueando()); }
      });
      if (ehTelaTocavel()) controleTouch = montarControlesTouch(arena, teclasCompartilhadas);
    });
    daquiA(duracaoTransicao + 2600, function () {
      if (opcoes.aoRevelar) {
        opcoes.aoRevelar({
          arena: arena,
          pistaLuta: pistaLuta,
          leyn: painelLeyn,
          malik: painelMalik,
          leynSprite: leynSprite,
          malikSprite: malikSprite,
          timer: timer,
          mostrarAvisoRound: function (texto, duracaoMs) { mostrarAvisoRound(arena, texto, duracaoMs); },
          pararMovimento: pararTodoMovimento
        });
      }
    });

    return {
      arena: arena, leyn: painelLeyn, malik: painelMalik, timer: timer, pistaLuta: pistaLuta,
      pararMovimento: pararTodoMovimento,
      remover: function () {
        timers.forEach(function (id) { clearTimeout(id); });
        pararTodoMovimento();
        if (controleTouch) controleTouch.remover();
        if (teclaVencerHandler) document.removeEventListener('keydown', teclaVencerHandler);
        arena.remove();
      }
    };
  }

  window.NexusMalikArenaLuta = { iniciar: iniciarArenaLuta };

  function mostrarIntroducaoVS(aoTerminar, duracaoMs) {
    var overlay = el('div',
      'position:fixed;inset:0;z-index:700040;background:#000;' +
      'display:flex;align-items:center;justify-content:center;' +
      'opacity:0;transition:opacity .6s ease;'
    );
    var img = el('img', 'max-width:100%;max-height:100%;transform:scaleX(-1);');
    img.src = PASTA_ARENA + 'vs-intro.gif';
    overlay.appendChild(img);
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.style.opacity = '1'; });
    setTimeout(function () {
      overlay.style.opacity = '0';
      setTimeout(function () {
        overlay.remove();
        if (aoTerminar) aoTerminar();
      }, 600);
    }, duracaoMs || 3200);
    return overlay;
  }
  window.NexusMalikArenaLuta.mostrarIntroducaoVS = mostrarIntroducaoVS;

  function mostrarVsNovo(aoTerminar) {
    var overlay = el('div', 'position:fixed;inset:0;z-index:700045;background:#050308;opacity:0;transition:opacity .5s ease;');
    var frame = el('iframe', 'position:absolute;inset:0;width:100%;height:100%;border:0;display:block;');
    frame.setAttribute('title', 'Leyn contra M.A.L.I.K.');
    frame.setAttribute('allow', 'autoplay');
    frame.src = 'leyn-contra-malik.html?autostart=0';

    var terminou = false;
    var tempoLimite = null;
    function aoReceberMensagem(e) {
      if (!e.data || e.data.type !== 'versus:end' || terminou) return;
      terminou = true;
      clearTimeout(tempoLimite);
      window.removeEventListener('message', aoReceberMensagem);
      overlay.style.opacity = '0';
      setTimeout(function () {
        overlay.remove();
        if (aoTerminar) aoTerminar();
      }, 500);
    }
    window.addEventListener('message', aoReceberMensagem);

    frame.addEventListener('load', function () {
      requestAnimationFrame(function () { overlay.style.opacity = '1'; });
      try { frame.contentWindow.postMessage({ type: 'versus:start' }, '*'); } catch (e) {}
    });

    tempoLimite = setTimeout(function () { aoReceberMensagem({ data: { type: 'versus:end' } }); }, 9000);

    overlay.appendChild(frame);
    document.body.appendChild(overlay);
    return overlay;
  }
  window.NexusMalikArenaLuta.mostrarVsNovo = mostrarVsNovo;

  var testarArenaIsolada = modoTeste && /[?&]arenaLuta=1\b/.test(location.search);
  var testarIntroVs = testarArenaIsolada && /[?&]introVs=1\b/.test(location.search);
  if (testarArenaIsolada) {
    (function aguardarBody() {
      if (!document.body) { document.addEventListener('DOMContentLoaded', aguardarBody); return; }
      function abrirArena() {
        iniciarArenaLuta({
          retratoLeynSrc: PASTA_LEYN + 'leyn-retrato.png',
          retratoMalikSrc: PASTA_MALIK + 'malik-vn-retrato.png'
        });
        if (!ehTelaTocavel()) {
          var ajuda = el('div',
            'position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:700060;' +
            'font-family:Consolas,monospace;font-size:12px;letter-spacing:.05em;color:#E8E0D0;' +
            'background:rgba(7,8,13,.75);border:1px solid rgba(196,163,90,.4);border-radius:5px;' +
            'padding:.4rem .8rem;pointer-events:none;',
            'W pula · A/D anda · S abaixa (golpes ainda não implementados)'
          );
          document.body.appendChild(ajuda);
        }
      }
      if (testarIntroVs) mostrarVsNovo(abrirArena);
      else abrirArena();
    })();
  }
})();
