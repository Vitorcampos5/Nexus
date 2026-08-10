/* malik-batalha.js — o confronto contra M.A.L.I.K.
   ============================================================
   Não faz nada sozinho. Só expõe:
     window.iniciarConfrontoMalik(cenario)
   chamado pelo malik.js no clímax do despertar (ou na hora, em modo
   de teste — ver ?malikTeste=1 no malik.js). Vive na raiz, ao lado
   de malik.js, index.html e nexus.html.

   Inspirado no formato de combate de Undertale: caixa de combate,
   alma confinada, padrões telegrafados — sem menu de ATTACK/ITEM/
   MERCY, porque M.A.L.I.K. não negocia.

   Fases 1–5 são idênticas nos dois cenários — M.A.L.I.K. não sabe se
   o viajante está preparado, ataca do mesmo jeito. Só na Fase 6 o
   caminho se abre: cenario 'A' cai em fase6SemVolta (apagamento
   permanente, ver malik-apagado.js); cenario 'B' cai em oNexusResiste
   (Leyn, os dois irmãos fantasmas juntos pela primeira vez, as
   esferas, a broca se soltando do sequestro — restauração completa
   no final, diferente do A). 'B' só é chamado de verdade quando
   existir a checagem de "viajante preparado" (sagas de Valtheris
   lidas, quests feitas); por ora o malik.js sempre passa 'A'.

   Sprites em Assets/, cada um na sua própria subpasta (pra não poluir
   Assets/ direto): Assets/leyn/, Assets/fantasmas/, Assets/malik/ — os
   .js continuam soltos na raiz de propósito, só os assets é que
   ganharam pastas. Leyn e M.A.L.I.K. têm variação de pose/animação de
   verdade (Web Animations API, sprite-strip com steps()); os
   fantasmas ainda são só um retrato parado cada um. Todo <img>/div com
   asset tem onerror ou checagem — sem o arquivo, o confronto roda
   igual, só sem aparecer aquele elemento.
   ============================================================
*/
(function () {
  'use strict';

  var frame = document.getElementById('nexusFrame');

  var CAIXA_W = 380, CAIXA_H = 250;
  var ALMA_TAM = 14;
  var HP_MAX = 100;
  var VERMELHO = '#ff2b3a';
  var OURO = '#C4A35A';

  // Trilha de cada cenário — Bad Gateway toca no A (sem ajuda), O Nexus
  // Resiste toca no B (quando existir a checagem de "viajante preparado").
  var MUSICAS = { A: 'Assets/bad-gateway.mp3', B: 'Assets/nexus-resiste.mp3' };

  var PASTA_MALIK = 'Assets/malik/';
  var PASTA_LEYN = 'Assets/leyn/';
  var PASTA_FANTASMAS = 'Assets/fantasmas/';

  // qual pose ele usa em cada fase — trocada com um crossfade rápido,
  // não precisa ser tira animada porque cada pose já é uma imagem só
  var POSE_POR_FASE = {
    ping: 'malik-pose-parado-2.png',
    cache: 'malik-pose-terminal.png',
    broca: 'malik-pose-invocando-orbe.png',
    mentira: 'malik-pose-triangulo.png',
    saida: 'malik-pose-paineis-pequenos.png',
    clímaxA: 'malik-pose-paineis-grandes.png',
    auraFinal: 'malik-pose-aura.png'
  };

  var ativo = false; // impede dois confrontos simultâneos
  var audioDoMalik = null; // quando as trilhas dele existirem, apontar aqui — o silenciador abaixo já ignora essa referência
  var pararDeSilenciar = null;

  // A partir do instante em que ele aparece em tela, nenhuma música
  // além da dele toca — nem a que já estava rolando, nem nenhuma nova
  // que tentar começar (o listener usa fase de captura, então pega até
  // <audio>/<video> criados depois de já estarmos silenciando).
  function silenciarTudoMenosMalik(doc) {
    if (!doc) return function () {};
    function aoTentarTocar(e) {
      var el = e.target;
      if (el === audioDoMalik) return;
      if (el && typeof el.pause === 'function') el.pause();
    }
    try {
      var jaTocando = doc.querySelectorAll('audio, video');
      for (var i = 0; i < jaTocando.length; i++) {
        if (jaTocando[i] !== audioDoMalik) jaTocando[i].pause();
      }
    } catch (e) {}
    doc.addEventListener('play', aoTentarTocar, true);
    return function () { doc.removeEventListener('play', aoTentarTocar, true); };
  }

  function el(tag, css, texto) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  // Troca a pose do retrato do M.A.L.I.K. com um crossfade rápido —
  // cada pose já é uma imagem inteira (não é tira), então é só isso.
  function trocarPoseMalik(elemento, nomeArquivo) {
    if (!elemento || !nomeArquivo) return;
    elemento.style.transition = 'opacity .22s ease';
    elemento.style.opacity = '0.12';
    setTimeout(function () {
      elemento.src = PASTA_MALIK + nomeArquivo;
      elemento.style.opacity = '1';
    }, 200);
  }

  // Monta um <div> de fundo pra uma tira de sprite (N quadros lado a
  // lado, largura igual) e devolve uma função que anima ela via
  // Web Animations API + easing steps(N) — sem precisar injetar
  // @keyframes no CSS, então funciona pra qualquer tamanho de tira.
  function prepararTiraSprite(elemento, arquivo, largNatural, altNatural, nQuadros, alturaAlvo) {
    var escala = alturaAlvo / altNatural;
    var largEscalada = largNatural * escala;
    var largQuadro = largEscalada / nQuadros;
    elemento.style.backgroundImage = "url('" + PASTA_LEYN + arquivo + "')";
    elemento.style.backgroundRepeat = 'no-repeat';
    elemento.style.backgroundSize = largEscalada + 'px ' + alturaAlvo + 'px';
    elemento.style.backgroundPosition = '0 0';
    elemento.style.width = largQuadro + 'px';
    elemento.style.height = alturaAlvo + 'px';
    return function tocar(duracaoMs, repetir) {
      return elemento.animate(
        [{ backgroundPositionX: '0px' }, { backgroundPositionX: (-largQuadro * nQuadros) + 'px' }],
        { duration: duracaoMs, iterations: repetir ? Infinity : 1, easing: 'steps(' + nQuadros + ')', fill: 'forwards' }
      );
    };
  }

  // Caixa de fala do M.A.L.I.K. — aparece, "digita" a linha, some sozinha.
  // callback dispara quando ela já sumiu (não durante a digitação).
  function falarMalik(raiz, texto, callback) {
    var caixaFala = el('div', 'position:absolute;left:50%;bottom:100%;transform:translateX(-50%);margin-bottom:10px;width:min(86vw,420px);background:rgba(7,8,13,.92);border:1px solid rgba(255,43,58,.4);border-radius:6px;padding:.6rem .8rem;font-family:Consolas,monospace;font-size:12.5px;line-height:1.5;color:#E8C97A;opacity:0;transition:opacity .35s ease;white-space:pre-wrap;min-height:2.6em;');
    raiz.appendChild(caixaFala);
    requestAnimationFrame(function () { caixaFala.style.opacity = '1'; });
    var i = 0;
    var digitando = setInterval(function () {
      caixaFala.textContent = texto.slice(0, i + 1);
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

  // Menu de ação entre turnos. opcoes = [{label, ativo, onClick}]. As
  // inativas aparecem esmaecidas e sem clique — é assim que o Cenário A
  // mostra "isso existe, mas você não tem" sem precisar de texto extra.
  function menuAcao(raiz, opcoes) {
    var caixaMenu = el('div', 'position:absolute;left:50%;top:100%;transform:translateX(-50%);margin-top:10px;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:min(90vw,440px);opacity:0;transition:opacity .3s ease;z-index:700015;');
    raiz.appendChild(caixaMenu);
    opcoes.forEach(function (op) {
      var botao = el('button', 'font-family:Georgia,serif;font-size:12px;letter-spacing:.05em;padding:.45rem .8rem;background:#000;border:1px solid ' + (op.ativo ? OURO : 'rgba(255,255,255,.18)') + ';color:' + (op.ativo ? OURO : 'rgba(255,255,255,.3)') + ';cursor:' + (op.ativo ? 'pointer' : 'default') + ';opacity:' + (op.ativo ? '1' : '.55') + ';', op.label);
      if (op.ativo) {
        botao.addEventListener('click', function () {
          caixaMenu.style.opacity = '0';
          setTimeout(function () { caixaMenu.remove(); }, 300);
          op.onClick();
        });
      }
      caixaMenu.appendChild(botao);
    });
    requestAnimationFrame(function () { caixaMenu.style.opacity = '1'; });
    return caixaMenu;
  }

  function iniciarConfrontoMalik(cenario) {
    if (ativo) return;
    ativo = true;
    cenario = (cenario === 'B') ? 'B' : 'A'; // só o A existe de verdade por enquanto

    audioDoMalik = el('audio');
    audioDoMalik.src = MUSICAS[cenario];
    audioDoMalik.loop = false;
    audioDoMalik.volume = 0;
    document.body.appendChild(audioDoMalik); // fora de "raiz" de propósito: sobrevive ao raiz.remove() da fase 6

    var pararSilencioFrame = null;
    try { pararSilencioFrame = silenciarTudoMenosMalik(frame.contentDocument || frame.contentWindow.document); } catch (e) {}
    var pararSilencioFora = silenciarTudoMenosMalik(document);
    pararDeSilenciar = function () {
      if (pararSilencioFrame) pararSilencioFrame();
      pararSilencioFora();
    };

    var tocar = audioDoMalik.play();
    if (tocar && tocar.catch) tocar.catch(function () {}); // autoplay bloqueado — segue sem travar nada
    var alvoVolume = 1, passos = 24, passo = 0;
    var fadeIn = setInterval(function () {
      passo++;
      audioDoMalik.volume = Math.min(alvoVolume, (passo / passos) * alvoVolume);
      if (passo >= passos) clearInterval(fadeIn);
    }, 1400 / 24);

    var raiz = el('div', 'position:fixed;inset:0;z-index:700000;background:radial-gradient(ellipse at center,#0b0710 0%,#020103 75%);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Georgia,"Cormorant Garamond",serif;color:#E8E0D0;user-select:none;');

    var retrato = el('img', 'max-height:34vh;max-width:72vw;object-fit:contain;filter:drop-shadow(0 0 34px rgba(255,43,58,.4));margin-bottom:16px;opacity:0;transition:opacity 1.4s ease;');
    retrato.src = PASTA_MALIK + 'malik-pose-parado-1.png';
    retrato.alt = 'M.A.L.I.K.';

    var nome = el('div', 'letter-spacing:.32em;font-size:13px;color:' + VERMELHO + ';opacity:0;transition:opacity 1.8s ease;margin-bottom:14px;', 'M.A.L.I.K.');

    var hpLinha = el('div', 'font-size:13px;letter-spacing:.1em;margin-bottom:10px;opacity:.85;');

    var caixa = el('div', 'position:relative;width:' + CAIXA_W + 'px;height:' + CAIXA_H + 'px;max-width:82vw;border:2px solid #E8E0D0;background:#000;overflow:hidden;box-shadow:0 0 24px rgba(0,0,0,.6);');
    var alma = el('div');
    alma.style.cssText = 'position:absolute;width:' + ALMA_TAM + 'px;height:' + ALMA_TAM + 'px;background:' + VERMELHO + ';box-shadow:0 0 8px ' + VERMELHO + ';clip-path:polygon(50% 0%,100% 35%,82% 100%,18% 100%,0% 35%);left:' + (CAIXA_W / 2 - ALMA_TAM / 2) + 'px;top:' + (CAIXA_H / 2 - ALMA_TAM / 2) + 'px;';
    caixa.appendChild(alma);

    raiz.appendChild(retrato);
    raiz.appendChild(nome);
    raiz.appendChild(hpLinha);
    raiz.appendChild(caixa);
    document.body.appendChild(raiz);

    requestAnimationFrame(function () {
      retrato.style.opacity = '1';
      setTimeout(function () { nome.style.opacity = '1'; }, 900);
    });

    // ---------- estado do confronto ----------
    var hp = HP_MAX;
    var almaX = CAIXA_W / 2, almaY = CAIXA_H / 2;
    var invulneravel = false;
    var projeteis = [];
    var rodando = true;
    var faseAtual = -1;

    function atualizarHP(texto) {
      hpLinha.textContent = texto !== undefined ? texto : ('HP  ' + Math.max(0, Math.round(hp)) + ' / ' + HP_MAX);
    }
    atualizarHP();

    // ---------- entrada (mouse + toque, unificados via Pointer Events) ----------
    function moverAlma(clientX, clientY) {
      var r = caixa.getBoundingClientRect();
      almaX = Math.min(CAIXA_W - ALMA_TAM / 2, Math.max(ALMA_TAM / 2, clientX - r.left));
      almaY = Math.min(CAIXA_H - ALMA_TAM / 2, Math.max(ALMA_TAM / 2, clientY - r.top));
      alma.style.left = (almaX - ALMA_TAM / 2) + 'px';
      alma.style.top  = (almaY - ALMA_TAM / 2) + 'px';
    }
    caixa.addEventListener('pointermove', function (e) { moverAlma(e.clientX, e.clientY); });

    // ---------- projéteis ----------
    function spawnProjetil(cfg) {
      var tam = cfg.tam || 7;
      var p = el('div', 'position:absolute;width:' + tam + 'px;height:' + tam + 'px;border-radius:50%;background:' + (cfg.cor || VERMELHO) + ';box-shadow:0 0 6px ' + (cfg.cor || VERMELHO) + ';display:flex;align-items:center;justify-content:center;font-size:13px;line-height:1;');
      if (cfg.glifo) { p.textContent = cfg.glifo; p.style.background = 'transparent'; p.style.boxShadow = 'none'; p.style.color = cfg.cor || VERMELHO; }
      caixa.appendChild(p);
      projeteis.push({ el: p, x: cfg.x, y: cfg.y, vx: cfg.vx, vy: cfg.vy, raio: tam / 2, ricochetes: cfg.ricochetes || 0 });
    }

    function limparProjeteis() {
      projeteis.forEach(function (p) { p.el.remove(); });
      projeteis = [];
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
          hp -= 8 + Math.random() * 6;
          atualizarHP();
          invulneravel = true;
          caixa.style.boxShadow = 'inset 0 0 40px ' + VERMELHO;
          setTimeout(function () { caixa.style.boxShadow = 'none'; }, 140);
          setTimeout(function () { invulneravel = false; }, 700);
          p.el.remove(); projeteis.splice(i, 1);
          if (hp <= 0 && faseAtual < 6) avancarPara(6);
        }
      }
    })();

    // ---------- fases ----------
    var faseTimers = [];
    function daquiA(ms, fn) { faseTimers.push(setTimeout(fn, ms)); }

    function fase1Ping() {
      limparProjeteis();
      trocarPoseMalik(retrato, POSE_POR_FASE.ping);
      var intervalo = setInterval(function () {
        if (faseAtual !== 1) { clearInterval(intervalo); return; }
        var lado = Math.floor(Math.random() * 4);
        var x = lado === 0 ? 0 : lado === 1 ? CAIXA_W : Math.random() * CAIXA_W;
        var y = lado === 2 ? 0 : lado === 3 ? CAIXA_H : Math.random() * CAIXA_H;
        var ang = Math.atan2(CAIXA_H / 2 - y, CAIXA_W / 2 - x) + (Math.random() - 0.5);
        var vel = 1.6 + Math.random();
        spawnProjetil({ x: x, y: y, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel, ricochetes: 3 });
      }, 550);
    }

    function fase2Cache() {
      limparProjeteis();
      trocarPoseMalik(retrato, POSE_POR_FASE.cache);
      var faixaX = CAIXA_W / 2, faixaDir = 1;
      var intervaloFaixa = setInterval(function () {
        if (faseAtual !== 2) { clearInterval(intervaloFaixa); return; }
        faixaX += faixaDir * 3;
        if (faixaX > CAIXA_W - 60 || faixaX < 60) faixaDir *= -1;
      }, 60);
      var intervalo = setInterval(function () {
        if (faseAtual !== 2) { clearInterval(intervalo); return; }
        var x = Math.random() * CAIXA_W;
        if (Math.abs(x - faixaX) < 46) return; // não nasce na faixa "já verificada"
        spawnProjetil({ x: x, y: -10, vx: 0, vy: 1.4 + Math.random() * 0.6, glifo: Math.random() < 0.5 ? '0' : '1', tam: 14 });
      }, 220);
    }

    function fase3Broca() {
      limparProjeteis();
      trocarPoseMalik(retrato, POSE_POR_FASE.broca);
      try { if (window.NexusMalikBridge) window.NexusMalikBridge.sequestrarBroca(); } catch (e) {}
      if (frame) { frame.style.transition = 'filter 2s ease'; frame.style.filter = 'grayscale(.5) hue-rotate(190deg) saturate(2.4) brightness(.8)'; }
      var ang0 = Math.random() * Math.PI * 2;
      var intervalo = setInterval(function () {
        if (faseAtual !== 3) { clearInterval(intervalo); return; }
        ang0 += 0.55;
        var raio = 20 + (ang0 % 6) * 24;
        var cx = CAIXA_W / 2, cy = CAIXA_H / 2;
        var x = cx + Math.cos(ang0) * raio, y = cy + Math.sin(ang0) * raio;
        spawnProjetil({ x: x, y: y, vx: Math.cos(ang0 + Math.PI / 2) * 2.2, vy: Math.sin(ang0 + Math.PI / 2) * 2.2, cor: '#ff5540', tam: 6 });
      }, 90);
    }

    function fase4Mentira() {
      limparProjeteis();
      trocarPoseMalik(retrato, POSE_POR_FASE.mentira);
      atualizarHP('HP  ??');
      daquiA(900, function () { hp = Math.max(1, hp - 14); atualizarHP(); });
    }

    function fase5FalsaSaida() {
      limparProjeteis();
      trocarPoseMalik(retrato, POSE_POR_FASE.saida);
      var botao = el('button', 'position:absolute;left:' + (CAIXA_W / 2 - 46) + 'px;top:' + (CAIXA_H / 2 - 14) + 'px;width:92px;height:28px;background:#000;border:1px solid ' + OURO + ';color:' + OURO + ';font-family:inherit;font-size:12px;letter-spacing:.08em;cursor:pointer;', '◇ poupar');
      var recusas = 0;
      botao.addEventListener('click', function () {
        recusas++;
        botao.style.transform = 'translateX(' + (Math.random() > 0.5 ? 6 : -6) + 'px)';
        setTimeout(function () { botao.style.transform = 'none'; }, 90);
        botao.textContent = recusas < 2 ? 'negado.' : '...';
      });
      caixa.appendChild(botao);
      daquiA(4200, function () { botao.remove(); });
    }

    function fase6SemVolta() {
      limparProjeteis();
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
      daquiA(2400, function () {
        try { if (window.NexusMalikApagarDeVez) window.NexusMalikApagarDeVez(); } catch (e) {}
        var apagao = el('div', 'position:fixed;inset:0;z-index:800000;background:#000;color:#c8c8c8;font-family:Consolas,monospace;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:15px;letter-spacing:.04em;opacity:0;transition:opacity .8s ease;text-align:center;line-height:2;');
        apagao.innerHTML = 'ERR_CONNECTION_TIMED_OUT<br>este link não respondeu.<br><br><span style="color:#ff2b3a">NEXUS REMOVIDO.</span>';
        document.body.appendChild(apagao);
        requestAnimationFrame(function () { apagao.style.opacity = '1'; });
        raiz.remove();
      });
      // Cenário A é sem volta de verdade agora: a linha acima grava em
      // localStorage que o Nexus foi apagado, e o malik-apagado.js (que
      // roda antes de qualquer outra coisa, a cada carregamento futuro
      // do index.html) passa a mostrar só esta mesma tela — o iframe
      // nem chega a carregar. Nada aqui se desfaz sozinho; só um reset
      // manual (limpar esse item do localStorage) religa o Nexus.
    }

    // ══════════════════════════════════════════════════════════════
    // CENÁRIO B — "O Nexus Resiste": substitui a Fase 6 quando cenario
    // === 'B'. Até aqui (fases 1–5) é idêntico ao A — M.A.L.I.K. não
    // sabe se o viajante está preparado, ataca do mesmo jeito. É só
    // aqui que o caminho se abre.
    // ══════════════════════════════════════════════════════════════
    function oNexusResiste() {
      limparProjeteis();
      rodando = false;

      var choques = 0;
      var vibra = setInterval(function () {
        choques++;
        raiz.style.transform = 'translate(' + (Math.random() * 8 - 4) + 'px,' + (Math.random() * 8 - 4) + 'px)';
        if (choques > 9) { clearInterval(vibra); raiz.style.transform = 'none'; }
      }, 55);
      if (frame) { frame.style.transition = 'filter 1.2s ease'; frame.style.filter = 'grayscale(.7) contrast(1.2) brightness(.5)'; }

      // estado compartilhado só desta sequência
      var fantasma1 = null, fantasma2 = null, linha = null;
      var esferaEls = [];
      var mensagemEl = null, leynEl = null, leynAnimacaoAtual = null;
      var ALTURA_LEYN = 170;

      function fantasmasJuntos() {
        linha = el('div', 'display:flex;align-items:center;gap:14px;');
        raiz.insertBefore(linha, caixa);

        fantasma1 = el('img', 'width:56px;height:auto;opacity:0;transition:opacity 1.6s ease;filter:drop-shadow(0 0 10px rgba(180,210,255,.5));');
        fantasma1.src = PASTA_FANTASMAS + 'fantasma-1-sprite.png'; fantasma1.alt = '';
        fantasma1.onerror = function () { fantasma1.style.display = 'none'; };

        fantasma2 = el('img', 'width:56px;height:auto;opacity:0;transition:opacity 1.6s ease;filter:drop-shadow(0 0 10px rgba(180,210,255,.5));transform:scaleX(-1);');
        fantasma2.src = PASTA_FANTASMAS + 'fantasma-2-sprite.png'; fantasma2.alt = '';
        fantasma2.onerror = function () { fantasma2.style.display = 'none'; };

        linha.appendChild(fantasma1);
        linha.appendChild(caixa); // move a caixa pra dentro da linha, entre os dois — juntos pela primeira vez
        linha.appendChild(fantasma2);
        requestAnimationFrame(function () { fantasma1.style.opacity = '1'; fantasma2.style.opacity = '1'; });

        var anel = el('div', 'position:absolute;width:' + (ALMA_TAM + 16) + 'px;height:' + (ALMA_TAM + 16) + 'px;border-radius:50%;border:1px solid rgba(180,210,255,.6);left:' + (almaX - (ALMA_TAM + 16) / 2) + 'px;top:' + (almaY - (ALMA_TAM + 16) / 2) + 'px;opacity:0;transition:opacity 1s ease;box-shadow:0 0 14px rgba(180,210,255,.5);pointer-events:none;');
        caixa.appendChild(anel);
        requestAnimationFrame(function () { anel.style.opacity = '1'; });
      }

      function esferasChegam() {
        var rect = caixa.getBoundingClientRect();
        var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
        var raioFinal = Math.max(rect.width, rect.height) / 2 + 30;
        for (var i = 0; i < 7; i++) {
          (function (i) {
            var ang = (i / 7) * Math.PI * 2;
            var destX = cx + Math.cos(ang) * raioFinal, destY = cy + Math.sin(ang) * raioFinal;
            var origX = cx + Math.cos(ang) * (raioFinal + 220), origY = cy + Math.sin(ang) * (raioFinal + 220);
            // mesmo gradiente/estrela do #dragonball-panel (.db-orb.achada), não um brilho genérico
            var orb = el('div', 'position:fixed;width:22px;height:22px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#FFD98A,#E8891A 62%,#A34E08);box-shadow:0 0 10px rgba(232,137,26,.85);left:' + origX + 'px;top:' + origY + 'px;opacity:0;transition:left 1.3s cubic-bezier(.2,.8,.2,1),top 1.3s cubic-bezier(.2,.8,.2,1),opacity .3s ease;z-index:700010;pointer-events:none;');
            var estrela = el('div', 'position:absolute;width:6px;height:6px;background:#C21818;left:8px;top:8px;clip-path:polygon(50% 0%, 61% 35%, 98% 35%, 68% 56%, 79% 91%, 50% 69%, 21% 91%, 32% 56%, 2% 35%, 39% 35%);');
            orb.appendChild(estrela);
            document.body.appendChild(orb);
            // chegada escalonada — cada esfera some visível de per si, não tudo de uma vez de longe
            setTimeout(function () {
              orb.style.opacity = '1';
              requestAnimationFrame(function () { orb.style.left = destX + 'px'; orb.style.top = destY + 'px'; });
              setTimeout(function () {
                orb.style.animation = 'malikEsferaPulso 1s ease-in-out infinite alternate';
              }, 1350);
            }, i * 90);
            esferaEls.push(orb);
          })(i);
        }
        if (!document.getElementById('malik-esfera-pulso-css')) {
          var estilo = el('style'); estilo.id = 'malik-esfera-pulso-css';
          estilo.textContent = '@keyframes malikEsferaPulso{from{box-shadow:0 0 10px rgba(232,137,26,.85);filter:brightness(1);}to{box-shadow:0 0 20px rgba(255,217,138,1);filter:brightness(1.35);}}';
          document.head.appendChild(estilo);
        }
      }

      function brocaSeSolta() {
        try { if (window.NexusMalikBridge) window.NexusMalikBridge.libertarComForca(650); } catch (e) {}
      }

      function mensagemPersonifica() {
        mensagemEl = el('div', 'position:fixed;left:50%;top:36%;transform:translate(-50%,-50%);z-index:700020;font-family:Georgia,"Cormorant Garamond",serif;font-size:15px;letter-spacing:.14em;text-align:center;max-width:80vw;opacity:0;transition:opacity 1.2s ease;color:#E8C97A;text-shadow:0 0 8px rgba(255,43,58,.85),0 0 22px rgba(196,163,90,.7),0 0 40px rgba(255,43,58,.35);', 'O NEXUS PERSONIFICA SUA PRESENÇA');
        document.body.appendChild(mensagemEl);
        requestAnimationFrame(function () { mensagemEl.style.opacity = '1'; });
      }

      function leynAparece() {
        leynEl = el('div', 'width:' + (311 * (ALTURA_LEYN / 346)) + 'px;height:' + ALTURA_LEYN + 'px;background-image:url(\'' + PASTA_LEYN + 'leyn-sprite.png\');background-size:contain;background-repeat:no-repeat;background-position:center;opacity:0;transition:opacity 1.6s ease;filter:drop-shadow(0 0 20px rgba(196,163,90,.4));margin-bottom:14px;');
        raiz.insertBefore(leynEl, linha);
        requestAnimationFrame(function () { leynEl.style.opacity = '1'; });
        if (mensagemEl) { mensagemEl.style.transition = 'opacity 1s ease'; mensagemEl.style.opacity = '0'; }
      }

      // Observação (1 rodada inteira, na regra real) → um único golpe,
      // sem preparo visível — é literalmente "uma polegada".
      function observacaoEGolpe() {
        if (fantasma1) fantasma1.style.opacity = '.45';
        if (fantasma2) fantasma2.style.opacity = '.45';

        // entra em guarda: troca o retrato parado pela tira animada e
        // deixa girando em loop enquanto "observa" o alvo
        if (leynEl) {
          var tocarParado = prepararTiraSprite(leynEl, 'leyn-parado.png', 1150, 310, 4, ALTURA_LEYN);
          leynAnimacaoAtual = tocarParado(900, true);
        }

        daquiA(1700, function () {
          // o golpe: cancela o loop parado, troca pra tira de ataque e
          // toca ela uma vez só — sem preparo visível, "uma polegada"
          if (leynEl) {
            if (leynAnimacaoAtual) leynAnimacaoAtual.cancel();
            var tocarAtaque = prepararTiraSprite(leynEl, 'leyn-atacando.png', 1510, 340, 4, ALTURA_LEYN);
            leynAnimacaoAtual = tocarAtaque(260, false);
          }
          var flash = el('div', 'position:fixed;inset:0;z-index:700030;background:linear-gradient(100deg,transparent 46%,#fff 49%,#E8C97A 50%,transparent 54%);opacity:0;pointer-events:none;transition:opacity .06s linear;');
          document.body.appendChild(flash);
          requestAnimationFrame(function () {
            flash.style.opacity = '1';
            setTimeout(function () { flash.style.opacity = '0'; setTimeout(function () { flash.remove(); }, 200); }, 90);
          });
        });
      }

      function malikExpulso() {
        trocarPoseMalik(retrato, POSE_POR_FASE.auraFinal);
        daquiA(230, function () {
        retrato.style.transition = 'transform .5s ease, opacity .5s ease, filter .5s ease';
        retrato.style.transform = 'scale(.18)';
        retrato.style.opacity = '0';
        retrato.style.filter = 'grayscale(1) brightness(2)';
        nome.style.transition = 'opacity .4s ease';
        nome.style.opacity = '0';
        var fecho = el('div', 'position:fixed;left:50%;top:36%;transform:translate(-50%,-50%);z-index:700020;font-family:Consolas,monospace;font-size:12px;letter-spacing:.08em;color:#8a8a8a;opacity:0;transition:opacity .6s ease;', 'conexão encerrada — localhost');
        document.body.appendChild(fecho);
        requestAnimationFrame(function () { fecho.style.opacity = '1'; });
        daquiA(1300, function () { fecho.style.opacity = '0'; setTimeout(function () { fecho.remove(); }, 700); });
        });
      }

      function restauracaoCompleta() {
        raiz.style.transition = 'opacity 1.6s ease';
        raiz.style.opacity = '0';
        esferaEls.forEach(function (o) { o.style.transition = 'opacity 1s ease'; o.style.opacity = '0'; });
        var fadeAudio = setInterval(function () {
          audioDoMalik.volume = Math.max(0, audioDoMalik.volume - 0.05);
          if (audioDoMalik.volume <= 0.001) { clearInterval(fadeAudio); audioDoMalik.pause(); }
        }, 90);
        daquiA(1700, function () {
          raiz.remove();
          esferaEls.forEach(function (o) { o.remove(); });
          if (pararDeSilenciar) pararDeSilenciar();
          try { if (window.NexusMalikRestaurarAgora) window.NexusMalikRestaurarAgora(); } catch (e) {}
        });
      }

      daquiA(1200, fantasmasJuntos);
      daquiA(2000, function () { falarMalik(caixa, 'Processos zumbis. Eu limpo processos zumbis todo dia.'); });
      daquiA(4200, esferasChegam);
      daquiA(7200, brocaSeSolta);
      daquiA(7900, function () { falarMalik(caixa, 'Sete requisições simultâneas não é ataque. É só mais log pra eu apagar depois.'); });
      daquiA(9400, mensagemPersonifica);
      daquiA(12200, leynAparece);
      daquiA(13600, function () { falarMalik(caixa, '...'); }); // a primeira vez que ele não tem resposta pronta
      daquiA(14200, observacaoEGolpe);
      daquiA(16100, malikExpulso);
      daquiA(17800, restauracaoCompleta);
      // Sem toque em NexusMalikApagarDeVez em lugar nenhum daqui — esse
      // caminho nunca grava o apagamento permanente.
    }

    // Falas por fase — a de baixo ("resistir" sem clicar em Falar) e a
    // de resposta quando o viajante escolhe Falar. Confiante o tempo
    // todo, mesmo perdendo — ele só quebra o tom bem no fim do B.
    var FALAS_MALIK = [null,
      'Latência é só outra palavra pra hesitação.',
      'Verificando... verificando... nada aqui merecia cache.',
      'Essa broca gira porque eu decido que ela gira.',
      'Seu HP é só um inteiro. Inteiros zeram.',
      'Não existe MISERICÓRDIA nesse menu. Eu escrevi esse menu.'
    ];
    var FALAS_FALAR = [null,
      '"Latência" é só o tempo que falta pra você desistir.',
      '"Cache" é memória que ninguém teve coragem de apagar. Eu tenho.',
      'A broca é sua? Curioso. Ela obedece a quem tem root.',
      'Fale o quanto quiser. Um inteiro não ouve súplica.',
      'Só o suficiente pra você entender que perdeu antes de eu explicar por quê.'
    ];

    var FASES    = [null, fase1Ping, fase2Cache, fase3Broca, fase4Mentira, fase5FalsaSaida, (cenario === 'B' ? oNexusResiste : fase6SemVolta)];
    var DURACOES = [0,    9500,      9500,       8200,        4200,        5200,             0];

    function checkpoint(nFaseConcluida) {
      falarMalik(caixa, FALAS_MALIK[nFaseConcluida] || '...', function () {
        var resolvido = false, menuAtual = null;
        var seguir = function () {
          if (resolvido) return;
          resolvido = true;
          if (menuAtual) menuAtual.remove();
          avancarPara(nFaseConcluida + 1);
        };
        menuAtual = menuAcao(caixa, [
          { label: 'Resistir', ativo: true, onClick: seguir },
          { label: 'Falar', ativo: true, onClick: function () {
              if (menuAtual) { menuAtual.remove(); menuAtual = null; }
              falarMalik(caixa, FALAS_FALAR[nFaseConcluida] || '...', seguir);
            } }
        ]);
        daquiA(8000, seguir);
      });
    }

    // O checkpoint antes da fase 6 é diferente: é aqui que o preparo
    // (ou a falta dele) vira escolha de verdade, não só narração. No
    // B as duas opções levam ao mesmo lugar (a defesa do Nexus); a
    // diferença é que no A elas aparecem esmaecidas, inalcançáveis.
    function checkpointFinal() {
      var falaFinal = cenario === 'B'
        ? 'Reuniram esferas. Aprenderam uma canção de criança. Isso não muda o protocolo.'
        : 'Você chegou até aqui sozinho. Sozinho é como termina.';
      falarMalik(caixa, falaFinal, function () {
        var resolvido = false, menuAtual = null;
        var seguirParaFase6 = function () {
          if (resolvido) return;
          resolvido = true;
          if (menuAtual) menuAtual.remove();
          avancarPara(6);
        };
        menuAtual = menuAcao(caixa, [
          { label: 'Tocar a Canção da Tempestade', ativo: cenario === 'B', onClick: seguirParaFase6 },
          { label: 'Usar o desejo das esferas', ativo: cenario === 'B', onClick: seguirParaFase6 }
        ]);
        daquiA(cenario === 'B' ? 7000 : 3200, seguirParaFase6);
      });
    }

    function avancarPara(n) {
      faseAtual = n;
      if (FASES[n]) FASES[n]();
      if (n >= 1 && n <= 4 && DURACOES[n]) daquiA(DURACOES[n], function () { checkpoint(n); });
      else if (n === 5 && DURACOES[n]) daquiA(DURACOES[n], checkpointFinal);
    }

    daquiA(2600, function () { avancarPara(1); });
  }

  window.iniciarConfrontoMalik = iniciarConfrontoMalik;
  // Exposta pro malik.js chamar já no nível 4 (muito antes do confronto
  // começar) — sem isso, música de fundo só era silenciada quando o
  // retrato dele já tinha aparecido, minutos depois de já estar tudo errado.
  window.NexusMalikSilenciarDoc = silenciarTudoMenosMalik;
})();
