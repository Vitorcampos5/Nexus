/* =====================================================================
   StoryPanel — caixa de texto de história para cenas de ação (GameScene
   e, se quiser, CaveScene). Mesmo visual e mesmo controle do painel de
   leitura da biblioteca (LibraryScene.openReading): páginas avançadas
   com E (ou o botão E do toque), ESC fecha.

   POR QUE UMA PEÇA À PARTE
   -------------------------
   A biblioteca tem o painel embutido na própria cena. As cenas de ação
   precisam do mesmo comportamento (travar o personagem, avançar página,
   rodar uma ação ao fechar), e copiar o bloco de novo é exatamente o
   tipo de duplicação que o resto do projeto já tentou eliminar
   (PlayerController, Enemy, Scenery). Quem usa só precisa:

       this.storyPanel = new StoryPanel(this, {
           interactKey: this.interactKey,
           consumeTouch: () => RosebudTouch.consumir('interactPress'),
       });
       this.storyPanel.open('Título', ['página 1', 'página 2'], () => { ... ao fechar ... });
       // no update(): chamar storyPanel.update() ANTES de qualquer zona de
       // interação, e tratar storyPanel.isOpen como "diálogo aberto"
       // (congelar movimento/ataque, não atualizar zonas).

   Fica ACIMA do filtro de dia/noite (depth 999) e preso à câmera
   (scrollFactor 0). Textos próprios do jogo, sem asset externo.
   ===================================================================== */

class StoryPanel {
    /**
     * @param {Phaser.Scene} scene
     * @param {object} cfg
     * @param {Phaser.Input.Keyboard.Key} cfg.interactKey  Tecla E já criada pela cena.
     * @param {() => boolean} [cfg.consumeTouch]  Ponte pro botão E do toque
     *        (ex.: `() => RosebudTouch.consumir('interactPress')`). Ausente = só teclado.
     */
    constructor(scene, cfg) {
        this.scene = scene;
        this.interactKey = cfg.interactKey;
        this.consumeTouch = cfg.consumeTouch || (() => false);
        this.isOpen = false;
        this.pages = [];
        this.index = 0;
        this.onComplete = null;

        const cam = scene.cameras.main;
        const w = Math.min(560, cam.width - 40);
        const h = 220;
        const cx = cam.width / 2, cy = cam.height / 2;
        const D = StoryPanel.DEPTH;

        this.bg = scene.add.rectangle(cx, cy, w, h, 0x14101f, 0.92)
            .setScrollFactor(0).setDepth(D).setStrokeStyle(2, 0xc9b98a).setVisible(false);
        this.title = scene.add.text(cx, cy - h / 2 + 22, '', {
            fontSize: '18px', fill: '#f3d9a4', fontStyle: 'bold',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 1).setVisible(false);
        this.text = scene.add.text(cx, cy, '', {
            fontSize: '14px', fill: '#e8e0d8', align: 'center', wordWrap: { width: w - 48 },
        }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 1).setVisible(false);
        this.hint = scene.add.text(cx, cy + h / 2 - 18, 'Pressione E para continuar — ESC para fechar', {
            fontSize: '12px', fill: '#b8a9c9', fontStyle: 'italic',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 1).setVisible(false);
        this.parts = [this.bg, this.title, this.text, this.hint];

        this._onEsc = () => { if (this.isOpen) this.close(); };
        scene.input.keyboard.on('keydown-ESC', this._onEsc);
        this._onShutdown = () => {
            scene.input.keyboard.off('keydown-ESC', this._onEsc);
            this.isOpen = false;
        };
        scene.events.once('shutdown', this._onShutdown);
    }

    /** Abre o painel. `onComplete` roda ao FECHAR (por E na última página ou por ESC). */
    open(title, pages, onComplete) {
        if (!pages || !pages.length) return;
        this.isOpen = true;
        this.pages = pages;
        this.index = 0;
        this.onComplete = onComplete || null;
        this.title.setText(title);
        this.text.setText(pages[0]);
        this.hint.setText(pages.length > 1 ? 'Pressione E para continuar — ESC para fechar' : 'Pressione E para fechar');
        this.parts.forEach((o) => o.setVisible(true));
    }

    /** Chamar uma vez por frame. Retorna true enquanto o painel estiver aberto. */
    update() {
        if (!this.isOpen) return false;
        if (Phaser.Input.Keyboard.JustDown(this.interactKey) || this.consumeTouch()) this._advance();
        return this.isOpen;
    }

    _advance() {
        this.index++;
        if (this.index >= this.pages.length) { this.close(); return; }
        this.text.setText(this.pages[this.index]);
        if (this.index === this.pages.length - 1) this.hint.setText('Pressione E para fechar');
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.parts.forEach((o) => o.setVisible(false));
        if (this.onComplete) {
            const cb = this.onComplete;
            this.onComplete = null;
            cb();
        }
    }
}

/** Acima do filtro de dia/noite (999) da GameScene, igual aos efeitos de luz. */
StoryPanel.DEPTH = 1010;   // acima das luzes aditivas do Ambience (1000) e dos números de combate (1002)
