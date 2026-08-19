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
              // RETOMADA EXATA — tem prioridade sobre tudo abaixo, inclusive
              // a data de despertar: se malik-batalha.js deixou um confronto
              // pendente salvo (recarregou a página no meio da luta), ele
              // precisa terminar antes de qualquer outra coisa rodar, não
              // importa se hoje ainda é o dia certo ou não.
              // ————————————————————————————————————————————————————————————
              var CHAVE_PROGRESSO_BATALHA = 'malik_batalha_progresso';
              var CHAVE_SESSAO_BATALHA = 'malik_sessao_batalha_ativa'; // sessionStorage: morre quando a aba fecha de verdade

              var progressoPendente = null;
              try {
                var brutoProgresso = localStorage.getItem(CHAVE_PROGRESSO_BATALHA);
                if (brutoProgresso) progressoPendente = JSON.parse(brutoProgresso);
              } catch (e) {}

              if (progressoPendente && document.getElementById('nexusFrame')) {
                // sessionStorage sobrevive a um F5 na mesma aba, mas morre se
                // a aba fechar de verdade — essa diferença é o que separa
                // "tentou resetar" (F5) de "tentou fugir e voltou depois"
                // (fechou a aba e abriu de novo).
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
                return; // a retomada cuida de tudo — não roda data, queima lenta, nada disso
              }

              // ————————————————————————————————————————————————————————————
              // DEFINA AQUI O DIA (E A HORA) EM QUE M.A.L.I.K. DESPERTA.
              // Enquanto for 0/0 (data inválida), a comparação abaixo nunca
              // bate com nenhum dia real do calendário — ou seja, o arquivo
              // segue carregado e permanentemente inerte até você escolher
              // um dia de verdade. "hora" é a partir de quando, nesse dia —
              // 0 significa "o dia inteiro, desde a meia-noite".
              // ————————————————————————————————————————————————————————————
             var DATA_DESPERTAR = { dia: 30, mes: 10, hora: 23, minuto: 59 };
             // Exposta globalmente — o cronômetro em nexus.html lê daqui
             // (mesma origem, via window.top) em vez de manter cópia
             // própria. Antes tinha duas cópias independentes: editar
             // uma (essa, pra testar) não mudava a outra, e o cronômetro
             // ficava preso na data antiga mesmo com "o resto"
             // funcionando certo.
             window.NexusMalikDataDespertar = DATA_DESPERTAR;

             // Atalho SÓ pra teste: abrindo index.html?malikTeste=1 pula a data
             // e a subida lenta inteira, e cai direto no confronto (fase 1),
             // pra não precisar esperar ~1h a cada vez que for testar a luta.
             // Remova esta linha (ou ignore) quando o site estiver no ar de verdade.
             var modoTeste = /[?&]malikTeste=1\b/.test(location.search);

             var hoje = new Date();
             // Antes comparava dia+mês+hora separados — o que exigia estar
             // exatamente no dia 30/10 pra bater. Se ninguém abrisse o site
             // bem nesse dia, o evento inteiro passava batido pra sempre.
             // Um Date de verdade resolve isso: qualquer carregamento a
             // partir desse instante em diante reconhece "já passou",
             // não importa se foi 5 minutos ou 5 dias depois.
             var alvoDespertar = new Date(hoje.getFullYear(), DATA_DESPERTAR.mes - 1, DATA_DESPERTAR.dia, DATA_DESPERTAR.hora || 0, DATA_DESPERTAR.minuto || 0, 0);
             var ehODia = modoTeste || (hoje.getTime() >= alvoDespertar.getTime());
             if (!ehODia) {
               // Uma aba já aberta ANTES das 23:59, parada esperando sem
               // ninguém recarregar, não tinha como perceber sozinha que
               // o horário chegou — o script só checava isso uma vez, no
               // carregamento, e desistia. Agora agenda um F5 automático
               // pro instante exato: não é uma transição contínua (a
               // página recarrega, não é só a corrupção surgindo na sua
               // frente), mas resolve sem precisar reestruturar o arquivo
               // inteiro numa função re-entrante.
               // setTimeout estoura acima de ~24.8 dias (limite de 32
               // bits) — encadeia em pedaços de no máximo 20 dias até
               // sobrar só o restante final.
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

             // Uma vez resolvido (Cenário B restaurado), fica resolvido —
             // não só "pelo resto do dia". Com a checagem de data agora
             // sendo "em diante" em vez de "só hoje", um bloqueio por dia
             // faria o evento inteiro voltar sozinho no dia seguinte, todo
             // dia, pra sempre. O Cenário A já trava de vez via
             // malik-apagado.js; isso aqui é o mesmo princípio pro B: uma
             // defesa bem-sucedida também é definitiva, não é repetível.
             var CHAVE_RESOLVIDO = 'malik_resolvido_em';
             if (!modoTeste) {
               try {
                 if (localStorage.getItem(CHAVE_RESOLVIDO)) return; // já foi resolvido uma vez — fica inerte pra sempre
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
                 // testa a checagem real mesmo. &ausente=1 testa a fala
                 // extra do Caminho A sem precisar simular tempo real
                 // passando de verdade.
                 var forcado = /[?&]cenario=([AB])\b/i.exec(location.search);
                 var cenarioTeste = forcado ? forcado[1].toUpperCase() : (viajantePreparado() ? 'B' : 'A');
                 var ausenteTeste = /[?&]ausente=1\b/.test(location.search);
                 setTimeout(function () {
                   if (window.iniciarConfrontoMalik) window.iniciarConfrontoMalik(cenarioTeste, { ausente: ausenteTeste });
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

            // Antes usava "a primeira vez que esta função rodou hoje" como
            // referência — o que funcionava bem pra retomar no mesmo dia,
            // mas não tinha memória nenhuma do horário REAL do despertar.
            // Se a primeira visita depois do dia 30 fosse só dias depois,
            // o código achava que o despertar estava "começando agora" e
            // reiniciava a queima lenta do zero, ignorando o tempo que
            // realmente tinha passado. alvoDespertar é fixo (o Date de
            // verdade do DATA_DESPERTAR), então não precisa mais nem de
            // localStorage pra isso — dá sempre a mesma resposta certa,
            // não importa se são 5 minutos ou 5 dias depois do horário.
            function minutosDesdeODespertar() {
              return (Date.now() - alvoDespertar.getTime()) / 60000;
           }

           var TITULO_ORIGINAL = document.title;
           var FAVICON_LINK = document.querySelector('link[rel="icon"]');
           var FAVICON_ORIGINAL = FAVICON_LINK ? FAVICON_LINK.getAttribute('href') : null;
           var FAVICON_TYPE_ORIGINAL = FAVICON_LINK ? FAVICON_LINK.getAttribute('type') : null;

           // Alguns navegadores não redesenham o ícone da aba só por trocar o
           // href de um <link rel="icon"> que já existe no DOM — é preciso
           // recriar o elemento pra forçar uma busca nova. Sem isso, o ícone
           // ficava preso no do M.A.L.I.K. mesmo depois do confronto acabar
           // e o href já ter voltado ao original por baixo dos panos.
           function trocarFavicon(href, tipo) {
             if (!FAVICON_LINK || !FAVICON_LINK.parentNode) return;
             var novo = document.createElement('link');
             novo.rel = FAVICON_LINK.rel || 'icon';
             novo.type = tipo || FAVICON_LINK.type || 'image/png';
             novo.href = href;
             FAVICON_LINK.parentNode.replaceChild(novo, FAVICON_LINK);
             FAVICON_LINK = novo;
           }

           // A progressão narrativa: nada, um ponto, mais um ponto, 404,
           // NULL, o nome. Cada nível soma dessaturação, e os dois últimos
           // já mexem em elementos de verdade do Nexus.
           // Comprimida pra caber em ~30min no total (a luta em si dura
           // menos de 1min depois do último nível — ver malik-batalha.js).
           // Antes somava 26min no total; reescalado pra bater exatamente
           // com os 30 minutos pedidos (23:59 → 00:29), mantendo a mesma
           // proporção entre os intervalos que já existia.
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
          var jaCacado = false; // "não há lugares pra se esconder" só acontece uma vez por despertar
          var ausenteDuranteTudo = false; // true se o viajante só abriu a página depois do nível final já ter passado do seu horário natural — setado em agendarProgressao(), lido no gatilho do confronto

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
             // Antes a trava era "!observadorEsferas" — uma variável da
             // sessão inteira, não do documento. Assim que o iframe
             // navegava pra outra página e voltava pro nexus, essa
             // variável já não era mais null (ficou setada desde a
             // primeira vez), então nem a correção inicial nem um observer
             // novo eram aplicados no elemento do documento NOVO — o
             // #dragonball-panel voltava a mostrar a contagem real, porque
             // nada mais o corrompia. A trava certa é por elemento: cada
             // documento novo tem seu próprio contador, então cada um
             // precisa da sua própria correção+observer.
             if (contador && !contador.__malikObservado) {
               contador.__malikObservado = true;
               contador.textContent = 'NULL';
               // `.textContent = 'NULL'` dispara characterData/childList,
               // mesmo setando o mesmo valor que já tinha — sem a trava
               // abaixo, o callback disparava a mutação que ele mesmo
               // observa, de novo e de novo, sem nunca parar. Isso trava o
               // navegador (e o processo do dev server junto, de tanto
               // consumir CPU) especificamente onde o #dragonball-panel
               // existe — só no nexus.html, nunca nas outras páginas.
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
          // O nome finalmente foi dito — um instante depois, o confronto começa de verdade.
          setTimeout(function () {
            if (window.iniciarConfrontoMalik) window.iniciarConfrontoMalik(viajantePreparado() ? 'B' : 'A', { ausente: ausenteDuranteTudo });
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

     // Mesma técnica de "Não há lugares para se esconder": nasce como 0/1
     // embaralhado do tamanho da frase, e cada caractere trava numa ordem
     // embaralhada (não da esquerda pra direita) até formar o texto real.
     // Reaproveitada aqui pras falas do Malik fora da perseguição — pra
     // não ter um tom "limpo" destoando do resto da corrupção.
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
       // Se o nível final (o que revela o confronto) já devia ter
       // acontecido antes desta página sequer carregar, o viajante não
       // estava presente pra nenhuma parte da corrupção se desenrolando —
       // só chegou depois de tudo já ter caído. É essa a diferença entre
       // "a aba ficou aberta e foi só o resto até o fim" e "sumiu por
       // completo até já ter acabado".
       ausenteDuranteTudo = jaPassados >= NIVEIS[NIVEIS.length - 1].emMin;

       // O Malik "olha" pro estado do viajante assim que a corrupção
       // começa a ser processada — pouco preparado, ele comenta; e se o
       // viajante tentar correr atrás DEPOIS que já começou, ele percebe.
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

      // Restaura tudo sozinho, um tempo depois do pico — não depende
      // de um F5 nem de esperar o dia virar. 3h após o nível final.
      var minutosAteRestaurar = NIVEIS[NIVEIS.length - 1].emMin + 180;
      var faltamRestaurar = Math.max(0, minutosAteRestaurar - jaPassados);
      timers.push(setTimeout(restaurarTudo, faltamRestaurar * 60000));
    }

    function restaurarTudo() {
      timers.forEach(clearTimeout);
      timers = [];
      if (vigiaProgressoInterval) { clearInterval(vigiaProgressoInterval); vigiaProgressoInterval = null; }
      pararFlicker();
      if (overlayRuido) { overlayRuido.remove(); overlayRuido = null; }
      // Os observers de esferas/sym-title agora vivem por documento (uma
      // propriedade no próprio elemento), não numa variável de sessão —
      // não tem como nem precisa desconectar daqui: o reload do iframe
      // logo abaixo já descarta o documento inteiro, observers e tudo.
      document.title = TITULO_ORIGINAL;
      if (FAVICON_ORIGINAL) trocarFavicon(FAVICON_ORIGINAL, FAVICON_TYPE_ORIGINAL);
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
