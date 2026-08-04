/* ═══════════════════════════════════════════════════════════
   ESFERAS DO DRAGÃO — módulo compartilhado
   Incluído por TODAS as 9 páginas de projeto (TLOZ, Valtheris,
   Diário, Livro, Covers, Origem, Icarus, M.A.L, Recordações) e pelo Nexus.

   Guarda em localStorage (mesmo domínio → compartilhado entre
   todas as páginas, já que cada uma é um HTML separado, não uma
   SPA) qual página recebeu qual esfera (1 a 7 estrelas) e quais
   já foram encontradas. O sorteio acontece uma vez só, na
   primeira vez que qualquer uma das páginas rodar esse módulo,
   e fica fixo depois disso.

   Uso em cada página de projeto (ajuste o caminho de acordo com
   onde esse arquivo está — atualmente na pasta Lib):
     <script src="../Lib/dragonball.js"></script>
     ...
     var n = NexusEsferas.esferaDestaPagina('zelda');
     if (n !== null) {
       // criar a esfera 3D com n estrelas nesta página;
       // ao usuário clicar nela:
       NexusEsferas.encontrar('zelda');
       // sumir com a esfera da cena
     }

   No Nexus, pra desenhar o painel:
     var achadas = NexusEsferas.getEncontradas(); // ex.: [3, 7]

   Pra o painel do Nexus atualizar sozinho quando uma esfera é
   achada em outra aba/iframe, sem precisar recarregar a página:
     NexusEsferas.aoEncontrar(function (info) {
       // info = { paginaId: 'zelda', estrelas: 3 }
       // redesenhar o painel aqui
     });

   ── SOBRE localStorage E file:// (leia se algo parecer "sempre
      quebrado", não só ocasionalmente) ──
   Se você abre os arquivos direto (file://, duplo-clique), vários
   navegadores tratam cada página local como uma origem separada e
   NÃO compartilham localStorage entre elas — mesmo estando na
   mesma pasta. Isso não dá pra contornar via código: cada página
   sorteia por conta própria (daí a mesma esfera "aparecendo" em
   páginas diferentes) e o Nexus nunca vê o que foi encontrado nas
   outras (daí o contador sempre zerado). A saída é servir o site
   por http(s) — um servidor local (ex.: "python3 -m http.server"
   na pasta do Nexus) ou o site já publicado — nesse caso o
   localStorage compartilha normalmente entre as páginas.

   Este módulo avisa no console quando detecta que está rodando em
   file://, e também quando localStorage está bloqueado/indisponível
   por outro motivo (navegação privada, cookies desligados etc.).

   ── NOTA SOBRE A CORREÇÃO (leia se for mexer neste arquivo) ──
   Havia uma condição de corrida: getSorteio() lia e, se preciso,
   sorteava e gravava no localStorage TODA VEZ que era chamado
   (tanto em esferaDestaPagina quanto em encontrar). Se duas
   páginas/abas carregassem quase ao mesmo tempo (já servindo por
   http, onde localStorage é de fato compartilhado), cada uma podia
   ler "nada salvo ainda" e sortear seu PRÓPRIO mapa independente —
   cada mapa podia atribuir a mesma quantidade de estrelas a
   páginas diferentes, e o localStorage final ficava com o mapa de
   quem gravou por último. Isso é uma causa diferente (porém
   parecida na superfície) do problema de file:// acima — ambas
   causam sintomas parecidos, mas só a de file:// é resolvida
   servindo o site por http; esta aqui exige a correção de código
   abaixo.

   A correção cacheia o sorteio uma única vez por carregamento
   de página (variável de módulo), garantindo que uma mesma
   página use SEMPRE o mesmo mapa do início ao fim da sua sessão,
   e revalida a integridade do que está salvo (sorteio com
   exatamente 7 páginas/estrelas únicas, sem duplicatas) — se o
   localStorage já estiver com dado corrompido de um teste
   anterior, ele é descartado e um sorteio novo e válido é feito.
═══════════════════════════════════════════════════════════ */
(function (global) {
  var PAGINAS = ['zelda', 'valtheris', 'diary', 'book', 'covers', 'origem', 'icaro', 'mal', 'recordacoes'];
  var CHAVE_SORTEIO     = 'nexus_esferas_sorteio';     // { paginaId: nEstrelas } — 7 das 8 páginas
  var CHAVE_ENCONTRADAS = 'nexus_esferas_encontradas'; // [{ paginaId, estrelas }, ...] já achadas, nunca duplica
  var CHAVE_TESTE       = 'nexus_esferas_teste';
  // Timestamp (ms) até quando as esferas ficam indisponíveis depois de
  // um desejo concedido — ver concederDesejo()/estaBloqueado() abaixo.
  var CHAVE_BLOQUEADO_ATE = 'nexus_esferas_bloqueado_ate';
  var UM_ANO_MS = 365 * 24 * 60 * 60 * 1000;

  // Cache por carregamento de página: uma vez decidido, o sorteio
  // não muda mais durante essa sessão, mesmo que outra aba grave
  // por cima no meio do caminho.
  var _sorteioCache = null;

  // Grava e lê de volta um valor de teste NA MESMA página — isso só
  // detecta localStorage genuinamente bloqueado/indisponível (ex.:
  // navegação privada, cookies desligados). NÃO detecta o problema
  // de file:// isolar storage entre páginas DIFERENTES, porque ler o
  // que você acabou de escrever na mesma origem sempre funciona,
  // mesmo quando essa origem está isolada das outras. Por isso o
  // sinal confiável pra file:// é o protocolo em si (abaixo), não
  // este teste.
  function armazenamentoFunciona() {
    try {
      var valor = 'teste-' + Math.random();
      localStorage.setItem(CHAVE_TESTE, valor);
      var ok = localStorage.getItem(CHAVE_TESTE) === valor;
      localStorage.removeItem(CHAVE_TESTE);
      return ok;
    } catch (e) {
      return false;
    }
  }

  function estaEmFileProtocol() {
    try {
      return global.location && global.location.protocol === 'file:';
    } catch (e) {
      return false;
    }
  }

  if (estaEmFileProtocol()) {
    console.warn(
      '[Esferas do Dragão] Esta página foi aberta via file:// (arquivo local). ' +
      'Vários navegadores isolam o localStorage por página nesse modo, então o ' +
      'sorteio das esferas NÃO fica compartilhado entre o Nexus e as páginas de ' +
      'projeto — cada uma sorteia por conta própria. Sirva o site por um ' +
      'servidor local (ex.: "python3 -m http.server" na pasta do Nexus) ou pelo ' +
      'site já publicado pra funcionar corretamente.'
    );
  } else if (!armazenamentoFunciona()) {
    console.warn(
      '[Esferas do Dragão] localStorage não está disponível nesta página ' +
      '(navegação privada, cookies desligados, ou similar) — o progresso das ' +
      'esferas não vai persistir.'
    );
  }

  function embaralhar(lista) {
    var a = lista.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  // Mal sempre recebe uma esfera — chegar até ela já exige passar pela
  // sequência de botões que invoca a tempestade, então ela funciona como
  // o "segundo easter egg" natural de quem for atrás do conjunto completo.
  // As outras 6 esferas continuam sorteadas entre as 8 páginas restantes
  // (então agora sobram sempre exatamente 2 páginas sem esfera nenhuma —
  // eram 7 restantes/1 sobrando antes de Recordações entrar em PAGINAS).
  var PAGINA_GARANTIDA = 'mal';

  function sortear() {
    var outras = PAGINAS.filter(function (id) { return id !== PAGINA_GARANTIDA; });
    var paginasComEsfera = [PAGINA_GARANTIDA].concat(embaralhar(outras).slice(0, 6));
    var estrelas = embaralhar([1, 2, 3, 4, 5, 6, 7]);
    var mapa = {};
    paginasComEsfera.forEach(function (id, i) { mapa[id] = estrelas[i]; });
    return mapa;
  }

  // Confirma que um mapa de sorteio é internamente consistente:
  // no máximo 8 chaves conhecidas, valores únicos entre 1 e 7,
  // sem duas páginas com a mesma quantidade de estrelas, e com
  // PAGINA_GARANTIDA sempre presente.
  function sorteioValido(mapa) {
    if (!mapa || typeof mapa !== 'object') return false;
    var chaves = Object.keys(mapa);
    if (chaves.length !== 7) return false;
    if (mapa[PAGINA_GARANTIDA] === undefined) return false;
    var vistos = {};
    for (var i = 0; i < chaves.length; i++) {
      var id = chaves[i];
      var n = mapa[id];
      if (PAGINAS.indexOf(id) === -1) return false;
      if (typeof n !== 'number' || n < 1 || n > 7) return false;
      if (vistos[n]) return false; // estrela duplicada entre páginas — dado corrompido
      vistos[n] = true;
    }
    return true;
  }

  function lerJSON(chave) {
    try {
      var raw = localStorage.getItem(chave);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null; // localStorage indisponível (ex.: navegação privada) — degrada pra "nunca achou nada"
    }
  }

  function salvarJSON(chave, valor) {
    try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) { /* sem persistência, tudo bem */ }
  }

  function getSorteio() {
    if (_sorteioCache) return _sorteioCache;

    var atual = lerJSON(CHAVE_SORTEIO);
    if (!sorteioValido(atual)) {
      // nada salvo, ou dado corrompido de uma corrida antiga — sorteia de novo
      var novo = sortear();
      salvarJSON(CHAVE_SORTEIO, novo);
      // relê imediatamente: se outra aba venceu a corrida de gravação
      // bem nesse instante, seguimos o valor que "ganhou" (e que já
      // deve ser válido, pois toda gravação passa por sortear()),
      // em vez de insistir no nosso candidato descartado
      atual = lerJSON(CHAVE_SORTEIO);
      if (!sorteioValido(atual)) atual = novo;
    }

    _sorteioCache = atual;
    return _sorteioCache;
  }

  // ── SOBRE A JANELA DE CORRIDA QUE AINDA RESTA ──
  // getSorteio() acima cobre o caso comum (uma aba de cada vez). Mas se duas
  // abas carregarem PELA PRIMEIRA VEZ (localStorage ainda vazio) quase no
  // mesmo instante, ainda é possível — bem raro, só nesse exato momento de
  // bootstrap — que a Aba A grave seu sorteio, releia e valide o PRÓPRIO
  // candidato antes que a Aba B sobrescreva o localStorage com o dela. As
  // duas ficam com _sorteioCache diferentes na memória pelo resto da sessão,
  // mesmo só um dos dois mapas persistindo. localStorage sozinho não dá pra
  // fechar isso de vez: get/set não são atômicos entre abas, não existe um
  // compare-and-swap embutido.
  //
  // getSorteioComTrava() abaixo fecha essa janela usando a Web Locks API
  // (navigator.locks), que dá exclusão mútua real entre abas da mesma
  // origem — mas ela é assíncrona por natureza (a trava sempre resolve via
  // Promise, mesmo destravada), então isso NÃO podia virar o comportamento
  // padrão de getSorteio()/esferaDestaPagina()/encontrar() sem quebrar as
  // chamadas síncronas que as 8 páginas de projeto já fazem. Por isso isso
  // aqui é uma função NOVA e opcional, não uma substituição: use se algum
  // dia quiser a garantia total; do contrário getSorteio() síncrono (já
  // bastante estreito na prática) continua sendo o caminho normal.
  //
  // Uso:
  //   NexusEsferas.getSorteioComTrava(function (mapa) { ... });
  // Sem suporte a navigator.locks (Safari < 15.4, navegadores antigos),
  // cai direto pro getSorteio() síncrono de sempre.
  function getSorteioComTrava(callback) {
    if (_sorteioCache) { callback(_sorteioCache); return; }
    if (global.navigator && navigator.locks && navigator.locks.request) {
      navigator.locks.request('nexus-esferas-sorteio', function () {
        callback(getSorteio());
      }).catch(function () {
        // trava indisponível/negada por algum motivo — não trava a página
        // esperando; degrada pro caminho síncrono de sempre
        callback(getSorteio());
      });
    } else {
      callback(getSorteio());
    }
  }

  // Migra formatos antigos de CHAVE_ENCONTRADAS (array plano de números,
  // de antes desta correção) para o formato atual (array de objetos).
  function getEncontradasDetalhado() {
    var lista = lerJSON(CHAVE_ENCONTRADAS) || [];
    var precisaMigrar = false;
    var migrada = lista.map(function (item) {
      if (typeof item === 'number') {
        precisaMigrar = true;
        return { paginaId: null, estrelas: item };
      }
      return item;
    });
    if (precisaMigrar) salvarJSON(CHAVE_ENCONTRADAS, migrada);
    return migrada;
  }

  // Mantido para compatibilidade: mesma assinatura de sempre,
  // devolve só os números de estrelas já encontrados.
  function getEncontradas() {
    return getEncontradasDetalhado().map(function (item) { return item.estrelas; });
  }

  // Esfera desta página específica — null se as esferas estiverem
  // bloqueadas (desejo concedido há menos de um ano), OU se ela não
  // recebeu nenhuma no sorteio, OU se a esfera dela já foi encontrada
  // (não reaparece).
  function esferaDestaPagina(paginaId) {
    if (estaBloqueado()) return null;
    var n = getSorteio()[paginaId];
    if (n === undefined) return null;
    var jaEncontrada = getEncontradasDetalhado().some(function (item) {
      // compara por página quando disponível (dado migrado sem paginaId
      // cai de volta pra comparação por número, mantendo o comportamento antigo)
      return item.paginaId ? item.paginaId === paginaId : item.estrelas === n;
    });
    if (jaEncontrada) return null;
    return n;
  }

  // NOTA: esta função já teve um segundo aviso via postMessage(global.parent, ...)
  // pensado pra cenário de iframe. Removido porque a navegação entre o Nexus e
  // as páginas de projeto é sempre por window.location.href (confirmado em
  // nexus.html) — nunca existiu <iframe> nem um listener de 'message' em
  // lugar nenhum, então esse código nunca disparava ouvinte algum. Se um dia
  // alguma página passar a ser embutida via <iframe>, reintroduza o postMessage
  // aqui E adicione o listener correspondente do lado de quem recebe.
  function avisarAchado(info) {
    try {
      global.dispatchEvent(new CustomEvent('nexus-esfera-encontrada', { detail: info }));
    } catch (e) { /* CustomEvent indisponível em navegador muito antigo — ignora */ }
  }

  // Chamar quando o usuário encontrar/clicar na esfera desta página.
  // Retorna o número de estrelas encontrado, ou null se não havia nada
  // pra encontrar aqui (proteção contra clique duplo/chamada indevida).
  function encontrar(paginaId) {
    var n = esferaDestaPagina(paginaId);
    if (n === null) return null;
    var lista = getEncontradasDetalhado();
    lista.push({ paginaId: paginaId, estrelas: n });
    salvarJSON(CHAVE_ENCONTRADAS, lista);
    avisarAchado({ paginaId: paginaId, estrelas: n });
    return n;
  }

  // Registra um callback pra ser chamado sempre que uma esfera for
  // encontrada — na mesma aba (evento customizado) ou em outra
  // aba/iframe de mesma origem (evento nativo "storage"). Use isso
  // no Nexus pra atualizar o painel sem precisar recarregar a página.
  function aoEncontrar(callback) {
    if (typeof callback !== 'function') return;
    global.addEventListener('nexus-esfera-encontrada', function (e) {
      callback(e.detail);
    });
    global.addEventListener('storage', function (e) {
      if (e.key !== CHAVE_ENCONTRADAS || !e.newValue) return;
      try {
        var lista = JSON.parse(e.newValue);
        var ultimo = lista[lista.length - 1];
        if (ultimo) callback(typeof ultimo === 'number' ? { paginaId: null, estrelas: ultimo } : ultimo);
      } catch (err) { /* payload inesperado — ignora */ }
    });
  }

  // Só pra testar: zera o sorteio e o progresso, como se fosse a primeira vez.
  // NÃO mexe no bloqueio de um ano (ver concederDesejo() logo abaixo) — é
  // só o reset de dados puro, pra não travar sua própria sessão de teste
  // por um ano sem querer.
  function resetar() {
    try {
      localStorage.removeItem(CHAVE_SORTEIO);
      localStorage.removeItem(CHAVE_ENCONTRADAS);
    } catch (e) {}
    _sorteioCache = null;
  }

  // Verdadeiro enquanto as esferas estiverem "em pedra", indisponíveis
  // depois de um desejo concedido — igual ao cânone, onde as esferas
  // viram pedra e ficam espalhadas pelo mundo por um ano antes de
  // poderem ser reunidas de novo.
  function estaBloqueado() {
    var ate = 0;
    try { ate = parseInt(localStorage.getItem(CHAVE_BLOQUEADO_ATE), 10) || 0; } catch (e) {}
    return ate > Date.now();
  }

  // Quanto falta (em ms) pro bloqueio acabar — 0 se não estiver bloqueado.
  function tempoRestanteBloqueio() {
    var ate = 0;
    try { ate = parseInt(localStorage.getItem(CHAVE_BLOQUEADO_ATE), 10) || 0; } catch (e) {}
    return Math.max(0, ate - Date.now());
  }

  // Chamar quando um desejo é REALMENTE concedido (não confundir com
  // resetar(), que é só pra teste) — reseta os dados E bloqueia novas
  // esferas por um ano a partir de agora.
  function concederDesejo() {
    resetar();
    try { localStorage.setItem(CHAVE_BLOQUEADO_ATE, String(Date.now() + UM_ANO_MS)); } catch (e) {}
  }

  global.NexusEsferas = {
    esferaDestaPagina: esferaDestaPagina,
    encontrar: encontrar,
    getEncontradas: getEncontradas,
    getEncontradasDetalhado: getEncontradasDetalhado,
    getSorteioComTrava: getSorteioComTrava,
    aoEncontrar: aoEncontrar,
    resetar: resetar,
    concederDesejo: concederDesejo,
    estaBloqueado: estaBloqueado,
    tempoRestanteBloqueio: tempoRestanteBloqueio,
    armazenamentoFunciona: armazenamentoFunciona,
    estaEmFileProtocol: estaEmFileProtocol,
    TOTAL: 7
  };
})(window);
