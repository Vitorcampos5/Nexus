/* malik-cicatriz.js — o rescaldo do Cenário B.
   ============================================================
   Vive só em nexus.html (não em index.html) — as páginas quebradas
   são um estado do PRÓPRIO nexus, não do confronto em si. Carregado
   sempre; inerte se não houver nada quebrado (localStorage vazio).

   Cadeia completa:
     1. Viajante clica numa página quebrada -> os Irmãos avisam
        (window.NexusIrmaosMostrarRedirecionamento, no nexus.html).
     2. Se a página quebrada for a Triforce especificamente -> o Nexus
        gasta o que sobrou nele pra abrir um caminho -> cena do
        Herói-Sombra + Guerreiro do Crepúsculo, diálogo, escolha.
     3. Sim -> aprende a Canção da Cura (sequência de notas) -> volta
        pro nexus -> toca a canção de verdade (mesma lógica secreta
        da Canção da Tempestade) -> cura tudo, com cicatriz permanente
        (ver window.NexusMalikCurarTudo, no nexus.html).
     4. Não -> silêncio, a tela perde a cor e some, diálogo final,
        volta pro nexus só pra ver tudo se apagando devagar (30s) -
        e então é permanente, mesma trava de sempre (malik-apagado.js).
   ============================================================
*/
(function () {
  'use strict';

  var CHAVE_QUEBRADAS = 'malik_paginas_quebradas';
  var CHAVE_CURA_APRENDIDA = 'song_of_healing_aprendida';

  function lerQuebradas() {
    try { var a = JSON.parse(localStorage.getItem(CHAVE_QUEBRADAS) || '[]'); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }

  var quebradas = lerQuebradas();
  if (!quebradas.length) return; // nada quebrado — o resto do arquivo nem roda

  function curaJaAprendida() {
    try { return localStorage.getItem(CHAVE_CURA_APRENDIDA) === '1'; } catch (e) { return false; }
  }
  function marcarCuraAprendida() {
    try { localStorage.setItem(CHAVE_CURA_APRENDIDA, '1'); } catch (e) {}
  }

  function el(tag, css, texto) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  // ---------- entrada: clique numa página quebrada ----------
  window.NexusCicatrizClicouQuebrado = function (def) {
    // Os irmãos comentando e a cena do Herói-Sombra só fazem sentido
    // DEPOIS de vencer o Caminho B — são consequência da vitória, não
    // algo que já existe durante a corrupção. Antes disso (a única
    // página pega pela perseguição, por exemplo), clicar só confirma
    // que está inacessível — sem diálogo nenhum ainda, nem pra Zelda.
    var batalhaResolvida = false;
    try { batalhaResolvida = !!localStorage.getItem('malik_resolvido_em'); } catch (e) {}
    if (!batalhaResolvida) return;

    if (def.id === 'zelda') {
      // primeiro o Nexus restaura só 1 dos 3 triângulos (visual em
      // nexus.html — os outros 2 continuam poeira até a cura de
      // verdade); só depois disso a cena abre.
      if (window.NexusRestaurarUmTriangulo) window.NexusRestaurarUmTriangulo(abrirCenaHeroiSombra);
      else abrirCenaHeroiSombra();
    } else if (window.NexusIrmaosMostrarRedirecionamento) {
      window.NexusIrmaosMostrarRedirecionamento();
    }
  };

  // ---------- a cena: Herói-Sombra + Guerreiro do Crepúsculo ----------
  var CHAVE_CHEGOU_ESCOLHA = 'malik_heroi_sombra_na_escolha';

  function abrirCenaHeroiSombra() {
    var raiz = el('div', 'position:fixed;inset:0;z-index:850000;background:radial-gradient(ellipse at 50% 30%,#1c2e22 0%,#0a1410 55%,#040705 100%);display:flex;flex-direction:column;align-items:center;justify-content:flex-end;font-family:"Cormorant Garamond",Georgia,serif;color:#E8E0D0;opacity:0;transition:opacity 1.4s ease;padding-bottom:6vh;');
    raiz.appendChild(el('div', 'position:absolute;inset:0;background:radial-gradient(ellipse at 50% 85%,rgba(196,163,90,.16),transparent 60%);pointer-events:none;'));
    document.body.appendChild(raiz);
    requestAnimationFrame(function () { raiz.style.opacity = '1'; });

    var caixaFala = el('div', 'width:min(88vw,520px);min-height:5.5em;text-align:center;font-size:17px;line-height:1.7;font-style:italic;');
    var nomeAtual = el('div', 'font-family:Cinzel,serif;font-style:normal;letter-spacing:.14em;font-size:12px;color:#C4A35A;margin-bottom:.5rem;text-transform:uppercase;');
    var textoAtual = el('div', '');
    caixaFala.appendChild(nomeAtual);
    caixaFala.appendChild(textoAtual);
    raiz.appendChild(caixaFala);

    var areaEscolha = el('div', 'margin-top:1.4rem;display:flex;gap:14px;opacity:0;transition:opacity .5s ease;');
    raiz.appendChild(areaEscolha);

    var FALAS = [
      { quem: 'Herói-Sombra', texto: 'Você conseguiu evitar que tudo fosse apagado...' },
      { quem: 'Guerreiro do Crepúsculo', texto: 'Mas não que fosse destruído...' },
      { quem: 'Guerreiro do Crepúsculo', texto: 'Você demonstrou CORAGEM ao lidar com o que não conhecia.' },
      { quem: 'Herói-Sombra', texto: 'No entanto não estava preparado para as perdas. As pessoas quase nunca estão.' },
      { quem: 'Herói-Sombra', texto: 'Você estaria disposto a tentar curar tudo?' },
      { quem: 'Herói-Sombra', texto: 'Ainda que as coisas não voltem a ser como você conhecia?' },
      { quem: 'Herói-Sombra', texto: 'Está disposto a lutar por um recomeço?' }
    ];

    // Se a cena já tinha chegado na escolha antes (ex.: a proteção
    // contra cópia do index reinicia o iframe quando o viajante perde o
    // foco da aba, o que apagava esse diálogo do zero) — pula direto
    // pra escolha em vez de repetir as 7 falas de novo.
    var jaChegouNaEscolha = false;
    try { jaChegouNaEscolha = localStorage.getItem(CHAVE_CHEGOU_ESCOLHA) === '1'; } catch (e) {}

    var i = 0;
    function proximaFala() {
      if (i >= FALAS.length) { mostrarEscolha(); return; }
      nomeAtual.textContent = FALAS[i].quem;
      textoAtual.style.transition = 'opacity .3s ease';
      textoAtual.style.opacity = '0';
      setTimeout(function () {
        textoAtual.textContent = FALAS[i].texto;
        textoAtual.style.opacity = '1';
        i++;
        setTimeout(proximaFala, 3800);
      }, 320);
    }

    if (jaChegouNaEscolha) {
      mostrarEscolha();
    } else {
      // espera a mensagem do portal aparecer, ficar um instante e
      // começar a sumir antes de a primeira fala entrar — as duas não
      // disputam espaço
      setTimeout(proximaFala, 4600);
    }

    function mostrarEscolha() {
      try { localStorage.setItem(CHAVE_CHEGOU_ESCOLHA, '1'); } catch (e) {}
      var simBtn = el('button', 'font-family:Cinzel,serif;font-size:13px;letter-spacing:.08em;padding:.6rem 1.4rem;background:#000;border:1px solid #C4A35A;color:#C4A35A;cursor:pointer;', 'Sim');
      var naoBtn = el('button', 'font-family:Cinzel,serif;font-size:13px;letter-spacing:.08em;padding:.6rem 1.4rem;background:#000;border:1px solid rgba(232,224,208,.35);color:rgba(232,224,208,.7);cursor:pointer;', 'Não');
      areaEscolha.appendChild(simBtn);
      areaEscolha.appendChild(naoBtn);
      requestAnimationFrame(function () { areaEscolha.style.opacity = '1'; });
      simBtn.addEventListener('click', function () {
        try { localStorage.removeItem(CHAVE_CHEGOU_ESCOLHA); } catch (e) {}
        raiz.remove(); ensinarCancaoDaCura();
      });
      naoBtn.addEventListener('click', function () {
        try { localStorage.removeItem(CHAVE_CHEGOU_ESCOLHA); } catch (e) {}
        areaEscolha.remove(); recusarCura(raiz, caixaFala, nomeAtual, textoAtual);
      });
    }
  }

  // ---------- Sim: aprender a Canção da Cura ----------
  // As 6 primeiras notas de verdade — Zeldapedia (C-esquerda, C-direita,
  // C-baixo, repetido) e análise de pitch do áudio real batem no mesmo
  // padrão: B5, A5, F5, B5, A5, F5. F5 é a mesma frequência que o
  // "Baixo" da Canção da Tempestade já usa — mesma referência de afinação
  // do resto do site, não a levemente aguda que o jogo usa.
  var SEQUENCIA_CURA = ['Esquerda', 'Direita', 'Baixo', 'Esquerda', 'Direita', 'Baixo'];
  var NOTA_FREQ_CURA = { Esquerda: 987.77, Direita: 880.00, Baixo: 698.46, Cima: 1174.66 };
  var PASTA_CURA = 'Assets/cura/';
  var INTERVALO_DEMO_MS = 820; // ritmo da demonstração — só notas sintetizadas agora, então dá pra controlar a velocidade direto

  var audioCtxCura = null;
  function tocarNotaCura(freq, duracaoMs) {
    try {
      if (!audioCtxCura) audioCtxCura = new (window.AudioContext || window.webkitAudioContext)();
      var osc = audioCtxCura.createOscillator();
      var gain = audioCtxCura.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      var agora = audioCtxCura.currentTime;
      gain.gain.setValueAtTime(0.0001, agora);
      gain.gain.exponentialRampToValueAtTime(0.28, agora + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, agora + duracaoMs / 1000);
      osc.connect(gain);
      gain.connect(audioCtxCura.destination);
      osc.start(agora);
      osc.stop(agora + duracaoMs / 1000 + 0.05);
    } catch (e) {}
  }

  function glifoNota(nome) {
    if (nome === 'Esquerda') return '\u25C4';
    if (nome === 'Direita')  return '\u25BA';
    if (nome === 'Baixo')    return '\u25BC';
    if (nome === 'Cima')     return '\u25B2';
    return '\u25CF';
  }

  function ensinarCancaoDaCura() {
    var raiz = el('div', 'position:fixed;inset:0;z-index:850000;background:rgba(4,7,5,.94);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:"Cormorant Garamond",Georgia,serif;color:#E8E0D0;opacity:0;transition:opacity 1s ease;text-align:center;padding:2rem;');
    document.body.appendChild(raiz);
    requestAnimationFrame(function () { raiz.style.opacity = '1'; });

    raiz.appendChild(el('div', 'font-family:Cinzel,serif;letter-spacing:.14em;font-size:12px;color:#C4A35A;margin-bottom:.6rem;text-transform:uppercase;', 'Herói-Sombra & Guerreiro do Crepúsculo'));
    var instrucaoEl = el('div', 'font-style:italic;font-size:17px;margin-bottom:1.6rem;', 'Ouça com atenção.');
    raiz.appendChild(instrucaoEl);

    var notasArea = el('div', 'display:flex;gap:14px;margin-bottom:1.6rem;flex-wrap:wrap;justify-content:center;max-width:360px;');
    var glifosEl = SEQUENCIA_CURA.map(function (nota) {
      var g = el('div', 'width:42px;height:42px;border:1px solid rgba(196,163,90,.4);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;color:rgba(196,163,90,.35);transition:color .25s ease,border-color .25s ease,transform .25s ease,box-shadow .25s ease;', glifoNota(nota));
      notasArea.appendChild(g);
      return g;
    });
    raiz.appendChild(notasArea);

    var instrucaoToque = el('div', 'font-size:12px;letter-spacing:.08em;color:rgba(232,224,208,.55);opacity:0;transition:opacity .5s ease;', 'toque: esquerda, direita, baixo, esquerda, direita, baixo (ou deslize na tela)');
    raiz.appendChild(instrucaoToque);

    function acenderGlifo(idx) {
      glifosEl[idx].style.color = '#E8C97A';
      glifosEl[idx].style.borderColor = '#E8C97A';
      glifosEl[idx].style.transform = 'scale(1.15)';
      glifosEl[idx].style.boxShadow = '0 0 10px rgba(232,201,122,.6)';
    }
    function apagarTodos() {
      glifosEl.forEach(function (g) { g.style.color = 'rgba(196,163,90,.35)'; g.style.borderColor = 'rgba(196,163,90,.4)'; g.style.transform = 'none'; g.style.boxShadow = 'none'; });
    }

    // ---- demonstração: só notas sintetizadas agora, sem uivo e sem
    // depender do tempo de nenhuma gravação — ritmo mais lento e
    // controlado direto por INTERVALO_DEMO_MS ----
    SEQUENCIA_CURA.forEach(function (nota, i) {
      setTimeout(function () {
        acenderGlifo(i);
        tocarNotaCura(NOTA_FREQ_CURA[nota], 620);
      }, i * INTERVALO_DEMO_MS);
    });

    setTimeout(function () {
      apagarTodos();
      instrucaoEl.textContent = 'Agora toque você.';
      instrucaoToque.style.opacity = '1';
      iniciarEscutaDoViajante();
    }, SEQUENCIA_CURA.length * INTERVALO_DEMO_MS + 900);

    // ---- o viajante repete, com tom sintetizado de feedback (nunca a gravação) ----
    function iniciarEscutaDoViajante() {
      var passo = 0;
      function aoAcertar(nota) {
        if (nota !== SEQUENCIA_CURA[passo]) { passo = 0; apagarTodos(); return; }
        acenderGlifo(passo);
        tocarNotaCura(NOTA_FREQ_CURA[nota], 450);
        passo++;
        if (passo >= SEQUENCIA_CURA.length) {
          document.removeEventListener('keydown', aoTecla);
          raiz.removeEventListener('touchstart', aoToqueInicio);
          raiz.removeEventListener('touchend', aoToqueFim);
          marcarCuraAprendida();
          setTimeout(function () { raiz.remove(); mostrarVaECure(); }, 900);
        }
      }

      function aoTecla(e) {
        var mapa = { ArrowLeft: 'Esquerda', ArrowRight: 'Direita', ArrowDown: 'Baixo', ArrowUp: 'Cima' };
        if (mapa[e.key]) aoAcertar(mapa[e.key]);
      }
      document.addEventListener('keydown', aoTecla);

      var toqueX = null, toqueY = null;
      function aoToqueInicio(e) { var t = e.changedTouches[0]; toqueX = t.clientX; toqueY = t.clientY; }
      function aoToqueFim(e) {
        if (toqueX === null) return;
        var t = e.changedTouches[0];
        var dx = t.clientX - toqueX, dy = t.clientY - toqueY;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        if (Math.abs(dx) > Math.abs(dy)) aoAcertar(dx > 0 ? 'Direita' : 'Esquerda');
        else aoAcertar(dy > 0 ? 'Baixo' : 'Cima');
        toqueX = null;
      }
      raiz.addEventListener('touchstart', aoToqueInicio, { passive: true });
      raiz.addEventListener('touchend', aoToqueFim, { passive: true });
    }
  }

  function mostrarVaECure() {
    var raiz = el('div', 'position:fixed;inset:0;z-index:850000;background:rgba(4,7,5,.94);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:"Cormorant Garamond",Georgia,serif;color:#E8E0D0;opacity:0;transition:opacity .8s ease;text-align:center;padding:2rem;');
    document.body.appendChild(raiz);
    requestAnimationFrame(function () { raiz.style.opacity = '1'; });
    raiz.appendChild(el('div', 'font-family:Cinzel,serif;letter-spacing:.14em;font-size:12px;color:#C4A35A;margin-bottom:.6rem;text-transform:uppercase;', 'Herói-Sombra'));
    raiz.appendChild(el('div', 'font-style:italic;font-size:18px;margin-bottom:1.8rem;', 'Vá, cure o que estiver em pedaços, Herói.'));
    var voltar = el('button', 'font-family:Cinzel,serif;font-size:13px;letter-spacing:.08em;padding:.6rem 1.5rem;background:#000;border:1px solid #C4A35A;color:#C4A35A;cursor:pointer;', 'Voltar para o Nexus');
    raiz.appendChild(voltar);
    voltar.addEventListener('click', function () { raiz.remove(); ativarEscutaDaCura(); });
  }

  // ---------- de volta ao nexus: tocar a canção de verdade pra curar ----------
  function ativarEscutaDaCura() {
    var SEQ = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowDown'];
    var NOME_POR_TECLA = { ArrowLeft: 'Esquerda', ArrowRight: 'Direita', ArrowDown: 'Baixo' };
    var pos = 0;
    function reset() { pos = 0; }
    function aoTecla(e) {
      if (e.key === SEQ[pos]) {
        tocarNotaCura(NOTA_FREQ_CURA[NOME_POR_TECLA[e.key]], 450);
        pos++;
        if (pos >= SEQ.length) { curarComToque(); }
      }
      else reset();
    }
    document.addEventListener('keydown', aoTecla);

    var tx = null, ty = null;
    // nomeadas (não anônimas) pra dar pra remover as três juntas depois
    // de curar — senão ficavam escutando touch pra sempre, sem função.
    function aoToqueInicio(e) { var t = e.changedTouches[0]; tx = t.clientX; ty = t.clientY; }
    function aoToqueFim(e) {
      if (tx === null) return;
      var t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      var direcao = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : (dy > 0 ? 'ArrowDown' : 'ArrowUp');
      if (direcao === SEQ[pos]) {
        if (NOME_POR_TECLA[direcao]) tocarNotaCura(NOTA_FREQ_CURA[NOME_POR_TECLA[direcao]], 450);
        pos++;
        if (pos >= SEQ.length) curarComToque();
      } else reset();
      tx = null;
    }
    document.addEventListener('touchstart', aoToqueInicio, { passive: true });
    document.addEventListener('touchend', aoToqueFim, { passive: true });

    function curarComToque() {
      document.removeEventListener('keydown', aoTecla);
      document.removeEventListener('touchstart', aoToqueInicio);
      document.removeEventListener('touchend', aoToqueFim);
      if (window.NexusMalikCurarTudo) window.NexusMalikCurarTudo();
      // mesmo padrão da Canção da Tempestade: a gravação completa toca
      // como recompensa, só depois de "aprendida" — não durante o ensino
      try { new Audio(PASTA_CURA + 'ocarina.mp3').play().catch(function () {}); } catch (e) {}
      var aviso = el('div', 'position:fixed;left:50%;bottom:8vh;transform:translateX(-50%);z-index:850000;font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;font-size:15px;color:#E8C97A;text-shadow:0 0 12px rgba(232,201,122,.6);opacity:0;transition:opacity 1s ease;', 'O Nexus se refaz — com cicatrizes, mas inteiro.');
      document.body.appendChild(aviso);
      requestAnimationFrame(function () { aviso.style.opacity = '1'; });
      setTimeout(function () { aviso.style.opacity = '0'; setTimeout(function () { aviso.remove(); }, 1200); }, 4200);
    }
  }

  if (curaJaAprendida()) ativarEscutaDaCura();

  // ---------- Não: recusa, apagamento lento ----------
  function recusarCura(raizCena, caixaFala, nomeAtual, textoAtual) {
    nomeAtual.textContent = '';
    textoAtual.style.transition = 'opacity .3s ease';
    textoAtual.style.opacity = '0';

    setTimeout(function () {
      raizCena.style.transition = 'filter 3s ease, opacity 3s ease';
      raizCena.style.filter = 'grayscale(1) brightness(.4)';

      setTimeout(function () {
        var FALAS_FINAIS = [
          'Achamos que você tinha um motivo pelo qual lutar, que não desistiria só porque as coisas mudam...',
          'Estávamos errados...'
        ];
        var j = 0;
        nomeAtual.textContent = 'Herói-Sombra';
        textoAtual.style.opacity = '1';
        function proxima() {
          if (j >= FALAS_FINAIS.length) { setTimeout(iniciarApagamentoFinal, 2200); return; }
          textoAtual.style.opacity = '0';
          setTimeout(function () {
            textoAtual.textContent = FALAS_FINAIS[j];
            textoAtual.style.opacity = '1';
            j++;
            setTimeout(proxima, 2800);
          }, 300);
        }
        proxima();
      }, 2600);
    }, 1800);
  }

  function iniciarApagamentoFinal() {
    Array.prototype.slice.call(document.querySelectorAll('div')).forEach(function (n) { if (n.style && n.style.zIndex === '850000') n.remove(); });

    var DURACAO_MS = 30000;
    var overlay = el('div', 'position:fixed;inset:0;z-index:860000;pointer-events:none;');
    document.body.appendChild(overlay);

    var alvos = Array.prototype.slice.call(document.body.querySelectorAll('*')).filter(function (n) {
      var r = n.getBoundingClientRect();
      return r.width > 4 && r.height > 4 && n !== overlay && !overlay.contains(n);
    });
    alvos.sort(function () { return Math.random() - 0.5; });

    var inicio = performance.now();
    function passo(t) {
      var decorrido = t - inicio;
      var prog = Math.min(1, decorrido / DURACAO_MS);
      var quantosSumir = Math.floor(prog * alvos.length);
      for (var k = 0; k < quantosSumir; k++) {
        var n = alvos[k];
        if (n && n.style && n.style.opacity !== '0') {
          n.style.transition = 'opacity 1.6s ease, filter 1.6s ease, transform 1.6s ease';
          n.style.filter = 'blur(3px) brightness(.3)';
          n.style.transform = 'scale(.92)';
          n.style.opacity = '0';
        }
      }
      if (prog < 1) requestAnimationFrame(passo);
      else {
        document.title = 'M.A.L.I.K.';
        document.body.innerHTML = '';
        document.body.style.background = '#000';
        try { if (window.top && window.top.NexusMalikApagarDeVez) window.top.NexusMalikApagarDeVez(); } catch (e) {}
      }
    }
    requestAnimationFrame(passo);
  }
})();
