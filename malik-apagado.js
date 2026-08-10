/* malik-apagado.js — o Cenário A de verdade: sem volta, tempo indeterminado.
   ============================================================
   Roda SEM defer, exatamente onde o iframe nasceria no index.html —
   de propósito, pra decidir ANTES do iframe começar a carregar
   nexus.html. Fica na raiz, ao lado de index.html/nexus.html/malik.js.

   A ideia: se M.A.L.I.K. já chegou até o fim do Cenário A alguma vez
   (malik-batalha.js chama window.NexusMalikApagarDeVez() no clímax),
   fica guardado no localStorage — e daí em diante, TODO carregamento
   futuro do index.html mostra só a tela de "fora do ar", sem nem
   tentar carregar o iframe. Não expira sozinho. Só um reset manual
   (apagar a chave abaixo do localStorage) liga o Nexus de novo.
   ============================================================
*/
(function () {
  'use strict';

  var CHAVE = 'malik_nexus_apagado';

  window.NexusMalikApagarDeVez = function () {
    try { localStorage.setItem(CHAVE, new Date().toISOString()); } catch (e) {}
  };

  var apagadoDesde = null;
  try { apagadoDesde = localStorage.getItem(CHAVE); } catch (e) {}

  var frame = document.getElementById('nexusFrame');

  if (!apagadoDesde) {
    // Nunca foi apagado — segue o carregamento normal do Nexus.
    if (frame) {
      var alvo = frame.getAttribute('data-src');
      if (alvo) frame.src = alvo;
    }
    return;
  }

  // Já foi apagado antes: o iframe NUNCA recebe seu src — fica vazio,
  // pra sempre, até alguém decidir religar manualmente.
  document.title = 'M.A.L.I.K.';
  var tela = document.createElement('div');
  tela.style.cssText = 'position:fixed;inset:0;z-index:900000;background:#000;color:#c8c8c8;font-family:Consolas,monospace;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:15px;letter-spacing:.04em;text-align:center;line-height:2;';
  tela.innerHTML = 'ERR_CONNECTION_TIMED_OUT<br>este link não respondeu.<br><br><span style="color:#ff2b3a">NEXUS REMOVIDO.</span>';
  if (document.body) {
    document.body.appendChild(tela);
  } else {
    document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(tela); });
  }
})();
