/* Toca a música de fundo (#bgm) com fade-in suave, assim que o usuário
   interagir com a página pela primeira vez — necessário porque navegadores
   bloqueiam autoplay de áudio com som antes de qualquer interação.

   Importante: só ficam de guarda eventos que o navegador realmente conta
   como gesto válido pra liberar autoplay — clique, tecla e fim de toque
   (touchend). "scroll" fica de fora de propósito: um play() disparado por
   ele está fadado a falhar sempre, e ainda por cima podia "gastar" o
   gatilho antes de um clique de verdade aparecer. "touchstart" também
   fica de fora — ele dispara antes do navegador saber se aquele toque vai
   virar um tap ou o início de um scroll, então não é confiável aqui.

   Também tenta tocar imediatamente ao carregar (ver o fim do arquivo):
   se esta página foi aberta como consequência direta de um clique — um
   link de dentro do próprio site, por exemplo — o navegador já pode
   considerar essa página "ativada" e deixar essa tentativa funcionar de
   primeira, sem esperar por outro gesto aqui dentro. Se a página foi
   aberta "fria" (URL digitada, aba nova, link externo), a tentativa
   falha em silêncio e os gatilhos abaixo continuam de prontidão.

   Se a página tiver algum <video>, a música nunca toca por cima dele:
   pausa assim que o vídeo começa, e volta (ou começa, se ainda não tinha
   começado) quando o vídeo pausa ou termina. */
(function () {
  var bgm = document.getElementById('bgm');
  if (!bgm) return;

  var unlocked = false;   // true assim que o play() já deu certo uma vez
  var attempting = false; // evita duas tentativas de play() ao mesmo tempo

  var TRIGGERS = ['click', 'touchend', 'keydown'];

  function anyVideoPlaying() {
    var vids = document.querySelectorAll('video');
    for (var i = 0; i < vids.length; i++) {
      if (!vids[i].paused && !vids[i].ended) return true;
    }
    return false;
  }

  function removeTriggers() {
    TRIGGERS.forEach(function (evt) {
      document.removeEventListener(evt, start);
    });
  }

  function fadeIn() {
    if (attempting) return;
    attempting = true;
    bgm.volume = 0;
    bgm.play().then(function () {
      attempting = false;
      unlocked = true;
      removeTriggers();
      var i = 0;
      var iv = setInterval(function () {
        i++;
        bgm.volume = Math.min(.5, .5 * (i / 67));
        if (i >= 67) clearInterval(iv);
      }, 30);
    }).catch(function () {
      attempting = false; // gesto não foi suficiente — os listeners continuam de pé pro próximo
    });
  }

  function start() {
    if (unlocked || anyVideoPlaying()) return;
    fadeIn();
  }

  function resumeIfClear() {
    if (anyVideoPlaying()) return;
    if (!unlocked) { start(); return; }
    if (bgm.paused) fadeIn();
  }

  TRIGGERS.forEach(function (evt) {
    document.addEventListener(evt, start, { passive: true });
  });

  document.querySelectorAll('video').forEach(function (v) {
    v.addEventListener('play', function () {
      if (!bgm.paused) bgm.pause();
    });
    v.addEventListener('pause', resumeIfClear);
    v.addEventListener('ended', resumeIfClear);
  });

  // Tentativa imediata — ver explicação no comentário do topo do arquivo.
  if (!anyVideoPlaying()) fadeIn();
})();
