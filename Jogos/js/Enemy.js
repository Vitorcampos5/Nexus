/* =====================================================================
   Enemy — base compartilhada por Slime (GameScene) e Goblin (CaveScene).

   O QUE ESTAVA DUPLICADO/DIVERGENTE NO ORIGINAL
   -----------------------------------------------
   damageEnemy() (GameScene, usada só pros slimes) e damageGoblin()
   (CaveScene) faziam a MESMA coisa — crítico por sorte, flash, checar
   morte, dar XP, tween de morte, destroy() — mas escritas duas vezes,
   e as duas cópias já tinham divergido: damageEnemy() bloqueia dano se
   o jogador estiver defendendo (`if (this.isDefending) return;`),
   damageGoblin() não tem essa checagem. Unifiquei mantendo a regra do
   GameScene (parece ter sido a intenção original, só esquecida ao
   copiar pra CaveScene).

   Slime e Goblin também têm modelos de dano-ao-jogador DIFERENTES por
   natureza, não por acidente — preservei os dois:
     - Slime: dano por CONTATO físico (overlap contínuo + cooldown de
       invencibilidade). A Scene ainda precisa registrar o
       physics.add.overlap (isso é física do Phaser, não é algo que a
       classe deva esconder) e só chamar enemy.onPlayerContact().
     - Goblin: dano à DISTÂNCIA — quando o alvo entra no attackRange e o
       cooldown permite, causa dano diretamente (ou, no caso do bomber,
       lança um projétil). Isso já roda sozinho dentro de update().

   NÃO isso inclui: Crystal Wolf. Não é combate — é decoração
   interativa (quebra com E, sem HP, sem dano). Fica pro sistema de
   cenário, não aqui.

   INTEGRAÇÃO COM O PlayerController (arquivo anterior)
   -----------------------------------------------------
   Enemy nunca mexe direto no HP do jogador. Recebe uma função
   `dealDamageToPlayer(amount)` na config — na integração final, isso é
   só `(amount) => playerController.takeDamage(amount)`. A invencibilidade
   pós-dano, o estado HURT, tudo isso já mora no PlayerController; Enemy
   só pede "causa esse dano", e quem decide se aplica é o alvo.
   ===================================================================== */

/**
 * Tabela de estatísticas por tipo — mesmo espírito do GOBLIN_STATS
 * original, só que agora cobre slime também, num lugar só.
 * Números idênticos aos confirmados no arquivo original.
 */
const ENEMY_STATS = Object.freeze({
    slime: {
        hp: 30, xp: 20,
        speed: 90, aggroRange: 220, leashRange: 320, patrolRadius: 70,
        hopForce: 300, hopCooldown: 650,
        contactDamageMin: 1, contactDamageBase: 8, contactDamageDefenseDiv: 3,
        lootChance: 0.10, lootLabel: 'Gosma de Slime',
        respawnsOnRevisit: true, // slimes não têm "derrotado" persistente — recriados a cada visita, igual ao original
    },
    goblin_rogue: {
        hp: 22, speed: 62, dmgMin: 5, dmgMax: 7, attackCooldown: 820,
        attackRange: 55, aggroRange: 180, xp: 45, teleportCooldown: 4200,
        respawnsOnRevisit: false,
    },
    goblin_warrior: {
        hp: 46, speed: 34, dmgMin: 9, dmgMax: 13, attackCooldown: 1150,
        attackRange: 60, aggroRange: 160, xp: 55,
        respawnsOnRevisit: false,
    },
    goblin_shaman: {
        hp: 20, speed: 50, dmgMin: 3, dmgMax: 5, attackCooldown: 950,
        attackRange: 55, aggroRange: 170, xp: 60,
        buffCooldown: 4500, buffRadius: 240, buffDuration: 3000, buffMultiplier: 1.35,
        respawnsOnRevisit: false,
    },
    goblin_thief: {
        hp: 15, speed: 88, dmgMin: 2, dmgMax: 3, attackCooldown: 520,
        attackRange: 50, aggroRange: 190, xp: 30,
        respawnsOnRevisit: false,
    },
    goblin_bomber: {
        hp: 25, speed: 45, dmgMin: 7, dmgMax: 10, attackCooldown: 1700,
        attackRange: 230, aggroRange: 260, xp: 50, projectileSpeed: 230,
        respawnsOnRevisit: false,
    },
});

/* =====================================================================
   Enemy — classe base. Cuida do que É igual entre slime e goblin: hp,
   crítico, flash ao levar dano, XP, loot, persistência de morte, e o
   ciclo de update() que delega pras subclasses.
   ===================================================================== */
class Enemy {
    /**
     * @param {Phaser.Scene} scene
     * @param {Phaser.Physics.Arcade.Sprite} sprite  Já criado e com física.
     * @param {object} statsKey  Chave em ENEMY_STATS (ex: 'slime', 'goblin_rogue').
     * @param {object} config
     * @param {number} config.spawnX  Posição de spawn (usada por leash/patrol e pela chave de persistência).
     * @param {(amount:number) => boolean} config.dealDamageToPlayer
     * @param {() => boolean} config.isPlayerDefending  Consultado antes de aplicar dano ao inimigo.
     * @param {() => {x:number}} config.getPlayerPosition
     * @param {(amount:number) => void} config.grantExperience
     * @param {(x:number, y:number, amount:number) => void} config.showXpPopup
     * @param {(spawnX:number) => void} [config.onPersistDefeat]  Chamado
     *        na morte quando ENEMY_STATS[statsKey].respawnsOnRevisit é
     *        false — quem decide ONDE persistir (ex: RosebudCaveProgress)
     *        continua sendo a Scene, não esta classe.
     * @param {() => void} [config.onDefeat]  Chamado em QUALQUER morte,
     *        respawnsOnRevisit ou não (ex: contador de slimes restantes).
     * @param {(x:number, y:number, label:string) => void} [config.onLootDrop]
     * @param {() => number} config.getLuck
     * @param {() => number} [config.getPlayerDefense]  Só usado pelo
     *        Slime (dano por contato depende da defesa do jogador).
     */
    constructor(scene, sprite, statsKey, config) {
        this.scene = scene;
        this.sprite = sprite;
        this.statsKey = statsKey;
        this.stats = ENEMY_STATS[statsKey];
        this.spawnX = config.spawnX;

        this.dealDamageToPlayer = config.dealDamageToPlayer;
        this.isPlayerDefending = config.isPlayerDefending;
        this.getPlayerPosition = config.getPlayerPosition;
        this.grantExperience = config.grantExperience;
        this.showXpPopup = config.showXpPopup;
        this.onPersistDefeat = config.onPersistDefeat || (() => {});
        this.onDefeat = config.onDefeat || (() => {}); // dispara em QUALQUER morte — ver _die()
        this.onLootDrop = config.onLootDrop || (() => {});
        this.getLuck = config.getLuck;
        this.getPlayerDefense = config.getPlayerDefense || (() => 0);

        this.hp = this.stats.hp;
        this.maxHp = this.stats.hp;
        this.direction = 1;
        this.dead = false;
        this.stunnedUntil = 0; // ver takeDamage()/update() — stun ao ser atingido

        this.sprite.enemyRef = this; // permite ir de sprite → controller nos callbacks de física da Scene
    }

    /** Roda uma vez por frame — chamado pela Scene pra cada inimigo vivo. */
    update(time, delta) {
        if (this.dead || !this.sprite.active) return;
        if (time < this.stunnedUntil) {
            // Atordoado: não anda nem ataca (mesma ideia do HURT do
            // jogador — ele trava por um tempo depois de ser atingido, os
            // inimigos não travavam nada, o que parecia injusto). A física
            // (gravidade etc.) continua rodando normal, só a IA pausa.
            return;
        }
        this.updateMovement(time, delta);
        this.updateCombat(time, delta);
    }

    /** Sobrescrito pelas subclasses. */
    updateMovement(time, delta) {}
    updateCombat(time, delta) {}

    distanceToPlayer() {
        return this.getPlayerPosition().x - this.sprite.x;
    }

    /**
     * Dano causado PELO jogador (via PlayerController.onDealDamage).
     * Substitui damageEnemy()/damageGoblin() — mesma lógica, um lugar só.
     */
    takeDamage(rawDamage) {
        if (this.dead) return;
        if (this.isPlayerDefending()) return; // regra do damageEnemy original, agora também vale pra goblins

        const isCrit = Math.random() < (this.getLuck() / 100);
        const finalDamage = isCrit ? rawDamage * 2 : rawDamage;
        this.hp -= finalDamage;

        this.scene.tweens.add({ targets: this.sprite, alpha: 0.5, duration: 100, yoyo: true, repeat: 2 });

        if (this.hp <= 0) {
            this._die();
        } else {
            // 350ms de stun — não existia no original (lá era só o flash),
            // adicionado a pedido pra dar a mesma sensação de "levou o
            // golpe" que o jogador já tinha com o próprio HURT.
            //
            // Causa de o stun quase não aparecer: update() só pausa a IA
            // (updateMovement/updateCombat) enquanto stunnedUntil não
            // vence — nada zerava a velocidade que o inimigo já tinha NO
            // INSTANTE do hit. Nenhum sprite de inimigo tem drag (só o
            // player usa setDragX(500), no create() original) — em Arcade
            // Physics, sem drag, a velocidade se mantém constante até algo
            // mudar explicitamente. Resultado: um goblin perseguindo (ou
            // um slime aterrissando) continuava deslizando na MESMA
            // velocidade durante o stun inteiro; só o flash de alpha era
            // visível, e por isso a sensação de "quase não tem stun".
            // Zerando a velocidade horizontal aqui, no exato momento do
            // hit, é o que falta pra a pausa realmente se ver.
            this.sprite.body.setVelocityX(0);
            this.stunnedUntil = this.scene.time.now + 350;
        }
    }

    _die() {
        this.dead = true;
        const xp = this.stats.xp || 20;
        this.showXpPopup(this.sprite.x, this.sprite.y - this.sprite.displayHeight, xp);
        this.grantExperience(xp);

        if (!this.stats.respawnsOnRevisit) this.onPersistDefeat(this.spawnX);

        this._rollLoot();
        // onDefeat: dispara pra QUALQUER morte, respawnsOnRevisit ou não —
        // diferente de onPersistDefeat (só chamado quando NÃO respawna).
        // Existe porque onSlimeDefeated() no original decrementava um
        // contador (slimesRemaining) a cada slime morto, independente de
        // persistência — sem equivalente nos outros dois callbacks daqui.
        this.onDefeat();

        this.scene.tweens.add({
            targets: this.sprite,
            scale: this.sprite.scale * 1.15,
            alpha: 0,
            duration: 120,
            onComplete: () => this.sprite.destroy(),
        });
    }

    /** Sobrescrito só pelo Slime (drop de Gosma de Slime). Sem-op pros goblins.
     *  Nota de integração: no original, o popup do loot (showItemDropPopup)
     *  tinha um atraso de 150ms em relação ao popup de XP, só pra não
     *  nascerem sobrepostos na tela. Esse atraso é detalhe de apresentação —
     *  fica a critério de quem implementar onLootDrop na Scene, não precisa
     *  morar aqui. */
    _rollLoot() {}
}

/* =====================================================================
   Slime — movimento em "pulinhos" (hop), patrulha com leash, dano por
   contato físico. Squash/stretch é troca de TEXTURA (não de escala) —
   preservei exatamente esse padrão do original.
   ===================================================================== */
class Slime extends Enemy {
    constructor(scene, sprite, config) {
        super(scene, sprite, 'slime', config);
        this.variant = config.variant; // 0-2, só afeta a cor/textura
        this.lastHopTime = 0;
        this.direction = Phaser.Math.Between(0, 1) ? 1 : -1;
        // Tamanho de corpo fixo confirmado no original (createSlimes) —
        // menor que o sprite exibido, então mora aqui (constante do tipo),
        // não em ENEMY_STATS (que já tem outros números específicos do
        // slime, mas esse é sobre o corpo de física, não sobre stats).
        sprite.body.setSize(40, 26);
    }

    updateMovement(time) {
        const vy = this.sprite.body.velocity.y;
        const onFloor = this.sprite.body.onFloor();

        // Squash/stretch: troca de textura conforme a física, sem tocar
        // em scale — mesmo truque do original, preservado tal e qual.
        let pose = 'normal';
        if (!onFloor && vy < -60) pose = 'esticado';
        else if (onFloor && time - this.lastHopTime < 140) pose = 'espremido';
        const expectedKey = `rbSlime${this.variant}_${pose}`;
        if (this.sprite.texture.key !== expectedKey) this.sprite.setTexture(expectedKey);

        if (!onFloor) return; // no meio do pulo — deixa a física fazer a curva, não interrompe
        if (time - this.lastHopTime < this.stats.hopCooldown) return;

        const dx = this.distanceToPlayer();
        const distSpawnToPlayer = Math.abs(this.getPlayerPosition().x - this.spawnX);
        const isAggro = Math.abs(dx) < this.stats.aggroRange && distSpawnToPlayer < this.stats.leashRange;

        if (isAggro) {
            this.direction = dx >= 0 ? 1 : -1;
        } else if (Math.abs(this.sprite.x - this.spawnX) > this.stats.patrolRadius) {
            this.direction *= -1;
        }

        this.sprite.setVelocityX(this.stats.speed * (isAggro ? 1.6 : 1) * this.direction);
        this.sprite.setVelocityY(-this.stats.hopForce * (isAggro ? 1 : 0.55));
        this.sprite.flipX = this.direction > 0;
        this.lastHopTime = time;
    }

    /** Chamado pela Scene a partir do physics.add.overlap(player, slimesGroup, ...).
     *  A invencibilidade pós-dano mora inteira no PlayerController — Slime só
     *  tenta, e quem decide se o dano realmente é aplicado é o alvo. */
    onPlayerContact() {
        const s = this.stats;
        const defense = this.getPlayerDefense();
        const damage = Math.max(s.contactDamageMin, s.contactDamageBase - Math.floor(defense / s.contactDamageDefenseDiv));
        this.dealDamageToPlayer(damage);
    }

    _rollLoot() {
        if (Math.random() < this.stats.lootChance) {
            this.onLootDrop(this.sprite.x, this.sprite.y - this.sprite.displayHeight - 18, this.stats.lootLabel);
        }
    }
}

/* =====================================================================
   Goblin — anda contínuo (não pula), 3 faixas de distância (ataca /
   persegue / patrulha), ataque corpo-a-corpo alternando garra/mordida
   por padrão. Comportamentos extra por tipo (teleporte do rogue, buff
   do shaman) e o ataque à distância do bomber entram por composição —
   ver GOBLIN_BEHAVIORS mais abaixo — em vez de "if (tipo === X)"
   espalhado pelo corpo da classe.
   ===================================================================== */
const GOBLIN_BEHAVIORS = {
    rogue: {
        tick(goblin, time) {
            if (time - goblin.lastTeleportTime <= goblin.stats.teleportCooldown) return;
            const dist = Math.abs(goblin.distanceToPlayer());
            if (dist < 60 || dist > goblin.stats.aggroRange * 1.6) return;
            goblin.lastTeleportTime = time;
            goblin._teleportNearPlayer();
        },
    },
    shaman: {
        tick(goblin, time) {
            if (time - goblin.lastBuffCastTime <= goblin.stats.buffCooldown) return;
            goblin._buffNearbyAllies(time);
        },
    },
    bomber: {
        /** Substitui o ataque corpo-a-corpo inteiro por um projétil. */
        attackOverride(goblin) { goblin._throwBomb(); },
    },
};

class Goblin extends Enemy {
    constructor(scene, sprite, type, config) {
        super(scene, sprite, 'goblin_' + type, config);
        this.type = type;
        this.behavior = GOBLIN_BEHAVIORS[type] || null;

        this.lastAttackTime = 0;
        this.lastTeleportTime = 0;
        this.lastBuffCastTime = 0;
        this.nextAttackType = 'claw';
        this.buffMultiplier = 1;
        this.buffUntil = 0;
        this.patrolMinX = this.spawnX - 90;
        this.patrolMaxX = this.spawnX + 90;

        this.idleKey = config.idleKey;
        this.atk1Key = config.atk1Key;
        this.atk2Key = config.atk2Key;
        this.baseDisplayH = config.baseDisplayH;
        this.setGoblinTexture = config.setGoblinTexture; // a Scene sabe redimensionar pelo texture source; ver nota de integração
        this.isAttackingAnim = false;

        /** allGoblins() é usado só pelo shaman pra achar aliados por perto —
         *  injetado em vez de a classe conhecer a lista completa da Scene. */
        this.getAllGoblins = config.getAllGoblins;
        this.spawnProjectile = config.spawnProjectile; // (goblin, damage) => void — a bomba em si fica com a Scene, que já sabe de física de projétil
        this.spawnTeleportPuff = config.spawnTeleportPuff || (() => {}); // (x, y) => void — efeito cosmético, puramente visual
        this.spawnBuffFlare = config.spawnBuffFlare || (() => {});       // (x, y) => void — idem
    }

    updateMovement(time) {
        if (this.buffUntil && time > this.buffUntil) {
            this.buffUntil = 0;
            this.buffMultiplier = 1;
            this.sprite.clearTint();
        }
        if (this.behavior && this.behavior.tick) this.behavior.tick(this, time);

        const dx = this.distanceToPlayer();
        const absDist = Math.abs(dx);
        const effectiveSpeed = this.stats.speed * this.buffMultiplier;

        if (absDist <= this.stats.attackRange) {
            this.sprite.setVelocityX(0);
            this.sprite.flipX = dx > 0;
            if (time - this.lastAttackTime > this.stats.attackCooldown) {
                this._attack();
                this.lastAttackTime = time;
            }
        } else if (absDist <= this.stats.aggroRange) {
            this.direction = dx > 0 ? 1 : -1;
            this.sprite.setVelocityX(effectiveSpeed * 1.4 * this.direction);
            this.sprite.flipX = this.direction > 0;
        } else {
            if (this.sprite.x <= this.patrolMinX) this.direction = 1;
            else if (this.sprite.x >= this.patrolMaxX) this.direction = -1;
            this.sprite.setVelocityX(effectiveSpeed * this.direction);
            this.sprite.flipX = this.direction > 0;
        }
    }

    _attack() {
        this._playAttackAnim();
        if (this.behavior && this.behavior.attackOverride) {
            this.behavior.attackOverride(this);
            return;
        }
        const isClaw = this.nextAttackType === 'claw';
        this.nextAttackType = isClaw ? 'bite' : 'claw';
        const baseDamage = isClaw ? this.stats.dmgMax : this.stats.dmgMin;
        const damage = Math.round(baseDamage * this.buffMultiplier);
        if (Math.abs(this.distanceToPlayer()) > this.stats.attackRange + 15) return; // pode ter saído do alcance durante a anim
        this.dealDamageToPlayer(damage);
    }

    _throwBomb() {
        const damage = Math.round(Phaser.Math.Between(this.stats.dmgMin, this.stats.dmgMax) * this.buffMultiplier);
        this.spawnProjectile(this, damage);
    }

    _teleportNearPlayer() {
        this.spawnTeleportPuff(this.sprite.x, this.sprite.y - this.baseDisplayH * 0.5);
        this.scene.tweens.add({
            targets: this.sprite, alpha: 0, duration: 140,
            onComplete: () => {
                if (!this.sprite.active) return;
                const playerX = this.getPlayerPosition().x;
                const side = playerX > this.sprite.x ? -1 : 1;
                let newX = playerX + side * Phaser.Math.Between(45, 75);
                newX = Phaser.Math.Clamp(newX, this.spawnX - 260, this.spawnX + 260);
                this.sprite.x = newX;
                this.scene.tweens.add({ targets: this.sprite, alpha: 1, duration: 160 });
            },
        });
    }

    _buffNearbyAllies(time) {
        const allies = this.getAllGoblins().filter((g) =>
            g !== this && !g.dead && Math.abs(g.sprite.x - this.sprite.x) <= this.stats.buffRadius);
        if (allies.length === 0) return;
        this.lastBuffCastTime = time;
        allies.forEach((ally) => {
            ally.buffMultiplier = this.stats.buffMultiplier;
            ally.buffUntil = time + this.stats.buffDuration;
            ally.sprite.setTint(0xcf9dff);
        });
        this.scene.tweens.add({ targets: this.sprite, scaleX: this.sprite.scaleX * 1.08, scaleY: this.sprite.scaleY * 1.08, duration: 180, yoyo: true });
        this.spawnBuffFlare(this.sprite.x, this.sprite.y - this.baseDisplayH * 0.6);
    }

    _playAttackAnim() {
        if (!this.sprite.active || this.isAttackingAnim) return;
        this.isAttackingAnim = true;
        this.setGoblinTexture(this.sprite, this.atk1Key);
        this.scene.time.delayedCall(120, () => {
            if (!this.sprite.active) { this.isAttackingAnim = false; return; }
            this.setGoblinTexture(this.sprite, this.atk2Key);
            this.scene.time.delayedCall(140, () => {
                if (!this.sprite.active) { this.isAttackingAnim = false; return; }
                this.setGoblinTexture(this.sprite, this.idleKey);
                this.isAttackingAnim = false;
            });
        });
    }
}
