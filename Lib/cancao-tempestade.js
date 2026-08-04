/* cancao-tempestade.js — progresso compartilhado da Canção da Tempestade
   (Song of Storms), fragmentada em 3 páginas: OOT, MM e Recordações.

   Cada uma dessas páginas ensina uma parte da sequência de 6 notas que
   desperta a broca em nexus.html (Song of Storms tocada no teclado:
   A, Baixo, Cima, A, Baixo, Cima). Nenhuma página sozinha revela a
   sequência inteira — só juntando as 3 é que dá pra montar ela.

   Mesma ideia de persistência das Esferas do Dragão (localStorage,
   sistema separado, sem ligação entre os dois — encontrar uma esfera
   não tem nada a ver com aprender um fragmento da canção).

   Progresso salvo por página (true = já ensinou o fragmento dela),
   e um painel flutuante (nota prateada → azul quando as 3 estiverem
   completas) fica de guarda no canto esquerdo inferior, espelhando
   o canto direito onde mora a Esfera do Dragão.

   Cada página só precisa:
   - incluir esse script,
   - chamar NexusCancao.estaCompleta('oot'|'mm'|'recordacoes') pra saber
     se já deve pular o fantasma (já foi encontrado antes),
   - chamar NexusCancao.marcarEncontrada(id) quando o jogador terminar
     a sequência dela.
*/
(function () {
  var CHAVE = 'nexus_cancao_tempestade_v1';
  var PAGINAS = ['oot', 'mm', 'recordacoes'];

  function ler() {
    try {
      var raw = localStorage.getItem(CHAVE);
      if (!raw) return {};
      var obj = JSON.parse(raw);
      return (obj && typeof obj === 'object') ? obj : {};
    } catch (e) {
      console.warn('[cancao-tempestade] falha ao ler localStorage:', e);
      return {};
    }
  }

  function salvar(estado) {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(estado));
      // confere se realmente gravou — em alguns navegadores, sob certas
      // condições (file://, modo privado), setItem não lança erro mas
      // também não persiste de verdade.
      if (!localStorage.getItem(CHAVE)) {
        console.warn('[cancao-tempestade] setItem não lançou erro, mas a leitura logo em seguida veio vazia — este navegador pode não estar persistindo dados aqui.');
      }
    } catch (e) {
      console.warn('[cancao-tempestade] falha ao salvar localStorage:', e);
    }
  }

  function estaCompleta(pageId) {
    return !!ler()[pageId];
  }

  function progresso() {
    var estado = ler(), n = 0;
    PAGINAS.forEach(function (id) { if (estado[id]) n++; });
    return n;
  }

  function completaTudo() {
    return progresso() >= PAGINAS.length;
  }

  function proximaPendente() {
    var estado = ler();
    for (var i = 0; i < PAGINAS.length; i++) {
      if (!estado[PAGINAS[i]]) return PAGINAS[i];
    }
    return null; // nada pendente — já está tudo encontrado
  }

  // Estado à parte dos 3 fragmentos: se o viajante já ouviu a canção
  // completa tocar até o fim pelo menos uma vez (painel dourado do
  // nexus.html) — guardado na mesma chave, só que fora da lista PAGINAS,
  // então não interfere em progresso()/completaTudo().
  function cancaoJaOuvida() {
    return !!ler().ouvida;
  }

  function marcarCancaoOuvida() {
    var estado = ler();
    if (estado.ouvida) return;
    estado.ouvida = true;
    salvar(estado);
  }

  // Se o painel dourado (nexus.html) já foi aberto ao menos uma vez — usado
  // pra saber se um "toque real" da sequência (teclado/toque, fora do
  // painel) aconteceu ANTES do viajante ter conversado com os irmãos.
  function jaConversouComIrmaos() {
    return !!ler().conversou;
  }
  function marcarConversouComIrmaos() {
    var estado = ler();
    if (estado.conversou) return;
    estado.conversou = true;
    salvar(estado);
  }

  // Se os irmãos já ficaram impressionados — o viajante tocou a sequência
  // de verdade (o gatilho secreto do nexus.html) antes de ter conversado
  // com eles pela primeira vez. Uma vez marcado, o painel para de oferecer
  // a escolha de tocar a canção — não faz mais sentido perguntar.
  function irmaosJaImpressionados() {
    return !!ler().impressionados;
  }
  function marcarIrmaosImpressionados() {
    var estado = ler();
    if (estado.impressionados) return;
    estado.impressionados = true;
    salvar(estado);
  }

  function marcarEncontrada(pageId) {
    if (PAGINAS.indexOf(pageId) === -1) return; // id desconhecido — ignora
    var estado = ler();
    if (estado[pageId]) return; // já estava marcada, não refaz o painel à toa
    estado[pageId] = true;
    salvar(estado);
    criarPainel(); // garante que o painel existe — essa pode ter sido a primeira página encontrada
    atualizarPainel();
  }

  function atualizarPainel() {
    var wrap = document.getElementById('cancao-painel');
    if (!wrap) return;
    var completa = completaTudo();
    wrap.classList.toggle('completa', completa);

    var estaNaPaginaPendente = !completa && document.body &&
      document.body.getAttribute('data-page') === proximaPendente();
    wrap.classList.toggle('piscando', estaNaPaginaPendente);

    wrap.title = completa
      ? 'A canção da tempestade está inteira.'
      : 'Fragmentos da canção da tempestade: ' + progresso() + '/3';
  }

  function criarPainel() {
    if (progresso() === 0) return; // nada encontrado ainda — o painel nem deve existir
    if (document.getElementById('cancao-painel')) return;
    var wrap = document.createElement('div');
    wrap.id = 'cancao-painel';
    wrap.className = 'cancao-painel';
    wrap.innerHTML =
      '<svg viewBox="0 0 24 24" class="cancao-nota">' +
        '<path d="M9 18V5l12-2v13"/>' +
        '<circle cx="6" cy="18" r="3"/>' +
        '<circle cx="18" cy="16" r="3"/>' +
      '</svg>';
    document.body.appendChild(wrap);
    atualizarPainel();
    avisarPainelPronto();
  }

  var painelProntoCallbacks = [];

  function avisarPainelPronto() {
    var wrap = document.getElementById('cancao-painel');
    if (!wrap) return;
    while (painelProntoCallbacks.length) {
      var cb = painelProntoCallbacks.shift();
      try { cb(wrap); } catch (e) { console.warn('[cancao-tempestade] erro num callback de aoPainelPronto:', e); }
    }
  }

  // Forma robusta de uma página pegar o #cancao-painel pra anexar clique,
  // reposicionamento etc. — não depende de acertar a ordem/timing exata
  // entre o <script src> deste arquivo e o <script> da própria página
  // (foi exatamente essa suposição, quebrada pelo motivo explicado mais
  // abaixo, que fazia o painel existir na tela mas sem nenhum evento
  // funcionando nele). Se o painel já existe, chama na hora; senão,
  // guarda pra chamar assim que criarPainel() rodar.
  function aoPainelPronto(callback) {
    if (typeof callback !== 'function') return;
    var existente = document.getElementById('cancao-painel');
    if (existente) { callback(existente); return; }
    painelProntoCallbacks.push(callback);
  }

  function debug() {
    var raw = null;
    try { raw = localStorage.getItem(CHAVE); } catch (e) { raw = '(erro ao ler: ' + e + ')'; }
    console.log('[cancao-tempestade] chave:', CHAVE);
    console.log('[cancao-tempestade] valor bruto salvo:', raw);
    console.log('[cancao-tempestade] estado interpretado:', ler());
    return ler();
  }

  window.NexusCancao = {
    estaCompleta: estaCompleta,
    marcarEncontrada: marcarEncontrada,
    progresso: progresso,
    completaTudo: completaTudo,
    proximaPendente: proximaPendente,
    cancaoJaOuvida: cancaoJaOuvida,
    marcarCancaoOuvida: marcarCancaoOuvida,
    jaConversouComIrmaos: jaConversouComIrmaos,
    marcarConversouComIrmaos: marcarConversouComIrmaos,
    irmaosJaImpressionados: irmaosJaImpressionados,
    marcarIrmaosImpressionados: marcarIrmaosImpressionados,
    aoPainelPronto: aoPainelPronto,
    debug: debug
  };

  // NÃO usar `document.readyState === 'loading'` aqui: esse script sempre
  // é incluído perto do fim do <body>, com mais coisa depois dele (pelo
  // menos o <script> de cada página que consome o NexusCancao) — então o
  // parser ainda não terminou e o readyState ainda marca 'loading' nesse
  // exato instante, mesmo a poucas linhas de </body>. Isso jogava
  // criarPainel() pro DOMContentLoaded, que só dispara DEPOIS do script
  // de cada página já ter rodado (e desistido por achar #cancao-painel
  // inexistente) — painel aparecia normalmente, mas sem clique nenhum
  // funcionando nele (MM.html) e sem o reposicionamento no nexus.html
  // rodar. document.body já existe nesse ponto (é o precondition real
  // pro appendChild abaixo), então é o que importa checar.
  //
  // Isso já resolve o timing pra qualquer página nova escrita do jeito
  // certo — mas pra não depender de novo de acertar essa ordem, quem
  // consome o painel deveria preferir NexusCancao.aoPainelPronto(cb) em
  // vez de document.getElementById('cancao-painel') direto.
  if (document.body) {
    criarPainel();
  } else {
    document.addEventListener('DOMContentLoaded', criarPainel);
  }
})();
