/* =====================================================================
   PlayerMenu — HUD (retrato + barras de HP/MP), menu de atributos do
   personagem, submenu de títulos e menu de opções (volume/mudo).
   Compartilhado por GameScene, CaveScene e VillageScene (e qualquer
   cena futura que precise do mesmo menu).

   POR QUE ISTO PRECISOU VIRAR UM ARQUIVO SÓ
   -----------------------------------------------------------------
   Antes deste arquivo existir, esse sistema existia em até 3 versões
   diferentes: o GameScene tinha a versão completa (HUD + atributos +
   títulos + opções); a CaveScene tinha uma cópia bem mais simples,
   feita à parte (só o painel de atributos — sem retrato, sem títulos,
   sem opções de volume/mudo); e a VillageScene não tinha menu nenhum.
   Era o mesmo problema que RosebudTouch/RosebudFX tinham antes de virar
   dependência injetada — cada cena reimplementando (ou simplesmente não
   tendo) a mesma peça, e o botão [M] fazendo coisas diferentes
   dependendo de onde o jogador estava. Esta classe é a única fonte de
   verdade agora: as cenas só chamam os métodos dela.

   BUG CORRIGIDO NA MIGRAÇÃO: equipTitle() (no GameScene original)
   chamava this.unequipTitle(), mas esse método nunca existia no arquivo
   — trocar de título sempre quebrava com "TypeError: this.unequipTitle
   is not a function". Foi escrito do zero aqui (ver unequipTitle()
   abaixo) — é o que desfaz o bônus do título anterior antes de aplicar
   o novo.

   DEPENDÊNCIA INJETADA (storage)
   -----------------------------------------------------------------
   rbStorage (onde volume/mudo são persistidos) mora dentro da IIFE do
   script principal do HTML — mesmo motivo de RosebudTouch/rbSyncSaveSlot/
   RosebudFX (ver a nota "DEPENDÊNCIAS INJETADAS" no topo de
   VillageScene.js). GameScene e CaveScene estão dentro dessa IIFE e
   passam a referência direto:

       this.playerMenu = new PlayerMenu(this, { storage: rbStorage });

   VillageScene é um <script src> à parte, fora da IIFE — ela recebe
   rbStorage via data.storage no scene.start() (igual touch/syncSaveSlot/
   fx) e repassa:

       this.playerMenu = new PlayerMenu(this, { storage: this.storage });

   O QUE A CENA HOSPEDEIRA PRECISA TER
   -----------------------------------------------------------------
   PlayerMenu lê e escreve direto em propriedades da cena (this.scene.X),
   do mesmo jeito que o código original do GameScene já fazia consigo
   mesmo — não existe um "objeto de estado do jogador" separado. Isso
   funciona sem nenhuma adaptação porque GameScene, CaveScene e
   VillageScene já compartilham exatamente essas propriedades (é o mesmo
   pacote de dados que circula entre elas via scene.start()):
   playerName, hp, maxHp, mana, maxMana, playerLevel, playerExperience,
   experienceToNextLevel, playerAttributes, baseAttributes, titleBonus,
   unlockedTitles, equippedTitle, inventory.slimeGoo, isGameOver,
   player (sprite, pra travar/destravar o corpo físico quando um painel
   abre), playerController (pra sincronizar hp/maxHp — setHealth()).
   A cena também precisa ter chamado this.load.image('portrait', ...) e
   this.load.image('Aspinninggearicon', ...) em algum ponto anterior da
   sessão — GameScene já carrega os dois; como o cache de texturas do
   Phaser é global, CaveScene/VillageScene reaproveitam sem recarregar
   (mesmo princípio de 'player'/'sky'/'clouds').
   ===================================================================== */
class PlayerMenu {
    /**
     * @param {Phaser.Scene} scene
     * @param {object} [config]
     * @param {Storage|object} [config.storage] rbStorage — necessário só
     *        pra persistir volume/mudo. Sem ele, o menu de opções ainda
     *        funciona nesta sessão, só não grava a escolha.
     */
    constructor(scene, config = {}) {
        this.scene = scene;
        this.storage = config.storage || null;

        // Catálogo de títulos — único lugar que o define agora (antes só
        // existia dentro do GameScene; CaveScene nem tinha títulos).
        // Também disponível como PlayerMenu.TITLES (estático), pra quem
        // precisar consultar antes de o menu existir — ex: o init() de
        // GameScene aplica o título secreto "Nasce uma leynda" assim que
        // o nome do personagem é lido, bem antes de create() montar
        // this.playerMenu.
        this.titles = PlayerMenu.TITLES;
    }

    /** Chamado uma vez em create(), depois que this.scene.player já existe. */
    create() {
        this.createHUD();
        this.createMenuScreen();
        this.createTitleMenu();
        this.createOptionsButton();
        this.createOptionsMenu();
        this.createSpellMenu();
        this.createCompanionMenu();
        this.applyCompanionPrefs();

        const scene = this.scene;
        const isDialogOpen = () => scene.answerInput && scene.answerInput.visible;

        scene.input.keyboard.on('keydown-M', () => { if (!isDialogOpen()) this.toggleMenu(); });
        scene.input.keyboard.on('keydown-RIGHT', () => { if (!isDialogOpen() && this.menuScreen.visible) this.showTitleMenu(); });
        scene.input.keyboard.on('keydown-LEFT', () => { if (!isDialogOpen() && this.titleMenu.visible) this.hideTitleMenu(); });
        // Atalhos dos dois submenus novos — só valem com o menu principal (ou um submenu) aberto,
        // pra G/P não abrirem nada por acidente durante o jogo.
        const submenuOpen = () => this.menuScreen.visible || this.spellMenu.visible || this.companionMenu.visible;
        scene.input.keyboard.on('keydown-G', () => {
            if (isDialogOpen() || this.titleMenu.visible || !submenuOpen()) return;
            if (this.spellMenu.visible) this.hideSubmenu(); else this.showSubmenu('spell');
        });
        scene.input.keyboard.on('keydown-P', () => {
            if (isDialogOpen() || this.titleMenu.visible || !submenuOpen()) return;
            if (this.companionMenu.visible) this.hideSubmenu(); else this.showSubmenu('companion');
        });
    }

    /** Chamado todo frame pela cena — mantém os painéis acompanhando a
     *  câmera (eles não usam setScrollFactor(0) porque são containers
     *  grandes com muitos filhos; reposicionar o container inteiro é
     *  mais simples que marcar cada filho). */
    update() {
        const camera = this.scene.cameras.main;
        const cx = camera.worldView.x + camera.width / 2, cy = camera.worldView.y + camera.height / 2;
        this.menuScreen.setPosition(cx, cy);
        this.titleMenu.setPosition(cx, cy);
        this.optionsMenu.setPosition(cx, cy);
        this.spellMenu.setPosition(cx, cy);
        this.companionMenu.setPosition(cx, cy);
    }

    // ==================== HUD (retrato + barras) ====================
    createHUD() {
        const scene = this.scene;
        const panelX = 20, panelY = 20;
        const portraitR = 24;
        const barW = 140, barH = 15, barGap = 6;
        const padding = 14;
        const panelW = portraitR * 2 + padding * 3 + barW;
        const panelH = portraitR * 2 + padding * 2;

        const frame = scene.add.graphics().setScrollFactor(0).setDepth(100);
        frame.fillStyle(0x000000, 0.35);
        frame.fillRoundedRect(panelX + 3, panelY + 4, panelW, panelH, 12);
        frame.fillStyle(0x2b2119, 1);
        frame.fillRoundedRect(panelX, panelY, panelW, panelH, 12);
        frame.lineStyle(2, 0x8a7355, 0.9);
        frame.strokeRoundedRect(panelX + 2, panelY + 2, panelW - 4, panelH - 4, 10);
        frame.fillStyle(0x4a3b2a, 1);
        frame.fillRoundedRect(panelX + 4, panelY + 4, panelW - 8, panelH - 8, 8);

        const portraitCX = panelX + padding + portraitR;
        const portraitCY = panelY + panelH / 2;

        const ring = scene.add.graphics().setScrollFactor(0).setDepth(101);
        ring.fillStyle(0x1a1410, 1);
        ring.fillCircle(portraitCX, portraitCY, portraitR + 4);
        ring.lineStyle(3, 0x8a7355, 1);
        ring.strokeCircle(portraitCX, portraitCY, portraitR + 3);
        ring.lineStyle(1.5, 0xd9822b, 0.85);
        ring.strokeCircle(portraitCX, portraitCY, portraitR);
        [0, 90, 180, 270].forEach((deg) => {
            const rad = Phaser.Math.DegToRad(deg);
            ring.fillStyle(0xc7a76a, 1);
            ring.fillCircle(portraitCX + Math.cos(rad) * (portraitR + 3.5), portraitCY + Math.sin(rad) * (portraitR + 3.5), 1.6);
        });

        const portraitMaskShape = scene.add.graphics().setScrollFactor(0).setVisible(false);
        portraitMaskShape.fillStyle(0xffffff).fillCircle(portraitCX, portraitCY, portraitR);
        const portraitSrc = scene.textures.get('portrait').getSourceImage();
        this.portrait = scene.add.image(0, 0, 'portrait')
            .setScrollFactor(0)
            .setDepth(102)
            .setFlipX(true)
            .setMask(portraitMaskShape.createGeometryMask());
        this.focusPortrait(this.portrait, portraitSrc, portraitCX, portraitCY, portraitR);

        const barX = portraitCX + portraitR + padding;
        const barY1 = panelY + padding - 2;
        const barY2 = barY1 + barH + barGap;

        this.hudBarsGfx = scene.add.graphics().setScrollFactor(0).setDepth(101);
        this.hpBarX = barX; this.hpBarY = barY1; this.hpBarW = barW; this.hpBarH = barH;
        this.manaBarX = barX; this.manaBarY = barY2; this.manaBarW = barW; this.manaBarH = barH;

        scene.add.text(barX + 5, barY1 + barH / 2, 'HP', { fontFamily: 'Georgia, serif', fontSize: '9px', fontStyle: 'bold', color: '#e8b8ac' })
            .setOrigin(0, 0.5).setScrollFactor(0).setDepth(103);
        scene.add.text(barX + 5, barY2 + barH / 2, 'MP', { fontFamily: 'Georgia, serif', fontSize: '9px', fontStyle: 'bold', color: '#a9d3e6' })
            .setOrigin(0, 0.5).setScrollFactor(0).setDepth(103);

        this.hpText = scene.add.text(barX + barW - 5, barY1 + barH / 2, '', { fontFamily: 'Georgia, serif', fontSize: '11px', fontStyle: 'bold', color: '#f2e6ce' })
            .setOrigin(1, 0.5).setScrollFactor(0).setDepth(103).setShadow(1, 1, '#000000', 2, false, true);
        this.manaText = scene.add.text(barX + barW - 5, barY2 + barH / 2, '', { fontFamily: 'Georgia, serif', fontSize: '11px', fontStyle: 'bold', color: '#f2e6ce' })
            .setOrigin(1, 0.5).setScrollFactor(0).setDepth(103).setShadow(1, 1, '#000000', 2, false, true);

        this.updateHUD();

        const menuHint = scene.add.text(panelX + 4, panelY + panelH + 6, 'MENU [M]', { fontFamily: 'Georgia, serif', fontSize: '11px', fontStyle: 'bold', color: '#a89878' })
            .setOrigin(0)
            .setScrollFactor(0)
            .setDepth(103)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.toggleMenu())
            .on('pointerover', () => menuHint.setColor('#d9822b'))
            .on('pointerout', () => menuHint.setColor('#a89878'));
    }

    updateHUD() {
        const scene = this.scene;
        this.hudBarsGfx.clear();
        this.drawStatBar(this.hudBarsGfx, this.hpBarX, this.hpBarY, this.hpBarW, this.hpBarH, scene.hp / scene.maxHp, 0x9c2f26, 0xd85b48);
        this.drawStatBar(this.hudBarsGfx, this.manaBarX, this.manaBarY, this.manaBarW, this.manaBarH, scene.mana / scene.maxMana, 0x2d5f7a, 0x5aa3c9);
        this.hpText.setText(`${Math.max(0, scene.hp)}/${scene.maxHp}`);
        this.manaText.setText(`${Math.max(0, scene.mana)}/${scene.maxMana}`);
    }

    drawStatBar(gfx, x, y, w, h, ratio, colorDeep, colorLight) {
        gfx.fillStyle(0x120e0a, 1);
        gfx.fillRoundedRect(x, y, w, h, h / 2);
        gfx.lineStyle(1.5, 0x8a7355, 0.6);
        gfx.strokeRoundedRect(x, y, w, h, h / 2);
        const fillW = Math.max(0, Math.min(1, ratio)) * (w - 4);
        if (fillW > 1) {
            gfx.fillGradientStyle(colorLight, colorLight, colorDeep, colorDeep, 1);
            gfx.fillRoundedRect(x + 2, y + 2, fillW, h - 4, (h - 4) / 2);
        }
    }

    focusPortrait(img, src, targetCX, targetCY, radius) {
        const cropXFrac = 0.11, cropYFrac = 0, cropWFrac = 0.82, cropHFrac = 0.40;
        const cropX = cropXFrac * src.width, cropY = cropYFrac * src.height;
        const cropW = cropWFrac * src.width, cropH = cropHFrac * src.height;
        const scale = Math.max((radius * 2) / cropW, (radius * 2) / cropH) * 1.1;
        const cropCenterX = cropX + cropW / 2, cropCenterY = cropY + cropH / 2;
        img.setPosition(
            targetCX - (cropCenterX - src.width / 2) * scale,
            targetCY - (cropCenterY - src.height / 2) * scale
        );
        img.setScale(scale);
    }

    // ==================== Menu de atributos ====================
    createMenuScreen() {
        const scene = this.scene;
        this.menuScreen = scene.add.container(scene.cameras.main.centerX, scene.cameras.main.centerY).setVisible(false);

        const panelW = 380, panelH = 420;
        const half = panelW / 2, halfH = panelH / 2;

        const shadow = scene.add.graphics();
        shadow.fillStyle(0x000000, 0.45);
        shadow.fillRoundedRect(-half + 4, -halfH + 6, panelW, panelH, 18);

        const backdrop = scene.add.graphics();
        backdrop.fillStyle(0x0d0a08, 0.88);
        backdrop.fillRoundedRect(-half, -halfH, panelW, panelH, 18);

        const border = scene.add.graphics();
        border.lineStyle(3, 0x8a7355, 1);
        border.strokeRoundedRect(-half + 3, -halfH + 3, panelW - 6, panelH - 6, 15);
        border.lineStyle(1, 0x4a3b2a, 1);
        border.strokeRoundedRect(-half + 7, -halfH + 7, panelW - 14, panelH - 14, 12);

        this.menuScreen.add([shadow, backdrop, border]);

        const menuTitle = scene.add.text(0, -halfH + 28, 'ATRIBUTOS DO PERSONAGEM', {
            fontFamily: 'Georgia, serif', fontSize: '17px', fontStyle: 'bold', color: '#d9822b', letterSpacing: 1
        }).setOrigin(0.5).setShadow(1, 1, '#000000', 3, false, true);

        this.playerNameText = scene.add.text(0, -halfH + 58, `${scene.playerName}`, {
            fontFamily: 'Georgia, serif', fontSize: '22px', fontStyle: 'bold', color: '#f2e6ce'
        }).setOrigin(0.5);

        this.equippedTitleText = scene.add.text(0, -halfH + 84, `${scene.equippedTitle || 'Sem título'}`, {
            fontFamily: 'Georgia, serif', fontSize: '13px', fontStyle: 'italic', color: '#9b6fd4'
        }).setOrigin(0.5);

        const divider1 = scene.add.graphics();
        divider1.lineStyle(1, 0x4a3b2a, 1);
        divider1.lineBetween(-half + 24, -halfH + 104, half - 24, -halfH + 104);

        this.levelExpText = scene.add.text(-half + 24, -halfH + 116, `Nível ${scene.playerLevel}`, {
            fontFamily: 'Georgia, serif', fontSize: '14px', fontStyle: 'bold', color: '#e8dcc0'
        }).setOrigin(0, 0.5);

        this.expValueText = scene.add.text(half - 24, -halfH + 116, `${scene.playerExperience}/${scene.experienceToNextLevel} XP`, {
            fontFamily: 'Georgia, serif', fontSize: '11px', color: '#a89878'
        }).setOrigin(1, 0.5);

        this.expBarGfx = scene.add.graphics();
        this.expBarX = -half + 24; this.expBarY = -halfH + 128; this.expBarW = panelW - 48; this.expBarH = 8;

        const divider2 = scene.add.graphics();
        divider2.lineStyle(1, 0x4a3b2a, 1);
        divider2.lineBetween(-half + 24, -halfH + 150, half - 24, -halfH + 150);

        const attrMeta = {
            constitution: { label: 'Constituição', color: 0xc94a3a },
            attack: { label: 'Ataque', color: 0xd9822b },
            defense: { label: 'Defesa', color: 0x8a7355 },
            intelligence: { label: 'Inteligência', color: 0x5aa3c9 },
            agility: { label: 'Agilidade', color: 0xe8dcc0 },
            luck: { label: 'Sorte', color: 0x9b6fd4 }
        };
        const rowStartY = -halfH + 172, rowH = 34, colW = (panelW - 48) / 2;
        this.attributeTexts = Object.keys(scene.playerAttributes).map((attr, index) => {
            const col = index % 2, row = Math.floor(index / 2);
            const rowX = -half + 24 + col * colW;
            const rowY = rowStartY + row * rowH;
            const meta = attrMeta[attr] || { label: attr, color: 0xe8dcc0 };

            const dot = scene.add.graphics();
            dot.fillStyle(meta.color, 1);
            dot.fillCircle(rowX + 4, rowY, 4);
            dot.lineStyle(1, 0x000000, 0.4);
            dot.strokeCircle(rowX + 4, rowY, 4);

            const labelText = scene.add.text(rowX + 14, rowY, meta.label, {
                fontFamily: 'Georgia, serif', fontSize: '13px', color: '#a89878'
            }).setOrigin(0, 0.5);

            const valueText = scene.add.text(rowX + colW - 14, rowY, `${scene.playerAttributes[attr]}`, {
                fontFamily: 'Georgia, serif', fontSize: '15px', fontStyle: 'bold', color: '#f2e6ce'
            }).setOrigin(1, 0.5);

            this.menuScreen.add([dot, labelText, valueText]);
            return valueText;
        });

        const makeMenuButton = (x, label, onClick) => {
            const w = 130, h = 34;
            const btnBg = scene.add.graphics();
            btnBg.fillStyle(0x2b2119, 1);
            btnBg.fillRoundedRect(x - w / 2, halfH - 52, w, h, 8);
            btnBg.lineStyle(2, 0x8a7355, 1);
            btnBg.strokeRoundedRect(x - w / 2, halfH - 52, w, h, 8);

            const btnText = scene.add.text(x, halfH - 52 + h / 2, label, {
                fontFamily: 'Georgia, serif', fontSize: '14px', fontStyle: 'bold', color: '#e8dcc0'
            }).setOrigin(0.5);

            const hitZone = scene.add.zone(x, halfH - 52 + h / 2, w, h)
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', onClick)
                .on('pointerover', () => { btnText.setColor('#d9822b'); btnBg.lineStyle(2, 0xd9822b, 1); btnBg.strokeRoundedRect(x - w / 2, halfH - 52, w, h, 8); })
                .on('pointerout', () => { btnText.setColor('#e8dcc0'); btnBg.clear(); btnBg.fillStyle(0x2b2119, 1); btnBg.fillRoundedRect(x - w / 2, halfH - 52, w, h, 8); btnBg.lineStyle(2, 0x8a7355, 1); btnBg.strokeRoundedRect(x - w / 2, halfH - 52, w, h, 8); });

            return [btnBg, btnText, hitZone];
        };

        const divider3 = scene.add.graphics();
        divider3.lineStyle(1, 0x4a3b2a, 1);
        divider3.lineBetween(-half + 24, -halfH + 264, half - 24, -halfH + 264);

        const invDot = scene.add.graphics();
        invDot.fillStyle(0x6fcf7a, 1);
        invDot.fillCircle(-half + 24 + 4, -halfH + 286, 4);
        invDot.lineStyle(1, 0x000000, 0.4);
        invDot.strokeCircle(-half + 24 + 4, -halfH + 286, 4);

        const invLabel = scene.add.text(-half + 24 + 14, -halfH + 286, 'Gosma de Slime', {
            fontFamily: 'Georgia, serif', fontSize: '13px', color: '#a89878'
        }).setOrigin(0, 0.5);

        // Drop raro dos slimes — atualizado direto (setText) por quem
        // muda o inventário (ex: damageEnemy() no GameScene), não por
        // este arquivo.
        this.slimeGooText = scene.add.text(half - 24, -halfH + 286, `${scene.inventory.slimeGoo}`, {
            fontFamily: 'Georgia, serif', fontSize: '15px', fontStyle: 'bold', color: '#f2e6ce'
        }).setOrigin(1, 0.5);

        const closeButtons = makeMenuButton(-85, 'Fechar', () => this.toggleMenu());
        const titleButtons = makeMenuButton(85, 'Títulos >', () => this.showTitleMenu());
        // Fileira de cima: os dois submenus novos (Magias [G] e Lobo [P]).
        this._makeButton(this.menuScreen, -85, halfH - 92 + 15, 130, 30, 'Magias [G] >', () => this.showSubmenu('spell'));
        this._makeButton(this.menuScreen, 85, halfH - 92 + 15, 130, 30, 'Lobo [P] >', () => this.showSubmenu('companion'));

        this.menuScreen.add([menuTitle, this.playerNameText, this.equippedTitleText,
            divider1, this.levelExpText, this.expValueText, this.expBarGfx, divider2,
            divider3, invDot, invLabel, this.slimeGooText,
            ...closeButtons, ...titleButtons]);
        this.updateExpBar();
    }

    updateExpBar() {
        if (!this.expBarGfx) return;
        this.expBarGfx.clear();
        this.drawStatBar(this.expBarGfx, this.expBarX, this.expBarY, this.expBarW, this.expBarH,
            this.scene.playerExperience / this.scene.experienceToNextLevel, 0xb8801f, 0xf0a545);
    }

    updateAttributeTexts() {
        const scene = this.scene;
        this.playerNameText.setText(`${scene.playerName}`);
        this.equippedTitleText.setText(`${scene.equippedTitle || 'Sem título'}`);
        this.levelExpText.setText(`Nível ${scene.playerLevel}`);
        this.expValueText.setText(`${scene.playerExperience}/${scene.experienceToNextLevel} XP`);
        this.updateExpBar();
        Object.keys(scene.playerAttributes).forEach((attr, index) => {
            this.attributeTexts[index].setText(`${scene.playerAttributes[attr]}`);
        });
    }

    // ==================== Submenu de títulos ====================
    createTitleMenu() {
        const scene = this.scene;
        this.titleMenu = scene.add.container(scene.cameras.main.centerX, scene.cameras.main.centerY).setVisible(false);

        const panelW = 380, panelH = 420;
        const half = panelW / 2, halfH = panelH / 2;
        this.titleMenuPanelW = panelW; this.titleMenuHalf = half; this.titleMenuHalfH = halfH;

        const shadow = scene.add.graphics();
        shadow.fillStyle(0x000000, 0.45);
        shadow.fillRoundedRect(-half + 4, -halfH + 6, panelW, panelH, 18);

        const backdrop = scene.add.graphics();
        backdrop.fillStyle(0x0d0a08, 0.88);
        backdrop.fillRoundedRect(-half, -halfH, panelW, panelH, 18);

        const border = scene.add.graphics();
        border.lineStyle(3, 0x8a7355, 1);
        border.strokeRoundedRect(-half + 3, -halfH + 3, panelW - 6, panelH - 6, 15);
        border.lineStyle(1, 0x4a3b2a, 1);
        border.strokeRoundedRect(-half + 7, -halfH + 7, panelW - 14, panelH - 14, 12);

        const menuTitle = scene.add.text(0, -halfH + 28, 'TÍTULOS', {
            fontFamily: 'Georgia, serif', fontSize: '17px', fontStyle: 'bold', color: '#d9822b', letterSpacing: 1
        }).setOrigin(0.5).setShadow(1, 1, '#000000', 3, false, true);

        const divider = scene.add.graphics();
        divider.lineStyle(1, 0x4a3b2a, 1);
        divider.lineBetween(-half + 24, -halfH + 46, half - 24, -halfH + 46);

        const makeTitleMenuButton = (x, label, onClick) => {
            const w = 130, h = 34;
            const btnBg = scene.add.graphics();
            btnBg.fillStyle(0x2b2119, 1);
            btnBg.fillRoundedRect(x - w / 2, halfH - 52, w, h, 8);
            btnBg.lineStyle(2, 0x8a7355, 1);
            btnBg.strokeRoundedRect(x - w / 2, halfH - 52, w, h, 8);

            const btnText = scene.add.text(x, halfH - 52 + h / 2, label, {
                fontFamily: 'Georgia, serif', fontSize: '14px', fontStyle: 'bold', color: '#e8dcc0'
            }).setOrigin(0.5);

            const hitZone = scene.add.zone(x, halfH - 52 + h / 2, w, h)
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', onClick)
                .on('pointerover', () => { btnText.setColor('#d9822b'); btnBg.lineStyle(2, 0xd9822b, 1); btnBg.strokeRoundedRect(x - w / 2, halfH - 52, w, h, 8); })
                .on('pointerout', () => { btnText.setColor('#e8dcc0'); btnBg.clear(); btnBg.fillStyle(0x2b2119, 1); btnBg.fillRoundedRect(x - w / 2, halfH - 52, w, h, 8); btnBg.lineStyle(2, 0x8a7355, 1); btnBg.strokeRoundedRect(x - w / 2, halfH - 52, w, h, 8); });

            return [btnBg, btnText, hitZone];
        };

        const backButtons = makeTitleMenuButton(-85, '< Voltar', () => this.hideTitleMenu());
        const closeButtons = makeTitleMenuButton(85, 'Fechar', () => this.closeTitleMenu());
        this.backButton = backButtons[1];
        this.closeButton = closeButtons[1];

        this.titleMenu.add([shadow, backdrop, border, menuTitle, divider, ...backButtons, ...closeButtons]);
        this.titleRowObjects = [];
        this.refreshTitleRows();
    }

    refreshTitleRows() {
        const scene = this.scene;
        if (this.titleRowObjects) this.titleRowObjects.forEach((obj) => obj.destroy());
        this.titleRowObjects = [];

        const panelW = this.titleMenuPanelW, half = this.titleMenuHalf, halfH = this.titleMenuHalfH;
        const effectLabel = { attack: 'Ataque', defense: 'Defesa', intelligence: 'Intelig.', luck: 'Sorte', agility: 'Agilidade', constitution: 'Constit.', hp: 'HP', mana: 'Mana' };
        const formatEffect = (effect) => Object.keys(effect).length === 0 ? 'Sem bônus'
            : Object.keys(effect).map((k) => `+${effect[k]} ${effectLabel[k] || k}`).join('   ');

        const rowH = 46, rowStartY = -halfH + 62;
        this.titleTexts = this.titles.filter((title) => scene.unlockedTitles.includes(title.name)).map((title, index) => {
            const rowY = rowStartY + index * rowH;
            const isEquipped = scene.equippedTitle === title.name;

            const rowBg = scene.add.graphics();
            const drawRowBg = (hover) => {
                rowBg.clear();
                if (isEquipped) {
                    rowBg.fillStyle(0x3a2d16, 0.9);
                    rowBg.fillRoundedRect(-half + 16, rowY - rowH / 2 + 3, panelW - 32, rowH - 6, 8);
                    rowBg.lineStyle(1.5, 0xd9822b, 0.8);
                    rowBg.strokeRoundedRect(-half + 16, rowY - rowH / 2 + 3, panelW - 32, rowH - 6, 8);
                } else if (hover) {
                    rowBg.fillStyle(0x2b2119, 0.9);
                    rowBg.fillRoundedRect(-half + 16, rowY - rowH / 2 + 3, panelW - 32, rowH - 6, 8);
                }
            };
            drawRowBg(false);

            const nameText = scene.add.text(-half + 30, rowY - 9, title.name + (isEquipped ? '  ★' : ''), {
                fontFamily: 'Georgia, serif', fontSize: '15px', fontStyle: 'bold', color: isEquipped ? '#f0a545' : '#e8dcc0'
            }).setOrigin(0, 0.5);

            const effectText = scene.add.text(-half + 30, rowY + 11, formatEffect(title.effect), {
                fontFamily: 'Georgia, serif', fontSize: '10px', color: '#a89878'
            }).setOrigin(0, 0.5);

            const hitZone = scene.add.zone(0, rowY, panelW - 32, rowH - 6)
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => { this.equipTitle(title.name); this.refreshTitleRows(); })
                .on('pointerover', () => drawRowBg(true))
                .on('pointerout', () => drawRowBg(false));

            this.titleRowObjects.push(rowBg, nameText, effectText, hitZone);
            this.titleMenu.add([rowBg, nameText, effectText, hitZone]);
            return nameText;
        });
    }

    showTitleMenu() {
        this.menuScreen.setVisible(false);
        this.titleMenu.setVisible(true);
        this.refreshTitleRows();
    }

    hideTitleMenu() {
        this.titleMenu.setVisible(false);
        this.menuScreen.setVisible(true);
    }

    closeTitleMenu() {
        this.titleMenu.setVisible(false);
        this.scene.player.body.enable = true;
    }

    equipTitle(title) {
        const scene = this.scene;
        if (!scene.unlockedTitles.includes(title)) {
            console.log(`Título "${title}" ainda não desbloqueado.`);
            return;
        }
        this.unequipTitle();

        scene.equippedTitle = title;
        const titleEffect = this.titles.find((t) => t.name === title)?.effect || {};

        Object.keys(titleEffect).forEach((attr) => {
            if (attr in scene.playerAttributes) {
                scene.titleBonus[attr] = titleEffect[attr];
                scene.playerAttributes[attr] += titleEffect[attr];
            }
        });

        scene.updatePlayerStats();
        this.updateAttributeTexts();
        console.log(`Título "${title}" equipado.`);
    }

    /** Desfaz o bônus do título atualmente equipado, antes de trocar pra
     *  outro (ou ao reequipar do zero). Faltava no arquivo original — ver
     *  a nota no topo deste arquivo. */
    unequipTitle() {
        const scene = this.scene;
        Object.keys(scene.titleBonus).forEach((attr) => {
            if (attr in scene.playerAttributes) {
                scene.playerAttributes[attr] -= scene.titleBonus[attr];
            }
        });
        scene.titleBonus = {};
    }

    // ==================== Opções (volume/mudo) ====================
    createOptionsButton() {
        const scene = this.scene;
        this.optionsButton = scene.add.image(scene.cameras.main.width - 35, 35, 'Aspinninggearicon')
            .setOrigin(0.5)
            .setScale(0.05)
            .setScrollFactor(0)
            .setDepth(150)
            .setInteractive()
            .on('pointerdown', () => this.toggleOptionsMenu());

        scene.tweens.add({
            targets: this.optionsButton,
            angle: 360,
            duration: 4000,
            repeat: -1,
            ease: 'Linear'
        });
    }

    createOptionsMenu() {
        const scene = this.scene;
        this.optionsMenu = scene.add.container(scene.cameras.main.centerX, scene.cameras.main.centerY).setVisible(false).setDepth(220);

        const panelW = 300, panelH = 240;
        const half = panelW / 2, halfH = panelH / 2;

        const shadow = scene.add.graphics();
        shadow.fillStyle(0x000000, 0.45);
        shadow.fillRoundedRect(-half + 4, -halfH + 6, panelW, panelH, 16);
        const backdrop = scene.add.graphics();
        backdrop.fillStyle(0x0d0a08, 0.92);
        backdrop.fillRoundedRect(-half, -halfH, panelW, panelH, 16);
        const border = scene.add.graphics();
        border.lineStyle(3, 0x8a7355, 1);
        border.strokeRoundedRect(-half + 3, -halfH + 3, panelW - 6, panelH - 6, 13);
        border.lineStyle(1, 0x4a3b2a, 1);
        border.strokeRoundedRect(-half + 7, -halfH + 7, panelW - 14, panelH - 14, 10);

        const optionsTitle = scene.add.text(0, -halfH + 28, 'OPÇÕES', {
            fontFamily: 'Georgia, serif', fontSize: '15px', fontStyle: 'bold', color: '#d9822b', letterSpacing: 1
        }).setOrigin(0.5).setShadow(1, 1, '#000000', 3, false, true);

        this.volumeLabel = scene.add.text(0, -halfH + 62, `Volume: ${Math.round(scene.sound.volume * 100)}%`, {
            fontFamily: 'Georgia, serif', fontSize: '13px', color: '#e8dcc0'
        }).setOrigin(0.5);

        const makeIconButton = (x, y, label, onClick) => {
            const w = 34, h = 34;
            const bg = scene.add.graphics();
            bg.fillStyle(0x2b2119, 1);
            bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
            bg.lineStyle(2, 0x8a7355, 1);
            bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
            const txt = scene.add.text(x, y, label, { fontFamily: 'Georgia, serif', fontSize: '18px', fontStyle: 'bold', color: '#e8dcc0' }).setOrigin(0.5);
            const zone = scene.add.zone(x, y, w, h)
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', onClick)
                .on('pointerover', () => txt.setColor('#d9822b'))
                .on('pointerout', () => txt.setColor('#e8dcc0'));
            return [bg, txt, zone];
        };

        const volDown = makeIconButton(-60, -halfH + 96, '-', () => this.adjustVolume(-0.1));
        const volUp = makeIconButton(60, -halfH + 96, '+', () => this.adjustVolume(0.1));

        const w = 130, h = 32;
        const muteBg = scene.add.graphics();
        muteBg.fillStyle(0x2b2119, 1);
        muteBg.fillRoundedRect(-w / 2, -halfH + 128, w, h, 8);
        muteBg.lineStyle(2, 0x8a7355, 1);
        muteBg.strokeRoundedRect(-w / 2, -halfH + 128, w, h, 8);
        this.muteButton = scene.add.text(0, -halfH + 128 + h / 2, scene.sound.mute ? 'Ativar Som' : 'Mudo', {
            fontFamily: 'Georgia, serif', fontSize: '13px', fontStyle: 'bold', color: '#e8dcc0'
        }).setOrigin(0.5);
        const muteZone = scene.add.zone(0, -halfH + 128 + h / 2, w, h)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.toggleMute())
            .on('pointerover', () => this.muteButton.setColor('#d9822b'))
            .on('pointerout', () => this.muteButton.setColor('#e8dcc0'));

        const closeBg = scene.add.graphics();
        closeBg.fillStyle(0x2b2119, 1);
        closeBg.fillRoundedRect(-w / 2, halfH - 46, w, h, 8);
        closeBg.lineStyle(2, 0x8a7355, 1);
        closeBg.strokeRoundedRect(-w / 2, halfH - 46, w, h, 8);
        const closeButton = scene.add.text(0, halfH - 46 + h / 2, 'Fechar', {
            fontFamily: 'Georgia, serif', fontSize: '13px', fontStyle: 'bold', color: '#e8dcc0'
        }).setOrigin(0.5);
        const closeZone = scene.add.zone(0, halfH - 46 + h / 2, w, h)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.toggleOptionsMenu())
            .on('pointerover', () => closeButton.setColor('#d9822b'))
            .on('pointerout', () => closeButton.setColor('#e8dcc0'));

        this.optionsMenu.add([shadow, backdrop, border, optionsTitle, this.volumeLabel, ...volDown, ...volUp,
            muteBg, this.muteButton, muteZone, closeBg, closeButton, closeZone]);
    }

    adjustVolume(delta) {
        const scene = this.scene;
        const newVolume = Phaser.Math.Clamp(scene.sound.volume + delta, 0, 1);
        scene.sound.volume = newVolume;
        this.volumeLabel.setText(`Volume: ${Math.round(newVolume * 100)}%`);
        if (this.storage) this.storage.setItem('volume', String(newVolume));
    }

    toggleMute() {
        const scene = this.scene;
        scene.sound.mute = !scene.sound.mute;
        this.muteButton.setText(scene.sound.mute ? 'Ativar Som' : 'Mudo');
        if (this.storage) this.storage.setItem('muted', scene.sound.mute ? '1' : '0');
    }

    toggleOptionsMenu() {
        if (this.scene.isGameOver) return;
        this.optionsMenu.setVisible(!this.optionsMenu.visible);
        this.scene.player.body.enable = !this.optionsMenu.visible;
    }

    // ==================== Submenus: Magias e Lobo ====================
    /** Progresso compartilhado com o Companion (preferências do lobo + se já foi libertado):
     *  GameScene/CaveScene guardam em this.companionSettings, VillageScene/LibraryScene
     *  recebem como this.caveProgress (mesmo objeto — ver RosebudCaveProgress no HTML). */
    _progress() {
        return this.scene.companionSettings || this.scene.caveProgress || null;
    }

    /** Aplica o que o jogador escolheu antes (rbStorage) — só sobrescreve se existir valor salvo. */
    applyCompanionPrefs() {
        const p = this._progress();
        if (!p || !this.storage) return;
        const stay = this.storage.getItem('companionStay');
        const assist = this.storage.getItem('companionAssist');
        if (stay !== null && stay !== undefined) p.companionStay = stay === '1';
        if (assist !== null && assist !== undefined) p.companionAssist = assist !== '0';
    }

    _savePref(key, value) {
        if (this.storage) this.storage.setItem(key, value ? '1' : '0');
    }

    /** Botão no mesmo estilo dos outros painéis. Devolve { text, setLabel } — o texto fica
     *  no container passado. */
    _makeButton(container, cx, cy, w, h, label, onClick) {
        const scene = this.scene;
        const bg = scene.add.graphics();
        const draw = (hover) => {
            bg.clear();
            bg.fillStyle(0x2b2119, 1);
            bg.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 8);
            bg.lineStyle(2, hover ? 0xd9822b : 0x8a7355, 1);
            bg.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 8);
        };
        draw(false);
        const text = scene.add.text(cx, cy, label, {
            fontFamily: 'Georgia, serif', fontSize: '13px', fontStyle: 'bold', color: '#e8dcc0'
        }).setOrigin(0.5);
        const zone = scene.add.zone(cx, cy, w, h)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', onClick)
            .on('pointerover', () => { text.setColor('#d9822b'); draw(true); })
            .on('pointerout', () => { text.setColor('#e8dcc0'); draw(false); });
        container.add([bg, text, zone]);
        return { text, setLabel: (l) => text.setText(l) };
    }

    /** Moldura padrão de um submenu (mesmas dimensões/estilo do menu de títulos). */
    _makeSubmenuPanel(title, panelH = 420) {
        const scene = this.scene;
        const container = scene.add.container(scene.cameras.main.centerX, scene.cameras.main.centerY).setVisible(false);
        const panelW = 380, half = panelW / 2, halfH = panelH / 2;
        const shadow = scene.add.graphics();
        shadow.fillStyle(0x000000, 0.45);
        shadow.fillRoundedRect(-half + 4, -halfH + 6, panelW, panelH, 18);
        const backdrop = scene.add.graphics();
        backdrop.fillStyle(0x0d0a08, 0.88);
        backdrop.fillRoundedRect(-half, -halfH, panelW, panelH, 18);
        const border = scene.add.graphics();
        border.lineStyle(3, 0x8a7355, 1);
        border.strokeRoundedRect(-half + 3, -halfH + 3, panelW - 6, panelH - 6, 15);
        border.lineStyle(1, 0x4a3b2a, 1);
        border.strokeRoundedRect(-half + 7, -halfH + 7, panelW - 14, panelH - 14, 12);
        const titleText = scene.add.text(0, -halfH + 28, title, {
            fontFamily: 'Georgia, serif', fontSize: '17px', fontStyle: 'bold', color: '#d9822b', letterSpacing: 1
        }).setOrigin(0.5).setShadow(1, 1, '#000000', 3, false, true);
        const divider = scene.add.graphics();
        divider.lineStyle(1, 0x4a3b2a, 1);
        divider.lineBetween(-half + 24, -halfH + 46, half - 24, -halfH + 46);
        container.add([shadow, backdrop, border, titleText, divider]);
        this._makeButton(container, -85, halfH - 52 + 17, 130, 34, '< Voltar', () => this.hideSubmenu());
        this._makeButton(container, 85, halfH - 52 + 17, 130, 34, 'Fechar', () => this.closeSubmenu());
        return { container, panelW, panelH, half, halfH };
    }

    // ---------- Magias ----------
    createSpellMenu() {
        const m = this._makeSubmenuPanel('MAGIAS', 490); // 4 magias cabem (3 cabiam em 420)
        this.spellMenu = m.container;
        this.spellPanel = m;
        this.spellRowObjects = [];
        this.refreshSpellRows();
    }

    refreshSpellRows() {
        const scene = this.scene, m = this.spellPanel;
        this.spellRowObjects.forEach((o) => o.destroy());
        this.spellRowObjects = [];
        const learned = scene.learnedSpells || [];
        const effectLabel = { attack: 'Ataque', defense: 'Defesa', intelligence: 'Intelig.', luck: 'Sorte', agility: 'Agilidade', constitution: 'Constit.' };
        const rowH = 92, startY = -m.halfH + 56;
        PlayerMenu.SPELLS.forEach((spell, i) => {
            const known = learned.includes(spell.id);
            const top = startY + i * rowH;
            const bg = scene.add.graphics();
            bg.fillStyle(known ? 0x2b2119 : 0x17120d, 0.9);
            bg.fillRoundedRect(-m.half + 16, top, m.panelW - 32, rowH - 8, 8);
            bg.lineStyle(1.5, known ? 0x8a7355 : 0x3a2f22, 0.9);
            bg.strokeRoundedRect(-m.half + 16, top, m.panelW - 32, rowH - 8, 8);

            const typeLabel = spell.type === 'attack' ? 'Ataque [1]' : spell.type === 'ability' ? 'Habilidade [2]' : spell.type === 'burst' ? 'Área [3]' : 'Passiva';
            const name = scene.add.text(-m.half + 30, top + 14, known ? spell.name : '???', {
                fontFamily: 'Georgia, serif', fontSize: '15px', fontStyle: 'bold', color: known ? '#f0a545' : '#6b5a44'
            }).setOrigin(0, 0.5);
            const kind = scene.add.text(m.half - 30, top + 14, known ? typeLabel : 'Não aprendida', {
                fontFamily: 'Georgia, serif', fontSize: '10px', fontStyle: 'italic', color: known ? '#9b6fd4' : '#6b5a44'
            }).setOrigin(1, 0.5);

            let stats = 'Encontre o livro desta magia na Biblioteca da Vila.';
            if (known) {
                if (spell.type === 'attack') stats = `Mana ${spell.manaCost}  ·  Recarga ${(spell.cooldownMs / 1000).toFixed(1)}s  ·  Dano ${spell.damage}  ·  Alcance ${spell.range}`;
                else if (spell.type === 'burst') stats = `Mana ${spell.manaCost}  ·  Recarga ${(spell.cooldownMs / 1000).toFixed(1)}s  ·  Dano ${spell.damage}  ·  Raio ${spell.radius}`;
                else if (spell.type === 'ability') stats = `Mana ${spell.manaCost}  ·  Recarga ${(spell.cooldownMs / 1000).toFixed(1)}s  ·  Cura +${spell.healAmount}`;
                else stats = Object.keys(spell.bonus).map((k) => `+${spell.bonus[k]} ${effectLabel[k] || k}`).join('   ') + '  (já aplicado)';
            }
            const statsText = scene.add.text(-m.half + 30, top + 34, stats, {
                fontFamily: 'Georgia, serif', fontSize: '11px', color: known ? '#e8dcc0' : '#6b5a44'
            }).setOrigin(0, 0.5);
            const lore = scene.add.text(-m.half + 30, top + 48, known ? spell.lore : '', {
                fontFamily: 'Georgia, serif', fontSize: '10px', fontStyle: 'italic', color: '#a89878',
                wordWrap: { width: m.panelW - 64 }
            }).setOrigin(0, 0);
            const objs = [bg, name, kind, statsText, lore];
            m.container.add(objs);
            this.spellRowObjects.push(...objs);
        });
    }

    // ---------- Lobo ----------
    createCompanionMenu() {
        const scene = this.scene;
        const m = this._makeSubmenuPanel('LOBO DE CRISTAL');
        this.companionMenu = m.container;
        const half = m.half, halfH = m.halfH;
        const lineY = (y) => { const g = scene.add.graphics(); g.lineStyle(1, 0x4a3b2a, 1); g.lineBetween(-half + 24, y, half - 24, y); return g; };

        // Mensagem mostrada enquanto o lobo ainda está preso
        this.companionLockedText = scene.add.text(0, -20, 'O lobo ainda está preso no cristal\nda caverna.\n\nLiberte-o para que ele te acompanhe\ne ajude nas lutas.', {
            fontFamily: 'Georgia, serif', fontSize: '14px', fontStyle: 'italic', color: '#a89878', align: 'center'
        }).setOrigin(0.5);
        m.container.add(this.companionLockedText);

        const parts = [];
        const key = 'crystalWolfPoseAlert';
        if (scene.textures.exists(key)) {
            const src = scene.textures.get(key).getSourceImage();
            const portrait = scene.add.image(0, -halfH + 120, key).setOrigin(0.5, 0.5).setScale(84 / src.height);
            parts.push(portrait);
        }
        this.companionNameText = scene.add.text(0, -halfH + 184, COMPANION_STATS.crystalWolf.displayName, {
            fontFamily: 'Georgia, serif', fontSize: '18px', fontStyle: 'bold', color: '#f2e6ce'
        }).setOrigin(0.5);
        this.companionStateText = scene.add.text(0, -halfH + 206, '', {
            fontFamily: 'Georgia, serif', fontSize: '12px', fontStyle: 'italic', color: '#9b6fd4'
        }).setOrigin(0.5);
        parts.push(this.companionNameText, this.companionStateText, lineY(-halfH + 222));

        const st = COMPANION_STATS.crystalWolf;
        const stats = [
            ['Dano', `${st.attackDamage}`], ['Recarga', `${(st.attackCooldown / 1000).toFixed(1)}s`],
            ['Alcance', `${st.attackRange}`], ['Alerta', `${st.aggroRange}`],
        ];
        const colW = (m.panelW - 48) / 2;
        stats.forEach(([label, value], i) => {
            const x = -half + 24 + (i % 2) * colW, y = -halfH + 240 + Math.floor(i / 2) * 22;
            parts.push(
                scene.add.text(x + 4, y, label, { fontFamily: 'Georgia, serif', fontSize: '12px', color: '#a89878' }).setOrigin(0, 0.5),
                scene.add.text(x + colW - 14, y, value, { fontFamily: 'Georgia, serif', fontSize: '13px', fontStyle: 'bold', color: '#f2e6ce' }).setOrigin(1, 0.5)
            );
        });
        parts.push(lineY(-halfH + 276));
        m.container.add(parts);
        this.companionParts = parts;

        const stayBtn = this._makeButton(m.container, 0, -halfH + 302, 280, 30, '', () => {
            const p = this._progress(); if (!p) return;
            p.companionStay = !p.companionStay; this._savePref('companionStay', p.companionStay); this.refreshCompanionPanel();
        });
        const assistBtn = this._makeButton(m.container, 0, -halfH + 340, 280, 30, '', () => {
            const p = this._progress(); if (!p) return;
            p.companionAssist = !p.companionAssist; this._savePref('companionAssist', p.companionAssist); this.refreshCompanionPanel();
        });
        this.companionStayBtn = stayBtn; this.companionAssistBtn = assistBtn;
        this.companionButtonObjs = [stayBtn, assistBtn];
        this.companionButtonLayers = m.container.list.slice(-6); // bg/text/zone de cada botão (ver refreshCompanionPanel)
        this.refreshCompanionPanel();
    }

    refreshCompanionPanel() {
        const p = this._progress();
        const freed = !!(p && p.crystalWolfBroken);
        this.companionLockedText.setVisible(!freed);
        this.companionParts.forEach((o) => o.setVisible(freed));
        this.companionButtonLayers.forEach((o) => { o.setVisible(freed); if (o.input) o.input.enabled = freed; });
        if (!freed) return;
        this.companionStateText.setText(p.companionStay ? 'Aguardando no lugar' : 'Seguindo você');
        this.companionStayBtn.setLabel(p.companionStay ? 'Modo: Ficar parado' : 'Modo: Seguir');
        this.companionAssistBtn.setLabel(p.companionAssist ? 'Ajudar em combate: Sim' : 'Ajudar em combate: Não');
    }

    // ---------- Navegação entre o menu principal e os submenus novos ----------
    showSubmenu(name) {
        this.menuScreen.setVisible(false);
        this.titleMenu.setVisible(false);
        this.spellMenu.setVisible(name === 'spell');
        this.companionMenu.setVisible(name === 'companion');
        if (name === 'spell') this.refreshSpellRows();
        if (name === 'companion') this.refreshCompanionPanel();
    }

    hideSubmenu() {
        this.spellMenu.setVisible(false);
        this.companionMenu.setVisible(false);
        this.menuScreen.setVisible(true);
    }

    closeSubmenu() {
        this.spellMenu.setVisible(false);
        this.companionMenu.setVisible(false);
        this.scene.player.body.enable = true;
    }

    // ==================== Alternância do menu principal ====================
    // Um único caminho pro [M] agora: se o submenu de títulos estiver
    // aberto, fecha ele (equivalente ao "Fechar" de lá); senão, abre/
    // fecha o painel de atributos. Antes isso era feito por dois
    // mecanismos diferentes no GameScene (checagem de tecla por frame
    // pro menu principal + um listener keydown-M à parte só pro
    // submenu de títulos) — consolidado aqui num só.
    toggleMenu() {
        if (this.scene.isGameOver) return;
        if (this.titleMenu.visible) {
            this.closeTitleMenu();
            return;
        }
        if (this.spellMenu.visible || this.companionMenu.visible) {
            this.closeSubmenu();
            return;
        }
        this.menuScreen.setVisible(!this.menuScreen.visible);
        this.scene.player.body.enable = !this.menuScreen.visible;
        if (this.menuScreen.visible) this.updateAttributeTexts();
    }
}

PlayerMenu.TITLES = [
    { name: 'Novato', effect: {}, requirement: null },
    { name: 'Guerreiro', effect: { attack: 2, defense: 1 }, requirement: { level: 5, attribute: { attack: 5 } } },
    { name: 'Mago', effect: { intelligence: 2, mana: 10 }, requirement: { level: 5, attribute: { intelligence: 5 } } },
    { name: 'Aventureiro', effect: { luck: 2, agility: 1 }, requirement: { level: 5, attribute: { luck: 5 } } },
    { name: 'Campeão', effect: { attack: 3, defense: 2, hp: 20 }, requirement: { level: 10, attribute: { attack: 10, defense: 10 } } },
    { name: 'Nasce uma leynda', effect: { agility: 3, constitution: 3 }, requirement: { name: 'Leyn' } },
];

// Catálogo de magias — ensinadas pelos livros da LibraryScene (ver
// LibraryScene.js). Mesmo padrão estático de PlayerMenu.TITLES: uma lista
// só, lida tanto pela cena que ensina (LibraryScene) quanto pelas que
// conjuram (GameScene/CaveScene, ver castAttackSpell()/castAbilitySpell()
// nelas). Três tipos, cada um tratado diferente por quem aprende/conjura:
// - 'attack': golpe à distância, tecla própria, gasta mana, tem cooldown,
//   dano e alcance fixos.
// - 'passive': aplicado uma vez, na hora de aprender — soma direto em
//   baseAttributes (não precisa de tecla nem de conjurar depois).
// - 'ability': efeito ativo fora de combate (cura), mesma ideia de tecla+
//   mana+cooldown do 'attack', mas sem alvo/dano.
// - 'burst': onda de choque em ÁREA ao redor do jogador (os dois lados),
//   tecla 3, gasta mana, tem cooldown; dano e raio fixos (ChaosEffect.js).
PlayerMenu.SPELLS = [
    {
        id: 'chama', name: 'Chama Pálida', type: 'attack',
        manaCost: 3, cooldownMs: 1100, damage: 8, range: 560, speed: 460, // range = distância que o projétil percorre (Fireball.js), não mais um golpe de 100px
        lore: 'As chamas que os seres celestiais deixavam para afastar o que ronda a escuridão — hoje fracas, mas ainda respondem a quem as invoca.',
    },
    {
        id: 'vontade', name: 'Vontade Inabalável', type: 'passive',
        bonus: { intelligence: 2, luck: 1 },
        lore: '"Tudo depende do desejo do ser", dizem os registros. Este livro ensina a moldar esse desejo em força — um lembrete de que o mesmo poder que ergue também transforma.',
    },
    {
        id: 'sopro', name: 'Sopro Vital', type: 'ability',
        manaCost: 4, cooldownMs: 3000, healAmount: 14,
        lore: 'Um fragmento de cura guardado pelos que vieram antes — prova de que os reinos, mesmo distantes, um dia cuidaram de quem ficou.',
    },
    {
        id: 'caos', name: 'Eco do Caos', type: 'burst',
        manaCost: 6, cooldownMs: 5000, damage: 12, radius: 170,
        lore: 'O que ainda ecoa do Primordial não obedece — apenas empurra para longe tudo o que está perto de quem o invoca.',
    },
];

/** Regeneração passiva de mana nas cenas de combate (GameScene/CaveScene): 1 ponto a cada tantos ms. Ajuste aqui. */
PlayerMenu.MANA_REGEN_MS = 5000;
