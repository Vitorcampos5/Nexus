/* =====================================================================
   VillageScene — a vila inicial de "Jornada ao Leste: Lycoris".

   COMO ISSO SE ENCAIXA NO FLUXO EXISTENTE
   -----------------------------------------------------------------
   Personagem novo em folha (slot recém-criado no SaveSlotScene, nunca
   salvou em ponto nenhum) é desviado pra cá pela própria GameScene, logo
   no topo do create() dela, ANTES de montar o mundo da planície — ver o
   bloco `if (this.needsVillageIntro)` lá. Quem já tem progresso salvo
   (ou está voltando da caverna) nunca passa por aqui: vai direto pra
   GameScene, como sempre foi.

   Por causa desse desvio acontecer dentro do create() da GameScene, essa
   cena pode contar com duas coisas que a GameScene já garantiu antes do
   redirect:
   1. A textura 'player' e as animações (idle/walk/jump/fall/attack/kick/
      hurt/defend) já foram carregadas em preload() e registradas por
      createPlayerAnimations() — não precisa (e não deve) recarregar nada
      disso aqui. this.anims é o AnimationManager GLOBAL do jogo, não por
      cena, então uma vez registradas continuam disponíveis em qualquer
      cena depois.
   2. 'sky'/'clouds' também já foram carregadas — reaproveitadas aqui pra
      manter a mesma identidade visual da planície, sem duplicar asset.

   O resto do cenário (portão/casas/poço/biblioteca/placa/cicatriz/
   árvores) é desenhado na hora com Phaser.Graphics, do mesmo jeito que
   createCaveEntrance() já faz na GameScene — sem imagem nova nenhuma.

   Saída: a placa no fim da vila manda de volta pra GameScene
   (returnFromVillage: true), com o estado do personagem carregado junto —
   mesmo pacote de campos que enterCaveScene()/returnToGameScene() já
   trocam entre GameScene e CaveScene.

   O poço funciona como ponto de save — reaproveita a mesma função que o
   cristal da caverna usa (rbSyncSaveSlot, injetada em data.syncSaveSlot —
   ver nota abaixo), porque os nomes dos campos em `this` aqui batem
   exatamente com o que rbBuildSaveSnapshot() espera.

   DEPENDÊNCIAS INJETADAS (touch / syncSaveSlot / fx / storage)
   -----------------------------------------------------------------
   Diferente de PlayerController/Enemy/Scenery/PlayerMenu (que são
   utilitários de verdade sem estado do jogo, e por isso podem ser
   `new`ados livremente aqui), RosebudTouch, rbSyncSaveSlot, RosebudFX e
   rbStorage são declarados dentro da IIFE do script inline principal do
   HTML — não são globais de página. GameScene/CaveScene, por estarem
   definidas dentro dessa mesma IIFE, conseguem chamá-los pelo nome
   direto. Este arquivo NÃO consegue: é um <script src> à parte, fora da
   IIFE, então `RosebudTouch`/`rbSyncSaveSlot`/`RosebudFX`/`rbStorage`
   soltos aqui dão ReferenceError (foi exatamente o bug corrigido nesta
   versão). Por isso GameScene passa as referências vivas em
   `data.touch`, `data.syncSaveSlot`, `data.fx` e `data.storage` no
   scene.start(), e este arquivo só usa
   `this.touch`/`this.syncSaveSlot`/`this.fx`/`this.storage` — o mesmo
   princípio de injeção que o `checkTouchInteract` do Scenery.js já usa.
   As construções da vila (bakeVillageGate/Huts/Well/Library/Signpost, em
   this.fx) seguem o mesmo padrão de "assar com Two.js" que
   bakeTrees/bakeBirds já usam em GameScene — ver
   createVillageDecorations() mais abaixo. O menu (HUD, atributos,
   títulos, opções) vem de PlayerMenu.js — essa classe não tem estado
   próprio da IIFE, só lê/escreve nas propriedades desta cena
   (this.playerAttributes, this.hp etc.), então dá pra instanciar direto:
   `this.playerMenu = new PlayerMenu(this, { storage: this.storage })`.
   ===================================================================== */
class VillageScene extends Phaser.Scene {
    constructor() {
        super('VillageScene');
        this.player = null;
        this.playerController = null;
        this.groundSystem = null;
        this.dayNightCycle = null;
        this.libraryZone = null;
        this.wellZone = null;
        this.exitZone = null;

        // Injetados por GameScene via scene.start('VillageScene', {...}) —
        // ver nota "DEPENDÊNCIAS INJETADAS" no topo do arquivo.
        this.touch = null;
        this.syncSaveSlot = null;
        this.fx = null; // RosebudFX — bake das construções da vila com Two.js
        this.storage = null; // rbStorage — volume/mudo persistente, pro PlayerMenu
        this.caveProgress = null; // RosebudCaveProgress — mesmo motivo/padrão, só pra saber se o lobo de cristal (Companion.js) já foi libertado
        this.companion = null;

        this.baseAttributes = { constitution: 1, luck: 1, defense: 1, attack: 1, intelligence: 1, agility: 1 };
        this.playerName = 'Aventureiro';
        this.hp = 30; this.maxHp = 30;
        this.mana = 5; this.maxMana = 5;
        this.playerLevel = 1; this.playerExperience = 0; this.experienceToNextLevel = 100;
        this.playerAttributes = { ...this.baseAttributes };
        this.titleBonus = {};
        this.spellBonus = {};
        this.unlockedTitles = ['Novato'];
        this.equippedTitle = 'Novato';
        this.learnedSpells = [];
        this.inventory = { slimeGoo: 0 };
    }

    init(data) {
        this.playerName = data.playerName || 'Aventureiro';
        this.hp = data.hp !== undefined ? data.hp : 30;
        this.maxHp = data.maxHp !== undefined ? data.maxHp : 30;
        this.mana = data.mana !== undefined ? data.mana : 5;
        this.maxMana = data.maxMana !== undefined ? data.maxMana : 5;
        this.playerLevel = data.playerLevel || 1;
        this.playerExperience = data.playerExperience || 0;
        this.experienceToNextLevel = data.experienceToNextLevel || 100;
        this.playerAttributes = data.playerAttributes ? { ...data.playerAttributes } : { ...this.baseAttributes };
        this.titleBonus = data.titleBonus ? { ...data.titleBonus } : {};
        this.spellBonus = data.spellBonus ? { ...data.spellBonus } : {};
        this.unlockedTitles = data.unlockedTitles ? [...data.unlockedTitles] : ['Novato'];
        this.equippedTitle = data.equippedTitle || 'Novato';
        this.learnedSpells = data.learnedSpells ? [...data.learnedSpells] : [];
        this.inventory = data.inventory ? { ...data.inventory } : { slimeGoo: 0 };
        // Só pra create() saber se pula a mensagem de boas-vindas — voltar
        // da LibraryScene é uma ida-e-volta dentro da MESMA visita à vila,
        // não faz sentido repetir "sua jornada começa aqui" de novo.
        this.returnFromLibrary = !!data.returnFromLibrary;
        // Mesma ideia, mas pra quando o jogador volta à vila de propósito
        // vindo do GameScene (ver villageReturnZone/enterVillage() lá) —
        // só a visita de personagem novo (needsVillageIntro) manda
        // returnVisit:false/omitido.
        this.isReturnVisit = !!data.returnVisit;

        // RosebudTouch e rbSyncSaveSlot vivem dentro da IIFE do script
        // principal — GameScene injeta as referências aqui porque este
        // arquivo, sendo <script src> à parte, não enxerga esses nomes
        // diretamente (ver nota no topo do arquivo).
        this.touch = data.touch;
        this.syncSaveSlot = data.syncSaveSlot;
        this.fx = data.fx;
        this.storage = data.storage;
        this.caveProgress = data.caveProgress;
    }

    preload() {
        // Nada pra carregar — 'player', animações, 'sky' e 'clouds' já
        // vieram da GameScene (ver nota no topo do arquivo).
    }

    create() {
        const W = 4400, H = 600, groundHeight = 25;
        this.width = W; this.height = H; this.groundHeight = groundHeight;
        const groundY = H - groundHeight;

        this.physics.world.setBounds(0, 0, W, H);

        const backgroundImage = this.add.tileSprite(0, 0, W, H, 'sky').setOrigin(0);
        backgroundImage.setScrollFactor(0.1);
        // Estrelas + lua (só de noite, Ambience.js) — antes das nuvens, que passam NA FRENTE delas.
        Ambience.stars(this, { worldW: W, yMax: 340, count: 100 });
        Ambience.moon(this, 560, 118, { size: 0.9 });
        this.clouds = this.add.tileSprite(0, -80, W, H, 'clouds').setOrigin(0).setScale(2.5);
        this.clouds.setScrollFactor(0.2);
        this.cloudDriftOffset = 0;

        // --- Colinas ao fundo, em duas camadas de parallax — antes a
        // vila só tinha céu+nuvens (2 camadas) contra as 3 do GameScene
        // (céu+nuvens+colinas), e essa camada do meio é a que mais
        // "vende" profundidade porque o olho compara o quanto ela se
        // move contra o chão. Chaves de textura PRÓPRIAS da vila
        // (villageHillsFar/Near) — nunca reaproveita 'hillsTexture' do
        // GameScene por nome: mesmo raciocínio do bug de
        // 'groundTexture' compartilhada lá no início (ver Scenery.js) —
        // se algum dia o desenho de um lado mudar, o outro não herda o
        // formato errado silenciosamente. ---
        if (!this.textures.exists('villageHillsFar')) {
            const hg = this.add.graphics();
            hg.fillStyle(0x5a7f8a, 0.5);
            hg.beginPath();
            hg.moveTo(0, 110); hg.lineTo(0, 70);
            hg.lineTo(90, 30); hg.lineTo(180, 60); hg.lineTo(260, 20);
            hg.lineTo(340, 55); hg.lineTo(420, 35); hg.lineTo(500, 65);
            hg.lineTo(500, 110); hg.closePath(); hg.fillPath();
            hg.generateTexture('villageHillsFar', 500, 110);
            hg.destroy();
        }
        // Cordilheira distante (Ambience.js): preenche o céu vazio acima das colinas.
        this.cloudsFar = this.add.tileSprite(0, -150, W, H, 'clouds').setOrigin(0).setScale(1.5).setAlpha(0.5).setScrollFactor(0.07);
        Ambience.mountains(this, { worldW: W, groundY: H - groundHeight + 6, scrollFactor: 0.14 });
        this.hillsFar = this.add.tileSprite(0, H - groundHeight - 115, W, 110, 'villageHillsFar').setOrigin(0, 0);
        this.hillsFar.setScrollFactor(0.22);

        if (!this.textures.exists('villageHillsNear')) {
            const hg2 = this.add.graphics();
            hg2.fillStyle(0x3a5f3a, 0.75);
            hg2.beginPath();
            hg2.moveTo(0, 150); hg2.lineTo(0, 95);
            hg2.lineTo(70, 60); hg2.lineTo(150, 90); hg2.lineTo(230, 45);
            hg2.lineTo(310, 85); hg2.lineTo(390, 55); hg2.lineTo(460, 90);
            hg2.lineTo(460, 150); hg2.closePath(); hg2.fillPath();
            // uns tufos de copa de árvore no perfil, só pra quebrar a
            // silhueta lisa
            [[70, 60], [230, 45], [390, 55]].forEach(([tx, ty]) => {
                hg2.fillCircle(tx, ty - 6, 16);
                hg2.fillCircle(tx - 14, ty + 2, 12);
                hg2.fillCircle(tx + 14, ty + 2, 12);
            });
            hg2.generateTexture('villageHillsNear', 460, 150);
            hg2.destroy();
        }
        this.hillsNear = this.add.tileSprite(0, H - groundHeight - 145, W, 150, 'villageHillsNear').setOrigin(0, 0);
        this.hillsNear.setScrollFactor(0.42);

        this.groundSystem = new ProceduralGround(this, {
            textureKey: 'villageGroundTexture',
            worldWidth: W, worldHeight: H, groundHeight, tileWidth: 64,
            draw: (g, tileWidth, gh) => {
                g.fillStyle(0x8a7550, 1);
                g.fillRect(0, 0, tileWidth, gh);
                g.fillStyle(0x6b5a3c, 0.5);
                for (let gx = 0; gx < tileWidth; gx += 8) {
                    g.fillEllipse(gx + 4, gh - 4, 6, 3);
                }
                g.fillStyle(0x4a6b2f, 1);
                g.fillRect(0, 0, tileWidth, 4);
            },
        });
        this.ground = this.groundSystem.sprite;

        this.createVillageDecorations(groundY, W);

        // Ambientação (Ambience.js): flores/pedrinhas/tufos de primeiro plano, pólen e folhas de dia,
        // vagalumes de noite. Os vãos das construções ficam sem flores (skip) pra não "crescerem" dentro delas.
        Ambience.groundDetail(this, { worldW: W, groundY, density: 0.8, skip: [[120, 300], [400, 540], [980, 1140], [1900, 2100], [2300, 2460]] });
        Ambience.pollen(this);
        Ambience.leaves(this, { count: 6 });
        Ambience.fireflies(this, groundY);

        this.dayNightCycle = new DayNightCycle(this, PLAINS_DAY_NIGHT_KEYFRAMES, W, H);
        this.dayNightCheckTimer = 0;

        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            activate: Phaser.Input.Keyboard.KeyCodes.E,
            enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
        });
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
        this.kickKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);
        this.defendKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L);
        this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

        const playerHeight = this.textures.get('player').getSourceImage().height * (2 / 5);
        // Saindo da biblioteca (returnFromLibrary) o jogador nasce DIANTE da porta dela —
        // antes nascia sempre no começo da vila (x=60), a ~2000px dali. 130px à esquerda
        // da porta fica fora do raio da InteractionZone (95), então a dica "Pressione E pra
        // entrar" não aparece nem dispara de novo logo ao sair. LIBRARY_X precisa ser o
        // mesmo valor de this.libraryX mais abaixo (essa variável só nasce depois do jogador).
        const LIBRARY_X = 2000;
        const initialX = this.returnFromLibrary ? LIBRARY_X - 130 : 60;
        const initialY = H - groundHeight - playerHeight / 2;
        this.playerBaseScale = 2 / 5;

        this.player = this.physics.add.sprite(initialX, initialY, 'player');
        this.player.setScale(this.playerBaseScale);
        this.player.setBounce(0.1);
        this.player.setCollideWorldBounds(true);
        this.player.body.setGravityY(1000);
        this.player.body.setDragX(500);

        this.playerController = new PlayerController(this, this.player, {
            getAttributes: () => this.playerAttributes,
            baseScale: this.playerBaseScale,
            // Vila é área segura — sem inimigos, então dealDamage/queryOverlap
            // nunca disparam de verdade. A API do PlayerController exige os
            // callbacks mesmo assim; ficam como no-op em vez de undefined.
            onDealDamage: () => {},
            queryOverlap: () => [],
            onDeath: () => {},
            onHealthChange: (hp) => { this.hp = hp; },
            onHit: () => {},
        });

        this.physics.add.collider(this.player, this.ground);

        // Companion.js — lobo de cristal como companheiro, só existe se já
        // foi libertado na caverna (this.caveProgress, injetado pela
        // GameScene — mesmo padrão de touch/fx/storage, ver nota no topo
        // do arquivo). Vila não tem inimigo nenhum, então queryOverlap
        // fica no-op, igual o do PlayerController logo acima.
        // Phaser reaproveita a MESMA instância da Scene entre scene.start()s
        // (só init()/create() rodam de novo — o constructor não), então
        // this.companion de uma visita anterior sobra aqui (com o sprite já
        // destruído pelo shutdown da cena). Zera antes de decidir se cria um novo.
        this.companion = null;
        if (this.touch && this.touch.setMagias) this.touch.setMagias(false); // sem conjuração aqui: esconde os botões de magia do toque
        if (this.caveProgress && this.caveProgress.crystalWolfBroken) {
            this.companion = new Companion(this, {
                type: 'crystalWolf',
                x: this.player.x - 60,
                y: groundY + 8,
                getPlayerPosition: () => ({ x: this.player.x, y: this.player.y }),
                getPlayerSprite: () => this.player,
                getSettings: () => this.caveProgress,
                queryOverlap: () => [],
            });
        }

        this.touch.init();
        this.touch.show();

        this.libraryX = LIBRARY_X;
        this.wellX = 1060;
        this.signpostX = 4200;

        this.libraryZone = new InteractionZone(this, {
            x: this.libraryX, y: groundY - 40, radius: 95,
            interactKey: this.interactKey,
            checkTouchInteract: () => this.touch.consumir('interactPress'),
            getPlayerPosition: () => ({ x: this.player.x, y: this.player.y }),
            getHintText: () => 'Pressione E para entrar na biblioteca',
            onInteract: () => this.enterLibrary(),
        });

        this.wellZone = new InteractionZone(this, {
            x: this.wellX, y: groundY - 20, radius: 80,
            interactKey: this.interactKey,
            checkTouchInteract: () => this.touch.consumir('interactPress'),
            getPlayerPosition: () => ({ x: this.player.x, y: this.player.y }),
            getHintText: () => 'Pressione E para descansar junto ao poço',
            onInteract: () => this.restAtWell(),
        });

        this.exitZone = new InteractionZone(this, {
            x: this.signpostX, y: groundY - 40, radius: 80,
            interactKey: this.interactKey,
            checkTouchInteract: () => this.touch.consumir('interactPress'),
            getPlayerPosition: () => ({ x: this.player.x, y: this.player.y }),
            getHintText: () => 'Pressione E para seguir viagem',
            onInteract: () => this.enterJourney(),
        });

        this.cameras.main.startFollow(this.player);
        this.cameras.main.setZoom(1);
        this.cameras.main.setBounds(0, 0, W, H);

        this.createRestFeedback();

        this.playerMenu = new PlayerMenu(this, { storage: this.storage });
        this.playerMenu.create();

        // Voltando da LibraryScene (ida-e-volta dentro da mesma visita à
        // vila) — não repete a mensagem de boas-vindas.
        if (!this.returnFromLibrary && !this.isReturnVisit) {
            const welcomeMessage = this.add.text(this.cameras.main.centerX, 40, `${this.playerName}, sua jornada começa aqui.`, {
                fontSize: '18px', fill: '#f3d9a4', fontStyle: 'italic', padding: { x: 10, y: 5 },
            }).setOrigin(0.5).setScrollFactor(0);
            this.time.delayedCall(6000, () => welcomeMessage.destroy());
        }

        this.cameras.main.fadeIn(300, 0, 0, 0);
    }

    update(time, delta) {
        this.libraryZone.update();
        this.wellZone.update();
        this.exitZone.update();
        this.playerMenu.update();
        if (this.companion) this.companion.update(time, delta);

        this.cloudDriftOffset = (this.cloudDriftOffset || 0) + (delta || 16) * 0.012;
        this.clouds.tilePositionX = this.cameras.main.scrollX * 0.1 + this.cloudDriftOffset;
        if (this.cloudsFar) this.cloudsFar.tilePositionX = this.cameras.main.scrollX * 0.035 + this.cloudDriftOffset * 0.45;

        if (this.birds) {
            this.birds.forEach((bird) => {
                bird.x += bird.speed * (delta / 1000);
                if (bird.x > this.width + 50) bird.x = -50;
                bird.y = bird.baseY + Math.sin(time / 700 + bird.bobPhase) * 6;
            });
        }

        this.dayNightCheckTimer += (delta || 16);
        if (this.dayNightCheckTimer > 5000) {
            this.dayNightCheckTimer = 0;
            this.dayNightCycle.update();
        }

        let moveDir = 0;
        if (this.keys.left.isDown || this.touch.state.left) moveDir = -1;
        else if (this.keys.right.isDown || this.touch.state.right) moveDir = 1;
        this.playerController.setMoveInput(moveDir);

        if (this.keys.up.isDown || Phaser.Input.Keyboard.JustDown(this.spaceKey) || this.touch.state.jumpHeld) {
            this.playerController.requestJump();
        }
        if (Phaser.Input.Keyboard.JustDown(this.attackKey) || this.touch.consumir('attackPress')) {
            this.playerController.requestAttack();
        }
        if (Phaser.Input.Keyboard.JustDown(this.kickKey) || this.touch.consumir('kickPress')) {
            this.playerController.requestKick();
        }
        if (Phaser.Input.Keyboard.JustDown(this.defendKey) || this.touch.consumir('defendPress')) {
            this.playerController.setDefending(true);
        }
        if (Phaser.Input.Keyboard.JustUp(this.defendKey) || this.touch.consumir('defendRelease')) {
            this.playerController.setDefending(false);
        }

        this.playerController.update(time, delta);

        // Mesma rede de segurança da GameScene/CaveScene — ver os
        // comentários lá (body.reset() testado como mais estável que
        // mexer em player.y direto).
        const groundSurfaceY = this.height - this.groundHeight;
        if (this.player.body.bottom > groundSurfaceY + 2) {
            const overshoot = this.player.body.bottom - groundSurfaceY;
            this.player.body.reset(this.player.x, this.player.y - overshoot);
        }
    }

    // ==================== CENÁRIO ====================
    createVillageDecorations(groundY, worldWidth) {
        // Construções assadas com Two.js (this.fx = RosebudFX injetado —
        // ver nota "DEPENDÊNCIAS INJETADAS" no topo do arquivo), no mesmo
        // princípio de bakeTrees/bakeBirds em GameScene — não mais
        // Phaser.Graphics cru, e agora com bem mais detalhe (alvenaria,
        // sapé/ardósia em camadas, degraus, colunas, hera, faroletes —
        // ver os comentários de cada bake* em RosebudFX). As árvores
        // também passaram a reaproveitar bakeTrees em vez do drawTree
        // simplificado de antes.
        //
        // ANIMAÇÕES: fumaça de chaminé, brilho de lanterna/janela, balde
        // do poço e bandeirola da biblioteca são elementos VIVOS (tweens,
        // igual petal/mote em IntroScene e brilho em CaveScene) por cima
        // das construções assadas, não fazem parte da textura estática —
        // dá pra animar sem precisar assar dezenas de frames. A posição
        // de cada um vem de `villageAnchors`, que cada bake* grava na
        // própria textura (ver worldAnchor() abaixo) — assim a posição
        // não fica duplicada feito número mágico aqui E dentro do bake.
        if (!this.textures.exists('rbVillageGate')) this.fx.bakeVillageGate(this);
        if (!this.textures.exists('rbHutNormal0')) this.fx.bakeVillageHuts(this);
        if (!this.textures.exists('rbVillageWell')) this.fx.bakeVillageWell(this);
        if (!this.textures.exists('rbVillageLibrary')) this.fx.bakeVillageLibrary(this);
        if (!this.textures.exists('rbVillageSignpost')) this.fx.bakeVillageSignpost(this);
        if (!this.textures.exists('rbTree0_0')) this.fx.bakeTrees(this);

        // --- Estrada de terra batida ligando o portão à biblioteca —
        // desenhada ANTES de tudo (fica por baixo das construções/grama),
        // pra vila parecer um lugar de verdade, não construções soltas
        // num gramado. Elipses encavaladas com largura variável, não uma
        // faixa reta perfeita. ---
        const gEstrada = this.add.graphics();
        gEstrada.fillStyle(0x6b5738, 0.55);
        for (let x = 160; x < 2060; x += 36) {
            const larg = 46 + Math.sin(x * 0.02) * 10;
            gEstrada.fillEllipse(x, groundY + 2, larg, 12);
        }

        const playSway = (sprite, variante) => {
            this.time.delayedCall(Phaser.Math.Between(0, 900), () => sprite.play(`rbTreeSway${variante}`));
        };

        // --- Camada de trás: cicatriz antiga + árvores de fundo, mais
        // discretas, atrás das construções ---
        const gBack = this.add.graphics();
        this.drawScar(gBack, 600, groundY);
        [60, 900, 1760, 2650].forEach((x) => {
            const variante = Phaser.Math.Between(0, 1);
            const arv = this.add.sprite(x, groundY, `rbTree${variante}_0`)
                .setOrigin(0.5, 1).setScale(0.85).setTint(0x8aa588);
            playSway(arv, variante);
        });

        // --- Construções — sprites assados, ancorados pela base (o pé
        // encosta em groundY, igual às árvores assadas de GameScene).
        // Vãos recalculados pro tamanho novo das construções (a casa
        // sozinha já é ~220 de largura com o beiral) — a fileira antiga
        // de 1900 de largura não tinha mais espaço pra isso sem
        // sobrepor telhados. As 3 casas "normais" usam variantes de cor
        // diferentes (rbHutNormal0/1/2) pra não parecerem clonadas. ---
        const wellX = this.wellX !== undefined ? this.wellX : 1060;
        const libraryX = this.libraryX !== undefined ? this.libraryX : 2000;
        const signpostX = this.signpostX !== undefined ? this.signpostX : 2380;

        this.add.image(200, groundY, 'rbVillageGate').setOrigin(0.5, 1);
        this.criarPiscaLanterna(this.worldAnchor('rbVillageGate', 'lanternGlow', 200, groundY));

        this.add.image(460, groundY, 'rbHutNormal0').setOrigin(0.5, 1);
        this.criarFumaca(this.worldAnchor('rbHutNormal0', 'chimneyTop', 460, groundY));
        this.criarLuzJanela(460 - 48, groundY - 99); // janela acesa à noite (offset medido na textura da casa)

        this.add.image(740, groundY, 'rbHutAbandoned').setOrigin(0.5, 1);

        this.add.image(wellX, groundY, 'rbVillageWell').setOrigin(0.5, 1);
        this.criarBalde(this.worldAnchor('rbVillageWell', 'bucketPivot', wellX, groundY));
        this.criarOndulacaoPoco(this.worldAnchor('rbVillageWell', 'waterSurface', wellX, groundY));
        this.criarBarril(wellX - 95, groundY);
        this.criarBarril(wellX - 118, groundY, 0.85);

        this.add.image(1300, groundY, 'rbHutNormal1').setOrigin(0.5, 1);
        this.criarFumaca(this.worldAnchor('rbHutNormal1', 'chimneyTop', 1300, groundY));
        this.criarLuzJanela(1300 - 48, groundY - 99); // janela acesa à noite (offset medido na textura da casa)

        this.add.image(1560, groundY, 'rbHutNormal2').setOrigin(0.5, 1);
        this.criarFumaca(this.worldAnchor('rbHutNormal2', 'chimneyTop', 1560, groundY));
        this.criarLuzJanela(1560 - 48, groundY - 99); // janela acesa à noite (offset medido na textura da casa)

        this.criarVaral(1370, 1490, groundY - 135);

        this.add.image(libraryX, groundY, 'rbVillageLibrary').setOrigin(0.5, 1);
        this.criarPulsoJanela(this.worldAnchor('rbVillageLibrary', 'windowGlow', libraryX, groundY));
        this.criarBandeira(this.worldAnchor('rbVillageLibrary', 'bannerPivot', libraryX, groundY));
        this.criarCataVento(this.worldAnchor('rbVillageLibrary', 'weathervaneTop', libraryX, groundY));
        this.criarCaixote(libraryX + 175, groundY);
        this.criarCaixote(libraryX + 200, groundY, 0.8);

        // ================= FAZENDA =================
        // Depois da biblioteca, a vila abre pro campo — celeiro, moinho,
        // cerca com plantação, espantalho e bichos. Tudo isso é essencial
        // pra uma vila parecer viva de verdade (comida vindo de algum
        // lugar), não só casas decorativas.
        if (!this.textures.exists('rbFarmBarn')) this.fx.bakeFarmBarn(this);
        if (!this.textures.exists('rbWindmill')) this.fx.bakeWindmill(this);

        const barnX = 2480, millX = 2760;
        this.add.image(barnX, groundY, 'rbFarmBarn').setOrigin(0.5, 1);
        this.criarGuindasteFeno(this.worldAnchor('rbFarmBarn', 'hayHook', barnX, groundY));

        this.add.image(millX, groundY, 'rbWindmill').setOrigin(0.5, 1);
        this.criarPasMoinho(this.worldAnchor('rbWindmill', 'axle', millX, groundY));

        this.criarCercaCampo(2900, 3260, groundY);
        this.criarCanteiro(2940, 3220, groundY);
        this.criarEspantalho(3080, groundY);
        this.criarGalinha(2960, groundY);
        this.criarGalinha(3010, groundY);
        this.criarGalinha(3190, groundY);
        this.criarOvelha(3350, groundY);
        this.criarBarril(barnX - 195, groundY);
        this.criarBarril(barnX - 218, groundY, 0.85);

        // ================= LAGO =================
        // Depois do campo — água de verdade (não decoração plana): brilho
        // de sol na superfície, ondulações, ninfeias boiando, patos e o
        // respingo ocasional de um peixe pulando.
        const lago = this.criarLago(3620, 4160, groundY);
        this.criarCais(3660, groundY);
        [3560, 3720, 4260].forEach((x) => this.criarJuncos(x, groundY));
        [3820, 3980, 4060].forEach((x, i) => this.criarNinfeia(x, lago.superficieY + (i % 2 === 0 ? 0 : 3)));
        this.criarPato(3900, lago.superficieY - 6);
        this.criarPato(4000, lago.superficieY - 8);
        [2280, 3480, 4340].forEach((x) => {
            const variante = Phaser.Math.Between(0, 1);
            const arv = this.add.sprite(x, groundY, `rbTree${variante}_0`)
                .setOrigin(0.5, 1).setScale(0.85).setTint(0x8aa588);
            playSway(arv, variante);
        });

        this.add.image(signpostX, groundY, 'rbVillageSignpost').setOrigin(0.5, 1);
        this.criarPiscaLanterna(this.worldAnchor('rbVillageSignpost', 'lanternGlow', signpostX, groundY));

        // --- Camada da frente: árvores grandes nos dois vãos abertos da
        // vila (entre a casa abandonada e o poço, e entre as casas e a
        // biblioteca) + grama rasteira por cima da base das construções
        // — mesma ordem de antes, é o que "aterra" visualmente o pé de
        // cada estrutura. Cada tufo agora balança sozinho (tween de
        // ângulo, em vez de desenho fixo) ---
        [900, 1760].forEach((x) => {
            const variante = Phaser.Math.Between(0, 1);
            const escala = Phaser.Math.FloatBetween(1.35, 1.6);
            const arv = this.add.sprite(x, groundY, `rbTree${variante}_0`).setOrigin(0.5, 1).setScale(escala);
            playSway(arv, variante);
        });
        for (let gx = 20; gx < worldWidth - 20; gx += 70) {
            if (gx > 3600 && gx < 4180) continue; // é o lago — sem grama boiando na água
            this.criarTufoGrama(gx, groundY);
        }

        // --- Poeira de luz flutuando devagar pela vila inteira, igual
        // ao "mote" de IntroScene — última camada, por cima de tudo ---
        for (let i = 0; i < 22; i++) {
            const startY = Phaser.Math.Between(groundY - 260, groundY - 20);
            const mote = this.add.circle(
                Phaser.Math.Between(0, worldWidth), startY,
                Phaser.Math.FloatBetween(1, 2.4), 0xfff2d9, Phaser.Math.FloatBetween(0.2, 0.5)
            );
            this.tweens.add({ targets: mote, y: startY - Phaser.Math.Between(70, 140), duration: Phaser.Math.Between(4000, 8000), repeat: -1, ease: 'Sine.easeInOut' });
            this.tweens.add({ targets: mote, alpha: 0, duration: Phaser.Math.Between(2000, 4000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }

        // --- Pássaros cruzando o céu da vila — mesmo bicho/animação de
        // bater asa que o GameScene já usa (RosebudFX.bakeBirds),
        // atualizados por frame em update() (this.birds), não por tween,
        // porque cruzam o mundo inteiro com wraparound ---
        if (!this.textures.exists('rbBird_0')) this.fx.bakeBirds(this);
        this.birds = [];
        [180, 700, 1400, 2100, 2500].forEach((x) => {
            const bird = this.add.sprite(x, Phaser.Math.Between(60, 160), 'rbBird_0');
            this.time.delayedCall(Phaser.Math.Between(0, 400), () => bird.play('rbBirdFlap'));
            bird.speed = Phaser.Math.FloatBetween(16, 28);
            bird.baseY = bird.y;
            bird.bobPhase = Math.random() * Math.PI * 2;
            this.birds.push(bird);
        });
    }

    // Converte um ponto local gravado em villageAnchors (coordenadas
    // dentro do canvas assado, origem no canto superior esquerdo) pra
    // coordenada de mundo, sabendo que o sprite foi colocado em
    // (spriteX, groundY) com setOrigin(0.5, 1) — ou seja, o centro da
    // BASE do canvas cai exatamente em (spriteX, groundY).
    worldAnchor(textureKey, pointName, spriteX, groundY) {
        const anchors = this.textures.get(textureKey).villageAnchors;
        const p = anchors && anchors[pointName];
        if (!p) return { x: spriteX, y: groundY, meta: null };
        return { x: spriteX + (p.x - anchors.W / 2), y: groundY + (p.y - anchors.H), meta: p };
    }

    // Fumaça da chaminé — 3 baforadas em fases diferentes, cada uma sobe,
    // cresce um pouco e desaparece, e reinicia (repeat:-1 sem yoyo volta
    // pro valor inicial sozinho — mesmo truque do "mote" do IntroScene).
    criarFumaca(pos) {
        for (let i = 0; i < 3; i++) {
            this.time.delayedCall(i * 900, () => {
                const puff = this.add.circle(pos.x, pos.y, 7, 0xcfc9c2, 0.5);
                const duracao = 2600;
                this.tweens.add({ targets: puff, y: pos.y - 70, x: pos.x + Phaser.Math.Between(-6, 14), scale: 1.9, duration: duracao, repeat: -1, ease: 'Sine.easeOut' });
                this.tweens.add({ targets: puff, alpha: 0, duration: duracao, repeat: -1, ease: 'Sine.easeIn' });
            });
        }
    }

    // Brilho de lanterna piscando (portão e placa) — mesmo estilo do
    // "brilho" pulsante usado em CaveScene, só mais rápido e um pouco
    // irregular pra parecer chama, não luz elétrica.
    criarPiscaLanterna(pos) {
        Ambience.light(this, pos.x, pos.y, { radius: 95, color: 0xffc77a, alpha: 0.5, flicker: 0.3 }); // luz noturna acima do filtro
        const brilho = this.add.circle(pos.x, pos.y, 9, 0xffdd99, 0.55);
        this.tweens.add({ targets: brilho, alpha: 0.18, scale: 0.8, duration: Phaser.Math.Between(220, 340), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // Luz de janela de casa: halo quente acima do filtro noturno (só aparece à noite — Ambience.light).
    criarLuzJanela(x, y) {
        Ambience.light(this, x, y, { radius: 105, color: 0xffc16a, alpha: 0.5, flicker: 0.1 });
    }

    // Brilho pulsante por cima da janela redonda da biblioteca —
    // "respiração" lenta, por cima do halo já assado na textura.
    criarPulsoJanela(pos) {
        Ambience.light(this, pos.x, pos.y, { radius: 120, color: 0xfff0c0, alpha: 0.42, flicker: 0.12 });
        const halo = this.add.circle(pos.x, pos.y, 26, 0xfff3cf, 0.35);
        this.tweens.add({ targets: halo, alpha: 0.12, scale: 1.25, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // Balde do poço — corda + balde desenhados em coordenada local (0,0
    // = ponto onde a corda é presa na trave), balançando como um pêndulo
    // ao redor desse ponto.
    criarBalde(pos) {
        const g = this.add.graphics({ x: pos.x, y: pos.y });
        const ropeLen = 26, bucketY = ropeLen;
        g.lineStyle(2, 0xc9b98a, 0.85);
        g.lineBetween(0, 0, 0, bucketY);
        g.fillStyle(0x6b6a62, 1);
        g.fillPoints([
            { x: -8, y: bucketY - 9 }, { x: 8, y: bucketY - 9 },
            { x: 6, y: bucketY + 9 }, { x: -6, y: bucketY + 9 },
        ], true);
        g.lineStyle(1.5, 0x3d2a1a, 1);
        g.beginPath();
        g.arc(0, bucketY - 9, 8, Math.PI, 0, false);
        g.strokePath();
        this.tweens.add({ targets: g, angle: 7, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // Bandeirola da biblioteca — polígono com entalhe em V desenhado já
    // com a forma certa (não um retângulo com um "corte" pintado por
    // cima, que ficaria errado contra a alvenaria em blocos de trás),
    // balançando como uma bandeira de verdade ao redor do mastro.
    criarBandeira(pos) {
        if (!pos.meta) return;
        const w = pos.meta.w, h = pos.meta.h;
        const g = this.add.graphics({ x: pos.x, y: pos.y });
        g.fillStyle(0x7a2e22, 1);
        g.fillPoints([
            { x: -w / 2, y: 0 }, { x: w / 2, y: 0 },
            { x: w / 2, y: h }, { x: 0, y: h - 14 }, { x: -w / 2, y: h },
        ], true);
        this.tweens.add({ targets: g, angle: 6, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // Tufo de grama que balança sozinho — cada um é seu próprio objeto
    // (em vez de um triângulo fixo dentro de um Graphics compartilhado)
    // desenhado em coordenada local a partir do chão, então girar o
    // objeto todo já pivota certinho na base, feito uma folha de grama
    // de verdade balançando com o vento.
    criarTufoGrama(x, groundY) {
        const g = this.add.graphics({ x, y: groundY });
        g.fillStyle(0x33421f, 1);
        g.fillTriangle(-6, 0, 0, -10, 2, 0);
        g.fillTriangle(0, 0, 6, -12, 8, 0);
        this.tweens.add({
            targets: g, angle: Phaser.Math.Between(6, 10),
            duration: Phaser.Math.Between(1800, 2600), delay: Phaser.Math.Between(0, 1000),
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
    }

    // Ondulação na água do poço — dois anéis defasados, cada um nasce
    // pequeno na superfície, cresce (escala, não raio — mais confiável
    // de animar num Arc do Phaser) e desaparece, reiniciando sozinho.
    criarOndulacaoPoco(pos) {
        for (let i = 0; i < 2; i++) {
            this.time.delayedCall(i * 1400, () => {
                const anel = this.add.circle(pos.x, pos.y, 6, 0xcfe9f2, 0);
                anel.setStrokeStyle(1.5, 0xcfe9f2, 0.6);
                const duracao = 2800;
                this.tweens.add({ targets: anel, scale: 3.2, duration: duracao, repeat: -1, ease: 'Sine.easeOut' });
                this.tweens.add({ targets: anel, alpha: 0, duration: duracao, repeat: -1, ease: 'Sine.easeIn' });
            });
        }
    }

    // Barril de madeira — prop estático simples, só pra encher o pé das
    // construções de vida (igual GameScene faz com pedras/moitas soltas).
    criarBarril(x, groundY, escala = 1) {
        const g = this.add.graphics({ x, y: groundY });
        g.fillStyle(0x6b4a30, 1);
        g.fillRoundedRect(-12 * escala, -32 * escala, 24 * escala, 32 * escala, 4 * escala);
        g.lineStyle(2 * escala, 0x3d2a1a, 0.7);
        [8, 20].forEach((dy) => g.lineBetween(-12 * escala, -dy * escala, 12 * escala, -dy * escala));
    }

    // Caixote de madeira — mesmo espírito do barril, com tábuas em X.
    criarCaixote(x, groundY, escala = 1) {
        const g = this.add.graphics({ x, y: groundY });
        const w = 30 * escala, h = 26 * escala;
        g.fillStyle(0x7d5a3a, 1);
        g.fillRect(-w / 2, -h, w, h);
        g.lineStyle(2 * escala, 0x4a3624, 0.8);
        g.strokeRect(-w / 2, -h, w, h);
        g.beginPath();
        g.moveTo(-w / 2, -h); g.lineTo(w / 2, 0);
        g.moveTo(w / 2, -h); g.lineTo(-w / 2, 0);
        g.strokePath();
    }

    // Varal entre duas casas — corda com leve caimento + panos pendurados
    // balançando cada um no seu ritmo (setOrigin no topo = pivota preso
    // na corda, igual uma roupa de verdade balançando).
    criarVaral(x1, x2, y) {
        const g = this.add.graphics();
        g.lineStyle(1.5, 0x8a7a68, 0.8);
        const sag = 10;
        g.beginPath();
        g.moveTo(x1, y);
        g.lineTo((x1 + x2) / 2, y + sag);
        g.lineTo(x2, y);
        g.strokePath();

        const cores = [0xd8d2c4, 0xc85a5a, 0x5a7a9c];
        [0.28, 0.5, 0.72].forEach((t, i) => {
            const px = x1 + (x2 - x1) * t;
            const py = y + sag * 4 * t * (1 - t);
            const pano = this.add.rectangle(px, py + 12, 16, 22, cores[i]).setOrigin(0.5, 0);
            this.tweens.add({
                targets: pano, angle: Phaser.Math.Between(5, 9),
                duration: Phaser.Math.Between(1400, 2000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            });
        });
    }

    // Cata-vento no topo da biblioteca — seta girando bem devagar (uma
    // volta a cada 9s), montada no mastro já assado na textura.
    criarCataVento(pos) {
        const g = this.add.graphics({ x: pos.x, y: pos.y });
        g.fillStyle(0x9ba3ae, 1);
        g.fillTriangle(-14, 0, 10, -4, 10, 4);
        g.fillTriangle(10, -4, 22, 0, 10, 4);
        g.lineStyle(2, 0x9ba3ae, 1);
        g.lineBetween(0, -12, 0, 12);
        this.tweens.add({ targets: g, angle: 360, duration: 9000, repeat: -1, ease: 'Linear' });
    }

    // ============ FAZENDA ============

    // Corda + gancho do guindaste de feno do celeiro — mesmo princípio
    // de pêndulo do balde do poço.
    criarGuindasteFeno(pos) {
        const g = this.add.graphics({ x: pos.x, y: pos.y });
        g.lineStyle(2, 0xc9b98a, 0.85);
        g.lineBetween(0, 0, 0, 30);
        g.lineStyle(2.5, 0x3d2a1a, 1);
        g.beginPath();
        g.arc(0, 34, 5, Math.PI, Math.PI * 0.2, false);
        g.strokePath();
        this.tweens.add({ targets: g, angle: 6, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // Pás do moinho — gira inteiro em volta do eixo assado na textura
    // (this.fx.bakeWindmill), rápido o bastante pra ler como moinho de
    // vento de verdade, não um enfeite parado.
    criarPasMoinho(pos) {
        const g = this.add.graphics({ x: pos.x, y: pos.y });
        [0, 90, 180, 270].forEach((angDeg) => {
            g.save();
            g.rotateCanvas(Phaser.Math.DegToRad(angDeg));
            g.fillStyle(0xe8e0d0, 1);
            g.fillRect(-5, -44, 10, 44);
            g.fillStyle(0xcfc4ac, 1);
            g.fillRect(-5, -44, 4, 44);
            g.restore();
        });
        g.fillStyle(0x241d18, 1);
        g.fillCircle(0, 0, 6);
        this.tweens.add({ targets: g, angle: 360, duration: 3600, repeat: -1, ease: 'Linear' });
    }

    // Cerca de madeira na frente do campo plantado — só a face da
    // frente (é um jogo de perfil, não precisa fechar os 4 lados).
    criarCercaCampo(x1, x2, groundY) {
        const g = this.add.graphics();
        g.lineStyle(5, 0x8a6a45, 1);
        for (let x = x1; x <= x2; x += 40) g.lineBetween(x, groundY - 34, x, groundY);
        g.lineStyle(4, 0x9c7a52, 1);
        g.lineBetween(x1, groundY - 26, x2, groundY - 26);
        g.lineBetween(x1, groundY - 10, x2, groundY - 10);
    }

    // Canteiro plantado — terra revirada com fileiras de brotinhos, cada
    // um balançando sozinho (mesmo truque do tufo de grama).
    criarCanteiro(x1, x2, groundY) {
        const g = this.add.graphics();
        g.fillStyle(0x5c4a30, 0.6);
        g.fillRect(x1, groundY - 6, x2 - x1, 8);
        for (let x = x1 + 14; x < x2 - 10; x += 26) {
            for (let i = 0; i < 3; i++) this.criarBrotinho(x + i * 8 - 8, groundY);
        }
    }

    criarBrotinho(x, groundY) {
        const g = this.add.graphics({ x, y: groundY - 2 });
        g.fillStyle(0x4a7a3a, 1);
        g.fillTriangle(-3, 0, 0, -9, 3, 0);
        this.tweens.add({
            targets: g, angle: Phaser.Math.Between(5, 8),
            duration: Phaser.Math.Between(1600, 2400), delay: Phaser.Math.Between(0, 900),
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
    }

    // Espantalho — balança inteiro bem devagar, feito vento passando.
    criarEspantalho(x, groundY) {
        const g = this.add.graphics({ x, y: groundY });
        g.fillStyle(0x6b4a30, 1);
        g.fillRect(-3, -85, 6, 85);
        g.fillRect(-24, -62, 48, 5);
        g.fillStyle(0x8a6a45, 1);
        g.fillRect(-16, -78, 32, 22);
        [-24, 24].forEach((dx) => {
            g.fillStyle(0x6b5a3a, 1);
            g.fillTriangle(dx, -60, dx + (dx > 0 ? 10 : -10), -50, dx, -46);
        });
        g.fillStyle(0xa9895f, 1);
        g.fillCircle(0, -92, 10);
        g.fillStyle(0x3f342a, 1);
        g.fillTriangle(-8, -96, 0, -105, 8, -96);
        this.tweens.add({ targets: g, angle: 4, duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // Galinha — ciclo de bicar esporádico (não contínuo, senão vira só
    // um tremor): espera um tempo aleatório, dá uma bicada rápida,
    // espera de novo.
    criarGalinha(x, groundY) {
        const g = this.add.graphics({ x, y: groundY });
        g.fillStyle(0xe8e0d0, 1);
        g.fillEllipse(0, -10, 20, 14);
        g.fillCircle(9, -16, 7);
        g.fillStyle(0xc85a3a, 1);
        g.fillTriangle(9, -13, 16, -11, 9, -9);
        g.fillTriangle(-2, -22, 2, -22, 0, -26);
        g.fillStyle(0xd8a03a, 1);
        g.fillTriangle(-3, -2, 3, -2, 0, 4);
        const bicar = () => {
            this.tweens.add({
                targets: g, y: groundY + 5, duration: 120, yoyo: true, ease: 'Quad.easeIn',
                onComplete: () => this.time.delayedCall(Phaser.Math.Between(1500, 3500), bicar),
            });
        };
        this.time.delayedCall(Phaser.Math.Between(0, 2500), bicar);
    }

    // Ovelha — cabeça baixa pra pastar de vez em quando (rotação leve do
    // corpo todo, é uma aproximação simples que funciona bem nessa
    // escala).
    criarOvelha(x, groundY) {
        const g = this.add.graphics({ x, y: groundY });
        g.fillStyle(0x3f342a, 1);
        [-14, -4, 8, 18].forEach((lx) => g.fillRect(lx, -12, 4, 12));
        g.fillStyle(0xf0ede4, 1);
        g.fillEllipse(0, -22, 46, 26);
        g.fillCircle(-18, -30, 12);
        g.fillCircle(-2, -32, 13);
        g.fillCircle(14, -28, 12);
        g.fillStyle(0x3f342a, 1);
        g.fillEllipse(-26, -22, 12, 10);
        const pastar = () => {
            this.tweens.add({
                targets: g, angle: -6, duration: 900, yoyo: true, ease: 'Sine.easeInOut',
                onComplete: () => this.time.delayedCall(Phaser.Math.Between(2200, 4500), pastar),
            });
        };
        this.time.delayedCall(Phaser.Math.Between(0, 2000), pastar);
    }

    // ============ LAGO ============

    // Água de verdade: brilhos de sol piscando em pontos aleatórios da
    // superfície, ondulações e peixes pulando de vez em quando — tudo
    // gerado uma vez e reciclado (destroy) em vez de acumular objetos
    // pra sempre.
    criarLago(x1, x2, groundY) {
        const largura = x2 - x1, profundidade = 90;
        const topoY = groundY - profundidade + 10;
        const superficieY = groundY - profundidade + 14;
        const segs = Math.max(6, Math.round(largura / 60));
        const ondaY = (i) => topoY + Math.sin(i * 1.7) * 5;
        const g = this.add.graphics();

        // margem de terra/lama — SEM isso a água parecia flutuar sobre a
        // grama sem apoio nenhum. Mais larga que a água (por baixo dela)
        // e com uma faixa mais escura (barro molhado) bem na beirada.
        const margemExtra = 26;
        g.fillStyle(0x6b5a3c, 0.9);
        g.beginPath();
        g.moveTo(x1 - margemExtra, groundY + 12);
        for (let i = 0; i <= segs; i++) g.lineTo(x1 + (largura * i) / segs, ondaY(i) - 7);
        g.lineTo(x2 + margemExtra, groundY + 12);
        g.closePath(); g.fillPath();

        g.fillStyle(0x4a3a24, 0.8);
        g.beginPath();
        g.moveTo(x1 - margemExtra * 0.35, groundY + 12);
        for (let i = 0; i <= segs; i++) g.lineTo(x1 + (largura * i) / segs, ondaY(i) - 2);
        g.lineTo(x2 + margemExtra * 0.35, groundY + 12);
        g.closePath(); g.fillPath();

        // corpo d'água em duas camadas — escura embaixo (dá profundidade
        // de verdade, não uma cor chapada) e um tom médio mais raso perto
        // da beirada
        g.fillStyle(0x1f4a5e, 1);
        g.beginPath();
        g.moveTo(x1, groundY + 10);
        for (let i = 0; i <= segs; i++) g.lineTo(x1 + (largura * i) / segs, ondaY(i));
        g.lineTo(x2, groundY + 10);
        g.closePath(); g.fillPath();

        g.fillStyle(0x2f6a86, 1);
        g.beginPath();
        g.moveTo(x1 + 10, groundY + 10);
        for (let i = 0; i <= segs; i++) g.lineTo(x1 + 10 + ((largura - 20) * i) / segs, ondaY(i) + 5);
        g.lineTo(x2 - 10, groundY + 10);
        g.closePath(); g.fillPath();

        // reflexo do céu — faixa clara só logo abaixo da superfície,
        // acompanhando a mesma ondulação do topo (é o que faz ler como
        // água de verdade, não uma piscina de tinta)
        g.fillStyle(0x9fd0e0, 0.35);
        g.beginPath();
        g.moveTo(x1 + 14, superficieY + 20);
        for (let i = 0; i <= segs; i++) g.lineTo(x1 + (largura * i) / segs, ondaY(i) + 1);
        g.lineTo(x2 - 14, superficieY + 20);
        g.closePath(); g.fillPath();
        g.fillStyle(0xdff3ff, 0.3);
        g.fillEllipse(x1 + largura * 0.32, superficieY, largura * 0.22, 8);
        g.fillEllipse(x1 + largura * 0.68, superficieY + 4, largura * 0.16, 6);

        // pedras na beirada — ancoram visualmente onde a terra encontra
        // a água, dos dois lados
        [
            [x1 + 6, 0x7c7c74], [x1 + 30, 0x6b665c],
            [x2 - 10, 0x6b665c], [x2 - 34, 0x7c7c74],
        ].forEach(([px, cor]) => {
            g.fillStyle(cor, 1);
            g.fillEllipse(px, topoY + 4, 15, 9);
            g.fillStyle(0x000000, 0.15);
            g.fillEllipse(px, topoY + 8, 15, 4);
        });

        for (let i = 0; i < 16; i++) {
            const px = Phaser.Math.Between(x1 + 20, x2 - 20);
            const py = groundY - profundidade + Phaser.Math.Between(14, profundidade - 10);
            const brilho = this.add.circle(px, py, Phaser.Math.FloatBetween(1.5, 3), 0xdff3ff, 0.5);
            this.tweens.add({
                targets: brilho, alpha: 0.05, duration: Phaser.Math.Between(700, 1600),
                yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 1500), ease: 'Sine.easeInOut',
            });
        }

        const gerarOndulacao = () => {
            const px = Phaser.Math.Between(x1 + 30, x2 - 30);
            const anel = this.add.circle(px, superficieY, 5, 0xdff3ff, 0);
            anel.setStrokeStyle(1.2, 0xdff3ff, 0.5);
            this.tweens.add({ targets: anel, scale: 4, duration: 3200, ease: 'Sine.easeOut' });
            this.tweens.add({ targets: anel, alpha: 0, duration: 3200, ease: 'Sine.easeIn', onComplete: () => anel.destroy() });
            this.time.delayedCall(Phaser.Math.Between(1200, 2600), gerarOndulacao);
        };
        gerarOndulacao();

        const pularPeixe = () => {
            const px = Phaser.Math.Between(x1 + 40, x2 - 40);
            const respingo = this.add.circle(px, superficieY, 4, 0xffffff, 0.8);
            this.tweens.add({
                targets: respingo, scale: 3, alpha: 0, duration: 500, ease: 'Sine.easeOut',
                onComplete: () => respingo.destroy(),
            });
            this.time.delayedCall(Phaser.Math.Between(3000, 7000), pularPeixe);
        };
        this.time.delayedCall(Phaser.Math.Between(1000, 3000), pularPeixe);
        return { superficieY };
    }

    // Cais de madeira simples, saindo da margem pra dentro d'água.
    criarCais(x, groundY) {
        const g = this.add.graphics();
        for (let i = 0; i < 5; i++) {
            g.fillStyle(i % 2 === 0 ? 0x6b4a30 : 0x5c3f28, 1);
            g.fillRect(x + i * 22, groundY - 92, 20, 6);
        }
        [0, 4].forEach((i) => {
            g.fillStyle(0x4a3624, 1);
            g.fillRect(x + i * 22 + 6, groundY - 86, 6, 40);
        });
    }

    // Taboas/juncos na margem — folhas altas balançando, mais devagar
    // que a grama comum.
    criarJuncos(x, groundY) {
        const g = this.add.graphics({ x, y: groundY });
        g.fillStyle(0x3f5a2f, 1);
        [-6, 0, 6].forEach((dx, i) => g.fillTriangle(dx - 2, 0, dx, -34 - i * 4, dx + 2, 0));
        g.fillStyle(0x5a3f28, 1);
        g.fillEllipse(0, -34, 4, 10);
        this.tweens.add({
            targets: g, angle: Phaser.Math.Between(4, 7),
            duration: Phaser.Math.Between(2000, 2800), delay: Phaser.Math.Between(0, 1000),
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
    }

    // Ninféia boiando — sobe e desce bem de leve, feito flutuando na
    // água mesmo.
    criarNinfeia(x, y) {
        const g = this.add.graphics({ x, y });
        g.fillStyle(0x3a6b3a, 1);
        g.fillEllipse(0, 0, 26, 12);
        g.fillStyle(0xe8829a, 0.9);
        g.fillCircle(0, -1, 3);
        this.tweens.add({ targets: g, y: y - 2, duration: Phaser.Math.Between(1800, 2600), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // Pato — bobbing vertical + deriva horizontal lenta de um lado pro
    // outro, feito nadando sem pressa.
    criarPato(x, y) {
        const g = this.add.graphics({ x, y });
        g.fillStyle(0xe8e0d0, 1);
        g.fillEllipse(0, 0, 24, 14);
        g.fillCircle(10, -8, 8);
        g.fillStyle(0xd8a03a, 1);
        g.fillTriangle(16, -8, 24, -6, 16, -4);
        g.fillStyle(0x3f342a, 1);
        g.fillCircle(12, -10, 1.5);
        this.tweens.add({ targets: g, y: y - 3, duration: Phaser.Math.Between(1600, 2200), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.tweens.add({ targets: g, x: x + Phaser.Math.Between(30, 60), duration: Phaser.Math.Between(6000, 9000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    drawScar(g, x, groundY) {
        g.fillStyle(0x3c3830, 0.5);
        g.fillEllipse(x, groundY + 4, 90, 22);
        g.fillStyle(0xe8a3c4, 1);
        [[-22, -2], [0, 4], [20, -3], [-14, 8], [16, 9]].forEach((p) => {
            g.fillCircle(x + p[0], groundY + p[1], 3);
        });
        this.criarTufoGrama(x - 12, groundY + 4);
        this.criarTufoGrama(x + 14, groundY + 6);
    }

    // ==================== BIBLIOTECA (entrada) ====================
    // Os "registros antigos" (antes um popup na porta, ver codexEntries)
    // moraram aqui até virarem um dos livros de dentro da LibraryScene —
    // ver esse arquivo pro texto de lore e os livros de magia.
    enterLibrary() {
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('LibraryScene', {
                playerName: this.playerName,
                hp: this.hp, maxHp: this.maxHp,
                mana: this.mana, maxMana: this.maxMana,
                playerLevel: this.playerLevel,
                playerExperience: this.playerExperience,
                experienceToNextLevel: this.experienceToNextLevel,
                playerAttributes: { ...this.playerAttributes },
                titleBonus: { ...this.titleBonus },
                spellBonus: { ...this.spellBonus },
                unlockedTitles: [...this.unlockedTitles],
                learnedSpells: [...this.learnedSpells],
                equippedTitle: this.equippedTitle,
                inventory: { ...this.inventory },
                // Mesmo motivo do touch/fx/storage injetados aqui pela
                // GameScene — ver a nota no topo do arquivo. Repassados
                // adiante tal qual recebidos, não geramos referências novas.
                touch: this.touch,
                syncSaveSlot: this.syncSaveSlot,
                fx: this.fx,
                storage: this.storage,
                caveProgress: this.caveProgress,
            });
        });
    }

    // ==================== POÇO (ponto de save) ====================
    createRestFeedback() {
        this.saveFeedback = this.add.text(this.cameras.main.width / 2, 60, 'Progresso salvo!', {
            fontSize: '14px', fill: '#8aff8a', fontStyle: 'bold', backgroundColor: '#000000aa', padding: { x: 6, y: 3 },
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setAlpha(0);
    }

    restAtWell() {
        // this.syncSaveSlot é a rbSyncSaveSlot() do arquivo principal,
        // injetada por GameScene (ver init() e a nota no topo do arquivo).
        // Ela lê os mesmos nomes de campo que esta cena mantém em `this` —
        // funciona sem adaptação nenhuma, igual ao cristal de save da caverna.
        this.syncSaveSlot(this);
        this.saveFeedback.setAlpha(1);
        this.tweens.add({ targets: this.saveFeedback, alpha: 0, duration: 1400, delay: 500 });
    }

    // Mesma fórmula do GameScene/CaveScene (ver a versão lá pra comentário
    // completo) — necessário pro menu de títulos (PlayerMenu.js)
    // funcionar aqui: equipTitle() chama isto pra recalcular maxHp/maxMana
    // depois de trocar o bônus do título.
    updatePlayerStats(fullHeal = false) {
        Object.keys(this.baseAttributes).forEach(attr => {
            this.playerAttributes[attr] = this.baseAttributes[attr];
        });
        Object.keys(this.titleBonus).forEach(attr => {
            this.playerAttributes[attr] += this.titleBonus[attr];
        });
        Object.keys(this.spellBonus).forEach(attr => {
            this.playerAttributes[attr] += this.spellBonus[attr];
        });

        const hpAntes = this.hp, manaAntes = this.mana;
        this.maxHp = 30 + (this.playerAttributes.constitution * 5);
        this.maxMana = 5 + (this.playerAttributes.intelligence * 2);
        if (fullHeal || hpAntes === undefined || hpAntes === null) {
            this.hp = this.maxHp;
            this.mana = this.maxMana;
        } else {
            this.hp = Math.min(hpAntes, this.maxHp);
            this.mana = Math.min(manaAntes === undefined || manaAntes === null ? this.maxMana : manaAntes, this.maxMana);
        }
        if (this.playerController) this.playerController.setHealth(this.hp, this.maxHp);
        if (this.playerMenu) this.playerMenu.updateHUD();
    }

    // ==================== SAÍDA ====================
    enterJourney() {
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('GameScene', {
                returnFromVillage: true,
                playerName: this.playerName,
                hp: this.hp, maxHp: this.maxHp,
                mana: this.mana, maxMana: this.maxMana,
                playerLevel: this.playerLevel,
                playerExperience: this.playerExperience,
                experienceToNextLevel: this.experienceToNextLevel,
                playerAttributes: { ...this.playerAttributes },
                titleBonus: { ...this.titleBonus },
                spellBonus: { ...this.spellBonus },
                unlockedTitles: [...this.unlockedTitles],
                learnedSpells: [...this.learnedSpells],
                // GameScene.init(), no caminho normal (fora do early-return
                // de returnFromCave), lê "playerTitle", não "equippedTitle"
                // — ver o próprio init() lá. Mantendo o nome certo aqui pra
                // não perder o título silenciosamente.
                playerTitle: this.equippedTitle,
                inventory: { ...this.inventory },
            });
        });
    }
}
