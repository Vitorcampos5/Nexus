/* nave-simbolos.js — os símbolos 3D dos universos, copiados literalmente do nexus.html (SISTEMA ORBITAL). */
(function(){
'use strict';
const THREE=window.THREE;
const sc = 0.85; // canônico e fixo — responsividade aplicada via group.scale, não na geometria

function stdMat(color, emissive, ei) {
  return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: ei !== undefined ? ei : 0.65, roughness: 0.38, metalness: 0.72, side: THREE.DoubleSide });
}

function ext(shape, depth, bevel, curveSegments) {
  depth  = depth  !== undefined ? depth  : 0.22;
  bevel  = bevel  !== undefined ? bevel  : true;
  const opts = { depth, bevelEnabled: bevel, bevelThickness: bevel ? 0.04 : 0, bevelSize: bevel ? 0.02 : 0, bevelSegments: bevel ? 2 : 0 };
  if (curveSegments !== undefined) opts.curveSegments = curveSegments; // só usado onde uma curva vai ser esticada bem além do tamanho de repouso (ex.: pupila de Valtheris)
  return new THREE.ExtrudeGeometry(shape, opts);
}

/* ── ZELDA: Triforce ── */
function createTriforce() {
  const group = new THREE.Group();
  // Base: pedra cinza. Hover: dourada (via setHover)
  const m   = stdMat(0x848488, 0x404044, 0.38);
  const R   = 0.50 * sc;
  const SQ3 = Math.sqrt(3);
  // Triângulo equilátero: todos os vértices a distância R do centróide
  function tri(cx, cy) {
    const s = new THREE.Shape();
    s.moveTo(cx,             cy + R);           // topo
    s.lineTo(cx + R*SQ3/2,  cy - R/2);         // baixo-dir
    s.lineTo(cx - R*SQ3/2,  cy - R/2);         // baixo-esq
    s.closePath();
    return new THREE.Mesh(ext(s, 0.22), m);
  }
  // Centros nos vértices de um triângulo equilátero de circumradius R
  // → os três triângulos se encaixam sem lacunas nem sobreposições
  group.add(tri(0,           R));    // topo
  group.add(tri(-R*SQ3/2,  -R/2)); // baixo-esq
  group.add(tri( R*SQ3/2,  -R/2)); // baixo-dir
  return group;
}

/* ── VALTHERIS: Olho ── */
function createValtherisEye() {
  const group = new THREE.Group();
  const s0 = sc * 1.02;
  const outer = new THREE.Shape();
  outer.moveTo(-1.05*s0, 0);
  outer.bezierCurveTo(-1.05*s0, 0.60*s0, 0, 0.82*s0, 1.05*s0, 0);
  outer.bezierCurveTo(0, -0.82*s0, -1.05*s0, -0.60*s0, -1.05*s0, 0);
  const ih = new THREE.Path(); ih.absellipse(0, 0, 0.56*s0, 0.56*s0, 0, Math.PI*2, false);
  outer.holes.push(ih);
  group.add(new THREE.Mesh(ext(outer, 0.12, false, 48), stdMat(0x7A1428, 0x4A0818, 0.55)));

  // Buraco (ih/ph) e peça que o cobre (iris/pupila) usam de propósito o
  // MESMO raio — encolher o buraco pra "sobrepor" resolve o z-fighting da
  // parede cilíndrica na borda, mas cria um novo: as faces de FUNDO de
  // outer e iris (ambas nascem em z=0) passam a se sobrepor em área, o que
  // também pisca — só que só fica visível olhando o objeto por trás
  // (durante a rotação/órbita), daí o "some de um lado e não do outro".
  // O jeito certo é não mexer no raio: dar às camadas internas um
  // polygonOffset negativo, que resolve o empate de profundidade sem
  // alterar geometria nenhuma — vale de qualquer ângulo, frente ou verso.
  const irisMat = stdMat(0xCC4060, 0x9A2040);
  irisMat.polygonOffset = true; irisMat.polygonOffsetFactor = -1; irisMat.polygonOffsetUnits = -1;
  const iris = new THREE.Shape(); iris.absellipse(0, 0, 0.56*s0, 0.56*s0, 0, Math.PI*2, false);
  const ph = new THREE.Path(); ph.absellipse(0, 0, 0.21*s0, 0.42*s0, 0, Math.PI*2, false);
  iris.holes.push(ph);
  group.add(new THREE.Mesh(ext(iris, 0.15, false, 48), irisMat));

  // curveSegments mais alto aqui é o que importa de verdade: a pupila estica até
  // ~2.9x no clique (ver triggerValtheris), e com os 12 segmentos padrão do
  // ExtrudeGeometry isso fica visivelmente poligonal — "pixels" maiores que os
  // do resto do olho, que nunca é esticado.
  const pupilMat = stdMat(0x08010F, 0x040008, 0.05);
  pupilMat.polygonOffset = true; pupilMat.polygonOffsetFactor = -2; pupilMat.polygonOffsetUnits = -2;
  const pupil = new THREE.Shape(); pupil.absellipse(0, 0, 0.21*s0, 0.42*s0, 0, Math.PI*2, false);
  group.add(new THREE.Mesh(ext(pupil, 0.20, false, 48), pupilMat));
  // children[2] = pupila — usado na animação de dilatação
  return group;
}

/* ── DIÁRIO: Rosa dos Ventos ── */
function createCompassRose() {
  const group = new THREE.Group();
  const m = stdMat(0x9A6A20, 0x6A4010);
  [[0,1.0*sc],[180,1.0*sc],[90,0.80*sc],[270,0.80*sc]].forEach(function(pair) {
    var deg = pair[0], len = pair[1];
    const s = new THREE.Shape();
    s.moveTo(-0.13*sc, 0.08*sc); s.lineTo(0, len); s.lineTo(0.13*sc, 0.08*sc); s.lineTo(0, 0.32*sc); s.closePath();
    const mesh = new THREE.Mesh(ext(s, 0.18), m);
    mesh.rotation.z = -deg*Math.PI/180; group.add(mesh);
  });
  [45,135,225,315].forEach(function(deg) {
    const s = new THREE.Shape();
    s.moveTo(-0.085*sc,0.05*sc); s.lineTo(0,0.60*sc); s.lineTo(0.085*sc,0.05*sc); s.lineTo(0,0.22*sc); s.closePath();
    const mesh = new THREE.Mesh(ext(s,0.10,false), stdMat(0x9A6A20,0x4A3008,0.28));
    mesh.rotation.z = -deg*Math.PI/180; group.add(mesh);
  });
  const cs = new THREE.Shape(); cs.absellipse(0,0,0.13*sc,0.13*sc,0,Math.PI*2,false);
  group.add(new THREE.Mesh(ext(cs,0.28,false), stdMat(0xE8B86D,0xA07828)));
  return group;
}

/* ── LIVRO: Incessans Aestimandi ── */
function createBook() {
  const group = new THREE.Group();
  const m = stdMat(0x3A6080, 0x1A3848);
  function page(sg) {
    const s = new THREE.Shape();
    s.moveTo(0, 0.82*sc);
    s.bezierCurveTo(sg*0.30*sc, 0.80*sc, sg*0.90*sc, 0.90*sc, sg*1.05*sc, 0.84*sc);
    s.lineTo(sg*1.05*sc, -0.84*sc);
    s.bezierCurveTo(sg*0.90*sc, -0.90*sc, sg*0.30*sc, -0.80*sc, 0, -0.68*sc);
    s.closePath();
    return new THREE.Mesh(ext(s, 0.10, false), m);
  }
  var pageR = page(1);  pageR.userData.isPageRight = true;
  var pageL = page(-1); pageL.userData.isPageLeft  = true;
  pageR.rotation.y = -Math.PI / 2; // livro nasce fechado — só abre ao chegar no centro
  pageL.rotation.y =  Math.PI / 2;
  group.add(pageR, pageL);
  const ss = new THREE.Shape();
  ss.moveTo(-0.04*sc,0.82*sc); ss.lineTo(0.04*sc,0.82*sc); ss.lineTo(0.04*sc,-0.68*sc); ss.lineTo(-0.04*sc,-0.68*sc); ss.closePath();
  group.add(new THREE.Mesh(ext(ss, 0.28, false), stdMat(0x8EB5D8, 0x4A6880)));
  return group;
}

/* ── ÍCARO: Sol Caído ── */
function icaroRayShape(len) {
  const s = new THREE.Shape();
  s.moveTo(-0.08*sc, 0.38*sc); s.lineTo(0, 0.38*sc+len); s.lineTo(0.08*sc, 0.38*sc); s.lineTo(0, 0.50*sc); s.closePath();
  return ext(s, 0.10, false);
}

function createIcaro() {
  const group  = new THREE.Group();
  const mCore  = stdMat(0x8B4A1E, 0x6B3610, 0.50);
  const mRay   = stdMat(0x6B3A14, 0x452208, 0.30);
  const mBreak = stdMat(0x241608, 0x120A04, 0.10);
  const cs = new THREE.Shape(); cs.absellipse(0,0,0.38*sc,0.38*sc,0,Math.PI*2,false);
  const core = new THREE.Mesh(ext(cs, 0.25), mCore);
  core.userData.isCore = true;
  group.add(core);
  for (var i = 0; i < 8; i++) {
    var broken = (i===3), isShort = (i%2===1);
    var len = broken ? 0.25*sc : (isShort ? 0.45*sc : 0.65*sc);
    const mesh = new THREE.Mesh(icaroRayShape(len), broken ? mBreak : mRay);
    mesh.rotation.z = -(i*45)*Math.PI/180;
    if (broken) { mesh.userData.isBrokenRay = true; mesh.userData.brokenLen = 0.25*sc; mesh.userData.healthyLen = 0.65*sc; }
    group.add(mesh);
  }
  return group;
}

/* ── COVERS: Máscara do Fantasma ── */
function createCoversMask() {
  const group = new THREE.Group();
  const lav = 0xE3D6F0, lavEmis = 0x9B7FD4;

  // silhueta da meia-máscara, com o topo quebrado — mesmo desenho do favicon da página
  const s = new THREE.Shape();
  s.moveTo(0, 0.7833);
  s.lineTo(-0.2333, 0.8167);
  s.lineTo(-0.1667, 0.6833);
  s.lineTo(-0.4,    0.7167);
  s.lineTo(-0.3333, 0.5667);
  s.lineTo(-0.5667, 0.55);
  s.lineTo(-0.4833, 0.4167);
  s.lineTo(-0.6667, 0.3667);
  s.lineTo(-0.5833, 0.2333);
  s.lineTo(-0.6333, 0.1167);
  s.bezierCurveTo(-0.6333, -0.2833, -0.4, -0.6167, 0, -0.7833);
  s.lineTo(0, 0.7833); // costura reta, onde a máscara encontraria o rosto

  const eyeHole = new THREE.Path();
  eyeHole.absellipse(-0.3167, 0.1833, 0.1433, 0.09, 0, Math.PI*2, false);
  s.holes.push(eyeHole);

  const mask = new THREE.Mesh(ext(s, 0.16, false), stdMat(lav, lavEmis, 0.6));
  mask.userData.isMask = true;
  group.add(mask);

  // fio fino marcando a costura central, como no ícone
  const seamShape = new THREE.Shape();
  seamShape.moveTo(-0.012, 0.78); seamShape.lineTo(0.012, 0.78);
  seamShape.lineTo(0.012, -0.78); seamShape.lineTo(-0.012, -0.78);
  seamShape.lineTo(-0.012, 0.78);
  const seam = new THREE.Mesh(ext(seamShape, 0.20, false), stdMat(0x241f33, 0x120f1a, 0.15));
  seam.userData.isSeam = true;
  group.add(seam);

  // a outra metade do rosto — pele nua, sem máscara — some até a convergência ao centro,
  // quando aparece ao lado da máscara para formar o rosto completo
  const skin = 0x2a2438, skinEmis = 0x1b1826;

  const faceShape = new THREE.Shape();
  faceShape.moveTo(0, 0.7833);
  faceShape.bezierCurveTo(0.4,    0.7833,  0.6333, 0.45,    0.6333, 0.1167);
  faceShape.bezierCurveTo(0.6333, -0.2833, 0.4,    -0.6167, 0,      -0.7833);
  faceShape.lineTo(0, 0.7833);
  const face = new THREE.Mesh(ext(faceShape, 0.14, false), stdMat(skin, skinEmis, 0.25));
  face.userData.isFaceReveal = true;
  face.material.transparent = true; face.material.opacity = 0;
  group.add(face);

  const eyeShape = new THREE.Shape();
  eyeShape.absellipse(0.3167, 0.1833, 0.1267, 0.0767, 0, Math.PI*2, false);
  const eye = new THREE.Mesh(ext(eyeShape, 0.16, false), stdMat(0x08070a, 0x000000, 0.1));
  eye.userData.isFaceReveal = true;
  eye.material.transparent = true; eye.material.opacity = 0;
  group.add(eye);

  const mouthShape = new THREE.Shape();
  mouthShape.moveTo(-0.2, -0.4213);
  mouthShape.bezierCurveTo(-0.1, -0.4813, 0.1, -0.4813, 0.2, -0.4213);
  mouthShape.lineTo(0.2, -0.4453);
  mouthShape.bezierCurveTo(0.1, -0.5053, -0.1, -0.5053, -0.2, -0.4453);
  mouthShape.lineTo(-0.2, -0.4213);
  const mouth = new THREE.Mesh(ext(mouthShape, 0.16, false), stdMat(0x4a3d63, 0x241f33, 0.2));
  mouth.userData.isFaceReveal = true;
  mouth.material.transparent = true; mouth.material.opacity = 0;
  group.add(mouth);

  return group;
}

/* ── RECORDAÇÕES: três fotos em leque — mesma pose da pilha da própria página ── */
function recordacoesSquareShape(size) {
  const h = size / 2;
  const s = new THREE.Shape();
  s.moveTo(-h, -h); s.lineTo(h, -h); s.lineTo(h, h); s.lineTo(-h, h); s.lineTo(-h, -h);
  return s;
}

function createRecordacoesStack() {
  const group = new THREE.Group();
  const paper = 0xF2ECDD, paperEmis = 0x3A352C;
  const accent = 0x5EC4BB, accentEmis = 0x2F6B66;

  const poses = [
    { rot: -0.30, x: -0.20, y:  0.07, z: 0.00 },
    { rot:  0.22, x:  0.19, y: -0.06, z: 0.05 },
    { rot: -0.05, x: -0.01, y:  0.02, z: 0.10 },
  ];

  poses.forEach(function(p, i) {
    // moldura ciano, um pouco maior, espiando atrás — a mesma pista de cor da página
    const back = new THREE.Mesh(ext(recordacoesSquareShape(0.50), 0.05, false), stdMat(accent, accentEmis, 0.5));
    back.position.set(p.x, p.y, p.z - 0.035);
    back.rotation.z = p.rot;
    back.userData.isBack = true; back.userData.photoIndex = i;
    group.add(back);

    // a "foto" em si — papel claro, na frente
    const front = new THREE.Mesh(ext(recordacoesSquareShape(0.42), 0.06, false), stdMat(paper, paperEmis, 0.28));
    front.position.set(p.x, p.y, p.z);
    front.rotation.z = p.rot;
    front.userData.isFront = true; front.userData.photoIndex = i;
    group.add(front);
  });

  return group;
}

/* ── ORIGEM: Ponto de Origem ── */
function origemRingShape(rO, rI) {
  const s = new THREE.Shape();
  s.absellipse(0, 0, rO, rO, 0, Math.PI*2, false);
  const h = new THREE.Path(); h.absellipse(0, 0, rI, rI, 0, Math.PI*2, false);
  s.holes.push(h);
  return s;
}

function createOrigemPoint() {
  const group = new THREE.Group();
  const gold = 0xD9B776, goldEmis = 0x8A6B34;

  // o ponto central — de onde tudo mais se espalhou
  const coreShape = new THREE.Shape(); coreShape.absellipse(0, 0, 0.17*sc, 0.17*sc, 0, Math.PI*2, false);
  const core = new THREE.Mesh(ext(coreShape, 0.32, false), stdMat(gold, goldEmis, 0.85));
  core.userData.isCore = true;
  group.add(core);

  // três ondas concêntricas, cada uma mais fina e mais discreta que a anterior
  const rings = [
    { rO:0.36*sc, rI:0.29*sc, depth:0.20, ei:0.55 },
    { rO:0.58*sc, rI:0.53*sc, depth:0.15, ei:0.34 },
    { rO:0.82*sc, rI:0.78*sc, depth:0.11, ei:0.20 },
  ];
  rings.forEach(function(r, i) {
    const mesh = new THREE.Mesh(ext(origemRingShape(r.rO, r.rI), r.depth, false), stdMat(gold, goldEmis, r.ei));
    mesh.userData.isRing = true; mesh.userData.ringIndex = i;
    group.add(mesh);
  });

  return group;
}

/* ── M.A.L: Estrela — mesmo desenho de 5 pontas do favicon da página,
   em verde-sálvia (a cor de marca do M.A.L). Só a estrela, sem halo —
   o halo em disco ficava parecendo um vidro na frente dela. ── */
function createStar() {
  const group = new THREE.Group();
  const outerR = 0.62*sc, innerR = outerR * 0.39, pts = 5;
  const s = new THREE.Shape();
  for (var i = 0; i < pts*2; i++) {
    var ang = (Math.PI/pts)*i - Math.PI/2; // ponta pra cima, igual ao favicon
    var r = (i % 2 === 0) ? outerR : innerR;
    var x = Math.cos(ang)*r, y = Math.sin(ang)*r;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  s.closePath();
  const star = new THREE.Mesh(ext(s, 0.16), stdMat(0x8FCBB0, 0x5FA88A, 0.7));
  star.userData.isStar = true;
  group.add(star);

  return group;
}



window.NaveSimbolos={createTriforce,createValtherisEye,createCompassRose,createBook,createIcaro,createOrigemPoint,createCoversMask,createRecordacoesStack,createStar};
})();
