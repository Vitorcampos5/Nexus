/* esferas-modelo.js — carrega o modelo 3D das Esferas do Dragao (GLB) direto do
   servidor, com THREE.GLTFLoader().load() normal. Sem base64, sem file://.

   Materiais ja convertidos de KHR_materials_pbrSpecularGlossiness (legado, sem
   suporte no GLTFLoader atual) pra pbrMetallicRoughness padrao -- usa o
   esferas_del_dragon_corrigido.glb, nao o original do Sketchfab.

   Fonte do modelo: "Esferas del dragon / Dragon Balls" por Alien Byte
   (https://sketchfab.com/alienbyte), licenca CC-BY-4.0 -- dar credito ao publicar.

   7 grupos nomeados na cena: 1_Estrella_0 .. 7_Estrellas_6

   Uso (mesma API de antes, só a implementação por dentro mudou):
     NexusEsferasModelo.carregar(function (erro, grupos) {
       if (erro) { console.warn(erro); return; }
       grupos.forEach(function (g) { mesa.add(g); }); // 7 THREE.Group
     });

   Requer, carregados ANTES deste script:
     <script src="three.min.js"></script>
     <script src="GLTFLoader.js"></script>
   (testado também com a versão módulo oficial do GLTFLoader, se preferir
   manter o personagem_3d_viewer.html no estilo import/CDN)

   Ajuste CAMINHO pro lugar real onde o .glb vai morar no repositório.
*/
(function () {
  var CAMINHO = 'esferas_del_dragon_corrigido.glb'; // ajustar caminho real no projeto
  var NOMES = ["1_Estrella_0","2_Estrellas_1","3_Estrellas_2","4_Estrellas_3","5_Estrellas_4","6_Estrellas_5","7_Estrellas_6"];
  var cache = null;

  function carregar(callback) {
    if (cache) { callback(null, cache); return; }
    if (!window.THREE || !THREE.GLTFLoader) {
      callback(new Error('NexusEsferasModelo: THREE.GLTFLoader não encontrado — carregue three.min.js e o GLTFLoader antes deste script.'));
      return;
    }
    new THREE.GLTFLoader().load(CAMINHO, function (gltf) {
      var porNome = {};
      gltf.scene.traverse(function (o) { porNome[o.name] = o; });
      var grupos = NOMES.map(function (n) { return porNome[n]; }).filter(Boolean);
      if (grupos.length !== NOMES.length) {
        console.warn('NexusEsferasModelo: esperava 7 grupos nomeados, achou ' + grupos.length + '.');
      }
      cache = grupos;
      callback(null, grupos);
    }, undefined, function (erro) {
      callback(erro);
    });
  }

  window.NexusEsferasModelo = { carregar: carregar, NOMES: NOMES };
})();
