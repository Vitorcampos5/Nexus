
            (function () {
              'use strict';

              var CHAVE_PROGRESSO_BATALHA = 'malik_batalha_progresso';
              var CHAVE_SESSAO_BATALHA = 'malik_sessao_batalha_ativa';

              var progressoPendente = null;
              try {
                var brutoProgresso = localStorage.getItem(CHAVE_PROGRESSO_BATALHA);
                if (brutoProgresso) progressoPendente = JSON.parse(brutoProgresso);
              } catch (e) {}

              if (progressoPendente && document.getElementById('nexusFrame')) {
                var mesmaSessaoBatalha = false;
                try { mesmaSessaoBatalha = sessionStorage.getItem(CHAVE_SESSAO_BATALHA) === '1'; } catch (e) {}
                try { sessionStorage.setItem(CHAVE_SESSAO_BATALHA, '1'); } catch (e) {}

                var fraseAoRetomarBatalha = mesmaSessaoBatalha
                  ? 'Tentar resetar não muda nada.'
                  : 'Fugir também não vai te salvar.';

                setTimeout(function () {
                  if (window.iniciarConfrontoMalik) {
                    window.iniciarConfrontoMalik(progressoPendente.cenario, {
                      retomarDe: progressoPendente,
                      fraseAoRetomar: fraseAoRetomarBatalha
                    });
                  }
                }, 300);
                return;
              }

             var DATA_DESPERTAR = { dia: '30', mes: '10', hora: '13', minuto: '00' };
             window.NexusMalikDataDespertar = DATA_DESPERTAR;

             var TITULO_ORIGINAL = document.title;
             var FAVICON_LINK = document.querySelector('link[rel="icon"]');
             var FAVICON_ORIGINAL = FAVICON_LINK ? FAVICON_LINK.getAttribute('href') : null;
             var FAVICON_TYPE_ORIGINAL = FAVICON_LINK ? FAVICON_LINK.getAttribute('type') : null;

             function trocarFavicon(href, tipo) {
               if (!FAVICON_LINK || !FAVICON_LINK.parentNode) return;
               var novo = document.createElement('link');
               novo.rel = FAVICON_LINK.rel || 'icon';
               novo.type = tipo || FAVICON_LINK.type || 'image/png';
               novo.href = href;
               FAVICON_LINK.parentNode.replaceChild(novo, FAVICON_LINK);
               FAVICON_LINK = novo;
             }

             var modoTeste = /[?&]malikTeste=1\b/.test(location.search);

             var minutoForcado = (function () {
               var m = /[?&]minuto=(\d+(?:\.\d+)?)\b/.exec(location.search);
               return m ? parseFloat(m[1]) : null;
             })();

             if (/[?&]prep=1\b/.test(location.search)) {
               try {
                 if (JSON.parse(localStorage.getItem('valtheris_read') || '[]').length < 22) {
                   var valtherisTeste = [];
                   for (var vt = 1; vt <= 22; vt++) valtherisTeste.push('teste-saga-' + vt);
                   localStorage.setItem('valtheris_read', JSON.stringify(valtherisTeste));
                 }
                 var sorteioEsferas = null;
                 try { sorteioEsferas = JSON.parse(localStorage.getItem('nexus_esferas_sorteio') || 'null'); } catch (e1) {}
                 if (!sorteioEsferas || typeof sorteioEsferas !== 'object') {
                   sorteioEsferas = { mal: 1, zelda: 2, valtheris: 3, diary: 4, book: 5, covers: 6, origem: 7 };
                   localStorage.setItem('nexus_esferas_sorteio', JSON.stringify(sorteioEsferas));
                 }
                 var encontradasAtuais = [];
                 try { encontradasAtuais = JSON.parse(localStorage.getItem('nexus_esferas_encontradas') || '[]'); } catch (e1) {}
                 if (!Array.isArray(encontradasAtuais) || encontradasAtuais.length < 7) {
                   var todasEncontradas = Object.keys(sorteioEsferas).map(function (pid) {
                     return { paginaId: pid, estrelas: sorteioEsferas[pid] };
                   });
                   localStorage.setItem('nexus_esferas_encontradas', JSON.stringify(todasEncontradas));
                 }
                 var cancaoAtual = {};
                 try { cancaoAtual = JSON.parse(localStorage.getItem('nexus_cancao_tempestade_v1') || '{}'); } catch (e0) {}
                 if (!cancaoAtual.oot || !cancaoAtual.mm || !cancaoAtual.recordacoes) {
                   localStorage.setItem('nexus_cancao_tempestade_v1', JSON.stringify({ oot: true, mm: true, recordacoes: true }));
                 }
               } catch (e) {}
             }

             if (/[?&]malikTestePosB=1\b/.test(location.search)) {
               try {
                 var jaCurado = localStorage.getItem('malik_nexus_curado') === '1';
                 if (!jaCurado) {
                   var todas = ['zelda', 'valtheris', 'diary', 'book', 'covers', 'origem', 'icaro', 'recordacoes', 'mal'];
                   var curadas = [];
                   try { curadas = JSON.parse(localStorage.getItem('malik_paginas_curadas') || '[]'); } catch (e2) {}
                   var paraQuebrar = todas.filter(function (id) { return curadas.indexOf(id) === -1; });
                   localStorage.setItem('malik_paginas_quebradas', JSON.stringify(paraQuebrar));
                 }
                 localStorage.setItem('malik_resolvido_em', new Date().toISOString());
               } catch (e) {}
               var framePos = document.getElementById('nexusFrame');
               if (framePos) {
                 try {
                   var alvo = framePos.getAttribute('data-src') || 'nexus.html';
                   framePos.src = alvo.split('?')[0] + '?_posB=' + Date.now();
                 } catch (e3) {}
               }
               return;
             }

             var hoje = new Date();
             var alvoDespertar = new Date(hoje.getFullYear(), parseInt(DATA_DESPERTAR.mes, 10) - 1, parseInt(DATA_DESPERTAR.dia, 10), parseInt(DATA_DESPERTAR.hora, 10) || 0, parseInt(DATA_DESPERTAR.minuto, 10) || 0, 0);
             var ehODia = modoTeste || (hoje.getTime() >= alvoDespertar.getTime());
             if (!ehODia) {
               var MAX_ESPERA_MS = 20 * 24 * 60 * 60 * 1000;
               (function agendarEspera(msRestantes) {
                 if (msRestantes > MAX_ESPERA_MS) {
                   setTimeout(function () { agendarEspera(msRestantes - MAX_ESPERA_MS); }, MAX_ESPERA_MS);
                 } else {
                   setTimeout(function () { location.reload(); }, Math.max(0, msRestantes));
                 }
               })(alvoDespertar.getTime() - hoje.getTime());
               return;
             }

             var CHAVE_RESOLVIDO = 'malik_resolvido_em';
             if (!modoTeste) {
               try {
                 if (localStorage.getItem(CHAVE_RESOLVIDO)) return;
               } catch (e) {}
             }

             function viajantePreparado() {
               try {
                 var valtheris = JSON.parse(localStorage.getItem('valtheris_read') || '[]');
                 if (!Array.isArray(valtheris) || valtheris.length < 22) return false;

                 var esferas = JSON.parse(localStorage.getItem('nexus_esferas_encontradas') || '[]');
                 if (!Array.isArray(esferas) || esferas.length < 7) return false;

                 var cancao = JSON.parse(localStorage.getItem('nexus_cancao_tempestade_v1') || '{}');
                 if (!cancao.oot || !cancao.mm || !cancao.recordacoes) return false;

                 return true;
               } catch (e) {
                 return false;
               }
             }

             if (modoTeste && minutoForcado === null) {
               var frameTeste = document.getElementById('nexusFrame');
               if (frameTeste) {
                 trocarFavicon('Assets/malik/favicon-malik.png', 'image/png');
                 var forcado = /[?&]cenario=([AB])\b/i.exec(location.search);
                 var cenarioTeste = forcado ? forcado[1].toUpperCase() : (viajantePreparado() ? 'B' : 'A');
                 var ausenteTeste = /[?&]ausente=1\b/.test(location.search);
                 setTimeout(function () {
                   if (window.iniciarConfrontoMalik) window.iniciarConfrontoMalik(cenarioTeste, { ausente: ausenteTeste });
                 }, 1200);
               }
               return;
            }

            var frame = document.getElementById('nexusFrame');
            if (!frame) return;

            var CHAVE_ESTADO = 'malik_desperto_em';

            function minutosDesdeODespertar() {
              if (minutoForcado !== null) return minutoForcado;
              return (Date.now() - alvoDespertar.getTime()) / 60000;
           }

           var NIVEIS = [
             { emMin: 2  , titulo: 'Nexus.' },
             { emMin: 7  , titulo: 'Nexus..',    cinza: 0.06 },
             { emMin: 14 , titulo: '404',        cinza: 0.30, flicker: 'leve'  },
            { emMin: 21 , titulo: 'NULL',       cinza: 0.62, flicker: 'medio', invadirPaineis: true },
            { emMin: 30 , titulo: 'M.A.L.I.K.', cinza: 0.90, flicker: 'forte', revelar: true }
          ];

          var timers = [];
          var flickerInterval = null;
          var overlayRuido = null;
          var nivelMaisAlto = -1;
          var vigiaProgressoInterval = null;
          var progressaoIniciada = false;
          var jaCacado = false;
          var ausenteDuranteTudo = false;

          function aplicarFiltro(cinza) {
            frame.style.transition = 'filter 4s ease';
            frame.style.filter = 'grayscale(' + cinza + ') contrast(' + (1 + cinza * 0.2) + ') brightness(' + (1 - cinza * 0.12) + ')';
          }

          function criarRuido() {
            if (overlayRuido) return;
            overlayRuido = document.createElement('div');
           overlayRuido.id = 'malik-ruido';
           overlayRuido.style.cssText = [
             'position:fixed', 'inset:0', 'z-index:600000', 'pointer-events:none',
             'opacity:0', 'transition:opacity 6s ease', 'mix-blend-mode:screen',
        "background-image:url(data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E)"
           ].join(';');
           document.body.appendChild(overlayRuido);
           requestAnimationFrame(function () { overlayRuido.style.opacity = '0.05'; });
         }

         function intensificarRuido(op) {
           if (overlayRuido) overlayRuido.style.opacity = String(op);
         }

         function iniciarFlicker(intensidade) {
           pararFlicker();
           var chance = intensidade === 'forte' ? 0.35 : intensidade === 'medio' ? 0.18 : 0.06;
           flickerInterval = setInterval(function () {
             if (Math.random() > chance) return;
             frame.style.transition = 'opacity .05s linear';
            frame.style.opacity = '0.82';
            setTimeout(function () { frame.style.opacity = '1'; }, 70 + Math.random() * 90);
          }, 900);
        }

        function pararFlicker() {
          if (flickerInterval) { clearInterval(flickerInterval); flickerInterval = null; }
          frame.style.opacity = '1';
        }

        var PASTA_PARA_SIMBOLO = {
          'tloz': 'zelda', 'valtheris': 'valtheris', 'diário': 'diary', 'diario': 'diary',
          'livro': 'book', 'icarus': 'icaro', 'origem': 'origem', 'covers': 'covers',
          'recordações': 'recordacoes', 'recordacoes': 'recordacoes', 'mal': 'mal'
        };

        function identificarSimboloDaPagina(doc) {
          try {
            var caminho = decodeURIComponent(doc.location.pathname);
            var pasta = caminho.split('/').filter(Boolean)[0] || '';
            return PASTA_PARA_SIMBOLO[pasta.toLowerCase()] || null;
          } catch (e) { return null; }
        }

        function quebrarPagina(doc, overlayMensagem) {
          var docEl = doc.documentElement;
          docEl.style.transition = 'filter 1.1s ease';
          docEl.style.filter = 'grayscale(1) contrast(1.25) brightness(.55)';
          if (overlayMensagem) { overlayMensagem.style.transition = 'opacity .6s ease'; overlayMensagem.style.opacity = '0'; }

          var choques = 0;
          var vibra = setInterval(function () {
            choques++;
            docEl.style.transform = 'translate(' + (Math.random() * 14 - 7) + 'px,' + (Math.random() * 14 - 7) + 'px)';
            if (choques > 10) clearInterval(vibra);
          }, 50);

          setTimeout(function () {
            var simbolo = identificarSimboloDaPagina(doc);
            try {
              frame.contentWindow.location.href = 'nexus.html' + (simbolo ? '?malikQuebrou=' + simbolo : '');
            } catch (e) {}
          }, 1300);
        }

        function perseguirPelaPagina(doc) {
          var FRASE = 'Não há lugares para se esconder';
          var overlay = doc.createElement('div');
          overlay.style.cssText = 'position:fixed;inset:0;z-index:999990;background:rgba(0,0,0,.74);display:flex;align-items:center;justify-content:center;font-family:Consolas,monospace;color:#39FF7A;font-size:clamp(14px,3vw,22px);letter-spacing:.05em;text-align:center;padding:2rem;opacity:0;transition:opacity .5s ease;';
          var texto = doc.createElement('div');
          overlay.appendChild(texto);
          (doc.body || doc.documentElement).appendChild(overlay);

          var atual = FRASE.split('').map(function (c) { return c === ' ' ? ' ' : (Math.random() < 0.5 ? '0' : '1'); });
          texto.textContent = atual.join('');
          requestAnimationFrame(function () { overlay.style.opacity = '1'; });

          var indices = [];
          for (var i = 0; i < FRASE.length; i++) if (FRASE[i] !== ' ') indices.push(i);
          indices.sort(function () { return Math.random() - 0.5; });

          var travados = 0;
          var scramble = setInterval(function () {
            for (var k = 0; k < atual.length; k++) {
              if (FRASE[k] !== ' ' && indices.indexOf(k) >= travados) atual[k] = Math.random() < 0.5 ? '0' : '1';
            }
            texto.textContent = atual.join('');
          }, 45);

          var travarProxima = function () {
            if (travados >= indices.length) {
              clearInterval(scramble);
              texto.textContent = FRASE;
              setTimeout(function () { quebrarPagina(doc, overlay); }, 900);
              return;
            }
            atual[indices[travados]] = FRASE[indices[travados]];
            travados++;
            setTimeout(travarProxima, 38);
          };
          setTimeout(travarProxima, 650);
        }

        function corromperDocumentoInterno(nivel) {
          var doc;
          try { doc = frame.contentDocument || frame.contentWindow.document; } catch (e) { return; }
          if (!doc || !nivel) return;

          if ((nivel.invadirPaineis || nivel.revelar) && !jaCacado && !doc.getElementById('valtheris-painel')) {
            jaCacado = true;
            perseguirPelaPagina(doc);
          }

         if (nivel.invadirPaineis) {
           if (!doc.__malikSilenciado) {
             doc.__malikSilenciado = true;
             try { if (window.NexusMalikSilenciarDoc) window.NexusMalikSilenciarDoc(doc); } catch (e) {}
           }

           var painelEsferas = doc.getElementById('dragonball-panel');
           if (painelEsferas) {
             var contador = painelEsferas.querySelector('.db-mini-count');
             if (contador && !contador.__malikObservado) {
               contador.__malikObservado = true;
               contador.textContent = 'NULL';
               var observadorEsferasLocal = new MutationObserver(function () {
                 if (contador.textContent !== 'NULL') contador.textContent = 'NULL';
               });
               observadorEsferasLocal.observe(contador, { characterData: true, childList: true, subtree: true });
             }
           }

           var symTitle = doc.querySelector('.sym-title');
           if (symTitle && !symTitle.__malikObservado) {
             symTitle.__malikObservado = true;
             var CORRUPCOES = { 'Diário de Memórias': 'Arquivo corrompido', 'Valtheris': 'Falha ao carregar memória' };
             var corrigirTexto = function () {
               var atual = symTitle.textContent;
               if (CORRUPCOES[atual]) symTitle.textContent = CORRUPCOES[atual];
             };
             corrigirTexto();
             var observadorSymTitleLocal = new MutationObserver(corrigirTexto);
             observadorSymTitleLocal.observe(symTitle, { characterData: true, childList: true, subtree: true });
          }
        }

        if (nivel.revelar) {
          var linkdown = doc.getElementById('linkdown-msg');
          if (linkdown) {
            var main = linkdown.querySelector('.linkdown-main');
            if (main) main.textContent = 'M.A.L.I.K.';
            linkdown.style.transition = 'opacity 3s ease';
            linkdown.style.opacity = '1';
          }
          trocarFavicon('Assets/malik/favicon-malik.png', 'image/png');
          var cenarioForcadoReveal = /[?&]cenario=([AB])\b/i.exec(location.search);
          var cenarioFinal = cenarioForcadoReveal ? cenarioForcadoReveal[1].toUpperCase() : (viajantePreparado() ? 'B' : 'A');
          setTimeout(function () {
            if (window.iniciarConfrontoMalik) window.iniciarConfrontoMalik(cenarioFinal, { ausente: ausenteDuranteTudo });
          }, 2600);
        }
      }

      function aplicarNivel(nivel) {
       document.title = nivel.titulo;
       if (typeof nivel.cinza === 'number') {
         aplicarFiltro(nivel.cinza);
         if (nivel.cinza >= 0.5) { criarRuido(); intensificarRuido(Math.min(0.12, (nivel.cinza - 0.5) * 0.3)); }
       }
       if (nivel.flicker) iniciarFlicker(nivel.flicker);
       corromperDocumentoInterno(nivel);
     }

     function lerProgressoAtual() {
       try {
         var valtheris = JSON.parse(localStorage.getItem('valtheris_read') || '[]');
         var esferas = JSON.parse(localStorage.getItem('nexus_esferas_encontradas') || '[]');
         var cancao = JSON.parse(localStorage.getItem('nexus_cancao_tempestade_v1') || '{}');
         return {
           valtheris: Array.isArray(valtheris) ? valtheris.length : 0,
           esferas: Array.isArray(esferas) ? esferas.length : 0,
           cancao: (cancao.oot ? 1 : 0) + (cancao.mm ? 1 : 0) + (cancao.recordacoes ? 1 : 0)
         };
       } catch (e) { return { valtheris: 0, esferas: 0, cancao: 0 }; }
     }

     function mostrarFalaMalikNoDocumento(texto) {
       try {
         var doc = frame.contentDocument || frame.contentWindow.document;
         if (!doc || !doc.body) return;
         var w = doc.defaultView || window;

         var msg = doc.createElement('div');
         msg.style.cssText = 'position:fixed;left:50%;bottom:9vh;transform:translateX(-50%);z-index:750000;font-family:Consolas,monospace;font-size:13px;letter-spacing:.05em;color:#ff2b3a;text-shadow:0 0 10px rgba(255,43,58,.6);opacity:0;transition:opacity .5s ease;pointer-events:none;text-align:center;max-width:82vw;';
         var span = doc.createElement('div');
         msg.appendChild(span);
         doc.body.appendChild(msg);

         var atual = texto.split('').map(function (c) { return c === ' ' ? ' ' : (Math.random() < 0.5 ? '0' : '1'); });
         span.textContent = atual.join('');
         w.requestAnimationFrame(function () { msg.style.opacity = '1'; });

         var indices = [];
         for (var i = 0; i < texto.length; i++) if (texto[i] !== ' ') indices.push(i);
         indices.sort(function () { return Math.random() - 0.5; });

         var travados = 0;
         var scramble = w.setInterval(function () {
           for (var k = 0; k < atual.length; k++) {
             if (texto[k] !== ' ' && indices.indexOf(k) >= travados) atual[k] = Math.random() < 0.5 ? '0' : '1';
           }
           span.textContent = atual.join('');
         }, 45);

         var sumir = function () {
           setTimeout(function () {
             msg.style.opacity = '0';
             setTimeout(function () { if (msg.parentNode) msg.remove(); }, 700);
           }, 3400);
         };

         var travarProxima = function () {
           if (travados >= indices.length) {
             w.clearInterval(scramble);
             span.textContent = texto;
             sumir();
             return;
           }
           atual[indices[travados]] = texto[indices[travados]];
           travados++;
           setTimeout(travarProxima, 38);
         };
         setTimeout(travarProxima, 650);
       } catch (e) {}
     }

     function agendarProgressao() {
       var jaPassados = minutosDesdeODespertar();
       ausenteDuranteTudo = jaPassados >= NIVEIS[NIVEIS.length - 1].emMin;

       var progressoNoInicio = lerProgressoAtual();
       if (!viajantePreparado()) {
         timers.push(setTimeout(function () { mostrarFalaMalikNoDocumento('O fim se inicia.'); }, 2500));
       }
       var jaAvisouCorrida = false;
       vigiaProgressoInterval = setInterval(function () {
         if (jaAvisouCorrida) { clearInterval(vigiaProgressoInterval); return; }
         var atual = lerProgressoAtual();
         if (atual.esferas > progressoNoInicio.esferas || atual.valtheris > progressoNoInicio.valtheris || atual.cancao > progressoNoInicio.cancao) {
           jaAvisouCorrida = true;
           mostrarFalaMalikNoDocumento('Corra, coelhinho, corra enquanto pode.');
           clearInterval(vigiaProgressoInterval);
         }
       }, 8000);

       NIVEIS.forEach(function (nivel, i) {
         var faltamMin = nivel.emMin - jaPassados;
         if (faltamMin <= 0) {
           nivelMaisAlto = i;
           aplicarNivel(nivel);
         } else {
           timers.push(setTimeout(function () {
             nivelMaisAlto = i;
            aplicarNivel(nivel);
          }, faltamMin * 60000));
        }
      });

      var minutosAteRestaurar = NIVEIS[NIVEIS.length - 1].emMin + 180;
      var faltamRestaurar = Math.max(0, minutosAteRestaurar - jaPassados);
      timers.push(setTimeout(restaurarTudo, faltamRestaurar * 60000));
    }

    function restaurarTudo(resolvidoDeVerdade) {
      timers.forEach(clearTimeout);
      timers = [];
      if (vigiaProgressoInterval) { clearInterval(vigiaProgressoInterval); vigiaProgressoInterval = null; }
      pararFlicker();
      if (overlayRuido) { overlayRuido.remove(); overlayRuido = null; }
      document.title = TITULO_ORIGINAL;
      if (FAVICON_ORIGINAL) trocarFavicon(FAVICON_ORIGINAL, FAVICON_TYPE_ORIGINAL);
     frame.style.filter = '';
     frame.style.opacity = '1';
     try { localStorage.removeItem(CHAVE_ESTADO); } catch (e) {}
     if (!modoTeste || resolvidoDeVerdade) { try { localStorage.setItem(CHAVE_RESOLVIDO, new Date().toISOString()); } catch (e) {} }
     nivelMaisAlto = -1;
     if (!modoTeste) {
       try { frame.contentWindow.location.reload(); } catch (e) {}
     }
   }

   window.NexusMalikRestaurarAgora = function () { restaurarTudo(true); };

   function aoCarregarIframe() {
     if (!progressaoIniciada) {
       progressaoIniciada = true;
       agendarProgressao();
     } else if (nivelMaisAlto >= 0) {
      corromperDocumentoInterno(NIVEIS[nivelMaisAlto]);
    }
  }
  frame.addEventListener('load', aoCarregarIframe);
  try {
    if (frame.contentDocument && frame.contentDocument.readyState === 'complete') aoCarregarIframe();
  } catch (e) {}
})();

