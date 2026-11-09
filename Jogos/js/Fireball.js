/* =====================================================================
   Fireball — projétil da magia "Chama Pálida" (PlayerMenu.SPELLS, id
   'chama'), compartilhado por GameScene e CaveScene.

   POR QUE ISSO EXISTE
   --------------------
   A magia era um golpe instantâneo de 100px na frente do jogador (um
   overlapRect + um flash). Agora é um projétil de verdade: sai da mão do
   jogador, VIAJA uma boa distância (spell.range — 560px), deixa rastro de
   brasas, explode ao tocar num inimigo (dano + estilhaço em volta) e, se
   não acertar nada, se dissipa ao chegar no fim do alcance.

   Mesmo padrão de dependência injetada de Companion.js/Enemy.js: não
   conhece a Scene por dentro, só o que vem no config. Tudo é desenhado por
   código (texturas geradas uma vez via Graphics, sem arquivo de imagem).

   SEM CORPO DE FÍSICA: o projétil se move direto em X e consulta inimigos
   pelo mesmo queryOverlap (overlapRect filtrando enemyRef) que o
   PlayerController e o Companion já usam. A consulta cobre o TRECHO
   percorrido no frame (não só a posição atual), então a 460px/s ele não
   "atravessa" um inimigo fino entre dois frames.
   ===================================================================== */

class Fireball {
    /**
     * @param {Phaser.Scene} scene
     * @param {object} cfg
     * @param {number} cfg.x  Ponto de saída (mão do jogador).
     * @param {number} cfg.y
     * @param {1|-1} cfg.direction
     * @param {number} cfg.damage       Dano no alvo atingido.
     * @param {number} cfg.range        Distância máxima percorrida (px).
     * @param {number} [cfg.speed=460]  px/s.
     * @param {(rect:{x:number,y:number,width:number,height:number}) => Phaser.GameObjects.GameObject[]} cfg.queryOverlap
     */
    constructor(scene, cfg) {
        this.scene = scene;
        this.dir = cfg.direction >= 0 ? 1 : -1;
        this.damage = cfg.damage;
        this.range = cfg.range;
        this.speed = cfg.speed || 460;
        this.queryOverlap = cfg.queryOverlap;
        this.hitBelow = cfg.hitBelow !== undefined ? cfg.hitBelow : 60;
        this.originX = cfg.x;
        this.x = cfg.x;
        this.y = cfg.y;
        this.alive = true;
        this.t = 0;

        Fireball.ensureTextures(scene);
        const S = Fireball.SIZE;
        this.S = S;

        // brilho suave por trás de tudo, cauda em cometa, núcleo e miolo branco
        this.glow = scene.add.image(this.x, this.y, 'fbCore').setScale(1.9 * S).setAlpha(0.28)
            .setBlendMode(Phaser.BlendModes.ADD).setDepth(14).setTint(0xff7a1a);
        this.tail = scene.add.image(this.x, this.y, 'fbTail').setOrigin(1, 0.5)
            .setFlipX(this.dir < 0).setBlendMode(Phaser.BlendModes.ADD).setDepth(15);
        this.core = scene.add.image(this.x, this.y, 'fbCore').setScale(0.75 * S)
            .setBlendMode(Phaser.BlendModes.ADD).setDepth(16);
        this.heart = scene.add.image(this.x, this.y, 'fbCore').setScale(0.34 * S).setTint(0xfff2c2)
            .setBlendMode(Phaser.BlendModes.ADD).setDepth(17);
        // origin (1,0.5) = cabeça da cauda; com flip, a cabeça fica do lado oposto
        if (this.dir < 0) this.tail.setOrigin(0, 0.5);

        // clarão de saída
        this._flash(this.x, this.y, 0xffd27a, 0.9 * S, 150);

        this._onUpdate = (time, delta) => this._tick(delta);
        scene.events.on('update', this._onUpdate);
        this._onShutdown = () => this._cleanup();
        scene.events.once('shutdown', this._onShutdown);
    }

    /**
     * Ponto de saída da bola: a ALTURA DO BRAÇO do personagem, medida na arte do quadro que
     * está na tela (não um número fixo — o sprite troca de textura/escala e tem margens
     * transparentes diferentes por quadro). Mede a caixa opaca da textura atual (uma vez por
     * textura, em cache) e usa ~46% da altura do personagem a partir do topo: é onde o punho
     * fica no quadro de soco (rbSoco2) — altura do peito, com o braço esticado pra frente.
     * Se o navegador não deixar ler os pixels (textura remota 'player' sem CORS), cai pra uma
     * estimativa: personagem ocupando o quadro todo menos ~7% de margem embaixo.
     * @returns {{x:number, y:number}}
     */
    static handPosition(sprite, direction) {
        const dir = direction >= 0 ? 1 : -1;
        const bx = Fireball.bodyBox(sprite);
        return { x: sprite.x + dir * (Math.min(Math.max(bx.halfW, 12), 28) + 3), y: sprite.y + bx.top + 0.46 * (bx.bottom - bx.top) };
    }

    /**
     * Caixa opaca do quadro atual do sprite, em px de MUNDO relativos ao centro/origem do sprite:
     * { top, bottom, halfW } com top/bottom como deslocamento em Y (negativo = acima de sprite.y).
     * Compartilhada com HealEffect.js (pés/cabeça do personagem). A leitura dos pixels é feita
     * uma vez por textura (cache); se o navegador bloquear (textura remota sem CORS), usa uma
     * estimativa: personagem ocupando o quadro todo menos ~7% de margem embaixo.
     */
    static bodyBox(sprite) {
        const src = sprite.texture.getSourceImage();
        const w = sprite.frame.realWidth, h = sprite.frame.realHeight;
        const key = sprite.texture.key + '|' + sprite.frame.name;
        let b = Fireball._bbox[key];
        if (!b) {
            try {
                const cv = document.createElement('canvas');
                cv.width = w; cv.height = h;
                const ctx = cv.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(src, 0, 0, w, h);
                const d = ctx.getImageData(0, 0, w, h).data;
                let top = h, bottom = -1, left = w, right = -1;
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        if (d[(y * w + x) * 4 + 3] > 40) {
                            if (y < top) top = y; if (y > bottom) bottom = y;
                            if (x < left) left = x; if (x > right) right = x;
                        }
                    }
                }
                b = bottom >= 0 ? { top, bottom, left, right } : null;
            } catch (e) { b = null; }
            if (!b) b = { top: 0, bottom: h * 0.93, left: w * 0.2, right: w * 0.8 };
            Fireball._bbox[key] = b;
        }
        const sy = sprite.scaleY, sx = Math.abs(sprite.scaleX);
        return {
            top: (b.top - h * sprite.originY) * sy,
            bottom: (b.bottom - h * sprite.originY) * sy,
            halfW: ((b.right - b.left) / 2) * sx,
        };
    }

    /** Gera (uma vez só — o cache de texturas é global entre cenas) as 3 texturas do efeito. */
    static ensureTextures(scene) {
        if (!scene.textures.exists('fbCore')) {
            const g = scene.add.graphics();
            // círculo em camadas concêntricas: borda laranja translúcida -> miolo quase branco
            const layers = 16, R = 32;
            for (let i = 0; i < layers; i++) {
                const f = i / (layers - 1);                      // 0 = borda, 1 = centro
                const r = R * (1 - f * 0.92);
                const rr = Math.round(255);
                const gg = Math.round(90 + 165 * f);
                const bb = Math.round(20 + 150 * f * f);
                g.fillStyle((rr << 16) | (gg << 8) | bb, 0.06 + 0.5 * f);
                g.fillCircle(R, R, r);
            }
            g.generateTexture('fbCore', R * 2, R * 2);
            g.destroy();
        }
        if (!scene.textures.exists('fbTail')) {
            const g = scene.add.graphics();
            const W = 150, H = 44, cols = 150;   // faixas de 1px SEM sobreposição (a de 2px+1 dobrava o alpha nas bordas e dava listras)
            // cauda afilada: larga e clara na cabeça (direita), fina e vermelha-escura na ponta (esquerda)
            for (let i = 0; i < cols; i++) {
                const f = i / (cols - 1);                        // 0 = ponta, 1 = cabeça
                const h = 4 + (H - 4) * Math.pow(f, 1.35);
                const gg = Math.round(40 + 170 * f), bb = Math.round(10 + 90 * f * f);
                g.fillStyle((255 << 16) | (gg << 8) | bb, 0.08 + 0.55 * Math.pow(f, 1.6));
                g.fillRect(i * (W / cols), (H - h) / 2, W / cols, h);
            }
            g.generateTexture('fbTail', W, H);
            g.destroy();
        }
        if (!scene.textures.exists('fbEmber')) {
            const g = scene.add.graphics();
            g.fillStyle(0xff9a3b, 0.35); g.fillCircle(8, 8, 8);
            g.fillStyle(0xffd27a, 0.8);  g.fillCircle(8, 8, 4.5);
            g.fillStyle(0xfff6d8, 1);    g.fillCircle(8, 8, 2);
            g.generateTexture('fbEmber', 16, 16);
            g.destroy();
        }
    }

    // ------------------------------------------------------------------
    _tick(delta) {
        if (!this.alive) return;
        const dt = Math.min(delta, 50) / 1000;                   // trava frame longo (aba em 2º plano)
        this.t += dt;
        const prevX = this.x;
        this.x += this.dir * this.speed * dt;

        // chama "respira": pulsa e gira de leve
        const pulse = 1 + 0.12 * Math.sin(this.t * 38);
        const S = this.S;
        this.core.setPosition(this.x, this.y).setScale(0.75 * S * pulse).setRotation(this.t * 9);
        this.heart.setPosition(this.x, this.y).setScale(0.34 * S * (2 - pulse));
        this.glow.setPosition(this.x, this.y).setScale(1.9 * S * (0.94 + 0.06 * pulse));
        // A cauda cresce nos primeiros ~110px de voo: saindo da mão ela ainda não existe, senão
        // ficava um risco brilhante atravessando o corpo do personagem no instante do disparo.
        const grow = 0.15 + 0.85 * Math.min(1, Math.abs(this.x - this.originX) / 110);
        this.tail.setPosition(this.x - this.dir * 6 * S, this.y)
            .setScale(S * grow * (1 + 0.06 * Math.sin(this.t * 31)), S * (0.9 + 0.12 * pulse));

        this._emitEmbers();

        // colisão: varre o trecho percorrido neste frame
        // Faixa vertical da altura da bola até o chão do jogador: a bola voa na altura do
        // peito, mas o dano continua valendo pra inimigo baixo (slime) no caminho dela.
        const left = Math.min(prevX, this.x) - 10, width = Math.abs(this.x - prevX) + 20;
        const hits = this.queryOverlap({ x: left, y: this.y - 24, width, height: 24 + this.hitBelow })
            .filter((go) => go.active && go.enemyRef && !go.enemyRef.dead);
        if (hits.length) {
            hits.sort((a, b) => Math.abs(a.x - prevX) - Math.abs(b.x - prevX)); // o mais perto da origem primeiro
            this._impact(hits[0]);
            return;
        }

        // fim do alcance, ou saiu do mundo
        const b = this.scene.physics && this.scene.physics.world ? this.scene.physics.world.bounds : null;
        const outOfWorld = b && (this.x < b.x + 4 || this.x > b.right - 4);
        if (Math.abs(this.x - this.originX) >= this.range || outOfWorld) this._fizzle();
    }

    _emitEmbers() {
        const s = this.scene;
        const n = 2;
        for (let i = 0; i < n; i++) {
            const S = this.S;
            const ox = -this.dir * Phaser.Math.Between(2, 12) * (S / 0.4);
            const e = s.add.image(this.x + ox, this.y + Phaser.Math.Between(-4, 4), 'fbEmber')
                .setBlendMode(Phaser.BlendModes.ADD).setDepth(15)
                .setTint(Phaser.Utils.Array.GetRandom([0xffe9a8, 0xffb04a, 0xff7a2a, 0xff4a1a]))
                .setScale(Phaser.Math.FloatBetween(0.22, 0.45));
            s.tweens.add({
                targets: e,
                x: e.x - this.dir * Phaser.Math.Between(8, 24),
                y: e.y + Phaser.Math.Between(-14, 6),
                alpha: 0, scale: 0.1,
                duration: Phaser.Math.Between(220, 400),
                ease: 'Cubic.easeOut',
                onComplete: () => e.destroy(),
            });
        }
    }

    _flash(x, y, tint, scale, ms) {
        const f = this.scene.add.image(x, y, 'fbCore').setTint(tint).setScale(scale * 0.5)
            .setBlendMode(Phaser.BlendModes.ADD).setDepth(18);
        this.scene.tweens.add({ targets: f, scale: scale * 1.6, alpha: 0, duration: ms, ease: 'Quad.easeOut', onComplete: () => f.destroy() });
    }

    /** Acertou um inimigo: dano nele + estilhaço nos vizinhos, explosão e some. */
    _impact(target) {
        if (!this.alive) return;
        const ix = this.x, iy = this.y;
        const splashR = 48;
        const splash = this.queryOverlap({ x: ix - splashR, y: iy - 40, width: splashR * 2, height: 80 })
            .filter((go) => go.active && go.enemyRef && !go.enemyRef.dead && go !== target);
        if (target.enemyRef && !target.enemyRef.dead) target.enemyRef.takeDamage(this.damage);
        splash.forEach((go) => go.enemyRef.takeDamage(Math.max(1, Math.ceil(this.damage * 0.6))));

        // explosão: clarão, anel que se expande e brasas em leque
        const S = this.S;
        this._flash(ix, iy, 0xfff0b0, 1.6 * S, 200);
        this._flash(ix, iy, 0xff6a1a, 2.6 * S, 300);
        const ring = this.scene.add.circle(ix, iy, 8, 0x000000, 0).setStrokeStyle(2, 0xffb04a, 0.95).setDepth(18)
            .setBlendMode(Phaser.BlendModes.ADD);
        this.scene.tweens.add({ targets: ring, scale: 3.4, alpha: 0, duration: 280, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
        for (let i = 0; i < 12; i++) {
            const a = (Math.PI * 2 * i) / 12 + Phaser.Math.FloatBetween(-0.2, 0.2);
            const sp = Phaser.Math.Between(14, 42);
            const e = this.scene.add.image(ix, iy, 'fbEmber').setBlendMode(Phaser.BlendModes.ADD).setDepth(18)
                .setTint(Phaser.Utils.Array.GetRandom([0xffe9a8, 0xffb04a, 0xff7a2a])).setScale(Phaser.Math.FloatBetween(0.3, 0.6));
            this.scene.tweens.add({
                targets: e, x: ix + Math.cos(a) * sp, y: iy + Math.sin(a) * sp * 0.8 + 12, alpha: 0, scale: 0.1,
                duration: Phaser.Math.Between(260, 480), ease: 'Cubic.easeOut', onComplete: () => e.destroy(),
            });
        }
        this.scene.cameras.main.shake(70, 0.002);
        this._cleanup();
    }

    /** Chegou ao fim do alcance sem acertar nada: encolhe, solta brasas e some. */
    _fizzle() {
        if (!this.alive) return;
        this.alive = false;
        this.scene.events.off('update', this._onUpdate);
        this.scene.events.off('shutdown', this._onShutdown);
        const parts = [this.core, this.heart, this.glow, this.tail];
        this.scene.tweens.add({
            targets: parts, alpha: 0, scaleX: 0.05, scaleY: 0.05, duration: 260, ease: 'Quad.easeIn',
            onComplete: () => parts.forEach((p) => p.destroy()),
        });
        for (let i = 0; i < 7; i++) {
            const e = this.scene.add.image(this.x, this.y + Phaser.Math.Between(-6, 6), 'fbEmber')
                .setBlendMode(Phaser.BlendModes.ADD).setDepth(15).setTint(0xffb04a).setScale(Phaser.Math.FloatBetween(0.25, 0.45));
            this.scene.tweens.add({
                targets: e, x: e.x + this.dir * Phaser.Math.Between(4, 16), y: e.y + Phaser.Math.Between(-16, 4), alpha: 0, scale: 0.1,
                duration: Phaser.Math.Between(300, 520), ease: 'Cubic.easeOut', onComplete: () => e.destroy(),
            });
        }
    }

    _cleanup() {
        const wasAlive = this.alive;
        this.alive = false;
        this.scene.events.off('update', this._onUpdate);
        this.scene.events.off('shutdown', this._onShutdown);
        [this.core, this.heart, this.glow, this.tail].forEach((p) => { if (p && p.scene) p.destroy(); });
        return wasAlive;
    }
}

/** Escala geral do efeito (1 = tamanho da 1ª versão, que ficou grande demais: ~48px de núcleo
 *  num personagem de ~110px). 0.4 = núcleo de ~19px. */
Fireball.SIZE = 0.4;
Fireball._bbox = {};
