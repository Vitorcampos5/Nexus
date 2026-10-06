(function () {
  'use strict';

  var CHAVE = 'malik_nexus_apagado';
  var modoTeste = /[?&]malikTeste=1\b/.test(location.search);

  function mostrarTelaApagada() {
    var frame = document.getElementById('nexusFrame');
    if (frame) frame.remove();
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
        try { localStorage.removeItem('malik_batalha_progresso'); } catch (e) {}
        tela.remove();
        var apagaoBatalha = document.getElementById('malik-apagao-batalha');
        if (apagaoBatalha) apagaoBatalha.remove();
        if (window.NexusMalikPermitirNovaLuta) window.NexusMalikPermitirNovaLuta();
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
    mostrarTelaApagada();
  };

  var apagadoDesde = null;
  try { apagadoDesde = localStorage.getItem(CHAVE); } catch (e) {}

  var frame = document.getElementById('nexusFrame');

  if (!apagadoDesde) {
    if (frame) {
      var alvo = frame.getAttribute('data-src');
      if (alvo) frame.src = alvo;
    }
    return;
  }

  mostrarTelaApagada();
})();
