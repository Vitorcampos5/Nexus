/* malik-luta-leyn.js — a luta 2D Leyn x Malik (estilo fighting game),
   depois que a Alma do viajante se funde ao Leyn.
   ============================================================
   ETAPA 1: a arena e o HUD (cenário em tela cheia, retratos nos
   cantos com barra de HP crescendo, timer, indicador de rounds) — já
   entregue e aprovada.

   ETAPA 2: movimento do Leyn — física básica (W pula, A/D anda, S
   abaixa) — já entregue.

   NESTA ENTREGA: chegaram as primeiras sprites do Malik (idle,
   gestos/holograma, caminhada) e um fundo animado (cathedral-wind.gif,
   substitui o cenario-eclipse.jpg estático). O Malik agora também
   aparece "vivo" na pista, no terço direito, respirando — espelho do
   que já existia pro Leyn. Os dois precisam de espelho (scaleX(-1)):
   a arte do Leyn olha pra esquerda por padrão mas ele fica no lado
   esquerdo (precisa olhar pra DIREITA, em direção ao Malik); a folha
   do Malik não é perfeitamente frontal e, sem espelho, ele parecia
   olhar pra DIREITA — pra longe do Leyn — então agora também leva
   scaleX(-1). O Leyn também pode atravessar pro outro lado do Malik
   (recuar/reposicionar por trás dele) — o limite direito não reserva
   mais espaço fixo pro Malik, e o Leyn vira sozinho (auto-encarar,
   comparando as posições dos dois) pra continuar de frente pra ele
   não importa de que lado esteja. Confirmado com o usuário: layout da
   luta em si continua Leyn esquerda / Malik direita — só a introdução
   (ver mostrarVsNovo no fim do arquivo) é espelhada.

   Também corrigido: as duas tiras idle (Leyn e Malik) foram recortadas
   de novo, ancorando cada quadro pela CABEÇA (a região mais estável
   visualmente) em vez do contorno do corpo inteiro (dominado pela
   capa, que se abre de forma diferente quadro a quadro e fazia a
   cabeça "pular" de posição). E a reprodução trocou de steps() unifor-
   me (Web Animations API) por tocarTiraComTempo(), que dá uma duração
   PRÓPRIA por quadro — o quadro de repouso (1) fica mais tempo no ar,
   o que ajudou a disfarçar a costura da volta do loop (quadro 5→1).

   INTEGRAÇÃO COM O CLÍMAX B: malik-batalha.js agora chama
   window.NexusMalikArenaLuta.iniciar() de verdade, no fim da sequência
   de esferas/portal/fusão da alma — não é mais só um arquivo isolado
   testável à parte. Ainda sem sistema de rounds real (ver ETAPA 5
   abaixo), então em modo de teste (?malikTeste=1) a tecla V dentro da
   arena aciona opcoes.aoTerminar() manualmente.

   ETAPA 6: mobile. Em telas tocáveis, iniciar() primeiro checa
   a orientação — se estiver em retrato, mostra um aviso pra girar o
   aparelho (mostrarAvisoGirar) e só monta a arena de verdade depois
   que a tela entrar em paisagem (screen.orientation.lock() também é
   tentado, best-effort, já que só funciona em fullscreen e nem existe
   no Safari iOS — o aviso é o que garante a experiência de verdade).
   D-pad (W/A/S/D) + 6 botões de golpe (J/K/L socos, U/I/O chutes) +
   provocação (Enter) ficam sempre visíveis nos cantos inferiores,
   como um emulador — nenhum escondido atrás de gesto. Teclado e touch
   escrevem no MESMO objeto de estado (iniciarMovimentoLeyn recebe
   `teclas` de fora agora, em vez de criar um por conta própria), então
   a física nem sabe qual dos dois foi usado.

   ETAPA 4: IA e física básica do Malik. Ele ganhou o mesmo
   wrapper separado (translate) + sprite interno (scaleX de auto-
   -encarar) que o Leyn já tinha — antes o elemento único acumulava
   posição fixa E o espelho, o que não dava pra mover. iniciarIAMalik()
   reaproveita a MESMA técnica de origem/limites em px do Leyn (mede a
   posição real no 1º quadro, trava nas bordas da pista por margemPx),
   só que decidida por uma IA simples em vez de teclado/touch: a cada
   intervalo (500-950ms, randomizado pra não parecer robótico — ver
   decidir()), ele mede a distância até o Leyn e escolhe avançar, recuar
   ou ficar parado, tentando manter uma faixa de distância "ideal"
   (persegue se o Leyn foge demais, recua/kita se ele chega perto
   demais), com uma chance de hesitar mesmo fora da faixa só pra não
   reagir instantâneo toda vez. É uma IA de espaçamento genérica, não
   uma leitura definitiva do personagem — os números (distâncias,
   intervalos, chance de hesitar, velocidade) estão isolados em
   constantes no topo bem fáceis de recalibrar se a sensação não bater
   com o que você imagina pro Malik. Ele ainda NÃO pula/agacha (sem
   sprite pra isso e sem pedido nesse sentido) e ainda anda com a pose
   de respiração (malik-idle.png) em vez de malik-caminhada.png — pelo
   mesmo motivo do Leyn abaixo, trocar a sprite durante o movimento é
   um passo separado. Golpes de verdade continuam de fora de propósito:
   a IA só decide POSICIONAMENTO aqui, nenhum ataque — isso é Etapa 3,
   e qual pose de malik-gestos.png casa com qual golpe é decisão
   combinada, não algo que essa entrega resolve sozinha.

   Também foi preciso garantir que o loop de física do Malik (e o do
   Leyn) PARE quando a luta termina — antes disso não existia (Malik
   era estático), mas agora, sem parar, o requestAnimationFrame ficaria
   sobrescrevendo o transform a cada quadro e desfaria a animação de
   "expulso" que malik-batalha.js aplica em cima do MESMO elemento
   (malikExpulsoNaArena faz `style.transform += ' scale(.15)'` sobre
   arenaContexto.malikSprite). Ver pararTodoMovimento(), chamada tanto
   pelo atalho de teste "V" quanto por remover()/pararMovimento().

   Ainda NÃO tem: golpes de CHUTE (U/I/O — sem sprite de chute ainda,
   os botões existem mas não fazem nada), leyn-invocar-espada.png (sem
   ter uma tecla/gatilho combinado — ver pendência aberta na entrega da
   Etapa 3, logo abaixo), sprite de andar do Malik em uso (a IA já
   anda, mas com a pose de respiração), sprite de caminhar/pular do
   Leyn (ele continua "deslizando" com a pose de respiração), colisão
   FÍSICA entre os dois (podem se sobrepor visualmente ao cruzar —
   hitbox de GOLPE é diferente disso e já existe, ver Etapa 3), rounds/
   vitória de verdade (o HP numérico já existe e reage a acerto, mas
   nada olha pro HP chegar em zero ainda — o atalho de teste "V"
   continua sendo o único jeito de encerrar a luta) — isso é Etapa 5,
   encaixando em cima do que já está aqui (ver window.NexusMalikArenaLuta
   no fim do arquivo).

   NESTA ENTREGA: Etapa 3 — golpes de SOCO do Leyn (J/K/L) e os dois
   ataques do Malik (vortice/mira), com hitbox de verdade e dano
   aplicado no HP numérico (novo — hpLeyn/hpMalik, só existiam como
   `.definirVida(1)` fixo antes). Os dois lados reaproveitam a MESMA
   ideia: máquina de estado simples (atacando/quadroAtual/
   jaAcertouEsseGolpe), troca de sprite por ARQUIVO AVULSO em vez de
   tira (mostrarQuadroAvulso() — golpes têm quadros de largura bem
   diferente entre si, ao contrário do idle, que é uma tira de
   largura uniforme), e uma hitbox retangular simples projetada à
   frente do lutador na direção que ele olha, checada só nos quadros
   "ativos" (onde o punho/explosão de fato alcança, não a antecipação/
   recuperação). Descoberta ao recortar os quadros e comparar com o
   idle: leyn-soco-0N.png é nativamente voltado pra DIREITA — o
   OPOSTO do leyn-idle.png — então o espelho do soco é invertido em
   relação ao idle (ver LEYN_SOCO_DIM); já malik-gesto-mira/vortice
   são voltados pra direita que NEM o malik-idle.png, mesma convenção,
   sem inverter. Bloqueio (Street Fighter: segurar a direção que
   afasta do oponente) reduz o dano do Malik pra vocês pra
   FRACAO_DANO_BLOQUEADO — chip damage, não bloqueio perfeito;
   exposto como `controleMovimento.estaBloqueando()`, lido pela IA do
   Malik na hora exata do acerto. A IA do Malik (decidir(), Etapa 4)
   ganhou uma checagem NOVA antes da lógica de posicionamento: se o
   Leyn está ao alcance de vortice (perto) ou mira (mais longe) e o
   cooldown já passou, sorteia se ataca em vez de só andar; vortice é
   priorizado por ser de mais perto. Simplificações conhecidas, de
   propósito: sem chutes (sem sprite), sem combo/hit-stun, Malik não
   bloqueia (não foi pedido), e a largura variável dos quadros pode
   causar um leve "chacoalhar" no corpo em vez de só o braço esticar —
   mais perceptível no Malik (wrapper ancorado por `right`, então o
   lado que cresce é o lado "errado" pra manter o corpo parado) do que
   no Leyn (ancorado por `left`, cresce pro lado certo por sorte). Sem
   teste real no navegador ainda, só teste funcional automatizado.

   NESTA ENTREGA: tela de "vs" nova e abertura da arena. (1)
   mostrarVsNovo() troca a introdução gif antiga (mostrarIntroducaoVS,
   mantida só de referência) por leyn-contra-malik.html — um arquivo
   AUTOCONTIDO (retratos em base64, WebGL) que entra num <iframe> e se
   comunica por postMessage (ele escuta 'versus:start' e avisa
   'versus:end' quando termina ou é pulado; ver comentário da função
   pros detalhes, incluindo a rede de segurança caso o arquivo não
   carregue). Só a integração aqui dentro do arquivo — QUEM chama
   mostrarVsNovo() no fluxo de verdade (antes de
   window.NexusMalikArenaLuta.iniciar()) é malik-batalha.js, em
   transicaoParaArenaLuta(); o gancho de teste (&introVs=1) já foi
   atualizado pra usar a versão nova. (2) tocarAberturaArena(): agora,
   assim que a arena nasce, o fundo começa no cenario-eclipse.jpg
   ESTÁTICO (não mais no cathedral-wind.gif direto) — em paralelo com o
   HUD revelando, o Malik "carrega" o gesto (Assets/malik/malik-gesto-
   -erguer-01..05.png, 5 ARQUIVOS separados, não uma tira — cada quadro
   tem tamanho natural diferente, cresce até a explosão do quadro 5,
   por isso troca de <img>.src em vez de background-position), a tela
   treme (sacudirTela(), genérica, dá pra reaproveitar num golpe
   depois) bem no instante da explosão, e o fundo troca pro cenário
   animado (ver entrega mais recente, logo abaixo) ainda com o tremor
   rolando (disfarça o corte seco entre o JPG parado e o que vem
   depois). Só depois de tudo isso é que os lutadores
   ganham física/controle — trocou o daquiA fixo de +1200ms por
   "espera tocarAberturaArena() terminar", pra não descolar se os
   tempos do gesto/tremor forem recalibrados depois. Assumi as pastas
   de destino dos arquivos novos por convenção (cenario-eclipse.jpg em
   Assets/arena/; malik-gesto-erguer-0N.png em Assets/malik/, ao lado
   das outras sprites do Malik) — ainda sem confirmação de que é onde
   esses arquivos realmente estão. leyn-contra-malik.html fica na RAIZ do
   site (é uma página inteira, não um asset dentro de Assets/).

   Retrato do Malik no painel da arena agora é fixo
   (Assets/malik/malik-pose-bracos-cruzados.png), igual o Leyn já
   usava leyn-retrato.png — antes era retrato.src (o que estivesse na
   tela no fim da cutscene antiga, variável). Trocado tanto no fluxo
   real (transicaoParaArenaLuta, malik-batalha.js) quanto no gancho de
   teste isolado abaixo, pra um refletir o outro.

   NESTA ENTREGA: cathedral-wind.gif foi SUBSTITUÍDO por
   cenario-eclipse-animado.html — mesma ideia do leyn-contra-malik.html
   (arquivo inteiro, autocontido, WebGL, fica na RAIZ do site, não em
   Assets/) — entra como <iframe> dentro de tocarAberturaArena() no
   exato instante em que antes eu trocava o background-image do
   `fundo` pro gif. Pedido explícito: SEM os botões dele (bandeja com
   Pausar/Ritmo/Tela cheia/toggles de efeito) e SEM o controle de
   mouse que move a câmera pros lados. Os botões somem com
   `?ui=0` na query string — o próprio arquivo já tem esse
   interruptor pronto (CSS `body.noui`), não precisei tocar no HTML/JS
   dele. O controle de mouse eu NÃO desliguei por dentro do arquivo —
   dei `pointer-events:none` no iframe por fora, que já é suficiente
   (os listeners de pointermove/pointerdown dele nunca disparam se o
   iframe não recebe o evento) e tem o benefício colateral de nem
   deixar esse fundo roubar cliques dos controles da luta; a deriva
   automática de câmera dele (sem depender de mouse) continua rolando
   sozinha, dando uma sensação de câmera viva mesmo sem ninguém
   interagindo. O iframe entra como IRMÃ do `fundo` antigo (logo antes
   da `vinheta`), não substitui/remove ele — a vinheta/chao continuam
   escurecendo as bordas por cima igual já faziam com o JPG, e o fundo
   antigo sobrevive por baixo como rede de segurança visual (se o
   arquivo não carregar por algum motivo, o JPG estático continua
   visível em vez de tela preta). O arquivo já vem com escalonamento
   de resolução adaptativo próprio (mede o tempo de quadro e ajusta
   sozinho — ver `renderScale` dentro dele), então não precisei repetir
   o teto de pixels fixo que apliquei no leyn-contra-malik.html.

   Onde mora: raiz, ao lado de malik.js / malik-batalha.js /
   index.html / nexus.html. Carregado sempre (defer), inerte até
   malik-batalha.js chamar iniciar() de verdade (ainda não chama —
   isso vem numa próxima etapa) ou até o gancho de teste isolado
   abaixo disparar.

   Sprites: Assets/arena/cenario-eclipse.jpg (estático — usado só na
   ABERTURA da arena, ver tocarAberturaArena) e
   Assets/leyn/leyn-idle.png e Assets/malik/malik-idle.png (tiras de 5
   quadros, respiração/parado, mesma técnica de steps() dos dois
   lados). Também chegaram Assets/malik/malik-gestos.png (5 poses de
   holograma/gesto) e Assets/malik/malik-caminhada.png (5 quadros de
   caminhada) —
   guardadas, ainda sem uso (entram quando o Malik ganhar golpes/IA de
   ataque de verdade); malik-gesto-erguer-01..05.png é uma sequência
   DIFERENTE dessas duas (5 arquivos separados, não uma tira) e essa
   já está em uso, na abertura da arena. Assets/arena/vs-intro.gif
   (tela de "vs" com os dois retratos) e Assets/arena/cathedral-wind.gif
   (fundo animado da luta) ficaram pra trás de vez — substituídos por
   leyn-contra-malik.html (ver mostrarVsNovo) e
   cenario-eclipse-animado.html (ver NESTA ENTREGA acima),
   respectivamente — nenhum dos dois é mais referenciado em lugar
   nenhum do arquivo.

   Testar isolado, sem precisar jogar a luta inteira até aqui:
     index.html?malikTeste=1&arenaLuta=1
   ============================================================
*/
(function () {
  'use strict';

  var PASTA_ARENA = 'Assets/arena/';
  var PASTA_MALIK = 'Assets/malik/';
  var PASTA_LEYN = 'Assets/leyn/';
  var OURO = '#C4A35A';
  var VERMELHO = '#ff2b3a';
  var TOTAL_ROUNDS = 3;

  // leyn-idle.png: tira de 5 quadros (respiração/parado), cada quadro
  // 340x660 no tamanho original — recortada de uma folha de referência
  // maior (que tinha título e numeração por cima, já removidos).
  var LEYN_IDLE_QUADROS = 5;
  var LEYN_IDLE_LARG_NATURAL = 1700;
  var LEYN_IDLE_ALT_NATURAL = 660;

  // malik-idle.png: mesma ideia, tira de 5 quadros, 285x690 cada no
  // tamanho original — malik-gestos.png e malik-caminhada.png (também
  // 5 quadros cada) chegaram junto mas ainda não têm uso nesta etapa.
  var MALIK_IDLE_QUADROS = 5;
  var MALIK_IDLE_LARG_NATURAL = 1425;
  var MALIK_IDLE_ALT_NATURAL = 690;

  // Golpes (Etapa 3): ao contrário das tiras acima (5 quadros iguais
  // numa folha só), essas são 5 ARQUIVOS separados cada — o soco
  // estica o braço de um jeito que cada quadro tem uma largura bem
  // diferente do vizinho, então uma tira de largura uniforme cortaria
  // o punho. Dimensões naturais (px) medidas quadro a quadro no
  // recorte original, usadas pra escalar cada arquivo até a MESMA
  // altura do idle (senão o personagem "pula" de tamanho ao socar).
  // leyn-soco-0N.png: direção NATIVA é voltada pra DIREITA (oposto do
  // leyn-idle.png, que é voltado pra esquerda) — reparei conferindo o
  // recorte quadro a quadro; por isso o espelhamento do soco é
  // INVERTIDO em relação ao idle (ver iniciarMovimentoLeyn).
  // CORRIGIDO (leva de sprites re-recortada): os 5 arquivos vieram com
  // margem transparente sobrando ao redor do personagem, e essa
  // margem variava de quadro a quadro (até 21px de sobra só de um
  // lado, 10px em cima/embaixo no quadro 1) — como o wrapper do Leyn é
  // ancorado pela ESQUERDA e a altura vem do canvas inteiro (não só do
  // personagem), essa margem inconsistente fazia o corpo "flutuar"/
  // tremer de tamanho e posição quadro a quadro. Recortei os 5
  // arquivos pelo bounding box real do conteúdo (mesmo padrão do
  // leyn-idle.png, que já não tinha margem nenhuma) e medi de novo —
  // os valores abaixo são desse recorte novo, não do arquivo original.
  var LEYN_SOCO_DIM = [[301, 457], [352, 468], [462, 451], [458, 457], [347, 462]];
  // malik-gesto-mira-0N.png e malik-gesto-vortice-0N.png: direção
  // nativa voltada pra DIREITA — MESMO sentido do malik-idle.png,
  // então usam o mesmo espelhamento que a IA já calcula (sem inverter).
  var MALIK_MIRA_DIM = [[331, 559], [351, 542], [366, 520], [433, 561], [366, 684]];
  var MALIK_VORTICE_DIM = [[297, 578], [361, 545], [352, 550], [438, 600], [415, 637]];

  // física do movimento (Etapa 2) — valores calibrados a olho, fáceis
  // de ajustar depois de testar: VELOCIDADE_PULO calculada pra dar uma
  // altura de pulo de ~160px com essa gravidade (v0 = sqrt(2*g*h))
  var VELOCIDADE_MOVIMENTO = 260; // px/s
  var GRAVIDADE = 2200; // px/s²
  var VELOCIDADE_PULO = 840; // px/s, impulso inicial
  var ESCALA_ABAIXADO = 0.72; // encolhe verticalmente a partir da base — placeholder até existir sprite de agachar

  // Golpes do Leyn (Etapa 3) — J/K/L tocam a MESMA animação
  // (leyn-soco-0N.png; ainda não existe sprite de chute, U/I/O
  // continuam sem fazer nada) com velocidade/dano diferentes por
  // botão, como o design pediu ("dano e velocidade variam por golpe
  // escolhido"). Números de partida, fáceis de recalibrar depois de
  // sentir o jogo de verdade.
  var LEYN_GOLPES = {
    j: { msPorQuadro: 140, dano: 0.06 }, // fraco — rápido, fraco
    k: { msPorQuadro: 180, dano: 0.10 }, // médio
    l: { msPorQuadro: 230, dano: 0.15 }  // forte — lento, dói mais
  };
  var LEYN_GOLPE_QUADRO_ATIVO_MIN = 2; // hitbox só liga nos quadros 03/04 (índice 2/3, base 0) — braço de fato esticado
  var LEYN_GOLPE_QUADRO_ATIVO_MAX = 3;
  var LEYN_GOLPE_ALCANCE_PX = 90; // o quanto a hitbox estica à frente do corpo do Leyn

  // Ataques do Malik (Etapa 3 — IA, complementa a Etapa 4): a IA de
  // posicionamento já existia; agora ela também pode escolher atacar
  // em vez de andar. vortice = curta distância (o quadro final é
  // praticamente um soco a queima-roupa, ver referência); mira =
  // distância maior (explosão mais "lançada"). Nenhum dos dois é
  // golpe físico de verdade — os dois viram a MESMA mecânica de
  // hitbox por baixo, só a pose/alcance mudam.
  var MALIK_ATAQUE_VORTICE = { pasta: 'malik-gesto-vortice-', dim: MALIK_VORTICE_DIM, msPorQuadro: 190, dano: 0.09, alcancePx: 130, distanciaMaxPx: 210 };
  var MALIK_ATAQUE_MIRA = { pasta: 'malik-gesto-mira-', dim: MALIK_MIRA_DIM, msPorQuadro: 190, dano: 0.09, alcancePx: 260, distanciaMaxPx: 380 };
  var MALIK_ATAQUE_QUADRO_ATIVO_MIN = 3; // quadros 04/05 — é quando a explosão/alcance de verdade aparece nas duas sequências
  var MALIK_ATAQUE_QUADRO_ATIVO_MAX = 4;
  var MALIK_ATAQUE_COOLDOWN_MS = 1400; // tempo mínimo entre um ataque e a próxima CHANCE de atacar (a IA ainda pode decidir andar em vez de atacar mesmo depois disso)
  var MALIK_ATAQUE_CHANCE = 0.55; // chance de escolher atacar (em vez de só se posicionar) quando o Leyn está a uma distância alcançável e o cooldown já passou

  // Bloqueio (Street Fighter: segurar a direção AFASTANDO do
  // oponente): reduz o dano recebido bastante, mas não zera — é chip
  // damage, não bloqueio perfeito.
  var FRACAO_DANO_BLOQUEADO = 0.2;

  // IA do Malik (Etapa 4) — só posicionamento, sem ataque nenhum ainda
  // (ver cabeçalho do arquivo). Números calibrados a olho, como o
  // resto da física acima; ajuste livre se a sensação não bater com o
  // personagem que você imagina.
  var VELOCIDADE_MOVIMENTO_MALIK = 200; // px/s — um pouco mais lento/deliberado que o Leyn (260)
  var IA_MALIK_DISTANCIA_MIN_PX = 150; // mais perto que isso, ele recua (kita)
  var IA_MALIK_DISTANCIA_MAX_PX = 320; // mais longe que isso, ele avança
  var IA_MALIK_DECISAO_MIN_MS = 550; // intervalo entre decisões da IA — randomizado dentro dessa faixa
  var IA_MALIK_DECISAO_MAX_MS = 950;
  var IA_MALIK_CHANCE_HESITAR = 0.2; // 20% de chance de ficar parado mesmo fora da faixa ideal, só pra não parecer robótico

  // usada tanto no gancho de teste isolado (fim do arquivo) quanto
  // dentro de iniciarArenaLuta, pra saber se mostra o atalho "V pra
  // vencer (teste)" — por isso definida aqui em cima, não lá embaixo
  var modoTeste = /[?&]malikTeste=1\b/.test(location.search);

  function el(tag, css, texto) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  function reduzMovimento() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  // Cor da barra de vida pelo percentual restante — leitura instantânea
  // sem precisar olhar o número, como na maioria dos fighting games.
  function corDaVida(percentual) {
    if (percentual > 0.5) return '#5CDB6A';
    if (percentual > 0.25) return '#E8C13A';
    return VERMELHO;
  }

  // Monta o painel de um lutador: retrato pequeno + nome + rounds +
  // barra de HP. lado ('esquerda'|'direita') decide de que ponta a
  // barra "nasce" e pra que lado o conjunto todo alinha — em qualquer
  // fighting game de dois jogadores a barra do P2 é o espelho da do
  // P1, não uma cópia direta.
  function montarPainelLutador(lado, nomeExibido, corVidaInicial) {
    var ehEsquerda = lado === 'esquerda';
    var painel = el('div',
      'position:absolute;top:16px;' + (ehEsquerda ? 'left:16px;' : 'right:16px;') +
      'display:flex;align-items:flex-start;gap:10px;' + (ehEsquerda ? '' : 'flex-direction:row-reverse;') +
      'z-index:2;width:min(46vw,320px);'
    );

    var retratoWrap = el('div',
      'width:54px;height:54px;flex-shrink:0;border:2px solid ' + OURO + ';border-radius:6px;' +
      'background:#0b0710;overflow:hidden;box-shadow:0 0 14px rgba(196,163,90,.5);' +
      'opacity:0;transform:scale(.4);transition:opacity .6s ease,transform .6s cubic-bezier(.2,.8,.2,1);'
    );
    var retratoImg = el('img', 'width:100%;height:100%;object-fit:cover;object-position:top center;');
    retratoImg.alt = nomeExibido;
    retratoImg.onerror = function () { retratoWrap.style.visibility = 'hidden'; };
    retratoWrap.appendChild(retratoImg);

    var coluna = el('div', 'display:flex;flex-direction:column;gap:4px;flex:1;min-width:0;' + (ehEsquerda ? '' : 'align-items:flex-end;'));

    var linhaTopo = el('div', 'display:flex;align-items:center;gap:8px;width:100%;' + (ehEsquerda ? '' : 'flex-direction:row-reverse;'));
    var nomeEl = el('div',
      'font-family:Georgia,"Cormorant Garamond",serif;font-size:12px;letter-spacing:.14em;' +
      'color:#E8E0D0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
      nomeExibido
    );
    var roundsEl = el('div', 'display:flex;gap:4px;margin-' + (ehEsquerda ? 'left' : 'right') + ':auto;');
    linhaTopo.appendChild(nomeEl);
    linhaTopo.appendChild(roundsEl);

    var barraFundo = el('div',
      'width:100%;height:14px;background:#1a1015;border:1px solid rgba(232,224,208,.35);' +
      'border-radius:3px;overflow:hidden;box-shadow:inset 0 0 6px rgba(0,0,0,.6);'
    );
    // a barra nasce em 0% e cresce até a vida atual — nunca aparece já
    // cheia. margin-left/right:auto faz ela crescer "de dentro pra
    // fora" a partir da ponta que fica colada no retrato, que é o
    // efeito de espelho certo pro lado direito (Malik).
    var barraVida = el('div',
      'height:100%;width:0%;background:' + corVidaInicial + ';' +
      'transition:width .6s ease,background-color .4s ease;' + (ehEsquerda ? '' : 'margin-left:auto;')
    );
    barraFundo.appendChild(barraVida);

    coluna.appendChild(linhaTopo);
    coluna.appendChild(barraFundo);

    if (ehEsquerda) { painel.appendChild(retratoWrap); painel.appendChild(coluna); }
    else { painel.appendChild(coluna); painel.appendChild(retratoWrap); }

    return {
      painel: painel,
      retratoWrap: retratoWrap,
      retratoImg: retratoImg,
      // marca quantos rounds já foram vencidos (bolinha dourada cheia)
      // contra o total possível (vazia, só contorno)
      marcarRounds: function (vencidos) {
        roundsEl.innerHTML = '';
        for (var i = 0; i < TOTAL_ROUNDS; i++) {
          roundsEl.appendChild(el('div',
            'width:8px;height:8px;border-radius:50%;border:1px solid ' + OURO + ';' +
            'background:' + (i < vencidos ? OURO : 'transparent') + ';'
          ));
        }
      },
      revelar: function () {
        requestAnimationFrame(function () {
          retratoWrap.style.opacity = '1';
          retratoWrap.style.transform = 'scale(1)';
        });
      },
      // 0 a 1 — a transição de width já faz a barra "crescer" sozinha
      definirVida: function (percentual) {
        percentual = Math.max(0, Math.min(1, percentual));
        barraVida.style.width = (percentual * 100) + '%';
        barraVida.style.background = corDaVida(percentual);
      }
    };
  }

  function montarTimer() {
    return el('div',
      'position:absolute;top:12px;left:50%;transform:translateX(-50%);' +
      'font-family:Consolas,monospace;font-size:26px;font-weight:bold;color:#E8E0D0;' +
      'text-shadow:0 0 10px rgba(0,0,0,.9),0 0 16px rgba(196,163,90,.5);z-index:2;' +
      'opacity:0;transition:opacity .8s ease;',
      '99'
    );
  }

  // Indicador de round central ("ROUND 1"), aparece e some sozinho —
  // o mesmo texto/posição vai servir de aviso de vitória/derrota
  // quando o sistema de rounds de verdade existir (próxima etapa).
  function mostrarAvisoRound(arena, texto, duracaoMs) {
    var aviso = el('div',
      'position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);z-index:3;' +
      'font-family:Georgia,"Cormorant Garamond",serif;font-size:22px;letter-spacing:.2em;' +
      'text-align:center;color:#E8C97A;text-shadow:0 0 10px rgba(255,43,58,.7),0 0 24px rgba(196,163,90,.6);' +
      'opacity:0;transition:opacity .5s ease;',
      texto
    );
    arena.appendChild(aviso);
    requestAnimationFrame(function () { aviso.style.opacity = '1'; });
    setTimeout(function () {
      aviso.style.opacity = '0';
      setTimeout(function () { aviso.remove(); }, 600);
    }, duracaoMs || 1600);
    return aviso;
  }

  // Sacode um elemento por uma duração curta (tremor de tela) —
  // deslocamentos pequenos e decrescentes em X/Y, sem depender de
  // nenhuma lib. Usada no impacto do gesto do Malik, mas escrita
  // genérica (recebe o elemento) pra poder ser reaproveitada em outro
  // golpe/impacto mais tarde (Etapa 3).
  function sacudirTela(elemento, duracaoMs, forcaPx) {
    var inicio = null;
    function quadro(agora) {
      if (inicio === null) inicio = agora;
      var decorrido = agora - inicio;
      var progresso = Math.min(1, decorrido / duracaoMs);
      if (progresso >= 1) { elemento.style.transform = ''; return; }
      var atenuacao = 1 - progresso; // vai enfraquecendo até parar
      var dx = (Math.random() * 2 - 1) * forcaPx * atenuacao;
      var dy = (Math.random() * 2 - 1) * forcaPx * atenuacao * 0.6; // menos vertical que horizontal, fica mais natural
      elemento.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
      requestAnimationFrame(quadro);
    }
    requestAnimationFrame(quadro);
  }

  // ---------- abertura da arena: eclipse parado -> gesto do Malik ----------
  // -> tremor -> cathedral-wind.gif. Roda uma vez, antes do Leyn/Malik
  // ganharem física (chamada de dentro de iniciarArenaLutaDeVerdade, ver
  // abaixo). malik-gesto-erguer-01..05.png são 5 ARQUIVOS separados (não
  // uma tira única) porque cada quadro tem um tamanho natural diferente
  // — cresce até a explosão do quadro 5 — por isso troca de <img>.src em
  // vez de background-position numa tira só. daquiA aqui é o MESMO
  // acumulador de timers do chamador (passado por parâmetro), então
  // remover() continua limpando tudo se a arena for desmontada no meio
  // da sequência.
  var GESTO_MALIK_ARQUIVOS = 5;
  var GESTO_MALIK_MS_POR_QUADRO = 220;
  function tocarAberturaArena(fundo, arena, daquiA, offsetBase, aoTerminar) {
    var img = el('img',
      'position:absolute;right:6%;bottom:4%;max-height:66%;max-width:50%;width:auto;height:auto;' +
      'opacity:0;transition:opacity .25s ease;filter:drop-shadow(0 0 30px rgba(255,43,58,.55));z-index:2;'
    );
    arena.appendChild(img);

    function nomeQuadro(n) { return PASTA_MALIK + 'malik-gesto-erguer-0' + n + '.png'; }

    for (var n = 1; n <= GESTO_MALIK_ARQUIVOS; n++) {
      (function (n, atraso) {
        daquiA(offsetBase + atraso, function () {
          img.src = nomeQuadro(n);
          img.style.opacity = '1';
        });
      })(n, (n - 1) * GESTO_MALIK_MS_POR_QUADRO);
    }

    var tImpacto = offsetBase + (GESTO_MALIK_ARQUIVOS - 1) * GESTO_MALIK_MS_POR_QUADRO; // quadro 5 (explosão) na tela
    var duracaoTremor = 450;

    daquiA(tImpacto, function () {
      sacudirTela(fundo, duracaoTremor, 14);
    });
    daquiA(tImpacto + 260, function () {
      img.style.opacity = '0';
      setTimeout(function () { img.remove(); }, 260);
    });
    daquiA(tImpacto + 380, function () {
      // troca o fundo ainda com o tremor em andamento — ajuda a
      // disfarçar o corte seco entre o JPG estático e o cenário animado.
      // Era `fundo.style.backgroundImage = cathedral-wind.gif`; agora é
      // um <iframe> pra cenario-eclipse-animado.html — arquivo inteiro
      // (WebGL, própria animação de nuvens/estandartes/brasas), por
      // isso fica na RAIZ do site como leyn-contra-malik.html, não em
      // Assets/. `?ui=0` esconde a bandeja de botões e o texto de dica
      // dele (CSS `body.noui` já pronto no próprio arquivo — não
      // precisei editar nada lá dentro). `pointer-events:none` mata o
      // "arraste/mova o mouse pra olhar em volta" de propósito (é
      // fundo, não pode roubar o mouse dos controles da luta) — a
      // deriva automática da câmera dele continua rolando sozinha
      // (não depende de ponteiro). Entra como IRMÃ do fundo antigo,
      // logo antes da vinheta — assim a vinheta/chao continuam
      // escurecendo as bordas por cima dele igual escureciam o JPG; o
      // fundo antigo fica pra trás (não removido) só como uma rede de
      // segurança visual se o arquivo não carregar por algum motivo.
      var cenarioAnimado = el('iframe', 'position:absolute;inset:0;width:100%;height:100%;border:0;pointer-events:none;');
      cenarioAnimado.setAttribute('title', 'Cenário do eclipse, animado');
      cenarioAnimado.src = 'cenario-eclipse-animado.html?ui=0';
      arena.insertBefore(cenarioAnimado, fundo.nextSibling);
    });
    daquiA(tImpacto + duracaoTremor + 120, function () {
      if (aoTerminar) aoTerminar();
    });
  }

  // Mostra UM quadro avulso (arquivo separado, não tira) num sprite
  // que normalmente toca uma tira de idle — reescala pela LARGURA/
  // ALTURA NATURAL desse quadro específico até bater com alturaAlvo
  // (a mesma altura que o idle já usa, senão o personagem muda de
  // tamanho ao golpear). Reaproveitada tanto pro soco do Leyn quanto
  // pros dois ataques do Malik — só muda pasta/nome/dimensões.
  function mostrarQuadroAvulso(sprite, pasta, nomeBase, indice1based, dimensoesNaturais, alturaAlvo) {
    var dim = dimensoesNaturais[indice1based - 1];
    var escala = alturaAlvo / dim[1];
    var larguraEscalada = dim[0] * escala;
    sprite.style.backgroundImage = "url('" + pasta + nomeBase + (indice1based < 10 ? '0' + indice1based : indice1based) + ".png')";
    sprite.style.backgroundRepeat = 'no-repeat';
    sprite.style.backgroundPosition = '0 0';
    sprite.style.backgroundSize = larguraEscalada + 'px ' + alturaAlvo + 'px';
    sprite.style.width = larguraEscalada + 'px';
    sprite.style.height = alturaAlvo + 'px';
  }

  // Toca uma tira de sprite com duração PRÓPRIA por quadro, em vez do
  // steps() uniforme (Web Animations API) usado antes — cada quadro
  // fica no ar pelo tempo que o array `duracoesMs` disser. Isso ajuda
  // a suavizar a volta do loop (quadro N → quadro 1), que é onde
  // qualquer diferença de pose entre os quadros fica mais visível: o
  // quadro de repouso pode ficar mais tempo parado, "escondendo" a
  // costura. Retorna um controlador com .parar() pra desligar o loop.
  function tocarTiraComTempo(elemento, largQuadro, nQuadros, duracoesMs) {
    var indice = 0;
    var ativo = true;
    var timerId = null;
    function mostrarQuadro() {
      if (!ativo) return;
      elemento.style.backgroundPositionX = (-largQuadro * indice) + 'px';
      timerId = setTimeout(function () {
        indice = (indice + 1) % nQuadros;
        mostrarQuadro();
      }, duracoesMs[indice % duracoesMs.length]);
    }
    mostrarQuadro();
    return { parar: function () { ativo = false; if (timerId) clearTimeout(timerId); } };
  }

  // Quadro 1 (repouso) fica mais tempo no ar que os demais — foi o
  // ponto que mascarou melhor a costura do loop nos testes.
  var LEYN_IDLE_DURACOES_MS = [820, 480, 540, 480, 660];
  var MALIK_IDLE_DURACOES_MS = [820, 480, 540, 480, 660];

  function prepararTiraLeynIdle(elemento, alturaAlvo) {
    var escala = alturaAlvo / LEYN_IDLE_ALT_NATURAL;
    var largEscalada = LEYN_IDLE_LARG_NATURAL * escala;
    var largQuadro = largEscalada / LEYN_IDLE_QUADROS;
    elemento.style.backgroundImage = "url('" + PASTA_LEYN + "leyn-idle.png')";
    elemento.style.backgroundRepeat = 'no-repeat';
    elemento.style.backgroundSize = largEscalada + 'px ' + alturaAlvo + 'px';
    elemento.style.backgroundPosition = '0 0';
    elemento.style.width = largQuadro + 'px';
    elemento.style.height = alturaAlvo + 'px';
    return tocarTiraComTempo(elemento, largQuadro, LEYN_IDLE_QUADROS, LEYN_IDLE_DURACOES_MS);
  }

  // Coloca o Leyn de pé no terço esquerdo da pista, respirando em
  // loop — o wrapper (retornado) é o que a física de movimento (logo
  // abaixo) move; o sprite fica DENTRO dele, espelhado (scaleX(-1)),
  // porque a arte original olha pra esquerda mas o Leyn precisa olhar
  // pra DIREITA (o Malik fica do lado direito). Separar os dois
  // elementos evita que o espelho e o translate de movimento se
  // misturem — se fosse o mesmo elemento, um scaleX(-1) inverteria
  // também o sentido do translateX aplicado pela física.
  function montarLeynNaPista(pistaLuta) {
    var alturaAlvo = Math.min(window.innerHeight * 0.62, 620);
    var wrapper = el('div', 'position:absolute;left:14%;bottom:8%;opacity:0;transition:opacity 1s ease;');
    var sprite = el('div', 'filter:drop-shadow(0 10px 16px rgba(0,0,0,.65));transform:scaleX(-1);');
    wrapper.appendChild(sprite);
    pistaLuta.appendChild(wrapper);
    if (!reduzMovimento()) wrapper.controleIdle = prepararTiraLeynIdle(sprite, alturaAlvo);
    else {
      // respeita prefers-reduced-motion: mostra só o 1º quadro, parado
      sprite.style.backgroundImage = "url('" + PASTA_LEYN + "leyn-idle.png')";
      sprite.style.backgroundRepeat = 'no-repeat';
      sprite.style.backgroundSize = (LEYN_IDLE_LARG_NATURAL * (alturaAlvo / LEYN_IDLE_ALT_NATURAL)) + 'px ' + alturaAlvo + 'px';
      sprite.style.width = (LEYN_IDLE_LARG_NATURAL / LEYN_IDLE_QUADROS * (alturaAlvo / LEYN_IDLE_ALT_NATURAL)) + 'px';
      sprite.style.height = alturaAlvo + 'px';
    }
    requestAnimationFrame(function () { wrapper.style.opacity = '1'; });
    wrapper.spriteEl = sprite; // exposto pra iniciarMovimentoLeyn poder virar o sprite (auto-encarar) sem mexer no wrapper
    wrapper.alturaAlvo = alturaAlvo; // exposto pra reescalar os quadros do golpe na mesma altura do idle
    return wrapper;
  }

  // Mesma técnica, pro Malik — tira própria (malik-idle.png).
  function prepararTiraMalikIdle(elemento, alturaAlvo) {
    var escala = alturaAlvo / MALIK_IDLE_ALT_NATURAL;
    var largEscalada = MALIK_IDLE_LARG_NATURAL * escala;
    var largQuadro = largEscalada / MALIK_IDLE_QUADROS;
    elemento.style.backgroundImage = "url('" + PASTA_MALIK + "malik-idle.png')";
    elemento.style.backgroundRepeat = 'no-repeat';
    elemento.style.backgroundSize = largEscalada + 'px ' + alturaAlvo + 'px';
    elemento.style.backgroundPosition = '0 0';
    elemento.style.width = largQuadro + 'px';
    elemento.style.height = alturaAlvo + 'px';
    return tocarTiraComTempo(elemento, largQuadro, MALIK_IDLE_QUADROS, MALIK_IDLE_DURACOES_MS);
  }

  // Malik no terço direito, virado pra esquerda (em direção ao Leyn).
  // A folha malik-idle.png não é perfeitamente frontal — tem uma leve
  // virada pro lado que, sem espelho, faz o Malik parecer olhar pra
  // DIREITA (pra longe do Leyn); com scaleX(-1) ele passa a encarar o
  // oponente, como devia. Agora com wrapper separado do sprite — mesma
  // divisão que o Leyn já usava (ver montarLeynNaPista): o wrapper
  // recebe a posição fixa (right/bottom) e o translate da IA (Etapa 4),
  // o sprite interno recebe só o espelho (scaleX) e a sombra — assim os
  // dois transforms não se atropelam, do mesmo jeito que já era
  // necessário pro Leyn.
  function montarMalikNaPista(pistaLuta) {
    var alturaAlvo = Math.min(window.innerHeight * 0.62, 620);
    var wrapper = el('div', 'position:absolute;right:14%;bottom:8%;opacity:0;transition:opacity 1s ease;');
    var sprite = el('div', 'filter:drop-shadow(0 10px 16px rgba(255,43,58,.3));transform:scaleX(-1);');
    wrapper.appendChild(sprite);
    pistaLuta.appendChild(wrapper);
    if (!reduzMovimento()) wrapper.controleIdle = prepararTiraMalikIdle(sprite, alturaAlvo);
    else {
      sprite.style.backgroundImage = "url('" + PASTA_MALIK + "malik-idle.png')";
      sprite.style.backgroundRepeat = 'no-repeat';
      sprite.style.backgroundSize = (MALIK_IDLE_LARG_NATURAL * (alturaAlvo / MALIK_IDLE_ALT_NATURAL)) + 'px ' + alturaAlvo + 'px';
      sprite.style.width = (MALIK_IDLE_LARG_NATURAL / MALIK_IDLE_QUADROS * (alturaAlvo / MALIK_IDLE_ALT_NATURAL)) + 'px';
      sprite.style.height = alturaAlvo + 'px';
    }
    requestAnimationFrame(function () { wrapper.style.opacity = '1'; });
    wrapper.spriteEl = sprite; // exposto pra iniciarIAMalik poder virar o sprite (auto-encarar) sem mexer no wrapper
    wrapper.alturaAlvo = alturaAlvo; // exposto pra reescalar os quadros de ataque na mesma altura do idle
    return wrapper;
  }

  // ---------- Etapa 2: movimento do Leyn ----------
  // W pula, A/D anda, S abaixa. Trabalha em cima do MESMO elemento que
  // já está na pista (leynEl) — só adiciona um transform de deslocamento
  // por cima do left/bottom fixos que montarLeynNaPista já definiu, então
  // não precisa saber nada sobre como o elemento foi posicionado.
  // Abaixar trava o movimento lateral e o pulo (só dá pra abaixar
  // parado) — padrão da maioria dos fighting games. malikEl é usado só
  // pra decidir o lado que o Leyn deve encarar — ele pode atravessar
  // pro outro lado do Malik (recuar/reposicionar) e vira sozinho pra
  // continuar de frente pra ele, como em qualquer fighting game.
  // teclas: objeto de estado compartilhado — quem chama já cria e
  // passa esse objeto (em vez de criado aqui dentro) porque em mobile
  // o D-pad/botões touch (mais abaixo) escrevem NELE também, então os
  // dois jeitos de controlar viram a mesma fonte de verdade pra
  // física. TECLAS_CONTROLADAS já inclui os golpes (j/k/l/u/i/o/enter)
  // mesmo sem hitbox nenhuma ainda — é só pra teclado e touch ficarem
  // simétricos, prontos pra Etapa 3 ler esse mesmo estado depois.
  var TECLAS_CONTROLADAS = { a: 1, d: 1, w: 1, s: 1, j: 1, k: 1, l: 1, u: 1, i: 1, o: 1, enter: 1 };

  function iniciarMovimentoLeyn(pistaLuta, leynEl, malikEl, teclas, opcoes) {
    if (!pistaLuta || !leynEl) return { parar: function () {}, estaBloqueando: function () { return false; } }; // sem sprite ainda, nada a controlar
    opcoes = opcoes || {};

    leynEl.style.transformOrigin = 'bottom center';
    var sprite = leynEl.spriteEl || null; // elemento que recebe o espelho (scaleX) — separado do wrapper que recebe o translate
    var olhandoDireita = true; // começa virado pro Malik, que nasce à direita

    teclas = teclas || {};
    function aoKeyDown(e) {
      var t = (e.key || '').toLowerCase();
      if (!TECLAS_CONTROLADAS[t]) return;
      teclas[t] = true;
      e.preventDefault();
    }
    function aoKeyUp(e) {
      var t = (e.key || '').toLowerCase();
      if (!TECLAS_CONTROLADAS[t]) return;
      teclas[t] = false;
    }
    document.addEventListener('keydown', aoKeyDown);
    document.addEventListener('keyup', aoKeyUp);

    var xInicialPx = null; // medido no 1º quadro — origem real em px a partir da pista (left:14% já renderizado)
    var deslocamentoX = 0;
    var alturaPulo = 0;
    var velocidadeY = 0;
    var noChao = true;
    var ultimoTempo = null;
    var ativo = true;

    // Golpe (J/K/L) — detectado por BORDA DE SUBIDA (teclasAnteriores),
    // não por "enquanto segura", senão manter a tecla apertada
    // metralharia socos. Funciona igual pra teclado ou touch — os dois
    // escrevem no MESMO objeto `teclas`, então basta comparar o valor
    // atual com o do quadro anterior, sem precisar interceptar os dois
    // caminhos de entrada separadamente.
    var teclasAnteriores = { j: false, k: false, l: false };
    var atacando = false;
    var golpeAtual = null; // 'j' | 'k' | 'l'
    var tempoInicioGolpe = 0;
    var quadroGolpeAtual = -1; // -1 = ainda não mostrou nenhum quadro deste golpe
    var jaAcertouEsseGolpe = false;

    // Vira o sprite pro lado certo, comparando o centro do Leyn com o
    // centro do Malik — só mexe no DOM quando o lado realmente muda,
    // pra não escrever um transform idêntico a cada quadro à toa.
    // Congelada durante o golpe (ver quadro()) — não faz sentido virar
    // no meio do soco, e simplifica a hitbox (direção não muda no ar).
    function atualizarFace() {
      if (!sprite || !malikEl) return;
      var retLeyn = leynEl.getBoundingClientRect();
      var retMalik = malikEl.getBoundingClientRect();
      var deveOlharDireita = (retMalik.left + retMalik.width / 2) >= (retLeyn.left + retLeyn.width / 2);
      if (deveOlharDireita !== olhandoDireita) {
        olhandoDireita = deveOlharDireita;
        sprite.style.transform = olhandoDireita ? 'scaleX(-1)' : 'scaleX(1)';
      }
    }

    // leyn-soco-0N.png tem direção NATIVA voltada pra DIREITA — o
    // OPOSTO do leyn-idle.png — então o espelho do soco é invertido em
    // relação a atualizarFace() acima (ver comentário de LEYN_SOCO_DIM).
    function transformSocoParaFace() {
      return olhandoDireita ? 'scaleX(1)' : 'scaleX(-1)';
    }

    function iniciarGolpe(tecla, agora) {
      atacando = true;
      golpeAtual = tecla;
      tempoInicioGolpe = agora;
      quadroGolpeAtual = -1;
      jaAcertouEsseGolpe = false;
      if (leynEl.controleIdle) { leynEl.controleIdle.parar(); leynEl.controleIdle = null; }
      if (sprite) sprite.style.transform = transformSocoParaFace();
    }

    function terminarGolpe() {
      atacando = false;
      golpeAtual = null;
      if (sprite && leynEl.alturaAlvo) {
        leynEl.controleIdle = prepararTiraLeynIdle(sprite, leynEl.alturaAlvo);
        sprite.style.transform = olhandoDireita ? 'scaleX(-1)' : 'scaleX(1)';
      }
    }

    // Retângulo de alcance à frente do Leyn, na direção que ele olha —
    // usado tanto pra checar acerto (chamada daqui) quanto, no futuro,
    // pra qualquer coisa que precise saber "até onde o soco alcança".
    function hitboxGolpe() {
      var r = leynEl.getBoundingClientRect();
      return olhandoDireita
        ? { left: r.right, right: r.right + LEYN_GOLPE_ALCANCE_PX, top: r.top, bottom: r.bottom }
        : { left: r.left - LEYN_GOLPE_ALCANCE_PX, right: r.left, top: r.top, bottom: r.bottom };
    }
    function sobrepoe(a, b) {
      return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    }

    function quadro(agora) {
      if (!ativo) return;
      if (xInicialPx === null) {
        var retLeyn = leynEl.getBoundingClientRect();
        var retPista = pistaLuta.getBoundingClientRect();
        xInicialPx = retLeyn.left - retPista.left;
      }
      if (ultimoTempo === null) ultimoTempo = agora;
      // trava o dt máximo — sem isso, voltar de uma aba em background
      // (dt gigante acumulado) faria ele teleportar/atravessar a borda
      var dt = Math.min((agora - ultimoTempo) / 1000, 0.05);
      ultimoTempo = agora;

      // Borda de subida dos botões de soco — só entra num golpe novo se
      // não estiver já no meio de outro, parado no chão e não abaixado
      // (abaixado é recalculado logo abaixo, mas symptom um golpe só
      // pode COMEÇAR fora do agachamento; se já estiver atacando, isso
      // nem é checado de novo até terminar)
      if (!atacando && noChao && !teclas.s) {
        if (teclas.j && !teclasAnteriores.j) iniciarGolpe('j', agora);
        else if (teclas.k && !teclasAnteriores.k) iniciarGolpe('k', agora);
        else if (teclas.l && !teclasAnteriores.l) iniciarGolpe('l', agora);
      }
      teclasAnteriores.j = !!teclas.j;
      teclasAnteriores.k = !!teclas.k;
      teclasAnteriores.l = !!teclas.l;

      if (atacando) {
        var golpeInfo = LEYN_GOLPES[golpeAtual];
        var decorrido = agora - tempoInicioGolpe;
        var indiceQuadro = Math.min(4, Math.floor(decorrido / golpeInfo.msPorQuadro));
        if (indiceQuadro !== quadroGolpeAtual) {
          quadroGolpeAtual = indiceQuadro;
          if (sprite && leynEl.alturaAlvo) mostrarQuadroAvulso(sprite, PASTA_LEYN, 'leyn-soco-', quadroGolpeAtual + 1, LEYN_SOCO_DIM, leynEl.alturaAlvo);
        }
        if (!jaAcertouEsseGolpe && malikEl &&
            quadroGolpeAtual >= LEYN_GOLPE_QUADRO_ATIVO_MIN && quadroGolpeAtual <= LEYN_GOLPE_QUADRO_ATIVO_MAX &&
            sobrepoe(hitboxGolpe(), malikEl.getBoundingClientRect())) {
          jaAcertouEsseGolpe = true;
          if (opcoes.aoAcertarMalik) opcoes.aoAcertarMalik(golpeInfo.dano);
        }
        if (decorrido >= golpeInfo.msPorQuadro * 5) terminarGolpe();
      }

      var abaixado = !atacando && !!teclas.s && noChao;

      if (!abaixado && !atacando) {
        var dx = 0;
        if (teclas.a) dx -= 1;
        if (teclas.d) dx += 1;
        deslocamentoX += dx * VELOCIDADE_MOVIMENTO * dt;

        var larguraPista = pistaLuta.getBoundingClientRect().width;
        var margemPx = 24;
        var minX = margemPx - xInicialPx;
        var maxX = (larguraPista - margemPx) - xInicialPx; // pode atravessar pro outro lado — só não sai da tela
        if (deslocamentoX < minX) deslocamentoX = minX;
        if (deslocamentoX > maxX) deslocamentoX = maxX;

        if (teclas.w && noChao) {
          velocidadeY = VELOCIDADE_PULO;
          noChao = false;
        }
      }

      if (!noChao) {
        velocidadeY -= GRAVIDADE * dt;
        alturaPulo += velocidadeY * dt;
        if (alturaPulo <= 0) {
          alturaPulo = 0;
          velocidadeY = 0;
          noChao = true;
        }
      }

      var escalaY = abaixado ? ESCALA_ABAIXADO : 1;
      leynEl.style.transform = 'translate(' + deslocamentoX + 'px,' + (-alturaPulo) + 'px) scaleY(' + escalaY + ')';
      if (!atacando) atualizarFace();

      requestAnimationFrame(quadro);
    }
    requestAnimationFrame(quadro);

    return {
      parar: function () {
        ativo = false;
        document.removeEventListener('keydown', aoKeyDown);
        document.removeEventListener('keyup', aoKeyUp);
      },
      // Bloqueio (Street Fighter): segurar a direção que AFASTA do
      // oponente. Chamada de fora (iniciarIAMalik) na hora exata em
      // que um golpe do Malik acertaria, pra decidir se vira chip
      // damage. "Afastar" é relativo a olhandoDireita, não a A/D fixos
      // — se o Leyn algum dia cruzar pro outro lado do Malik, o botão
      // que bloqueia troca sozinho junto.
      estaBloqueando: function () {
        return olhandoDireita ? !!teclas.a : !!teclas.d;
      }
    };
  }

  // ---------- Etapa 4: IA e física do Malik ----------
  // Sem teclado/touch — quem decide o movimento é a própria função,
  // reavaliando de tempos em tempos (não a cada quadro, pra não parecer
  // um robô perseguindo em linha reta). Reaproveita a MESMA técnica de
  // origem/limites em px que iniciarMovimentoLeyn usa (xInicialPx
  // medido no 1º quadro, deslocamentoX clampado pelas bordas da pista),
  // só que sem pulo/agachar — o Malik não tem sprite pra isso ainda e
  // não foi pedido. Só decide POSICIONAMENTO (avançar/recuar/parar);
  // golpes de verdade são Etapa 3, de propósito de fora daqui (ver
  // cabeçalho do arquivo).
  function iniciarIAMalik(pistaLuta, malikEl, leynEl, opcoes) {
    if (!pistaLuta || !malikEl || !leynEl) return { parar: function () {} }; // sem os dois lutadores, nada a decidir
    opcoes = opcoes || {};

    malikEl.style.transformOrigin = 'bottom center';
    var sprite = malikEl.spriteEl || null;
    var olhandoEsquerda = true; // começa virado pro Leyn, que nasce à esquerda (espelha o padrão inicial que já existia)

    var xInicialPx = null;
    var deslocamentoX = 0;
    var direcaoAtual = 0; // -1 anda pra esquerda, 1 anda pra direita, 0 parado — mantido entre decisões, não recalculado a cada quadro
    var ultimoTempo = null;
    var proximaDecisaoEm = 0;
    var ativo = true;

    // Ataque (vortice = curta distância, mira = longa — ver constantes
    // no topo do arquivo). Reavaliado dentro de decidir(), junto com a
    // decisão de posicionamento — atacar é só outra opção que a IA
    // pode escolher em vez de andar/recuar/parar.
    var atacando = false;
    var ataqueAtual = null;
    var tempoInicioAtaque = 0;
    var quadroAtaqueAtual = -1;
    var jaAcertouEsseAtaque = false;
    var proximoAtaquePermitidoEm = 0;

    // Mesma lógica de auto-encarar do Leyn (atualizarFace lá em cima),
    // só invertida: a arte do Malik olha pra DIREITA por padrão (sem
    // espelho), então precisa de scaleX(-1) pra olhar pra ESQUERDA — o
    // oposto da convenção do Leyn, que olha pra esquerda por padrão.
    // Congelada durante o ataque (ver quadro()), mesmo motivo do Leyn.
    function atualizarFace() {
      if (!sprite) return;
      var retMalik = malikEl.getBoundingClientRect();
      var retLeyn = leynEl.getBoundingClientRect();
      var deveOlharEsquerda = (retLeyn.left + retLeyn.width / 2) <= (retMalik.left + retMalik.width / 2);
      if (deveOlharEsquerda !== olhandoEsquerda) {
        olhandoEsquerda = deveOlharEsquerda;
        sprite.style.transform = olhandoEsquerda ? 'scaleX(-1)' : 'scaleX(1)';
      }
    }

    function iniciarAtaque(info, agora) {
      atacando = true;
      ataqueAtual = info;
      tempoInicioAtaque = agora;
      quadroAtaqueAtual = -1;
      jaAcertouEsseAtaque = false;
      direcaoAtual = 0;
      proximoAtaquePermitidoEm = agora + MALIK_ATAQUE_COOLDOWN_MS;
      if (malikEl.controleIdle) { malikEl.controleIdle.parar(); malikEl.controleIdle = null; }
      // malik-gesto-mira/vortice são nativamente voltados pra DIREITA,
      // igual o idle — MESMA convenção de espelho, sem inverter (ver
      // comentário de MALIK_MIRA_DIM/MALIK_VORTICE_DIM no topo)
      if (sprite) sprite.style.transform = olhandoEsquerda ? 'scaleX(-1)' : 'scaleX(1)';
    }

    function terminarAtaque() {
      atacando = false;
      ataqueAtual = null;
      if (sprite && malikEl.alturaAlvo) {
        malikEl.controleIdle = prepararTiraMalikIdle(sprite, malikEl.alturaAlvo);
        sprite.style.transform = olhandoEsquerda ? 'scaleX(-1)' : 'scaleX(1)';
      }
    }

    function hitboxAtaque() {
      var r = malikEl.getBoundingClientRect();
      return olhandoEsquerda
        ? { left: r.left - ataqueAtual.alcancePx, right: r.left, top: r.top, bottom: r.bottom }
        : { left: r.right, right: r.right + ataqueAtual.alcancePx, top: r.top, bottom: r.bottom };
    }
    function sobrepoe(a, b) {
      return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    }

    // Reavalia a decisão de movimento OU ataque (chamada só de tempos
    // em tempos, não a cada quadro): primeiro checa se vale a pena
    // atacar (Leyn ao alcance de um dos dois golpes, cooldown liberado,
    // sorteio favorável); se não, cai na lógica de posicionamento de
    // sempre — avançar/recuar/parar — igual antes da Etapa 3.
    function decidir(agora) {
      proximaDecisaoEm = agora + IA_MALIK_DECISAO_MIN_MS + Math.random() * (IA_MALIK_DECISAO_MAX_MS - IA_MALIK_DECISAO_MIN_MS);
      if (atacando) return; // já está no meio de um golpe — não interrompe

      var retMalik = malikEl.getBoundingClientRect();
      var retLeyn = leynEl.getBoundingClientRect();
      var centroMalik = retMalik.left + retMalik.width / 2;
      var centroLeyn = retLeyn.left + retLeyn.width / 2;
      var distancia = Math.abs(centroMalik - centroLeyn);
      var leynEstaEsquerda = centroLeyn < centroMalik;

      if (agora >= proximoAtaquePermitidoEm && Math.random() < MALIK_ATAQUE_CHANCE) {
        if (distancia <= MALIK_ATAQUE_VORTICE.distanciaMaxPx) { iniciarAtaque(MALIK_ATAQUE_VORTICE, agora); return; }
        if (distancia <= MALIK_ATAQUE_MIRA.distanciaMaxPx) { iniciarAtaque(MALIK_ATAQUE_MIRA, agora); return; }
      }

      if (Math.random() < IA_MALIK_CHANCE_HESITAR) { direcaoAtual = 0; return; }

      if (distancia > IA_MALIK_DISTANCIA_MAX_PX) {
        direcaoAtual = leynEstaEsquerda ? -1 : 1; // avança em direção ao Leyn
      } else if (distancia < IA_MALIK_DISTANCIA_MIN_PX) {
        direcaoAtual = leynEstaEsquerda ? 1 : -1; // recua pro lado oposto
      } else {
        direcaoAtual = 0;
      }
    }

    function quadro(agora) {
      if (!ativo) return;
      if (xInicialPx === null) {
        var retMalik = malikEl.getBoundingClientRect();
        var retPista = pistaLuta.getBoundingClientRect();
        xInicialPx = retMalik.left - retPista.left;
        proximaDecisaoEm = agora; // primeira decisão já sai no 1º quadro, não só depois do 1º intervalo
      }
      if (ultimoTempo === null) ultimoTempo = agora;
      // mesma trava de dt máximo do Leyn — sem isso, voltar de uma aba
      // em background faria a IA "teleportar" numa distância enorme
      var dt = Math.min((agora - ultimoTempo) / 1000, 0.05);
      ultimoTempo = agora;

      if (agora >= proximaDecisaoEm) decidir(agora);

      if (atacando) {
        var decorrido = agora - tempoInicioAtaque;
        var indiceQuadro = Math.min(4, Math.floor(decorrido / ataqueAtual.msPorQuadro));
        if (indiceQuadro !== quadroAtaqueAtual) {
          quadroAtaqueAtual = indiceQuadro;
          if (sprite && malikEl.alturaAlvo) mostrarQuadroAvulso(sprite, PASTA_MALIK, ataqueAtual.pasta, quadroAtaqueAtual + 1, ataqueAtual.dim, malikEl.alturaAlvo);
        }
        if (!jaAcertouEsseAtaque &&
            quadroAtaqueAtual >= MALIK_ATAQUE_QUADRO_ATIVO_MIN && quadroAtaqueAtual <= MALIK_ATAQUE_QUADRO_ATIVO_MAX &&
            sobrepoe(hitboxAtaque(), leynEl.getBoundingClientRect())) {
          jaAcertouEsseAtaque = true;
          var bloqueado = !!(opcoes.estaLeynBloqueando && opcoes.estaLeynBloqueando());
          var dano = ataqueAtual.dano * (bloqueado ? FRACAO_DANO_BLOQUEADO : 1);
          if (opcoes.aoAcertarLeyn) opcoes.aoAcertarLeyn(dano, bloqueado);
        }
        if (decorrido >= ataqueAtual.msPorQuadro * 5) terminarAtaque();
      } else {
        deslocamentoX += direcaoAtual * VELOCIDADE_MOVIMENTO_MALIK * dt;

        var larguraPista = pistaLuta.getBoundingClientRect().width;
        var margemPx = 24;
        var minX = margemPx - xInicialPx;
        var maxX = (larguraPista - margemPx) - xInicialPx;
        if (deslocamentoX < minX) deslocamentoX = minX;
        if (deslocamentoX > maxX) deslocamentoX = maxX;
      }

      malikEl.style.transform = 'translate(' + deslocamentoX + 'px,0)';
      if (!atacando) atualizarFace();

      requestAnimationFrame(quadro);
    }
    requestAnimationFrame(quadro);

    return { parar: function () { ativo = false; } };
  }

  // ---------- Etapa 6: mobile ----------
  function ehTelaTocavel() {
    return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  }
  function orientacaoRetrato() {
    return window.innerHeight > window.innerWidth;
  }

  // Overlay pedindo pra girar o aparelho. screen.orientation.lock()
  // só funciona dentro de fullscreen e nem existe no Safari iOS —
  // então esse aviso é o fallback que sempre funciona, independente
  // da tentativa de lock de verdade (essa fica em iniciarArenaLuta).
  // Chama aoGirar() assim que a tela entrar em paisagem — inclusive
  // de novo, se o jogador virar de volta pro retrato no meio da luta,
  // o aviso reaparece sozinho (checar() roda a cada resize).
  function mostrarAvisoGirar(aoGirar) {
    if (!document.getElementById('malik-girar-css')) {
      var estilo = el('style'); estilo.id = 'malik-girar-css';
      estilo.textContent = '@keyframes malikGirarTelefone{0%,100%{transform:rotate(0deg);}50%{transform:rotate(-90deg);}}';
      document.head.appendChild(estilo);
    }
    var overlay = el('div',
      'position:fixed;inset:0;z-index:700100;background:#050107;display:flex;' +
      'flex-direction:column;align-items:center;justify-content:center;gap:18px;' +
      'font-family:Georgia,"Cormorant Garamond",serif;color:#E8E0D0;text-align:center;padding:0 24px;'
    );
    overlay.appendChild(el('div', 'font-size:44px;animation:malikGirarTelefone 1.6s ease-in-out infinite;', '📱'));
    overlay.appendChild(el('div', 'font-size:15px;letter-spacing:.05em;max-width:280px;', 'Gire o aparelho pra modo paisagem pra continuar a luta'));
    document.body.appendChild(overlay);

    var jaChamou = false, ativo = true;
    function checar() {
      if (!ativo) return;
      if (!orientacaoRetrato()) {
        overlay.style.display = 'none';
        if (!jaChamou) { jaChamou = true; aoGirar(); }
      } else {
        overlay.style.display = 'flex';
      }
    }
    checar();
    window.addEventListener('resize', checar);
    window.addEventListener('orientationchange', checar);
    return {
      parar: function () {
        ativo = false;
        window.removeEventListener('resize', checar);
        window.removeEventListener('orientationchange', checar);
        if (overlay.parentNode) overlay.remove();
      }
    };
  }

  // D-pad (canto inferior esquerdo) + 6 botões de golpe + provocação
  // (canto inferior direito) — mesmo esquema do teclado (W/A/S/D e
  // J/K/L/U/I/O/Enter), só que tocáveis, como um emulador: cada botão
  // sempre visível, nada escondido atrás de gestos. Escrevem no MESMO
  // objeto `teclas` que o teclado usa — pra física, não importa se
  // quem apertou foi um dedo ou uma tecla.
  function montarControlesTouch(arena, teclas) {
    var raiz = el('div', 'position:absolute;inset:0;z-index:3;pointer-events:none;');

    function botao(css, rotulo) {
      return el('div',
        'position:absolute;display:flex;align-items:center;justify-content:center;' +
        'border-radius:50%;border:1px solid rgba(232,224,208,.5);background:rgba(20,14,24,.55);' +
        'color:#E8E0D0;font-family:Consolas,monospace;font-weight:bold;user-select:none;' +
        '-webkit-user-select:none;pointer-events:auto;touch-action:none;' + css,
        rotulo
      );
    }
    function ligar(elemento, tecla) {
      function ativar(e) { teclas[tecla] = true; elemento.style.background = 'rgba(196,163,90,.55)'; if (e) e.preventDefault(); }
      function desativar(e) { teclas[tecla] = false; elemento.style.background = 'rgba(20,14,24,.55)'; if (e) e.preventDefault(); }
      elemento.addEventListener('touchstart', ativar, { passive: false });
      elemento.addEventListener('touchend', desativar, { passive: false });
      elemento.addEventListener('touchcancel', desativar, { passive: false });
    }

    // D-pad: cruz de 4 direções, ancorada no canto inferior esquerdo
    var TAM_DPAD = 54, GAP_DPAD = 4;
    var dcima = botao('width:' + TAM_DPAD + 'px;height:' + TAM_DPAD + 'px;left:' + (24 + TAM_DPAD + GAP_DPAD) + 'px;bottom:' + (24 + TAM_DPAD + GAP_DPAD) + 'px;font-size:20px;', '▲');
    var dbaixo = botao('width:' + TAM_DPAD + 'px;height:' + TAM_DPAD + 'px;left:' + (24 + TAM_DPAD + GAP_DPAD) + 'px;bottom:24px;font-size:20px;', '▼');
    var desquerda = botao('width:' + TAM_DPAD + 'px;height:' + TAM_DPAD + 'px;left:24px;bottom:' + (24 + (TAM_DPAD + GAP_DPAD) / 2) + 'px;font-size:20px;', '◀');
    var ddireita = botao('width:' + TAM_DPAD + 'px;height:' + TAM_DPAD + 'px;left:' + (24 + (TAM_DPAD + GAP_DPAD) * 2) + 'px;bottom:' + (24 + (TAM_DPAD + GAP_DPAD) / 2) + 'px;font-size:20px;', '▶');
    ligar(dcima, 'w'); ligar(dbaixo, 's'); ligar(desquerda, 'a'); ligar(ddireita, 'd');
    [dcima, dbaixo, desquerda, ddireita].forEach(function (b) { raiz.appendChild(b); });

    // golpes: 3x2 (socos J/K/L em cima, chutes U/I/O embaixo — mesma
    // ordem fraco/médio/forte do teclado), ancorados no canto direito
    var TAM_GOLPE = 46, GAP_GOLPE = 8;
    var golpes = [
      { tecla: 'j', rotulo: 'J', col: 2, lin: 1 }, { tecla: 'k', rotulo: 'K', col: 1, lin: 1 }, { tecla: 'l', rotulo: 'L', col: 0, lin: 1 },
      { tecla: 'u', rotulo: 'U', col: 2, lin: 0 }, { tecla: 'i', rotulo: 'I', col: 1, lin: 0 }, { tecla: 'o', rotulo: 'O', col: 0, lin: 0 }
    ];
    golpes.forEach(function (g) {
      var direita = 24 + g.col * (TAM_GOLPE + GAP_GOLPE);
      var baixo = 24 + g.lin * (TAM_GOLPE + GAP_GOLPE);
      var b = botao('width:' + TAM_GOLPE + 'px;height:' + TAM_GOLPE + 'px;right:' + direita + 'px;bottom:' + baixo + 'px;font-size:15px;', g.rotulo);
      ligar(b, g.tecla);
      raiz.appendChild(b);
    });
    var provocacao = botao(
      'width:34px;height:34px;right:' + (24 + 3 * (TAM_GOLPE + GAP_GOLPE) + 6) + 'px;bottom:' + (24 + (TAM_GOLPE + GAP_GOLPE) / 2) + 'px;font-size:9px;opacity:.75;',
      '↵'
    );
    ligar(provocacao, 'enter');
    raiz.appendChild(provocacao);

    arena.appendChild(raiz);
    return { remover: function () { raiz.remove(); } };
  }


  // opcoes.retratoLeynSrc / opcoes.retratoMalikSrc: imagem inicial de
  // cada retrato no canto.
  // opcoes.elementosParaApagar: lista de elementos da cena antiga
  // (retrato central do Malik, nome, hpLinha, a caixa Undertale) que
  // devem sumir (fade) enquanto a arena nova aparece por cima — no
  // teste isolado essa lista normalmente vem vazia.
  // opcoes.aoRevelar(contexto): chamado quando a arena já está pronta
  // e visível, com o Leyn já se movendo — contexto.leynSprite é o
  // elemento que a próxima etapa (golpes/hitboxes) vai usar.
  // ---------- API principal ----------
  // Gate de orientação: em telas tocáveis e em retrato, mostra o
  // aviso pra girar e só monta a arena de verdade depois — assim
  // malik-batalha.js (e o gancho de teste) chamam iniciar() do mesmo
  // jeito sempre, sem precisar saber nada sobre mobile.
  function iniciarArenaLuta(opcoes) {
    opcoes = opcoes || {};
    if (ehTelaTocavel() && orientacaoRetrato()) {
      var cancelado = false;
      var avisoGirar = mostrarAvisoGirar(function () {
        if (cancelado) return;
        controladorReal = iniciarArenaLutaDeVerdade(opcoes);
      });
      var controladorReal = null;
      // controlador provisório — se remover() for chamado antes do
      // jogador girar o aparelho (ex.: teste cancelado no meio),
      // cancela o início em vez de tentar remover uma arena que nunca
      // chegou a existir
      return {
        pararMovimento: function () { if (controladorReal) controladorReal.pararMovimento(); },
        remover: function () {
          cancelado = true;
          avisoGirar.parar();
          if (controladorReal) controladorReal.remover();
        }
      };
    }
    return iniciarArenaLutaDeVerdade(opcoes);
  }

  function iniciarArenaLutaDeVerdade(opcoes) {
    opcoes = opcoes || {};
    var duracaoTransicao = reduzMovimento() ? 200 : 900;
    // best effort — funciona só dentro de fullscreen na maioria dos
    // browsers, e nem existe no Safari iOS; o aviso pra girar (acima)
    // é o que garante a experiência landscape de verdade, isso aqui é
    // só um extra quando o browser permite
    try {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(function () {});
      }
    } catch (e) {}

    (opcoes.elementosParaApagar || []).forEach(function (elemento) {
      if (!elemento) return;
      elemento.style.transition = 'opacity ' + duracaoTransicao + 'ms ease';
      elemento.style.opacity = '0';
    });

    var arena = el('div',
      'position:fixed;inset:0;z-index:700050;background:#000;overflow:hidden;' +
      'font-family:Georgia,"Cormorant Garamond",serif;color:#E8E0D0;user-select:none;' +
      'opacity:0;transition:opacity ' + duracaoTransicao + 'ms ease;'
    );

    var fundo = el('div',
      'position:absolute;inset:0;background-image:url(\'' + PASTA_ARENA + 'cenario-eclipse.jpg\');' +
      'background-size:cover;background-position:center 30%;filter:brightness(.75);'
    );
    // sem onerror aqui de propósito: é uma div com background-image via
    // CSS, não um <img> — se o arquivo faltar, o fundo #000 do arena já
    // cobre a ausência sem precisar de checagem. Começa no PNG/JPG
    // estático de propósito (ver tocarAberturaArena logo abaixo) — o
    // cathedral-wind.gif só entra depois do gesto do Malik + tremor.
    var vinheta = el('div', 'position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 45%,rgba(0,0,0,.55) 100%);');
    // faixa mais escura no chão — só um guia visual (a física de
    // movimento usa o bottom:8% fixo do próprio leynEl como nível do
    // chão, não a altura desta faixa)
    var chao = el('div', 'position:absolute;left:0;right:0;bottom:0;height:18%;background:linear-gradient(to bottom,transparent,rgba(0,0,0,.65));');

    arena.appendChild(fundo);
    arena.appendChild(vinheta);
    arena.appendChild(chao);

    var painelLeyn = montarPainelLutador('esquerda', 'LEYN', '#5CDB6A');
    var painelMalik = montarPainelLutador('direita', 'M.A.L.I.K.', VERMELHO);
    if (opcoes.retratoLeynSrc) painelLeyn.retratoImg.src = opcoes.retratoLeynSrc;
    if (opcoes.retratoMalikSrc) painelMalik.retratoImg.src = opcoes.retratoMalikSrc;
    painelLeyn.marcarRounds(0);
    painelMalik.marcarRounds(0);

    var timer = montarTimer();

    // onde a próxima etapa (movimento/golpes) vai posicionar os
    // lutadores de verdade — vazio por enquanto, de propósito
    var pistaLuta = el('div', 'position:absolute;inset:0;z-index:1;');

    arena.appendChild(pistaLuta);
    arena.appendChild(painelLeyn.painel);
    arena.appendChild(painelMalik.painel);
    arena.appendChild(timer);

    document.body.appendChild(arena);
    requestAnimationFrame(function () { arena.style.opacity = '1'; });

    // Ainda não existe sistema de rounds/vitória de verdade (isso é
    // Etapa 5) — sem um jeito de a luta "terminar", quem chamou
    // iniciar() nunca teria como saber quando retomar o que vem
    // depois (malikExpulso/restauracaoCompleta). Em modo de teste,
    // a tecla V aciona opcoes.aoTerminar() manualmente, só pra
    // dar pra testar a integração ponta a ponta enquanto a Etapa 5
    // não chega. Fora de modo de teste isso não existe — não é uma
    // forma real de vencer a luta.
    var teclaVencerHandler = null;
    if (modoTeste && typeof opcoes.aoTerminar === 'function') {
      var avisoTeste = el('div',
        'position:absolute;left:50%;top:52px;transform:translateX(-50%);z-index:2;' +
        'font-family:Consolas,monospace;font-size:11px;letter-spacing:.05em;color:#E8C97A;' +
        'background:rgba(7,8,13,.75);border:1px solid rgba(196,163,90,.4);border-radius:5px;' +
        'padding:.35rem .7rem;pointer-events:none;',
        'V — vencer a luta (teste, sem isso ainda não existe round de verdade)'
      );
      arena.appendChild(avisoTeste);
      teclaVencerHandler = function (e) {
        // pararTodoMovimento() primeiro: sem isso, o requestAnimationFrame
        // do Leyn/Malik continuaria escrevendo em cima de style.transform
        // a cada quadro e desfaria a animação de "expulso" que
        // malik-batalha.js aplica logo depois, via aoTerminar()
        if ((e.key || '').toLowerCase() === 'v') { pararTodoMovimento(); opcoes.aoTerminar(); }
      };
      document.addEventListener('keydown', teclaVencerHandler);
    }

    var timers = [];
    function daquiA(ms, fn) { timers.push(setTimeout(fn, ms)); }

    daquiA(duracaoTransicao + 150, function () {
      painelLeyn.revelar();
      painelMalik.revelar();
    });
    daquiA(duracaoTransicao + 500, function () {
      painelLeyn.definirVida(1);
      painelMalik.definirVida(1);
    });
    daquiA(duracaoTransicao + 700, function () {
      timer.style.opacity = '1';
    });
    daquiA(duracaoTransicao + 900, function () {
      mostrarAvisoRound(arena, 'ROUND 1');
    });
    var leynSprite = null;
    var malikSprite = null;
    var controleMovimento = null;
    var controleMovimentoMalik = null;
    var controleTouch = null;
    var teclasCompartilhadas = {}; // teclado e D-pad/botões touch escrevem no mesmo objeto — a física não sabe (nem precisa saber) qual dos dois foi usado

    // HP numérico (0-1) — painelX.definirVida() só PINTA a barra, quem
    // guarda o valor atual é este arquivo mesmo. Ainda não existe
    // Etapa 5 (rounds/vitória de verdade) — zerar o HP aqui não termina
    // a luta sozinho por enquanto, só mostra a barra vazia; encerrar de
    // verdade continua sendo o atalho de teste "V" até a Etapa 5 chegar.
    var hpLeyn = 1, hpMalik = 1;

    // Reação visual de acerto: um clarão rápido por cima da sombra que
    // o sprite já tem (não pode simplesmente SOBRESCREVER o filter,
    // senão perde o drop-shadow) — guarda o filter original uma vez e
    // volta pra ele depois do flash.
    function piscarAcerto(wrapperEl) {
      var alvo = wrapperEl && wrapperEl.spriteEl;
      if (!alvo) return;
      var filtroOriginal = alvo.style.filter;
      alvo.style.transition = 'filter .08s ease';
      alvo.style.filter = filtroOriginal + ' brightness(2.4) saturate(2.5)';
      setTimeout(function () { alvo.style.filter = filtroOriginal; }, 110);
    }

    function aplicarDanoEmMalik(fracao) {
      hpMalik = Math.max(0, Math.min(1, hpMalik - fracao));
      painelMalik.definirVida(hpMalik);
      piscarAcerto(malikSprite);
    }
    function aplicarDanoEmLeyn(fracao, bloqueado) {
      hpLeyn = Math.max(0, Math.min(1, hpLeyn - fracao));
      painelLeyn.definirVida(hpLeyn);
      if (!bloqueado) piscarAcerto(leynSprite); // bloqueado já leva bem menos dano (FRACAO_DANO_BLOQUEADO) — sem flash pra diferenciar de um acerto cheio
    }

    // Um só lugar pra parar as duas físicas (Leyn + Malik) — usado pelo
    // atalho de teste "V", por pararMovimento() e por remover(), pra
    // não esquecer nenhum dos dois em algum desses três pontos.
    function pararTodoMovimento() {
      if (controleMovimento) controleMovimento.parar();
      if (controleMovimentoMalik) controleMovimentoMalik.parar();
    }

    // Cenário eclipse parado -> gesto do Malik (Assets/malik/malik-
    // -gesto-erguer-01..05.png) -> tremor -> cathedral-wind.gif —
    // roda em paralelo com a revelação do HUD acima (começa junto com
    // os painéis, em +150). Só depois que ISSO termina de vez é que os
    // lutadores ganham física/controle; era um daquiA fixo de +1200,
    // virou "espera a abertura acabar" pra não descolar se o tempo do
    // gesto/tremor for recalibrado depois.
    tocarAberturaArena(fundo, arena, daquiA, duracaoTransicao + 150, function () {
      leynSprite = montarLeynNaPista(pistaLuta);
      malikSprite = montarMalikNaPista(pistaLuta);
      controleMovimento = iniciarMovimentoLeyn(pistaLuta, leynSprite, malikSprite, teclasCompartilhadas, {
        aoAcertarMalik: aplicarDanoEmMalik
      });
      controleMovimentoMalik = iniciarIAMalik(pistaLuta, malikSprite, leynSprite, {
        aoAcertarLeyn: aplicarDanoEmLeyn,
        // lido no momento do acerto, não agora — controleMovimento já
        // vai estar atribuído bem antes do Malik conseguir acertar o
        // 1º golpe (o cooldown inicial sozinho já dá esse tempo)
        estaLeynBloqueando: function () { return !!(controleMovimento && controleMovimento.estaBloqueando()); }
      });
      if (ehTelaTocavel()) controleTouch = montarControlesTouch(arena, teclasCompartilhadas);
    });
    daquiA(duracaoTransicao + 2600, function () {
      if (opcoes.aoRevelar) {
        opcoes.aoRevelar({
          arena: arena,
          pistaLuta: pistaLuta,
          leyn: painelLeyn,
          malik: painelMalik,
          leynSprite: leynSprite, // wrapper de corpo inteiro na pista — já se move (Etapa 2); golpes entram por cima disso
          malikSprite: malikSprite, // wrapper de corpo inteiro na pista — já anda sozinho por IA própria (Etapa 4); golpes/hitboxes entram por cima disso (Etapa 3)
          timer: timer,
          mostrarAvisoRound: function (texto, duracaoMs) { mostrarAvisoRound(arena, texto, duracaoMs); },
          pararMovimento: pararTodoMovimento
        });
      }
    });

    return {
      arena: arena, leyn: painelLeyn, malik: painelMalik, timer: timer, pistaLuta: pistaLuta,
      pararMovimento: pararTodoMovimento,
      remover: function () {
        timers.forEach(function (id) { clearTimeout(id); });
        pararTodoMovimento();
        if (controleTouch) controleTouch.remover();
        if (teclaVencerHandler) document.removeEventListener('keydown', teclaVencerHandler);
        arena.remove();
      }
    };
  }

  window.NexusMalikArenaLuta = { iniciar: iniciarArenaLuta };

  // ---------- introdução "vs" ANTIGA (gif simples) ----------
  // Superada por mostrarVsNovo() logo abaixo (leyn-contra-malik.html,
  // WebGL) — mantida só porque ainda funciona e pode servir de
  // referência/fallback; o fluxo real e o gancho de teste abaixo já
  // não chamam mais esta.
  // Assets/arena/vs-intro.gif: no arquivo original o Malik aparece à
  // ESQUERDA e o Leyn à DIREITA. Espelhando o gif inteiro
  // (scaleX(-1)), Malik vai pra direita e Leyn pra esquerda — batendo
  // com o layout confirmado da arena (Leyn=esquerda, Malik=direita).
  function mostrarIntroducaoVS(aoTerminar, duracaoMs) {
    var overlay = el('div',
      'position:fixed;inset:0;z-index:700040;background:#000;' +
      'display:flex;align-items:center;justify-content:center;' +
      'opacity:0;transition:opacity .6s ease;'
    );
    var img = el('img', 'max-width:100%;max-height:100%;transform:scaleX(-1);');
    img.src = PASTA_ARENA + 'vs-intro.gif';
    overlay.appendChild(img);
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.style.opacity = '1'; });
    setTimeout(function () {
      overlay.style.opacity = '0';
      setTimeout(function () {
        overlay.remove();
        if (aoTerminar) aoTerminar();
      }, 600);
    }, duracaoMs || 3200);
    return overlay;
  }
  window.NexusMalikArenaLuta.mostrarIntroducaoVS = mostrarIntroducaoVS;

  // ---------- introdução "vs" NOVA (leyn-contra-malik.html, WebGL) ----------
  // Roda no fim da Etapa 1 (confronto por turnos), antes da arena de
  // luta 2D abrir — é o pedido de "implementar essa tela de vs ao fim
  // da Etapa 1". leyn-contra-malik.html é um arquivo AUTOCONTIDO
  // (retratos do Leyn/Malik embutidos em base64, shader WebGL próprio)
  // que já nasceu pensado pra rodar dentro de um iframe: ele mesmo
  // escuta postMessage {type:'versus:start'} pra começar (por isso o
  // `?autostart=0` na src — sem isso ele começaria sozinho assim que
  // carregasse, antes de eu poder mostrar o overlay com fade) e avisa
  // {type:'versus:end'} via postMessage quando a sequência termina (ele
  // despacha isso tanto se o viajante deixar rodar até o fim quanto se
  // clicar/apertar Enter pra pular — os dois casos already viram o
  // mesmo evento do lado de dentro do arquivo). Fica na RAIZ do site,
  // do lado de index.html/nexus.html/malik-luta-leyn.js (não em
  // Assets/ — é uma página inteira, não um asset de imagem/som).
  function mostrarVsNovo(aoTerminar) {
    var overlay = el('div', 'position:fixed;inset:0;z-index:700045;background:#050308;opacity:0;transition:opacity .5s ease;');
    var frame = el('iframe', 'position:absolute;inset:0;width:100%;height:100%;border:0;display:block;');
    frame.setAttribute('title', 'Leyn contra M.A.L.I.K.');
    frame.setAttribute('allow', 'autoplay');
    frame.src = 'leyn-contra-malik.html?autostart=0';

    var terminou = false;
    var tempoLimite = null;
    function aoReceberMensagem(e) {
      if (!e.data || e.data.type !== 'versus:end' || terminou) return;
      terminou = true;
      clearTimeout(tempoLimite);
      window.removeEventListener('message', aoReceberMensagem);
      overlay.style.opacity = '0';
      setTimeout(function () {
        overlay.remove();
        if (aoTerminar) aoTerminar();
      }, 500);
    }
    window.addEventListener('message', aoReceberMensagem);

    frame.addEventListener('load', function () {
      requestAnimationFrame(function () { overlay.style.opacity = '1'; });
      // o listener de 'versus:start' do lado de dentro é registrado de
      // forma síncrona, bem no topo do script dele — não corre risco
      // de eu mandar a mensagem antes de alguém estar ouvindo
      try { frame.contentWindow.postMessage({ type: 'versus:start' }, '*'); } catch (e) {}
    });

    // Rede de segurança: se por algum motivo o iframe nunca mandar
    // versus:end (arquivo faltando, erro de carregamento, JS travado
    // lá dentro), a cutscene não pode travar pra sempre — segue em
    // frente sozinho depois de um tempo bem folgado (a sequência real
    // dura uns 5.3s: ver T_END em leyn-contra-malik.html).
    tempoLimite = setTimeout(function () { aoReceberMensagem({ data: { type: 'versus:end' } }); }, 9000);

    overlay.appendChild(frame);
    document.body.appendChild(overlay);
    return overlay;
  }
  window.NexusMalikArenaLuta.mostrarVsNovo = mostrarVsNovo;

  // ---------- gancho de teste isolado ----------
  // ?malikTeste=1&arenaLuta=1 — mostra só esta etapa por cima da
  // página atual, sem precisar jogar a luta inteira até aqui. Usa os
  // retratos que já existem hoje (leyn-retrato.png, malik-pose-
  // -parado-1.png) só pra visualizar a transição. Acrescentar
  // &introVs=1 mostra a tela de "vs" nova (mostrarVsNovo) antes da
  // arena — é o mesmo gancho que já existia, só apontado pra versão
  // nova em vez da antiga (mostrarIntroducaoVS).
  var testarArenaIsolada = modoTeste && /[?&]arenaLuta=1\b/.test(location.search);
  var testarIntroVs = testarArenaIsolada && /[?&]introVs=1\b/.test(location.search);
  if (testarArenaIsolada) {
    (function aguardarBody() {
      if (!document.body) { document.addEventListener('DOMContentLoaded', aguardarBody); return; }
      function abrirArena() {
        iniciarArenaLuta({
          retratoLeynSrc: PASTA_LEYN + 'leyn-retrato.png',
          retratoMalikSrc: PASTA_MALIK + 'malik-vn-retrato.png' // mesmo retrato do fluxo real (transicaoParaArenaLuta, malik-batalha.js): recorte quadrado cabeça+ombros da pose VN de espera
        });
        // só um lembrete visual dos controles pra testar — não faz
        // parte da API, existe só junto com esse gancho de teste. Em
        // telas tocáveis não faz sentido (o D-pad/botões já são o
        // lembrete visual, e o texto ficaria em cima deles)
        if (!ehTelaTocavel()) {
          var ajuda = el('div',
            'position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:700060;' +
            'font-family:Consolas,monospace;font-size:12px;letter-spacing:.05em;color:#E8E0D0;' +
            'background:rgba(7,8,13,.75);border:1px solid rgba(196,163,90,.4);border-radius:5px;' +
            'padding:.4rem .8rem;pointer-events:none;',
            'W pula · A/D anda · S abaixa (golpes ainda não implementados)'
          );
          document.body.appendChild(ajuda);
        }
      }
      if (testarIntroVs) mostrarVsNovo(abrirArena);
      else abrirArena();
    })();
  }
})();
