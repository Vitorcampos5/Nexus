/* =====================================================================
   Scenery — utilitários de cenário compartilhados por GameScene e
   CaveScene.

   POR QUE O ESCOPO AQUI É MENOR QUE O DO PlayerController/Enemy
   -----------------------------------------------------------------
   Diferente do personagem e dos inimigos, a maior parte do "cenário" de
   cada cena é CONTEÚDO ÚNICO, não lógica duplicada: as árvores/morros/
   pássaros/vagalumes do GameScene e as estalactites/cristais/fogueiras/
   ossos da CaveScene não se repetem entre si — são desenhos diferentes
   pra lugares diferentes. Reescrever esse conteúdo não elimina bug
   nenhum, só arrisca mudar a cara do jogo sem motivo. Por isso ele
   continua morando em cada Scene, como decoração própria.

   O que ESTE arquivo extrai é só o que de fato se repetia (ou tinha
   potencial real de gerar o mesmo tipo de bug em cada cópia):

   1. ProceduralGround — createGround() e createCaveGround() eram a
      MESMA receita (gerar textura via Graphics, montar tileSprite,
      física estática, sombra de contato) com visual diferente. E essa
      duplicação já causou um bug de verdade: as duas cenas geravam a
      textura sob a mesma chave 'groundTexture', e como o cache de
      texturas do Phaser é global (não por Scene), uma cena acabava
      silenciosamente herdando a textura da outra. Foi corrigido no
      original renomeando pra 'plainsGroundTexture'/'caveGroundTexture'
      à mão — aqui a chave é OBRIGATÓRIA e vem de fora, então essa
      classe de bug não tem como se repetir: não existe um valor padrão
      pra esquecer de trocar.

   2. DestructiblePlatform — crumblePlatform()/createDebrisBurst() já
      eram uma unidade genérica (funcionam em cima de qualquer game
      object com física), só moravam dentro da GameScene. Extraídas tal
      qual, sem mudança de comportamento.

   3. InteractionZone — createExit(), createCaveSavePoint() e o Crystal
      Wolf (que o próprio código original já comenta como "puro
      cenário/interação — sem HP, sem combate") repetiam a MESMA receita
      cada um do seu jeito: zona de proximidade, texto de dica que
      aparece/some, tecla E. Uma unidade só agora resolve os três (e
      fica pronta pra o NPC de charada do GameScene, hoje morto/não
      chamado, se algum dia voltar a ser usado).

   4. DayNightCycle — não duplicado (só GameScene tem; cavernas não têm
      hora do dia), mas isolado aqui como peça própria e limpa em vez de
      misturado no meio dos métodos da cena.

   O Crystal Wolf especificamente NÃO virou uma classe própria aqui —
   ele já é só um InteractionZone com uma sequência de troca de textura
   em 3 estágios como efeito. Ver o exemplo de uso no fim do arquivo.
   ===================================================================== */

/* =====================================================================
   ProceduralGround
   ===================================================================== */
class ProceduralGround {
    /**
     * @param {Phaser.Scene} scene
     * @param {object} config
     * @param {string} config.textureKey  OBRIGATÓRIO e deve ser único
     *        por cena — é isso que impede a colisão de chave que já
     *        aconteceu uma vez no original (ver nota acima).
     * @param {number} config.worldWidth
     * @param {number} config.worldHeight
     * @param {number} config.groundHeight
     * @param {number} config.tileWidth
     * @param {(g: Phaser.GameObjects.Graphics, tileWidth:number, groundHeight:number) => void} config.draw
     *        Desenha UM tile da textura — o visual específico (terra,
     *        rocha, etc.) continua sendo decisão de quem chama, não
     *        desta classe.
     * @param {number} [config.shadowAlpha=0.32]
     * @param {number} [config.shadowHeight=12]
     */
    constructor(scene, config) {
        this.scene = scene;

        if (!scene.textures.exists(config.textureKey)) {
            const g = scene.add.graphics();
            config.draw(g, config.tileWidth, config.groundHeight);
            g.generateTexture(config.textureKey, config.tileWidth, config.groundHeight);
            g.destroy();
        }

        const y = config.worldHeight - config.groundHeight;
        this.sprite = scene.add.tileSprite(0, y, config.worldWidth, config.groundHeight, config.textureKey).setOrigin(0, 0);
        this.sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        scene.physics.add.existing(this.sprite, true);

        const shadow = scene.add.graphics();
        const shadowH = config.shadowHeight || 12;
        shadow.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, config.shadowAlpha || 0.32, config.shadowAlpha || 0.32);
        shadow.fillRect(0, y - shadowH, config.worldWidth, shadowH);
    }
}

/* =====================================================================
   DestructiblePlatform — extraída tal qual de crumblePlatform() /
   createDebrisBurst(), sem mudança de comportamento (mesmos tempos,
   mesma física dos destroços, mesmo shake de câmera).
   ===================================================================== */
class DestructiblePlatform {
    /** @param {Phaser.Scene} scene */
    constructor(scene) {
        this.scene = scene;
    }

    /** @param {Phaser.GameObjects.GameObject} platform  Qualquer objeto
     *  com corpo de física estático — não precisa ser de um grupo específico. */
    crumble(platform) {
        if (!platform || !platform.active) return;

        if (this.scene.cache.audio.exists('platformBreak')) {
            this.scene.sound.play('platformBreak', { volume: 0.6 });
        }
        this.scene.cameras.main.shake(150, 0.006);
        this._spawnDebris(platform.x, platform.y);

        if (platform.body) platform.body.enable = false;

        this.scene.tweens.add({
            targets: platform, alpha: 0, scaleY: 0.1, y: platform.y + 30,
            duration: 350, ease: 'Cubic.easeIn',
            onComplete: () => platform.destroy(),
        });
    }

    _spawnDebris(x, y) {
        if (!this.scene.textures.exists('platformDebris')) {
            const g = this.scene.add.graphics();
            g.fillStyle(0x8a7a6a, 1);
            g.fillRect(0, 0, 6, 6);
            g.generateTexture('platformDebris', 6, 6);
            g.destroy();
        }
        for (let i = 0; i < 10; i++) {
            const piece = this.scene.physics.add.sprite(x, y, 'platformDebris');
            piece.setVelocity(Phaser.Math.Between(-120, 120), Phaser.Math.Between(-220, -60));
            piece.setGravityY(600);
            piece.setAngularVelocity(Phaser.Math.Between(-200, 200));
            this.scene.time.delayedCall(700, () => { if (piece.active) piece.destroy(); });
        }
    }
}

/* =====================================================================
   InteractionZone — proximidade (raio) + tecla E + toque + dica de
   texto. Consolida createExit()/o "near" do exitZone, createCaveSavePoint()
   e o Crystal Wolf (as três cópias manuais dessa mesma receita no
   original, incluindo o suporte a toque em mobile via RosebudTouch que
   as três já tinham do lado do teclado).

   Simplificação real em relação ao original: lá, exitZone nascia com
   um corpo de física completo (physics.add.existing + setAllowGravity
   + body.moves=false), mas a checagem de "perto" nunca usava esse
   corpo — usava Phaser.Math.Distance.Between contra zone.x/y direto.
   O corpo de física era criado e nunca lido. Aqui não existe: só
   posição + raio, do jeito que era de fato usado.
   ===================================================================== */
class InteractionZone {
    /**
     * @param {Phaser.Scene} scene
     * @param {object} config
     * @param {number} config.x
     * @param {number} config.y
     * @param {number} config.radius  Raio de proximidade (75 no exit,
     *        90 no save point, 95 no Crystal Wolf, no original).
     * @param {Phaser.Input.Keyboard.Key} config.interactKey  Tecla E já
     *        criada pela Scene — a zona não cria tecla própria.
     * @param {() => boolean} [config.checkTouchInteract]  Ponte pro
     *        input de toque (ex: `() => RosebudTouch.consumir('interactPress')`).
     *        Ausente = só teclado.
     * @param {() => {x:number,y:number}} config.getPlayerPosition
     * @param {number} [config.hintY]  Y do texto de dica (padrão: acima da zona).
     * @param {() => string} config.getHintText  Chamado toda vez que a
     *        dica for exibida — permite texto dinâmico (ex: o save point
     *        troca de texto conforme os goblins já foram derrotados).
     * @param {() => boolean} [config.isRelevant]  Controla se a zona
     *        aparece NO TODO (dica incluída) — usado pelo Crystal Wolf,
     *        que some por completo depois de quebrado. Padrão: sempre
     *        relevante.
     * @param {() => boolean} [config.canInteract]  Diferente de
     *        isRelevant: só trava a AÇÃO, a dica continua visível e com
     *        texto próprio — usado pelo save point, que sempre mostra
     *        alguma dica quando perto (varia entre "Pressione E pra
     *        salvar" e "Derrote todos os goblins pra usar" conforme
     *        getHintText) mesmo com a ação bloqueada. Padrão: sempre true.
     * @param {(zone: InteractionZone) => void} config.onInteract
     */
    constructor(scene, config) {
        this.scene = scene;
        this.x = config.x;
        this.y = config.y;
        this.radius = config.radius;
        this.interactKey = config.interactKey;
        this.checkTouchInteract = config.checkTouchInteract || (() => false);
        this.getPlayerPosition = config.getPlayerPosition;
        this.getHintText = config.getHintText;
        this.isRelevant = config.isRelevant || (() => true);
        this.canInteract = config.canInteract || (() => true);
        this.onInteract = config.onInteract;

        this.hint = scene.add.text(config.x, config.hintY !== undefined ? config.hintY : config.y - 40, '', {
            fontSize: '13px', fill: '#ffffff', backgroundColor: '#000000aa', padding: { x: 6, y: 3 },
        }).setOrigin(0.5).setVisible(false);
    }

    /** Chamado uma vez por frame pela Scene. */
    update() {
        if (!this.isRelevant()) { this.hint.setVisible(false); return; }

        const p = this.getPlayerPosition();
        const near = Phaser.Math.Distance.Between(p.x, p.y, this.x, this.y) < this.radius;

        this.hint.setVisible(near);
        if (!near) return;

        this.hint.setText(this.getHintText());
        const pressed = Phaser.Input.Keyboard.JustDown(this.interactKey) || this.checkTouchInteract();
        if (pressed && this.canInteract()) this.onInteract(this);
    }
}

/* =====================================================================
   DayNightCycle — mesma lógica de keyframes + interpolação de cor do
   createDayNightOverlay()/updateDayNightCycle()/lerpColor() originais,
   isolada como peça própria. Usa a hora real do relógio do sistema,
   igual ao original (não é um timer de jogo).
   ===================================================================== */
class DayNightCycle {
    /**
     * @param {Phaser.Scene} scene
     * @param {{hour:number, color:number, alpha:number}[]} keyframes
     *        Precisam cobrir de hour:0 a hour:24. Ordenados por hour.
     * @param {number} worldWidth
     * @param {number} worldHeight
     */
    constructor(scene, keyframes, worldWidth, worldHeight) {
        this.scene = scene;
        this.keyframes = keyframes;
        this.overlay = scene.add.rectangle(0, 0, worldWidth, worldHeight, 0x000000, 0)
            .setOrigin(0, 0).setScrollFactor(0).setDepth(999);
        this.update();
    }

    _lerpColor(colorA, colorB, t) {
        const rA = (colorA >> 16) & 0xFF, gA = (colorA >> 8) & 0xFF, bA = colorA & 0xFF;
        const rB = (colorB >> 16) & 0xFF, gB = (colorB >> 8) & 0xFF, bB = colorB & 0xFF;
        const r = Math.round(rA + (rB - rA) * t);
        const g = Math.round(gA + (gB - gA) * t);
        const b = Math.round(bA + (bB - bA) * t);
        return (r << 16) | (g << 8) | b;
    }

    /** Chamado periodicamente (não precisa ser todo frame — a hora real
     *  não muda rápido o bastante pra justificar). */
    update() {
        const now = new Date();
        const currentHour = now.getHours() + now.getMinutes() / 60;
        const kf = this.keyframes;
        for (let i = 0; i < kf.length - 1; i++) {
            if (currentHour >= kf[i].hour && currentHour <= kf[i + 1].hour) {
                const span = kf[i + 1].hour - kf[i].hour;
                const t = span === 0 ? 0 : (currentHour - kf[i].hour) / span;
                const color = this._lerpColor(kf[i].color, kf[i + 1].color, t);
                const alpha = kf[i].alpha + (kf[i + 1].alpha - kf[i].alpha) * t;
                this.overlay.setFillStyle(color, alpha);
                return;
            }
        }
    }
}

/** Keyframes originais do GameScene, preservados exatamente — só
 *  isolados aqui em vez de dentro do método. */
const PLAINS_DAY_NIGHT_KEYFRAMES = [
    { hour: 0, color: 0x0d1a35, alpha: 0.55 },
    { hour: 5, color: 0x0d1a35, alpha: 0.55 },
    { hour: 6, color: 0xffb37a, alpha: 0.35 }, // amanhecer
    { hour: 8, color: 0xfff4d9, alpha: 0.08 },
    { hour: 12, color: 0xffffff, alpha: 0 },   // dia
    { hour: 16, color: 0xffffff, alpha: 0 },
    { hour: 17, color: 0xff9955, alpha: 0.25 }, // tarde
    { hour: 19, color: 0x0d1a35, alpha: 0.55 }, // noite
    { hour: 24, color: 0x0d1a35, alpha: 0.55 },
];

/* =====================================================================
   EXEMPLO — como o Crystal Wolf e o ponto de save ficam em cima de
   InteractionZone, pra ilustrar a integração (isto entra nas cenas na
   hora do wiring, não faz parte da API deste arquivo):

   const crystalWolf = new InteractionZone(this, {
       x, y: groundY - 45, radius: 95,
       interactKey: this.interactKey,
       checkTouchInteract: () => RosebudTouch.consumir('interactPress'),
       getPlayerPosition: () => ({ x: this.player.x, y: this.player.y }),
       getHintText: () => 'Pressione E para quebrar o cristal',
       isRelevant: () => !RosebudCaveProgress.crystalWolfBroken, // some por completo depois de quebrado
       onInteract: () => this._breakCrystalWolf(), // a sequência de 3 estágios continua sendo conteúdo próprio da cena
   });

   const savePoint = new InteractionZone(this, {
       x, y: groundY, radius: 90,
       interactKey: this.interactKey,
       checkTouchInteract: () => RosebudTouch.consumir('interactPress'),
       getPlayerPosition: () => ({ x: this.player.x, y: this.player.y }),
       getHintText: () => allGoblinsDead() ? 'Pressione E para salvar' : 'Derrote todos os goblins pra usar',
       canInteract: () => allGoblinsDead(), // dica sempre aparece perto; só a AÇÃO fica travada
       onInteract: () => this._saveAtCavePoint(),
   });
   ===================================================================== */
