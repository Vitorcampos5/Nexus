/* malik-cicatriz.js — o rescaldo do Cenário B.
   ============================================================
   Vive só em nexus.html (não em index.html) — as páginas quebradas
   são um estado do PRÓPRIO nexus, não do confronto em si. Carregado
   sempre; inerte se não houver nada quebrado (localStorage vazio).

   Cadeia completa (atualizada):
     1. Viajante clica numa página quebrada -> os Irmãos avisam
        (window.NexusIrmaosMostrarRedirecionamento, no nexus.html).
     2. Se a página quebrada for a Triforce especificamente -> o Nexus
        gasta o que sobrou nele pra abrir um caminho -> abre
        tloz/visual_novel.html (Lost Woods → Ruínas Perdidas →
        Hero’s Shade + Twilight Hero, diálogo, escolha, Canção da Cura).
     3. Sim (dentro do HTML) -> aprende a Canção da Cura -> marca
        localStorage song_of_healing_aprendida -> volta pro nexus ->
        toca a canção de verdade -> cura tudo, com cicatriz permanente.
     4. Não (dentro do HTML) -> silêncio e escurecimento tratados no
        próprio visual_novel.html -> marca malik_cura_recusada_em ->
        volta pro nexus -> ESTE arquivo detecta a marca no boot e roda
        iniciarApagamentoFinal() (30s apagando os elementos reais do
        nexus.html, um a um, aleatoriamente) -> no fim, chama
        window.top.NexusMalikApagarDeVez() — o mesmo travamento
        permanente e sem volta do Cenário A (malik-apagado.js).

   ESTADO DE CURA vs POEIRA (localStorage):
     - malik_paginas_quebradas  → lista de páginas/objetos em poeira
     - song_of_healing_aprendida → canção aprendida no visual_novel
     - malik_nexus_curado        → flag PERMANENTE de nexus curado
     Ao curar de verdade, ESTE arquivo limpa malik_paginas_quebradas
     e grava malik_nexus_curado = '1'. O nexus.html DEVE, no boot:
       1) se malik_nexus_curado === '1' → NÃO reaplicar poeira
       2) preferir o estado curado sobre qualquer lista de quebradas
   ============================================================
*/
(function () {
  'use strict';

  var CHAVE_QUEBRADAS = 'malik_paginas_quebradas';
  var CHAVE_CURA_APRENDIDA = 'song_of_healing_aprendida';
  var CHAVE_NEXUS_CURADO = 'malik_nexus_curado';
  var CHAVE_CURA_RECUSADA = 'malik_cura_recusada_em';

  // tloz/ é irmã deste arquivo e de nexus.html/index.html na raiz —
  // por isso o caminho relativo desce uma pasta a partir daqui.
  var VISUAL_NOVEL_URL = 'tloz/visual_novel.html';

  function lerQuebradas() {
    try {
      var a = JSON.parse(localStorage.getItem(CHAVE_QUEBRADAS) || '[]');
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  }

  function limparQuebradas() {
    try {
      localStorage.removeItem(CHAVE_QUEBRADAS);
      localStorage.removeItem('malik_objetos_poeira');
      localStorage.removeItem('malik_dust_state');
      localStorage.removeItem('malik_poeira');
    } catch (e) {}
  }

  function curaJaAprendida() {
    try {
      return localStorage.getItem(CHAVE_CURA_APRENDIDA) === '1';
    } catch (e) {
      return false;
    }
  }

  function nexusJaCurado() {
    try {
      return localStorage.getItem(CHAVE_NEXUS_CURADO) === '1';
    } catch (e) {
      return false;
    }
  }

  function curaRecusada() {
    try {
      return !!localStorage.getItem(CHAVE_CURA_RECUSADA);
    } catch (e) {
      return false;
    }
  }

  function marcarNexusCurado() {
    try {
      localStorage.setItem(CHAVE_NEXUS_CURADO, '1');
      limparQuebradas();
    } catch (e) {}
  }

  // Restaurada de uma versão anterior deste arquivo (de quando a cena
  // do Herói-Sombra ainda rodava dentro do próprio nexus.html, antes de
  // virar tloz/visual_novel.html) — se perdeu na divisão porque dependia
  // do DOM do nexus ainda estar de pé, e a visual novel já navega pra
  // longe dele. Restaurada aqui, no único lugar onde os elementos que
  // ela apaga (os do próprio nexus.html) ainda existem de verdade.
  function iniciarApagamentoFinal() {
    // Consome a marca já no início — se a página recarregar no meio dos
    // 30s, não repete a animação inteira de novo (o Nexus já devia ter
    // travado por conta do malik-apagado.js antes disso acontecer, mas
    // é uma rede de segurança).
    try { localStorage.removeItem(CHAVE_CURA_RECUSADA); } catch (e) {}

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

  // Se o nexus JÁ está curado, limpa residual de poeira em todo load
  // (evita o bug do refresh voltando tudo para poeira).
  if (nexusJaCurado()) {
    limparQuebradas();
  }

  // Recusou a cura na visual novel (Não): a partir daqui o Nexus se
  // apaga de vez, sobre os elementos DE VERDADE desta página — por
  // isso isto só podia voltar a existir aqui (em nexus.html), não na
  // visual novel, que já não tem mais o nexus carregado quando chega
  // nesse ponto.
  if (curaRecusada()) {
    iniciarApagamentoFinal();
    return;
  }

  var quebradas = lerQuebradas();
  if (!quebradas.length && !curaJaAprendida() && !nexusJaCurado()) return;

  function el(tag, css, texto) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  window.NexusCicatrizClicouQuebrado = function (def) {
    if (nexusJaCurado()) return;

    var batalhaResolvida = false;
    try {
      batalhaResolvida = !!localStorage.getItem('malik_resolvido_em');
    } catch (e) {}
    if (!batalhaResolvida) return;

    if (def.id === 'zelda') {
      var triforceJaRestaurada = false;
      try { triforceJaRestaurada = localStorage.getItem('malik_triforce_restaurada') === '1'; } catch (e) {}
      if (triforceJaRestaurada) {
        // Já restaurou antes — não repete a animação, só abre a visual
        // novel de novo (ela decide sozinha, pelo malik_heroi_sombra_visto,
        // se mostra a Lost Woods inteira ou só a visita repetida).
        abrirVisualNovel();
      } else if (window.NexusRestaurarUmTriangulo) {
        window.NexusRestaurarUmTriangulo(function () {
          try { localStorage.setItem('malik_triforce_restaurada', '1'); } catch (e) {}
          abrirVisualNovel();
        });
      } else {
        try { localStorage.setItem('malik_triforce_restaurada', '1'); } catch (e) {}
        abrirVisualNovel();
      }
    } else if (window.NexusIrmaosMostrarRedirecionamento) {
      window.NexusIrmaosMostrarRedirecionamento();
    }
  };

  function abrirVisualNovel() {
    try {
      localStorage.setItem('malik_vn_retorno', window.location.href);
    } catch (e) {}
    window.location.href = VISUAL_NOVEL_URL;
  }

  var NOTA_FREQ_CURA = { Esquerda: 987.77, Direita: 880.00, Baixo: 698.46, Cima: 1174.66 };
  var PASTA_CURA = 'Assets/cura/';

  var audioCtxCura = null;
  function tocarNotaCura(freq, duracaoMs) {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtxCura) audioCtxCura = new AC();
      var ac = audioCtxCura,
        now = ac.currentTime;
      var dur = (duracaoMs || 620) / 1000;
      var o1 = ac.createOscillator(),
        o2 = ac.createOscillator(),
        g = ac.createGain();
      var vib = ac.createOscillator(),
        vibGain = ac.createGain();
      o1.type = 'sine';
      o1.frequency.value = freq;
      o2.type = 'sine';
      o2.frequency.value = freq * 1.003;
      vib.frequency.value = 5.2;
      vibGain.gain.value = freq * 0.006;
      vib.connect(vibGain);
      vibGain.connect(o1.frequency);
      vibGain.connect(o2.frequency);
      o1.connect(g);
      o2.connect(g);
      g.connect(ac.destination);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.26, now + Math.min(0.06, dur * 0.3));
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o1.start(now);
      o2.start(now);
      vib.start(now);
      o1.stop(now + dur + 0.05);
      o2.stop(now + dur + 0.05);
      vib.stop(now + dur + 0.05);
      if (ac.state === 'suspended') ac.resume();
    } catch (e) {}
  }

  function ativarEscutaDaCura() {
    if (nexusJaCurado()) return;

    var SEQ = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowDown'];
    var NOME_POR_TECLA = { ArrowLeft: 'Esquerda', ArrowRight: 'Direita', ArrowDown: 'Baixo' };
    var pos = 0;
    function reset() {
      pos = 0;
    }
    function aoTecla(e) {
      if (e.key === SEQ[pos]) {
        tocarNotaCura(NOTA_FREQ_CURA[NOME_POR_TECLA[e.key]], 450);
        pos++;
        if (pos >= SEQ.length) {
          curarComToque();
        }
      } else {
        reset();
      }
    }
    document.addEventListener('keydown', aoTecla);

    var tx = null,
      ty = null;
    function aoToqueInicio(e) {
      var t = e.changedTouches[0];
      tx = t.clientX;
      ty = t.clientY;
    }
    function aoToqueFim(e) {
      if (tx === null) return;
      var t = e.changedTouches[0],
        dx = t.clientX - tx,
        dy = t.clientY - ty;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      var direcao =
        Math.abs(dx) > Math.abs(dy)
          ? dx > 0
            ? 'ArrowRight'
            : 'ArrowLeft'
          : dy > 0
            ? 'ArrowDown'
            : 'ArrowUp';
      if (direcao === SEQ[pos]) {
        if (NOME_POR_TECLA[direcao]) tocarNotaCura(NOTA_FREQ_CURA[NOME_POR_TECLA[direcao]], 450);
        pos++;
        if (pos >= SEQ.length) curarComToque();
      } else {
        reset();
      }
      tx = null;
    }
    document.addEventListener('touchstart', aoToqueInicio, { passive: true });
    document.addEventListener('touchend', aoToqueFim, { passive: true });

    function curarComToque() {
      document.removeEventListener('keydown', aoTecla);
      document.removeEventListener('touchstart', aoToqueInicio);
      document.removeEventListener('touchend', aoToqueFim);

      // CURA PERMANENTE prevalece sobre a poeira
      marcarNexusCurado();

      var aviso = el(
        'div',
        'position:fixed;left:50%;bottom:8vh;transform:translateX(-50%);z-index:850000;font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;font-size:15px;color:#E8C97A;text-shadow:0 0 12px rgba(232,201,122,.6);opacity:0;transition:opacity 1s ease;',
        'O Nexus se refaz — com cicatrizes, mas inteiro.'
      );
      document.body.appendChild(aviso);
      requestAnimationFrame(function () {
        aviso.style.opacity = '1';
      });
      setTimeout(function () {
        aviso.style.opacity = '0';
        setTimeout(function () {
          aviso.remove();
        }, 1200);
      }, 32000);

      var musica = null;
      try {
        musica = new Audio(PASTA_CURA + 'Song of Healing - The Legend of Zelda Twilight Princess.mp3');
      } catch (e) {}
      var comecou = false;
      function comecarCura() {
        if (comecou) return;
        comecou = true;
        var duracaoMs =
          musica && musica.duration && isFinite(musica.duration) ? musica.duration * 1000 : 28000;
        if (window.NexusMalikCurarUmDeCadaVez) window.NexusMalikCurarUmDeCadaVez(duracaoMs);
        else if (window.NexusMalikCurarTudo) window.NexusMalikCurarTudo();
      }
      if (musica) {
        musica.addEventListener('loadedmetadata', comecarCura);
        musica.play().catch(function () {});
      }
      setTimeout(comecarCura, 900);
    }
  }

  if (curaJaAprendida() && !nexusJaCurado()) {
    ativarEscutaDaCura();
  }

  // Helpers para o nexus.html consultar / forçar o estado
  window.NexusMalikEstaCurado = nexusJaCurado;
  window.NexusMalikMarcarCurado = marcarNexusCurado;
  window.NexusMalikLimparQuebradas = limparQuebradas;
})();
