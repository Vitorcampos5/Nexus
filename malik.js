/*
                                      ',
                                    `..:.
                                   ':.:,..`
                                 `.,.:`.:.,:
                                .::`.,.:,'`,:.
                              :':,.::,'.:.:.:,`:
                            `'`:`'',,,.:':`'`':..
                           :`,',``..::''':`:`..'`..
                         ':`'`'.`',:.`.,',,```.,``:'
                        ,`:'`'`,,.,,,,.`:,''.,`:'::',:
                      :.`:````.``.,.,`,.':...:,:.':..,:
                     `,'':'`..                  ````'.,.'
                    '`,:.,:',                   :.:'.':',
                    ',:::',:,                   ,`,,:`'..
                    '`',:'`''          •         .,.,`,',`
                    ::.`'..`,          •         `,`'.```.
                   ,,,.,:`,:          •          :`',::,..
                   .:,`,,.',                      ':,:'':`,
                   .'`::`:,:                      ,::.`,:.,
                  ,,`:.:.':                       ::`.:.,,'
                  ..:`:..`'::::,'`::`:,:':,`,`.``'.,`.,'.,',
                 ',`,.``,,,`:`'`,''.'.':``.`'::':..,..''.,',`
                '`,:::`'.'.,`.'..'.:,.'.`.':`':,.:,.,'.,,'':,'
                                      /\      
                                     /::\     
                                     \::/     
                     malik.js — M.A.L.I.K., a Anomalia do
                Nulificador. Trezentos e sessenta e quatro (ou
               trezentos e sessenta e cinco) dias por ano, este
                 arquivo é só um "return" antecipado. Nenhuma
               variável global, nenhum log no console, nenhuma
             mudança visual — carregado sempre junto com o index,
             sempre completamente inerte. Só na data marcada ele
           desperta — e mesmo assim devagar, ao longo de quase uma
           hora. Nunca busca nada de fora, sem fetch, sem servidor,
           sem asset externo: tudo que ele faz já estava adormecido
         aqui dentro, à espera da data certa pra se manifestar. Vive
          na raiz, ao lado de index.html e nexus.html, não dentro de
       nenhuma subpasta; carregado a partir do index.html com um script
       defer. Escopo desta versão, o que este arquivo já faz: o portão
       de data, inerte fora do dia certo; a acordada lenta de título e
       dessaturação progressiva, ruído, flicker; a invasão do painel de
     esferas e do rótulo de símbolo quando Diário ou Valtheris estiverem
    abertos; o sequestro do link caído no clímax, simulando o domínio fora
    do ar; e a restauração automática ao final do evento. O que ainda não
   está aqui, de propósito, por serem peças grandes o bastante pra merecer
    discussão própria antes de virar código: o confronto interativo em si,
  Cenário A e B, derrota ou ajuda; a manifestação de Leyn, dos fantasmas, da
  energia espiral e das esferas como defesa ativa; e o cárcere de Assembly e
                                  Malbolge.

   (o manto se abre daqui pra baixo — o resto do arquivo é ele.)
*/

            (function () {
              'use strict';

              // ————————————————————————————————————————————————————————————
              // DEFINA AQUI O DIA (E A HORA) EM QUE M.A.L.I.K. DESPERTA.
              // Enquanto for 0/0 (data inválida), a comparação abaixo nunca
              // bate com nenhum dia real do calendário — ou seja, o arquivo
              // segue carregado e permanentemente inerte até você escolher
              // um dia de verdade. "hora" é a partir de quando, nesse dia —
              // 0 significa "o dia inteiro, desde a meia-noite".
              // ————————————————————————————————————————————————————————————
             var DATA_DESPERTAR = { dia: 0, mes: 0, hora: 0 };

             // Atalho SÓ pra teste: abrindo index.html?malikTeste=1 pula a data
             // e a subida lenta inteira, e cai direto no confronto (fase 1),
             // pra não precisar esperar ~1h a cada vez que for testar a luta.
             // Remova esta linha (ou ignore) quando o site estiver no ar de verdade.
             var modoTeste = /[?&]malikTeste=1\b/.test(location.search);

             var hoje = new Date();
             var ehODia = modoTeste || (
               hoje.getDate() === DATA_DESPERTAR.dia &&
               (hoje.getMonth() + 1) === DATA_DESPERTAR.mes &&
               hoje.getHours() >= (DATA_DESPERTAR.hora || 0)
             );
             if (!ehODia) return; // nem um listener chega a ser criado — como se isto não existisse.

             // Uma vez que o Cenário B termina (restaurarTudo), grava a data
             // de hoje aqui — se a página recarregar depois disso, no mesmo
             // dia, o script para bem no início: sem isso, um F5 depois do
             // clímax recalculava jaPassados > todos os níveis e reaplicava
             // tudo de novo, inclusive reabrindo o confronto sozinho.
             var CHAVE_RESOLVIDO = 'malik_resolvido_em';
             if (!modoTeste) {
               try {
                 var resolvidoEm = localStorage.getItem(CHAVE_RESOLVIDO);
                 if (resolvidoEm) {
                   var dResolvido = new Date(resolvidoEm);
                   if (dResolvido.getDate() === hoje.getDate() && dResolvido.getMonth() === hoje.getMonth() && dResolvido.getFullYear() === hoje.getFullYear()) {
                     return; // já foi resolvido hoje (Cenário B) — fica inerte pelo resto do dia
                   }
                 }
               } catch (e) {}
             }

             // "Preparado" = as três coleções existentes completas. Lê o
             // localStorage direto (mesma origem, compartilhado com o
             // iframe) em vez de chamar NexusEsferas/NexusCancao — assim
             // funciona não importa qual página estiver carregada lá
             // dentro no momento, sem depender dela já ter os scripts
             // certos carregados.
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
                 return false; // qualquer erro de leitura — trata como não preparado, nunca quebra o confronto
               }
             }

             if (modoTeste) {
               var frameTeste = document.getElementById('nexusFrame');
               if (frameTeste) {
                 // ?malikTeste=1&cenario=B força um lado sem precisar
                 // zerar as três coleções de verdade; sem o parâmetro,
                 // testa a checagem real mesmo.
                 var forcado = /[?&]cenario=([AB])\b/i.exec(location.search);
                 var cenarioTeste = forcado ? forcado[1].toUpperCase() : (viajantePreparado() ? 'B' : 'A');
                 setTimeout(function () {
                   if (window.iniciarConfrontoMalik) window.iniciarConfrontoMalik(cenarioTeste);
                 }, 1200);
               }
               return; // modo de teste só testa a luta — não roda a subida lenta abaixo
            }

            // ============================================================
            // A partir daqui, só roda no dia certo.
            // ============================================================

            var frame = document.getElementById('nexusFrame');
            if (!frame) return; // este script assume que vive dentro do index.html, ao lado do iframe

            // Guarda só a hora do primeiro despertar de hoje — pra retomar a
            // progressão do ponto certo se o viajante recarregar a página no
            // meio do evento, em vez de reiniciar do zero a cada F5.
            var CHAVE_ESTADO = 'malik_desperto_em';

            function minutosDesdeODespertar() {
              var inicio = new Date();
              try {
                var salvo = localStorage.getItem(CHAVE_ESTADO);
                if (salvo) {
                  var d = new Date(salvo);
                 var mesmoDia = d.getDate() === hoje.getDate() && d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
                 if (mesmoDia) inicio = d;
                 else localStorage.setItem(CHAVE_ESTADO, inicio.toISOString());
               } else {
                 localStorage.setItem(CHAVE_ESTADO, inicio.toISOString());
               }
             } catch (e) { /* sem localStorage (modo privado etc.) — só não retoma entre recargas */ }
             return (Date.now() - inicio.getTime()) / 60000;
           }

           var TITULO_ORIGINAL = document.title;
           var FAVICON_LINK = document.querySelector('link[rel="icon"]');
           var FAVICON_ORIGINAL = FAVICON_LINK ? FAVICON_LINK.getAttribute('href') : null;
           var FAVICON_TYPE_ORIGINAL = FAVICON_LINK ? FAVICON_LINK.getAttribute('type') : null;

           // A progressão narrativa: nada, um ponto, mais um ponto, 404,
           // NULL, o nome. Cada nível soma dessaturação, e os dois últimos
           // já mexem em elementos de verdade do Nexus.
           // Comprimida pra caber em ~30min no total (a luta em si dura
           // menos de 1min depois do último nível — ver malik-batalha.js).
           var NIVEIS = [
             { emMin: 2  , titulo: 'Nexus.' },
             { emMin: 6  , titulo: 'Nexus..',    cinza: 0.06 },
             { emMin: 12 , titulo: '404',        cinza: 0.30, flicker: 'leve'  },
            { emMin: 18 , titulo: 'NULL',       cinza: 0.62, flicker: 'medio', invadirPaineis: true },
            { emMin: 26 , titulo: 'M.A.L.I.K.', cinza: 0.90, flicker: 'forte', revelar: true }
          ];

          var timers = [];
          var flickerInterval = null;
          var observadorEsferas = null;
          var observadorSymTitle = null;
          var overlayRuido = null;
          var nivelMaisAlto = -1;
          var progressaoIniciada = false;
          var jaCacado = false; // "não há lugares pra se esconder" só acontece uma vez por despertar

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

        // Corrompe o documento interno do iframe — nexus.html ou qualquer
        // outra página do Nexus pra onde o viajante tiver navegado. Cada
        // toque é defensivo: só mexe no que realmente existir na página
        // carregada no momento, sem presumir que é sempre o nexus.html.
        // pasta (1º segmento do caminho) -> id do símbolo em nexus.html —
        // direto dos hrefs reais do symbolDefs, não é chute
        var PASTA_PARA_SIMBOLO = {
          'tloz': 'zelda', 'valtheris': 'valtheris', 'diário': 'diary', 'diario': 'diary',
          'livro': 'book', 'icarus': 'icaro', 'origem': 'origem', 'covers': 'covers',
          'recordações': 'recordacoes', 'recordacoes': 'recordacoes'
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

        // "Não há lugares para se esconder" — nasce como 0 e 1 embaralhados
        // do mesmo tamanho da frase, e cada caractere trava (numa ordem
        // embaralhada, não da esquerda pra direita) até formar a frase
        // real. Só então a página perde a cor e quebra.
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
          indices.sort(function () { return Math.random() - 0.5; }); // ordem de travamento embaralhada

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

          // "Não há lugares para se esconder" — só faz sentido a partir de
          // quando ele já está invadindo painéis (nível 4+), só uma vez por
          // despertar, e só se o viajante NÃO estiver no nexus.html — é
          // detectado pela ausência do #valtheris-painel, que só existe lá.
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
             if (contador && !observadorEsferas) {
               contador.textContent = 'NULL';
               observadorEsferas = new MutationObserver(function () { contador.textContent = 'NULL'; });
               observadorEsferas.observe(contador, { characterData: true, childList: true, subtree: true });
             }
           }

           var symTitle = doc.querySelector('.sym-title');
           if (symTitle && !observadorSymTitle) {
             var CORRUPCOES = { 'Diário de Memórias': 'Arquivo corrompido', 'Valtheris': 'Falha ao carregar memória' };
             var corrigirTexto = function () {
               var atual = symTitle.textContent;
               if (CORRUPCOES[atual]) symTitle.textContent = CORRUPCOES[atual];
             };
             corrigirTexto();
             observadorSymTitle = new MutationObserver(corrigirTexto);
            observadorSymTitle.observe(symTitle, { characterData: true, childList: true, subtree: true });
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
          if (FAVICON_LINK) { FAVICON_LINK.setAttribute('href', 'Assets/malik/favicon-malik.png'); FAVICON_LINK.setAttribute('type', 'image/png'); }
          // O nome finalmente foi dito — um instante depois, o confronto começa de verdade.
          setTimeout(function () {
            if (window.iniciarConfrontoMalik) window.iniciarConfrontoMalik(viajantePreparado() ? 'B' : 'A');
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

     function agendarProgressao() {
       var jaPassados = minutosDesdeODespertar();
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

      // Restaura tudo sozinho, um tempo depois do pico — não depende
      // de um F5 nem de esperar o dia virar. 3h após o nível final.
      var minutosAteRestaurar = NIVEIS[NIVEIS.length - 1].emMin + 180;
      var faltamRestaurar = Math.max(0, minutosAteRestaurar - jaPassados);
      timers.push(setTimeout(restaurarTudo, faltamRestaurar * 60000));
    }

    function restaurarTudo() {
      timers.forEach(clearTimeout);
      timers = [];
      pararFlicker();
      if (overlayRuido) { overlayRuido.remove(); overlayRuido = null; }
      if (observadorEsferas) { observadorEsferas.disconnect(); observadorEsferas = null; }
      if (observadorSymTitle) { observadorSymTitle.disconnect(); observadorSymTitle = null; }
      document.title = TITULO_ORIGINAL;
      if (FAVICON_LINK && FAVICON_ORIGINAL) { FAVICON_LINK.setAttribute('href', FAVICON_ORIGINAL); if (FAVICON_TYPE_ORIGINAL) FAVICON_LINK.setAttribute('type', FAVICON_TYPE_ORIGINAL); }
     frame.style.filter = '';
     frame.style.opacity = '1';
     try { localStorage.removeItem(CHAVE_ESTADO); } catch (e) {}
     if (!modoTeste) { try { localStorage.setItem(CHAVE_RESOLVIDO, new Date().toISOString()); } catch (e) {} }
     // Impede que o próprio reload logo abaixo (que dispara o 'load' do
     // iframe de novo) reaplique o nível revelar sozinho — foi isso que
     // fazia o favicon voltar pro do M.A.L.I.K. um instante depois de já
     // ter sido restaurado, e podia reabrir um confronto novo.
     nivelMaisAlto = -1;
     // Recarrega a página interna: garante que esferas, título e
     // painéis voltem a refletir o estado real, sem precisar
     // adivinhar (e arriscar errar) cada variável interna do
     // nexus.html a partir de fora dele.
     try { frame.contentWindow.location.reload(); } catch (e) {}
   }

   // Exposta pro Cenário B (malik-batalha.js) chamar quando "O Nexus
   // Resiste" terminar — esse caminho tem direito a cura de verdade,
   // ao contrário do A. Mesma função, mesmo resultado de sempre.
   window.NexusMalikRestaurarAgora = restaurarTudo;

   // Reaplica a corrupção sempre que o viajante navegar pra outra
   // página dentro do mesmo iframe — cada navegação troca o
   // "document" interno por um novo, descartando os observers
   // anteriores, exatamente como já acontece com as outras camadas
   // deste index.html.
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
    // Cobre o caso de o iframe já ter terminado de carregar antes
    // deste script (defer) rodar.
    if (frame.contentDocument && frame.contentDocument.readyState === 'complete') aoCarregarIframe();
  } catch (e) {}
})();

/* ·········································································· */
/*                              o manto se fecha aqui.                    */
/*                                                                          */
/*                   M   .   A   .   L   .   I   .   K   .                    */
/* ·········································································· */
