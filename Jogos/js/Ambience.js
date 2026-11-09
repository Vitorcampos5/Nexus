/* =====================================================================
   Ambience — camada de ambientação compartilhada pelas cenas (GameScene,
   CaveScene, VillageScene, LibraryScene).

   POR QUE UMA PEÇA ÚNICA
   -----------------------
   As cenas já tinham animações de ambiente (pássaros, vagalumes, esporos,
   fumaça), mas cada uma reinventava a sua com tweens soltos — e faltava o
   que dá profundidade: camadas distantes, luz, partículas em profundidade,
   a noite de verdade. Em vez de repetir isso quatro vezes, tudo mora aqui,
   no mesmo padrão de Scenery.js / HealEffect.js:

     * texturas geradas UMA vez com Graphics (cache de texturas é global);
     * um gerenciador por cena (Ambience._mgr) com UM listener de 'update'
       e limpeza automática no 'shutdown' — a Scene é reaproveitada entre
       scene.start()s, então nada pode sobrar da visita anterior;
     * sem corpo de física, sem arquivo de imagem.

   NOITE: o filtro de dia/noite fica em depth 999 (DayNightCycle). Tudo que
   é LUZ (vagalumes, lanternas, brasas, estrelas brilhantes) usa depth 1000,
   aditivo, pra não sair escurecido pelo filtro — e some de dia via
   Ambience.nightFactor() (mesma curva do PLAINS_DAY_NIGHT_KEYFRAMES, hora
   real do relógio).

   DESEMPENHO (mobile): contagens escalam por Ambience.quality(scene); em
   tela de toque ficam em ~60%.
   ===================================================================== */

class Ambience {
    // ------------------------------------------------------------------
    // Hora / qualidade
    // ------------------------------------------------------------------
    /** 0 = dia pleno, 1 = noite plena. Mesma curva dos keyframes do DayNightCycle. */
    static nightFactor() {
        let h;
        if (typeof Ambience.hourOverride === 'number') h = Ambience.hourOverride;
        else { const d = new Date(); h = d.getHours() + d.getMinutes() / 60; }
        if (h < 5) return 1;
        if (h < 7) return 1 - (h - 5) / 2;
        if (h < 17) return 0;
        if (h < 19.5) return (h - 17) / 2.5;
        return 1;
    }

    /** 1 no desktop, 0.6 em tela de toque (menos partículas). */
    static quality(scene) {
        return (scene.sys.game.device.input.touch) ? 0.6 : 1;
    }

    // ------------------------------------------------------------------
    // Gerenciador por cena
    // ------------------------------------------------------------------
    static _mgr(scene) {
        if (scene.__am) return scene.__am;
        const m = { items: [], t: 0, night: Ambience.nightFactor(), nightTimer: 0 };
        scene.__am = m;
        m.onUpdate = (time, delta) => {
            const dt = Math.min(delta || 16, 50) / 1000;
            m.t += dt;
            m.nightTimer += dt;
            if (m.nightTimer > 1) { m.nightTimer = 0; m.night = Ambience.nightFactor(); }
            for (let i = 0; i < m.items.length; i++) m.items[i](dt, m.t, m.night);
        };
        scene.events.on('update', m.onUpdate);
        scene.events.once('shutdown', () => { scene.events.off('update', m.onUpdate); scene.__am = null; });
        return m;
    }

    // ------------------------------------------------------------------
    // Texturas
    // ------------------------------------------------------------------
    static ensureTextures(scene) {
        const mk = (key, w, h, draw) => {
            if (scene.textures.exists(key)) return;
            const g = scene.add.graphics(); draw(g); g.generateTexture(key, w, h); g.destroy();
        };
        // brilho radial suave (branco — tingido por quem usa)
        mk('amSoft', 32, 32, (g) => {
            for (let i = 0; i < 16; i++) {
                const f = i / 15;
                g.fillStyle(0xffffff, 0.02 + 0.12 * f * f);
                g.fillCircle(16, 16, 16 * (1 - f * 0.95));
            }
        });
        mk('amDot', 4, 4, (g) => { g.fillStyle(0xffffff, 1); g.fillCircle(2, 2, 1.6); });
        // estrela de 4 pontas
        mk('amStar', 12, 12, (g) => {
            g.fillStyle(0xffffff, 0.35); g.fillCircle(6, 6, 5.5);
            g.fillStyle(0xffffff, 1); g.fillRect(5.2, 0, 1.6, 12); g.fillRect(0, 5.2, 12, 1.6);
            g.fillCircle(6, 6, 1.8);
        });
        mk('amLeaf', 12, 8, (g) => {
            g.fillStyle(0xffffff, 1); g.fillEllipse(6, 4, 11, 6);
            g.lineStyle(1, 0x000000, 0.35); g.lineBetween(1, 4, 11, 4);
        });
        mk('amDrop', 6, 12, (g) => {
            g.fillStyle(0xbfe3ff, 1); g.fillTriangle(3, 0, 0.4, 7, 5.6, 7); g.fillCircle(3, 8, 2.6);
            g.fillStyle(0xffffff, 0.8); g.fillCircle(2.2, 7.4, 0.9);
        });
        mk('amRipple', 40, 12, (g) => {
            g.lineStyle(1.6, 0xcfe9ff, 0.9); g.strokeEllipse(20, 6, 36, 8);
            g.lineStyle(1, 0xcfe9ff, 0.5); g.strokeEllipse(20, 6, 24, 5);
        });
        // névoa tileável na horizontal (blobs repetidos em ±256)
        mk('amFog', 256, 96, (g) => {
            let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
            for (let i = 0; i < 26; i++) {
                const x = rnd() * 256, y = 24 + rnd() * 48, r = 18 + rnd() * 30;
                for (const dx of [-256, 0, 256]) {
                    for (let k = 0; k < 5; k++) {
                        g.fillStyle(0xffffff, 0.035);
                        g.fillEllipse(x + dx, y, r * 2 * (1 - k * 0.16), r * 0.9 * (1 - k * 0.16));
                    }
                }
            }
        });
        // feixe de luz: forte no topo, some embaixo, bordas laterais suaves
        mk('amBeam', 64, 256, (g) => {
            for (let x = 0; x < 64; x++) {
                const e = Math.abs(x - 31.5) / 32, gx = 1 - e * e;
                for (let y = 0; y < 256; y += 2) {
                    g.fillStyle(0xffffff, gx * 0.5 * Math.pow(1 - y / 256, 1.4));
                    g.fillRect(x, y, 1, 2);
                }
            }
        });
        mk('amMoon', 96, 96, (g) => {
            g.fillStyle(0xf6f2de, 1); g.fillCircle(48, 48, 34);
            g.fillStyle(0xd9d4b8, 0.55); g.fillCircle(38, 40, 9); g.fillCircle(58, 56, 12); g.fillCircle(52, 33, 5); g.fillCircle(36, 62, 6);
            g.fillStyle(0xffffff, 0.35); g.fillCircle(42, 42, 28);
        });
        // tufos de grama (primeiro plano) — silhuetas escuras com ponta mais clara
        for (let v = 0; v < 3; v++) {
            mk(`amTuft${v}`, 44, 36, (g) => {
                let seed = 3 + v * 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
                const n = 7 + v * 2;
                for (let i = 0; i < n; i++) {
                    const x = 4 + rnd() * 36, h = 14 + rnd() * 20, lean = (rnd() - 0.5) * 12, w = 2 + rnd() * 2.5;
                    g.fillStyle(i % 2 ? 0x1d3b22 : 0x2a5430, 1);
                    g.fillTriangle(x - w, 36, x + w, 36, x + lean, 36 - h);
                    g.fillStyle(0x58944a, 0.85);
                    g.fillTriangle(x + lean * 0.7 - 1, 36 - h * 0.72, x + lean * 0.7 + 1, 36 - h * 0.72, x + lean, 36 - h);
                }
            });
        }
        // flores pequenas
        [['A', 0xffe566], ['B', 0xff8fb0], ['C', 0xf4f4ff]].forEach(([n, c]) => mk(`amFlower${n}`, 12, 18, (g) => {
            g.lineStyle(1.4, 0x2f5d2a, 1); g.lineBetween(6, 18, 6, 7);
            g.fillStyle(0x3e7a36, 1); g.fillTriangle(6, 15, 11, 11, 6, 12.5);
            g.fillStyle(c, 1);
            [[6, 3], [9, 5.5], [3, 5.5], [8, 8.5], [4, 8.5]].forEach(([x, y]) => g.fillCircle(x, y, 2.1));
            g.fillStyle(0xd98a1e, 1); g.fillCircle(6, 6, 1.7);
        }));
        mk('amPebble', 16, 9, (g) => {
            g.fillStyle(0x6f6a62, 1); g.fillEllipse(5, 6, 9, 6);
            g.fillStyle(0x8b857b, 1); g.fillEllipse(11, 6, 8, 5);
            g.fillStyle(0xa8a296, 0.8); g.fillEllipse(4, 4.5, 4, 2);
        });
        mk('amCairn', 30, 34, (g) => {
            g.fillStyle(0x000000, 0.25); g.fillEllipse(15, 32, 28, 5);
            g.fillStyle(0x6f6a62, 1); g.fillEllipse(15, 27, 26, 12);
            g.fillStyle(0x857f74, 1); g.fillEllipse(15, 19, 19, 10);
            g.fillStyle(0x9d9689, 1); g.fillEllipse(15, 12, 12, 8);
            g.fillStyle(0xb3ad9f, 1); g.fillEllipse(15, 6, 7, 5);
            g.fillStyle(0xffffff, 0.2); g.fillEllipse(13, 5, 3, 2);
        });
        // cordilheira distante (tileável: senos "ridged" com ciclos inteiros). Duas camadas + neve.
        mk('amMountains', 512, 340, (g) => {
            const W = 512, H = 340;
            const layer = (base, terms) => (x) => {
                let h = base;
                terms.forEach(([n, amp, ph]) => { h += amp * (1 - Math.abs(Math.sin(Math.PI * n * x / W + ph))); });
                return h;
            };
            const far = layer(130, [[3, 100, 0.4], [7, 48, 1.3], [13, 18, 2.2]]);
            const near = layer(80, [[2, 80, 1.1], [5, 58, 0.2], [11, 22, 2.7]]);
            const poly = (fn, color, alpha) => {
                const pts = [{ x: 0, y: H }];
                for (let x = 0; x <= W; x += 4) pts.push({ x, y: H - fn(x) });
                pts.push({ x: W, y: H });
                g.fillStyle(color, alpha); g.fillPoints(pts, true);
            };
            poly(far, 0x93abc8, 0.78);
            // neve nos picos mais altos da camada de trás
            const thr = 262;
            let run = [];
            const flush = () => {
                if (run.length > 1) {
                    const pts = run.map((x) => ({ x, y: H - far(x) }));
                    const xs = run.slice().reverse();
                    xs.forEach((x, i) => pts.push({ x, y: H - thr + 6 + ((i % 2) ? 7 : 0) + (far(x) - thr) * -0.2 }));
                    g.fillStyle(0xf0f7ff, 0.88); g.fillPoints(pts, true);
                }
                run = [];
            };
            for (let x = 0; x <= W; x += 4) { if (far(x) > thr) run.push(x); else flush(); }
            flush();
            poly(near, 0x6b86a6, 0.9);
            // sombra lateral nos picos da frente (volume)
            g.fillStyle(0x4d6785, 0.35);
            for (let x = 0; x < W; x += 4) {
                const y0 = H - near(x), y1 = H - near(x + 4);
                if (y1 < y0) g.fillTriangle(x, y0, x + 4, y1, x + 4, y0);
            }
            // bruma de base: funde com o chão. Faixas empilhadas (fillGradientStyle não funciona em generateTexture,
            // que desenha em canvas — saía um retângulo chapado com borda dura).
            for (let i = 0; i < 40; i++) {
                const y0 = H * 0.5 + i * (H * 0.5 / 40);
                g.fillStyle(0xd6e6f4, 0.02); g.fillRect(0, y0, W, H - y0);
            }
        });
        // caverna: parede, espetos distantes (chão/teto)
        mk('amCaveWall', 256, 256, (g) => {
            let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
            g.fillStyle(0x1a1626, 1); g.fillRect(0, 0, 256, 256);
            const tones = [0x110e1a, 0x241e33, 0x2c2540, 0x161220];
            for (let i = 0; i < 90; i++) {
                const x = rnd() * 256, y = rnd() * 256, r = 12 + rnd() * 36;
                g.fillStyle(tones[i % 4], 0.32);
                for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) g.fillEllipse(x + dx, y + dy, r * 2, r * 1.5);
            }
            g.lineStyle(1.2, 0x0b0910, 0.35);
            for (let k = 0; k < 7; k++) {
                const y0 = 20 + k * 36;
                g.beginPath(); g.moveTo(0, y0);
                for (let x = 0; x <= 256; x += 16) g.lineTo(x, y0 + Math.sin(x / 256 * Math.PI * 2 * (1 + k % 3) + k) * 5);
                g.strokePath();
            }
            for (let i = 0; i < 40; i++) { g.fillStyle(0x7a6c9e, 0.35 + rnd() * 0.3); g.fillRect(Math.floor(rnd() * 256), Math.floor(rnd() * 256), 1, 1); }
        });
        const spikes = (key, up) => mk(key, 512, 300, (g) => {
            let seed = up ? 21 : 33; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
            const dir = up ? -1 : 1;
            g.fillStyle(0x2b2745, 1); g.fillRect(0, up ? 276 : 0, 512, 24);
            let x = -10;
            while (x < 522) {
                const w = 26 + rnd() * 40, h = (rnd() < 0.25 ? 170 : 70) + rnd() * 90, tip = x + w / 2 + (rnd() - 0.5) * 14;
                const by = up ? 290 : 10;
                g.fillStyle(0x2b2745, 1); g.fillTriangle(x, by, x + w, by, tip, by + dir * h);
                g.fillStyle(0x3d3762, 0.7); g.fillTriangle(tip, by + dir * h, x + w, by, tip + w * 0.12, by);
                g.fillStyle(0x15122a, 0.55); g.fillTriangle(x, by, tip, by + dir * h, tip - w * 0.1, by);
                x += w * (0.55 + rnd() * 0.4);
            }
        });
        spikes('amSpikesUp', true);
        spikes('amSpikesDown', false);
    }

    // ------------------------------------------------------------------
    // Partículas ambientes (campo que acompanha a câmera) e fontes pontuais
    // ------------------------------------------------------------------
    /**
     * @param {Phaser.Scene} scene
     * @param {object} cfg
     * @param {string} cfg.texture
     * @param {number} cfg.count
     * @param {number} [cfg.depth=4]
     * @param {boolean} [cfg.add=false]       blend aditivo (luz)
     * @param {number[]} [cfg.tint]           lista de cores sorteadas
     * @param {number[]} [cfg.vx] [cfg.vy]    [min,max] px/s
     * @param {number[]} [cfg.size]           [min,max] escala
     * @param {number[]} [cfg.alpha]          [min,max]
     * @param {number[]} [cfg.sway]           [min,max] amplitude (px) do balanço lateral
     * @param {number[]} [cfg.swayHz]         [min,max] frequência do balanço
     * @param {number[]} [cfg.spin]           [min,max] rad/s
     * @param {number[]} [cfg.twinkle]        [min,max] Hz (pisca)
     * @param {(night:number) => number} [cfg.visible]  multiplicador global 0..1 (0 = oculto)
     * @param {{yMin:number,yMax:number}} [cfg.band]  faixa vertical fixa em coords de mundo
     * @param {() => {x:number,y:number,spread:number}} [cfg.source]  se dado: partículas nascem na fonte e morrem (brasas)
     * @param {number[]} [cfg.life]           [min,max] s (modo fonte)
     */
    static field(scene, cfg) {
        Ambience.ensureTextures(scene);
        const m = Ambience._mgr(scene);
        const cam = scene.cameras.main;
        const rnd = (a, b) => a + Math.random() * (b - a);
        const R = (r, d) => (Array.isArray(r) ? rnd(r[0], r[1]) : (r !== undefined ? r : d));
        const count = Math.max(1, Math.round(cfg.count * Ambience.quality(scene)));
        const pad = 50;
        const area = () => {
            const v = cam.worldView;
            const y0 = cfg.band ? cfg.band.yMin : v.y - pad;
            const y1 = cfg.band ? cfg.band.yMax : v.bottom + pad;
            return { x: v.x - pad, y: y0, w: v.width + pad * 2, h: Math.max(10, y1 - y0) };
        };
        const parts = [];
        const spawn = (p, first) => {
            if (cfg.source) {
                const s = cfg.source();
                p.x = s.x + rnd(-s.spread, s.spread); p.y = s.y + rnd(-3, 3);
                p.age = first ? rnd(0, 1) * p.life : 0;
            } else {
                const A = area();
                p.x = A.x + Math.random() * A.w; p.y = A.y + Math.random() * A.h;
            }
        };
        for (let i = 0; i < count; i++) {
            const img = scene.add.image(0, 0, cfg.texture).setDepth(cfg.depth !== undefined ? cfg.depth : 4).setAlpha(0);
            if (cfg.add) img.setBlendMode(Phaser.BlendModes.ADD);
            if (cfg.tint && cfg.tint.length) img.setTint(cfg.tint[i % cfg.tint.length]);
            const p = {
                img, vx: R(cfg.vx, 0), vy: R(cfg.vy, 0), size: R(cfg.size, 1), alpha: R(cfg.alpha, 0.6),
                amp: R(cfg.sway, 0), freq: R(cfg.swayHz, 0.4) * Math.PI * 2, phase: Math.random() * 6.28,
                spin: R(cfg.spin, 0), ang: Math.random() * 6.28, tw: R(cfg.twinkle, 0) * Math.PI * 2,
                life: R(cfg.life, 1), age: 0, x: 0, y: 0,
            };
            spawn(p, true);
            parts.push(p);
        }
        let hidden = false;
        m.items.push((dt, t, night) => {
            const vis = cfg.visible ? cfg.visible(night) : 1;
            if (vis <= 0.01) { if (!hidden) { parts.forEach((p) => p.img.setVisible(false)); hidden = true; } return; }
            hidden = false;
            const A = cfg.source ? null : area();
            for (let i = 0; i < parts.length; i++) {
                const p = parts[i];
                let a = p.alpha, sc = p.size;
                if (cfg.source) {
                    p.age += dt;
                    if (p.age >= p.life) { p.life = R(cfg.life, 1); spawn(p, false); }
                    const k = p.age / p.life;
                    a = p.alpha * Math.min(1, k * 8) * (1 - k);
                    sc = p.size * (1 - 0.5 * k);
                    p.x += p.vx * dt; p.y += p.vy * dt;
                } else {
                    p.x += p.vx * dt; p.y += p.vy * dt;
                    p.x = A.x + ((((p.x - A.x) % A.w) + A.w) % A.w);
                    p.y = A.y + ((((p.y - A.y) % A.h) + A.h) % A.h);
                }
                p.ang += p.spin * dt;
                const sx = p.amp ? Math.sin(t * p.freq + p.phase) * p.amp : 0;
                if (p.tw) a *= 0.55 + 0.45 * Math.sin(t * p.tw + p.phase);
                p.img.setVisible(true).setPosition(p.x + sx, p.y).setRotation(p.ang).setScale(sc).setAlpha(a * vis);
            }
        });
        return parts;
    }

    /** Pólen/poeira lenta de dia, que se acende em luz dourada. */
    static pollen(scene, opts = {}) {
        return Ambience.field(scene, Object.assign({
            texture: 'amSoft', count: 26, depth: 6, add: true,
            tint: [0xfff3b0, 0xffffff, 0xffe28a], vx: [8, 22], vy: [-8, 6], size: [0.18, 0.4], alpha: [0.25, 0.6],
            sway: [4, 14], swayHz: [0.15, 0.4], twinkle: [0.3, 0.9],
            visible: (night) => 1 - night,
        }, opts));
    }

    /** Folhas caindo, balançando e girando. */
    static leaves(scene, opts = {}) {
        return Ambience.field(scene, Object.assign({
            texture: 'amLeaf', count: 8, depth: 7,
            tint: [0x7fb04a, 0xc9a23a, 0x9ac05a, 0xd07a3a], vx: [-6, 14], vy: [22, 44], size: [0.7, 1.3], alpha: [0.75, 1],
            sway: [14, 34], swayHz: [0.25, 0.6], spin: [-2.4, 2.4],
            visible: (night) => 1 - night * 0.6,
        }, opts));
    }

    /** Vagalumes: só à noite, brilhando acima do filtro, perto do chão. */
    static fireflies(scene, groundY, opts = {}) {
        return Ambience.field(scene, Object.assign({
            texture: 'amSoft', count: 30, depth: 1000, add: true,
            tint: [0xdcff8a, 0xb6ff9a, 0xfff2a0], vx: [-6, 6], vy: [-5, 5], size: [0.28, 0.5], alpha: [0.55, 1],
            sway: [10, 26], swayHz: [0.12, 0.35], twinkle: [0.35, 1.1],
            band: { yMin: groundY - 230, yMax: groundY - 6 },
            visible: (night) => (night > 0.25 ? night : 0),
        }, opts));
    }

    /** Brasas subindo de uma fogueira (fonte pontual). */
    static embers(scene, x, y, opts = {}) {
        return Ambience.field(scene, Object.assign({
            texture: 'amSoft', count: 12, depth: 1000, add: true,
            tint: [0xff9a3a, 0xffc24a, 0xff6a2a], vx: [-10, 10], vy: [-70, -30], size: [0.12, 0.28], alpha: [0.7, 1],
            sway: [3, 9], swayHz: [0.5, 1.2], life: [0.9, 1.9],
            source: () => ({ x, y, spread: 7 }),
        }, opts));
    }

    // ------------------------------------------------------------------
    // Luz
    // ------------------------------------------------------------------
    /**
     * Feixe de luz inclinado, aditivo, que "respira".
     * @param {object} cfg {x, y, w, h, angle (graus), color, alpha, depth, scrollFactor, visible(night)}
     */
    static beam(scene, cfg) {
        Ambience.ensureTextures(scene);
        const m = Ambience._mgr(scene);
        const img = scene.add.image(cfg.x, cfg.y, 'amBeam').setOrigin(0.5, 0)
            .setBlendMode(Phaser.BlendModes.ADD).setTint(cfg.color || 0xfff0c0)
            .setDisplaySize(cfg.w, cfg.h).setAngle(cfg.angle || 0)
            .setDepth(cfg.depth !== undefined ? cfg.depth : 5).setAlpha(0);
        if (cfg.scrollFactor !== undefined) img.setScrollFactor(cfg.scrollFactor);
        const ph = Math.random() * 6.28, base = cfg.alpha !== undefined ? cfg.alpha : 0.12;
        m.items.push((dt, t, night) => {
            const vis = cfg.visible ? cfg.visible(night) : 1;
            img.setVisible(vis > 0.01).setAlpha(base * vis * (0.75 + 0.25 * Math.sin(t * 0.55 + ph)));
        });
        return img;
    }

    /**
     * Ponto de luz (lanterna, janela, vela): brilho largo aditivo ACIMA do filtro noturno.
     * @param {object} [opts] {radius=70, color, alpha=0.5, flicker=0.2, always=false, depth=1000}
     */
    static light(scene, x, y, opts = {}) {
        Ambience.ensureTextures(scene);
        const m = Ambience._mgr(scene);
        const radius = opts.radius || 70;
        const img = scene.add.image(x, y, 'amSoft').setBlendMode(Phaser.BlendModes.ADD)
            .setTint(opts.color || 0xffc77a).setScale(radius * 2 / 32).setDepth(opts.depth !== undefined ? opts.depth : 1000).setAlpha(0);
        const ph = Math.random() * 6.28, base = opts.alpha !== undefined ? opts.alpha : 0.5, fl = opts.flicker !== undefined ? opts.flicker : 0.2;
        m.items.push((dt, t, night) => {
            const vis = opts.always ? 1 : (night > 0.15 ? night : 0);
            img.setVisible(vis > 0.01);
            if (vis <= 0.01) return;
            const n = Math.sin(t * 7.3 + ph) * 0.5 + Math.sin(t * 13.1 + ph * 2) * 0.3 + Math.sin(t * 3.1 + ph) * 0.2;
            img.setAlpha(base * vis * (1 + fl * n));
        });
        return img;
    }

    // ------------------------------------------------------------------
    // Céu: estrelas + lua (noite) e cordilheira distante
    // ------------------------------------------------------------------
    /** Estrelas que piscam, só de noite. Fixas no céu (parallax mínimo). */
    static stars(scene, opts = {}) {
        Ambience.ensureTextures(scene);
        const m = Ambience._mgr(scene);
        const sf = opts.scrollFactor !== undefined ? opts.scrollFactor : 0.04;
        const camW = scene.cameras.main.width, worldW = opts.worldW || camW;
        const spanW = camW + Math.max(0, worldW - camW) * sf + 40;
        const yMax = opts.yMax || 360;
        const count = Math.round((opts.count || 90) * Ambience.quality(scene));
        const stars = [];
        for (let i = 0; i < count; i++) {
            const big = Math.random() < 0.14;
            const img = scene.add.image(Math.random() * spanW, Math.random() * yMax, big ? 'amStar' : 'amDot')
                .setScrollFactor(sf).setDepth(opts.depth !== undefined ? opts.depth : 0).setAlpha(0);
            img.setScale(big ? 0.5 + Math.random() * 0.45 : 0.5 + Math.random() * 0.8);
            if (big) img.setTint(Phaser.Utils.Array.GetRandom([0xffffff, 0xd8e6ff, 0xfff0d0]));
            stars.push({
                img, ph: Math.random() * 6.28, hz: 0.5 + Math.random() * 1.6, base: big ? 0.95 : 0.5 + Math.random() * 0.4,
                yk: 1 - (img.y / yMax) * 0.5, // mais fracas perto do horizonte
            });
        }
        m.items.push((dt, t, night) => {
            const vis = night > 0.2 ? night : 0;
            for (let i = 0; i < stars.length; i++) {
                const s = stars[i];
                s.img.setVisible(vis > 0.01);
                if (vis > 0.01) s.img.setAlpha(s.base * s.yk * vis * (0.55 + 0.45 * Math.sin(t * s.hz + s.ph)));
            }
        });
        return stars;
    }

    /** Lua com halo, só de noite. */
    static moon(scene, x, y, opts = {}) {
        Ambience.ensureTextures(scene);
        const m = Ambience._mgr(scene);
        const sf = opts.scrollFactor !== undefined ? opts.scrollFactor : 0.06;
        const d = opts.depth !== undefined ? opts.depth : 0;
        const halo = scene.add.image(x, y, 'amSoft').setBlendMode(Phaser.BlendModes.ADD).setTint(0xcfe0ff)
            .setScale((opts.size || 1) * 6).setScrollFactor(sf).setDepth(d).setAlpha(0);
        const disc = scene.add.image(x, y, 'amMoon').setScale(opts.size || 1).setScrollFactor(sf).setDepth(d).setAlpha(0);
        m.items.push((dt, t, night) => {
            const vis = night > 0.2 ? night : 0;
            halo.setVisible(vis > 0.01).setAlpha(0.28 * vis * (0.92 + 0.08 * Math.sin(t * 0.4)));
            disc.setVisible(vis > 0.01).setAlpha(0.95 * vis);
        });
        return { halo, disc };
    }

    /** Cordilheira distante (tileSprite) — preenche o céu vazio e dá profundidade. */
    static mountains(scene, opts) {
        Ambience.ensureTextures(scene);
        const ts = scene.add.tileSprite(0, opts.groundY, opts.worldW, 340, 'amMountains')
            .setOrigin(0, 1).setScrollFactor(opts.scrollFactor !== undefined ? opts.scrollFactor : 0.12);
        if (opts.depth !== undefined) ts.setDepth(opts.depth);
        if (opts.tint !== undefined) ts.setTint(opts.tint);
        return ts;
    }

    // ------------------------------------------------------------------
    // Detalhes de chão (planície/vila)
    // ------------------------------------------------------------------
    /**
     * Flores, pedrinhas (atrás do jogador) e tufos de grama em PRIMEIRO plano (na frente do jogador,
     * só a borda do chão, pra dar profundidade sem esconder os pés). Balançam com o vento.
     * @param {object} opts {worldW, groundY, skip:[[x0,x1],...], density}
     */
    static groundDetail(scene, opts) {
        Ambience.ensureTextures(scene);
        const m = Ambience._mgr(scene);
        const skip = opts.skip || [];
        const ok = (x) => !skip.some(([a, b]) => x >= a && x <= b);
        const q = Ambience.quality(scene);
        const sway = [];
        // flores e pedrinhas: atrás do jogador (depth 0.4, criadas antes dele)
        for (let x = 30; x < opts.worldW; x += Phaser.Math.Between(70, 150) / (opts.density || 1)) {
            if (!ok(x)) continue;
            if (Math.random() < 0.62) {
                const key = `amFlower${Phaser.Utils.Array.GetRandom(['A', 'B', 'C'])}`;
                const f = scene.add.image(x, opts.groundY + 3, key).setOrigin(0.5, 1).setScale(Phaser.Math.FloatBetween(0.85, 1.25)).setDepth(0.4);
                sway.push({ img: f, a: 0.07, hz: 0.5 + Math.random() * 0.6, ph: Math.random() * 6.28 });
                if (Math.random() < 0.5) {
                    const f2 = scene.add.image(x + Phaser.Math.Between(8, 16), opts.groundY + 3, key).setOrigin(0.5, 1).setScale(Phaser.Math.FloatBetween(0.7, 1)).setDepth(0.4);
                    sway.push({ img: f2, a: 0.08, hz: 0.5 + Math.random() * 0.6, ph: Math.random() * 6.28 });
                }
            } else {
                scene.add.image(x, opts.groundY + 4, 'amPebble').setOrigin(0.5, 1).setScale(Phaser.Math.FloatBetween(0.8, 1.4)).setDepth(0.4);
            }
        }
        // primeiro plano: tufos na borda de baixo da tela (cobrem no máx. ~7px acima da linha do chão)
        for (let x = 20; x < opts.worldW; x += Phaser.Math.Between(90, 210) / q) {
            if (!ok(x)) continue;
            const t = scene.add.image(x, opts.groundY + 29, `amTuft${Phaser.Math.Between(0, 2)}`)
                .setOrigin(0.5, 1).setScale(Phaser.Math.FloatBetween(0.75, 1.15)).setFlipX(Math.random() < 0.5).setDepth(8);
            sway.push({ img: t, a: 0.045, hz: 0.4 + Math.random() * 0.5, ph: Math.random() * 6.28 });
        }
        m.items.push((dt, t) => {
            for (let i = 0; i < sway.length; i++) {
                const s = sway[i];
                s.img.setRotation(Math.sin(t * s.hz * 6.28 + s.ph) * s.a);
            }
        });
        return sway;
    }

    // ------------------------------------------------------------------
    // Caverna
    // ------------------------------------------------------------------
    /**
     * Profundidade da caverna: parede texturizada, silhuetas distantes (chão/teto) em névoa, brilho da
     * câmara ao fundo, névoa rasteira, feixes do teto e poeira. Chamar LOGO DEPOIS do gradiente de fundo.
     * @param {object} o {W, H, groundY}
     */
    static caveDepth(scene, o) {
        Ambience.ensureTextures(scene);
        const m = Ambience._mgr(scene);
        const { W, H, groundY } = o;
        const wall = scene.add.tileSprite(0, 0, W, H, 'amCaveWall').setOrigin(0, 0).setAlpha(0.65);
        // câmara distante iluminada (azul/violeta) — o "fundo" da caverna
        const glow = scene.add.image(W * 0.5, groundY - 170, 'amSoft').setBlendMode(Phaser.BlendModes.ADD)
            .setTint(0x6a5ae0).setScale(W / 32 * 1.15, 13).setAlpha(0.4);
        // silhuetas: longe (clara, fria) e perto (escura)
        scene.add.tileSprite(0, groundY + 6, W, 300, 'amSpikesUp').setOrigin(0, 1).setTint(0x8f8bf0).setAlpha(0.62).setScale(1, 0.85);
        scene.add.tileSprite(0, -6, W, 300, 'amSpikesDown').setOrigin(0, 0).setTint(0x8f8bf0).setAlpha(0.55).setScale(1, 0.7);
        const nearUp = scene.add.tileSprite(0, groundY + 8, W, 300, 'amSpikesUp').setOrigin(0, 1).setTint(0x2a2748).setAlpha(0.9).setScale(1, 0.4);
        nearUp.tilePositionX = 140;
        // névoa rasteira, duas camadas em sentidos opostos
        const fogA = scene.add.tileSprite(0, groundY - 58, W, 96, 'amFog').setOrigin(0, 0).setTint(0x9a94d8).setAlpha(0.2).setDepth(3);
        const fogB = scene.add.tileSprite(0, groundY - 34, W, 96, 'amFog').setOrigin(0, 0).setTint(0x7f90c8).setAlpha(0.16).setDepth(3).setFlipX(true);
        m.items.push((dt, t) => {
            fogA.tilePositionX += 7 * dt; fogB.tilePositionX -= 5 * dt;
            glow.setAlpha(0.38 + 0.05 * Math.sin(t * 0.5));
        });
        // feixes frios do teto + poeira
        [0.22, 0.7].forEach((fx, i) => Ambience.beam(scene, {
            x: W * fx, y: -10, w: 120 + i * 40, h: groundY + 10, angle: -7 + i * 12, color: 0x9fc0ff, alpha: 0.15, depth: 2,
        }));
        Ambience.field(scene, {
            texture: 'amSoft', count: 22, depth: 5, add: true, tint: [0xb8c8ff, 0xffffff], vx: [-4, 6], vy: [-6, 3],
            size: [0.1, 0.24], alpha: [0.2, 0.5], sway: [3, 9], swayHz: [0.1, 0.3], twinkle: [0.2, 0.7],
            band: { yMin: 40, yMax: groundY - 4 },
        });
        return { wall, glow };
    }

    /**
     * Gotas caindo das pontas das estalactites, com marola no chão.
     * @param {object} o {tips:[{x,y}], landY, depth}
     */
    static drips(scene, o) {
        Ambience.ensureTextures(scene);
        const m = Ambience._mgr(scene);
        const tips = o.tips.map((tp) => ({ x: tp.x, y: tp.y, next: 1 + Math.random() * 5 }));
        const drops = [];
        const splash = (x, y) => {
            const r = scene.add.image(x, y, 'amRipple').setScale(0.3).setAlpha(0.7).setDepth(o.depth || 4);
            scene.tweens.add({ targets: r, scaleX: 1.2, scaleY: 1.2, alpha: 0, duration: 520, ease: 'Sine.easeOut', onComplete: () => r.destroy() });
            for (let i = 0; i < 3; i++) {
                const d = scene.add.image(x, y, 'amDot').setTint(0xcfe9ff).setScale(0.8).setDepth(o.depth || 4).setAlpha(0.9);
                scene.tweens.add({
                    targets: d, x: x + Phaser.Math.Between(-12, 12), y: y - Phaser.Math.Between(8, 18), alpha: 0, duration: 320,
                    ease: 'Quad.easeOut', onComplete: () => d.destroy(),
                });
            }
        };
        m.items.push((dt) => {
            for (let i = 0; i < tips.length; i++) {
                const tp = tips[i];
                tp.next -= dt;
                if (tp.next <= 0) {
                    tp.next = 2 + Math.random() * 6;
                    const img = scene.add.image(tp.x, tp.y, 'amDrop').setDepth(o.depth || 4).setAlpha(0.9);
                    drops.push({ img, vy: 0, landY: o.landY - Phaser.Math.Between(0, 6) });
                }
            }
            for (let i = drops.length - 1; i >= 0; i--) {
                const d = drops[i];
                d.vy += 620 * dt;
                d.img.y += d.vy * dt;
                if (d.img.y >= d.landY) { splash(d.img.x, d.landY); d.img.destroy(); drops.splice(i, 1); }
            }
        });
    }
}

/** Para testes: força a hora (0–24) em vez do relógio real. undefined = relógio. */
Ambience.hourOverride = undefined;
