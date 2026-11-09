/* nave-sistemas.js — sistemas portados de estacao_interior.html (nixie, pergaminhos, mapa, quadro e irmãos).
   Cada sistema é construído dentro de um Group "âncora" (ctx.S): as coordenadas originais do protótipo ficam
   intactas e NaveSistemas.alinhar() posiciona/gira a âncora na parede certa de cada sala. */
(function(){
"use strict";
(function(){var mostrado=false;function mostrar(msg){if(mostrado)return;mostrado=true;var d=document.createElement("div");d.id="nave-erro";d.style.cssText="position:fixed;left:16px;bottom:16px;z-index:99;max-width:60vw;padding:8px 12px;background:#2a0a10ee;border:1px solid #ff2b3a;color:#ffd0d6;font:12px monospace;border-radius:8px";d.textContent=msg;(document.body||document.documentElement).appendChild(d);}
addEventListener("error",function(e){mostrar("Erro: "+(e.message||"?")+" ("+String(e.filename||"").split("/").pop()+":"+e.lineno+")");});
window.NaveErro=function(e){try{console.error(e)}catch(x){}var l=(e&&e.stack?String(e.stack).split("\n")[1]||"":"");mostrar("Erro: "+(e&&e.message||e)+(l?" "+l.trim().split("/").pop():""));};
// o ícone flutuante de Lib/cancao-tempestade.js nunca deve aparecer dentro da nave (o quadro na parede é quem mostra o progresso)
try{var st=document.createElement("style");st.textContent="#cancao-painel{display:none!important}";(document.head||document.documentElement).appendChild(st);}catch(x){}
})();
const THREE=window.THREE;
function base(S){
const G = {
  h: new THREE.MeshStandardMaterial({ color: 0x151c21, roughness: 0.42, metalness: 0.9 }),
  d: new THREE.MeshStandardMaterial({ color: 0x070a0d, roughness: 0.55, metalness: 0.82 }),
  p: new THREE.MeshStandardMaterial({ color: 0x202a2d, roughness: 0.5, metalness: 0.8 }),
  g: new THREE.MeshStandardMaterial({ color: 0x9b742e, roughness: 0.28, metalness: 0.9, emissive: 0x302005, emissiveIntensity: 0.3 }),
  e: new THREE.MeshStandardMaterial({ color: 0x38ff8a, roughness: 0.18, metalness: 0.4, emissive: 0x13ff69, emissiveIntensity: 2.4 }),
  r: new THREE.MeshStandardMaterial({ color: 0xd72e42, roughness: 0.2, metalness: 0.45, emissive: 0x8c1020, emissiveIntensity: 1.8 }),
  glass: new THREE.MeshStandardMaterial({
    color: 0x173944, roughness: 0.08, metalness: 0.35,
    emissive: 0x06171c, emissiveIntensity: 0.5, transparent: true, opacity: 0.82
  }),
  ghost: new THREE.MeshStandardMaterial({
    color: 0x8be8ce, transparent: true, opacity: 0.24,
    emissive: 0x46e0bc, emissiveIntensity: 2
  })
};

function box(a, m, p, r = [0, 0, 0]) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(...a), m);
  o.position.set(...p);
  o.rotation.set(...r);
  o.castShadow = o.receiveShadow = true;
  S.add(o);
  return o;
}
function cyl(rad, dep, m, p, r = [0, 0, 0]) {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, dep, 24), m);
  o.position.set(...p);
  o.rotation.set(...r);
  o.castShadow = o.receiveShadow = true;
  S.add(o);
  return o;
}
function tor(rad, t, m, p, r = [0, 0, 0]) {
  const o = new THREE.Mesh(new THREE.TorusGeometry(rad, t, 10, 32), m);
  o.position.set(...p);
  o.rotation.set(...r);
  S.add(o);
  return o;
}
return {G:G,box:box,cyl:cyl,tor:tor};
}
let P=null;
function painel(){
  if(P)return P;
  const st=document.createElement('style');
  st.textContent=`
    #panel {
      display: none; position: fixed; z-index: 30; left: 50%; top: 50%;
      transform: translate(-50%, -50%); width: min(520px, 88vw); padding: 20px;
      background: #070d10f2; border: 1px solid #526c60; border-radius: 12px;
      box-shadow: 0 20px 80px #000b; color: #e4eee9;
    }
    .close {
      float: right; background: none; border: 1px solid #526c60; color: #dce8e3;
      border-radius: 6px; padding: 4px 9px; cursor: pointer;
    }
    .song {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 8px; border-top: 1px solid #263a31;
    }
    .song button {
      background: #10251b; color: #8df5c1; border: 1px solid #3b7057;
      border-radius: 6px; padding: 7px 12px; cursor: pointer;
    }
    #cancao-dialogo-nave { font-family: Georgia, serif; font-size: 13px; line-height: 1.6; color: #ffe9c2; padding: 6px 4px 2px; }
    #cancao-dialogo-nave p { margin: 0 0 10px; }
    #cancao-dialogo-nave .song { border-top: none; padding: 6px 0 0; gap: 10px; justify-content: center; }
    #cancao-dialogo-nave .song button { flex: 1; max-width: 140px; }
  #cancao-painel{display:none!important}`;
  document.head.appendChild(st);
  P=document.createElement('div');P.id='panel';document.body.appendChild(P);return P;
}
function fecharPainel(){painel().style.display='none';}
// leva o ponto pp (coordenadas do protótipo) até wp (mundo), com a frente do protótipo (-Z) virada pra (dx,dz)
function alinhar(A,pp,wp,dx,dz){
  const t=Math.atan2(-dx,-dz);A.rotation.y=t;
  const v=new THREE.Vector3(pp[0],pp[1],pp[2]).applyAxisAngle(new THREE.Vector3(0,1,0),t);
  A.position.set(wp[0]-v.x,wp[1]-v.y,wp[2]-v.z);
}
function abrirMapa(){
  if(window.NaveLimparTeclas)window.NaveLimparTeclas();
  // O Mapa do Nexus de verdade (Lib/mapa-nexus.js, atalho Ctrl+Shift+M) só existe no index.html, que carrega o
  // nexus.html e as páginas da nave dentro de um iframe. O mapa só abre se a URL do iframe estiver em Nave/ (e não for
  // estacao_nexus.html): ver paginaEhEstacao() no mapa-nexus.js.
  if(window.self!==window.top){
    document.exitPointerLock&&document.exitPointerLock();
    try{document.dispatchEvent(new KeyboardEvent("keydown",{key:"M",code:"KeyM",ctrlKey:true,shiftKey:true,bubbles:true,cancelable:true}));}catch(e){}
  }else{
    const p=painel();p.style.display='block';
    p.innerHTML='<button class="close">FECHAR</button><h2>✦ MAPA DO NEXUS</h2><div class="song"><span>Esta página foi aberta direto, fora do index.html. O mapa só carrega por lá.</span><button id="ir-index">ABRIR PELO NEXUS</button></div>';
    p.querySelector('.close').onclick=fecharPainel;
    p.querySelector('#ir-index').onclick=function(){location.href='../index.html';};
  }
}
function nixie(ctx){
  const S=ctx.S,mobile=innerWidth<700,b=base(S),G=b.G,box=b.box,cyl=b.cyl,tor=b.tor,P=painel(),C=document.querySelector('canvas');
// ═══ Cronômetro de M.A.L.I.K. (tubos nixie) — movido de nexus.html pra
// cá. Lá vivia como widget 2D (HUD no canto + visualizador em tela
// cheia ao clicar); aqui os 8 tubos são objetos 3D de verdade, em pé
// numa prateleira dentro da nave, exatamente onde antes havia 4
// cilindros de vidro decorativos (sem dígito nenhum). As funções abaixo
// (dataDespertarAtual, calcularAlvoDesvio, desenharDigitoGlow/Fantasma,
// criarTuboDetalhado, calcularDigitosECor etc.) são cópia praticamente
// literal do que nexus.html tinha — a única peça de UI que não fazia
// sentido trazer foi o "visualizador em tela cheia" (clicar pra ver de
// perto): aqui dentro da nave, andar até perto da prateleira já cumpre
// esse papel.
  var DATA_DESPERTAR_PADRAO = { dia: '30', mes: '10', hora: '23', minuto: '59' }; // respaldo, só usado se aberto fora do iframe (ou antes do malik.js definir a de verdade)

  // Antes isso era lido uma vez só, aqui em cima, no instante em que este
  // script rodava. Só que o iframe do nexus.html normalmente termina de
  // carregar e rodar ANTES do malik.js (script com defer, um dos últimos
  // do index.html) chegar a definir window.NexusMalikDataDespertar — então
  // essa leitura única quase sempre pegava undefined e ficava presa no
  // valor de respaldo pro resto da sessão, mesmo depois do malik.js já
  // ter definido o valor de verdade. Daí a sensação de "duas datas" pra
  // manter sincronizadas. Ler de novo a cada chamada (calcularAlvoDesvio
  // já roda a cada tick, ver comentário logo abaixo) resolve isso sem
  // precisar acertar a ordem de carregamento: assim que malik.js define o
  // valor, o próximo tick já reflete.
  function dataDespertarAtual() {
    try {
      if (window.top && window.top !== window && window.top.NexusMalikDataDespertar) {
        return window.top.NexusMalikDataDespertar;
      }
    } catch (e) {}
    return DATA_DESPERTAR_PADRAO;
  }

  // modoTeste (?malikTeste=1) não faz um "return" aqui como fazia no
  // nexus.html original -- essas são só funções soltas agora, quem
  // decide se cria os tubos ou não é o initTubosNixieMalik() lá embaixo.
  var CHAVE_RESOLVIDO = 'malik_resolvido_em';
  var CHAVE_APAGADO = 'malik_nexus_apagado';

  // Recalculado por inteiro a cada tick — nunca fica preso a um valor
  // de quando a página carregou. Só os campos dia/mês/hora/minuto do
  // alvo são fixos; o ano usa sempre o ano corrente na hora do cálculo,
  // então mudar o relógio do sistema pra outro ano também é respeitado.
  // parseInt com base 10 explícita: o malik.js agora guarda esses campos
  // como texto (ex.: "09"), não número, pra poder ter zero à esquerda
  // sem quebrar a sintaxe lá; isso lê "09" como 9 de verdade aqui.
  function calcularAlvoDesvio() {
    var alvo = dataDespertarAtual();
    var agora = new Date();
    return new Date(agora.getFullYear(), parseInt(alvo.mes, 10) - 1, parseInt(alvo.dia, 10), parseInt(alvo.hora, 10) || 0, parseInt(alvo.minuto, 10) || 0, 0);
  }

  // ═══ Dígito com brilho multi-camada (a técnica que dá o "peso" ao
  // tubo: 3-4 passadas de fillText com shadowBlur decrescente e cor
  // esquentando pro centro — halo largo → brilho → núcleo pálido) —
  // parametrizado por cor RGB, então o mesmo desenho serve pro âmbar
  // ativo, pro vermelho da corrupção, e pro âmbar envelhecido pós-luta.
  function desenharDigitoGlow(ctx, W, H, digito, rgb, fraco) {
    ctx.clearRect(0, 0, W, H);
    var cx = W / 2, cy = H * 0.72;
    ctx.textAlign = 'center';
    ctx.font = '900 ' + Math.floor(H * 0.62) + 'px Arial, sans-serif';
    var texto = String(digito);
    if (fraco) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(' + rgb + ',.28)';
      ctx.fillText(texto, cx, cy);
      return;
    }
    ctx.shadowColor = 'rgb(' + rgb + ')';
    ctx.shadowBlur = H * 0.26;
    ctx.fillStyle = 'rgba(' + rgb + ',.55)';
    ctx.fillText(texto, cx, cy);
    ctx.shadowBlur = H * 0.14;
    ctx.fillStyle = 'rgb(' + rgb + ')';
    ctx.fillText(texto, cx, cy);
    ctx.shadowBlur = H * 0.05;
    ctx.fillStyle = 'rgba(255,235,200,.9)';
    ctx.fillText(texto, cx, cy);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,250,240,.55)';
    ctx.fillText(texto, cx, cy);
  }

  function desenharDigitoFantasma(ctx, W, H, digito) {
    ctx.clearRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.font = '900 ' + Math.floor(H * 0.62) + 'px Arial, sans-serif';
    ctx.fillStyle = 'rgba(120,70,40,.18)';
    ctx.fillText(String(digito), W / 2, H * 0.72);
  }

  // ═══ Um tubo detalhado — base, dois dígitos-fantasma (profundidade),
  // dígito principal (blending aditivo), grade em wireframe (o "ânodo"
  // visível por trás do vidro), vidro com clearcoat, cúpula, pino de
  // evacuação. raio/altura controlam a escala — a mesma função serve
  // pro HUD pequeno e pro visualizador grande. ═══
  function criarTuboDetalhado(raio, altura) {
    var grupo = new THREE.Group();

    var baseTubo = new THREE.Mesh(
      new THREE.CylinderGeometry(raio * 0.78, raio * 0.82, altura * 0.08, 16),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.5 })
    );
    baseTubo.position.y = -altura / 2 - altura * 0.04;
    grupo.add(baseTubo);

    var W = 128, H = 200;
    function novoCanvasDigito() {
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      return { canvas: c, ctx: c.getContext('2d') };
    }

    // dígitos-fantasma: dois planos dimmed, ligeiramente atrás e
    // deslocados — dão profundidade ao tubo, como o catodo real de um
    // nixie mostrando os outros dígitos apagados atrás do aceso
    var fantasmas = [0, 1].map(function (fi) {
      var cd = novoCanvasDigito();
      desenharDigitoFantasma(cd.ctx, W, H, (fi + 3) % 10);
      var tex = new THREE.CanvasTexture(cd.canvas);
      var mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
      var plane = new THREE.Mesh(new THREE.PlaneGeometry(raio * 1.3, raio * 2.1), mat);
      plane.position.set(raio * (fi === 0 ? -0.12 : 0.1), 0, raio * (fi === 0 ? -0.28 : -0.4));
      plane.rotation.y = fi === 0 ? 0.18 : -0.14;
      plane.renderOrder = 1;
      grupo.add(plane);
    });

    var digCanvas = novoCanvasDigito();
    var digTex = new THREE.CanvasTexture(digCanvas.canvas);
    var digMat = new THREE.MeshBasicMaterial({ map: digTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    var digPlane = new THREE.Mesh(new THREE.PlaneGeometry(raio * 1.55, raio * 2.5), digMat);
    digPlane.renderOrder = 2;
    grupo.add(digPlane);

    // grade — cilindro aberto em wireframe, sugerindo o suporte metálico
    // por trás do vidro sem precisar modelar fios individuais
    var grade = new THREE.Mesh(
      new THREE.CylinderGeometry(raio * 0.62, raio * 0.62, altura * 0.82, 10, 4, true),
      new THREE.MeshBasicMaterial({ color: 0x8a6a3a, wireframe: true, transparent: true, opacity: 0.22, depthWrite: false })
    );
    grupo.add(grade);

    var vidro = new THREE.Mesh(
      new THREE.CylinderGeometry(raio, raio, altura, 24, 1, true),
      new THREE.MeshPhysicalMaterial({ color: 0x3a2418, transparent: true, opacity: 0.22, roughness: 0.08, metalness: 0.02, clearcoat: 1, clearcoatRoughness: 0.1, side: THREE.DoubleSide, depthWrite: false })
    );
    grupo.add(vidro);

    var cupula = new THREE.Mesh(
      new THREE.SphereGeometry(raio, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xC8CAD2, roughness: 0.15, metalness: 0.9 })
    );
    cupula.position.y = altura / 2;
    grupo.add(cupula);

    var pino = new THREE.Mesh(
      new THREE.CylinderGeometry(raio * 0.06, raio * 0.06, raio * 0.3, 8),
      new THREE.MeshStandardMaterial({ color: 0xB8B8BE, roughness: 0.3, metalness: 0.8 })
    );
    pino.position.y = altura / 2 + raio * 0.18;
    grupo.add(pino);

    var luz = new THREE.PointLight(0xff8a3a, 0, raio * 8);
    luz.position.set(0, 0, raio * 0.4);
    grupo.add(luz);

    var ultimoDesenho = null;
    function setDigito(valor, rgb, fraco) {
      var chave = valor + '|' + rgb + '|' + (fraco ? 1 : 0);
      if (ultimoDesenho === chave) return;
      ultimoDesenho = chave;
      desenharDigitoGlow(digCanvas.ctx, W, H, valor, rgb, fraco);
      digTex.needsUpdate = true;
      luz.color.set('rgb(' + rgb + ')');
      luz.intensity = fraco ? 0.1 : 1.3;
    }

    return { grupo: grupo, setDigito: setDigito, luz: luz };
  }

  function p2(n) { return (n < 10 ? '0' : '') + n; }

  function apagadoDeVez() {
    try { return !!localStorage.getItem(CHAVE_APAGADO); } catch (e) { return false; }
  }

  // linhas finas escuras sobre o vidro — mesma ideia das cicatrizes nos
  // símbolos 3D principais, aplicada aqui pro estado pós-batalha
  function adicionarRachadurasNoTubo(tuboObj, raio, altura) {
    if (tuboObj.temRachaduras) return;
    tuboObj.temRachaduras = true;
    var seed = Math.random() * 50;
    var matRacha = new THREE.MeshBasicMaterial({ color: 0x120604, transparent: true, opacity: 0.75 });
    var nLinhas = 3;
    for (var i = 0; i < nLinhas; i++) {
      var comp = altura * (0.3 + Math.random() * 0.35);
      var racha = new THREE.Mesh(new THREE.BoxGeometry(raio * 0.02, comp, raio * 0.02), matRacha);
      racha.position.set((Math.random() - 0.5) * raio * 1.2, (Math.random() - 0.5) * altura * 0.5, raio * (Math.random() > 0.5 ? 1 : -1) * 0.85);
      racha.rotation.z = (Math.random() - 0.5) * 1.2;
      racha.rotation.y = Math.sin(seed + i) * 0.6;
      tuboObj.grupo.add(racha);
    }
  }

  function calcularDigitosECor(agora) {
    var apagado = apagadoDeVez();
    if (apagado) return null;

    var resolvidoEmStr = null;
    try { resolvidoEmStr = localStorage.getItem(CHAVE_RESOLVIDO); } catch (e) {}
    if (resolvidoEmStr) {
      var resolvidoEm = new Date(resolvidoEmStr).getTime();
      if (!isNaN(resolvidoEm)) {
        var decorrido = agora - resolvidoEm;
        var dR = Math.min(99, Math.floor(decorrido / 86400000));
        var hR = Math.floor(decorrido / 3600000) % 24;
        var mR = Math.floor(decorrido / 60000) % 60;
        var sR = Math.floor(decorrido / 1000) % 60;
        return { digitos: (p2(dR) + p2(hR) + p2(mR) + p2(sR)).split(''), rgb: '201,122,74', modo: 'posBatalha' };
      }
    }

    var alvo = calcularAlvoDesvio();
    var restante = alvo.getTime() - agora;
    var passou = restante <= 0;
    var abs = Math.abs(restante);
    var d = Math.min(99, Math.floor(abs / 86400000));
    var h = Math.floor(abs / 3600000) % 24;
    var m = Math.floor(abs / 60000) % 60;
    var s = Math.floor(abs / 1000) % 60;
    var digitos = (p2(d) + p2(h) + p2(m) + p2(s)).split('');

    var rgb = '255,176,96';
    if (passou) {
      var t = Math.min(1, abs / (30 * 60000));
      var r = 255, g = Math.round(176 - (176 - 43) * t), b = Math.round(96 - (96 - 58) * t);
      rgb = r + ',' + g + ',' + b;
    }
    return { digitos: digitos, rgb: rgb, modo: passou ? 'corrupcao' : 'contagem' };
  }

  // Placar de leitura do relógio: mesma lógica de dataDespertarAtual()
  // acima, mas exposta com um nome que não colide com o resto do
  // arquivo, pra debug rápido no console (basta chamar
  // window.NexusMalikDebugData() com a nave aberta).
  window.NexusMalikDebugData = dataDespertarAtual;

  // Prateleira dos tubos nixie do M.A.L.I.K. — espelha a dos pergaminhos
  // de Valtheris do outro lado da sala. É a peça que antes só tinha 4
  // cilindros de vidro sem função nenhuma; agora são 8 tubos de verdade
  // (DD·HH·MM·SS), lendo a mesma DATA_DESPERTAR que malik.js define lá
  // no index.html (ver dataDespertarAtual() acima) e a mesma
  // 'malik_resolvido_em'/'malik_nexus_apagado' que o resto do sistema
  // já usa — nada de estado novo, só a exibição.
  const prateleiraNixie = box([2.5, 0.12, 0.55], G.g, [-2.95, 2.25, 3.15]);
  prateleiraNixie.userData.label = "Prateleira de tubos nixie";
  const painelNixie = box([2.65, 1.35, 0.12], G.d, [-2.95, 2.75, 3.15]);
  painelNixie.userData.label = "Cronômetro — contagem regressiva (dias·horas·min·seg)";

  const N_TUBOS_MALIK = 8; // DD:HH:MM:SS
  const raioTuboMalik = 0.085, alturaTuboMalik = 0.4;
  const tubosMalik = [];
  (function montarTubosMalik() {
    // pequeno respiro extra a cada par de dígitos (DD | HH | MM | SS),
    // só pra ficar legível como um relógio e não como uma fileira única
    var passoBase = 0.255, gapGrupo = 0.09;
    var xs = [];
    var x = 0;
    for (var i = 0; i < N_TUBOS_MALIK; i++) {
      xs.push(x);
      x += passoBase + (i % 2 === 1 ? gapGrupo : 0);
    }
    var largura = x - passoBase;
    for (var i = 0; i < N_TUBOS_MALIK; i++) {
      var t = criarTuboDetalhado(raioTuboMalik, alturaTuboMalik);
      // xs[i] deixava dia-hora-min-seg da direita pra esquerda pra quem
      // entra na sala — invertido aqui (xs de trás pra frente) pra ficar
      // dia·hora·minuto·segundo da esquerda pra direita, como deveria.
      var xPos = xs[N_TUBOS_MALIK - 1 - i];
      t.grupo.position.set(-2.95 + xPos - largura / 2, 2.25 + 0.06 + alturaTuboMalik / 2, 3.05);
      // O plano do dígito (digPlane, dentro de criarTuboDetalhado) nasce
      // encarando +Z local sem rotação nenhuma — no HUD/visualizador do
      // nexus.html a câmera sempre olhava de +Z pra -Z, então "de frente"
      // já batia. Aqui na nave o jogador fica em Z menor olhando pra Z
      // maior (na direção da prateleira), ou seja, veria o dígito por
      // TRÁS — e um PlaneGeometry visto por trás (mesmo com
      // side:DoubleSide) mostra a textura espelhada. Girar o grupo 180°
      // vira a frente do dígito pra quem entra na sala.
      t.grupo.rotation.y = Math.PI;
      S.add(t.grupo);
      tubosMalik.push(t);
    }
  })();

  // Placa "El Psy Congroo" — a assinatura gravada + os componentes
  // decorativos que só existiam no visualizador em tela cheia do
  // nexus.html (o easter egg ficava escondido lá, atrás do "abrir" que
  // não existe mais). Portado direto pra prateleira: sem clique nenhum,
  // quem se aproximar e olhar já vê.
  (function easterEggElPsyCongroo() {
    var W = 512, H = 96;
    var c = document.createElement("canvas");
    c.width = W; c.height = H;
    var ctx = c.getContext("2d");
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = 'italic 40px Georgia, "Cormorant Garamond", serif';
    var cx = W / 2, cy = H / 2, texto = "El Psy Congroo";
    ctx.fillStyle = "rgba(0,0,0,.5)";
    ctx.fillText(texto, cx - 1, cy - 1);
    ctx.fillStyle = "rgba(214,180,110,.28)";
    ctx.fillText(texto, cx + 1, cy + 1);
    ctx.fillStyle = "rgba(18,12,7,.8)";
    ctx.fillText(texto, cx, cy);

    var tex = new THREE.CanvasTexture(c);
    var mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    var largura = 0.85, altura = largura * (H / W);
    var plano = new THREE.Mesh(new THREE.PlaneGeometry(largura, altura), mat);
    plano.rotation.x = -Math.PI / 2;
    // faixa livre perto da borda da frente da prateleira (mesma posição
    // relativa de antes, só reescalada pro tamanho real da prateleira)
    plano.position.set(-2.95, 2.25 + 0.061, 3.35);
    plano.userData.label = "El Psy Congroo";
    S.add(plano);

    // componentes decorativos espalhados pela prateleira (resistores
    // pretos simples) — mesmo sorteio determinístico do original
    var seed = 17;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    var matComp = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.5 });
    for (var i = 0; i < 14; i++) {
      if (rnd() > 0.5) continue; // metade descartada, igual ao original
      var comp = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.028, 10), matComp);
      comp.position.set(-2.95 + (rnd() - 0.5) * 2.3, 2.25 + 0.062, 3.05 + (rnd() - 0.5) * 0.35);
      comp.rotation.z = Math.PI / 2;
      comp.rotation.y = rnd() * Math.PI;
      S.add(comp);
    }
  })();

  prateleiraNixie.userData.interactive = "nixie";
  prateleiraNixie.userData.acao = "Observar o cronômetro de perto";
  painelNixie.userData.interactive = "nixie";
  painelNixie.userData.acao = "Observar o cronômetro de perto";

  // ═══ Visualizador em tela cheia dos tubos nixie — a mesma cena maior
  // com a placa/componentes decorativos e a órbita manual (arrastar,
  // beliscar, rolar) que existia no HUD do nexus.html. Na prateleira,
  // de longe/no alto, dava pra ver os tubos só de relance; isso aqui é
  // o "chegar perto" de verdade. Portado quase literal — só ganhou
  // exitPointerLock()/requestPointerLock() ao abrir/fechar, já que aqui
  // a interação normal é primeira-pessoa com o cursor travado. ═══
  var visualizadorNixieAberto = false;
  function abrirVisualizadorNixie() {
    if (visualizadorNixieAberto) return;
    visualizadorNixieAberto = true;
    document.exitPointerLock?.();

    var overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:950000;background:radial-gradient(ellipse at 50% 40%,#161310 0%,#070605 75%);display:flex;flex-direction:column;align-items:center;justify-content:center;";
    document.body.appendChild(overlay);

    var fechar = document.createElement("button");
    fechar.textContent = "✕";
    fechar.style.cssText = "position:absolute;right:18px;top:18px;width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.2);color:#E8E0D0;font-size:16px;cursor:pointer;z-index:2;";
    overlay.appendChild(fechar);

    var canvasArea = document.createElement("div");
    canvasArea.style.cssText = "width:min(94vw,900px);height:min(62vh,560px);position:relative;touch-action:none;";
    overlay.appendChild(canvasArea);

    var canvasNixie = document.createElement("canvas");
    canvasNixie.style.cssText = "width:100%;height:100%;display:block;cursor:grab;";
    canvasArea.appendChild(canvasNixie);

    var dica = document.createElement("div");
    dica.style.cssText = "margin-top:14px;font-family:Consolas,monospace;font-size:11px;letter-spacing:.06em;color:rgba(232,224,208,.4);text-align:center;";
    dica.textContent = "arraste para girar · role ou belisque para aproximar · ESC fecha";
    overlay.appendChild(dica);

    var sceneNixie = new THREE.Scene();
    sceneNixie.fog = new THREE.FogExp2(0x0a0806, 0.028);
    var cameraNixie = new THREE.PerspectiveCamera(42, 900 / 560, 0.1, 200);
    var rendererNixie = new THREE.WebGLRenderer({ canvas: canvasNixie, antialias: true, alpha: true });
    rendererNixie.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

    function redimensionar() {
      var w = canvasArea.clientWidth, h = canvasArea.clientHeight;
      cameraNixie.aspect = w / h; cameraNixie.updateProjectionMatrix();
      rendererNixie.setSize(w, h, false);
    }
    redimensionar();
    window.addEventListener("resize", redimensionar);

    sceneNixie.add(new THREE.AmbientLight(0x554433, 0.8));
    sceneNixie.add(new THREE.HemisphereLight(0xfff2df, 0x1a1006, 0.5));
    var chave = new THREE.DirectionalLight(0xffe0b0, 1.1);
    chave.position.set(4, 6, 5);
    sceneNixie.add(chave);
    var contraluz = new THREE.DirectionalLight(0x4a6a9a, 0.35);
    contraluz.position.set(-5, 3, -4);
    sceneNixie.add(contraluz);

    var placa = new THREE.Mesh(
      new THREE.BoxGeometry(13, 0.4, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x2a2118, roughness: 0.85, metalness: 0.15 })
    );
    placa.position.y = -2.1;
    sceneNixie.add(placa);

    (function esculpirAssinatura() {
      var W = 512, H = 96;
      var c = document.createElement("canvas"); c.width = W; c.height = H;
      var ctx = c.getContext("2d");
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = 'italic 40px Georgia, "Cormorant Garamond", serif';
      var cx = W / 2, cy = H / 2, texto = "El Psy Congroo";
      ctx.fillStyle = "rgba(0,0,0,.5)";
      ctx.fillText(texto, cx - 1, cy - 1);
      ctx.fillStyle = "rgba(214,180,110,.28)";
      ctx.fillText(texto, cx + 1, cy + 1);
      ctx.fillStyle = "rgba(18,12,7,.8)";
      ctx.fillText(texto, cx, cy);
      var tex = new THREE.CanvasTexture(c);
      var mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
      var largura = 2.4, altura = largura * (H / W);
      var plano = new THREE.Mesh(new THREE.PlaneGeometry(largura, altura), mat);
      plano.rotation.x = -Math.PI / 2;
      plano.position.set(0, -1.89, 1.35);
      sceneNixie.add(plano);
    })();

    (function espalharComponentes() {
      var seed = 17;
      function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
      for (var i = 0; i < 14; i++) {
        if (rnd() > 0.5) continue;
        var comp = new THREE.Mesh(
          new THREE.CylinderGeometry(0.11, 0.11, 0.35, 12),
          new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.5 })
        );
        comp.position.set((rnd() - 0.5) * 11.5, -1.85, (rnd() - 0.5) * 2.4);
        sceneNixie.add(comp);
      }
    })();

    var N_DIGITOS = 8;
    var raioTubo = 0.62, alturaTubo = 3.4;
    var espacoTubo = 13.5 / N_DIGITOS;
    var tubosVisualizador = [];
    for (var i = 0; i < N_DIGITOS; i++) {
      var tv = criarTuboDetalhado(raioTubo, alturaTubo);
      tv.grupo.position.x = (i - (N_DIGITOS - 1) / 2) * espacoTubo;
      sceneNixie.add(tv.grupo);
      tubosVisualizador.push(tv);
    }

    function atualizarDigitosVisualizador() {
      var info = calcularDigitosECor(Date.now());
      if (!info) return;
      for (var i = 0; i < tubosVisualizador.length; i++) {
        var tubo = tubosVisualizador[i];
        var valorMostrado = info.digitos[i];
        var fraco = false;
        if (info.modo === "corrupcao" && Math.random() < 0.04) valorMostrado = String(Math.floor(Math.random() * 10));
        if (info.modo === "posBatalha") {
          adicionarRachadurasNoTubo(tubo, raioTubo, alturaTubo);
          fraco = Math.random() < 0.045;
        }
        tubo.setDigito(valorMostrado, info.rgb, fraco);
      }
    }
    atualizarDigitosVisualizador();
    var intervaloDigitos = setInterval(atualizarDigitosVisualizador, 1000);

    var theta = 0.6, phi = 1.15, raioCam = 11;
    var autoRotacao = true, ultimaInteracao = 0;
    function atualizarCameraNixie() {
      var phiClamp = Math.max(0.35, Math.min(1.5, phi));
      cameraNixie.position.set(
        raioCam * Math.sin(phiClamp) * Math.sin(theta),
        raioCam * Math.cos(phiClamp),
        raioCam * Math.sin(phiClamp) * Math.cos(theta)
      );
      cameraNixie.lookAt(0, -0.2, 0);
    }
    atualizarCameraNixie();

    var arrastando = false, ultimoX = 0, ultimoY = 0;
    function aoDown(x, y) { arrastando = true; ultimoX = x; ultimoY = y; autoRotacao = false; ultimaInteracao = Date.now(); canvasNixie.style.cursor = "grabbing"; }
    function aoMove(x, y) {
      if (!arrastando) return;
      theta -= (x - ultimoX) * 0.008;
      phi -= (y - ultimoY) * 0.008;
      ultimoX = x; ultimoY = y;
      ultimaInteracao = Date.now();
    }
    function aoUp() { arrastando = false; canvasNixie.style.cursor = "grab"; }
    canvasNixie.addEventListener("mousedown", function (e) { aoDown(e.clientX, e.clientY); });
    window.addEventListener("mousemove", function (e) { aoMove(e.clientX, e.clientY); });
    window.addEventListener("mouseup", aoUp);

    var ultimaDistanciaTouch = null;
    function distanciaTouch(touches) {
      var dx = touches[0].clientX - touches[1].clientX, dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }
    canvasNixie.addEventListener("touchstart", function (e) {
      if (e.touches.length === 1) aoDown(e.touches[0].clientX, e.touches[0].clientY);
      else if (e.touches.length === 2) ultimaDistanciaTouch = distanciaTouch(e.touches);
    }, { passive: true });
    canvasNixie.addEventListener("touchmove", function (e) {
      if (e.touches.length === 1) aoMove(e.touches[0].clientX, e.touches[0].clientY);
      else if (e.touches.length === 2) {
        var d = distanciaTouch(e.touches);
        if (ultimaDistanciaTouch) raioCam = Math.max(5, Math.min(22, raioCam - (d - ultimaDistanciaTouch) * 0.02));
        ultimaDistanciaTouch = d;
        autoRotacao = false; ultimaInteracao = Date.now();
      }
    }, { passive: true });
    canvasNixie.addEventListener("touchend", function () { aoUp(); ultimaDistanciaTouch = null; });

    canvasNixie.addEventListener("wheel", function (e) {
      e.preventDefault();
      raioCam = Math.max(5, Math.min(22, raioCam + e.deltaY * 0.01));
      autoRotacao = false; ultimaInteracao = Date.now();
    }, { passive: false });

    var rodando = true;
    function animarNixie() {
      if (!rodando) return;
      requestAnimationFrame(animarNixie);
      if (!autoRotacao && Date.now() - ultimaInteracao > 3500) autoRotacao = true;
      if (autoRotacao && !arrastando) theta += 0.0022;
      atualizarCameraNixie();
      rendererNixie.render(sceneNixie, cameraNixie);
    }
    animarNixie();

    function fecharVisualizadorNixie() {
      rodando = false;
      clearInterval(intervaloDigitos);
      window.removeEventListener("resize", redimensionar);
      overlay.remove();
      visualizadorNixieAberto = false;
      
    }
    fechar.addEventListener("click", fecharVisualizadorNixie);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) fecharVisualizadorNixie(); });
    var aoEscNixie = function (e) { if (e.key === "Escape") { fecharVisualizadorNixie(); document.removeEventListener("keydown", aoEscNixie); } };
    document.addEventListener("keydown", aoEscNixie);
  }

  var modoTesteMalik = false;
  try { modoTesteMalik = /[?&]malikTeste=1\b/.test((window.top || window).location.search); } catch (e) {}

  function atualizarTubosMalik() {
    if (modoTesteMalik) return; // em teste o confronto pula direto pra luta — o cronômetro só confundiria
    var info = calcularDigitosECor(Date.now());
    for (var i = 0; i < tubosMalik.length; i++) {
      var tubo = tubosMalik[i];
      if (!info) { tubo.setDigito(" ", "40,40,40", true); continue; } // apagado de vez
      var valorMostrado = info.digitos[i];
      var fraco = false;
      if (info.modo === "corrupcao" && Math.random() < 0.04) valorMostrado = String(Math.floor(Math.random() * 10));
      if (info.modo === "posBatalha") {
        adicionarRachadurasNoTubo(tubo, raioTuboMalik, alturaTuboMalik);
        fraco = Math.random() < 0.045;
      }
      tubo.setDigito(valorMostrado, info.rgb, fraco);
    }
  }
  atualizarTubosMalik();
  setInterval(atualizarTubosMalik, 1000);
  return {abrir:abrirVisualizadorNixie,atualizar:atualizarTubosMalik};
}
function pergaminhos(ctx){
  const S=ctx.S,b=base(S),G=b.G,box=b.box;
// Prateleira dos pergaminhos de Valtheris — espelha a dos tubos nixie do
// outro lado. 22 capítulos (21 sagas de Além do Véu + Sob o Luar); cada
// um só aparece fisicamente quando 'valtheris_read' (gravado pelo
// próprio Valtheris_hub.html) confirma que já foi lido — essa página só
// lê, nunca marca nada como lido.
box([2.5, 0.12, 0.55], G.g, [2.95, 2.25, 3.15]);
const painelPergaminhos = box([2.65, 1.35, 0.12], G.d, [2.95, 2.75, 3.15]);
painelPergaminhos.userData.label = "Prateleira de pergaminhos — sagas de Valtheris lidas";
painelPergaminhos.userData.interactive = "saga-painel";
painelPergaminhos.userData.desc = "22 capítulos: as 21 sagas de Além do Véu da Carne e a Saga 0, Sob o Luar. Cada saga lida em Valtheris vira um pergaminho aqui.";

const SAGAS_VALTHERIS = [
  "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10", "S11",
  "S12", "S13", "S14", "S15", "S16", "S17", "S18", "S19", "S20", "S21",
  "S0_luar"
];
const SLOTS_PERGAMINHO = (() => {
  const slots = [];
  const cols = 11, rows = 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      slots.push([
        2.95 - 1.05 + c * (2.1 / (cols - 1)),
        2.35 + r * 0.22,
        3.03
      ]);
    }
  }
  return slots;
})();

const pergaminhosGrupo = new THREE.Group();
S.add(pergaminhosGrupo);
const pergaminhosNaPrateleira = {}; // { "S1": THREE.Group, ... }
const vazios = {};

function infoSaga(i,lida){const T={0:["Saga I · Despertar nas Profundezas","Leyn Sepet desperta depois de um século preso à pedra por correntes de prata."],21:["Saga 0 · Sob o Luar dos Que Não Descansam","Documento de campanha: Soren, Arin e O Colecionador."]},t=T[i],n=t?t[0]:"Saga "+(i+1)+" · Além do Véu da Carne";
return{interactive:lida?"saga":"saga-vazia",label:n,acao:lida?"lida":"ainda não lida",desc:lida?(t?t[1]:"Uma saga de Valtheris que você já leu. O pergaminho dela está guardado aqui."):"O espaço espera: leia esta saga em Valtheris e o pergaminho aparece aqui."}}
function criarPergaminho(i) {
  const g = new THREE.Group();
  const rolo = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.24, 12),
    new THREE.MeshStandardMaterial({ color: 0xd8c48a, roughness: 0.75, metalness: 0.05 })
  );
  rolo.rotation.z = Math.PI / 2;
  g.add(rolo);
  const fita = new THREE.Mesh(
    new THREE.TorusGeometry(0.052, 0.009, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0xcc4060, roughness: 0.5 })
  );
  fita.rotation.y = Math.PI / 2;
  g.add(fita);
  g.castShadow = g.receiveShadow = true;
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData = infoSaga(i, true);
  return g;
}

function sagasLidas() {
  let lidas = [];
  try { lidas = JSON.parse(localStorage.getItem("valtheris_read") || "[]"); } catch (e) {}
  return Array.isArray(lidas) ? lidas : [];
}

function sincronizarPergaminhos() {
  const lidas = sagasLidas();
  SAGAS_VALTHERIS.forEach((id, i) => {
    const lida = lidas.indexOf(id) !== -1, pos = SLOTS_PERGAMINHO[i];
    if (lida && !pergaminhosNaPrateleira[id]) {
      if (vazios[id]) { pergaminhosGrupo.remove(vazios[id]); delete vazios[id]; }
      const p = criarPergaminho(i); p.position.set(...pos); p.rotation.x = (Math.random() - 0.5) * 0.18;
      pergaminhosGrupo.add(p); pergaminhosNaPrateleira[id] = p;
    } else if (!lida) {
      if (pergaminhosNaPrateleira[id]) { pergaminhosGrupo.remove(pergaminhosNaPrateleira[id]); delete pergaminhosNaPrateleira[id]; }
      if (!vazios[id]) {
        const v = new THREE.Group(), r = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.24, 12), new THREE.MeshStandardMaterial({ color: 0x3a2a30, transparent: true, opacity: 0.35, roughness: 0.9 }));
        r.rotation.z = Math.PI / 2; v.add(r); v.position.set(...pos); v.userData = infoSaga(i, false);
        pergaminhosGrupo.add(v); vazios[id] = v;
      }
    }
  });
  const hud = document.getElementById("pergaminhos-hud");
  if (hud) {
    hud.textContent = "✎ " + lidas.length + "/" + SAGAS_VALTHERIS.length;
    hud.classList.toggle("completo", lidas.length >= SAGAS_VALTHERIS.length);
  }
}
  addEventListener('storage',e=>{if(e.key==='valtheris_read')sincronizarPergaminhos();});
  addEventListener('pageshow',sincronizarPergaminhos);
  sincronizarPergaminhos();
  return {sincronizar:sincronizarPergaminhos};
}
function irmaos(ctx){
  const S=ctx.S,cam=ctx.cam,mobile=innerWidth<700,b=base(S),G=b.G,box=b.box,P=painel(),C=document.querySelector('canvas');
  const _q=new THREE.Quaternion();
  function faceCam(o){S.getWorldQuaternion(_q);_q.invert();o.quaternion.copy(cam.quaternion).premultiply(_q);}
// mas agora em 3 estágios (antes só tinha "faltam fragmentos" /
// "completo"):
//   1. Só aparece quando o fragmento de Recordações é achado — faz
//      sentido ser essa a peça "moldura", já que Recordações é a
//      página de imagens e memórias de jogos.
//   2. Com a moldura na parede mas OOT e/ou MM ainda faltando, cada
//      Irmão (Sol = OOT, Lua = MM) só aparece andando pela sala quando
//      a respectiva parte é achada — antes disso nenhum dos dois
//      existe na cena.
//   3. Quando os 3 já foram achados, interagir com QUALQUER um dos
//      Irmãos os faz caminhar até a moldura e "entrar" nela — só aí a
//      imagem dos dois juntos aparece no quadro, ele fica dourado, e o
//      diálogo funciona como o antigo #cancao-painel completo.
// Nenhuma dessas peças é criada aqui embaixo incondicionalmente — tudo
// é decidido em sincronizarQuadroCancao()/sincronizarIrmaos(), mais
// abaixo, chamadas de cara e de novo a cada storage/pageshow.
let quadroCancaoMoldura = null, notaCancaoMat = null, notaCancao = null, telaIrmaosPng = null;

function criarQuadroCancao() {
  if (quadroCancaoMoldura) return; // já existe
  quadroCancaoMoldura = box([1.55, 1.95, 0.12], G.d, [2.7, 2.2, 4.6]);
  box([1.15, 1.55, 0.06], G.p, [2.7, 2.2, 4.53]);
  box([1.28, 0.07, 0.08], G.g, [2.7, 2.99, 4.5]);
  box([1.28, 0.07, 0.08], G.g, [2.7, 1.41, 4.5]);
  box([0.07, 1.58, 0.08], G.g, [2.06, 2.2, 4.5]);
  box([0.07, 1.58, 0.08], G.g, [3.34, 2.2, 4.5]);
  // a "nota" central do quadro — prateada até a reunião, some (dá lugar
  // ao retrato dos dois) depois — mesma paleta do antigo #cancao-painel
  notaCancaoMat = new THREE.MeshStandardMaterial({
    color: 0xb8b8c0, roughness: 0.3, metalness: 0.5,
    emissive: 0x2a2a30, emissiveIntensity: 0.6
  });
  notaCancao = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 10, 24, Math.PI * 1.4), notaCancaoMat);
  notaCancao.position.set(2.7, 2.22, 4.47);
  notaCancao.rotation.y = Math.PI / 2;
  notaCancao.rotation.z = 0.4;
  S.add(notaCancao);
}

// Só aparece depois que os Irmãos entram na moldura (ver
// iniciarReuniaoIrmaos()) — carrega Assets/irmaos-compositores.png, a
// mesma imagem que o #cancao-painel completo mostrava no nexus.html.
function mostrarRetratoNoQuadro() {
  if (telaIrmaosPng) { telaIrmaosPng.visible = true; return; }
  console.log("mostrarRetratoNoQuadro: carregando ../Assets/irmaos-compositores.png...");
  new THREE.TextureLoader().load(
    "../Assets/irmaos-compositores.png",
    (tex) => {
      console.log("mostrarRetratoNoQuadro: PNG carregada,", tex.image.width + "x" + tex.image.height, "— montando o plano.");
      telaIrmaosPng = new THREE.Mesh(
        new THREE.PlaneGeometry(1.05, 1.45),
        // side: DoubleSide — mesma causa dos tubos nixie espelhados (o
        // plano nasce virado pra +Z local, de costas pra quem entra na
        // sala), só que aqui SEM DoubleSide o material de face única
        // simplesmente não desenha nada por trás — nem espelhado, nem
        // erro nenhum no console: some de vez, exatamente o sintoma.
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
      );
      telaIrmaosPng.position.set(2.7, 2.2, 4.47); // mesmo z da notaCancao que ela substitui — 4.5 competia com a placa opaca atrás (z 4.50–4.56) e perdia
      S.add(telaIrmaosPng);
      console.log("mostrarRetratoNoQuadro: plano adicionado à cena em", telaIrmaosPng.position);
      if (notaCancao) notaCancao.visible = false;
    },
    undefined,
    (err) => {
      // Sem a imagem (caminho errado, arquivo ausente etc.) o quadro
      // não fica vazio — a nota dourada continua visível no lugar dela.
      console.warn('Não consegui carregar ../Assets/irmaos-compositores.png:', err);
    }
  );
}

// Notas musicais subindo perto do quadro — a versão 3D do
// .cancao-notas-fundo (CSS) que existia no #cancao-painel completo do
// nexus.html. Ativa só depois da reunião (ver sincronizarQuadroCancao),
// atualizada a cada quadro em loop() via atualizarNotasSubindo(dt).
let notasSubindoGrupo = null, notasSubindoAtivas = false;
const NOTA_TEXTURA = (() => {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 64;
  const ctx = c.getContext("2d");
  ctx.font = "48px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffd98a";
  ctx.fillText("♪", 32, 36);
  return new THREE.CanvasTexture(c);
})();
function resetarNota(m) {
  m.position.set(2.7 + (Math.random() - 0.5) * 0.85, 1.5 + Math.random() * 0.25, 4.5 + (Math.random() - 0.5) * 0.1);
  m.userData.vidaTotal = 3 + Math.random() * 2;
  m.userData.vida = Math.random() * -1.5;
  m.userData.derivaX = (Math.random() - 0.5) * 0.12;
}
function ativarNotasSubindo() {
  if (notasSubindoAtivas) return;
  notasSubindoAtivas = true;
  notasSubindoGrupo = new THREE.Group();
  const partes = [];
  for (let i = 0; i < 6; i++) {
    const mat = new THREE.MeshBasicMaterial({ map: NOTA_TEXTURA, transparent: true, depthWrite: false, opacity: 0 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.13), mat);
    resetarNota(m);
    notasSubindoGrupo.add(m);
    partes.push(m);
  }
  notasSubindoGrupo.userData.partes = partes;
  S.add(notasSubindoGrupo);
}
function atualizarNotasSubindo(dt) {
  if (!notasSubindoAtivas) return;
  notasSubindoGrupo.userData.partes.forEach((m) => {
    m.userData.vida += dt;
    if (m.userData.vida < 0) { m.material.opacity = 0; return; }
    const k = m.userData.vida / m.userData.vidaTotal;
    if (k >= 1) { resetarNota(m); return; }
    m.position.y += dt * 0.3;
    m.position.x += m.userData.derivaX * dt;
    faceCam(m);
    m.material.opacity = k < 0.15 ? k / 0.15 : (k > 0.8 ? (1 - k) / 0.2 : 1);
  });
}

function aplicarCorQuadro(dourado) {
  if (!notaCancaoMat) return;
  if (dourado) {
    notaCancaoMat.color.setHex(0xffd98a);
    notaCancaoMat.emissive.setHex(0xffb84a);
    notaCancaoMat.emissiveIntensity = 1.8;
  } else {
    notaCancaoMat.color.setHex(0xb8b8c0);
    notaCancaoMat.emissive.setHex(0x2a2a30);
    notaCancaoMat.emissiveIntensity = 0.6;
  }
}

// ── Progresso da Canção da Tempestade — Lib/cancao-tempestade.js
// (mesmo script que OOT.html/MM.html/Recordações usam) cria sozinho um
// ícone flutuante (#cancao-painel) assim que carrega; a regra no CSS,
// lá em cima, esconde esse ícone (a nave só quer a API NexusCancao por
// baixo, o quadro na parede é quem mostra o progresso agora). Funções
// abaixo são só uma casca fina em cima dela, com fallback se o script
// não tiver carregado por algum motivo. ──
function progressoCancao() { return window.NexusCancao ? NexusCancao.progresso() : 0; }
function cancaoCompleta() { return !!(window.NexusCancao && NexusCancao.completaTudo()); }
function cancaoJaOuvida() { return !!(window.NexusCancao && NexusCancao.cancaoJaOuvida()); }
function marcarCancaoOuvida() { if (window.NexusCancao) NexusCancao.marcarCancaoOuvida(); }
function irmaosJaImpressionados() { return !!(window.NexusCancao && NexusCancao.irmaosJaImpressionados()); }
function marcarConversouComIrmaos() { if (window.NexusCancao) NexusCancao.marcarConversouComIrmaos(); }

// Estado extra que só existe aqui na nave (o #cancao-painel do
// nexus.html não tinha esse conceito): se os dois Irmãos já andaram
// até a moldura e "entraram" nela. Fica marcado pra sempre depois da
// primeira vez — nas próximas visitas a reunião já aparece pronta.
const CHAVE_REUNIAO_ESTACAO = "nexus_irmaos_reuniao_estacao";
function reuniaoJaAconteceu() {
  try { return localStorage.getItem(CHAVE_REUNIAO_ESTACAO) === "1"; } catch (e) { return false; }
}
function marcarReuniaoAconteceu() {
  try { localStorage.setItem(CHAVE_REUNIAO_ESTACAO, "1"); } catch (e) {}
}

let audioCancaoIrmaos = null;
const CANCAO_IRMAOS_SRC = "../Tloz/music/Song of Storms (Zelda's Vocal OST Extended Remix).mp3"; // mesmo arquivo referenciado em MM.html
function cancaoIrmaosTocando() {
  return !!(audioCancaoIrmaos && !audioCancaoIrmaos.paused && !audioCancaoIrmaos.ended);
}
// Mesmo registro global que nexus.html usa pra silenciar tudo durante o
// confronto do M.A.L.I.K. (window.NexusAudioRegistro / drillAudio lá) —
// sem isso, essa música tocando dentro da nave não seria cortada se um
// silêncio total fosse pedido.
window.NexusAudioRegistro = window.NexusAudioRegistro || [];
function tocarCancaoIrmaos() {
  try {
    if (!audioCancaoIrmaos) {
      audioCancaoIrmaos = new Audio(CANCAO_IRMAOS_SRC);
      audioCancaoIrmaos.addEventListener("ended", marcarCancaoOuvida);
      window.NexusAudioRegistro.push(function () { audioCancaoIrmaos.pause(); });
    }
    if (audioCancaoIrmaos.ended) audioCancaoIrmaos.currentTime = 0;
    audioCancaoIrmaos.volume = 0.8;
    audioCancaoIrmaos.play().catch(() => {});
  } catch (e) {}
}

// Mesmo texto/fluxo de iniciarDialogo() do antigo #cancao-painel do
// nexus.html — só ficaram de fora os cruzamentos com a broca/despertar
// (aoTempestadeEspiralDisparar, aoBrocaComecouATocar): aquilo só existia
// porque o painel vivia na MESMA página do drill 3D; aqui dentro da
// nave os dois nunca poderiam tocar ao mesmo tempo, então não fazem
// sentido mais. A resposta pra quem já tocou a sequência secreta no
// Nexus mudou: como os Irmãos não têm mais como reagir na hora lá no
// hub (o painel saiu de lá), agora eles perguntam sobre isso aqui.
function dialogoIrmaosHTML() {
  // malik-cicatriz.js (no nexus.html) guarda essa chave quando o
  // viajante clica numa página quebrada — antes isso abria o painel na
  // hora, lá no hub; sem painel lá, a dica só aparece na próxima vez
  // que o quadro é aberto aqui dentro da nave.
  let pistaPendente = false;
  try { pistaPendente = localStorage.getItem("nexus_irmaos_pista_pendente") === "1"; } catch (e) {}
  if (pistaPendente) {
    try { localStorage.removeItem("nexus_irmaos_pista_pendente"); } catch (e) {}
    return "<p>Procure o guerreiro do crepúsculo, ele pode te ajudar com isso.</p>";
  }
  if (cancaoIrmaosTocando()) return "<p>A canção já está tocando.</p>";
  if (irmaosJaImpressionados()) {
    return "<p>Ouvimos você tocar nossa música, aconteceu algo interessante?</p>";
  }
  // Já ouviu a canção (escolheu SIM antes) mas ainda não tocou a
  // sequência secreta de verdade no Nexus — essa dica tinha se perdido
  // numa correção anterior.
  if (cancaoJaOuvida()) {
    return "<p>Ei, tente tocar nossa canção aqui no Nexus, você já a conhece, não precisa de mais instruções.</p>";
  }
  return (
    "<p><em>Sharp e Flat</em> — você nos trouxe de volta um para o outro. Depois de tanto tempo separados, finalmente estamos juntos de novo — e é graças a você.</p>" +
    "<p>Gostaria de ouvir a canção que nos uniu?</p>" +
    '<div class="song"><button id="cancao-sim">SIM</button><button id="cancao-nao">NÃO</button></div>'
  );
}
function ligarBotoesDialogoIrmaos() {
  const alvo = document.getElementById("cancao-dialogo-nave");
  const btnSim = document.getElementById("cancao-sim");
  const btnNao = document.getElementById("cancao-nao");
  if (btnSim) btnSim.onclick = () => {
    alvo.innerHTML = "<p>A melodia começa a soar, como há muito tempo não soava.</p>";
    tocarCancaoIrmaos();
    // reação quando a música termina de tocar de verdade, se o painel
    // ainda estiver aberto nessa hora (se já foi fechado, o
    // marcarCancaoOuvida de sempre continua rodando sozinho)
    audioCancaoIrmaos.addEventListener("ended", function aoTerminarDeVerdade() {
      audioCancaoIrmaos.removeEventListener("ended", aoTerminarDeVerdade);
      const aindaAberto = document.getElementById("cancao-dialogo-nave");
      if (aindaAberto) {
        aindaAberto.innerHTML = "<p>Foi com essa canção que aprendemos a confiar de novo um no outro. Obrigado por ouvir até o fim.</p>";
      }
    });
  };
  if (btnNao) btnNao.onclick = () => {
    alvo.innerHTML = "<p>Tudo bem. Boa viagem, viajante — e obrigado, por tudo.</p>";
    setTimeout(fecharPainel, 2600);
  };
}

// Cria/atualiza a moldura e decide o que ela mostra: nada (Recordações
// ainda não achada), prateada com o progresso (moldura achada, faltam
// peças ou reunião pendente) ou dourada com o retrato (já reunidos).
function sincronizarQuadroCancao() {
  const recordacoesAchada = !!(window.NexusCancao && NexusCancao.estaCompleta("recordacoes"));
  if (!recordacoesAchada) return; // a moldura em si ainda nem existe
  criarQuadroCancao();

  const reunidos = reuniaoJaAconteceu();
  if (reunidos) {
    quadroCancaoMoldura.userData.label = "Irmãos Compositores reunidos";
    quadroCancaoMoldura.userData.interactive = "cancao";
    quadroCancaoMoldura.userData.acao = "Ver os Irmãos Compositores";
    aplicarCorQuadro(true);
    mostrarRetratoNoQuadro();
    ativarNotasSubindo();
  } else {
    const progresso = progressoCancao();
    quadroCancaoMoldura.userData.label = cancaoCompleta()
      ? "Canção da Tempestade — os Irmãos ainda não se reencontraram"
      : "Canção da Tempestade — " + progresso + "/3 fragmentos";
    quadroCancaoMoldura.userData.interactive = null; // só abre depois da reunião
    aplicarCorQuadro(false);
  }
}

// ── Os dois Irmãos — cada um só existe na cena se a parte dele já foi
// achada (Sol = OOT, Lua = MM), e nenhum dos dois existe mais depois
// da reunião. ASSUMINDO CHARS[0] ('a', irmaos-fantasma.js) = Sol e
// CHARS[1] ('b') = Lua — não dá pra confirmar isso pelos dados do rig;
// se estiver trocado, é só inverter os dois IDs abaixo. ──
const ID_IRMAO_SOL = "a";
const ID_IRMAO_LUA = "b";
let irmaoSol = null, irmaoLua = null;
const irmaos = []; // só os que estão de fato andando pela sala agora

function canvasDoIrmao(id) {
  if (!window.NexusIrmaosFantasma) return null;
  return id === "a" ? NexusIrmaosFantasma.canvasA : NexusIrmaosFantasma.canvasB;
}
function criarIrmaoBillboard(canvas, x, z, ph) {
  const aspecto = canvas.width / canvas.height;
  const altura = 1.7, largura = altura * aspecto;
  const tex = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(largura, altura),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false })
  );
  mesh.position.set(x, 1.25, z);
  mesh.userData = { x, z, ph, tex };
  S.add(mesh);
  irmaos.push(mesh);
  return mesh;
}
function removerIrmaoDaSala(mesh) {
  if (!mesh) return;
  S.remove(mesh);
  const idx = irmaos.indexOf(mesh);
  if (idx !== -1) irmaos.splice(idx, 1);
}

function sincronizarIrmaos() {
  if (reuniaoJaAconteceu()) {
    if (irmaoSol) { removerIrmaoDaSala(irmaoSol); irmaoSol = null; }
    if (irmaoLua) { removerIrmaoDaSala(irmaoLua); irmaoLua = null; }
    return;
  }
  if (!window.NexusCancao) return;
  if (!irmaoSol && NexusCancao.estaCompleta("oot")) {
    const canvas = canvasDoIrmao(ID_IRMAO_SOL);
    if (canvas) irmaoSol = criarIrmaoBillboard(canvas, -3.2, 1.2, 0);
  }
  if (!irmaoLua && NexusCancao.estaCompleta("mm")) {
    const canvas = canvasDoIrmao(ID_IRMAO_LUA);
    if (canvas) irmaoLua = criarIrmaoBillboard(canvas, 3.1, 2.4, 2.3);
  }
  // só ficam "interagíveis" (dá pra reunir com E) quando os 3 já
  // foram achados — antes disso são só decoração andando pela sala
  const podeReunir = NexusCancao.completaTudo();
  [irmaoSol, irmaoLua].forEach((m, i) => {
    if (!m) return;
    m.userData.label = i === 0 ? "Sharp — Irmão do Sol" : "Flat — Irmão da Lua";
    m.userData.interactive = podeReunir ? "irmao" : null;
    m.userData.acao = "Reunir os Irmãos Compositores";
  });
}

// Os dois caminham até a moldura e "entram" nela — depois disso somem
// de vez da sala (ver sincronizarIrmaos acima) e o quadro vira dourado
// com o retrato (ver sincronizarQuadroCancao).
function iniciarReuniaoIrmaos() {
  const membros = [irmaoSol, irmaoLua].filter(Boolean);
  if (!membros.length) return;
  membros.forEach((m) => {
    const idx = irmaos.indexOf(m);
    if (idx !== -1) irmaos.splice(idx, 1); // sai da deriva — a animação abaixo assume a posição
  });
  const partida = membros.map((m) => ({ mesh: m, x0: m.position.x, y0: m.position.y, z0: m.position.z }));
  const alvo = { x: 2.7, y: 2.2, z: 4.55 };
  const t0 = performance.now(), duracao = 2200;
  (function anima() {
    const t = Math.min(1, (performance.now() - t0) / duracao);
    const k = t * t * (3 - 2 * t); // smoothstep
    partida.forEach((p) => {
      p.mesh.position.set(
        p.x0 + (alvo.x - p.x0) * k,
        p.y0 + (alvo.y - p.y0) * k,
        p.z0 + (alvo.z - p.z0) * k
      );
      p.mesh.scale.setScalar(1 - 0.85 * k);
      faceCam(p.mesh);
    });
    if (t < 1) {
      requestAnimationFrame(anima);
    } else {
      membros.forEach((m) => S.remove(m));
      irmaoSol = null;
      irmaoLua = null;
      marcarReuniaoAconteceu();
      sincronizarQuadroCancao();
    }
  })();
}

function sincronizarTudo() {
  try { sincronizarQuadroCancao(); } catch (e) { window.NaveErro && window.NaveErro(e); }
  try { sincronizarIrmaos(); } catch (e) { window.NaveErro && window.NaveErro(e); }
}
sincronizarTudo();
window.addEventListener("storage", (e) => {
  if (e.key === "nexus_cancao_tempestade_v1") sincronizarTudo();
});
window.addEventListener("pageshow", sincronizarTudo);
  let tempo=0;
  function atualizar(dt){
   try{
    tempo+=dt;
    if(window.NexusIrmaosFantasma)window.NexusIrmaosFantasma.atualizar(dt);
    atualizarNotasSubindo(dt);
    irmaos.forEach(function(g){
      g.position.x=g.userData.x+Math.sin(tempo*0.35+g.userData.ph)*0.55;
      g.position.z=g.userData.z+Math.cos(tempo*0.28+g.userData.ph)*0.4;
      g.position.y=1.25+Math.sin(tempo*0.9+g.userData.ph)*0.08;
      faceCam(g);g.userData.tex.needsUpdate=true;
    });
   }catch(e){window.NaveErro&&window.NaveErro(e);}
  }
  function interagir(tipo){
    if(tipo==='irmao'){iniciarReuniaoIrmaos();return;}
    if(tipo==='cancao'){
      marcarConversouComIrmaos();P.style.display='block';
      P.innerHTML='<button class="close">FECHAR</button><h2>♪ SHARP &amp; FLAT</h2><div id="cancao-dialogo-nave">'+dialogoIrmaosHTML()+'</div>';
      P.querySelector('.close').onclick=fecharPainel;ligarBotoesDialogoIrmaos();
    }
  }
  return {atualizar:atualizar,interagir:interagir,musica:tocarCancaoIrmaos,tocando:cancaoIrmaosTocando,parar:function(){try{if(audioCancaoIrmaos)audioCancaoIrmaos.pause();}catch(e){}}};
}

/* ───────── extras compartilhados pelas salas ───────── */
function estadoMapa(){ // mesmo mecanismo do Mapa Nexus: localStorage "nexusMapaEstado_v2" → nodes[].visitado
  try{const d=JSON.parse(localStorage.getItem("nexusMapaEstado_v2")||"null");if(!d||!d.nodes)return null;
    return ["zelda","valtheris","diary","book","icaro","origem","covers","recordacoes","mal"].map(id=>{const n=d.nodes.find(x=>x.id===id);return n&&n.visitado?2:0});}catch(e){return null;}
}
function mouse(cv,o){ // mouse livre: pointer lock; Esc (do navegador) solta
  const mira=document.createElement("div");mira.style.cssText="position:fixed;left:50%;top:50%;width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;background:#cfd6ff;box-shadow:0 0 6px #6a7cff;opacity:0;pointer-events:none;z-index:6;transition:opacity .2s";document.body.appendChild(mira);
  let t=false;
  document.addEventListener("pointerlockchange",function(){t=document.pointerLockElement===cv;mira.style.opacity=t?.9:0;if(o.aoTravar)o.aoTravar(t);if(window.NaveLimparTeclas)window.NaveLimparTeclas();});
  addEventListener("pointermove",function(e){if(t)o.aoMover(e.movementX,e.movementY);},true);
  return{travado:function(){return t;},travar:function(){try{cv.requestPointerLock();}catch(e){}}};
}
function ambiente(tipo,opts){
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return{volume:function(){}};
  const vol0=(opts&&typeof opts.volume==="number")?opts.volume:.55;
  let ac=null,mestre=null;const rn=(a,b)=>a+Math.random()*(b-a);
  function ruido(tf,fq,q,g){const n=2*ac.sampleRate,buf=ac.createBuffer(1,n,ac.sampleRate),d=buf.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;
    const s=ac.createBufferSource();s.buffer=buf;s.loop=true;const f=ac.createBiquadFilter();f.type=tf;f.frequency.value=fq;f.Q.value=q||1;const gg=ac.createGain();gg.gain.value=g;s.connect(f);f.connect(gg);gg.connect(mestre);s.start();return gg;}
  function dron(fs,g,lfo,prof,tp){fs.forEach(function(fq){const o=ac.createOscillator(),gg=ac.createGain();o.type=tp||"sine";o.frequency.value=fq;gg.gain.value=g/fs.length;
    if(lfo){const l=ac.createOscillator(),lg=ac.createGain();l.frequency.value=lfo*rn(.8,1.2);lg.gain.value=g/fs.length*prof;l.connect(lg);lg.connect(gg.gain);l.start();}
    o.connect(gg);gg.connect(mestre);o.start();});}
  function bip(fq,dur,g,tp,fim){const t=ac.currentTime,o=ac.createOscillator(),gg=ac.createGain();o.type=tp||"sine";o.frequency.setValueAtTime(fq,t);if(fim)o.frequency.exponentialRampToValueAtTime(fim,t+dur);
    gg.gain.setValueAtTime(.0001,t);gg.gain.exponentialRampToValueAtTime(g,t+Math.min(.02,dur/3));gg.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(gg);gg.connect(mestre);o.start(t);o.stop(t+dur+.05);}
  function rajada(dur,fq,q,g){const n=Math.floor(ac.sampleRate*dur),buf=ac.createBuffer(1,n,ac.sampleRate),d=buf.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);
    const s=ac.createBufferSource();s.buffer=buf;const f=ac.createBiquadFilter();f.type="bandpass";f.frequency.value=fq;f.Q.value=q;const gg=ac.createGain();gg.gain.value=g;s.connect(f);f.connect(gg);gg.connect(mestre);s.start();}
  function cada(fn,a,b){const f=function(){if(ac.state==="running")fn();setTimeout(f,rn(a,b));};setTimeout(f,rn(a,b));}
  const P={
    mirante:function(){dron([55,82.4],.5,.05,.4);ruido("lowpass",260,.7,.05);cada(function(){bip(rn(1500,2600),.06,.012);},6000,14000);},
    salao:function(){dron([110,164.8,220],.35,.08,.4);ruido("lowpass",300,.7,.025);cada(function(){bip(rn(700,1100),.18,.012,"sine");},1300,2600);},
    cancoes:function(){dron([98,147,196,294],.4,.25,.3,"triangle");ruido("bandpass",800,2,.012);},
    galeria:function(){dron([73.4,110],.25,.06,.4);cada(function(){rajada(.25,3500,.7,.03);},3000,8000);},
    comum:function(){dron([110,138.6],.18,.07,.4);ruido("lowpass",400,.7,.04);cada(function(){bip(1800,.03,.02,"square");},1000,1000);},
    corredor:function(){dron([50,100],.35,0,0,"sawtooth");dron([40],.4,.3,.5);cada(function(){rajada(rn(.05,.35),rn(2000,6000),.5,.07);},2500,7000);cada(function(){bip(rn(300,1500),.05,.04,"square");},3000,9000);},
    broca:function(){ruido("lowpass",130,.8,.14);dron([45,67],.4,2.5,.5);cada(function(){bip(rn(180,320),.5,.03,"sawtooth",rn(100,200));},4000,9000);},
    dossie:function(){ruido("highpass",1500,.6,.045);dron([55],.12,.05,.4);cada(function(){bip(2200,.015,.03,"square");},1000,1000);},
    cabine:function(){dron([110],.08,.05,.4);ruido("lowpass",200,.7,.02);cada(function(){for(let i=0;i<3;i++)setTimeout(function(){bip(rn(3800,4300),.04,.01);},i*70);},700,1800);},
    porao:function(){dron([36,54],.6,.1,.5);cada(function(){bip(60,.2,.2,"sine",40);setTimeout(function(){bip(55,.2,.16,"sine",38);},180);},1200,1200);cada(function(){bip(rn(500,900),.1,.03,"sine",250);},2500,6000);}
  };
  function iniciar(){if(ac)return;try{ac=new AC();mestre=ac.createGain();mestre.gain.value=vol0;mestre.connect(ac.destination);(P[tipo]||P.salao)();
    window.NexusAudioRegistro=window.NexusAudioRegistro||[];window.NexusAudioRegistro.push(function(){try{ac.suspend();}catch(e){}});}catch(e){}}
  function retomar(){iniciar();if(ac&&ac.state==="suspended")ac.resume();["pointerdown","keydown"].forEach(function(ev){removeEventListener(ev,retomar,true);});}
  iniciar();["pointerdown","keydown"].forEach(function(ev){addEventListener(ev,retomar,true);});
  // controle do volume geral do ambiente (ex.: baixar enquanto uma música toca na sala)
  return{volume:function(v,seg){if(!ac||!mestre)return;try{mestre.gain.cancelScheduledValues(ac.currentTime);mestre.gain.setTargetAtTime(v,ac.currentTime,seg||.6);}catch(e){}}};
}
function ceu(scene,opts){ // constelações reais: ascensão reta (h) e declinação (°) de J2000
  const T=THREE,R0=(opts&&opts.raio)||850,AZ="#b4ceff",LJ="#ffb27a";
  const S={bet:[5.919,7.407,.5,LJ],rig:[5.242,-8.202,.13,"#a8c8ff"],bel:[5.419,6.35,1.6,AZ],sai:[5.796,-9.67,2.1,AZ],aln:[5.679,-1.943,1.7,AZ],alm:[5.603,-1.202,1.7,AZ],min:[5.533,-.299,2.2,AZ],mei:[5.585,9.934,3.4,AZ],
    acr:[12.443,-63.099,.8,AZ],mim:[12.795,-59.689,1.3,AZ],gac:[12.519,-57.113,1.6,LJ],dcr:[12.252,-58.749,2.8,AZ],alc:[14.66,-60.834,0,"#ffe9b0"],had:[14.064,-60.373,.6,AZ],
    dub:[11.062,61.751,1.8,"#ffe0a0"],mer:[11.031,56.382,2.3,"#fff"],phe:[11.897,53.695,2.4,"#fff"],meg:[12.257,57.033,3.3,"#fff"],ali:[12.9,55.96,1.8,"#fff"],miz:[13.399,54.925,2.2,"#fff"],alk:[13.792,49.313,1.9,AZ],
    sch:[.675,56.537,2.2,LJ],cph:[.153,59.15,2.3,"#fff4d0"],gca:[.945,60.717,2.5,AZ],rch:[1.43,60.235,2.7,"#fff"],seg:[1.907,63.67,3.4,AZ],
    acb:[16.091,-19.805,2.6,AZ],dsc:[16.005,-22.622,2.3,AZ],ant:[16.49,-26.432,1,"#ff8a6a"],eps:[16.836,-34.293,2.3,LJ],mu1:[16.864,-38.047,3,AZ],sar:[17.622,-42.998,1.9,"#ffe9b0"],sha:[17.56,-37.104,1.6,AZ],les:[17.531,-37.296,2.7,AZ],
    sir:[6.752,-16.716,-1.46,"#e6f0ff"],mir:[6.378,-17.956,2,AZ],ada:[6.977,-28.972,1.5,AZ],wez:[7.14,-26.393,1.8,"#fff4d0"],alu:[7.403,-29.303,2.4,AZ],
    reg:[10.14,11.967,1.4,AZ],den:[11.818,14.572,2.1,"#fff"],alg:[10.333,19.842,2.3,LJ],zos:[11.235,20.524,2.6,"#fff"],cht:[11.237,15.43,3.3,"#fff"],eta:[10.122,16.763,3.5,"#fff"],adh:[10.278,23.417,3.4,"#fff"],ras:[9.879,26.007,3.4,"#fff"],
    dne:[20.69,45.28,1.25,"#fff"],sad:[20.37,40.257,2.2,"#fff4d0"],alb:[19.512,27.96,3.1,LJ],gie:[20.77,33.97,2.5,AZ],dcy:[19.75,45.131,2.9,AZ],
    veg:[18.616,38.784,.03,"#e6f0ff"],shl:[18.835,33.363,3.5,AZ],sul:[18.982,32.69,3.3,AZ],d2l:[18.909,36.899,4.3,"#fff"],z1l:[18.746,37.605,4.3,"#fff"],
    ald:[4.599,16.509,.85,LJ],ple:[3.791,24.105,2.9,AZ],cno:[6.399,-52.696,-.74,"#fff4d0"],ach:[1.629,-57.237,.46,AZ],fom:[22.961,-29.622,1.2,"#fff"],spi:[13.42,-11.161,1,AZ],arc:[14.261,19.182,-.05,LJ],pro:[7.655,5.225,.4,"#fff4d0"],cap:[5.278,45.998,.08,"#ffe0a0"],alt:[19.846,8.868,.76,"#fff"],pol:[7.755,28.026,1.14,"#ffe0a0"],cas:[7.577,31.889,1.6,"#fff"],pla:[2.53,89.264,2,"#ffe9b0"]};
  const CN=[["Órion","bet bel aln alm min rig sai mei","mei-bet mei-bel bet-aln bel-min aln-alm alm-min aln-sai min-rig"],["Cruzeiro do Sul","acr mim gac dcr","acr-gac mim-dcr"],
    ["Ursa Maior","dub mer phe meg ali miz alk","dub-mer mer-phe phe-meg meg-dub meg-ali ali-miz miz-alk"],["Cassiopeia","cph sch gca rch seg","cph-sch sch-gca gca-rch rch-seg"],
    ["Escorpião","acb dsc ant eps mu1 sar sha les","acb-dsc dsc-ant ant-eps eps-mu1 mu1-sar sar-sha sha-les"],["Cão Maior","mir sir wez ada alu","mir-sir sir-wez wez-ada wez-alu"],
    ["Leão","ras adh alg eta reg zos den cht","ras-adh adh-alg alg-eta eta-reg alg-zos zos-den zos-cht cht-reg"],["Cisne","dne sad alb gie dcy","dne-sad sad-alb dcy-sad sad-gie"],["Lira","veg z1l d2l sul shl","veg-z1l z1l-d2l d2l-sul sul-shl shl-z1l"]];
  const s3=function(k){const s=S[k],a=s[0]*Math.PI/12,d=s[1]*Math.PI/180;return new T.Vector3(Math.cos(d)*Math.cos(a),Math.sin(d),-Math.cos(d)*Math.sin(a));};
  const f=new T.Vector3(Math.cos(-.017)*Math.cos(5.6*Math.PI/12),Math.sin(-.017),-Math.cos(-.017)*Math.sin(5.6*Math.PI/12)),nort=new T.Vector3(0,1,0);
  const n=nort.clone().sub(f.clone().multiplyScalar(nort.dot(f))).normalize(),e3=new T.Vector3().crossVectors(f,n);
  const A=new T.Matrix4().makeBasis(f,n,e3),B=new T.Matrix4().makeBasis(new T.Vector3(0,0,1),new T.Vector3(0,1,0),new T.Vector3(-1,0,0));
  const q=new T.Quaternion().setFromRotationMatrix(B.multiply(A.transpose()));
  const P=function(k){return s3(k).applyQuaternion(q).multiplyScalar(R0);};
  const bk=[[],[],[]];Object.keys(S).forEach(function(k){const m=S[k][2];bk[m<1?0:m<2.2?1:2].push(k);});
  [5.5,4,2.8].forEach(function(sz,bi){const ks=bk[bi],pos=new Float32Array(ks.length*3),col=new Float32Array(ks.length*3);
    ks.forEach(function(k,i){const p=P(k),c=new T.Color(S[k][3]);pos.set([p.x,p.y,p.z],i*3);col.set([c.r,c.g,c.b],i*3);});
    const g=new T.BufferGeometry();g.setAttribute("position",new T.BufferAttribute(pos,3));g.setAttribute("color",new T.BufferAttribute(col,3));
    scene.add(new T.Points(g,new T.PointsMaterial({size:sz,sizeAttenuation:false,vertexColors:true,fog:false,depthWrite:false})));});
  const seg=[];CN.forEach(function(c){c[2].split(" ").forEach(function(pr){const ab=pr.split("-"),a=P(ab[0]),b=P(ab[1]);seg.push(a.x,a.y,a.z,b.x,b.y,b.z);});});
  const lg=new T.BufferGeometry();lg.setAttribute("position",new T.BufferAttribute(new Float32Array(seg),3));
  scene.add(new T.LineSegments(lg,new T.LineBasicMaterial({color:0x8fa4ff,transparent:true,opacity:.3,fog:false})));
  CN.forEach(function(c){const ks=c[1].split(" "),m=new T.Vector3();ks.forEach(function(k){m.add(P(k));});m.divideScalar(ks.length).setLength(R0*.98);
    const cn=document.createElement("canvas");cn.width=256;cn.height=64;const x=cn.getContext("2d");x.font="italic 30px Georgia,serif";x.textAlign="center";x.fillStyle="#cfd6ff";x.fillText(c[0],128,40);
    const sp=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(cn),transparent:true,opacity:.5,depthWrite:false,fog:false}));sp.scale.set(130,32,1);sp.position.copy(m).add(new T.Vector3(0,-45,0));scene.add(sp);});
}
window.NaveSistemas={estadoMapa:estadoMapa,mouse:mouse,ambiente:ambiente,ceu:ceu,alinhar:alinhar,abrirMapa:abrirMapa,painel:painel,nixie:nixie,pergaminhos:pergaminhos,irmaos:irmaos};
})();
