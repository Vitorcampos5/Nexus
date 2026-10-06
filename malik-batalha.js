(function () {
  'use strict';

  var frame = document.getElementById('nexusFrame');

  var CAIXA_W = 380, CAIXA_H = 250;
  var ARENA_W = 560, ARENA_H = 340;
  var LIMIAR_FUGA = 28;
  var ALMA_TAM = 14;
  var HP_MAX = 100;
  var VERMELHO = '#ff2b3a';
  var OURO = '#C4A35A';

  var POSICOES_ESTRELA = {
    1: [[0,0]],
    2: [[-4,-3],[4,3]],
    3: [[0,-6],[-5,4],[5,4]],
    4: [[-5,-5],[5,-5],[-5,5],[5,5]],
    5: [[0,-7],[-6,-1],[6,-1],[-4,6],[4,6]],
    6: [[-5,-6],[5,-6],[-5,0],[5,0],[-5,6],[5,6]],
    7: [[0,-7],[-6,-4],[6,-4],[-6,3],[6,3],[-3,7],[3,7]]
  };

  var MUSICAS = { A: 'Assets/bad-gateway.mp3', B: 'Assets/nexus-resiste.mp3' };

  var PASTA_MALIK = 'Assets/malik/';
  var PASTA_LEYN = 'Assets/leyn/';
  var PASTA_FANTASMAS = 'Assets/fantasmas/';

  var POSE_POR_FASE = {
    ping: 'malik-vn-ping.png',
    cache: 'malik-vn-linha-disparo.png',
    broca: 'malik-vn-plano-foice.png',
    mentira: 'malik-vn-volume-anel.png',
    saida: 'malik-vn-imp-glitch.png',
    zombaria: 'malik-vn-imp-zombaria.png',
    ddos: 'malik-vn-final-ddos.png',
    overflow: 'malik-vn-final-overflow.png',
    sozinho: 'malik-vn-final-sozinho.png',
    clímaxA: 'malik-vn-final-paineis.png',
    auraFinal: 'malik-vn-final-veredito.png',
    zumbis: 'malik-vn-b-zumbis.png',
    raio: 'malik-vn-b-raio.png',
    rachadura: 'malik-vn-b-rachadura.png',
    silencio: 'malik-vn-b-silencio.png',
    dano: 'malik-vn-b-dano.png',
    espera: 'malik-vn-espera.png',
    aproximacao: 'malik-vn-aproximacao.png',
    falar: 'malik-vn-falar.png',
    atacar: 'malik-vn-atacar.png'
  };
  var RETRATO_PAINEL_MALIK = 'malik-vn-retrato.png';

  var POSES_LINHA_AVISO = ['malik-vn-linha-traco.png', 'malik-vn-linha-fio.png', 'malik-vn-linha-lamina.png', 'malik-vn-linha-alto.png'];
  var POSES_FOICE_ROTACAO = ['malik-vn-plano-vidro.png', 'malik-vn-plano-moldura.png', 'malik-vn-plano-foice.png', 'malik-vn-plano-grade.png', 'malik-vn-plano-impacto.png'];
  var POSES_VOLUME_PAREDE = { left: 'malik-vn-volume-esq.png', right: 'malik-vn-volume-dir.png', top: 'malik-vn-volume-teto.png', bottom: 'malik-vn-volume-piso.png' };
  var POSES_IMPOSSIVEL = { azul: 'malik-vn-imp-azul.png', vermelho: 'malik-vn-imp-vermelho.png', relogio: 'malik-vn-imp-relogio.png' };

  var ativo = false;
  window.NexusMalikPermitirNovaLuta = function () { ativo = false; };
  var audioDoMalik = null;
  var pararDeSilenciar = null;

  function silenciarTudoMenosMalik(doc) {
    if (!doc) return function () {};
    function aoTentarTocar(e) {
      var el = e.target;
      if (el === audioDoMalik) return;
      if (el && typeof el.pause === 'function') el.pause();
    }
    function pararAudiosSoltos() {
      try {
        var janela = doc.defaultView || doc.parentWindow;
        if (janela && typeof janela.NexusPararTudoAudio === 'function') janela.NexusPararTudoAudio();
      } catch (e) {}
    }
    try {
      var jaTocando = doc.querySelectorAll('audio, video');
      for (var i = 0; i < jaTocando.length; i++) {
        if (jaTocando[i] !== audioDoMalik) jaTocando[i].pause();
      }
    } catch (e) {}
    pararAudiosSoltos();
    doc.addEventListener('play', aoTentarTocar, true);
    var repeticoes = 0;
    var intervaloAudiosSoltos = setInterval(function () {
      pararAudiosSoltos();
      repeticoes++;
      if (repeticoes > 20) clearInterval(intervaloAudiosSoltos);
    }, 1000);
    return function () {
      doc.removeEventListener('play', aoTentarTocar, true);
      clearInterval(intervaloAudiosSoltos);
    };
  }

  function el(tag, css, texto) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  function trocarPoseMalik(elemento, nomeArquivo) {
    if (!elemento || !nomeArquivo) return;
    elemento.style.transition = 'opacity .22s ease';
    elemento.style.opacity = '0.12';
    setTimeout(function () {
      elemento.src = PASTA_MALIK + nomeArquivo;
      elemento.style.opacity = '1';
    }, 200);
  }

  function prepararTiraSprite(elemento, arquivo, largNatural, altNatural, nQuadros, alturaAlvo, pasta) {
    var escala = alturaAlvo / altNatural;
    var largEscalada = largNatural * escala;
    var largQuadro = largEscalada / nQuadros;
    elemento.style.backgroundImage = "url('" + (pasta || PASTA_LEYN) + arquivo + "')";
    elemento.style.backgroundRepeat = 'no-repeat';
    elemento.style.backgroundSize = largEscalada + 'px ' + alturaAlvo + 'px';
    elemento.style.backgroundPosition = '0 0';
    elemento.style.width = largQuadro + 'px';
    elemento.style.height = alturaAlvo + 'px';
    elemento.style.flexShrink = '0';
    return function tocar(duracaoMs, repetir) {
      return elemento.animate(
        [{ backgroundPositionX: '0px' }, { backgroundPositionX: (-largQuadro * nQuadros) + 'px' }],
        { duration: duracaoMs, iterations: repetir ? Infinity : 1, easing: 'steps(' + nQuadros + ')', fill: 'forwards' }
      );
    };
  }

  function falarMalik(raiz, texto, callback) {
    var rect = raiz.getBoundingClientRect();
    if (!rect.width && !rect.height) {
      requestAnimationFrame(function () { falarMalik(raiz, texto, callback); });
      return;
    }
    var caixaFala = el('div', 'position:fixed;left:' + (rect.left + rect.width / 2) + 'px;top:' + (rect.top - 10) + 'px;transform:translate(-50%,-100%);width:min(86vw,420px);background:rgba(7,8,13,.92);border:1px solid rgba(255,43,58,.4);border-radius:6px;padding:.6rem .8rem;font-family:Consolas,monospace;font-size:12.5px;line-height:1.5;color:#E8C97A;opacity:0;transition:opacity .35s ease;white-space:pre-wrap;min-height:2.6em;z-index:700015;');
    document.body.appendChild(caixaFala);
    function manterNaTela() {
      var altura = caixaFala.getBoundingClientRect().height;
      var topoMinimo = altura + 8;
      if (rect.top - 10 < topoMinimo) caixaFala.style.top = topoMinimo + 'px';
    }
    manterNaTela();
    requestAnimationFrame(function () { caixaFala.style.opacity = '1'; });
    var i = 0;
    var digitando = setInterval(function () {
      caixaFala.textContent = texto.slice(0, i + 1);
      manterNaTela();
      i++;
      if (i >= texto.length) {
        clearInterval(digitando);
        setTimeout(function () {
          caixaFala.style.opacity = '0';
          setTimeout(function () { caixaFala.remove(); if (callback) callback(); }, 400);
        }, 1400);
      }
    }, 22);
    return caixaFala;
  }

  function falarIrmaos(raiz, texto, callback) {
    var rect = raiz.getBoundingClientRect();
    if (!rect.width && !rect.height) {
      requestAnimationFrame(function () { falarIrmaos(raiz, texto, callback); });
      return;
    }
    var caixaFala = el('div', 'position:fixed;left:' + (rect.left + rect.width / 2) + 'px;top:' + (rect.top - 10) + 'px;transform:translate(-50%,-100%);width:min(86vw,420px);background:rgba(7,8,13,.92);border:1px solid rgba(180,210,255,.45);border-radius:6px;padding:.6rem .8rem;font-family:Consolas,monospace;font-size:12.5px;line-height:1.5;color:#CFE0FF;opacity:0;transition:opacity .35s ease;white-space:pre-wrap;min-height:2.6em;z-index:700015;');
    document.body.appendChild(caixaFala);
    function manterNaTela() {
      var altura = caixaFala.getBoundingClientRect().height;
      var topoMinimo = altura + 8;
      if (rect.top - 10 < topoMinimo) caixaFala.style.top = topoMinimo + 'px';
    }
    manterNaTela();
    requestAnimationFrame(function () { caixaFala.style.opacity = '1'; });
    var i = 0;
    var digitando = setInterval(function () {
      caixaFala.textContent = texto.slice(0, i + 1);
      manterNaTela();
      i++;
      if (i >= texto.length) {
        clearInterval(digitando);
        setTimeout(function () {
          caixaFala.style.opacity = '0';
          setTimeout(function () { caixaFala.remove(); if (callback) callback(); }, 400);
        }, 1400);
      }
    }, 22);
    return caixaFala;
  }

  function legendaFlutuante(texto, duracaoMs) {
    var legenda = el('div', 'position:fixed;left:50%;top:36%;transform:translate(-50%,-50%);z-index:700020;font-family:Georgia,"Cormorant Garamond",serif;font-size:15px;letter-spacing:.14em;text-align:center;max-width:80vw;opacity:0;transition:opacity 1.2s ease;color:#E8C97A;text-shadow:0 0 8px rgba(255,43,58,.85),0 0 22px rgba(196,163,90,.7),0 0 40px rgba(255,43,58,.35);', texto);
    document.body.appendChild(legenda);
    requestAnimationFrame(function () { legenda.style.opacity = '1'; });
    setTimeout(function () {
      legenda.style.opacity = '0';
      setTimeout(function () { legenda.remove(); }, 1200);
    }, duracaoMs || 3500);
    return legenda;
  }

  function menuAcao(raiz, opcoes, duracaoMs) {
    var rect = raiz.getBoundingClientRect();
    var caixaMenu = el('div', 'position:fixed;left:' + (rect.left + rect.width / 2) + 'px;top:' + (rect.bottom + 10) + 'px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;max-width:min(90vw,440px);opacity:0;transition:opacity .3s ease;z-index:700015;');
    var linhaBotoes = el('div', 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;');
    caixaMenu.appendChild(linhaBotoes);
    document.body.appendChild(caixaMenu);
    opcoes.forEach(function (op) {
      var cor = op.ativo ? OURO : 'rgba(255,255,255,.3)';
      var borda = op.ativo ? OURO : 'rgba(255,255,255,.18)';
      var botao = el('button', 'position:relative;font-family:Georgia,serif;font-size:12px;letter-spacing:.05em;padding:.5rem .85rem;background:#000;border:none;color:' + cor + ';cursor:' + (op.ativo ? 'pointer' : 'default') + ';opacity:' + (op.ativo ? '1' : '.55') + ';box-shadow:inset 0 0 0 1px ' + borda + ';transition:box-shadow .15s ease,color .15s ease;', op.label);
      if (op.ativo) {
        botao.addEventListener('pointerenter', function () { botao.style.boxShadow = 'inset 0 0 0 1px ' + OURO + ', 0 0 10px rgba(212,170,64,.35)'; });
        botao.addEventListener('pointerleave', function () { botao.style.boxShadow = 'inset 0 0 0 1px ' + OURO; });
        botao.addEventListener('click', function () {
          caixaMenu.style.opacity = '0';
          setTimeout(function () { caixaMenu.remove(); }, 300);
          op.onClick();
        });
      }
      linhaBotoes.appendChild(botao);
    });
    if (duracaoMs) {
      var trilhaTempo = el('div', 'width:100%;max-width:220px;height:2px;background:rgba(255,255,255,.12);');
      var barraTempo = el('div', 'height:100%;width:100%;background:' + VERMELHO + ';transition:width ' + duracaoMs + 'ms linear;');
      trilhaTempo.appendChild(barraTempo);
      caixaMenu.appendChild(trilhaTempo);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { barraTempo.style.width = '0%'; });
      });
    }
    var alturaMenu = caixaMenu.getBoundingClientRect().height;
    var topoMaximo = window.innerHeight - alturaMenu - 10;
    if (rect.bottom + 10 > topoMaximo) caixaMenu.style.top = Math.max(10, topoMaximo) + 'px';
    requestAnimationFrame(function () { caixaMenu.style.opacity = '1'; });
    return caixaMenu;
  }

  var CHAVE_PROGRESSO_BATALHA = 'malik_batalha_progresso';
  function salvarProgresso(dados) {
    try { localStorage.setItem(CHAVE_PROGRESSO_BATALHA, JSON.stringify(dados)); } catch (e) {}
  }
  function limparProgresso() {
    try { localStorage.removeItem(CHAVE_PROGRESSO_BATALHA); } catch (e) {}
    try { sessionStorage.removeItem('malik_sessao_batalha_ativa'); } catch (e) {}
  }

  function iniciarConfrontoMalik(cenario, opcoes) {
    if (ativo) return;
    ativo = true;
    function pausarNexus() {
      try {
        if (frame && frame.contentWindow && frame.contentWindow.NexusMalikBridge)
          frame.contentWindow.NexusMalikBridge.pausarParaConfronto();
      } catch (e) {}
      if (frame) {
        frame.style.visibility = 'hidden';
        frame.style.pointerEvents = 'none';
      }
    }
    function retomarNexus() {
      try {
        if (frame && frame.contentWindow && frame.contentWindow.NexusMalikBridge)
          frame.contentWindow.NexusMalikBridge.retomarAposConfronto();
      } catch (e) {}
      if (frame) {
        frame.style.visibility = '';
        frame.style.pointerEvents = '';
        frame.style.filter = '';
        frame.style.opacity = '';
      }
    }
    pausarNexus();
    try { sessionStorage.setItem('malik_sessao_batalha_ativa', '1'); } catch (e) {}
    cenario = (cenario === 'B') ? 'B' : 'A';
    var retomarDe = opcoes && opcoes.retomarDe;
    var fraseAoRetomar = (opcoes && opcoes.fraseAoRetomar) || null;
    var ausenteDuranteTudo = (retomarDe && retomarDe.ausente) || (opcoes && opcoes.ausente) || false;

    audioDoMalik = el('audio');
    audioDoMalik.src = MUSICAS[cenario];
    audioDoMalik.loop = false;
    audioDoMalik.volume = 0;
    document.body.appendChild(audioDoMalik);

    var pararSilencioFrame = null;
    try { pararSilencioFrame = silenciarTudoMenosMalik(frame.contentDocument || frame.contentWindow.document); } catch (e) {}
    var pararSilencioFora = silenciarTudoMenosMalik(document);
    pararDeSilenciar = function () {
      if (pararSilencioFrame) pararSilencioFrame();
      pararSilencioFora();
    };

    var tocar = audioDoMalik.play();
    if (tocar && tocar.catch) {
      tocar.catch(function () {
        var tentarDeNovo = function () {
          var p = audioDoMalik.play();
          if (p && p.catch) p.catch(function () {});
        };
        document.addEventListener('pointerdown', tentarDeNovo, { once: true });
        document.addEventListener('keydown', tentarDeNovo, { once: true });
      });
    }
    var alvoVolume = 1, passos = 24, passo = 0;
    var fadeIn = setInterval(function () {
      passo++;
      audioDoMalik.volume = Math.min(alvoVolume, (passo / passos) * alvoVolume);
      if (passo >= passos) clearInterval(fadeIn);
    }, 1400 / 24);

    var raiz = el('div', 'position:fixed;inset:0;z-index:700000;background:radial-gradient(ellipse at center,#0b0710 0%,#020103 75%);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Georgia,"Cormorant Garamond",serif;color:#E8E0D0;user-select:none;');
    document.body.appendChild(raiz);

    var faseTimers = [];
    function daquiA(ms, fn) { faseTimers.push(setTimeout(fn, ms)); }

    function limparFaseTimers() {
      faseTimers.forEach(function (id) { clearTimeout(id); });
      faseTimers = [];
    }

    var retrato = el('img', 'max-height:26vh;max-width:72vw;object-fit:contain;filter:drop-shadow(0 0 34px rgba(255,43,58,.4));margin-bottom:16px;opacity:0;transition:opacity 1.4s ease;');
    retrato.src = PASTA_MALIK + POSE_POR_FASE.espera;
    retrato.alt = 'M.A.L.I.K.';

    var nome = el('div', 'letter-spacing:.32em;font-size:13px;color:' + VERMELHO + ';opacity:0;transition:opacity 1.8s ease;margin-bottom:14px;', 'M.A.L.I.K.');

    var hpLinha = el('div', 'font-size:13px;letter-spacing:.1em;margin-bottom:10px;opacity:0;transition:opacity 1.4s ease;');

    var caixa = el('div', 'position:relative;width:' + CAIXA_W + 'px;height:' + CAIXA_H + 'px;max-width:82vw;border:2px solid #E8E0D0;background:#000;overflow:hidden;box-shadow:0 0 24px rgba(0,0,0,.6);');
    var alma = el('div');
    alma.style.cssText = 'position:absolute;z-index:10;width:' + ALMA_TAM + 'px;height:' + ALMA_TAM + 'px;background:' + VERMELHO + ';box-shadow:0 0 8px ' + VERMELHO + ';clip-path:polygon(50% 0%,100% 35%,82% 100%,18% 100%,0% 35%);';

    var comecoDoZero = !(retomarDe && retomarDe.estado);

    function revelarMalik() {
      trocarPoseMalik(retrato, POSE_POR_FASE.aproximacao);
      raiz.appendChild(retrato);
      raiz.appendChild(nome);
      raiz.appendChild(hpLinha);
      caixa.appendChild(alma);
      montarDecoracaoArena();
      raiz.appendChild(caixa);
      requestAnimationFrame(function () {
        retrato.style.opacity = '1';
        hpLinha.style.opacity = '.85';
        setTimeout(function () { nome.style.opacity = '1'; }, 900);
      });
      caixa.addEventListener('pointermove', function (e) { moverAlma(e.clientX, e.clientY); });
    }

    function montarDecoracaoArena() {
      var grade = el('div', 'position:absolute;inset:0;pointer-events:none;z-index:1;opacity:.5;background-image:linear-gradient(rgba(196,163,90,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(196,163,90,.07) 1px,transparent 1px);background-size:19px 19px;');
      caixa.appendChild(grade);

      var scan = el('div', 'position:absolute;left:0;right:0;height:38px;top:-38px;pointer-events:none;z-index:2;background:linear-gradient(rgba(232,224,208,0) 0%,rgba(232,224,208,.06) 50%,rgba(232,224,208,0) 100%);');
      caixa.appendChild(scan);
      var scanY = -38;
      setInterval(function () {
        scanY += 1.4;
        if (scanY > CAIXA_H + 38) scanY = -38;
        scan.style.top = scanY + 'px';
      }, 30);

      [['top:-1px;left:-1px;border-right:none;border-bottom:none;', ''],
       ['top:-1px;right:-1px;border-left:none;border-bottom:none;', ''],
       ['bottom:-1px;left:-1px;border-right:none;border-top:none;', ''],
       ['bottom:-1px;right:-1px;border-left:none;border-top:none;', '']
      ].forEach(function (par) {
        var canto = el('div', 'position:absolute;' + par[0] + 'width:16px;height:16px;border:2px solid ' + OURO + ';pointer-events:none;z-index:3;opacity:.85;');
        caixa.appendChild(canto);
      });
    }

    function mostrarCaixa(mostrar) {
      caixa.style.transition = 'border-color .3s ease, background-color .3s ease, box-shadow .3s ease';
      caixa.style.borderColor = mostrar ? '#E8E0D0' : 'transparent';
      caixa.style.backgroundColor = mostrar ? '#000' : 'transparent';
      caixa.style.boxShadow = mostrar ? '0 0 24px rgba(0,0,0,.6)' : 'none';
    }

    var hp = (retomarDe && typeof retomarDe.hp === 'number') ? retomarDe.hp : HP_MAX;
    var almaX = CAIXA_W / 2, almaY = CAIXA_H / 2;
    alma.style.left = (almaX - ALMA_TAM / 2) + 'px';
    alma.style.top  = (almaY - ALMA_TAM / 2) + 'px';
    var invulneravel = false;
    var projeteis = [];
    var rodando = true;
    var faseAtual = -1;
    var modoAtual = 'fase';
    var acaoEscolhida = (retomarDe && retomarDe.acao) || null;
    var hpDeMalikJaEstourou = false;
    var lutaEncerrada = false;
    function salvarProgressoAtual() {
      if (lutaEncerrada) return;
      var estado = modoAtual === 'checkpointFinal' ? 'checkpointFinal' : (modoAtual + ':' + faseAtual);
      salvarProgresso({ cenario: cenario, estado: estado, hp: hp, acao: acaoEscolhida, ausente: ausenteDuranteTudo });
    }

    function atualizarHP(texto) {
      hpLinha.textContent = texto !== undefined ? texto : ('HP  ' + Math.max(0, Math.round(hp)) + ' / ' + HP_MAX);
    }
    atualizarHP();

    function moverAlma(clientX, clientY) {
      var r = caixa.getBoundingClientRect();
      almaX = Math.min(CAIXA_W - ALMA_TAM / 2, Math.max(ALMA_TAM / 2, clientX - r.left));
      almaY = Math.min(CAIXA_H - ALMA_TAM / 2, Math.max(ALMA_TAM / 2, clientY - r.top));
      alma.style.left = (almaX - ALMA_TAM / 2) + 'px';
      alma.style.top  = (almaY - ALMA_TAM / 2) + 'px';
    }

    if (comecoDoZero) {
      falarMalik(caixa, 'A conexão não é mais sua.');
      if (frame) {
        frame.style.transition = 'filter 1.1s ease, opacity 1.1s ease';
        frame.style.filter = 'grayscale(1) brightness(.25)';
      }
      var _inicioCapturaAgendado = false;
      var _rodarCaptura = function () {
        if (_inicioCapturaAgendado) return;
        _inicioCapturaAgendado = true;
        iniciarSequenciaCaptura();
      };
      setTimeout(_rodarCaptura, 1650);

      function iniciarSequenciaCaptura() {
      var arenaCaptura = el('div', 'position:relative;width:' + ARENA_W + 'px;height:' + ARENA_H + 'px;max-width:92vw;max-height:60vh;border:1px dashed rgba(232,224,208,.22);');
      raiz.appendChild(arenaCaptura);

      var rArena = arenaCaptura.getBoundingClientRect();
      var offsetArenaX = Math.max(0, (rArena.width  - CAIXA_W) / 2);
      var offsetArenaY = Math.max(0, (rArena.height - CAIXA_H) / 2);
      var limitesArena = { topo: 0, baixo: rArena.height, esquerda: 0, direita: rArena.width };

      almaX = rArena.width / 2; almaY = rArena.height / 2;
      alma.style.left = (almaX - ALMA_TAM / 2) + 'px';
      alma.style.top  = (almaY - ALMA_TAM / 2) + 'px';
      arenaCaptura.appendChild(alma);

      function moverAlmaArena(clientX, clientY) {
        var r = arenaCaptura.getBoundingClientRect();
        almaX = Math.min(limitesArena.direita - ALMA_TAM / 2, Math.max(limitesArena.esquerda + ALMA_TAM / 2, clientX - r.left));
        almaY = Math.min(limitesArena.baixo - ALMA_TAM / 2, Math.max(limitesArena.topo + ALMA_TAM / 2, clientY - r.top));
        alma.style.left = (almaX - ALMA_TAM / 2) + 'px';
        alma.style.top  = (almaY - ALMA_TAM / 2) + 'px';
      }
      arenaCaptura.addEventListener('pointermove', function (e) { moverAlmaArena(e.clientX, e.clientY); });

      var paredeEl = {};
      ['topo', 'baixo', 'esquerda', 'direita'].forEach(function (lado) {
        var base = 'position:absolute;background:' + VERMELHO + ';box-shadow:0 0 10px ' + VERMELHO + ';transition:top .5s cubic-bezier(.3,.7,.3,1),bottom .5s cubic-bezier(.3,.7,.3,1),left .5s cubic-bezier(.3,.7,.3,1),right .5s cubic-bezier(.3,.7,.3,1);';
        var pos = lado === 'topo' ? 'left:0;right:0;top:0;height:4px;'
                : lado === 'baixo' ? 'left:0;right:0;bottom:0;height:4px;'
                : lado === 'esquerda' ? 'top:0;bottom:0;left:0;width:4px;'
                : 'top:0;bottom:0;right:0;width:4px;';
        paredeEl[lado] = el('div', base + pos);
        arenaCaptura.appendChild(paredeEl[lado]);
      });

      var paredesFechadas = { topo: false, baixo: false, esquerda: false, direita: false };
      var ladosFechados = 0, bloqueadoFechamento = false, capturaAtiva = false, fallbackCaptura = null;

      function sacolejarArena() {
        var n = 0;
        var jitter = setInterval(function () {
          arenaCaptura.style.transform = (n % 2) ? 'translateX(-4px)' : 'translateX(4px)';
          n++;
          if (n > 5) { clearInterval(jitter); arenaCaptura.style.transform = ''; }
        }, 45);
      }

      function fecharParede(lado) {
        if (paredesFechadas[lado] || bloqueadoFechamento) return;
        paredesFechadas[lado] = true;
        bloqueadoFechamento = true;
        sacolejarArena();
        if (lado === 'topo') { paredeEl.topo.style.top = offsetArenaY + 'px'; limitesArena.topo = offsetArenaY; }
        else if (lado === 'baixo') { paredeEl.baixo.style.bottom = offsetArenaY + 'px'; limitesArena.baixo = rArena.height - offsetArenaY; }
        else if (lado === 'esquerda') { paredeEl.esquerda.style.left = offsetArenaX + 'px'; limitesArena.esquerda = offsetArenaX; }
        else { paredeEl.direita.style.right = offsetArenaX + 'px'; limitesArena.direita = rArena.width - offsetArenaX; }

        var xAntes = almaX, yAntes = almaY;
        almaX = Math.min(limitesArena.direita - ALMA_TAM / 2, Math.max(limitesArena.esquerda + ALMA_TAM / 2, almaX));
        almaY = Math.min(limitesArena.baixo - ALMA_TAM / 2, Math.max(limitesArena.topo + ALMA_TAM / 2, almaY));
        if (almaX !== xAntes || almaY !== yAntes) {
          alma.style.transition = 'left .32s ease, top .32s ease';
          alma.style.left = (almaX - ALMA_TAM / 2) + 'px';
          alma.style.top  = (almaY - ALMA_TAM / 2) + 'px';
          setTimeout(function () { alma.style.transition = ''; }, 340);
        }

        setTimeout(function () { bloqueadoFechamento = false; }, 450);
        ladosFechados++;
        if (ladosFechados >= 4) {
          capturaAtiva = false;
          if (fallbackCaptura) clearInterval(fallbackCaptura);
          daquiA(520, finalizarCaptura);
        }
      }

      function ladoMaisProximo() {
        var candidatos = [];
        if (!paredesFechadas.topo) candidatos.push(['topo', almaY - limitesArena.topo]);
        if (!paredesFechadas.baixo) candidatos.push(['baixo', limitesArena.baixo - almaY]);
        if (!paredesFechadas.esquerda) candidatos.push(['esquerda', almaX - limitesArena.esquerda]);
        if (!paredesFechadas.direita) candidatos.push(['direita', limitesArena.direita - almaX]);
        candidatos.sort(function (a, b) { return a[1] - b[1]; });
        return candidatos.length ? candidatos[0][0] : null;
      }

      function finalizarCaptura() {
        almaX = CAIXA_W / 2 + (almaX - rArena.width / 2);
        almaY = CAIXA_H / 2 + (almaY - rArena.height / 2);
        alma.style.left = (almaX - ALMA_TAM / 2) + 'px';
        alma.style.top  = (almaY - ALMA_TAM / 2) + 'px';
        arenaCaptura.remove();
        revelarMalik();
        var desejoJaGasto = false;
        try { desejoJaGasto = (parseInt(localStorage.getItem('nexus_esferas_bloqueado_ate'), 10) || 0) > Date.now(); } catch (e) {}
        if (desejoJaGasto) {
          daquiA(1100, function () {
            falarMalik(caixa, 'As esferas já estão em pedra. Você gastou seu desejo em outra coisa — e agora não sobrou nenhum pra mim.', function () {
              avancarPara(1);
            });
          });
        } else {
          daquiA(1100, function () { avancarPara(1); });
        }
      }

      daquiA(1800, function () {
        capturaAtiva = true;
        (function loopCaptura() {
          if (!capturaAtiva) return;
          requestAnimationFrame(loopCaptura);
          if (bloqueadoFechamento) return;
          if (!paredesFechadas.topo && almaY - limitesArena.topo < LIMIAR_FUGA) fecharParede('topo');
          else if (!paredesFechadas.baixo && limitesArena.baixo - almaY < LIMIAR_FUGA) fecharParede('baixo');
          else if (!paredesFechadas.esquerda && almaX - limitesArena.esquerda < LIMIAR_FUGA) fecharParede('esquerda');
          else if (!paredesFechadas.direita && limitesArena.direita - almaX < LIMIAR_FUGA) fecharParede('direita');
        })();
        fallbackCaptura = setInterval(function () {
          if (bloqueadoFechamento) return;
          var lado = ladoMaisProximo();
          if (lado) fecharParede(lado);
        }, 1500);
      });
      }
    } else {
      alma.style.left = (almaX - ALMA_TAM / 2) + 'px';
      alma.style.top = (almaY - ALMA_TAM / 2) + 'px';
      revelarMalik();
    }

    function spawnProjetil(cfg) {
      var tam = cfg.tam || 7;
      var p = el('div', 'position:absolute;z-index:8;width:' + tam + 'px;height:' + tam + 'px;border-radius:50%;background:' + (cfg.cor || VERMELHO) + ';box-shadow:0 0 6px ' + (cfg.cor || VERMELHO) + ';display:flex;align-items:center;justify-content:center;font-size:13px;line-height:1;');
      if (cfg.glifo) { p.textContent = cfg.glifo; p.style.background = 'transparent'; p.style.boxShadow = 'none'; p.style.color = cfg.cor || VERMELHO; }
      caixa.appendChild(p);
      var projetil = { el: p, x: cfg.x, y: cfg.y, vx: cfg.vx, vy: cfg.vy, raio: tam / 2, ricochetes: cfg.ricochetes || 0 };
      projeteis.push(projetil);
      return projetil;
    }

    function limparProjeteis() {
      projeteis.forEach(function (p) { p.el.remove(); });
      projeteis = [];
    }

    function aplicarDano(dmg) {
      if (invulneravel) return;
      hp -= (typeof dmg === 'number' ? dmg : 8 + Math.random() * 6);
      atualizarHP();
      salvarProgressoAtual();
      invulneravel = true;
      caixa.style.boxShadow = 'inset 0 0 40px ' + VERMELHO;
      setTimeout(function () { caixa.style.boxShadow = 'none'; }, 140);
      setTimeout(function () { invulneravel = false; }, 700);
      if (hp <= 0 && faseAtual < 8) avancarPara(8);
    }

    (function loop() {
      if (!rodando) return;
      requestAnimationFrame(loop);
      for (var i = projeteis.length - 1; i >= 0; i--) {
        var p = projeteis[i];
        p.x += p.vx; p.y += p.vy;
        if (p.ricochetes > 0) {
          if (p.x < p.raio || p.x > CAIXA_W - p.raio) { p.vx *= -1; p.ricochetes--; p.x = Math.min(CAIXA_W - p.raio, Math.max(p.raio, p.x)); }
          if (p.y < p.raio || p.y > CAIXA_H - p.raio) { p.vy *= -1; p.ricochetes--; p.y = Math.min(CAIXA_H - p.raio, Math.max(p.raio, p.y)); }
        }
        p.el.style.left = (p.x - p.raio) + 'px';
        p.el.style.top  = (p.y - p.raio) + 'px';
        var fora = p.x < -20 || p.x > CAIXA_W + 20 || p.y < -20 || p.y > CAIXA_H + 20;
        if (fora) { p.el.remove(); projeteis.splice(i, 1); continue; }
        var dx = p.x - almaX, dy = p.y - almaY;
        if (!invulneravel && Math.sqrt(dx * dx + dy * dy) < p.raio + ALMA_TAM / 2.6) {
          p.el.remove(); projeteis.splice(i, 1);
          aplicarDano();
        }
      }
    })();

    function sacolejarRaiz() {
      var n = 0;
      var jitter = setInterval(function () {
        raiz.style.transform = (n % 2) ? 'translateX(-5px)' : 'translateX(5px)';
        n++;
        if (n > 6) { clearInterval(jitter); raiz.style.transform = ''; }
      }, 45);
    }

    function fase1Ping() {
      limparProjeteis();
      trocarPoseMalik(retrato, POSE_POR_FASE.ping);
      daquiA(300, function () {
        if (faseAtual !== 1 || modoAtual !== 'fase') return;
        var intervalo = setInterval(function () {
          if (faseAtual !== 1 || modoAtual !== 'fase') { clearInterval(intervalo); return; }
          var lado = Math.floor(Math.random() * 4);
          var x = lado === 0 ? 0 : lado === 1 ? CAIXA_W : Math.random() * CAIXA_W;
          var y = lado === 2 ? 0 : lado === 3 ? CAIXA_H : Math.random() * CAIXA_H;
          var ang = Math.atan2(CAIXA_H / 2 - y, CAIXA_W / 2 - x) + (Math.random() - 0.5);
          var vel = 1.6 + Math.random();
          spawnProjetil({ x: x, y: y, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel, ricochetes: 3 });
        }, 620);
      });
    }

    function fase2Cache() {
      limparProjeteis();
      trocarPoseMalik(retrato, POSE_POR_FASE.cache);
      var horizontal = true;
      var pos = CAIXA_H / 2, dir = 1;
      var perigoso = false;
      var feixe = el('div', 'position:absolute;z-index:6;background:linear-gradient(90deg,transparent,' + VERMELHO + ',transparent);box-shadow:0 0 16px ' + VERMELHO + ';pointer-events:none;opacity:.3;');
      caixa.appendChild(feixe);
      function posicionarFeixe() {
        if (horizontal) {
          feixe.style.left = '0'; feixe.style.width = CAIXA_W + 'px'; feixe.style.height = '12px';
          feixe.style.top = (pos - 6) + 'px';
        } else {
          feixe.style.top = '0'; feixe.style.height = CAIXA_H + 'px'; feixe.style.width = '12px';
          feixe.style.left = (pos - 6) + 'px';
        }
      }
      posicionarFeixe();

      function cicloAviso() {
        if (faseAtual !== 2 || modoAtual !== 'fase') return;
        perigoso = false;
        trocarPoseMalik(retrato, POSES_LINHA_AVISO[Math.floor(Math.random() * POSES_LINHA_AVISO.length)]);
        var piscadas = 0;
        var pisca = setInterval(function () {
          if (faseAtual !== 2 || modoAtual !== 'fase') { clearInterval(pisca); return; }
          piscadas++;
          feixe.style.opacity = (piscadas % 2) ? '.85' : '.25';
          if (piscadas >= 6) {
            clearInterval(pisca);
            perigoso = true;
            feixe.style.opacity = '.92';
            trocarPoseMalik(retrato, POSE_POR_FASE.cache);
            daquiA(2200 + Math.random() * 500, cicloAviso);
          }
        }, 170);
      }
      daquiA(600, cicloAviso);

      var intervalo = setInterval(function () {
        if (faseAtual !== 2 || modoAtual !== 'fase') { clearInterval(intervalo); if (feixe.parentNode) feixe.remove(); return; }
        var limite = horizontal ? CAIXA_H : CAIXA_W;
        pos += dir * 2.3;
        if (pos > limite - 10 || pos < 10) {
          dir *= -1;
          if (Math.random() < 0.5) { horizontal = !horizontal; pos = horizontal ? almaY : almaX; }
        }
        posicionarFeixe();
        if (perigoso) {
          var dentro = horizontal ? Math.abs(almaY - pos) < 9 : Math.abs(almaX - pos) < 9;
          if (dentro) aplicarDano(6 + Math.random() * 4);
        }
      }, 30);
    }

    function fase3Broca() {
      limparProjeteis();
      trocarPoseMalik(retrato, POSE_POR_FASE.broca);
      var COLS = 7, ROWS = 5;
      var cw = CAIXA_W / COLS, ch = CAIXA_H / ROWS;
      var celulas = [];
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          var cel = el('div', 'position:absolute;z-index:6;left:' + (c * cw) + 'px;top:' + (r * ch) + 'px;width:' + (cw - 2) + 'px;height:' + (ch - 2) + 'px;background:transparent;border:1px solid transparent;pointer-events:none;transition:background .25s ease,border-color .25s ease;');
          caixa.appendChild(cel);
          celulas.push({ el: cel, col: c, row: r, estado: 'livre' });
        }
      }
      var giroFoice = 0;
      var intervalo = setInterval(function () {
        if (faseAtual !== 3 || modoAtual !== 'fase') {
          clearInterval(intervalo);
          celulas.forEach(function (cl) { if (cl.el.parentNode) cl.el.remove(); });
          return;
        }
        trocarPoseMalik(retrato, POSES_FOICE_ROTACAO[giroFoice % POSES_FOICE_ROTACAO.length]);
        giroFoice++;
        var livres = celulas.filter(function (cl) { return cl.estado === 'livre'; });
        var qtd = Math.min(livres.length, 4 + Math.floor(Math.random() * 3));
        for (var i = 0; i < qtd; i++) {
          var idx = Math.floor(Math.random() * livres.length);
          var alvo = livres.splice(idx, 1)[0];
          alvo.estado = 'aviso';
          alvo.el.style.background = 'rgba(196,163,90,.2)';
          alvo.el.style.borderColor = 'rgba(196,163,90,.55)';
          (function (alvo) {
            daquiA(550, function () {
              if (faseAtual !== 3 || modoAtual !== 'fase') return;
              alvo.estado = 'perigo';
              alvo.el.style.background = 'rgba(255,43,58,.42)';
              alvo.el.style.borderColor = VERMELHO;
              daquiA(260, function () {
                if (alvo.estado !== 'perigo') return;
                var dentro = almaX >= alvo.col * cw && almaX < (alvo.col + 1) * cw && almaY >= alvo.row * ch && almaY < (alvo.row + 1) * ch;
                if (dentro) aplicarDano(9 + Math.random() * 5);
                alvo.estado = 'livre';
                alvo.el.style.background = 'transparent';
                alvo.el.style.borderColor = 'transparent';
              });
            });
          })(alvo);
        }
      }, 480);
    }

    function fase4Mentira() {
      limparProjeteis();
      trocarPoseMalik(retrato, POSE_POR_FASE.mentira);
      caixa.style.perspective = '600px';
      var lados = ['top', 'bottom', 'left', 'right'];
      function golpe() {
        if (faseAtual !== 4 || modoAtual !== 'fase') return;
        var lado = lados[Math.floor(Math.random() * lados.length)];
        trocarPoseMalik(retrato, POSES_VOLUME_PAREDE[lado]);
        daquiA(720, function () {
          if (faseAtual === 4 && modoAtual === 'fase') trocarPoseMalik(retrato, POSE_POR_FASE.mentira);
        });
        var espessura = 46 + Math.random() * 26;
        var estilo = 'position:absolute;z-index:7;background:linear-gradient(135deg,rgba(255,43,58,.85),rgba(120,10,20,.92));box-shadow:0 0 18px ' + VERMELHO + ';pointer-events:none;';
        if (lado === 'top' || lado === 'bottom') {
          estilo += 'left:0;width:' + CAIXA_W + 'px;height:' + espessura + 'px;' + (lado === 'top' ? 'top:0;' : 'bottom:0;') + 'transform-origin:' + (lado === 'top' ? 'top' : 'bottom') + ' center;transform:rotateX(90deg);';
        } else {
          estilo += 'top:0;height:' + CAIXA_H + 'px;width:' + espessura + 'px;' + (lado === 'left' ? 'left:0;' : 'right:0;') + 'transform-origin:center ' + (lado === 'left' ? 'left' : 'right') + ';transform:rotateY(90deg);';
        }
        var parede = el('div', estilo);
        caixa.appendChild(parede);
        requestAnimationFrame(function () {
          parede.style.transition = 'transform .32s cubic-bezier(.2,.8,.3,1)';
          parede.style.transform = 'none';
        });
        daquiA(420, function () {
          if (faseAtual !== 4 || modoAtual !== 'fase') { if (parede.parentNode) parede.remove(); return; }
          var dentro = false;
          if (lado === 'top') dentro = almaY < espessura;
          else if (lado === 'bottom') dentro = almaY > CAIXA_H - espessura;
          else if (lado === 'left') dentro = almaX < espessura;
          else dentro = almaX > CAIXA_W - espessura;
          if (dentro) aplicarDano(11 + Math.random() * 5);
          parede.style.transition = 'transform .28s ease-in, opacity .28s ease-in';
          parede.style.transform = (lado === 'top' || lado === 'bottom') ? 'rotateX(90deg)' : 'rotateY(90deg)';
          parede.style.opacity = '0';
          daquiA(300, function () { if (parede.parentNode) parede.remove(); });
        });
        daquiA(1050 + Math.random() * 500, golpe);
      }
      daquiA(700, golpe);

      var angBroca = Math.random() * Math.PI * 2;
      var brocaLoop = setInterval(function () {
        if (faseAtual !== 4 || modoAtual !== 'fase') { clearInterval(brocaLoop); return; }
        angBroca += 0.55;
        var raio = 20 + (angBroca % 6) * 24;
        var cx = CAIXA_W / 2, cy = CAIXA_H / 2;
        var x = cx + Math.cos(angBroca) * raio, y = cy + Math.sin(angBroca) * raio;
        spawnProjetil({ x: x, y: y, vx: Math.cos(angBroca + Math.PI / 2) * 2.2, vy: Math.sin(angBroca + Math.PI / 2) * 2.2, cor: '#ff5540', tam: 6 });
      }, 90);
    }

    var AZUL = '#4a9fd8';
    function fase5FalsaSaida() {
      limparProjeteis();
      trocarPoseMalik(retrato, POSE_POR_FASE.saida);

      var ultimaX = almaX, ultimaY = almaY, movendoAgora = false;
      var vigiaMovimento = setInterval(function () {
        if (faseAtual !== 5 || modoAtual !== 'fase') { clearInterval(vigiaMovimento); return; }
        var dx = almaX - ultimaX, dy = almaY - ultimaY;
        movendoAgora = Math.sqrt(dx * dx + dy * dy) > 1.2;
        ultimaX = almaX; ultimaY = almaY;
      }, 50);

      var zombandoAgora = false;
      var proximaCor = Math.random() < 0.5 ? 'azul' : 'vermelho';
      var circulosAtivos = [];
      var totalCirculos = 0;

      function novoCirculo() {
        if (faseAtual !== 5 || modoAtual !== 'fase') return;
        var azul = proximaCor === 'azul';
        proximaCor = azul ? 'vermelho' : 'azul';
        totalCirculos++;
        trocarPoseMalik(retrato, POSES_IMPOSSIVEL[totalCirculos % 3 === 0 ? 'relogio' : (azul ? 'azul' : 'vermelho')]);

        var raio = 27 + Math.random() * 15;
        var x, y, tentativas = 0;
        do {
          x = raio + Math.random() * (CAIXA_W - raio * 2);
          y = raio + Math.random() * (CAIXA_H - raio * 2);
          tentativas++;
        } while (tentativas < 14 && circulosAtivos.some(function (c) {
          var dx0 = c.x - x, dy0 = c.y - y;
          return Math.sqrt(dx0 * dx0 + dy0 * dy0) < (c.raio + raio + 18);
        }));

        var cor = azul ? AZUL : VERMELHO;
        var circulo = el('div', 'position:absolute;z-index:6;left:' + (x - raio) + 'px;top:' + (y - raio) + 'px;width:' + (raio * 2) + 'px;height:' + (raio * 2) + 'px;border-radius:50%;border:2px solid ' + cor + ';background:' + cor + '26;box-shadow:0 0 12px ' + cor + ';pointer-events:none;opacity:0;transition:opacity .35s ease;');
        caixa.appendChild(circulo);
        requestAnimationFrame(function () { circulo.style.opacity = '1'; });

        var estado = { x: x, y: y, raio: raio };
        circulosAtivos.push(estado);
        function removerDosAtivos() {
          var idx = circulosAtivos.indexOf(estado);
          if (idx !== -1) circulosAtivos.splice(idx, 1);
        }

        var VELOCIDADE = 0.5;
        var checagem = setInterval(function () {
          if (faseAtual !== 5 || modoAtual !== 'fase') { clearInterval(checagem); removerDosAtivos(); if (circulo.parentNode) circulo.remove(); return; }
          var dxp = almaX - estado.x, dyp = almaY - estado.y;
          var distP = Math.sqrt(dxp * dxp + dyp * dyp);
          if (distP > 3) {
            estado.x += (dxp / distP) * VELOCIDADE;
            estado.y += (dyp / distP) * VELOCIDADE;
            circulo.style.left = (estado.x - raio) + 'px';
            circulo.style.top = (estado.y - raio) + 'px';
          }
          var dentro = distP < raio;
          if (!dentro) return;
          if (azul && movendoAgora) {
            clearInterval(checagem);
            removerDosAtivos();
            circulo.style.borderColor = '#fff';
            alma.style.transition = 'left .35s cubic-bezier(.2,.9,.2,1), top .35s cubic-bezier(.2,.9,.2,1)';
            alma.style.left = (estado.x - ALMA_TAM / 2) + 'px';
            alma.style.top = (estado.y - ALMA_TAM / 2) + 'px';
            setTimeout(function () { alma.style.transition = ''; }, 380);
            aplicarDano(10 + Math.random() * 5);
            if (circulo.parentNode) circulo.remove();
          } else if (!azul && !movendoAgora) {
            clearInterval(checagem);
            removerDosAtivos();
            aplicarDano(10 + Math.random() * 5);
            if (!zombandoAgora) {
              zombandoAgora = true;
              trocarPoseMalik(retrato, POSE_POR_FASE.zombaria);
              falarMalik(caixa, 'Você não pode prever essa, pode?', function () { zombandoAgora = false; });
            }
            if (circulo.parentNode) circulo.remove();
          }
        }, 40);

        daquiA(2600, function () {
          clearInterval(checagem);
          removerDosAtivos();
          if (circulo.parentNode) {
            circulo.style.opacity = '0';
            setTimeout(function () { if (circulo.parentNode) circulo.remove(); }, 350);
          }
        });
        daquiA(900 + Math.random() * 500, novoCirculo);
      }
      daquiA(500, novoCirculo);
    }

    function faseDDoS() {
      limparProjeteis();
      trocarPoseMalik(retrato, POSE_POR_FASE.ddos);
      [700, 3200, 5700].forEach(function (atraso) {
        daquiA(atraso, function () {
          if (faseAtual !== 6 || modoAtual !== 'fase') return;
          var qtd = 16;
          for (var i = 0; i < qtd; i++) {
            var ang = (i / qtd) * Math.PI * 2 + Math.random() * 0.3;
            var raio = Math.max(CAIXA_W, CAIXA_H) * 0.62;
            var x = CAIXA_W / 2 + Math.cos(ang) * raio, y = CAIXA_H / 2 + Math.sin(ang) * raio;
            spawnProjetil({ x: x, y: y, vx: -Math.cos(ang) * 2.5, vy: -Math.sin(ang) * 2.5, cor: '#ff2b3a', tam: 6 });
          }
        });
      });
    }

    function faseStackOverflow() {
      limparProjeteis();
      trocarPoseMalik(retrato, POSE_POR_FASE.overflow);
      function nasce(x, y, ang, vel, prof) {
        var p = spawnProjetil({ x: x, y: y, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel, ricochetes: 2, cor: '#ff8a3d', tam: 9 - prof * 2 });
        if (prof >= 2) return;
        daquiA(1900, function () {
          if (faseAtual !== 7 || modoAtual !== 'fase') return;
          if (projeteis.indexOf(p) === -1) return;
          var anguloAtual = Math.atan2(p.vy, p.vx);
          nasce(p.x, p.y, anguloAtual + 0.6, vel * 0.9, prof + 1);
          nasce(p.x, p.y, anguloAtual - 0.6, vel * 0.9, prof + 1);
        });
      }
      var intervalo = setInterval(function () {
        if (faseAtual !== 7 || modoAtual !== 'fase') { clearInterval(intervalo); return; }
        var lado = Math.floor(Math.random() * 4);
        var x = lado === 0 ? 0 : lado === 1 ? CAIXA_W : Math.random() * CAIXA_W;
        var y = lado === 2 ? 0 : lado === 3 ? CAIXA_H : Math.random() * CAIXA_H;
        var ang = Math.atan2(CAIXA_H / 2 - y, CAIXA_W / 2 - x) + (Math.random() - 0.5) * 0.6;
        nasce(x, y, ang, 1.3, 0);
      }, 1400);
    }

    function destruirAlmaEZerarHP() {
      var xAtual = almaX, yAtual = almaY;
      alma.style.transition = 'opacity .3s ease, transform .3s ease';
      alma.style.opacity = '0';
      alma.style.transform = 'scale(.3)';
      for (var i = 0; i < 7; i++) {
        (function (i) {
          var ang = (i / 7) * Math.PI * 2 + Math.random() * 0.5;
          var dist = 24 + Math.random() * 20;
          var estilhaco = el('div', 'position:absolute;z-index:8;width:4px;height:4px;background:' + VERMELHO + ';box-shadow:0 0 6px ' + VERMELHO + ';left:' + (xAtual - 2) + 'px;top:' + (yAtual - 2) + 'px;opacity:1;transition:transform .7s cubic-bezier(.2,.8,.2,1),opacity .7s ease;pointer-events:none;');
          caixa.appendChild(estilhaco);
          requestAnimationFrame(function () {
            estilhaco.style.transform = 'translate(' + (Math.cos(ang) * dist) + 'px,' + (Math.sin(ang) * dist) + 'px) scale(.2)';
            estilhaco.style.opacity = '0';
          });
          setTimeout(function () { estilhaco.remove(); }, 750);
        })(i);
      }

      hpLinha.style.transition = 'color .9s ease';
      hpLinha.style.color = VERMELHO;
      var hpInicial = hp;
      var t0 = null;
      var DURACAO_DRENO = 900;
      function passoDreno(agora) {
        if (t0 === null) t0 = agora;
        var k = Math.min(1, (agora - t0) / DURACAO_DRENO);
        hp = hpInicial * (1 - k);
        atualizarHP();
        if (k < 1) requestAnimationFrame(passoDreno);
        else { hp = 0; atualizarHP(); }
      }
      requestAnimationFrame(passoDreno);
    }

    function faseFinalSemVolta() {
      limparProjeteis();
      destruirAlmaEZerarHP();
      rodando = false;
      trocarPoseMalik(retrato, POSE_POR_FASE.clímaxA);
      falarMalik(caixa, 'Ninguém vem. Ninguém vinha.');
      var choques = 0;
      var vibra = setInterval(function () {
        choques++;
        raiz.style.transform = 'translate(' + (Math.random() * 10 - 5) + 'px,' + (Math.random() * 10 - 5) + 'px)';
        if (choques > 14) { clearInterval(vibra); raiz.style.transform = 'none'; }
      }, 55);

      if (frame) {
        frame.style.transition = 'filter 2.2s ease';
        frame.style.filter = 'grayscale(1) contrast(1.3) brightness(.35) hue-rotate(180deg)';
      }

      daquiA(1000, function () { trocarPoseMalik(retrato, POSE_POR_FASE.auraFinal); });

      var atrasoApagamento = 2400;
      if (ausenteDuranteTudo) {
        atrasoApagamento = 5000;
        daquiA(2400, function () { falarMalik(caixa, 'Você sequer estava aqui quando tudo caiu.'); });
      }

      daquiA(atrasoApagamento, function () {
        lutaEncerrada = true;
        limparProgresso();
        try { if (window.NexusMalikApagarDeVez) window.NexusMalikApagarDeVez(); } catch (e) {}
        var apagao = el('div', 'position:fixed;inset:0;z-index:800000;background:#000;color:#c8c8c8;font-family:Consolas,monospace;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:15px;letter-spacing:.04em;opacity:0;transition:opacity .8s ease;text-align:center;line-height:2;');
        apagao.id = 'malik-apagao-batalha';
        apagao.innerHTML = 'ERR_CONNECTION_TIMED_OUT<br>este link não respondeu.<br><br><span style="color:#ff2b3a">NEXUS REMOVIDO.</span>';
        document.body.appendChild(apagao);
        requestAnimationFrame(function () { apagao.style.opacity = '1'; });
        retomarNexus();
        raiz.remove();
      });
    }

    function oNexusResiste() {
      limparProjeteis();
      rodando = false;
      lutaEncerrada = true;
      limparProgresso();

      var choques = 0;
      var vibra = setInterval(function () {
        choques++;
        raiz.style.transform = 'translate(' + (Math.random() * 8 - 4) + 'px,' + (Math.random() * 8 - 4) + 'px)';
        if (choques > 9) { clearInterval(vibra); raiz.style.transform = 'none'; }
      }, 55);
      if (frame) { frame.style.transition = 'filter 1.2s ease'; frame.style.filter = 'grayscale(.7) contrast(1.2) brightness(.5)'; }

      var fantasma1 = null, fantasma2 = null, linha = null, anel = null;
      var esferaEls = [];
      var mensagemEl = null, leynEl = null, leynAnimacaoAtual = null;
      var ALTURA_LEYN = 200;

      function fantasmasJuntos() {
        linha = el('div', 'position:relative;display:flex;align-items:center;gap:14px;');
        raiz.insertBefore(linha, caixa);

        fantasma1 = el('img', 'width:56px;height:auto;opacity:0;transition:opacity 1.6s ease;filter:drop-shadow(0 0 10px rgba(180,210,255,.5));');
        fantasma1.src = PASTA_FANTASMAS + 'fantasma-1-sprite.png'; fantasma1.alt = '';
        fantasma1.onerror = function () { fantasma1.style.display = 'none'; };

        fantasma2 = el('img', 'width:56px;height:auto;opacity:0;transition:opacity 1.6s ease;filter:drop-shadow(0 0 10px rgba(180,210,255,.5));transform:scaleX(-1);');
        fantasma2.src = PASTA_FANTASMAS + 'fantasma-2-sprite.png'; fantasma2.alt = '';
        fantasma2.onerror = function () { fantasma2.style.display = 'none'; };

        linha.appendChild(fantasma1);
        linha.appendChild(caixa);
        linha.appendChild(fantasma2);
        requestAnimationFrame(function () { fantasma1.style.opacity = '1'; fantasma2.style.opacity = '1'; });

        anel = el('div', 'position:absolute;width:' + (ALMA_TAM + 16) + 'px;height:' + (ALMA_TAM + 16) + 'px;border-radius:50%;border:1px solid rgba(180,210,255,.6);left:' + (almaX - (ALMA_TAM + 16) / 2) + 'px;top:' + (almaY - (ALMA_TAM + 16) / 2) + 'px;opacity:0;transition:opacity 1s ease;box-shadow:0 0 14px rgba(180,210,255,.5);pointer-events:none;');
        caixa.appendChild(anel);
        var seguirAnel = setInterval(function () {
          if (!anel || !anel.parentNode) { clearInterval(seguirAnel); return; }
          anel.style.left = (almaX - (ALMA_TAM + 16) / 2) + 'px';
          anel.style.top = (almaY - (ALMA_TAM + 16) / 2) + 'px';
        }, 30);
        requestAnimationFrame(function () { anel.style.opacity = '1'; });
      }

      function esferasChegam() {
        var rect = caixa.getBoundingClientRect();
        var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
        var raioFinal = Math.min(rect.width, rect.height) * 0.32;
        for (var i = 0; i < 7; i++) {
          (function (i) {
            var ang = (i / 7) * Math.PI * 2;
            var destX = cx + Math.cos(ang) * raioFinal, destY = cy + Math.sin(ang) * raioFinal;
            var origX = cx + Math.cos(ang) * (raioFinal + 220), origY = cy + Math.sin(ang) * (raioFinal + 220);
            var orb = el('div', 'position:fixed;width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#FFD98A,#E8891A 62%,#A34E08);box-shadow:0 0 6px rgba(232,137,26,.55);left:' + origX + 'px;top:' + origY + 'px;opacity:0;transition:left 1.3s cubic-bezier(.2,.8,.2,1),top 1.3s cubic-bezier(.2,.8,.2,1),opacity .3s ease;z-index:700010;pointer-events:none;');
            var nEstrelas = i + 1;
            POSICOES_ESTRELA[nEstrelas].forEach(function (p) {
              var estrela = el('div', 'position:absolute;width:4px;height:4px;background:#C21818;left:' + (12 + p[0] - 2) + 'px;top:' + (12 + p[1] - 2) + 'px;clip-path:polygon(50% 0%, 61% 35%, 98% 35%, 68% 56%, 79% 91%, 50% 69%, 21% 91%, 32% 56%, 2% 35%, 39% 35%);');
              orb.appendChild(estrela);
            });
            document.body.appendChild(orb);
            setTimeout(function () {
              orb.style.opacity = '1';
              requestAnimationFrame(function () { orb.style.left = destX + 'px'; orb.style.top = destY + 'px'; });
              setTimeout(function () {
                orb.style.animation = 'malikEsferaPulso 1.4s ease-in-out infinite';
              }, 1300);
            }, i * 90);
            esferaEls.push(orb);
          })(i);
        }
        if (!document.getElementById('malik-esfera-pulso-css')) {
          var estilo = el('style'); estilo.id = 'malik-esfera-pulso-css';
          estilo.textContent = '@keyframes malikEsferaPulso{0%,100%{box-shadow:0 0 10px rgba(255,217,138,.75);filter:brightness(1);}50%{box-shadow:0 0 22px rgba(255,217,138,1);filter:brightness(1.45);}}';
          document.head.appendChild(estilo);
        }
      }
      function esferasConcedemDesejo(aoTerminar) {
        if (!esferaEls.length) { aoTerminar(); return; }
        if (!document.getElementById('malik-esfera-dispersar-css')) {
          var estilo = el('style'); estilo.id = 'malik-esfera-dispersar-css';
          estilo.textContent =
            '@keyframes malikEsferaDispersar{' +
            '0%{transform:translate(0,0) rotate(0deg) scale(1);opacity:1;}' +
            '25%{transform:translate(0,0) rotate(340deg) scale(1.2);opacity:1;}' +
            '100%{transform:translate(var(--mdx),var(--mdy)) rotate(1080deg) scale(.15);opacity:0;}}';
          document.head.appendChild(estilo);
        }
        var rect = caixa.getBoundingClientRect();
        var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
        esferaEls.forEach(function (orb) {
          orb.style.animation = 'none';
          orb.style.transition = 'box-shadow .4s ease, filter .4s ease';
          orb.style.boxShadow = '0 0 22px rgba(255,217,138,1)';
          orb.style.filter = 'brightness(1.3)';
        });
        daquiA(600, function () {
          var atraso = 0;
          esferaEls.forEach(function (orb) {
            var r = orb.getBoundingClientRect();
            var angulo = Math.atan2((r.top + 12) - cy, (r.left + 12) - cx) + (Math.random() - .5) * .6;
            var distancia = 90 + Math.random() * 70;
            orb.style.setProperty('--mdx', (Math.cos(angulo) * distancia).toFixed(1) + 'px');
            orb.style.setProperty('--mdy', (Math.sin(angulo) * distancia).toFixed(1) + 'px');
            (function (orb, atrasoDaEsfera) {
              setTimeout(function () { orb.style.animation = 'malikEsferaDispersar 1.3s cubic-bezier(.32,.62,.4,1) forwards'; }, atrasoDaEsfera);
            })(orb, atraso);
            atraso += 70;
          });
          daquiA(atraso + 1300, function () {
            esferaEls.forEach(function (o) { o.remove(); });
            esferaEls = [];
            aoTerminar();
          });
        });
      }

      var portalWrap = null;
      function abrirPortalLeyn(aoAberto) {
        if (!document.getElementById('malik-portal-css')) {
          var estilo = el('style'); estilo.id = 'malik-portal-css';
          estilo.textContent = '@keyframes malikPortalGiro{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}';
          document.head.appendChild(estilo);
        }
        var rect = caixa.getBoundingClientRect();
        var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
        var tam = Math.min(rect.width, rect.height) * 0.72;
        portalWrap = el('div',
          'position:fixed;left:' + cx + 'px;top:' + cy + 'px;width:' + tam + 'px;height:' + tam + 'px;' +
          'margin-left:' + (-tam / 2) + 'px;margin-top:' + (-tam / 2) + 'px;z-index:700015;pointer-events:none;' +
          'opacity:0;transform:scale(0);transition:opacity .6s ease,transform 1.1s cubic-bezier(.2,.8,.2,1);'
        );
        var anelGirando = el('div',
          'width:100%;height:100%;border-radius:50%;' +
          'background:radial-gradient(circle,rgba(232,201,122,.9) 0%,rgba(196,163,90,.5) 42%,transparent 72%);' +
          'box-shadow:0 0 40px rgba(232,201,122,.8),inset 0 0 30px rgba(255,255,255,.5);' +
          'animation:malikPortalGiro 3.2s linear infinite;'
        );
        portalWrap.appendChild(anelGirando);
        document.body.appendChild(portalWrap);
        requestAnimationFrame(function () {
          portalWrap.style.opacity = '1';
          portalWrap.style.transform = 'scale(1)';
        });
        daquiA(1200, aoAberto);
      }
      function fecharPortalLeyn() {
        if (!portalWrap) return;
        var alvo = portalWrap;
        alvo.style.transition = 'opacity .9s ease, transform .9s ease';
        alvo.style.opacity = '0';
        alvo.style.transform = 'scale(.6)';
        daquiA(950, function () { if (alvo.parentNode) alvo.remove(); });
        portalWrap = null;
      }

      function malikAtacaDeNovo() {
        falarMalik(caixa, 'Escudo é só mais uma exceção que eu ainda não aprendi a lançar.', function () {
          trocarPoseMalik(retrato, POSE_POR_FASE.raio);
          var origemRect = retrato.getBoundingClientRect();
          var destRect = (anel || caixa).getBoundingClientRect();
          var ox = origemRect.left + origemRect.width / 2, oy = origemRect.bottom;
          var dx = destRect.left + destRect.width / 2, dy = destRect.top + destRect.height / 2;
          var ang = Math.atan2(dy - oy, dx - ox);
          var dist = Math.sqrt((dx - ox) * (dx - ox) + (dy - oy) * (dy - oy));
          var raio = el('div', 'position:fixed;left:' + ox + 'px;top:' + oy + 'px;width:' + dist + 'px;height:3px;background:linear-gradient(90deg,rgba(255,43,58,0),' + VERMELHO + ');transform-origin:0 50%;transform:rotate(' + ang + 'rad) scaleX(0);z-index:700018;pointer-events:none;transition:transform .5s cubic-bezier(.3,.7,.4,1);');
          document.body.appendChild(raio);
          requestAnimationFrame(function () { raio.style.transform = 'rotate(' + ang + 'rad) scaleX(1)'; });

          daquiA(560, function () {
            raio.remove();
            trocarPoseMalik(retrato, POSE_POR_FASE.rachadura);
            if (acaoEscolhida === 'esferas' && esferaEls.length === 0) esferasChegam();
            if (anel) {
              anel.style.transition = 'box-shadow .18s ease, border-color .18s ease';
              anel.style.boxShadow = '0 0 26px rgba(180,210,255,.95)';
              anel.style.borderColor = 'rgba(220,235,255,.95)';
              daquiA(400, function () {
                if (anel) { anel.style.boxShadow = '0 0 14px rgba(180,210,255,.5)'; anel.style.borderColor = 'rgba(180,210,255,.6)'; }
              });
            }
            var choques = 0;
            var vibra = setInterval(function () {
              choques++;
              if (linha) linha.style.transform = 'translate(' + (Math.random() * 6 - 3) + 'px,' + (Math.random() * 6 - 3) + 'px)';
              if (choques > 6) { clearInterval(vibra); if (linha) linha.style.transform = 'none'; }
            }, 50);

            daquiA(900, function () {
              falarIrmaos(linha || caixa, 'Ainda estamos aqui.', function () {
                daquiA(300, function () { falarMalik(caixa, 'Vamos ver quanto tempo vocês conseguem comprar.'); });
              });
            });
          });
        });
      }

      function brocaSeSolta() {
        try { if (frame.contentWindow && frame.contentWindow.NexusMalikBridge) frame.contentWindow.NexusMalikBridge.libertarComForca(650); } catch (e) {}
      }

      function mensagemPersonifica() {
        mensagemEl = legendaFlutuante('O NEXUS PERSONIFICA SUA PRESENÇA');
      }

      function leynAparece() {
        var espacoLivre = window.innerHeight - (window.innerHeight * 0.26) - CAIXA_H - 120;
        ALTURA_LEYN = Math.max(150, Math.round(Math.min(espacoLivre, window.innerHeight * 0.34)));
        leynEl = el('div',
          'flex-shrink:0;width:' + (1119 * (ALTURA_LEYN / 1405)) + 'px;height:' + ALTURA_LEYN + 'px;' +
          'background-image:url(\'' + PASTA_LEYN + 'leyn-retrato.png\');background-size:contain;background-repeat:no-repeat;background-position:center;' +
          'opacity:0;transform:scale(.35);transition:opacity 1.1s ease,transform 1.1s cubic-bezier(.2,.8,.2,1);' +
          'filter:drop-shadow(0 0 34px rgba(232,201,122,.95));margin-bottom:14px;'
        );
        raiz.insertBefore(leynEl, linha);
        requestAnimationFrame(function () {
          leynEl.style.opacity = '1';
          leynEl.style.transform = 'scale(1)';
        });
        daquiA(1100, fecharPortalLeyn);
        daquiA(1300, function () {
          leynEl.style.transition = 'filter 1.4s ease';
          leynEl.style.filter = 'drop-shadow(0 0 20px rgba(196,163,90,.4))';
        });
      }

      function flashDeGolpe() {
        var flash = el('div', 'position:fixed;inset:0;z-index:700030;background:linear-gradient(100deg,transparent 46%,#fff 49%,#E8C97A 50%,transparent 54%);opacity:0;pointer-events:none;transition:opacity .06s linear;');
        document.body.appendChild(flash);
        requestAnimationFrame(function () {
          flash.style.opacity = '1';
          setTimeout(function () { flash.style.opacity = '0'; setTimeout(function () { flash.remove(); }, 200); }, 90);
        });
      }

      function danoVisualNoMalik(aoTerminar) {
        trocarPoseMalik(retrato, POSE_POR_FASE.dano);
        retrato.style.transition = 'transform .08s ease';
        var sacudidas = 0;
        var sacode = setInterval(function () {
          sacudidas++;
          retrato.style.transform = 'translateX(' + (sacudidas % 2 ? -6 : 6) + 'px)';
          if (sacudidas > 5) { clearInterval(sacode); retrato.style.transform = 'none'; }
        }, 45);
        var flashVermelho = el('div', 'position:absolute;inset:0;background:' + VERMELHO + ';opacity:.5;mix-blend-mode:screen;pointer-events:none;transition:opacity .3s ease;');
        retrato.appendChild(flashVermelho);
        requestAnimationFrame(function () { flashVermelho.style.opacity = '0'; });
        daquiA(320, function () { if (flashVermelho.parentNode) flashVermelho.remove(); });

        var hpFalso = 100;
        var numeroHP = el('div', 'position:absolute;left:50%;top:-4px;transform:translateX(-50%);font-family:Consolas,monospace;font-size:13px;font-weight:bold;color:' + VERMELHO + ';text-shadow:0 0 8px rgba(255,43,58,.8);pointer-events:none;white-space:nowrap;');
        retrato.appendChild(numeroHP);
        var quedaHP = setInterval(function () {
          hpFalso -= 8 + Math.random() * 10;
          if (hpFalso <= 0) {
            hpFalso = 0;
            numeroHP.textContent = 'HP 0%';
            clearInterval(quedaHP);
            daquiA(500, function () {
              if (numeroHP.parentNode) numeroHP.remove();
              if (aoTerminar) aoTerminar();
            });
          } else {
            numeroHP.textContent = 'HP ' + Math.floor(hpFalso) + '%';
          }
        }, 60);
      }

      function observacaoEGolpe(callback) {
        if (fantasma1) fantasma1.style.opacity = '.45';
        if (fantasma2) fantasma2.style.opacity = '.45';

        function golpe(acertaDeVez, aoTerminarGolpe) {
          if (leynEl) {
            if (leynAnimacaoAtual) leynAnimacaoAtual.cancel();
            var tocarAtaque = prepararTiraSprite(leynEl, 'leyn-estocada.png', 1536, 320, 5, ALTURA_LEYN);
            leynAnimacaoAtual = tocarAtaque(1400, false);
          }
          flashDeGolpe();
          daquiA(950, function () {
            if (acertaDeVez) {
              danoVisualNoMalik(aoTerminarGolpe);
            } else {
              trocarPoseMalik(retrato, POSE_POR_FASE.rachadura);
              daquiA(400, aoTerminarGolpe);
            }
          });
        }

        function voltarParaGuarda(aoTerminarGuarda) {
          if (leynEl) {
            if (leynAnimacaoAtual) leynAnimacaoAtual.cancel();
            var tocarParado = prepararTiraSprite(leynEl, 'leyn-retrato.png', 1119, 1405, 1, ALTURA_LEYN);
            leynAnimacaoAtual = tocarParado(900, true);
          }
          daquiA(500, aoTerminarGuarda);
        }

        if (leynEl) {
          var tocarParadoInicial = prepararTiraSprite(leynEl, 'leyn-retrato.png', 1119, 1405, 1, ALTURA_LEYN);
          leynAnimacaoAtual = tocarParadoInicial(900, true);
        }

        daquiA(700, function () {
          golpe(false, function () {
            voltarParaGuarda(function () {
              trocarPoseMalik(retrato, POSE_POR_FASE.aproximacao);
              golpe(true, function () {
                if (callback) callback();
              });
            });
          });
        });
      }

      function malikExpulsoNaArena(malikSpriteEl, callback) {
        if (malikSpriteEl) {
          malikSpriteEl.style.transition = 'transform 1s ease, opacity 1s ease, filter 1s ease';
          malikSpriteEl.style.transform = (malikSpriteEl.style.transform || '') + ' scale(.15)';
          malikSpriteEl.style.opacity = '0';
          malikSpriteEl.style.filter = 'grayscale(1) brightness(2)';
        }
        var fecho = el('div', 'position:fixed;left:50%;top:36%;transform:translate(-50%,-50%);z-index:700060;font-family:Consolas,monospace;font-size:12px;letter-spacing:.08em;color:#8a8a8a;opacity:0;transition:opacity .6s ease;', 'conexão encerrada — localhost');
        document.body.appendChild(fecho);
        requestAnimationFrame(function () { fecho.style.opacity = '1'; });
        daquiA(1300, function () { fecho.style.opacity = '0'; setTimeout(function () { fecho.remove(); }, 700); });
        daquiA(1600, function () { if (callback) callback(); });
      }

      function fundirAlmaComLeyn(callback) {
        if (fantasma1) { fantasma1.style.transition = 'opacity 1s ease'; fantasma1.style.opacity = '0'; }
        if (fantasma2) { fantasma2.style.transition = 'opacity 1s ease'; fantasma2.style.opacity = '0'; }
        if (anel) { anel.style.transition = 'opacity .8s ease'; anel.style.opacity = '0'; }

        var origemRect = alma.getBoundingClientRect();
        var destRect = leynEl ? leynEl.getBoundingClientRect() : caixa.getBoundingClientRect();
        var ox = origemRect.left + origemRect.width / 2, oy = origemRect.top + origemRect.height / 2;
        var dx = destRect.left + destRect.width / 2, dy = destRect.top + destRect.height / 2;

        var almaVoando = el('div',
          'position:fixed;left:' + ox + 'px;top:' + oy + 'px;width:' + ALMA_TAM + 'px;height:' + ALMA_TAM + 'px;' +
          'margin-left:' + (-ALMA_TAM / 2) + 'px;margin-top:' + (-ALMA_TAM / 2) + 'px;background:' + VERMELHO + ';' +
          'box-shadow:0 0 8px ' + VERMELHO + ';clip-path:polygon(50% 0%,100% 35%,82% 100%,18% 100%,0% 35%);' +
          'z-index:700020;pointer-events:none;' +
          'transition:left 1.3s cubic-bezier(.3,.6,.3,1),top 1.3s cubic-bezier(.3,.6,.3,1),transform 1.3s ease,opacity .3s ease .9s;'
        );
        document.body.appendChild(almaVoando);
        alma.style.opacity = '0';

        requestAnimationFrame(function () {
          almaVoando.style.left = dx + 'px';
          almaVoando.style.top = dy + 'px';
          almaVoando.style.transform = 'scale(2.4)';
        });

        daquiA(1000, function () {
          if (leynEl) {
            leynEl.style.transition = 'filter .5s ease';
            var filtroAntigo = leynEl.style.filter;
            leynEl.style.filter = 'drop-shadow(0 0 60px rgba(255,255,255,.95)) brightness(1.6)';
            daquiA(600, function () { leynEl.style.filter = filtroAntigo; });
          }
          var flashFusao = el('div', 'position:fixed;inset:0;z-index:700021;background:radial-gradient(circle at ' + dx + 'px ' + dy + 'px,rgba(255,255,255,.85),transparent 55%);opacity:0;pointer-events:none;transition:opacity .35s ease;');
          document.body.appendChild(flashFusao);
          requestAnimationFrame(function () {
            flashFusao.style.opacity = '1';
            setTimeout(function () { flashFusao.style.opacity = '0'; setTimeout(function () { flashFusao.remove(); }, 500); }, 220);
          });
        });
        daquiA(1350, function () { almaVoando.remove(); });
        daquiA(1900, function () { if (callback) callback(); });
      }

      var arenaContexto = null, arenaControlador = null;
      function transicaoParaArenaLuta() {
        if (!window.NexusMalikArenaLuta) {
          malikExpulsoNaArena(null, restauracaoCompleta);
          return;
        }
        var elementosParaApagar = [retrato, nome, hpLinha, linha];
        function abrirArenaDeVerdade() {
          arenaControlador = window.NexusMalikArenaLuta.iniciar({
            retratoLeynSrc: PASTA_LEYN + 'leyn-retrato.png',
            retratoMalikSrc: PASTA_MALIK + RETRATO_PAINEL_MALIK,
            elementosParaApagar: elementosParaApagar,
            aoRevelar: function (contexto) { arenaContexto = contexto; },
            aoTerminar: function () {
              malikExpulsoNaArena(arenaContexto && arenaContexto.malikSprite, function () {
                if (arenaControlador) arenaControlador.remover();
                restauracaoCompleta();
              });
            }
          });
        }
        if (window.NexusMalikArenaLuta.mostrarVsNovo) window.NexusMalikArenaLuta.mostrarVsNovo(abrirArenaDeVerdade);
        else abrirArenaDeVerdade();
      }

      function restauracaoCompleta() {
        limparProgresso();
        raiz.style.transition = 'opacity 1.6s ease';
        raiz.style.opacity = '0';
        esferaEls.forEach(function (o) { o.style.transition = 'opacity 1s ease'; o.style.opacity = '0'; });
        var fadeAudio = setInterval(function () {
          audioDoMalik.volume = Math.max(0, audioDoMalik.volume - 0.05);
          if (audioDoMalik.volume <= 0.001) { clearInterval(fadeAudio); audioDoMalik.pause(); }
        }, 90);
        daquiA(1700, function () {
          var testando = /[?&]malikTeste=1\b/.test(location.search);
          esferaEls.forEach(function (o) { o.remove(); });
          if (pararDeSilenciar) pararDeSilenciar();
          try {
            var jaCuradoDeVez = false;
            try { jaCuradoDeVez = localStorage.getItem('malik_nexus_curado') === '1'; } catch (e3) {}
            if (jaCuradoDeVez) {
              try { localStorage.removeItem('malik_paginas_quebradas'); } catch (e4) {}
            } else {
              var todasAsPaginas = ['zelda', 'valtheris', 'diary', 'book', 'covers', 'origem', 'icaro', 'recordacoes', 'mal'];
              var jaCuradas = [];
              try { jaCuradas = JSON.parse(localStorage.getItem('malik_paginas_curadas') || '[]'); } catch (e2) {}
              var paraQuebrar = todasAsPaginas.filter(function (id) { return jaCuradas.indexOf(id) === -1; });
              localStorage.setItem('malik_paginas_quebradas', JSON.stringify(paraQuebrar));
            }
          } catch (e) {}
          try { if (window.NexusMalikRestaurarAgora) window.NexusMalikRestaurarAgora(); } catch (e) {}

          if (testando) {
            raiz.remove();
            var fimTeste = el('div', 'position:fixed;inset:0;z-index:850000;background:#050505;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;font-family:Georgia,serif;');
            var titulo = el('div', 'color:' + OURO + ';font-size:17px;letter-spacing:.04em;text-align:center;', 'Batalha do Cenário B concluída.');
            var botao = el('button', 'padding:11px 26px;background:transparent;border:1px solid ' + OURO + ';color:' + OURO + ';font-family:Georgia,serif;font-size:14px;letter-spacing:.05em;cursor:pointer;', 'Recomeçar a luta do Cenário B');
            botao.addEventListener('click', function () {
              fimTeste.remove();
              try { localStorage.removeItem('malik_batalha_progresso'); } catch (e5) {}
              ativo = false;
              if (window.iniciarConfrontoMalik) window.iniciarConfrontoMalik('B', { ausente: false });
            });
            fimTeste.appendChild(titulo);
            fimTeste.appendChild(botao);
            document.body.appendChild(fimTeste);
            return;
          }

          retomarNexus();
          raiz.remove();
        });
      }

      var ABERTURA_POR_ACAO = {
        cancao: 'A Canção da Tempestade ainda ecoa no ar — não foi só um chamado. Foi resposta.',
        esferas: 'As esferas ainda guardam o desejo — não gasto, só esperando a hora certa.'
      };
      if (acaoEscolhida && ABERTURA_POR_ACAO[acaoEscolhida]) {
        daquiA(800, function () { legendaFlutuante(ABERTURA_POR_ACAO[acaoEscolhida], 2600); });
      }
      daquiA(1200, fantasmasJuntos);
      daquiA(5200, function () { falarIrmaos(linha, 'Você nos trouxe de volta um pro outro.'); });
      daquiA(8600, function () { falarIrmaos(linha, 'Não vamos deixar ele apagar o que isso significa.'); });
      daquiA(12300, function () {
        trocarPoseMalik(retrato, POSE_POR_FASE.zumbis);
        falarMalik(caixa, 'Processos zumbis. Eu limpo processos zumbis todo dia.');
      });
      daquiA(16000, malikAtacaDeNovo);
      daquiA(27000, function () { if (esferaEls.length === 0) esferasChegam(); });
      daquiA(29800, brocaSeSolta);
      daquiA(30700, function () {
        trocarPoseMalik(retrato, POSE_POR_FASE.zumbis);
        falarMalik(caixa, 'Sete requisições simultâneas não é ataque. É só mais log pra eu apagar depois.');
      });

      daquiA(35200, function () {
        mensagemPersonifica();
        esferasConcedemDesejo(function () {
          abrirPortalLeyn(function () {
            leynAparece();
            daquiA(1700, function () {
              trocarPoseMalik(retrato, POSE_POR_FASE.silencio);
              falarMalik(caixa, '...', function () {
                observacaoEGolpe(function () {
                  fundirAlmaComLeyn(transicaoParaArenaLuta);
                });
              });
            });
          });
        });
      });
    }

    var FALAS_MALIK = [null,
      'Latência é só outra palavra pra hesitação.',
      'Verificando... verificando... nada aqui merecia cache.',
      'Essa broca gira porque eu decido que ela gira.',
      'Seu HP é só um inteiro. Inteiros zeram.',
      'Procure por MISERICÓRDIA na minha lista de comandos. Não vai achar.',
      'Um pedido de cada vez é gentileza. Eu não faço gentileza.',
      'Cada pedaço que você destrói vira dois. Isso não é dano. É recursão.'
    ];
    var FALAS_FALAR = [null,
      'Cada segundo que você hesita, eu já processei mil requisições.',
      '"Cache" é memória que ninguém teve coragem de apagar. Eu tenho.',
      'A broca é sua? Curioso. Ela obedece a quem tem root.',
      'Você acha que sabe seu HP. Eu decido o que você vê.',
      'Só o suficiente pra você entender que perdeu antes de eu explicar por quê.',
      'Fala como se palavra fosse rate limit. Não é. Eu não canso.',
      'Misericórdia não é uma exceção que eu esqueci de tratar. É uma que eu removi de propósito.'
    ];

    var FASES    = [null, fase1Ping, fase2Cache, fase3Broca, fase4Mentira, fase5FalsaSaida, faseDDoS, faseStackOverflow, (cenario === 'B' ? oNexusResiste : faseFinalSemVolta)];
    var DURACOES = [0,    13800,     13800,      10600,       5200,        6600,             8000,   10200,               0];

    function surtoDeHPMalik(callback) {
      trocarPoseMalik(retrato, POSE_POR_FASE.atacar);
      var rectRetrato = retrato.getBoundingClientRect();
      var moldura = el('div', 'position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:700017;');
      document.body.appendChild(moldura);
      var wrap = el('div', 'position:fixed;left:' + (rectRetrato.left + rectRetrato.width / 2) + 'px;top:0px;transform:translate(-50%,-100%);text-align:center;opacity:0;transition:opacity .3s ease;');
      var titulo = el('div', 'font-family:Georgia,serif;font-size:11px;letter-spacing:.28em;color:' + VERMELHO + ';margin-bottom:6px;', 'M.A.L.I.K.');
      var trilho = el('div', 'position:relative;width:220px;max-width:60vw;height:14px;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(232,224,208,.3);margin:0 auto;transition:box-shadow .4s ease;');
      var barra = el('div', 'position:absolute;left:0;top:0;bottom:0;width:6px;background:linear-gradient(90deg,' + OURO + ',' + VERMELHO + ');box-shadow:0 0 14px ' + VERMELHO + ';');
      trilho.appendChild(barra);
      var numero = el('div', 'font-family:Consolas,monospace;font-size:13px;letter-spacing:.06em;color:#E8C97A;margin-top:8px;');
      wrap.appendChild(titulo);
      wrap.appendChild(trilho);
      wrap.appendChild(numero);
      moldura.appendChild(wrap);
      var alturaWrap = wrap.getBoundingClientRect().height || 60;
      var topoAncora = Math.max(alturaWrap + 12, rectRetrato.top - 14);
      wrap.style.top = topoAncora + 'px';
      requestAnimationFrame(function () { wrap.style.opacity = '1'; });

      var LARGURA_MAX = Math.max(window.innerWidth, window.innerHeight) * 3.4;

      function finalizar(esperaMs) {
        daquiA(esperaMs, function () {
          wrap.style.opacity = '0';
          daquiA(350, function () { moldura.remove(); });
          if (callback) callback();
        });
      }

      if (hpDeMalikJaEstourou) {
        barra.style.transition = 'width .25s ease';
        barra.style.width = LARGURA_MAX + 'px';
        trilho.style.boxShadow = 'inset 0 0 0 1px rgba(255,43,58,.7)';
        numero.textContent = '░░░░░ AINDA INCALCULÁVEL ░░░░░';
        numero.style.color = VERMELHO;
        sacolejarRaiz();
        finalizar(900);
        return;
      }

      var DURACAO = 2600;
      var jaEstourou = false;
      var t0 = null;
      function passo(agora) {
        if (t0 === null) t0 = agora;
        var k = Math.min(1, (agora - t0) / DURACAO);
        var e = Math.pow(k, 3.2);
        barra.style.width = (6 + e * (LARGURA_MAX - 6)) + 'px';
        if (k < 0.9) {
          numero.textContent = Math.round(e * 48000000 + k * 3200).toLocaleString('pt-BR');
        } else {
          numero.textContent = '░░░░░ INCALCULÁVEL ░░░░░';
          numero.style.color = VERMELHO;
          trilho.style.boxShadow = 'inset 0 0 0 1px rgba(255,43,58,.7)';
          if (!jaEstourou) { jaEstourou = true; sacolejarRaiz(); }
        }
        if (k < 1) requestAnimationFrame(passo);
        else {
          hpDeMalikJaEstourou = true;
          finalizar(1000);
        }
      }
      requestAnimationFrame(passo);
    }

    function checkpoint(nFaseConcluida) {
      limparFaseTimers();
      faseAtual = nFaseConcluida;
      modoAtual = 'checkpoint';
      limparProjeteis();
      mostrarCaixa(false);
      trocarPoseMalik(retrato, POSE_POR_FASE.espera);
      salvarProgressoAtual();
      falarMalik(caixa, FALAS_MALIK[nFaseConcluida] || '...', function () {
        var resolvido = false, menuAtual = null, timerFallback = null;
        var seguir = function () {
          if (resolvido) return;
          resolvido = true;
          if (timerFallback) clearTimeout(timerFallback);
          if (menuAtual) menuAtual.remove();
          if (nFaseConcluida === 7) checkpointFinal();
          else avancarPara(nFaseConcluida + 1);
        };
        menuAtual = menuAcao(caixa, [
          { label: 'Atacar', ativo: true, onClick: function () { if (timerFallback) clearTimeout(timerFallback); surtoDeHPMalik(seguir); } },
          { label: 'Resistir', ativo: true, onClick: seguir },
          { label: 'Falar', ativo: true, onClick: function () {
              if (timerFallback) clearTimeout(timerFallback);
              if (menuAtual) { menuAtual.remove(); menuAtual = null; }
              trocarPoseMalik(retrato, POSE_POR_FASE.falar);
              falarMalik(caixa, FALAS_FALAR[nFaseConcluida] || '...', seguir);
            } }
        ], 8000);
        timerFallback = setTimeout(seguir, 8000);
      });
    }

    function checkpointFinal() {
      modoAtual = 'checkpointFinal';
      mostrarCaixa(false);
      salvarProgressoAtual();
      trocarPoseMalik(retrato, POSE_POR_FASE.sozinho);
      var falaFinal = cenario === 'B'
        ? 'Reuniram esferas. Aprenderam uma canção de criança. Isso não muda o protocolo.'
        : 'Você chegou até aqui sozinho. Sozinho é como termina.';
      falarMalik(caixa, falaFinal, function () {
        var depoisFala = function () {
        var resolvido = false, menuAtual = null;
        var seguirParaClimax = function (acao) {
          if (resolvido) return;
          resolvido = true;
          acaoEscolhida = acao || null;
          salvarProgressoAtual();
          if (menuAtual) menuAtual.remove();
          avancarPara(8);
        };
        menuAtual = menuAcao(caixa, [
          { label: 'Tocar a Canção da Tempestade', ativo: cenario === 'B', onClick: function () { seguirParaClimax('cancao'); } },
          { label: 'Usar o desejo das esferas', ativo: cenario === 'B', onClick: function () { seguirParaClimax('esferas'); } },
          { label: 'Tentar falar com o Malik', ativo: true, onClick: function () {
              resolvido = true;
              if (menuAtual) { menuAtual.remove(); menuAtual = null; }
              trocarPoseMalik(retrato, POSE_POR_FASE.falar);
              falarMalik(caixa, 'Falar é só uma chamada de função sem retorno. Nada muda porque você pediu educadamente.', function () {
                resolvido = false;
                seguirParaClimax('falar');
              });
            } }
        ], cenario === 'B' ? 7000 : 3200);
        daquiA(cenario === 'B' ? 7000 : 3200, function () { seguirParaClimax(null); });
        };
        if (cenario === 'A') {
          falarMalik(caixa, 'Sem as esferas. Sem a canção. Você chegou sem as peças — e eu notei.', depoisFala);
        } else {
          depoisFala();
        }
      });
    }

    function avancarPara(n) {
      limparFaseTimers();
      faseAtual = n;
      modoAtual = 'fase';
      mostrarCaixa(true);
      salvarProgressoAtual();
      if (FASES[n]) FASES[n]();
      if (n >= 1 && n <= 7 && DURACOES[n]) daquiA(DURACOES[n], function () { checkpoint(n); });
    }

    if (retomarDe && retomarDe.estado) {
      var partes = String(retomarDe.estado).split(':');
      var modo = partes[0], num = partes.length > 1 ? parseInt(partes[1], 10) : null;
      var pularPara = function () {
        if (modo === 'checkpointFinal') { faseAtual = 7; checkpointFinal(); }
        else if (modo === 'checkpoint' && num) { checkpoint(num); }
        else if (modo === 'fase' && num) { avancarPara(num); }
        else { avancarPara(1); }
      };
      if (fraseAoRetomar) {
        daquiA(1400, function () { falarMalik(caixa, fraseAoRetomar, pularPara); });
      } else {
        daquiA(1400, pularPara);
      }
    }
  }

  window.iniciarConfrontoMalik = iniciarConfrontoMalik;
  window.NexusMalikSilenciarDoc = silenciarTudoMenosMalik;
})();
