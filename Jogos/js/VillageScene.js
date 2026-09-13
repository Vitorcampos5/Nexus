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

   DEPENDÊNCIAS INJETADAS (touch / syncSaveSlot / fx)
   -----------------------------------------------------------------
   Diferente de PlayerController/Enemy/Scenery (que são utilitários de
   verdade sem estado do jogo), RosebudTouch, rbSyncSaveSlot e RosebudFX
   são declarados dentro da IIFE do script inline principal do HTML — não
   são globais de página. GameScene/CaveScene, por estarem definidas
   dentro dessa mesma IIFE, conseguem chamá-los pelo nome direto. Este
   arquivo NÃO consegue: é um <script src> à parte, fora da IIFE, então
   `RosebudTouch`/`rbSyncSaveSlot`/`RosebudFX` soltos aqui dão
   ReferenceError (foi exatamente o bug corrigido nesta versão). Por isso
   GameScene passa as referências vivas em `data.touch`, `data.syncSaveSlot`
   e `data.fx` no scene.start(), e este arquivo só usa
   `this.touch`/`this.syncSaveSlot`/`this.fx` — o mesmo princípio de
   injeção que o `checkTouchInteract` do Scenery.js já usa. As construções
   da vila (bakeVillageGate/Huts/Well/Library/Signpost, em this.fx) seguem
   o mesmo padrão de "assar com Two.js" que bakeTrees/bakeBirds já usam em
   GameScene — ver createVillageDecorations() mais abaixo.
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
        this.codexOpen = false;

        // Injetados por GameScene via scene.start('VillageScene', {...}) —
        // ver nota "DEPENDÊNCIAS INJETADAS" no topo do arquivo.
        this.touch = null;
        this.syncSaveSlot = null;
        this.fx = null; // RosebudFX — bake das construções da vila com Two.js

        this.baseAttributes = { constitution: 1, luck: 1, defense: 1, attack: 1, intelligence: 1, agility: 1 };
        this.playerName = 'Aventureiro';
        this.hp = 30; this.maxHp = 30;
        this.mana = 5; this.maxMana = 5;
        this.playerLevel = 1; this.playerExperience = 0; this.experienceToNextLevel = 100;
        this.playerAttributes = { ...this.baseAttributes };
        this.titleBonus = {};
        this.unlockedTitles = ['Novato'];
        this.equippedTitle = 'Novato';
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
        this.unlockedTitles = data.unlockedTitles ? [...data.unlockedTitles] : ['Novato'];
        this.equippedTitle = data.equippedTitle || 'Novato';
        this.inventory = data.inventory ? { ...data.inventory } : { slimeGoo: 0 };
        this.codexOpen = false;

        // RosebudTouch e rbSyncSaveSlot vivem dentro da IIFE do script
        // principal — GameScene injeta as referências aqui porque este
        // arquivo, sendo <script src> à parte, não enxerga esses nomes
        // diretamente (ver nota no topo do arquivo).
        this.touch = data.touch;
        this.syncSaveSlot = data.syncSaveSlot;
        this.fx = data.fx;
    }

    preload() {
        // Nada pra carregar — 'player', animações, 'sky' e 'clouds' já
        // vieram da GameScene (ver nota no topo do arquivo).
    }

    create() {
        const W = 2700, H = 600, groundHeight = 25;
        this.width = W; this.height = H; this.groundHeight = groundHeight;
        const groundY = H - groundHeight;

        this.physics.world.setBounds(0, 0, W, H);

        const backgroundImage = this.add.tileSprite(0, 0, W, H, 'sky').setOrigin(0);
        backgroundImage.setScrollFactor(0.1);
        this.clouds = this.add.tileSprite(0, -80, W, H, 'clouds').setOrigin(0).setScale(2.5);
        this.clouds.setScrollFactor(0.2);

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
        const initialX = 60;
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

        this.touch.init();
        this.touch.show();

        this.libraryX = 2000;
        this.wellX = 1060;
        this.signpostX = 2380;

        this.libraryZone = new InteractionZone(this, {
            x: this.libraryX, y: groundY - 40, radius: 95,
            interactKey: this.interactKey,
            checkTouchInteract: () => this.touch.consumir('interactPress'),
            getPlayerPosition: () => ({ x: this.player.x, y: this.player.y }),
            getHintText: () => 'Pressione E para ler os registros antigos',
            onInteract: () => this.openCodex(),
        });

        this.wellZone = new InteractionZone(this, {
            x: this.wellX, y: groundY - 20, radius: 80,
            interactKey: this.interactKey,
            checkTouchInteract: () => this.touch.consumir('interactPress'),
            getPlayerPosition: () => ({ x: this.player.x, y: this.player.y }),
            getHintText: () => 'Pressione E para descansar junto ao poço',
            isRelevant: () => !this.codexOpen,
            onInteract: () => this.restAtWell(),
        });

        this.exitZone = new InteractionZone(this, {
            x: this.signpostX, y: groundY - 40, radius: 80,
            interactKey: this.interactKey,
            checkTouchInteract: () => this.touch.consumir('interactPress'),
            getPlayerPosition: () => ({ x: this.player.x, y: this.player.y }),
            getHintText: () => 'Pressione E para seguir viagem',
            isRelevant: () => !this.codexOpen,
            onInteract: () => this.enterJourney(),
        });

        this.cameras.main.startFollow(this.player);
        this.cameras.main.setZoom(1);
        this.cameras.main.setBounds(0, 0, W, H);

        this.createCodexUI();
        this.createRestFeedback();

        const welcomeMessage = this.add.text(this.cameras.main.centerX, 40, `${this.playerName}, sua jornada começa aqui.`, {
            fontSize: '18px', fill: '#f3d9a4', fontStyle: 'italic', padding: { x: 10, y: 5 },
        }).setOrigin(0.5).setScrollFactor(0);
        this.time.delayedCall(6000, () => welcomeMessage.destroy());

        this.cameras.main.fadeIn(300, 0, 0, 0);
    }

    update(time, delta) {
        this.libraryZone.update();
        this.wellZone.update();
        this.exitZone.update();

        this.dayNightCheckTimer += (delta || 16);
        if (this.dayNightCheckTimer > 5000) {
            this.dayNightCheckTimer = 0;
            this.dayNightCycle.update();
        }

        // Codex aberto trava o movimento, igual diálogo trava na GameScene
        // (ver isDialogOpen lá) — sem isso dava pra sair andando com o
        // texto de lore ainda na tela.
        if (this.codexOpen) return;

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
        // simplificado de antes — mesmo tronco+copa animados que o
        // GameScene usa, só maiores aqui pra condizer com o porte novo
        // das construções.
        if (!this.textures.exists('rbVillageGate')) this.fx.bakeVillageGate(this);
        if (!this.textures.exists('rbHutNormal0')) this.fx.bakeVillageHuts(this);
        if (!this.textures.exists('rbVillageWell')) this.fx.bakeVillageWell(this);
        if (!this.textures.exists('rbVillageLibrary')) this.fx.bakeVillageLibrary(this);
        if (!this.textures.exists('rbVillageSignpost')) this.fx.bakeVillageSignpost(this);
        if (!this.textures.exists('rbTree0_0')) this.fx.bakeTrees(this);

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
        this.add.image(200, groundY, 'rbVillageGate').setOrigin(0.5, 1);
        this.add.image(460, groundY, 'rbHutNormal0').setOrigin(0.5, 1);
        this.add.image(740, groundY, 'rbHutAbandoned').setOrigin(0.5, 1);
        this.add.image(this.wellX !== undefined ? this.wellX : 1060, groundY, 'rbVillageWell').setOrigin(0.5, 1);
        this.add.image(1300, groundY, 'rbHutNormal1').setOrigin(0.5, 1);
        this.add.image(1560, groundY, 'rbHutNormal2').setOrigin(0.5, 1);
        this.add.image(this.libraryX !== undefined ? this.libraryX : 2000, groundY, 'rbVillageLibrary').setOrigin(0.5, 1);
        this.add.image(this.signpostX !== undefined ? this.signpostX : 2380, groundY, 'rbVillageSignpost').setOrigin(0.5, 1);

        // --- Camada da frente: árvores grandes nos dois vãos abertos da
        // vila (entre a casa abandonada e o poço, e entre as casas e a
        // biblioteca) + grama rasteira por cima da base das construções
        // — mesma ordem de antes, é o que "aterra" visualmente o pé de
        // cada estrutura ---
        const gFront = this.add.graphics();
        [900, 1760].forEach((x) => {
            const variante = Phaser.Math.Between(0, 1);
            const escala = Phaser.Math.FloatBetween(1.35, 1.6);
            const arv = this.add.sprite(x, groundY, `rbTree${variante}_0`).setOrigin(0.5, 1).setScale(escala);
            playSway(arv, variante);
        });
        for (let gx = 20; gx < worldWidth - 20; gx += 70) {
            this.drawGrassTuft(gFront, gx, groundY);
        }
    }

    drawGrassTuft(g, x, groundY) {
        g.fillStyle(0x33421f, 1);
        g.fillTriangle(x - 6, groundY, x, groundY - 10, x + 2, groundY);
        g.fillTriangle(x, groundY, x + 6, groundY - 12, x + 8, groundY);
    }

    drawScar(g, x, groundY) {
        g.fillStyle(0x3c3830, 0.5);
        g.fillEllipse(x, groundY + 4, 90, 22);
        g.fillStyle(0xe8a3c4, 1);
        [[-22, -2], [0, 4], [20, -3], [-14, 8], [16, 9]].forEach((p) => {
            g.fillCircle(x + p[0], groundY + p[1], 3);
        });
        this.drawGrassTuft(g, x - 12, groundY + 4);
        this.drawGrassTuft(g, x + 14, groundY + 6);
    }

    // ==================== CODEX (biblioteca) ====================
    createCodexUI() {
        const cam = this.cameras.main;
        const w = Math.min(560, cam.width - 40);
        const h = 220;
        const cx = cam.width / 2, cy = cam.height / 2;

        this.codexBg = this.add.rectangle(cx, cy, w, h, 0x14101f, 0.92)
            .setScrollFactor(0).setDepth(1000).setStrokeStyle(2, 0xc9b98a).setVisible(false);
        this.codexTitle = this.add.text(cx, cy - h / 2 + 22, 'Registros Antigos', {
            fontSize: '18px', fill: '#f3d9a4', fontStyle: 'bold',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1001).setVisible(false);
        this.codexText = this.add.text(cx, cy, '', {
            fontSize: '14px', fill: '#e8e0d8', align: 'center', wordWrap: { width: w - 48 },
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1001).setVisible(false);
        this.codexHint = this.add.text(cx, cy + h / 2 - 18, 'Pressione E para continuar — ESC para fechar', {
            fontSize: '12px', fill: '#b8a9c9', fontStyle: 'italic',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1001).setVisible(false);

        this.codexEntries = [
            'Os registros falam de quatro reinos: o Celestial, o Reino do Destino, o Humano e o Primordial do Caos — de onde todos os seres surgiram.',
            'Enquanto houver vida, haverá morte. Enquanto houver o conceito de monstro, monstros existirão. Humanos podem se tornar monstros; monstros podem se tornar humanos. Tudo depende do desejo do ser.',
            'Seres celestiais visitavam o mundo humano em tempos antigos e deixaram artefatos de proteção para trás. Por que pararam de visitar, os registros não dizem.',
        ];
        this.codexIndex = 0;

        this.input.keyboard.on('keydown-ESC', () => { if (this.codexOpen) this.closeCodex(); });
    }

    openCodex() {
        if (!this.codexOpen) {
            this.codexOpen = true;
            this.codexIndex = 0;
            this.codexText.setText(this.codexEntries[this.codexIndex]);
            [this.codexBg, this.codexTitle, this.codexText, this.codexHint].forEach((o) => o.setVisible(true));
            return;
        }
        this.codexIndex++;
        if (this.codexIndex >= this.codexEntries.length) { this.closeCodex(); return; }
        this.codexText.setText(this.codexEntries[this.codexIndex]);
    }

    closeCodex() {
        this.codexOpen = false;
        [this.codexBg, this.codexTitle, this.codexText, this.codexHint].forEach((o) => o.setVisible(false));
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
                unlockedTitles: [...this.unlockedTitles],
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
