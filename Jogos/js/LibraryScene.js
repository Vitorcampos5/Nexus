/* =====================================================================
   LibraryScene — interior da biblioteca da vila.

   Entrada/saída: VillageScene.enterLibrary() traz o jogador pra cá (porta
   à esquerda) e a saída daqui devolve pra VillageScene com
   `returnFromLibrary: true` (só pra ela saber que não deve repetir a
   mensagem de boas-vindas — é uma ida-e-volta dentro da mesma visita à
   vila, não uma nova chegada).

   DEPENDÊNCIAS INJETADAS — mesmo motivo/mecanismo de VillageScene.js (ver
   a nota equivalente lá): RosebudTouch, rbSyncSaveSlot, RosebudFX e
   rbStorage vivem dentro da IIFE do script principal; como este arquivo é
   um <script src> à parte, VillageScene repassa as referências que ela
   mesma recebeu da GameScene (this.touch/syncSaveSlot/fx/storage), sem
   gerar nada novo.

   O QUE MOROU AQUI (não existia antes):
   - Os "registros antigos" — antes um popup ao interagir com a porta por
     fora (ver VillageScene.js, seção BIBLIOTECA (entrada), o comentário
     lá explica a mudança) — agora é a estante de registros, lida de
     dentro, junto dos livros de magia.
   - PlayerMenu.SPELLS (ver PlayerMenu.js): 3 livros, um por magia. Ler
     ensina — chama learnSpell(), que builtin cuida de cada tipo (attack/
     passive/ability) diferente. Passive aplica o bônus na hora (ver
     spellBonus, mesmo mecanismo de titleBonus: um bônus PERMANENTE
     precisa da própria variável carregada em toda troca de cena, porque
     baseAttributes é resetado pro padrão a cada cena — só empilhar em
     baseAttributes direto se perderia ao trocar de cena).

   VISUAL: sem cenário assado em Two.js (RosebudFX) — só
   Phaser.Graphics/tileSprite procedural, mesmo princípio econômico do
   createCaveEntrance() da GameScene ou do ProceduralGround (Scenery.js):
   uma sala pequena não precisa do mesmo investimento das construções
   externas da vila.
   ===================================================================== */

const LIBRARY_RECORDS_PAGES = [
    'Os registros falam de quatro reinos: o Celestial, o Reino do Destino, o Humano e o Primordial do Caos — de onde todos os seres surgiram.',
    'Enquanto houver vida, haverá morte. Enquanto houver o conceito de monstro, monstros existirão. Humanos podem se tornar monstros; monstros podem se tornar humanos. Tudo depende do desejo do ser.',
    'Seres celestiais visitavam o mundo humano em tempos antigos e deixaram artefatos de proteção para trás. Por que pararam de visitar, os registros não dizem.',
];

class LibraryScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LibraryScene' });

        this.player = null;
        this.playerController = null;
        this.playerMenu = null;

        this.hp = 30; this.maxHp = 30;
        this.mana = 5; this.maxMana = 5;
        this.playerLevel = 1; this.playerExperience = 0; this.experienceToNextLevel = 100;
        this.baseAttributes = { constitution: 1, luck: 1, defense: 1, attack: 1, intelligence: 1, agility: 1 };
        this.playerAttributes = { ...this.baseAttributes };
        this.titleBonus = {};
        this.spellBonus = {};
        this.unlockedTitles = ['Novato'];
        this.equippedTitle = 'Novato';
        this.learnedSpells = [];
        this.inventory = { slimeGoo: 0 };
        this.playerName = '';

        // Overlay de leitura (estante de registros + os 3 livros) — mesmo
        // padrão visual do antigo Codex da VillageScene (retângulo+título+
        // texto+dica, E avança/ESC fecha), só generalizado pra aceitar
        // várias páginas de qualquer origem em vez de um array fixo só.
        this.readingOpen = false;
        this.readingPages = [];
        this.readingIndex = 0;
        this.readingOnComplete = null;

        this.touch = null;
        this.syncSaveSlot = null;
        this.fx = null;
        this.storage = null;
        this.caveProgress = null; // RosebudCaveProgress — mesmo motivo/padrão, só pra saber se o lobo de cristal (Companion.js) já foi libertado
        this.companion = null;
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

        this.touch = data.touch;
        this.syncSaveSlot = data.syncSaveSlot;
        this.fx = data.fx;
        this.storage = data.storage;
        this.caveProgress = data.caveProgress;
    }

    create() {
        // Igual à CaveScene (ver lá): o jogo roda em Phaser.Scale.RESIZE, ou
        // seja, o canvas de verdade acompanha a janela — não é um tamanho
        // fixo. Um mundo fixo de 1000x500 (o que estava aqui antes) fica
        // MENOR que a viewport real em telas maiores, e como a câmera não
        // tem o que desenhar além dos limites do mundo, sobra uma faixa
        // preta à direita/embaixo — era exatamente o problema reportado.
        const W = Math.max(1000, this.cameras.main.width), H = 600, groundHeight = 25;
        this.width = W; this.height = H; this.groundHeight = groundHeight;
        const groundY = H - groundHeight;

        this.physics.world.setBounds(0, 0, W, H);

        // Parede de fundo — pedra escura procedural, sem asset externo,
        // textura PRÓPRIA ('libraryWallTexture') pelo mesmo motivo de
        // villageHillsFar/Near terem chave própria (ver nota em
        // VillageScene.js): nunca reaproveitar chave de textura por nome
        // entre cenas diferentes.
        if (!this.textures.exists('libraryWallTexture')) {
            const tile = 128, block = 32;
            const wg = this.add.graphics();
            const shades = [0x2b2138, 0x241c2e, 0x2f2540, 0x281f34];
            for (let bx = 0; bx < tile; bx += block) {
                for (let by = 0; by < tile; by += block) {
                    wg.fillStyle(shades[Math.floor(Math.random() * shades.length)], 1);
                    wg.fillRect(bx, by, block, block);
                }
            }
            // Argamassa — linhas mais escuras entre os blocos, alternando
            // a fiada (offset de meio bloco a cada linha) pra não parecer
            // uma grade perfeita de novo, o problema original.
            wg.lineStyle(2, 0x140f1c, 0.85);
            for (let by = 0; by <= tile; by += block) wg.lineBetween(0, by, tile, by);
            let row = 0;
            for (let by = 0; by < tile; by += block) {
                const offset = (row % 2 === 0) ? 0 : block / 2;
                for (let bx = -block + offset; bx <= tile; bx += block) {
                    wg.lineBetween(bx, by, bx, by + block);
                }
                row++;
            }
            wg.generateTexture('libraryWallTexture', tile, tile);
            wg.destroy();
        }
        this.add.tileSprite(0, 0, W, H, 'libraryWallTexture').setOrigin(0, 0).setDepth(-10);

        this.groundSystem = new ProceduralGround(this, {
            textureKey: 'libraryGroundTexture',
            worldWidth: W, worldHeight: H, groundHeight, tileWidth: 64,
            draw: (g, tileWidth, gh) => {
                g.fillStyle(0x6b4a2f, 1);
                g.fillRect(0, 0, tileWidth, gh);
                g.fillStyle(0x53381f, 0.6);
                for (let gx = 0; gx < tileWidth; gx += 16) {
                    g.fillRect(gx, 0, 1, gh);
                }
                g.fillStyle(0x8a6a42, 1);
                g.fillRect(0, 0, tileWidth, 3);
            },
        });
        this.ground = this.groundSystem.sprite;

        this.createLibraryDecorations(groundY, W, H);

        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
        });
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
        this.kickKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);
        this.defendKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L);
        this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

        const playerHeight = this.textures.get('player').getSourceImage().height * (2 / 5);
        this.playerBaseScale = 2 / 5;
        this.player = this.physics.add.sprite(90, H - groundHeight - playerHeight / 2, 'player');
        this.player.setScale(this.playerBaseScale);
        this.player.setBounce(0.1);
        this.player.setCollideWorldBounds(true);
        this.player.body.setGravityY(1000);
        this.player.body.setDragX(500);

        this.playerController = new PlayerController(this, this.player, {
            getAttributes: () => this.playerAttributes,
            baseScale: this.playerBaseScale,
            // Sala segura — sem inimigos — mesmo motivo de VillageScene
            // manter os callbacks como no-op em vez de omitir.
            onDealDamage: () => {},
            queryOverlap: () => [],
            onDeath: () => {},
            onHealthChange: (hp) => { this.hp = hp; },
            onHit: () => {},
        });

        this.physics.add.collider(this.player, this.ground);

        // Companion.js — lobo de cristal como companheiro, só existe se já
        // foi libertado na caverna (this.caveProgress, propagado desde a
        // VillageScene — mesmo padrão de touch/fx/storage). Sala segura,
        // sem inimigo nenhum, então queryOverlap fica no-op, igual o do
        // PlayerController logo acima.
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

        this.createReadingUI();

        const bookY = groundY - 90;
        const spells = PlayerMenu.SPELLS;
        this.exitZone = new InteractionZone(this, {
            x: 80, y: groundY - 40, radius: 70,
            interactKey: this.interactKey,
            checkTouchInteract: () => this.touch.consumir('interactPress'),
            getPlayerPosition: () => ({ x: this.player.x, y: this.player.y }),
            getHintText: () => 'Pressione E para sair da biblioteca',
            onInteract: () => this.exitLibrary(),
        });
        this.recordsZone = new InteractionZone(this, {
            x: 300, y: bookY, radius: 65,
            interactKey: this.interactKey,
            checkTouchInteract: () => this.touch.consumir('interactPress'),
            getPlayerPosition: () => ({ x: this.player.x, y: this.player.y }),
            getHintText: () => 'Pressione E para ler os registros antigos',
            onInteract: () => this.openReading('Registros Antigos', [...LIBRARY_RECORDS_PAGES]),
        });
        this.bookZones = spells.map((spell, i) => new InteractionZone(this, {
            x: 480 + i * 130, y: bookY, radius: 65,
            interactKey: this.interactKey,
            checkTouchInteract: () => this.touch.consumir('interactPress'),
            getPlayerPosition: () => ({ x: this.player.x, y: this.player.y }),
            getHintText: () => this.learnedSpells.includes(spell.id)
                ? `Pressione E para reler "${spell.name}"`
                : `Pressione E para aprender "${spell.name}"`,
            onInteract: () => {
                const alreadyKnown = this.learnedSpells.includes(spell.id);
                const pages = alreadyKnown
                    ? [spell.lore, 'Você já domina esta magia.']
                    : [spell.lore, `Você aprendeu "${spell.name}"!`];
                this.openReading(spell.name, pages, alreadyKnown ? null : () => this.learnSpell(spell.id));
            },
        }));

        this.cameras.main.startFollow(this.player);
        this.cameras.main.setZoom(1);
        this.cameras.main.setBounds(0, 0, W, H);
        this.cameras.main.fadeIn(300, 0, 0, 0);

        this.playerMenu = new PlayerMenu(this, { storage: this.storage });
        this.playerMenu.create();
    }

    update(time, delta) {
        if (this.companion) this.companion.update(time, delta);

        if (this.readingOpen) {
            // Congela o personagem enquanto lê — mesmo princípio do
            // isDialogOpen na GameScene: sem isso dava pra sair andando
            // com o texto ainda na tela.
            this.player.setVelocityX(0);
            this.playerController.setMoveInput(0);
            if (Phaser.Input.Keyboard.JustDown(this.interactKey) || this.touch.consumir('interactPress')) {
                this.advanceReading();
            }
            this.playerController.update(time, delta);
            this.playerMenu.update();
            return;
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

        const groundSurfaceY = this.height - this.groundHeight;
        if (this.player.body.bottom > groundSurfaceY + 2) {
            const overshoot = this.player.body.bottom - groundSurfaceY;
            this.player.body.reset(this.player.x, this.player.y - overshoot);
        }

        this.exitZone.update();
        this.recordsZone.update();
        this.bookZones.forEach((z) => z.update());
        this.playerMenu.update();
    }

    // ==================== CENÁRIO ====================
    createLibraryDecorations(groundY, W, H) {
        // Estantes — silhueta estilizada (retângulo escuro + prateleiras +
        // lombadas coloridas), não arte assada: uma sala só precisa
        // comunicar "biblioteca", os livros de verdade que importam pro
        // jogo são as InteractionZones criadas em create(). As 3 que
        // ensinam magia NÃO têm nenhuma marca própria aqui (sem brilho,
        // sem cor diferente, sem ícone) — a lombada aleatória de
        // spineColors cobre a prateleira inteira igual, então elas ficam
        // escondidas no meio das decorativas; só a dica de texto ao
        // chegar perto entrega qual é qual.
        const shelfTop = groundY - 340;
        const shelfG = this.add.graphics();
        shelfG.fillStyle(0x1a1220, 1);
        shelfG.fillRect(60, shelfTop, W - 120, 340);
        shelfG.lineStyle(3, 0x3a2c1a, 1);
        for (let sy = shelfTop + 30; sy < groundY; sy += 45) {
            shelfG.lineBetween(60, sy, W - 60, sy);
        }
        const spineColors = [0x8a3b3b, 0x3b5f8a, 0x6a8a3b, 0x8a6a3b, 0x5f3b8a, 0x3b8a7a];
        let colorIdx = 0;
        for (let sx = 75; sx < W - 90; sx += 14) {
            for (let sy = shelfTop + 34; sy < groundY - 10; sy += 45) {
                if (Math.random() < 0.82) {
                    shelfG.fillStyle(spineColors[colorIdx % spineColors.length], 1);
                    colorIdx++;
                    const bw = 8 + Math.floor(Math.random() * 4);
                    const bh = 30 + Math.floor(Math.random() * 8);
                    shelfG.fillRect(sx, sy + (38 - bh), bw, bh);
                }
            }
        }
        shelfG.setDepth(-5);

        // Velas/lanternas — ponto de luz vivo por cima da estante estática
        // (tween de alpha piscando), mesmo princípio de fumaça de
        // chaminé/brilho de janela na VillageScene: elemento animado
        // separado da textura de fundo. Uma a cada ~260px, cobrindo a
        // largura toda (dinâmica agora, não mais só 3 pontos fixos).
        for (let cx = 220; cx < W - 120; cx += 260) {
            const glow = this.add.circle(cx, shelfTop - 10, 26, 0xffcf80, 0.22).setDepth(-4);
            const flame = this.add.circle(cx, shelfTop - 10, 5, 0xffdf9a, 0.9).setDepth(-3);
            this.tweens.add({
                targets: [glow, flame], alpha: '*=0.55',
                duration: 700 + Math.random() * 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            });
            // Luz de verdade (Ambience.js): halo quente largo + cone suave descendo sobre a estante.
            Ambience.light(this, cx, shelfTop - 10, { radius: 140, color: 0xffc77a, alpha: 0.4, flicker: 0.28, always: true, depth: -2 });
            Ambience.beam(this, { x: cx, y: shelfTop - 6, w: 170, h: 320, angle: 0, color: 0xffd08a, alpha: 0.11, depth: -2 });
        }
        // poeira no ar, acesa pelas velas
        Ambience.field(this, {
            texture: 'amSoft', count: 34, depth: 3, add: true, tint: [0xffe2a8, 0xffffff],
            vx: [-3, 5], vy: [-5, 3], size: [0.1, 0.26], alpha: [0.2, 0.55], sway: [3, 10], swayHz: [0.1, 0.3], twinkle: [0.2, 0.7],
            band: { yMin: shelfTop - 30, yMax: groundY - 6 },
        });

        // Porta de entrada/saída — só um retângulo mais claro indicando o
        // vão, perto de onde o jogador nasce e do exitZone.
        const doorG = this.add.graphics().setDepth(-6);
        doorG.fillStyle(0x4a3420, 1);
        doorG.fillRect(50, groundY - 90, 55, 90);
        doorG.fillStyle(0x2a1c10, 1);
        doorG.fillRect(58, groundY - 82, 39, 74);

        // Mesa de leitura + banco + tapete — quebra a monotonia de "só
        // parede de livros", dá um motivo visual pra sala parecer usada.
        // Posicionada no vão de entrada, entre a porta e a estante de
        // registros — não depende de W/2 (que deriva do tamanho real da
        // tela e podia cair em cima de qualquer um dos livros de magia).
        const tableX = 190;
        const rugG = this.add.graphics().setDepth(-6);
        rugG.fillStyle(0x5a1f2a, 0.55);
        rugG.fillEllipse(tableX, groundY - 6, 220, 34);
        rugG.lineStyle(2, 0x7a3040, 0.6);
        rugG.strokeEllipse(tableX, groundY - 6, 220, 34);

        const furnG = this.add.graphics().setDepth(-4);
        // banco
        furnG.fillStyle(0x3a2818, 1);
        furnG.fillRect(tableX - 100, groundY - 28, 34, 8);
        furnG.fillRect(tableX - 96, groundY - 20, 4, 20);
        furnG.fillRect(tableX - 70, groundY - 20, 4, 20);
        // mesa
        furnG.fillStyle(0x4a3420, 1);
        furnG.fillRect(tableX - 45, groundY - 62, 90, 10);
        furnG.fillStyle(0x2a1c10, 1);
        furnG.fillRect(tableX - 41, groundY - 52, 6, 52);
        furnG.fillRect(tableX + 35, groundY - 52, 6, 52);
        // livro aberto + vela em cima da mesa
        furnG.fillStyle(0xd8c9a8, 1);
        furnG.fillRect(tableX - 20, groundY - 68, 40, 8);
        furnG.fillStyle(0xb8a888, 1);
        furnG.fillRect(tableX - 1, groundY - 68, 2, 8);
        const deskCandle = this.add.circle(tableX + 30, groundY - 70, 4, 0xffdf9a, 0.9).setDepth(-3);
        const deskGlow = this.add.circle(tableX + 30, groundY - 70, 20, 0xffcf80, 0.2).setDepth(-4);
        this.tweens.add({
            targets: [deskCandle, deskGlow], alpha: '*=0.5',
            duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
    }

    // ==================== LEITURA (registros + livros) ====================
    createReadingUI() {
        const cam = this.cameras.main;
        const w = Math.min(560, cam.width - 40);
        const h = 220;
        const cx = cam.width / 2, cy = cam.height / 2;

        this.readingBg = this.add.rectangle(cx, cy, w, h, 0x14101f, 0.92)
            .setScrollFactor(0).setDepth(1000).setStrokeStyle(2, 0xc9b98a).setVisible(false);
        this.readingTitle = this.add.text(cx, cy - h / 2 + 22, '', {
            fontSize: '18px', fill: '#f3d9a4', fontStyle: 'bold',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1001).setVisible(false);
        this.readingText = this.add.text(cx, cy, '', {
            fontSize: '14px', fill: '#e8e0d8', align: 'center', wordWrap: { width: w - 48 },
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1001).setVisible(false);
        this.readingHint = this.add.text(cx, cy + h / 2 - 18, 'Pressione E para continuar — ESC para fechar', {
            fontSize: '12px', fill: '#b8a9c9', fontStyle: 'italic',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1001).setVisible(false);

        this.input.keyboard.on('keydown-ESC', () => { if (this.readingOpen) this.closeReading(); });
    }

    openReading(title, pages, onComplete) {
        this.readingOpen = true;
        this.readingPages = pages;
        this.readingIndex = 0;
        this.readingOnComplete = onComplete || null;
        this.readingTitle.setText(title);
        this.readingText.setText(this.readingPages[0]);
        [this.readingBg, this.readingTitle, this.readingText, this.readingHint].forEach((o) => o.setVisible(true));
    }

    advanceReading() {
        this.readingIndex++;
        if (this.readingIndex >= this.readingPages.length) { this.closeReading(); return; }
        this.readingText.setText(this.readingPages[this.readingIndex]);
    }

    closeReading() {
        this.readingOpen = false;
        [this.readingBg, this.readingTitle, this.readingText, this.readingHint].forEach((o) => o.setVisible(false));
        // onComplete (aprender a magia) só dispara ao FECHAR, não ao abrir
        // — assim a última página ("Você aprendeu...") já reflete o
        // aprendizado antes do jogador confirmar ter lido tudo.
        if (this.readingOnComplete) {
            const cb = this.readingOnComplete;
            this.readingOnComplete = null;
            cb();
        }
    }

    // ==================== MAGIAS ====================
    learnSpell(spellId) {
        if (this.learnedSpells.includes(spellId)) return;
        const spell = PlayerMenu.SPELLS.find((s) => s.id === spellId);
        if (!spell) return;
        this.learnedSpells.push(spellId);
        if (spell.type === 'passive' && spell.bonus) {
            Object.keys(spell.bonus).forEach((attr) => {
                this.spellBonus[attr] = (this.spellBonus[attr] || 0) + spell.bonus[attr];
            });
            this.updatePlayerStats();
        }
    }

    // Mesmo formato/ordem de VillageScene.updatePlayerStats() — cada cena
    // mantém a própria cópia (ver comentário lá pra por que não é um
    // método compartilhado).
    updatePlayerStats(fullHeal = false) {
        Object.keys(this.baseAttributes).forEach((attr) => {
            this.playerAttributes[attr] = this.baseAttributes[attr];
        });
        Object.keys(this.titleBonus).forEach((attr) => {
            this.playerAttributes[attr] += this.titleBonus[attr];
        });
        Object.keys(this.spellBonus).forEach((attr) => {
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
    exitLibrary() {
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('VillageScene', {
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
                returnFromLibrary: true,
                touch: this.touch,
                syncSaveSlot: this.syncSaveSlot,
                fx: this.fx,
                storage: this.storage,
                caveProgress: this.caveProgress,
            });
        });
    }
}
