/* =====================================================================
   HealEffect — animação da magia de cura "Sopro Vital" (PlayerMenu.SPELLS,
   id 'sopro'), compartilhada por GameScene e CaveScene.

   POR QUE ISSO EXISTE
   --------------------
   A cura era um único flash verde estático (spawnSpellVFX). Agora é uma
   sequência de ~1,7s que ACOMPANHA o jogador (ele pode andar/pular durante):

     1. luz no chão + círculo de runas (elipse em perspectiva) que acende,
        com runas orbitando;
     2. coluna de luz larga que sobe dos pés até acima da cabeça, com um
        feixe mais fino e forte por dentro;
     3. espiral de brilhos em forma de estrela subindo em volta do corpo;
     4. pulso de luz no corpo + clarão inicial + anel que se expande;
     5. "+N" verde subindo da cabeça (N = quanto curou DE VERDADE, já
        limitado pelo HP máximo — 0 não mostra número).

   Tudo é código (texturas geradas uma vez com Graphics, sem arquivo de
   imagem). Sem corpo de física. As medidas (pés, cabeça, largura) vêm de
   Fireball.bodyBox() — a caixa opaca do quadro atual do jogador — medidas
   UMA vez no disparo, então o efeito não "treme" com o ciclo de andar.

   CAMADAS: tudo fica ACIMA do filtro de dia/noite (DayNightCycle, depth 999
   na GameScene): é luz, não pode sair escurecida pela noite. Em troca, não
   dá pra deixar parte do efeito "atrás" do personagem — a profundidade das
   runas é sugerida só por tamanho/brilho (as de trás menores e mais fracas).
   A intensidade da coluna/brilho foi calibrada pra o personagem continuar
   legível por baixo (a 1ª versão, mais forte, deixava ele desbotado).

   Escala geral do efeito: HealEffect.SIZE (1 = tamanho natural do personagem).
   ===================================================================== */

class HealEffect {
    /**
     * @param {Phaser.Scene} scene
     * @param {object} cfg
     * @param {Phaser.GameObjects.Sprite} cfg.sprite  O jogador (o efeito o segue).
     * @param {number} [cfg.amount=0]  Quanto de HP foi curado (texto flutuante; 0 = sem texto).
     */
    constructor(scene, cfg) {
        this.scene = scene;
        this.sprite = cfg.sprite;
        this.amount = cfg.amount || 0;
        this.t = 0;
        this.total = 1.7;
        this.alive = true;
        this.motes = [];
        this.runes = [];
        this.spawnAcc = 0;
        this.pulseDone = false;

        HealEffect.ensureTextures(scene);

        const box = (typeof Fireball !== 'undefined') ? Fireball.bodyBox(this.sprite) : null;
        // deslocamentos fixos em relação ao sprite (medidos uma vez)
        this.feetDY = box ? box.bottom : this.sprite.displayHeight * 0.45;
        this.headDY = box ? box.top : -this.sprite.displayHeight * 0.5;
        this.bodyH = Math.max(40, this.feetDY - this.headDY);
        this.halfW = Math.max(14, box ? box.halfW : 20);
        this.ringRx = Math.max(30, this.halfW + 20) * HealEffect.SIZE;
        this.ringRy = this.ringRx * 0.27;

        const D = HealEffect.DEPTH;
        this.layerBehind = D; this.layerFront = D + 3;

        // --- luz no chão, anel e anel interno
        this.floor = scene.add.image(0, 0, 'hlGlow').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(D - 1);
        this.ring = scene.add.image(0, 0, 'hlRing').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(D);
        this.ring2 = scene.add.image(0, 0, 'hlRing').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setTint(0xc8ffd8).setDepth(D);

        // --- runas orbitando a elipse
        const n = 8;
        for (let i = 0; i < n; i++) {
            const img = scene.add.image(0, 0, 'hlRune').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(D + 1);
            this.runes.push({ img, a: (Math.PI * 2 * i) / n });
        }

        // --- coluna de luz larga (envolve o corpo), feixe fino por dentro, brilho do corpo e clarão
        this.beam = scene.add.image(0, 0, 'hlBeam').setOrigin(0.5, 1).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(D);
        this.shaft = scene.add.image(0, 0, 'hlBeam').setOrigin(0.5, 1).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setTint(0xeafff2).setDepth(D + 1);
        this.glow = scene.add.image(0, 0, 'hlGlow').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(this.layerFront);
        this.flash = scene.add.image(0, 0, 'hlGlow').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setTint(0xffffff).setDepth(this.layerFront);

        // --- número flutuante
        this.text = null;
        if (this.amount > 0) {
            this.text = scene.add.text(0, 0, `+${this.amount}`, {
                fontFamily: 'Georgia, serif', fontSize: '17px', fontStyle: 'bold',
                color: '#c8ffd8', stroke: '#0b3a1c', strokeThickness: 4,
            }).setOrigin(0.5).setAlpha(0).setDepth(this.layerFront + 2);
        }

        this._place();
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
        // brilho radial suave (branco-esverdeado)
        mk('hlGlow', 64, 64, (g) => {
            for (let i = 0; i < 18; i++) {
                const f = i / 17, r = 32 * (1 - f * 0.94);
                g.fillStyle(0x7dffb0, 0.035 + 0.16 * f * f);
                g.fillCircle(32, 32, r);
            }
        });
        // anel em elipse com brilho (a elipse JÁ vem achatada — o círculo de chão em perspectiva)
        mk('hlRing', 160, 48, (g) => {
            const cx = 80, cy = 24;
            for (const [w, h, a, lw] of [[150, 40, 0.16, 10], [150, 40, 0.28, 6], [150, 40, 1, 2.4], [128, 33, 0.5, 1.4], [104, 26, 0.28, 1.2]]) {
                g.lineStyle(lw, 0x9dffc4, a); g.strokeEllipse(cx, cy, w, h);
            }
            // marcas (cortes) ao longo da elipse maior
            g.lineStyle(1.6, 0xeafff2, 0.85);
            for (let i = 0; i < 24; i++) {
                const a = (Math.PI * 2 * i) / 24;
                g.lineBetween(cx + Math.cos(a) * 75, cy + Math.sin(a) * 20, cx + Math.cos(a) * 66, cy + Math.sin(a) * 17.6);
            }
        });
        // coluna de luz: vertical, forte embaixo, some em cima; borda lateral suave
        mk('hlBeam', 64, 160, (g) => {
            for (let x = 0; x < 64; x++) {
                const gx = Math.exp(-Math.pow((x - 31.5) / 15, 2));
                for (let y = 0; y < 160; y += 2) {
                    const v = Math.pow(y / 160, 1.5);
                    g.fillStyle(0x8dffbc, gx * (0.04 + 0.5 * v));
                    g.fillRect(x, y, 1, 2);
                }
            }
            g.fillStyle(0xeafff2, 0.18);       // fios de luz dentro da coluna
            for (const x of [24, 31, 38]) g.fillRect(x, 20, 1, 140);
        });
        // brilho em estrela de 4 pontas
        mk('hlMote', 20, 20, (g) => {
            g.fillStyle(0x9dffc4, 0.28); g.fillCircle(10, 10, 9.5);
            g.fillStyle(0xb8ffd3, 0.5); g.fillCircle(10, 10, 5.5);
            g.fillStyle(0xeafff2, 1);
            g.fillRect(9, 0.5, 2, 19); g.fillRect(0.5, 9, 19, 2);   // cruz
            g.fillStyle(0xffffff, 1); g.fillCircle(10, 10, 3);
        });
        // runa: losango vazado com ponto
        mk('hlRune', 16, 16, (g) => {
            g.lineStyle(1.6, 0xeafff2, 0.95);
            g.strokeTriangle(8, 1, 14, 8, 8, 15); g.strokeTriangle(8, 1, 2, 8, 8, 15);
            g.fillStyle(0xffffff, 1); g.fillCircle(8, 8, 1.8);
        });
    }

    /** Posiciona tudo em relação ao jogador (chamado todo frame — o efeito o acompanha). */
    _place() {
        const px = this.sprite.x, py = this.sprite.y;
        const feetY = py + this.feetDY, midY = py + (this.feetDY + this.headDY) / 2, headY = py + this.headDY;
        this.px = px; this.feetY = feetY; this.midY = midY; this.headY = headY;
        this.floor.setPosition(px, feetY + 2);
        this.ring.setPosition(px, feetY + 2);
        this.ring2.setPosition(px, feetY + 2);
        this.beam.setPosition(px, feetY + 2);
        this.shaft.setPosition(px, feetY + 2);
        this.glow.setPosition(px, midY);
        this.flash.setPosition(px, midY);
    }

    // ------------------------------------------------------------------
    _tick(delta) {
        if (!this.alive) return;
        const dt = Math.min(delta, 50) / 1000;
        this.t += dt;
        const t = this.t, T = this.total, S = HealEffect.SIZE;
        this._place();

        // envelopes (0..1): entra em 0.25s, sustenta, sai nos últimos 0.5s
        const fadeIn = Math.min(1, t / 0.25);
        const fadeOut = t > T - 0.5 ? Math.max(0, (T - t) / 0.5) : 1;
        const env = fadeIn * fadeOut;

        // anéis: crescem de 55% a 100% e "respiram"
        const grow = 0.55 + 0.45 * Math.min(1, t / 0.3);
        const breathe = 1 + 0.04 * Math.sin(t * 9);
        this.ring.setScale(this.ringRx * 2 / 160 * grow * breathe, this.ringRy * 2 / 48 * grow * breathe).setAlpha(0.95 * env);
        this.ring2.setScale(this.ringRx * 2 / 160 * grow * 0.72, this.ringRy * 2 / 48 * grow * 0.72).setAlpha(0.55 * env);

        // luz no chão
        const fl2 = Math.min(1, t / 0.2);
        this.floor.setScale(this.ringRx * 2.5 / 64 * fl2, this.ringRy * 2.7 / 64 * fl2).setAlpha(0.55 * env);

        // runas orbitando (as de trás: menores e mais fracas — sugere profundidade)
        const spin = t * 1.9;
        this.runes.forEach((r) => {
            const a = r.a + spin;
            const x = this.px + Math.cos(a) * this.ringRx * grow * 0.93;
            const y = this.feetY + 2 + Math.sin(a) * this.ringRy * grow * 0.93;
            const back = Math.sin(a) < 0;
            const depthK = 0.78 + 0.22 * Math.sin(a);
            r.img.setPosition(x, y).setScale(0.95 * S * depthK).setRotation(-spin * 0.6)
                .setAlpha((back ? 0.5 : 1) * env * Math.min(1, t / 0.15));
        });

        // coluna de luz: sobe rápido, depois pulsa suave. Largura a meia altura da textura ≈ 35px:
        // coluna ≈ 1,9x a largura do corpo, feixe interno ≈ 0,8x.
        const rise = Math.min(1, t / 0.28);
        const colH = (this.bodyH + 26) * S * (0.35 + 0.65 * rise);
        const wob = 0.92 + 0.08 * Math.sin(t * 7);
        this.beam.setScale((this.halfW * 2 * 1.9 / 35) * wob, colH / 160)
            .setAlpha((0.42 + 0.1 * Math.sin(t * 11)) * env);
        this.shaft.setScale((this.halfW * 2 * 0.8 / 35) * wob, colH * 1.04 / 160)
            .setAlpha((0.2 + 0.08 * Math.sin(t * 13 + 1)) * env);

        // brilho no corpo (pulsa) + clarão branco curtíssimo no início
        const pulse = 0.5 + 0.5 * Math.sin(t * 8 - 1.2);
        this.glow.setScale((this.halfW * 3.0 / 64) * (0.9 + 0.12 * pulse), (this.bodyH * 1.35 / 64))
            .setAlpha(Math.max(0, 0.12 + 0.12 * pulse) * env);
        const fl = Math.max(0, 1 - t / 0.22);
        this.flash.setScale((this.halfW * 3.4 / 64), (this.bodyH * 1.5 / 64)).setAlpha(0.4 * fl);

        // anel que se expande (uma vez, em ~0.2s)
        if (!this.pulseDone && t >= 0.2) { this.pulseDone = true; this._expandingRing(); }

        // brilhos em espiral subindo (nascem no primeiro ~1s)
        if (t < 1.0) {
            this.spawnAcc += dt * 40;
            while (this.spawnAcc >= 1) { this.spawnAcc -= 1; this._spawnMote(); }
        }
        for (let i = this.motes.length - 1; i >= 0; i--) {
            const m = this.motes[i];
            const k = (t - m.born) / m.life;
            if (k >= 1) { m.img.destroy(); this.motes.splice(i, 1); continue; }
            const ang = m.phase + m.omega * (t - m.born);
            const rr = m.r * (0.85 + 0.15 * Math.sin(k * 6 + m.phase));
            const x = this.px + Math.cos(ang) * rr;
            const y = this.feetY - m.rise * k * S + Math.sin(ang) * rr * 0.22;
            const tw = 0.75 + 0.25 * Math.sin((t - m.born) * m.tw);
            m.img.setPosition(x, y).setScale(m.size * S * tw * (1 - 0.35 * k))
                .setAlpha(Math.min(1, k * 7) * (1 - Math.pow(k, 2.2)) * env)
                .setRotation(ang * 0.4);
        }

        // "+N": surge ~0.1s depois, sobe ~36px acima da cabeça e some
        if (this.text) {
            const k = Math.min(1, Math.max(0, (t - 0.1) / 1.2));
            this.text.setPosition(this.px, this.headY - 10 - 36 * (1 - Math.pow(1 - k, 2)))
                .setAlpha(Math.min(1, k * 8) * (k > 0.7 ? Math.max(0, 1 - (k - 0.7) / 0.3) : 1))
                .setScale(0.8 + 0.3 * Math.min(1, k * 5));
        }

        if (t >= T) this._cleanup();
    }

    _spawnMote() {
        const img = this.scene.add.image(this.px, this.feetY, 'hlMote').setBlendMode(Phaser.BlendModes.ADD)
            .setAlpha(0).setDepth(this.layerFront + 1);
        img.setTint(Phaser.Utils.Array.GetRandom([0xffffff, 0xc8ffd8, 0x9dffc4, 0x7dffb0]));
        this.motes.push({
            img, born: this.t,
            life: Phaser.Math.FloatBetween(0.75, 1.15),
            phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
            omega: Phaser.Math.FloatBetween(3.4, 5.2) * (Math.random() < 0.5 ? 1 : -1),
            r: Phaser.Math.FloatBetween(this.halfW * 0.55, this.halfW + 14),
            rise: Phaser.Math.FloatBetween(this.bodyH * 0.8, this.bodyH * 1.25),
            size: Phaser.Math.FloatBetween(0.4, 0.8),
            tw: Phaser.Math.FloatBetween(14, 26),
        });
    }

    _expandingRing() {
        const r = this.scene.add.image(this.px, this.feetY + 2, 'hlRing').setBlendMode(Phaser.BlendModes.ADD)
            .setScale(this.ringRx * 2 / 160 * 0.6, this.ringRy * 2 / 48 * 0.6).setAlpha(0.9).setTint(0xeafff2)
            .setDepth(HealEffect.DEPTH);
        this.scene.tweens.add({
            targets: r, scaleX: this.ringRx * 2 / 160 * 1.9, scaleY: this.ringRy * 2 / 48 * 1.9, alpha: 0,
            duration: 520, ease: 'Cubic.easeOut', onComplete: () => r.destroy(),
        });
    }

    _cleanup() {
        if (!this.alive) return;
        this.alive = false;
        this.scene.events.off('update', this._onUpdate);
        this.scene.events.off('shutdown', this._onShutdown);
        const all = [this.floor, this.ring, this.ring2, this.beam, this.shaft, this.glow, this.flash, this.text,
            ...this.runes.map((r) => r.img), ...this.motes.map((m) => m.img)];
        all.forEach((o) => { if (o && o.scene) o.destroy(); });
        this.motes = [];
    }
}

/** Escala geral do efeito em relação ao tamanho do personagem (1 = natural). */
HealEffect.SIZE = 1;
/** Profundidade do efeito: acima do filtro de dia/noite (999) da GameScene. */
HealEffect.DEPTH = 1000;
