/* =====================================================================
   CombatFX — "peso" visual do combate, compartilhado por GameScene e
   CaveScene (e por qualquer cena futura que use Enemy.js/PlayerController.js).

   POR QUE EXISTE
   ---------------
   Antes, acertar um inimigo era um piscar de alpha, e matar um era um
   leve inchaço de 120 ms. O golpe do jogador não tinha nenhuma marca, e
   levar dano era só o tremor de câmera. Isso fazia o combate parecer "mudo"
   mesmo com a lógica toda certa. Aqui ficam as respostas visuais, ligadas
   nos pontos centrais que já existiam (um lugar por evento, sem tocar na
   lógica de dano):

     * Enemy.takeDamage()          → CombatFX.enemyHit()   faísca + número + clarão branco
     * Enemy._die()                → CombatFX.deathBurst() explosão (gosma/poeira)
     * PlayerController._trigger*  → CombatFX.slash()      arco do soco/chute
     * PlayerController.takeDamage → CombatFX.playerHurt() número vermelho + faíscas

   Tudo é código (texturas geradas uma vez, sem arquivo de imagem, sem corpo
   de física), e tudo fica ACIMA do filtro de dia/noite (depth ≥ 1000): é
   luz/impacto, não pode sair escurecido pela noite.

   Os ganchos nos outros arquivos são SEMPRE protegidos por
   `typeof CombatFX !== 'undefined'` — se este arquivo não carregar, o jogo
   continua igual ao de antes.
   ===================================================================== */

class CombatFX {
    static ensureTextures(scene) {
        const mk = (key, w, h, draw) => {
            if (scene.textures.exists(key)) return;
            const g = scene.add.graphics(); draw(g); g.generateTexture(key, w, h); g.destroy();
        };
        // faísca: risco brilhante, mais forte na ponta (direita) — a rotação alinha com o movimento
        mk('cfSpark', 22, 6, (g) => {
            for (let x = 0; x < 22; x++) {
                const k = Math.pow(x / 21, 1.6), hgt = Math.min(5, 2 + k * 3.2);
                g.fillStyle(0xffffff, 0.12 + 0.88 * k);
                g.fillRect(x, 3 - hgt / 2, 1, hgt);
            }
        });
        mk('cfSoft', 24, 24, (g) => {
            for (let i = 0; i < 12; i++) {
                const f = i / 11;
                g.fillStyle(0xffffff, 0.04 + 0.2 * f * f);
                g.fillCircle(12, 12, 12 * (1 - f * 0.92));
            }
        });
        mk('cfRing', 64, 64, (g) => {
            g.lineStyle(7, 0xffffff, 0.18); g.strokeCircle(32, 32, 24);
            g.lineStyle(3.5, 0xffffff, 0.5); g.strokeCircle(32, 32, 24);
            g.lineStyle(1.6, 0xffffff, 1); g.strokeCircle(32, 32, 24);
        });
        // arco do golpe: lua crescente, fina nas pontas e grossa no meio (origem do círculo em x=0, y=meio)
        mk('cfSlash', 52, 96, (g) => {
            const R = 48, cy = 48, n = 22;
            const build = (thick) => {
                const pts = [];
                for (let i = 0; i <= n; i++) {
                    const t = i / n, a = (-70 + 140 * t) * Math.PI / 180;
                    pts.push({ x: R * Math.cos(a), y: cy + R * Math.sin(a) });
                }
                for (let i = n; i >= 0; i--) {
                    const t = i / n, a = (-70 + 140 * t) * Math.PI / 180, r = R * (1 - thick * Math.sin(Math.PI * t));
                    pts.push({ x: r * Math.cos(a), y: cy + r * Math.sin(a) });
                }
                return pts;
            };
            g.fillStyle(0xffffff, 0.35); g.fillPoints(build(0.5), true);
            g.fillStyle(0xffffff, 0.95); g.fillPoints(build(0.26), true);
        });
    }

    // ------------------------------------------------------------------
    // Peças
    // ------------------------------------------------------------------
    /** Rajada de faíscas + anel de impacto. dir: -1/1 (direção do golpe). */
    static hitSpark(scene, x, y, opts = {}) {
        CombatFX.ensureTextures(scene);
        const dir = opts.dir || 1, crit = !!opts.crit;
        const color = opts.color !== undefined ? opts.color : (crit ? 0xffd54a : 0xfff1c0);
        const n = opts.count || (crit ? 12 : 7);
        const D = 1001;
        const ring = scene.add.image(x, y, 'cfRing').setBlendMode(Phaser.BlendModes.ADD).setTint(color)
            .setScale(0.25).setAlpha(0.9).setDepth(D);
        scene.tweens.add({ targets: ring, scale: crit ? 1.2 : 0.8, alpha: 0, duration: crit ? 260 : 170, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
        for (let i = 0; i < n; i++) {
            const spread = crit ? 1.9 : 1.3;
            const base = dir > 0 ? 0 : Math.PI;
            const a = base + (Math.random() - 0.5) * spread * 1.5;
            const dist = (crit ? 46 : 32) * (0.5 + Math.random() * 0.8);
            const sp = scene.add.image(x, y, 'cfSpark').setBlendMode(Phaser.BlendModes.ADD).setTint(color)
                .setRotation(a).setScale(0.6 + Math.random() * 0.8, 1).setAlpha(1).setDepth(D);
            scene.tweens.add({
                targets: sp, x: x + Math.cos(a) * dist, y: y + Math.sin(a) * dist + 6, alpha: 0, scaleX: 0.15,
                duration: 190 + Math.random() * 150, ease: 'Cubic.easeOut', onComplete: () => sp.destroy(),
            });
        }
    }

    /** Número flutuante (dano, XP, etc.). */
    static number(scene, x, y, text, opts = {}) {
        const crit = !!opts.crit;
        const t = scene.add.text(x, y, text, {
            fontFamily: 'Georgia, serif', fontSize: `${opts.size || (crit ? 24 : 16)}px`, fontStyle: 'bold',
            color: opts.color || (crit ? '#ffe27a' : '#ffffff'), stroke: opts.stroke || '#1a1020', strokeThickness: crit ? 5 : 4,
        }).setOrigin(0.5).setDepth(1002).setScale(crit ? 1.7 : 1.2);
        scene.tweens.add({ targets: t, scale: crit ? 1.15 : 1, duration: 140, ease: 'Back.easeOut' });
        scene.tweens.add({
            targets: t, y: y - (opts.rise || 36), x: x + (opts.drift !== undefined ? opts.drift : Phaser.Math.Between(-10, 10)),
            alpha: { value: 0, delay: 360, duration: opts.dur || 520 }, duration: (opts.dur || 520) + 360, ease: 'Cubic.easeOut',
            onComplete: () => t.destroy(),
        });
        return t;
    }

    /** Cor de partícula por inimigo (slime: cor da variante; goblin: poeira terrosa). */
    static colorFor(enemy) {
        if (enemy && enemy.variant !== undefined) return [0x4caf6e, 0x4a9ecf, 0xb06fd9][enemy.variant % 3];
        return 0xb5a58a;
    }

    /** Acerto num inimigo: faísca + número de dano + clarão branco no sprite + respingos. */
    static enemyHit(scene, enemy, info = {}) {
        CombatFX.ensureTextures(scene);
        const s = enemy.sprite;
        if (!s || !s.active) return;
        const x = s.x, y = s.y - s.displayHeight * 0.5;
        let dir = 1;
        try { dir = (s.x >= enemy.getPlayerPosition().x) ? 1 : -1; } catch (e) { /* sem posição do jogador */ }
        CombatFX.hitSpark(scene, x - dir * 6, y, { dir, crit: info.crit });
        CombatFX.number(scene, x, s.y - s.displayHeight - 4, `${Math.round(info.damage)}`, { crit: info.crit });
        if (info.crit) scene.cameras.main.shake(90, 0.0028);
        // respingos na cor do inimigo
        const col = CombatFX.colorFor(enemy);
        for (let i = 0; i < 4; i++) {
            const d = scene.add.image(x, y, 'cfSoft').setTint(col).setScale(0.22 + Math.random() * 0.2).setDepth(1001).setAlpha(0.95);
            const a = (dir > 0 ? -0.4 : Math.PI + 0.4) + (Math.random() - 0.5) * 1.6;
            const dist = 16 + Math.random() * 22;
            scene.tweens.add({
                targets: d, x: x + Math.cos(a) * dist, y: y + Math.sin(a) * dist + 14, alpha: 0, duration: 300 + Math.random() * 120,
                ease: 'Quad.easeOut', onComplete: () => d.destroy(),
            });
        }
        // clarão branco de 80 ms (só se o sprite não estiver tingido por outro efeito, ex.: buff do xamã)
        if (!s.isTinted) {
            s.setTintFill(0xffffff);
            scene.time.delayedCall(80, () => { if (s.active) s.clearTint(); });
        }
    }

    /** Explosão de morte. kind 'goo' (slime) ou 'dust' (goblin). */
    static deathBurst(scene, x, y, opts = {}) {
        CombatFX.ensureTextures(scene);
        const goo = opts.kind !== 'dust';
        const col = opts.color !== undefined ? opts.color : 0xb5a58a;
        const D = 1001;
        // anel + clarão
        const ring = scene.add.image(x, y, 'cfRing').setBlendMode(Phaser.BlendModes.ADD).setTint(goo ? 0xffffff : 0xffe2b0)
            .setScale(0.3).setAlpha(0.7).setDepth(D);
        scene.tweens.add({ targets: ring, scale: 1.3, alpha: 0, duration: 320, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
        // fumaça/poeira macia
        for (let i = 0; i < (goo ? 4 : 7); i++) {
            const p = scene.add.image(x + Phaser.Math.Between(-8, 8), y + Phaser.Math.Between(-6, 8), 'cfSoft')
                .setTint(goo ? 0xffffff : 0xcfc2aa).setScale(0.5 + Math.random() * 0.5).setAlpha(goo ? 0.35 : 0.5).setDepth(D - 1);
            scene.tweens.add({
                targets: p, x: p.x + Phaser.Math.Between(-24, 24), y: p.y - Phaser.Math.Between(6, 26), scale: p.scale * 2.2, alpha: 0,
                duration: 520 + Math.random() * 300, ease: 'Sine.easeOut', onComplete: () => p.destroy(),
            });
        }
        // gotas/estilhaços em arco (física simples via contador)
        const n = goo ? 11 : 7;
        for (let i = 0; i < n; i++) {
            const d = scene.add.image(x, y, 'cfSoft').setTint(goo ? col : 0x8a7d66).setScale((goo ? 0.35 : 0.22) + Math.random() * 0.3).setDepth(D).setAlpha(1);
            const vx = Phaser.Math.Between(-110, 110), vy = -Phaser.Math.Between(90, 230), g = 640, dur = 620 + Math.random() * 200;
            scene.tweens.addCounter({
                from: 0, to: 1, duration: dur,
                onUpdate: (tw) => {
                    const t = tw.getValue() * dur / 1000;
                    d.setPosition(x + vx * t, y + vy * t + 0.5 * g * t * t).setAlpha(1 - Math.pow(tw.getValue(), 2.4));
                },
                onComplete: () => d.destroy(),
            });
        }
        if (goo) { // mancha de gosma que escorre pro chão e some
            const puddle = scene.add.ellipse(x, y + 10, 8, 4, col, 0.7).setDepth(D - 2);
            scene.tweens.add({ targets: puddle, scaleX: 5, scaleY: 1.4, alpha: 0, duration: 900, ease: 'Sine.easeOut', onComplete: () => puddle.destroy() });
        }
    }

    /** Arco do golpe do jogador. kind: 'punch' | 'kick'. (x,y) = ponto de partida (perto do corpo). */
    static slash(scene, x, y, dir, kind) {
        CombatFX.ensureTextures(scene);
        const kick = kind === 'kick';
        const img = scene.add.image(x + dir * 8, y, 'cfSlash').setOrigin(0, 0.5).setFlipX(dir < 0)
            .setBlendMode(Phaser.BlendModes.ADD).setTint(kick ? 0xffd9a0 : 0xfff6dc)
            .setScale(0.55, kick ? 0.8 : 0.62).setAngle(dir * (kick ? 18 : -8)).setAlpha(0.95).setDepth(1001);
        scene.tweens.add({
            targets: img, scaleX: kick ? 1.25 : 1.05, scaleY: kick ? 1.15 : 0.95, x: img.x + dir * 12, alpha: 0,
            duration: kick ? 200 : 160, ease: 'Cubic.easeOut', onComplete: () => img.destroy(),
        });
    }

    /** Jogador atingido: número vermelho + faíscas + pulso vermelho curto na tela. */
    static playerHurt(scene, sprite, amount) {
        CombatFX.ensureTextures(scene);
        const x = sprite.x, y = sprite.y - sprite.displayHeight * 0.55;
        CombatFX.number(scene, x, y, `-${Math.round(amount)}`, { color: '#ff6b6b', size: 20, rise: 44, drift: 0 });
        CombatFX.hitSpark(scene, x, sprite.y - sprite.displayHeight * 0.3, { dir: sprite.flipX ? 1 : -1, color: 0xff7a7a, count: 6 });
        scene.cameras.main.flash(110, 150, 24, 24, true);
    }
}
