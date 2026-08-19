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
    // Alguns áudios do Nexus (Canção da Tempestade, fanfarra das esferas,
    // libera-me-from-hell da broca) são `new Audio(...)` soltos, nunca
    // inseridos no documento — um querySelectorAll('audio,video') e o
    // listener de 'play' abaixo não os enxergam, porque eventos de nó sem
    // pai não sobem até o document. window.NexusPararTudoAudio (definido
    // no nexus.html) é o gancho que alcança esses casos.
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
    // Repete por um tempo curto: cobre um áudio solto que só é criado
    // (ex.: o viajante ainda mexendo na página) depois do silêncio já ter
    // começado — o listener de 'play' não pegaria esse caso sozinho.
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
  // Antes essas caixas eram FILHAS de "raiz" (na prática, sempre `caixa`,
  // que tem overflow:hidden pra conter os projéteis das fases de
  // esquiva) e se posicionavam com bottom:100%/top:100% — ou seja,
  // inteiramente FORA da própria caixa. Com overflow:hidden no pai,
  // isso cortava a fala e o menu por completo: sumiam, mas o timer de
  // fundo continuava rodando normalmente (não depende de CSS), o que
  // parecia "as ações acontecem sozinhas". Agora ancoram em
  // document.body (fixed), calculando a posição pelo retângulo real de
  // "raiz" na tela — visualmente no mesmo lugar, sem ficar preso ao
  // overflow de ninguém.
  function falarMalik(raiz, texto, callback) {
    var rect = raiz.getBoundingClientRect();
    var caixaFala = el('div', 'position:fixed;left:' + (rect.left + rect.width / 2) + 'px;top:' + (rect.top - 10) + 'px;transform:translate(-50%,-100%);width:min(86vw,420px);background:rgba(7,8,13,.92);border:1px solid rgba(255,43,58,.4);border-radius:6px;padding:.6rem .8rem;font-family:Consolas,monospace;font-size:12.5px;line-height:1.5;color:#E8C97A;opacity:0;transition:opacity .35s ease;white-space:pre-wrap;min-height:2.6em;z-index:700015;');
    document.body.appendChild(caixaFala);
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

  // Mesma mecânica de falarMalik, cor dos irmãos (o azul-fantasma já usado
  // no drop-shadow dos sprites e no anel de proteção) em vez do
  // vermelho/dourado dele — dá pra saber quem tá falando só pela cor.
  function falarIrmaos(raiz, texto, callback) {
    var rect = raiz.getBoundingClientRect();
    var caixaFala = el('div', 'position:fixed;left:' + (rect.left + rect.width / 2) + 'px;top:' + (rect.top - 10) + 'px;transform:translate(-50%,-100%);width:min(86vw,420px);background:rgba(7,8,13,.92);border:1px solid rgba(180,210,255,.45);border-radius:6px;padding:.6rem .8rem;font-family:Consolas,monospace;font-size:12.5px;line-height:1.5;color:#CFE0FF;opacity:0;transition:opacity .35s ease;white-space:pre-wrap;min-height:2.6em;z-index:700015;');
    document.body.appendChild(caixaFala);
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

  // Legenda centralizada flutuante — mesmo estilo que "O NEXUS PERSONIFICA
  // SUA PRESENÇA" já usava, só que reaproveitável e com auto-fade: some
  // sozinha depois de duracaoMs, sem precisar de limpeza manual em cada
  // lugar que chama.
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

  // Menu de ação entre turnos. opcoes = [{label, ativo, onClick}]. As
  // inativas aparecem esmaecidas e sem clique — é assim que o Cenário A
  // mostra "isso existe, mas você não tem" sem precisar de texto extra.
  // duracaoMs (opcional) é só visual: os callers já tinham um daquiA(ms,
  // seguir) por conta própria pra decidir sozinho se o viajante não
  // escolher — essa barra deixa esse relógio visível em vez de escondido,
  // que é metade do que faz o menu parecer um comando de luta de verdade.
  function menuAcao(raiz, opcoes, duracaoMs) {
    var rect = raiz.getBoundingClientRect();
    var caixaMenu = el('div', 'position:fixed;left:' + (rect.left + rect.width / 2) + 'px;top:' + (rect.bottom + 10) + 'px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;max-width:min(90vw,440px);opacity:0;transition:opacity .3s ease;z-index:700015;');
    var linhaBotoes = el('div', 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;');
    caixaMenu.appendChild(linhaBotoes);
    document.body.appendChild(caixaMenu);
    opcoes.forEach(function (op) {
      var cor = op.ativo ? OURO : 'rgba(255,255,255,.3)';
      var borda = op.ativo ? OURO : 'rgba(255,255,255,.18)';
      // cantos abertos (só as pontas, não o contorno inteiro) — a
      // referência é janela de comando de RPG por turno, não botão de
      // formulário; funciona só com CSS, sem pedir arte nova.
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
    requestAnimationFrame(function () { caixaMenu.style.opacity = '1'; });
    return caixaMenu;
  }

  // Retomada exata: salva cenário + em que fase/checkpoint está + HP a
  // cada mudança relevante. Se a página recarregar no meio da luta,
  // malik.js lê essa chave e chama iniciarConfrontoMalik de novo com
  // retomarDe preenchido, pulando a fase 1 e indo direto pro ponto salvo.
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
    // Marca a sessão como tendo uma luta ativa — inclusive num início do
    // zero, não só ao retomar. Sem isso, o PRIMEIRO F5 de uma luta que
    // nunca tinha sido retomada antes acusaria "fugiu" por engano, porque
    // a sessionStorage só teria sido escrita dentro do bloco de retomada.
    try { sessionStorage.setItem('malik_sessao_batalha_ativa', '1'); } catch (e) {}
    cenario = (cenario === 'B') ? 'B' : 'A'; // só o A existe de verdade por enquanto
    var retomarDe = opcoes && opcoes.retomarDe;
    var fraseAoRetomar = (opcoes && opcoes.fraseAoRetomar) || null;
    // true se o viajante só chegou depois que a corrupção inteira já
    // tinha se desenrolado sozinha, sem ele por perto — vem direto (início
    // fresco) ou dentro do progresso salvo (retomada de uma luta que já
    // tinha começado assim).
    var ausenteDuranteTudo = (retomarDe && retomarDe.ausente) || (opcoes && opcoes.ausente) || false;

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
    var hp = (retomarDe && typeof retomarDe.hp === 'number') ? retomarDe.hp : HP_MAX;
    var almaX = CAIXA_W / 2, almaY = CAIXA_H / 2;
    var invulneravel = false;
    var projeteis = [];
    var rodando = true;
    var faseAtual = -1;
    var modoAtual = 'fase'; // 'fase' | 'checkpoint' | 'checkpointFinal' — junto com faseAtual, forma o "estado" salvo
    var acaoEscolhida = (retomarDe && retomarDe.acao) || null; // 'cancao' | 'esferas' | 'falar' | null — escolhida no checkpointFinal, lida dentro de oNexusResiste
    function salvarProgressoAtual() {
      var estado = modoAtual === 'checkpointFinal' ? 'checkpointFinal' : (modoAtual + ':' + faseAtual);
      salvarProgresso({ cenario: cenario, estado: estado, hp: hp, acao: acaoEscolhida, ausente: ausenteDuranteTudo });
    }

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
          salvarProgressoAtual();
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
      daquiA(900, function () { hp = Math.max(1, hp - 14); atualizarHP(); salvarProgressoAtual(); });
    }

    function fase5FalsaSaida() {
      limparProjeteis();
      trocarPoseMalik(retrato, POSE_POR_FASE.saida);
      var botao = el('button', 'position:absolute;left:' + (CAIXA_W / 2 - 62) + 'px;top:' + (CAIXA_H / 2 - 14) + 'px;width:124px;height:28px;background:#000;border:1px solid ' + OURO + ';color:' + OURO + ';font-family:inherit;font-size:11.5px;letter-spacing:.06em;cursor:pointer;', '◇ poupe o Nexus');
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

      // "Ninguém vem. Ninguém vinha." já cutuca a ausência — se o viajante
      // realmente não esteve presente pra nenhuma parte da corrupção
      // (chegou só depois de tudo já ter caído sozinho), o Malik torna
      // isso explícito antes do apagamento. Empurra o apagamento pra dar
      // tempo dessa segunda fala respirar.
      var atrasoApagamento = 2400;
      if (ausenteDuranteTudo) {
        atrasoApagamento = 5000;
        daquiA(2400, function () { falarMalik(caixa, 'Você sequer estava aqui quando tudo caiu.'); });
      }

      daquiA(atrasoApagamento, function () {
        limparProgresso();
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
      var fantasma1 = null, fantasma2 = null, linha = null, anel = null;
      var esferaEls = [];
      var mensagemEl = null, leynEl = null, leynAnimacaoAtual = null;
      var ALTURA_LEYN = 170;

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
        linha.appendChild(caixa); // move a caixa pra dentro da linha, entre os dois — juntos pela primeira vez
        linha.appendChild(fantasma2);
        requestAnimationFrame(function () { fantasma1.style.opacity = '1'; fantasma2.style.opacity = '1'; });

        anel = el('div', 'position:absolute;width:' + (ALMA_TAM + 16) + 'px;height:' + (ALMA_TAM + 16) + 'px;border-radius:50%;border:1px solid rgba(180,210,255,.6);left:' + (almaX - (ALMA_TAM + 16) / 2) + 'px;top:' + (almaY - (ALMA_TAM + 16) / 2) + 'px;opacity:0;transition:opacity 1s ease;box-shadow:0 0 14px rgba(180,210,255,.5);pointer-events:none;');
        caixa.appendChild(anel);
        requestAnimationFrame(function () { anel.style.opacity = '1'; });
      }

      function esferasChegam() {
        var rect = caixa.getBoundingClientRect();
        var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
        var raioFinal = Math.max(rect.width, rect.height) / 2 + 30;
        // valores idênticos aos de .db-orb/.db-orb.achada/.db-orb.completo e
        // @keyframes dbPulso no #dragonball-panel do nexus.html — mesmo
        // tamanho (24px), mesmo raio de glow parado (6px) e em pulso
        // (10px→22px), mesma estrela (4px, centralizada) — pra não ter
        // "a versão de detalhe reduzido" durante a luta.
        for (var i = 0; i < 7; i++) {
          (function (i) {
            var ang = (i / 7) * Math.PI * 2;
            var destX = cx + Math.cos(ang) * raioFinal, destY = cy + Math.sin(ang) * raioFinal;
            var origX = cx + Math.cos(ang) * (raioFinal + 220), origY = cy + Math.sin(ang) * (raioFinal + 220);
            var orb = el('div', 'position:fixed;width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#FFD98A,#E8891A 62%,#A34E08);box-shadow:0 0 6px rgba(232,137,26,.55);left:' + origX + 'px;top:' + origY + 'px;opacity:0;transition:left 1.3s cubic-bezier(.2,.8,.2,1),top 1.3s cubic-bezier(.2,.8,.2,1),opacity .3s ease;z-index:700010;pointer-events:none;');
            var estrela = el('div', 'position:absolute;width:4px;height:4px;background:#C21818;left:10px;top:10px;clip-path:polygon(50% 0%, 61% 35%, 98% 35%, 68% 56%, 79% 91%, 50% 69%, 21% 91%, 32% 56%, 2% 35%, 39% 35%);');
            orb.appendChild(estrela);
            document.body.appendChild(orb);
            // chegada escalonada — cada esfera some visível de per si, não tudo de uma vez de longe
            setTimeout(function () {
              orb.style.opacity = '1';
              requestAnimationFrame(function () { orb.style.left = destX + 'px'; orb.style.top = destY + 'px'; });
              // brilho liga assim que a esfera chega (fim da transição de
              // 1.3s), não quase um segundo e meio depois — antes disso
              // dava tempo de sobra pra passar despercebida no meio do resto
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

      // Ele ainda tenta. A proteção segura — mas é a primeira vez que
      // alguma coisa dele não funciona, e isso deveria doer nele mais do
      // que qualquer HP perdido: até aqui, ele nunca teve que tentar de
      // novo. Some lines devem soar como se ele ainda achasse que vai
      // ganhar — a rachadura ("Isso não deveria ter segurado") é só uma
      // fresta, não uma rendição.
      function malikAtacaDeNovo() {
        falarMalik(caixa, 'Escudo é só mais uma exceção que eu ainda não aprendi a lançar.', function () {
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
            // se foi o desejo das esferas que segurou, é aqui que ele se
            // gasta de verdade — não numa legenda separada mais cedo
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
                daquiA(300, function () { falarMalik(caixa, '...Isso não deveria ter segurado.'); });
              });
            });
          });
        });
      }

      function brocaSeSolta() {
        try { if (window.NexusMalikBridge) window.NexusMalikBridge.libertarComForca(650); } catch (e) {}
      }

      function mensagemPersonifica() {
        mensagemEl = legendaFlutuante('O NEXUS PERSONIFICA SUA PRESENÇA');
      }

      function leynAparece() {
        leynEl = el('div', 'width:' + (311 * (ALTURA_LEYN / 346)) + 'px;height:' + ALTURA_LEYN + 'px;background-image:url(\'' + PASTA_LEYN + 'leyn-sprite.png\');background-size:contain;background-repeat:no-repeat;background-position:center;opacity:0;transition:opacity 1.6s ease;filter:drop-shadow(0 0 20px rgba(196,163,90,.4));margin-bottom:14px;');
        raiz.insertBefore(leynEl, linha);
        requestAnimationFrame(function () { leynEl.style.opacity = '1'; });
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
        limparProgresso();
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
          // M.A.L.I.K. em si foi embora — mas vitória no B é cara, não
          // graciosa: "evitou que tudo fosse apagado, mas não que fosse
          // destruído". As 8 páginas ficam marcadas quebradas; o
          // malik-cicatriz.js (em nexus.html) assume a partir daqui.
          try {
            localStorage.setItem('malik_paginas_quebradas', JSON.stringify(
              ['zelda', 'valtheris', 'diary', 'book', 'covers', 'origem', 'icaro', 'recordacoes']
            ));
          } catch (e) {}
          try { if (window.NexusMalikRestaurarAgora) window.NexusMalikRestaurarAgora(); } catch (e) {}
        });
      }

      var ABERTURA_POR_ACAO = {
        cancao: 'A Canção da Tempestade ainda ecoa no ar — não foi só um chamado. Foi resposta.',
        esferas: 'As esferas ainda guardam o desejo — não gasto, só esperando a hora certa.'
        // 'falar' e null não ganham legenda de abertura: a recusa dele já foi a cena, no checkpointFinal
      };
      if (acaoEscolhida && ABERTURA_POR_ACAO[acaoEscolhida]) {
        daquiA(800, function () { legendaFlutuante(ABERTURA_POR_ACAO[acaoEscolhida], 2600); });
      }
      daquiA(1200, fantasmasJuntos);
      daquiA(5200, function () { falarIrmaos(linha, 'Você nos trouxe de volta um pro outro.'); });
      daquiA(8600, function () { falarIrmaos(linha, 'Não vamos deixar ele apagar o que isso significa.'); });
      daquiA(12300, function () { falarMalik(caixa, 'Processos zumbis. Eu limpo processos zumbis todo dia.'); });
      daquiA(16000, malikAtacaDeNovo); // se resolve por dentro: raio, bloqueio, "Ainda estamos aqui.", a rachadura dele
      daquiA(27000, function () { if (esferaEls.length === 0) esferasChegam(); }); // só dispara aqui se 'esferas' não foi a ação escolhida (senão já aconteceu dentro do bloqueio)
      daquiA(29800, brocaSeSolta);
      daquiA(30700, function () { falarMalik(caixa, 'Sete requisições simultâneas não é ataque. É só mais log pra eu apagar depois.'); });
      daquiA(35200, mensagemPersonifica);
      daquiA(38800, leynAparece);
      daquiA(40600, function () { falarMalik(caixa, '...'); }); // segunda vez sem resposta pronta — a rachadura do ataque já tinha sido a primeira
      daquiA(41300, observacaoEGolpe);
      daquiA(43700, malikExpulso);
      daquiA(46200, restauracaoCompleta);
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
      'Só o suficiente pra você entender que perdeu antes de eu explicar por quê.',
      'Misericórdia não é uma exceção que eu esqueci de tratar. É uma que eu removi de propósito.'
    ];

    var FASES    = [null, fase1Ping, fase2Cache, fase3Broca, fase4Mentira, fase5FalsaSaida, (cenario === 'B' ? oNexusResiste : fase6SemVolta)];
    // Fases mais longas que antes (~30% em média) — o combate tinha pressa
    // demais pra vender "luta de verdade". As durações abaixo são só o
    // tempo de esquiva; o turno de diálogo depois de cada uma soma mais.
    var DURACOES = [0,    12200,     12200,      10600,       5200,        6600,             0];

    function checkpoint(nFaseConcluida) {
      faseAtual = nFaseConcluida;
      modoAtual = 'checkpoint';
      salvarProgressoAtual();
      falarMalik(caixa, FALAS_MALIK[nFaseConcluida] || '...', function () {
        var resolvido = false, menuAtual = null;
        var seguir = function () {
          if (resolvido) return;
          resolvido = true;
          if (menuAtual) menuAtual.remove();
          if (nFaseConcluida === 5) checkpointFinal();
          else avancarPara(nFaseConcluida + 1);
        };
        menuAtual = menuAcao(caixa, [
          { label: 'Resistir', ativo: true, onClick: seguir },
          { label: 'Falar', ativo: true, onClick: function () {
              if (menuAtual) { menuAtual.remove(); menuAtual = null; }
              falarMalik(caixa, FALAS_FALAR[nFaseConcluida] || '...', seguir);
            } }
        ], 8000);
        daquiA(8000, seguir);
      });
    }

    // O checkpoint antes da fase 6 é diferente: é aqui que o preparo
    // (ou a falta dele) vira escolha de verdade, não só narração. No
    // B as duas opções levam ao mesmo lugar (a defesa do Nexus); a
    // diferença é que no A elas aparecem esmaecidas, inalcançáveis.
    function checkpointFinal() {
      modoAtual = 'checkpointFinal';
      salvarProgressoAtual();
      var falaFinal = cenario === 'B'
        ? 'Reuniram esferas. Aprenderam uma canção de criança. Isso não muda o protocolo.'
        : 'Você chegou até aqui sozinho. Sozinho é como termina.';
      falarMalik(caixa, falaFinal, function () {
        var resolvido = false, menuAtual = null;
        var seguirParaFase6 = function (acao) {
          if (resolvido) return;
          resolvido = true;
          acaoEscolhida = acao || null;
          salvarProgressoAtual();
          if (menuAtual) menuAtual.remove();
          avancarPara(6);
        };
        // Falar com ele não pede nenhum item — por isso fica disponível
        // nos dois cenários, diferente das outras duas. No A não muda o
        // fim, mas é uma tentativa de verdade, não só um botão apagado.
        menuAtual = menuAcao(caixa, [
          { label: 'Tocar a Canção da Tempestade', ativo: cenario === 'B', onClick: function () { seguirParaFase6('cancao'); } },
          { label: 'Usar o desejo das esferas', ativo: cenario === 'B', onClick: function () { seguirParaFase6('esferas'); } },
          { label: 'Tentar falar com o Malik', ativo: true, onClick: function () {
              resolvido = true; // trava o timer de fundo — a fala ainda vai tocar antes de avancarPara
              if (menuAtual) { menuAtual.remove(); menuAtual = null; }
              falarMalik(caixa, 'Falar é só uma chamada de função sem retorno. Nada muda porque você pediu educadamente.', function () {
                resolvido = false; // libera seguirParaFase6 de novo, dessa vez pra valer
                seguirParaFase6('falar');
              });
            } }
        ], cenario === 'B' ? 7000 : 3200);
        daquiA(cenario === 'B' ? 7000 : 3200, function () { seguirParaFase6(null); });
      });
    }

    function avancarPara(n) {
      faseAtual = n;
      modoAtual = 'fase';
      salvarProgressoAtual();
      if (FASES[n]) FASES[n]();
      if (n >= 1 && n <= 5 && DURACOES[n]) daquiA(DURACOES[n], function () { checkpoint(n); });
    }

    // ---------- início: do zero, ou retomando de onde parou ----------
    if (retomarDe && retomarDe.estado) {
      var partes = String(retomarDe.estado).split(':');
      var modo = partes[0], num = partes.length > 1 ? parseInt(partes[1], 10) : null;
      var pularPara = function () {
        if (modo === 'checkpointFinal') { faseAtual = 5; checkpointFinal(); }
        else if (modo === 'checkpoint' && num) { checkpoint(num); }
        else if (modo === 'fase' && num) { avancarPara(num); }
        else { avancarPara(1); } // estado desconhecido/corrompido — não trava, só recomeça
      };
      if (fraseAoRetomar) {
        daquiA(1400, function () { falarMalik(caixa, fraseAoRetomar, pularPara); });
      } else {
        daquiA(1400, pularPara);
      }
    } else {
      daquiA(2600, function () { avancarPara(1); });
    }
  }

  window.iniciarConfrontoMalik = iniciarConfrontoMalik;
  // Exposta pro malik.js chamar já no nível 4 (muito antes do confronto
  // começar) — sem isso, música de fundo só era silenciada quando o
  // retrato dele já tinha aparecido, minutos depois de já estar tudo errado.
  window.NexusMalikSilenciarDoc = silenciarTudoMenosMalik;
})();
