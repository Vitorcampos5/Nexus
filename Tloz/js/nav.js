/* nav.js — monta a navbar do TLOZ a partir de uma única fonte.
   Pra adicionar, remover ou renomear uma entrada do Diário, edite só a
   lista DIARIO abaixo — nenhuma página HTML precisa ser tocada.

   Cada página precisa de:
   - <body data-page="ss">           (ou mc / oot / mm / tp / home / cronologia)
   - <header id="site-header"></header>   logo no início do <body>
   - <script src="js/nav.js"></script>    logo depois do header

   Preload de música entre páginas:
   - Cada entrada do DIARIO ganhou um campo "music" com a trilha daquela página.
   - Assim que qualquer página carrega, ela pede (rel="prefetch") a música de
     TODAS as outras páginas — a sua própria já carrega pelo <audio preload="auto">.
   - Resultado: quando o usuário navega pra outra página, a faixa já está no
     cache do navegador e toca sem demora.
*/
(function () {
  var DIARIO = [
    { id: 'ss',   num: '1º', file: 'SS.html',   label: 'Skyward Sword',      music: 'music/Ballad Of The Goddess as sing by Zelda Extended.mp3' },
    { id: 'mc',   num: '2º', file: 'MC.html',   label: 'The Minish Cap',     music: 'music/Minish Cap Cloud Tops Orchestral Remix.mp3' },
    { id: 'oot',  num: '3º', file: 'OOT.html',  label: 'Ocarina of Time',    music: 'music/Lost Woods (Legend of Zelda Ocarina of Time) OST Remastered.mp3' },
    { id: 'mm',   num: '4º', file: 'MM.html',   label: "Majora's Mask",      music: 'music/Healing Four Giants.mp3' },
    { id: 'tp',   num: '5º', file: 'TP.html',   label: 'Twilight Princess',  music: 'music/Midnas Lament - The Legend of Zelda Twilight Princess (String Quartet _ Piano Cover).mp3' },
    { id: 'botw', num: '6º', file: 'BOTW.html', label: 'Breath of the Wild', music: 'music/Breath of the Wild Main Theme.mp3' }
  ];

  var MUSICA_HOME = "music/Fi's Theme The Legend of Zelda Skyward Sword.mp3";

  var page = document.body.getAttribute('data-page') || '';

  var dropdownItems = DIARIO.map(function (g) {
    if (!g.file) {
      return '<a class="dropdown-item text-muted">' + g.num + ' — ' + g.label + '</a>';
    }
    return '<a class="dropdown-item" href="' + g.file + '">' + g.num + ' — ' + g.label + '</a>';
  }).join('\n              ');

  var html =
    '<nav class="navbar navbar-expand-lg fixed-top zelda-nav">' +
      '<a class="nexus-return" href="../nexus.html">◆ Nexus</a>' +
      '<a class="navbar-brand ml-3" href="Tloz.html">TLOZ</a>' +
      '<button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav" ' +
        'aria-controls="navbarNav" aria-expanded="false" aria-label="Alterna navegação">' +
        '<span class="navbar-toggler-icon"></span>' +
      '</button>' +
      '<div class="collapse navbar-collapse" id="navbarNav">' +
        '<ul class="navbar-nav ml-auto">' +
          '<li class="nav-item' + (page === 'home' ? ' active' : '') + '">' +
            '<a class="nav-link" href="Tloz.html">Home</a>' +
          '</li>' +
          '<li class="nav-item' + (page === 'cronologia' ? ' active' : '') + '">' +
            '<a class="nav-link" href="cronologia.html">Cronologia</a>' +
          '</li>' +
          '<li class="nav-item dropdown">' +
            '<a class="nav-link dropdown-toggle" href="#" id="navDrop" role="button" ' +
              'data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">' +
              'Diário' +
            '</a>' +
            '<div class="dropdown-menu dropdown-menu-right" aria-labelledby="navDrop">' +
              dropdownItems +
            '</div>' +
          '</li>' +
        '</ul>' +
      '</div>' +
    '</nav>';

  var header = document.getElementById('site-header');
  if (header) header.innerHTML = html;

  // ── Preload das músicas das outras páginas ──
  // Só dispara depois do "load" da própria página — assim o prefetch não
  // entra em disputa (conexão/servidor) com o que a página atual ainda
  // está carregando, incluindo a música dela.
  window.addEventListener('load', function () {
    var todasMusicas = DIARIO.map(function (g) { return { id: g.id, src: g.music }; });
    todasMusicas.push({ id: 'home', src: MUSICA_HOME });

    todasMusicas.forEach(function (m) {
      if (m.id === page || !m.src) return; // pula a página atual (já carregou sozinha) e entradas sem música
      var link = document.createElement('link');
      link.rel = 'prefetch';
      link.setAttribute('as', 'audio');
      link.href = m.src;
      document.head.appendChild(link);
    });
  });
})();
