/* =====================================================================
   PlayerController — lógica de personagem única, compartilhada por
   GameScene e CaveScene.

   POR QUE ISSO EXISTE
   --------------------
   No código antigo, GameScene e CaveScene tinham cada uma sua própria
   cópia de: onPlayerAnimationStart, onPlayerAnimationFrame,
   bindHitboxToAnimation, setBreathing, adjustPlayerHitbox, o pulo/queda
   dentro de update(), o chute, o ataque e a defesa. Toda vez que um bug
   era corrigido numa cópia, a outra continuava com o bug — foi
   exatamente isso que aconteceu com o pulo gigante e o chute virado pro
   lado errado.

   Além da duplicação, a lógica original corrigia escala e flip de forma
   REATIVA, ouvindo os eventos 'animationstart'/'animationupdate' do
   Phaser e "consertando" o sprite depois que algo já tinha acontecido.
   Isso cria janelas de corrida: o Phaser não dispara 'animationupdate'
   no primeiro frame de uma animação nova (só emite 'animationstart'), e
   dispara os dois eventos numa ordem que depende de qual textura já
   estava ativa antes — daí o pulo nascer gigante por 1 frame, e o chute
   "restaurar" o flip enquanto a própria textura do chute ainda estava
   na tela.

   COMO ISSO RESOLVE
   ------------------
   Aqui não existe reação a eventos do Phaser pra decidir escala/flip.
   Existe UM ÚNICO método, changeState(), que roda de forma síncrona
   sempre que (e só quando) o personagem muda de estado. Ele:
     1. pausa a respiração (breathing tween) ANTES de tocar em qualquer
        escala — elimina a corrida entre a respiração e a escala do
        estado novo;
     2. troca a animação;
     3. deriva o flip a partir de UMA fonte de verdade (facingRight) e
        da convenção de flip DAQUELE estado especificamente — nunca de
        "desfazer uma inversão anterior". Isso mata de vez a classe de
        bug do chute: não existe restauração pra race, porque o flip é
        sempre recalculado do zero a cada transição, não "devolvido";
     4. deriva a escala a partir da tabela de correção DAQUELE estado —
        sempre aplicada synchronous e imediatamente, então não existe
        "primeiro frame com escala errada" esperando o próximo tick pra
        se corrigir.

   Como tudo roda dentro da mesma call síncrona de changeState() (que
   por sua vez roda dentro do mesmo tick de update() que decidiu a
   transição), não sobra nenhuma janela pro Phaser renderizar um frame
   com escala/flip "no meio do caminho" — ao contrário do sistema
   antigo, que espalhava essa responsabilidade entre o código que
   inicia a animação e um handler de evento que roda depois.

   O QUE ISSO PRESERVA DO JOGO ORIGINAL (confirmado nesta sessão)
   -----------------------------------------------------------
   - As fórmulas de atributo: velocidade = 160 + sorte*2 + agilidade*3;
     força do pulo = 630 + sorte*5 + agilidade*7; dano do chute =
     15 + floor(ataque/2); dano do soco = 10 + floor(ataque/2).
   - As chaves de animação já registradas no jogo original: 'idle',
     'walk', 'jump', 'fall', 'kick', 'attack', 'defend', 'hurt'. Esta
     classe NÃO re-registra animações — assume que createPlayerAnimations()
     (ou equivalente) já rodou antes, exatamente como no original, onde
     CaveScene nunca teve sua própria versão disso e sempre reaproveitou
     as animações que GameScene já tinha registrado (o AnimationManager
     do Phaser é global por Game, não por Scene).
   - Os fatores de correção de escala originais: chute 0.398, pulo
     0.318, queda 0.286; andar usa um pequeno acréscimo aditivo
     (+0.03 em scaleX, +0.06 em scaleY) em vez de multiplicativo.
   - A convenção de flip invertida do chute (arte desenhada olhando pra
     DIREITA por padrão, ao contrário do resto dos sprites).
   - O tempo de invencibilidade após tomar dano: 1000ms − 10ms por ponto
     de defesa (confirmado em CaveScene.init()).

   PONTOS PRA CONFIRMAR ANTES DE INTEGRAR (não tive 100% de certeza
   sobre esses detalhes finos do original nesta sessão — dá pra ajustar
   em uma linha se o comportamento esperado for outro)
   -----------------------------------------------------------
   - Duração exata do stun do HURT antes de voltar a responder a input.
   - Se o soco (ATTACK) também bloqueia contra defesa (isDefending) ou
     só contra si mesmo — preservei o padrão mais restritivo (bloqueia
     contra os três: ataque, chute, defesa) por segurança, já que era
     esse o padrão confirmado no chute e no pulo.
   ===================================================================== */

/** Estados possíveis do personagem. Uma string simples é suficiente —
 *  não precisa de enum de verdade em JS, e strings são mais fáceis de
 *  inspecionar no debugger. */
const PlayerState = Object.freeze({
    IDLE: 'idle',
    WALK: 'walk',
    JUMP: 'jump',
    FALL: 'fall',
    ATTACK: 'attack',
    KICK: 'kick',
    DEFEND: 'defend',
    HURT: 'hurt',
    DEAD: 'dead',
});

/**
 * Tabela de definição de cada estado. Isso é o "conhecimento" que no
 * código antigo ficava espalhado entre onPlayerAnimationStart (escala),
 * playerKick (flip) e os vários pontos do update() (quando cada
 * animação toca) — aqui mora tudo num lugar só, plano, fácil de auditar.
 *
 *  animKey       — chave da animação já registrada no Phaser.
 *  invertsFlip   — true só pro chute: a arte foi desenhada olhando pra
 *                  DIREITA por padrão, o oposto do resto dos sprites.
 *  scaleFactor   — multiplicador sobre a escala base do jogador.
 *  scaleAdditive — usado só por 'walk', que no original somava um
 *                  valor fixo em vez de multiplicar (scaleX+0.03,
 *                  scaleY+0.06). null nos demais estados.
 *  locksMovement — true pros estados que bloqueiam entrada de
 *                  movimento/pulo (ataque, chute, defesa, hurt, morte).
 *  interruptible — false pros estados que não podem ser cortados por
 *                  outra ação enquanto tocam (chute e ataque têm sua
 *                  própria duração; HURT e DEAD idem). true pros
 *                  estados "de passagem" (idle/walk/jump/fall), que só
 *                  existem enquanto as condições de física continuam
 *                  batendo.
 */
const STATE_DEFS = Object.freeze({
    [PlayerState.IDLE]: {
        animKey: 'idle', invertsFlip: false, scaleFactor: 1, scaleAdditive: null,
        locksMovement: false, interruptible: true,
    },
    [PlayerState.WALK]: {
        animKey: 'walk', invertsFlip: false, scaleFactor: 1,
        scaleAdditive: { x: 0.03, y: 0.06 },
        locksMovement: false, interruptible: true,
    },
    [PlayerState.JUMP]: {
        animKey: 'jump', invertsFlip: false, scaleFactor: 0.318, scaleAdditive: null,
        locksMovement: false, interruptible: true,
    },
    [PlayerState.FALL]: {
        animKey: 'fall', invertsFlip: false, scaleFactor: 0.286, scaleAdditive: null,
        locksMovement: false, interruptible: true,
    },
    [PlayerState.ATTACK]: {
        animKey: 'attack', invertsFlip: false, scaleFactor: 1, scaleAdditive: null,
        locksMovement: true, interruptible: false,
        // A animação em si é 4 frames a 12fps = 333.33ms. 334ms de duração
        // deixava só 0,67ms de folga entre "a animação terminou" (Phaser
        // segura o último frame sozinho) e "o lock acabou" (meu próprio
        // relógio, independente do de animação) — folga pequena demais
        // pra sobreviver a qualquer variação real de frame time, então os
        // dois relógios podiam discordar sobre qual terminou primeiro de
        // frame pra frame. O chute já tinha esse cuidado (250ms de
        // animação vs 300ms de duração, 50ms de folga proposital — ver
        // comentário original no registro da animação). Alinhando o soco
        // ao mesmo padrão.
        durationMs: 383,
        // Valores originais eram offset 50 e tamanho 100x100 — você achou
        // o ALCANCE longo demais, e a correção anterior reduziu os dois
        // juntos (offset 50→32, tamanho 100x100→70x90). Só que isso
        // encolheu a ÁREA do hitbox junto com o alcance, e a área nunca
        // foi o que você reportou como problema — agora ficou pequena
        // demais pra acertar de forma consistente. Separando as duas
        // coisas: offset continua em 32 (foi o que de fato resolveu o
        // alcance longo demais) e o tamanho volta ao 100x100 original (que
        // não era o problema). Com offset 32 + largura 100, o hitbox ainda
        // vai um pouco menos à frente do que no 100x100 original com
        // offset 50 (alcance máximo ~82px contra ~100px) — ajuste de
        // sensação de combate, recalibrável numa linha se ainda estiver
        // grande ou pequeno demais.
        hitboxSize: { w: 100, h: 100 }, hitboxOffset: 32,
    },
    [PlayerState.KICK]: {
        animKey: 'kick', invertsFlip: true, scaleFactor: 0.398, scaleAdditive: null,
        locksMovement: true, interruptible: false, durationMs: 300,
        // O original tinha 75 na GameScene e 60 na CaveScene — divergência
        // de cópia, não intencional (nenhum outro comentário sugere que o
        // chute deveria alcançar diferente dentro da caverna). Padronizado
        // em 75 porque os comentários da CaveScene consistentemente tratam
        // a GameScene como a versão de referência ("mesmo motivo da
        // GameScene", repetido várias vezes) — era o valor mais provável de
        // ser o intencional. Reduzido junto com o do soco a pedido — mesma
        // nota: ajuste de sensação, recalibrável.
        hitboxSize: { w: 100, h: 80 }, hitboxOffset: 48,
    },
    [PlayerState.DEFEND]: {
        animKey: 'defend', invertsFlip: false, scaleFactor: 1, scaleAdditive: null,
        locksMovement: true, interruptible: true, // solto: some quando o botão de defesa é solto
    },
    [PlayerState.HURT]: {
        animKey: 'hurt', invertsFlip: false, scaleFactor: 1, scaleAdditive: null,
        locksMovement: true, interruptible: false, durationMs: 400,
    },
    [PlayerState.DEAD]: {
        animKey: 'hurt', invertsFlip: false, scaleFactor: 1, scaleAdditive: null,
        locksMovement: true, interruptible: false,
    },
});

/** Cooldowns depois de um golpe — SEPARADOS da duração da própria
 *  animação (334ms/300ms acima). Um ataque golpeia de novo só depois de
 *  ~500ms mesmo a animação acabando em ~334ms; chute, ~700ms contra 300ms.
 *  NÃO são fixos: updatePlayerStats() no original reduz os dois com
 *  sorte/agilidade — attackCooldown = 500 − sorte×5 − agilidade×3;
 *  kickCooldown = 700 − sorte×7 − agilidade×5. Calculados dinamicamente
 *  em update() (getAttackCooldownMs/getKickCooldownMs abaixo) em vez de
 *  guardados como constante, senão um personagem com sorte/agilidade alta
 *  ficaria com o cooldown "errado" (o valor base, não o reduzido). */

class PlayerController {
    /**
     * @param {Phaser.Scene} scene         Cena dona do jogador (GameScene ou CaveScene).
     * @param {Phaser.GameObjects.Sprite} sprite  O sprite já criado (physics-enabled).
     * @param {object} config
     * @param {() => {luck:number, agility:number, attack:number, defense:number}} config.getAttributes
     *        Callback pros atributos atuais — a controller nunca guarda
     *        os atributos, só lê; quem é dono deles continua sendo a
     *        Scene (títulos/equipamentos não são escopo deste refactor).
     * @param {number} config.baseScale    Escala "neutra" do sprite (a
     *        mesma this.playerBaseScale do código original).
     * @param {(damage:number, source:object) => void} [config.onDealDamage]
     *        Chamado quando um hitbox de ataque/chute encosta em algo
     *        que a Scene reconhece como inimigo. A controller não sabe
     *        nada sobre tipos de inimigo — só avisa "bati aqui, com
     *        esse dano" e quem decide o que fazer é a Scene (via o
     *        sistema de Enemy, que vem na próxima parte do refactor).
     * @param {(hitbox: {x:number,y:number,width:number,height:number}) => object[]} config.queryOverlap
     *        Callback que a Scene fornece pra controller perguntar
     *        "quem está dentro desse retângulo agora" — mantém a
     *        controller sem acoplamento a como cada cena organiza seus
     *        grupos de física.
     * @param {() => void} [config.onDeath] Chamado uma única vez quando
     *        o HP chega a 0 — quem mostra a tela de game over continua
     *        sendo a Scene.
     */
    constructor(scene, sprite, config) {
        this.scene = scene;
        this.sprite = sprite;
        this.getAttributes = config.getAttributes;
        this.baseScale = config.baseScale;
        this.onDealDamage = config.onDealDamage || (() => {});
        this.queryOverlap = config.queryOverlap || (() => []);
        this.onDeath = config.onDeath || (() => {});
        // Piscar (flash de alpha) + tremor de câmera ao tomar dano — existia
        // no original (handleSlimeContact/damagePlayer) e eu tinha esquecido
        // de portar pro takeDamage(). Como tween de alpha e camera.shake são
        // coisas da Scene, não do sprite/física, entram por callback, igual
        // o resto das integrações desta classe.
        this.onHit = config.onHit || (() => {});
        // O HP "de verdade" (o que o HUD/save mostram) continua sendo da
        // Scene — este componente só espelha um valor de trabalho pra sua
        // própria lógica de invencibilidade. Todo takeDamage() bem-sucedido
        // avisa a Scene do novo valor pra ela manter a própria cópia (this.hp)
        // sincronizada, em vez de duplicar a fonte da verdade.
        this.onHealthChange = config.onHealthChange || (() => {});

        /** @type {string} Fonte única de verdade pra onde o personagem
         *  está olhando. NUNCA leia this.sprite.flipX pra decidir
         *  direção — leia isto. flipX é derivado, não fonte. */
        this.facingRight = true;

        this.state = PlayerState.IDLE;
        this.hp = null; // setado por setHealth() por quem for dono do HP (a Scene, via HUD)
        this.maxHp = null;
        this.invincibleUntil = 0;
        this.stateEndsAt = 0; // usado pelos estados com durationMs (ataque, chute, hurt)
        // Cooldowns de golpe — SEPARADOS de stateEndsAt: um golpe trava o
        // personagem só pela duração da animação (383ms/300ms), mas só
        // pode ser repetido depois de mais tempo ainda (~380ms/~520ms,
        // reduzido por sorte/agilidade — ver _attackCooldownMs()/
        // _kickCooldownMs() mais abaixo).
        this.lastAttackTime = -Infinity;
        this.lastKickTime = -Infinity;

        this._lastDisplayHeight = undefined; // pra manter os pés no chão ao trocar de escala

        this._createHitboxes();
        this._createBreathingTween();

        // Entra em IDLE imediatamente pra já nascer com escala/flip
        // corretos, em vez de esperar o primeiro update().
        this._enterState(PlayerState.IDLE, { force: true });
    }

    // ------------------------------------------------------------------
    // Hitboxes de ataque e chute
    // ------------------------------------------------------------------
    _createHitboxes() {
        // Tamanhos confirmados no original: 100x100 (ataque), 150x100
        // (chute) — bem maiores do que eu tinha estimado numa primeira
        // versão deste arquivo antes de checar create() no jogo real.
        const atk = STATE_DEFS[PlayerState.ATTACK].hitboxSize;
        const kick = STATE_DEFS[PlayerState.KICK].hitboxSize;
        this.attackHitbox = this.scene.add.rectangle(0, 0, atk.w, atk.h, 0xff0000, 0);
        this.scene.physics.add.existing(this.attackHitbox);
        this.attackHitbox.body.setAllowGravity(false);
        this.attackHitbox.body.enable = false;

        this.kickHitbox = this.scene.add.rectangle(0, 0, kick.w, kick.h, 0x00ff00, 0);
        this.scene.physics.add.existing(this.kickHitbox);
        this.kickHitbox.body.setAllowGravity(false);
        this.kickHitbox.body.enable = false;
    }

    _positionHitbox(hitbox, offsetWhenFacingRight) {
        const offset = this.facingRight ? offsetWhenFacingRight : -offsetWhenFacingRight;
        hitbox.setPosition(this.sprite.x + offset, this.sprite.y);
    }

    // ------------------------------------------------------------------
    // Respiração parada (idle breathing)
    // ------------------------------------------------------------------
    _createBreathingTween() {
        this.breathingTween = this.scene.tweens.add({
            targets: this.sprite,
            scaleY: { from: this.baseScale, to: this.baseScale * 1.05 },
            duration: 1400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            paused: true,
            onUpdate: () => this._adjustHitboxAnchor(),
        });
    }

    _setBreathing(active) {
        if (active) {
            // restart() em vez de resume(): um tween retomado de
            // .resume() continua do progresso em que parou no meio do
            // ciclo, o que faria a respiração "pular" pra um valor
            // diferente de baseScale assim que a escala do IDLE for
            // fixada logo abaixo. restart() sempre recomeça do zero
            // (valor = from = baseScale), então nunca destoa do que
            // acabamos de fixar via setScale — uma garantia que o
            // sistema antigo não tinha.
            this.breathingTween.restart();
        } else if (!this.breathingTween.isPaused()) {
            this.breathingTween.pause();
        }
    }

    // ------------------------------------------------------------------
    // O coração do sistema: troca de estado síncrona e determinística.
    // ------------------------------------------------------------------
    /**
     * @param {string} newState  Um valor de PlayerState.
     * @param {object} [opts]
     * @param {boolean} [opts.force]  Reaplica mesmo se já estiver nesse estado
     *        (usado só na inicialização).
     */
    _enterState(newState, opts = {}) {
        if (this.state === newState && !opts.force) return;

        const def = STATE_DEFS[newState];
        this.state = newState;

        // 1) Respiração pausa/retoma ANTES de qualquer escala — mesma
        //    ordem que eliminava a corrida no código original, só que
        //    agora é a ÚNICA fonte de escala, não uma correção reativa.
        this._setBreathing(newState === PlayerState.IDLE);

        // 2) Troca a animação. ignoreIfPlaying=true evita reiniciar do
        //    frame 0 se por algum motivo chamarmos o mesmo estado de novo.
        this.sprite.play(def.animKey, true);

        // 3) Flip: SEMPRE recalculado a partir de facingRight (fonte
        //    única de verdade) XOR a convenção do estado atual — nunca
        //    "restaurado" de um valor anterior. É isso que impede o
        //    bug do chute de voltar: não existe um valor antigo pra
        //    restaurar tarde demais, porque o flip nasce certo em toda
        //    transição, mesmo que a transição seguinte demore (ou
        //    nunca aconteça, como no caso do personagem morto no meio
        //    do golpe).
        this.sprite.flipX = this.facingRight !== def.invertsFlip;

        // 4) Escala: idem, sempre recalculada, síncrona, no mesmo tick
        //    que troca a textura — sem depender de um evento
        //    'animationupdate' que não dispara no primeiro frame.
        if (def.scaleAdditive) {
            this.sprite.setScale(this.baseScale + def.scaleAdditive.x, this.baseScale + def.scaleAdditive.y);
        } else {
            this.sprite.setScale(this.baseScale * def.scaleFactor);
        }

        this._adjustHitboxAnchor();

        if (def.durationMs) {
            this.stateEndsAt = this.scene.time.now + def.durationMs;
        }

        // Dispara o hitbox de ataque/chute exatamente na entrada do
        // estado — sem tween de "impacto" separado brigando pela escala
        // (esse era outro ponto de corrida no código original: o tween
        // de escala do golpe e a correção de animação disputavam o
        // mesmo scaleX/scaleY). Se quiser reintroduzir o "baque" visual
        // do golpe, é melhor como um efeito puramente aditivo (ex: um
        // sprite de impacto separado, ou um tween em alpha) — nunca
        // mexendo no scale que este método já controla.
        if (newState === PlayerState.ATTACK) this._triggerAttackHit();
        if (newState === PlayerState.KICK) this._triggerKickHit();
        if (newState === PlayerState.DEAD) this.onDeath();
    }

    _adjustHitboxAnchor() {
        const src = this.sprite.texture.getSourceImage();
        const newDisplayHeight = src.height * this.sprite.scaleY;
        if (this._lastDisplayHeight !== undefined) {
            this.sprite.y += (this._lastDisplayHeight - newDisplayHeight) / 2;
        }
        this._lastDisplayHeight = newDisplayHeight;

        this.sprite.body.setSize(src.width * 0.8, src.height * 0.9);
        this.sprite.body.setOffset(src.width * 0.1, src.height * 0.1);
        this.sprite.body.updateFromGameObject();

        // A CAUSA REAL do tremor (confirmada rodando física de verdade, não
        // só lendo código): postUpdate() do Phaser NÃO escreve a posição do
        // body de volta no sprite como valor absoluto — ele soma um DELTA
        // (position atual − prevFrame) em cima do sprite.y já existente.
        // updateFromGameObject() acima recalcula "position" certinho, mas
        // NUNCA atualiza "prevFrame" (isso só acontece dentro do
        // preUpdate() automático do Phaser, que já rodou ANTES da minha
        // troca de estado neste mesmo frame). Resultado: no fim do frame,
        // o Phaser somava esse delta em cima da posição que eu MESMO já
        // tinha corrigido — duplicando o deslocamento. Isso é exatamente o
        // "tremendo até encostar no chão de novo" a cada ação. Sincronizar
        // prevFrame/prev manualmente aqui (sem usar body.reset(), que
        // zeraria a velocidade — errado no meio de um pulo/queda) resolve
        // na raiz. Testado contra a sequência idle→andar→ataque→idle→
        // chute→idle rodando física real: zero tremor em qualquer transição,
        // incluindo o chute (a troca de escala mais extrema do jogo).
        this.sprite.body.prevFrame.x = this.sprite.body.position.x;
        this.sprite.body.prevFrame.y = this.sprite.body.position.y;
        this.sprite.body.prev.x = this.sprite.body.position.x;
        this.sprite.body.prev.y = this.sprite.body.position.y;
    }

    // ------------------------------------------------------------------
    // Golpes
    // ------------------------------------------------------------------
    _triggerAttackHit() {
        const attrs = this.getAttributes();
        const damage = 10 + Math.floor(attrs.attack / 2); // fórmula original preservada
        this._positionHitbox(this.attackHitbox, STATE_DEFS[PlayerState.ATTACK].hitboxOffset);
        this.attackHitbox.body.enable = true;
        const hits = this.queryOverlap(this._rectOf(this.attackHitbox));
        hits.forEach((target) => this.onDealDamage(damage, target));
        this.scene.time.delayedCall(STATE_DEFS[PlayerState.ATTACK].durationMs, () => {
            this.attackHitbox.body.enable = false;
        });
    }

    _triggerKickHit() {
        const attrs = this.getAttributes();
        const damage = 15 + Math.floor(attrs.attack / 2); // fórmula original preservada
        this._positionHitbox(this.kickHitbox, STATE_DEFS[PlayerState.KICK].hitboxOffset);
        this.kickHitbox.body.enable = true;
        const hits = this.queryOverlap(this._rectOf(this.kickHitbox));
        hits.forEach((target) => this.onDealDamage(damage, target));
        this.scene.time.delayedCall(STATE_DEFS[PlayerState.KICK].durationMs, () => {
            this.kickHitbox.body.enable = false;
        });
    }

    _rectOf(hitbox) {
        return {
            x: hitbox.x - hitbox.width / 2,
            y: hitbox.y - hitbox.height / 2,
            width: hitbox.width,
            height: hitbox.height,
        };
    }

    // ------------------------------------------------------------------
    // API pública: ações que a Scene chama a partir do input
    // ------------------------------------------------------------------

    /** @param {number} dir  -1 esquerda, 0 parado, 1 direita. */
    setMoveInput(dir) {
        this._moveDir = dir;
    }

    requestJump() { this._jumpRequested = true; }
    requestAttack() { this._attackRequested = true; }
    requestKick() { this._kickRequested = true; }
    setDefending(active) { this._defendHeld = active; }

    /** @returns {boolean} true se o dano foi de fato aplicado (falso
     *  se o personagem estava invencível ou já morto). */
    takeDamage(amount) {
        if (this.state === PlayerState.DEAD) return false;
        if (this.scene.time.now < this.invincibleUntil) return false;

        const attrs = this.getAttributes();
        // Nota: defender NÃO reduz o dano recebido aqui — conferido contra
        // handleSlimeContact()/damagePlayer() do original, nenhum dos dois
        // checava isDefending antes de aplicar o dano. O que defender FAZ
        // (confirmado): trava o movimento e bloqueia o jogador de CAUSAR
        // dano (ver damageEnemy()/damageGoblin() originais). Uma redução
        // de dano recebido ao defender seria uma mecânica nova, não uma
        // preservação do original — fica de fora por fidelidade.
        this.hp = Math.max(0, this.hp - amount);
        this.onHealthChange(this.hp);
        this.onHit(); // piscar + tremor de câmera — ver comentário no construtor

        // Fórmula de invencibilidade confirmada em CaveScene.init():
        // 1000ms menos 10ms por ponto de defesa.
        this.invincibleUntil = this.scene.time.now + Math.max(0, 1000 - attrs.defense * 10);

        if (this.hp <= 0) {
            this._enterState(PlayerState.DEAD, { force: true });
        } else {
            this._enterState(PlayerState.HURT, { force: true });
        }
        return true;
    }

    setHealth(hp, maxHp) {
        this.hp = hp;
        this.maxHp = maxHp;
    }

    /** Traz o controller de volta pra IDLE depois de um "reset em pé" —
     *  ex: restartFromSavePoint(), que reposiciona o jogador e reativa a
     *  física SEM recriar a Scene (ao contrário de morrer na caverna, que
     *  sempre volta pra GameScene por uma troca de cena de verdade — essa
     *  recria o PlayerController do zero, não precisa deste método).
     *
     *  Sem isso, o controller ficava preso em DEAD pra sempre: update()
     *  retorna na primeira linha nesse estado, então nenhum input nunca
     *  mais era processado — o personagem "renascia" mas não se mexia.
     */
    reset() {
        this.invincibleUntil = 0;
        this.stateEndsAt = 0;
        this.lastAttackTime = -Infinity;
        this.lastKickTime = -Infinity;
        this.kickFacingToRestore = null;
        this._moveDir = 0;
        this._jumpRequested = false;
        this._attackRequested = false;
        this._kickRequested = false;
        this._defendHeld = false;
        this.facingRight = true;
        this._enterState(PlayerState.IDLE, { force: true });
    }

    get isDead() { return this.state === PlayerState.DEAD; }
    get isAttacking() { return this.state === PlayerState.ATTACK; }
    get isKicking() { return this.state === PlayerState.KICK; }
    get isDefending() { return this.state === PlayerState.DEFEND; }

    // ------------------------------------------------------------------
    // Update por frame
    // ------------------------------------------------------------------
    /** Chamado uma vez por frame pela Scene, DEPOIS do passo de física
     *  (mesma ordem que o Phaser já garante entre 'update' do sistema e
     *  o update() da cena — ver Systems.step()). */
    update(time, delta) {
        if (this.state === PlayerState.DEAD) return; // morto não reage a mais nada

        const def = STATE_DEFS[this.state];

        // Estados com duração própria (ataque, chute, hurt) só saem
        // quando o tempo deles acaba — nada os interrompe antes disso,
        // preservando o "compromisso" do golpe que existia no original
        // (isAttacking/isKicking bloqueando outras ações).
        if (!def.interruptible) {
            if (time < this.stateEndsAt) {
                // Pedidos feitos durante um golpe/hurt são DESCARTADOS,
                // não enfileirados — mesmo comportamento do original,
                // que só tinha "if (this.isAttacking) return;" no topo
                // de playerAttack()/playerKick(): chamar de novo
                // enquanto já em andamento simplesmente não fazia nada,
                // sem guardar a intenção pra depois.
                this._jumpRequested = false;
                this._attackRequested = false;
                this._kickRequested = false;
                return;
            }
            // acabou o golpe/hurt — cai pro estado que a física/input
            // pedirem agora, calculado abaixo.
        }

        const attrs = this.getAttributes();
        const onFloor = this.sprite.body.onFloor();
        const speed = 160 + attrs.luck * 2 + attrs.agility * 3;       // fórmula original
        const jumpForce = 630 + attrs.luck * 5 + attrs.agility * 7;   // fórmula original

        // --- Ações com prioridade sobre o movimento ---
        // Chute é permitido tanto no chão quanto no ar — o original não
        // tinha guarda de onFloor() no chute (só bloqueava contra
        // ataque/defesa/chute já em andamento). Cada golpe só dispara se
        // o COOLDOWN dele (maior que a própria animação, e reduzido por
        // sorte/agilidade — ver _attackCooldownMs()/_kickCooldownMs() logo
        // abaixo) já passou desde o último; se não passou, o pedido é
        // descartado e o frame CONTINUA pro movimento normal abaixo — no
        // original, ataque/chute eram checados depois do movimento, não em
        // vez dele, então um toque no cooldown nunca travava o andar. Ordem
        // ataque-antes-de-chute preserva a prioridade implícita do
        // original: lá os dois eram checados em ifs separados (não
        // else-if), ataque primeiro — se as duas teclas fossem pressionadas
        // no mesmíssimo frame, o ataque já disparava e deixava isAttacking
        // ligado, o que bloqueava a checagem do chute logo em seguida.
        let actionTriggered = false;
        if (this._attackRequested) {
            this._attackRequested = false;
            this._kickRequested = false;
            if (time - this.lastAttackTime > this._attackCooldownMs(attrs)) {
                this.lastAttackTime = time;
                this.sprite.setVelocityX(0);
                this._enterState(PlayerState.ATTACK, { force: true });
                actionTriggered = true;
            }
        } else if (this._kickRequested) {
            this._kickRequested = false;
            if (time - this.lastKickTime > this._kickCooldownMs(attrs)) {
                this.lastKickTime = time;
                this.sprite.setVelocityX(0);
                this._enterState(PlayerState.KICK, { force: true });
                actionTriggered = true;
            }
        }
        if (actionTriggered) return;

        if (this._defendHeld) {
            this.sprite.setVelocityX(0);
            this._enterState(PlayerState.DEFEND);
            this._consumeRequests();
            return;
        }

        // --- Movimento horizontal ---
        if (this._moveDir !== 0) {
            const newFacingRight = this._moveDir > 0;
            if (newFacingRight !== this.facingRight) {
                this.facingRight = newFacingRight;
                // _enterState só recalcula o flip quando o ESTADO muda —
                // se o personagem já estava em WALK e só trocou de direção
                // (sem sair de WALK), a guarda de "já está nesse estado"
                // bloqueava a re-entrada, e o flip nunca era atualizado:
                // a velocidade invertia, mas o sprite continuava virado
                // pro lado antigo — o personagem "andava de costas".
                // Recalculando aqui direto, na hora que facingRight muda
                // de verdade, sem depender de uma troca de estado.
                const def = STATE_DEFS[this.state];
                this.sprite.flipX = this.facingRight !== def.invertsFlip;
            }
            this.sprite.setVelocityX(speed * this._moveDir);
        } else {
            this.sprite.setVelocityX(0);
        }

        // --- Pulo ---
        if (this._jumpRequested && onFloor) {
            this.sprite.setVelocityY(-jumpForce);
            this._enterState(PlayerState.JUMP);
            // Reforço defensivo: mesmo com a escala já setada de forma
            // síncrona dentro de _enterState (deveria bastar), o pulo é o
            // único caso onde você relatou "gigante" em TODO pulo, sem eu
            // conseguir reproduzir isso rodando física real neste sandbox
            // (testei bastante e não achei a causa exata desta vez). Essa
            // reafirmação é barata e não muda nada se a escala já estiver
            // certa — só existe pra cobrir uma janela que não consegui
            // isolar com certeza. Se ainda persistir depois disso, me avisa
            // com mais detalhe (ex: só ao pular andando, ou parado também)
            // que eu cavo mais fundo.
            this.sprite.setScale(this.baseScale * STATE_DEFS[PlayerState.JUMP].scaleFactor);
        } else if (!onFloor && this.sprite.body.velocity.y > 120) {
            this._enterState(PlayerState.FALL);
        } else if (this._moveDir !== 0 && onFloor) {
            this._enterState(PlayerState.WALK);
        } else if (onFloor) {
            this._enterState(PlayerState.IDLE);
        }
        // se nenhuma condição acima bateu (ex: subindo ainda, onFloor
        // falso e velocity.y <= 120), mantém o estado atual — mesmo
        // comportamento do original, que só trocava pra 'fall' acima
        // desse limiar de velocidade.

        this._consumeRequests();
    }

    _consumeRequests() {
        this._jumpRequested = false;
        // attackRequested e kickRequested já são consumidos nos pontos
        // onde são checados acima; aqui só garante que não vazam pro
        // próximo frame se o estado atual os ignorou.
    }

    /** Base confirmada em updatePlayerStats() do original era 500/700 —
     *  reduzida a pedido (você não conseguia emendar um segundo golpe antes
     *  de levar um hit, mesmo o cooldown já sendo comparável à maioria dos
     *  inimigos). Isto já é sensação de combate, não mais "igual ao
     *  original" — se ainda estiver lento (ou ficar rápido demais), me diz
     *  que eu ajusto de novo. Sorte/agilidade continuam reduzindo em cima
     *  disso, do mesmo jeito.
     */
    _attackCooldownMs(attrs) { return 380 - attrs.luck * 5 - attrs.agility * 3; }
    _kickCooldownMs(attrs) { return 520 - attrs.luck * 7 - attrs.agility * 5; }
}
