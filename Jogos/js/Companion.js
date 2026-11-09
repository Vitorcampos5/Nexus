/* =====================================================================
   Companion — companheiro que segue o jogador e ajuda em combate,
   compartilhado por GameScene/CaveScene/VillageScene/LibraryScene.

   POR QUE ISSO EXISTE
   --------------------
   O lobo de cristal (ver createCrystalWolf()/breakCrystalWolf() na
   CaveScene) era decoração interativa. Esta classe é o que ele faz DEPOIS
   de libertado: seguir o jogador e ajudar em combate em QUALQUER cena. A
   sequência de quebra (crystalWolfCub0-3) continua só na CaveScene.

   Mesmo padrão de dependência injetada de Enemy.js/PlayerController.js/
   Scenery.js: a classe não conhece a Scene por dentro, só o que vem no
   config. Quem decide QUANDO criar um Companion (e persistir isso) é a
   Scene.

   MOVIMENTO: SEM CORPO DE FÍSICA — E PODE SOBREPOR O JOGADOR
   -----------------------------------------------------------
   O companion se posiciona direto (X persegue o jogador, Y fixo na linha
   de chão da cena). Não existe corpo de física nem colisão com o jogador:
   o lobo atravessa o jogador e pode ficar exatamente no mesmo lugar
   (inclusive é isso que acontece de vez em quando — a posição de descanso
   dele varia em volta do jogador, ver follow.restJitter). Limite
   conhecido: não sobe em plataformas elevadas; se o jogador some de tela,
   ele reaparece perto (teleporte), igual slime/goblin também não navegam
   plataforma.

   COMO ELE DECIDE SEGUIR (v2)
   ----------------------------
   - Alvo = ATRÁS do jogador, em relação pra onde o jogador anda (playerDir,
     deduzido do deslocamento em X do jogador, com histerese — parar não
     inverte a direção).
   - Histerese de movimento: só começa a andar quando a distância do alvo
     passa de follow.startDist e só para quando chega perto (stopDist) —
     sem tremedeira de anda-pára na borda.
   - Velocidade suave (aceleração) e proporcional à distância: perto anda
     devagar, longe corre (até maxSpeed, mais que o jogador, pra alcançar).
   - Vira SEMPRE pra onde está andando (nunca "pro jogador" enquanto anda
     de costas). Ao chegar, vira pra mesma direção que o jogador olha.
   - Só teleporta se estiver MUITO longe, ou longe E fora da tela — na
     tela ele corre pra alcançar em vez de sumir e aparecer.
   - Fica atrás do jogador na ordem de desenho (profundidade), então quando
     sobrepõe, o jogador continua visível por cima.
   - Configurações (menu do lobo, PlayerMenu.js): getSettings() devolve
     { companionStay, companionAssist }. Ficar = não segue nem persegue
     inimigo (só ataca o que estiver ao alcance); Ajudar desligado = nunca
     ataca.

   ANIMAÇÃO DE ANDAR: SPRITE, NÃO IMAGE
   -------------------------------------
   As poses livres (sit/lie/alert) são troca-de-textura; "andar" é uma
   animação de 5 quadros (Phaser só anima Sprite, por isso scene.add.sprite
   — herda tudo de Image). Os 5 quadros estão no MESMO canvas (342x247),
   simétrico em volta do centro do tronco, então UMA escala e origin 0.5
   servem pra animação inteira E o flipX não desloca o lobo (com um origin
   fora do centro, virar de lado o jogaria quase um corpo pro lado).

   ATENÇÃO — ESCALA AO ENTRAR NA ANIMAÇÃO: setDisplaySize() divide pelo
   width do quadro ATUAL (o da pose anterior). Se chamado antes de trocar
   pro quadro de andar, a escala sai calculada em cima de outro tamanho e o
   sprite aparece esticado/achatado — era o "tamanho muda fora da caverna"
   (na caverna o lobo quase só fica parado nas poses). Por isso
   _enterWalkAnim() troca a textura PRIMEIRO e usa setScale() com a razão
   exata.

   Os quadros de andar olham pra DIREITA nativamente; as poses sit/lie/alert
   são pré-espelhadas e olham pra ESQUERDA (setFlipX(true) = direita).
   _applyFlip() inverte o flip só no modo andando.

   this.scene.anims é GLOBAL (todas as Scenes) — a animação só é criada uma
   vez (anims.exists).
   ===================================================================== */

const COMPANION_STATS = Object.freeze({
    crystalWolf: {
        displayName: 'Lobo de Cristal',
        follow: {
            gap: 40,            // distância "atrás" do jogador onde ele descansa
            restJitter: 45,     // variação aleatória da posição de descanso (pode cair em cima do jogador)
            startDist: 75,      // só começa a andar quando o alvo está mais longe que isso
            stopDist: 10,       // e só para quando chega a menos que isso
            minSpeed: 1.5,      // px/frame (a 60fps) bem perto do alvo
            maxSpeed: 5.4,      // px/frame quando está longe (o jogador corre ~2.7)
            speedPerPx: 0.028,  // quanto a velocidade-alvo cresce por pixel de distância
            accel: 0.14,        // suavização da velocidade (0..1 por frame)
            catchUpDistance: 340, // longe E fora da tela -> teleporta
            hardTeleportDistance: 900, // longe demais mesmo na tela -> teleporta
        },
        attackRange: 60,
        attackDamage: 6,
        attackCooldown: 900,
        aggroRange: 190,      // raio ao redor do PRÓPRIO companion onde ele busca alvo
        leashFromPlayer: 260, // não persegue inimigo mais longe que isso do jogador
        poses: {
            sit: 'crystalWolfPoseSit',
            lie: 'crystalWolfPoseLie',
            alert: 'crystalWolfPoseAlert',
        },
        // Alturas calibradas pela largura do olho (íris) em cada arte — mesma
        // cabeça em todas as poses e na animação (olho ≈ 3,5px na tela).
        poseHeights: {
            crystalWolfPoseSit: 63,
            crystalWolfPoseAlert: 70,
            crystalWolfPoseLie: 41,
        },
        idlePoseCycle: ['crystalWolfPoseSit', 'crystalWolfPoseLie', 'crystalWolfPoseAlert'],
        walk: {
            animKey: 'crystalWolfWalk',
            frameKeys: ['crystalWolfWalk1', 'crystalWolfWalk2', 'crystalWolfWalk3', 'crystalWolfWalk4', 'crystalWolfWalk5'],
            frameRate: 8,
            displayHeight: 68, // altura do canvas inteiro (orelha→pata); olho ≈ 3,5px, igual às poses
        },
    },
});

class Companion {
    /**
     * @param {Phaser.Scene} scene
     * @param {object} config
     * @param {string} [config.type='crystalWolf']
     * @param {number} config.x   Posição X inicial.
     * @param {number} config.y   Linha de chão (groundY + 8). Só o X muda depois.
     * @param {() => {x:number,y:number}} config.getPlayerPosition
     * @param {(rect) => Phaser.GameObjects.GameObject[]} config.queryOverlap
     * @param {() => {companionStay?:boolean, companionAssist?:boolean}} [config.getSettings]
     * @param {() => Phaser.GameObjects.GameObject|null} [config.getPlayerSprite]  Pra ficar
     *        atrás do jogador na ordem de desenho (pode devolver null/undefined enquanto
     *        o jogador não existe — tenta de novo a cada frame até conseguir).
     */
    constructor(scene, config) {
        this.scene = scene;
        this.type = config.type || 'crystalWolf';
        this.stats = COMPANION_STATS[this.type];
        this.getPlayerPosition = config.getPlayerPosition;
        this.queryOverlap = config.queryOverlap || (() => []);
        this.getSettings = config.getSettings || (() => ({}));
        this.getPlayerSprite = config.getPlayerSprite || (() => null);

        this.groundY = config.y;
        this.facingRight = true; // lógico: pra onde o lobo olha (o flip real sai de _applyFlip)
        this.isWalking = false;

        const startKey = this.stats.poses.sit;
        const src = scene.textures.get(startKey).getSourceImage();
        const startH = this.stats.poseHeights[startKey] || 60;
        this.sprite = scene.add.sprite(config.x, this.groundY, startKey).setOrigin(0.5, 1);
        this.sprite.setScale(startH / src.height);
        this._applyFlip();

        this._registerWalkAnim(scene);

        // follow
        this.vx = 0;                 // velocidade suavizada (px/frame)
        this.moving = false;         // histerese anda/pára
        this.playerDir = 1;          // pra onde o jogador anda (+1 direita / -1 esquerda)
        this.lastPlayerX = null;
        this.playerMovingUntil = 0;  // até quando considerar o jogador "em movimento"
        this.restOffset = 0;
        this.nextRestPick = 0;
        this._depthDone = false;

        // combate
        this.target = null;
        this.lastAttackTime = 0;

        // poses/ocioso
        this.breathTween = null;
        this.idleCycleEvent = null;
        this.idlePoseIndex = 0;
        this.currentPoseKey = startKey;
        this._startBreathing();
        this._scheduleIdleCycle();
    }

    /** Chamado uma vez por frame pela Scene, igual PlayerController/Enemy. */
    update(time, delta) {
        if (!this.sprite || !this.sprite.active) return;
        const player = this.getPlayerPosition();
        const dtScale = (delta || 16.6667) / 16.6667;
        const settings = this.getSettings() || {};
        const stay = !!settings.companionStay;
        const assist = settings.companionAssist !== false;

        this._ensureDepth();
        this._trackPlayer(player, dtScale, time);

        // Muito longe: reaparece perto — mas na tela ele corre pra alcançar (ver _updateFollow).
        const f = this.stats.follow;
        const dist = Math.abs(player.x - this.sprite.x);
        if (!stay && (dist > f.hardTeleportDistance || (dist > f.catchUpDistance && this._isOffscreen()))) {
            this.teleportNear(player.x);
            return;
        }

        if (assist && this._updateCombat(time, dtScale, player, stay)) return;
        if (!assist) this.target = null;

        if (stay) { this._halt(); this._ensureIdlePose(); return; }
        this._updateFollow(time, dtScale, player);
    }

    // ------------------------------------------------------------------
    // Deduz pra onde o jogador anda pelo deslocamento em X (sem depender de
    // PlayerController). Parar NÃO inverte: mantém a última direção.
    _trackPlayer(player, dtScale, time) {
        if (this.lastPlayerX !== null) {
            const dx = player.x - this.lastPlayerX;
            if (Math.abs(dx) > 0.35 * dtScale) { this.playerDir = dx > 0 ? 1 : -1; this.playerMovingUntil = time + 250; }
        }
        this.lastPlayerX = player.x;
    }

    /** Coloca o lobo logo ATRÁS do jogador na ordem de desenho (e na mesma
     *  profundidade) — o jogador passa por cima quando se sobrepõem. */
    _ensureDepth() {
        if (this._depthDone) return;
        const ps = this.getPlayerSprite();
        if (!ps || !ps.active) return;
        this.sprite.setDepth(ps.depth);
        if (this.scene.children.moveBelow) this.scene.children.moveBelow(this.sprite, ps);
        this._depthDone = true;
    }

    _isOffscreen() {
        const v = this.scene.cameras.main.worldView;
        return this.sprite.x < v.x - 60 || this.sprite.x > v.right + 60;
    }

    // ------------------------------------------------------------------
    _updateCombat(time, dtScale, player, stay) {
        const s = this.stats;

        if (this.target && (!this.target.active || !this.target.enemyRef || this.target.enemyRef.dead
            || Math.abs(this.target.x - player.x) > s.leashFromPlayer)) {
            this.target = null;
        }

        if (!this.target) {
            const box = { x: this.sprite.x - s.aggroRange, y: this.sprite.y - 120, width: s.aggroRange * 2, height: 160 };
            const found = this.queryOverlap(box).filter((go) => go.active && go.enemyRef && !go.enemyRef.dead
                && Math.abs(go.x - player.x) <= s.leashFromPlayer
                && (!stay || Math.abs(go.x - this.sprite.x) <= s.attackRange));
            if (found.length) {
                found.sort((a, b) => Math.abs(a.x - this.sprite.x) - Math.abs(b.x - this.sprite.x));
                this.target = found[0];
            }
        }
        if (!this.target) return false;
        if (stay && Math.abs(this.target.x - this.sprite.x) > s.attackRange) { this.target = null; return false; }

        const dx = this.target.x - this.sprite.x;
        if (Math.abs(dx) <= s.attackRange) {
            this._halt();
            this._setFacing(dx >= 0);
            this._setPose(s.poses.alert); // parado de prontidão — evita o ciclo ocioso trocar de pose no meio do combate
            if (time - this.lastAttackTime > s.attackCooldown) {
                this.lastAttackTime = time;
                this.target.enemyRef.takeDamage(s.attackDamage);
                this._bumpAttack();
            }
        } else {
            this._moveToward(this.target.x, dtScale, 1.35, 0);
        }
        return true;
    }

    // ------------------------------------------------------------------
    _updateFollow(time, dtScale, player) {
        const f = this.stats.follow;

        // Posição de descanso: atrás do jogador, com uma variação sorteada de tempos em
        // tempos (pode cair bem em cima do jogador — sobrepor é permitido).
        if (time >= this.nextRestPick) {
            this.restOffset = Phaser.Math.Between(-f.restJitter, f.restJitter);
            this.nextRestPick = time + Phaser.Math.Between(4000, 9000);
        }
        // Enquanto o jogador anda, o lobo ACOMPANHA direto (limiar pequeno, sem a variação de
        // descanso) — senão ficava anda-pára-anda a cada ~0,5s. A "zona de conforto" grande
        // (startDist) só vale com o jogador parado.
        const playerMoving = time < this.playerMovingUntil;
        const targetX = player.x - this.playerDir * f.gap + (playerMoving ? 0 : this.restOffset);
        const dist = Math.abs(targetX - this.sprite.x);

        if (!this.moving && dist > (playerMoving ? 14 : f.startDist)) this.moving = true;
        if (this.moving && dist < f.stopDist) {
            this.moving = false;
            this._halt();
            this._setFacing(this.playerDir > 0); // chegou: olha pra mesma direção que o jogador
        }

        if (this.moving) this._moveToward(targetX, dtScale, 1, f.stopDist);
        else { this._halt(); this._ensureIdlePose(); }
    }

    /** Move em direção a targetX com velocidade suave/proporcional à distância e vira
     *  pra onde está INDO. speedMul>1 = perseguindo inimigo. */
    _moveToward(targetX, dtScale, speedMul, arriveDist) {
        const f = this.stats.follow;
        const diff = targetX - this.sprite.x;
        const dist = Math.abs(diff);
        const dir = diff >= 0 ? 1 : -1;
        const want = Math.min(f.maxSpeed * speedMul, (f.minSpeed + dist * f.speedPerPx) * speedMul);
        this.vx += (dir * want - this.vx) * Math.min(1, f.accel * dtScale * 2);
        let step = this.vx * dtScale;
        if (Math.abs(step) > dist) step = diff; // não passa do alvo
        this.sprite.x += step;
        if (Math.abs(this.vx) > 0.3) this._setFacing(this.vx > 0);
        this._enterWalkAnim();
        this.sprite.anims.timeScale = Phaser.Math.Clamp(Math.abs(this.vx) / 2.4, 0.6, 2.0);
    }

    _halt() { this.vx = 0; }

    /** Pulinho curto no lugar — feedback de "acertei o golpe". */
    _bumpAttack() {
        this.scene.tweens.add({
            targets: this.sprite, y: this.groundY - 10, duration: 90, yoyo: true, ease: 'Quad.easeOut',
            onComplete: () => { if (this.sprite && this.sprite.active) this.sprite.y = this.groundY; },
        });
    }

    _setFacing(right) {
        if (this.facingRight === right) return;
        this.facingRight = right;
        this._applyFlip();
    }

    /** Poses livres: pré-espelhadas olhando pra ESQUERDA (flipX = direita). Quadros de
     *  andar: olham pra DIREITA nativamente (flip inverso). Chamado sempre que
     *  facingRight OU isWalking mudam. */
    _applyFlip() {
        this.sprite.setFlipX(this.isWalking ? !this.facingRight : this.facingRight);
    }

    _setPose(key) {
        if (this.isWalking) this._exitWalkAnim();
        if (this.currentPoseKey === key) return;
        this._stopIdleCycle();
        this._applyPose(key);
    }

    _ensureIdlePose() {
        if (this.isWalking) this._exitWalkAnim();
        if (this.idleCycleEvent) return; // já ocioso, ciclo já rodando
        this.idlePoseIndex = 0;
        this._applyPose(this.stats.idlePoseCycle[0]);
        this._scheduleIdleCycle();
    }

    _applyPose(key) {
        this.currentPoseKey = key;
        // setTexture ANTES de calcular a escala (ver nota de topo sobre setDisplaySize).
        this.sprite.setTexture(key);
        const src = this.scene.textures.get(key).getSourceImage();
        const h = this.stats.poseHeights[key] || this.sprite.displayHeight;
        this.sprite.setScale(h / src.height);
        this._startBreathing();
    }

    _registerWalkAnim(scene) {
        const w = this.stats.walk;
        if (scene.anims.exists(w.animKey)) return;
        scene.anims.create({
            key: w.animKey,
            frames: w.frameKeys.map((key) => ({ key })),
            frameRate: w.frameRate,
            repeat: -1,
        });
    }

    _enterWalkAnim() {
        this._stopIdleCycle();
        if (this.isWalking) return; // já animando — não reinicia o ciclo a cada frame
        this.isWalking = true;
        this.currentPoseKey = null;
        if (this.breathTween) { this.breathTween.stop(); this.breathTween = null; }
        const w = this.stats.walk;
        // Troca pro quadro de andar ANTES de definir a escala (ver nota de topo).
        this.sprite.setTexture(w.frameKeys[0]);
        const src = this.scene.textures.get(w.frameKeys[0]).getSourceImage();
        this.sprite.setOrigin(0.5, 1).setScale(w.displayHeight / src.height);
        this._applyFlip();
        this.sprite.play(w.animKey);
    }

    _exitWalkAnim() {
        this.isWalking = false;
        this.sprite.anims.timeScale = 1;
        this.sprite.stop();
        this.sprite.setOrigin(0.5, 1);
        this._applyFlip();
    }

    /** Respiração RELATIVA (±2,5% da escala atual) — antes era um '+=0.03' absoluto, que
     *  numa pose com escala 0.19 era um pulso de ~15% e numa de 0.27 de ~11%. */
    _startBreathing() {
        if (this.breathTween) this.breathTween.stop();
        const sx = this.sprite.scaleX, sy = this.sprite.scaleY;
        this.breathTween = this.scene.tweens.add({
            targets: this.sprite, scaleX: sx * 1.025, scaleY: sy * 1.025,
            duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
    }

    _scheduleIdleCycle() {
        this.idleCycleEvent = this.scene.time.delayedCall(Phaser.Math.Between(3500, 6000), () => {
            this.idlePoseIndex = (this.idlePoseIndex + 1) % this.stats.idlePoseCycle.length;
            this._applyPose(this.stats.idlePoseCycle[this.idlePoseIndex]);
            this._scheduleIdleCycle();
        });
    }

    _stopIdleCycle() {
        if (this.idleCycleEvent) { this.idleCycleEvent.remove(); this.idleCycleEvent = null; }
    }

    /** Reposiciona sem tween, logo atrás do jogador. */
    teleportNear(playerX) {
        this.target = null;
        this.moving = false;
        this.vx = 0;
        this.sprite.x = playerX - this.playerDir * this.stats.follow.gap;
    }

    destroy() {
        this._stopIdleCycle();
        if (this.breathTween) this.breathTween.stop();
        if (this.sprite) this.sprite.destroy();
    }
}
