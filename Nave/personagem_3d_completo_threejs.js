import * as THREE from "three";

/*
  PERSONAGEM 3D COMPLETO — reconstrução estilizada baseada na referência PNG.

  O personagem é dividido em componentes independentes:
    - cabeça/rosto
    - olhos
    - bico/barba/parte frontal do rosto
    - chapéu
    - torso
    - manto/roupa
    - braços e mãos
    - pernas
    - cinto/ornamentos
    - cajado
    - ponta do cajado

  Tudo é criado proceduralmente com Three.js, portanto não depende de
  Blender ou de um arquivo GLB externo.

  Exemplo:

    import * as THREE from "three";
    import { criarPersonagemCompleto } from "./personagem_3d_completo_threejs.js";

    const scene = new THREE.Scene();
    const personagem = criarPersonagemCompleto({
      escala: 1,
      pose: "idle"
    });

    scene.add(personagem);

  Para animar:
    personagem.userData.parts.head
    personagem.userData.parts.leftArm
    personagem.userData.parts.rightArm
    personagem.userData.parts.staff
    etc.

  A imagem original é usada apenas como referência visual.
  O modelo abaixo é uma reconstrução 3D estilizada, não uma fotogrametria.
*/

const C = {
  black: 0x101313,
  nearBlack: 0x171b1a,
  greenDark: 0x263b36,
  green: 0x36554b,
  greenLight: 0x52705f,
  gray: 0x3f4542,
  grayLight: 0x666c66,
  skin: 0x8b5a24,
  gold: 0xd69b18,
  goldBright: 0xf0c53b,
  wood: 0x5a341d,
  woodLight: 0x8a5932,
  magic: 0xf4f7b2
};

function mat(color, roughness = 0.85, metalness = 0.0) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness
  });
}

function mesh(geometry, material, name) {
  const m = new THREE.Mesh(geometry, material);
  m.name = name;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function add(parent, child, key) {
  parent.add(child);
  if (key) parent.userData.parts[key] = child;
  return child;
}

function sphere(parent, key, radius, scale, position, material) {
  const m = mesh(
    new THREE.SphereGeometry(radius, 24, 16),
    material,
    key
  );
  m.scale.set(...scale);
  m.position.set(...position);
  return add(parent, m, key);
}

function cylinderBetween(a, b, radius, material, name, segments = 16) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const direction = new THREE.Vector3().subVectors(vb, va);
  const length = direction.length();

  const g = new THREE.CylinderGeometry(radius, radius * 1.08, length, segments);
  const m = mesh(g, material, name);

  m.position.copy(va).add(vb).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize()
  );

  return m;
}

function makeLimb(parent, key, a, b, r1, r2, material) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const direction = new THREE.Vector3().subVectors(vb, va);
  const length = direction.length();

  const g = new THREE.CylinderGeometry(r2, r1, length, 16);
  const m = mesh(g, material, key);
  m.position.copy(va).add(vb).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize()
  );

  return add(parent, m, key);
}

function createHead(root) {
  const g = new THREE.Group();
  g.name = "Head";
  root.userData.parts.head = g;
  root.add(g);

  // Cabeça alongada e escura, preservando a silhueta da referência.
  sphere(g, "headShape", 0.55, [0.78, 1.05, 0.72], [0, 1.75, 0], mat(C.black));

  // Face frontal.
  const face = sphere(
    g, "face",
    0.42,
    [0.72, 0.82, 0.35],
    [0, 1.72, 0.43],
    mat(C.nearBlack)
  );

  // Olhos verdes brilhantes.
  for (const side of [-1, 1]) {
    const eye = sphere(
      g,
      side < 0 ? "leftEye" : "rightEye",
      0.105,
      [0.55, 1.35, 0.42],
      [side * 0.16, 1.78, 0.72],
      mat(0x9cc53c, 0.3)
    );
    eye.material.emissive = new THREE.Color(0x557711);
    eye.material.emissiveIntensity = 1.5;
  }

  // Bico/barba dourada característica.
  const beak = mesh(
    new THREE.ConeGeometry(0.20, 0.42, 5),
    mat(C.gold),
    "Beak"
  );
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 1.48, 0.72);
  g.add(beak);

  // Pequena parte inferior dourada.
  sphere(g, "lowerMouth", 0.19, [1.0, 0.55, 0.55], [0, 1.38, 0.53], mat(C.gold));

  // Chapéu.
  const brim = mesh(
    new THREE.CylinderGeometry(0.62, 0.68, 0.10, 24),
    mat(C.black),
    "HatBrim"
  );
  brim.position.y = 2.20;
  g.add(brim);

  const hat = mesh(
    new THREE.ConeGeometry(0.47, 0.78, 20),
    mat(C.black),
    "Hat"
  );
  hat.position.set(0, 2.60, 0);
  hat.rotation.z = -0.16;
  g.add(hat);

  // Curva/ponta caída do chapéu.
  const tip = mesh(
    new THREE.SphereGeometry(0.20, 16, 12),
    mat(C.black),
    "HatTip"
  );
  tip.scale.set(0.7, 1.25, 0.7);
  tip.position.set(-0.17, 2.94, 0);
  g.add(tip);

  // Lua verde no chapéu.
  const moon = mesh(
    new THREE.TorusGeometry(0.11, 0.035, 8, 20, Math.PI * 1.55),
    mat(0xb4df3a, 0.4),
    "HatMoon"
  );
  moon.rotation.y = Math.PI / 2;
  moon.position.set(-0.28, 2.66, 0.43);
  g.add(moon);

  return g;
}

function createBody(root) {
  const g = new THREE.Group();
  g.name = "Body";
  root.userData.parts.body = g;
  root.add(g);

  // Torso.
  const torso = mesh(
    new THREE.CylinderGeometry(0.53, 0.67, 1.05, 8),
    mat(C.greenDark),
    "Torso"
  );
  torso.position.y = 0.88;
  g.add(torso);

  // Manto/saia ampla.
  const robe = mesh(
    new THREE.CylinderGeometry(0.72, 0.95, 0.95, 8),
    mat(C.gray),
    "Robe"
  );
  robe.position.y = 0.28;
  g.add(robe);

  // Camadas do tecido para dar aparência menos geométrica.
  const shoulderCloth = mesh(
    new THREE.CylinderGeometry(0.66, 0.78, 0.30, 8),
    mat(C.green),
    "ShoulderCloth"
  );
  shoulderCloth.position.y = 1.20;
  g.add(shoulderCloth);

  // Cinto.
  const belt = mesh(
    new THREE.CylinderGeometry(0.58, 0.60, 0.16, 12),
    mat(C.nearBlack),
    "Belt"
  );
  belt.position.y = 0.68;
  g.add(belt);

  // Fivela triangular.
  const buckle = mesh(
    new THREE.ConeGeometry(0.17, 0.05, 3),
    mat(C.goldBright, 0.35, 0.2),
    "Buckle"
  );
  buckle.rotation.x = Math.PI / 2;
  buckle.rotation.z = Math.PI;
  buckle.position.set(0, 0.69, 0.61);
  g.add(buckle);

  // Calçados/pernas.
  for (const side of [-1, 1]) {
    const leg = mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.55, 12),
      mat(C.black),
      side < 0 ? "LeftLeg" : "RightLeg"
    );
    leg.position.set(side * 0.28, -0.35, 0);
    g.add(leg);

    const foot = mesh(
      new THREE.SphereGeometry(0.24, 16, 10),
      mat(C.nearBlack),
      side < 0 ? "LeftFoot" : "RightFoot"
    );
    foot.scale.set(1.35, 0.65, 1.55);
    foot.position.set(side * 0.28, -0.64, 0.12);
    g.add(foot);
  }

  return g;
}

function createArm(root, side, key) {
  const g = new THREE.Group();
  g.name = key;
  root.userData.parts[key] = g;
  root.add(g);

  const s = side;

  // Ombro.
  sphere(g, "Shoulder", 0.30, [1.25, 0.85, 0.95], [s * 0.68, 1.15, 0], mat(C.greenDark));

  // Braço coberto pelo tecido.
  makeLimb(
    g, "UpperArm",
    [s * 0.67, 1.12, 0],
    [s * 0.92, 0.63, 0.02],
    0.25, 0.19, mat(C.green)
  );

  // Antebraço.
  makeLimb(
    g, "Forearm",
    [s * 0.92, 0.63, 0.02],
    [s * 1.02, 0.20, 0.05],
    0.20, 0.15, mat(C.gray)
  );

  // Mão.
  sphere(g, "Hand", 0.16, [0.85, 1.1, 0.85], [s * 1.02, 0.08, 0.06], mat(C.skin));

  return g;
}

function createStaff(root) {
  const g = new THREE.Group();
  g.name = "Staff";
  root.userData.parts.staff = g;
  root.add(g);

  // Cajado inclinado para a direita, como na referência.
  const bottom = new THREE.Vector3(1.02, 0.05, 0.10);
  const top = new THREE.Vector3(1.72, 3.00, 0.10);

  const staff = cylinderBetween(
    bottom.toArray(),
    top.toArray(),
    0.045,
    mat(C.woodLight, 0.7),
    "StaffWood",
    12
  );
  g.add(staff);

  // Ponta metálica/branca.
  const tip = mesh(
    new THREE.ConeGeometry(0.09, 0.35, 10),
    mat(0xe9e7d5, 0.35, 0.15),
    "StaffTip"
  );
  tip.position.copy(top).add(new THREE.Vector3(0.05, 0.14, 0));
  tip.rotation.z = -0.23;
  g.add(tip);

  // Nó mágico no topo.
  const orb = sphere(
    g, "StaffOrb", 0.075, [1,1,1],
    [1.70, 2.94, 0.10],
    mat(C.magic, 0.25)
  );
  orb.material.emissive = new THREE.Color(0xcad48a);
  orb.material.emissiveIntensity = 1.8;

  return g;
}

function createBackCloth(root) {
  const g = new THREE.Group();
  g.name = "BackCloth";
  root.userData.parts.backCloth = g;
  root.add(g);

  const cloth = mesh(
    new THREE.CylinderGeometry(0.56, 0.90, 1.15, 8, 1, true),
    mat(C.greenDark),
    "BackCape"
  );
  cloth.position.set(0, 0.72, -0.18);
  cloth.rotation.x = 0.05;
  g.add(cloth);

  return g;
}

export function criarPersonagemCompleto(options = {}) {
  const {
    escala = 1,
    pose = "idle",
    incluirCajado = true
  } = options;

  const root = new THREE.Group();
  root.name = "PersonagemCompleto3D";
  root.userData.parts = {};

  createHead(root);
  createBody(root);
  createArm(root, -1, "leftArm");
  createArm(root, 1, "rightArm");
  createBackCloth(root);

  if (incluirCajado) createStaff(root);

  root.scale.setScalar(escala);

  aplicarPose(root, pose);

  return root;
}

export function aplicarPose(character, pose = "idle") {
  const p = character.userData.parts;
  if (!p) return character;

  // Reset.
  for (const key of ["leftArm", "rightArm"]) {
    if (p[key]) {
      p[key].rotation.set(0, 0, 0);
    }
  }

  if (pose === "staff") {
    if (p.rightArm) {
      p.rightArm.rotation.z = -0.20;
      p.rightArm.rotation.x = -0.12;
    }
    if (p.leftArm) {
      p.leftArm.rotation.z = 0.10;
    }
  }

  if (pose === "attack") {
    if (p.rightArm) {
      p.rightArm.rotation.z = -0.75;
      p.rightArm.rotation.x = -0.35;
    }
    if (p.leftArm) {
      p.leftArm.rotation.z = 0.35;
      p.leftArm.rotation.x = -0.25;
    }
  }

  if (pose === "idle") {
    if (p.leftArm) p.leftArm.rotation.z = -0.04;
    if (p.rightArm) p.rightArm.rotation.z = 0.04;
  }

  return character;
}

export function adicionarIluminacaoPersonagem(scene) {
  const ambient = new THREE.HemisphereLight(0xffffff, 0x202020, 1.7);
  ambient.name = "CharacterAmbient";
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.name = "CharacterKeyLight";
  key.position.set(3, 5, 6);
  key.castShadow = true;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.8);
  fill.position.set(-4, 2, 3);
  scene.add(fill);
}

export function configurarSombras(renderer) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

/*
  Dimensões aproximadas:
    altura total: ~3.1 unidades
    largura: ~2.1 unidades contando braços
    profundidade: ~1.4 unidades

  A escala 1 produz um personagem pequeno o suficiente para uma cena
  padrão de Three.js e grande o suficiente para detalhamento visual.
*/
