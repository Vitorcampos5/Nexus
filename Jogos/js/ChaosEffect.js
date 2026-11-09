/* =====================================================================
   ChaosEffect — animação + dano da magia "Eco do Caos" (PlayerMenu.SPELLS,
   id 'caos', tipo 'burst'), compartilhada por GameScene e CaveScene.

   O QUE É
   --------
   Uma onda de choque em ÁREA ao redor do jogador (os dois lados, ao
   contrário da Chama Pálida, que é um projétil numa direção só). Dura
   ~1s e é feita só de código (texturas geradas uma vez com Graphics, sem
   arquivo de imagem, sem corpo de física) — mesmo padrão de Fireball.js e
   HealEffect.js:

     1. "inspiração": núcleo escuro + brilho violeta se fecham no corpo
        (0,12s — dá peso ao disparo);
     2. a onda se abre no chão: anel em elipse (perspectiva) crescendo até
        o raio da magia, com rachaduras que acendem por onde ela passa;
     3. estilhaços de caos saem em arco em todas as direções;
     4. tremor curto de câmera.

   DANO: aplicado AQUI, conforme a onda passa — cada inimigo só leva o
   golpe quando o anel o alcança (e só uma vez), então o dano acompanha o
   que se vê, em vez de acontecer tudo no instante do disparo. Quem chama
   passa o mesmo queryOverlap (overlapRect filtrando enemyRef) que já é
   passado ao Fireball. Os inimigos atingidos também são empurrados pra
   fora (saem do alcance do jogador — a ideia da magia).

   O efeito fica ANCORADO onde foi conjurado (uma onda de choque não
   segue o jogador, ao contrário da cura). Tudo fica ACIMA do filtro de
   dia/noite (depth 1000 > 999): é luz, não pode sair escurecida pela noite.
   ===================================================================== */

class ChaosEffect {
    /**
     * @param {Phaser.Scene} scene
     * @param {object} cfg
     * @param {Phaser.GameObjects.Sprite} cfg.sprite  O jogador (só mede e ancora na hora do disparo).
     * @param {number} [cfg.radius=170]   Alcance da onda, em px de mundo.
     * @param {number} [cfg.damage=0]     Dano por inimigo atingido (passa por enemyRef.takeDamage).
     * @param {(rect:{x:number,y:number,width:number,height:number}) => Phaser.GameObjects.GameObject[]} [cfg.queryOverlap]
     *        Sem isso a magia é só visual.
     */
    constructor(scene, cfg) {
        this.scene = scene;
        this.radius = cfg.radius || 170;
        this.damage = cfg.damage || 0;
        this.queryOverlap = cfg.queryOverlap || null;
        this.t = 0;
        this.windup = 0.12;     // inspiração antes da onda
        this.waveTime = 0.45;   // tempo da onda até o raio máximo
        this.total = 1.0;
        this.alive = true;
        this.shards = [];
        this.hit = new Set();
        this.waveStarted = false;

        ChaosEffect.ensureTextures(scene);

        // Mede o corpo UMA vez (mesma ideia do HealEffect): pés/cabeça em relação ao sprite.
        const sprite = cfg.sprite;
        const box = (typeof Fireball !== 'undefined') ? Fireball.bodyBox(sprite) : null;
        const feetDY = box ? box.bottom : sprite.displayHeight * 0.45;
        const headDY = box ? box.top : -sprite.displayHeight * 0.5;
        this.bodyH = Math.max(40, feetDY - headDY);
        this.halfW = Math.max(14, box ? box.halfW : 20);
        this.px = sprite.x;
        this.feetY = sprite.y + feetDY + 2;
        this.midY = sprite.y + (feetDY + headDY) / 2;
        this.headY = sprite.y + headDY;

        const D = ChaosEffect.DEPTH;
        const add = (key) => scene.add.image(0, 0, key).setAlpha(0);
        this.void = add('chVoid').setDepth(D - 1).setPosition(this.px, this.midY);                        // NORMAL: escurece
        this.floor = add('chGlow').setBlendMode(Phaser.BlendModes.ADD).setDepth(D - 1).setPosition(this.px, this.feetY);
        this.cracks = add('chCrack').setBlendMode(Phaser.BlendModes.ADD).setDepth(D).setPosition(this.px, this.feetY);
        this.ring = add('chRing').setBlendMode(Phaser.BlendModes.ADD).setDepth(D + 1).setPosition(this.px, this.feetY);
        this.ring2 = add('chRing').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd9ff).setDepth(D + 1).setPosition(this.px, this.feetY);
        this.glow = add('chGlow').setBlendMode(Phaser.BlendModes.ADD).setDepth(D + 3).setPosition(this.px, this.midY);

        this._onUpdate = (time, delta) => this._tick(delta);
        scene.events.on('update', this._onUpdate);
        this._onShutdown = () => this._cleanup();
        scene.events.once('shutdown', this._onShutdown);
    }

    // ------------------------------------------------------------------
    /** Texturas (uma vez só — o cache de texturas é global entre cenas). */
    static ensureTextures(scene) {
        const mk = (key, w, h, draw) => {
            if (scene.textures.exists(key)) return;
            const g = scene.add.graphics(); draw(g); g.generateTexture(key, w, h); g.destroy();
        };
        // brilho radial violeta (aditivo)
        mk('chGlow', 64, 64, (g) => {
            for (let i = 0; i < 18; i++) {
                const f = i / 17, r = 32 * (1 - f * 0.94);
                g.fillStyle(0xc060ff, 0.035 + 0.17 * f * f);
                g.fillCircle(32, 32, r);
            }
        });
        // vazio escuro (NORMAL, não aditivo): é o que faz o ar "afundar" no disparo
        mk('chVoid', 64, 64, (g) => {
            for (let i = 0; i < 16; i++) {
                const f = i / 15, r = 32 * (1 - f * 0.9);
                g.fillStyle(0x12031f, 0.05 + 0.1 * f);
                g.fillCircle(32, 32, r);
            }
        });
        // anel em elipse (já achatado — círculo de chão em perspectiva) com cortes irregulares
        mk('chRing', 160, 48, (g) => {
            const cx = 80, cy = 24;
            for (const [w, h, a, lw] of [[150, 40, 0.16, 10], [150, 40, 0.3, 6], [150, 40, 1, 2.6], [132, 34, 0.45, 1.4]]) {
                g.lineStyle(lw, 0xd37bff, a); g.strokeEllipse(cx, cy, w, h);
            }
            g.lineStyle(1.6, 0xffd9ff, 0.85);
            for (let i = 0; i < 18; i++) {
                const a = (Math.PI * 2 * i) / 18, k = i % 2 ? 0.88 : 0.8;
                g.lineBetween(cx + Math.cos(a) * 75, cy + Math.sin(a) * 20, cx + Math.cos(a) * 75 * k, cy + Math.sin(a) * 20 * k);
            }
        });
        // rachaduras no chão, irradiando do centro (zigue-zague determinístico — mesma arte sempre)
        mk('chCrack', 128, 40, (g) => {
            const cx = 64, cy = 20; let seed = 7;
            const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
            for (let i = 0; i < 14; i++) {
                const a = (Math.PI * 2 * i) / 14 + (rnd() - 0.5) * 0.3;
                let x = cx, y = cy;
                for (let s = 0; s < 6; s++) {
                    const f = (s + 1) / 6;
                    const nx = cx + Math.cos(a) * 62 * f + (rnd() - 0.5) * 5;
                    const ny = cy + Math.sin(a) * 19 * f + (rnd() - 0.5) * 2.2;
                    g.lineStyle(3.4 - 2 * f, 0xff7ae8, 0.3 * (1 - f * 0.6)); g.lineBetween(x, y, nx, ny);
                    g.lineStyle(1, 0xffe6fb, 0.95 * (1 - f * 0.5)); g.lineBetween(x, y, nx, ny);
                    x = nx; y = ny;
                }
            }
        });
        // estilhaço afiado
        mk('chShard', 14, 16, (g) => {
            g.fillStyle(0xd37bff, 0.35); g.fillCircle(7, 8, 7);
            g.fillStyle(0xffffff, 1); g.fillTriangle(7, 0, 12, 10, 7, 15);
            g.fillStyle(0xe9b8ff, 1); g.fillTriangle(7, 0, 2, 10, 7, 15);
        });
    }

    // ------------------------------------------------------------------
    _tick(delta) {
        if (!this.alive) return;
        const dt = Math.min(delta, 50) / 1000;
        this.t += dt;
        const t = this.t, T = this.total, W = this.windup;
        const fade = t > T - 0.35 ? Math.max(0, (T - t) / 0.35) : 1;

        // 1) inspiração: núcleo e brilho se fecham no corpo
        if (t < W) {
            const k = t / W;
            const sz = (1.7 - 1.0 * k);
            this.void.setScale(this.halfW * 3.4 / 64 * sz, this.bodyH * 1.6 / 64 * sz).setAlpha(0.7 * k);
            this.glow.setScale(this.halfW * 3.0 / 64 * sz, this.bodyH * 1.3 / 64 * sz).setAlpha(0.55 * k);
        } else {
            // depois do disparo: clarão que estoura e some, vazio que se dissolve
            const k = Math.min(1, (t - W) / 0.3);
            this.glow.setScale(this.halfW * 3.0 / 64 * (1 + 2.2 * k), this.bodyH * 1.3 / 64 * (1 + 1.2 * k)).setAlpha(0.8 * (1 - k));
            this.void.setScale(this.halfW * 3.4 / 64 * (1 + 0.8 * k), this.bodyH * 1.6 / 64 * (1 + 0.5 * k))
                .setAlpha(0.7 * Math.max(0, 1 - (t - W) / 0.6));
        }

        // 2) a onda
        if (t >= W) {
            if (!this.waveStarted) { this.waveStarted = true; this._launchShards(); this.scene.cameras.main.shake(140, 0.0035); }
            const w = Math.min(1, (t - W) / this.waveTime);
            const e = 1 - Math.pow(1 - w, 3);
            const R = this.radius * e;
            const sx = Math.max(0.01, R * 2 / 150);
            this.ring.setScale(sx).setAlpha(0.95 * (1 - 0.5 * w) * fade);
            this.ring2.setScale(sx * 0.78).setAlpha(0.55 * (1 - w) * fade);
            this.cracks.setScale(Math.max(0.01, R * 2 / 124)).setAlpha(Math.min(1, w * 2.2) * 0.9 * fade);
            this.floor.setScale(Math.max(0.01, R * 2.1 / 64), Math.max(0.01, R * 2.1 * 0.27 / 64)).setAlpha(0.5 * (1 - 0.4 * w) * fade);
            this._applyDamage(R);
        }

        // 3) estilhaços
        for (let i = this.shards.length - 1; i >= 0; i--) {
            const s = this.shards[i];
            const k = (t - s.born) / s.life;
            if (k >= 1) { s.img.destroy(); this.shards.splice(i, 1); continue; }
            const ease = 1 - Math.pow(1 - k, 2);
            s.img.setPosition(
                this.px + Math.cos(s.a) * s.dist * ease,
                this.feetY + Math.sin(s.a) * s.dist * 0.2 * ease - Math.sin(Math.PI * Math.min(1, k * 1.15)) * s.arc,
            ).setRotation(s.rot0 + s.spin * k).setScale(s.size * (1 - 0.4 * k)).setAlpha((1 - k * k) * Math.min(1, k * 12));
        }

        if (t >= T) this._cleanup();
    }

    /** Dano conforme a onda passa: cada inimigo, uma vez, quando o anel o alcança. */
    _applyDamage(R) {
        if (!this.queryOverlap || this.damage <= 0 || R <= 0) return;
        const rect = { x: this.px - R, y: this.headY - 40, width: R * 2, height: (this.feetY - this.headY) + 60 };
        let targets;
        try { targets = this.queryOverlap(rect) || []; } catch (e) { return; }
        targets.forEach((go) => {
            if (!go || !go.active || !go.enemyRef || go.enemyRef.dead || this.hit.has(go)) return;
            if (Math.abs(go.x - this.px) > R + 8) return;   // o anel ainda não chegou nele
            this.hit.add(go);
            go.enemyRef.takeDamage(this.damage);
            if (!go.enemyRef.dead && go.body) {             // empurra pra fora (sai do alcance de quem conjurou)
                const dir = go.x >= this.px ? 1 : -1;
                go.body.setVelocityX(dir * 170);
                if (go.body.blocked.down || go.body.touching.down) go.body.setVelocityY(-130);
            }
        });
    }

    _launchShards() {
        const n = 22, tints = [0xffffff, 0xffd9ff, 0xd37bff, 0xff7ae8];
        for (let i = 0; i < n; i++) {
            const img = this.scene.add.image(this.px, this.feetY, 'chShard').setBlendMode(Phaser.BlendModes.ADD)
                .setAlpha(0).setDepth(ChaosEffect.DEPTH + 2);
            img.setTint(Phaser.Utils.Array.GetRandom(tints));
            this.shards.push({
                img, born: this.t,
                life: Phaser.Math.FloatBetween(0.5, 0.8),
                a: (Math.PI * 2 * i) / n + Phaser.Math.FloatBetween(-0.15, 0.15),
                dist: this.radius * Phaser.Math.FloatBetween(0.55, 1.05),
                arc: Phaser.Math.FloatBetween(18, 70),
                size: Phaser.Math.FloatBetween(0.6, 1.15),
                rot0: Phaser.Math.FloatBetween(0, Math.PI * 2),
                spin: Phaser.Math.FloatBetween(-6, 6),
            });
        }
    }

    _cleanup() {
        if (!this.alive) return;
        this.alive = false;
        this.scene.events.off('update', this._onUpdate);
        this.scene.events.off('shutdown', this._onShutdown);
        [this.void, this.floor, this.cracks, this.ring, this.ring2, this.glow, ...this.shards.map((s) => s.img)]
            .forEach((o) => { if (o && o.scene) o.destroy(); });
        this.shards = [];
    }
}

/** Profundidade do efeito: acima do filtro de dia/noite (999) da GameScene. */
ChaosEffect.DEPTH = 1000;
