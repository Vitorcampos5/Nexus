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

   Em ?malikTeste=1, a tela ganha um botão "Recomeçar a luta do
   Cenário A" — só em teste; no site publicado o Cenário A continua
   sem volta nenhuma, como sempre foi.
   ============================================================
*/
(function () {
  'use strict';

  var CHAVE = 'malik_nexus_apagado';
  var modoTeste = /[?&]malikTeste=1\b/.test(location.search);

  // Extraído numa função à parte pra poder rodar em dois momentos: no
  // carregamento (se já tinha sido apagado antes) e agora mesmo, na hora
  // em que NexusMalikApagarDeVez é chamado pela primeira vez — antes,
  // esse segundo caso só gravava a chave no localStorage e não mudava
  // nada na tela atual, então o mapa (o iframe do nexus.html) continuava
  // visível até o viajante recarregar a página manualmente.
  function mostrarTelaApagada() {
    var frame = document.getElementById('nexusFrame');
    if (frame) frame.remove(); // o mapa não pode continuar visível atrás da tela
    document.title = 'M.A.L.I.K.';
    var tela = document.createElement('div');
    tela.style.cssText = 'position:fixed;inset:0;z-index:900000;background:#000;color:#c8c8c8;font-family:Consolas,monospace;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:15px;letter-spacing:.04em;text-align:center;line-height:2;';
    tela.innerHTML = 'ERR_CONNECTION_TIMED_OUT<br>este link não respondeu.<br><br><span style="color:#ff2b3a">NEXUS REMOVIDO.</span>';

    if (modoTeste) {
      var botao = document.createElement('button');
      botao.textContent = 'Recomeçar a luta do Cenário A';
      botao.style.cssText = 'margin-top:28px;padding:11px 26px;background:transparent;border:1px solid #C4A35A;color:#C4A35A;font-family:Consolas,monospace;font-size:13px;letter-spacing:.05em;cursor:pointer;';
      botao.addEventListener('click', function () {
        try { localStorage.removeItem(CHAVE); } catch (e) {}
        try { localStorage.removeItem('malik_batalha_progresso'); } catch (e) {} // sem isso, a segunda tentativa cai no caminho de retomada (progresso salvo da primeira) e reproduz o bug da alma presa no canto
        tela.remove();
        if (window.NexusMalikPermitirNovaLuta) window.NexusMalikPermitirNovaLuta(); // sem isso, a trava de "confronto já em andamento" bloqueava a nova chamada (tela preta)
        if (window.iniciarConfrontoMalik) window.iniciarConfrontoMalik('A', { ausente: false });
      });
      tela.appendChild(document.createElement('br'));
      tela.appendChild(botao);
    }

    if (document.body) {
      document.body.appendChild(tela);
    } else {
      document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(tela); });
    }
  }

  window.NexusMalikApagarDeVez = function () {
    try { localStorage.setItem(CHAVE, new Date().toISOString()); } catch (e) {}
    mostrarTelaApagada(); // mostra na hora — não espera mais um recarregamento futuro
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
  // pra sempre, até alguém decidir religar manualmente (ou, em teste,
  // clicar no botão de recomeço acima).
  mostrarTelaApagada();
})();
