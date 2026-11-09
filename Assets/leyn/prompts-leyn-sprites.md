# Sprites do Leyn (corpo inteiro, pixel art) — pacote de prompts

4 animações de 5 quadros cada: **soco, chute, estocada e fusão com a alma**.
Os prompts estão em inglês (o gerador entende melhor); as explicações, em português.

## O que cobre e o que fica de fora

| Folha | Animação | Onde entra no jogo |
|---|---|---|
| 1 | Soco | Luta 2D — teclas J, K e L (a mesma animação, com 3 velocidades e danos) |
| 2 | Chute | Luta 2D — teclas U, I e O (hoje não têm sprite nenhum) |
| 3 | Estocada | Cena do golpe de observação (2 estocadas no Malik, a 1ª resistida, a 2ª acerta) |
| 4 | Fusão com a alma | `fundirAlmaComLeyn` — a alma do viajante entra no Leyn antes da luta |

Ficam de fora (não pediu agora, mas a luta 2D usa e ainda não tem arte): andar, pulo, agachar, defesa, levar dano, nocaute, vitória e a provocação (Enter). Se quiser, escrevo esses prompts na sequência.

## Por que o formato é diferente do pacote do Malik

O Malik era busto, então 5 retratos numa folha só ficavam bons. O Leyn é **corpo inteiro** e aparece na tela com ~620px de altura. Cinco corpos inteiros lado a lado em 1536px dão ~300px por boneco — foi daí que veio a perda de qualidade (os quadros do soco têm ~460px e são ampliados ~1,3x; a estocada tem só 320px).

Por isso: **3 poses por imagem** (1536×1024), cada boneco ocupando quase toda a altura, ~700px. Cada animação de 5 quadros = **2 imagens** (quadros 1-3 e quadros 4-5). Total: 8 imagens.

## Como usar

1. **Primeira mensagem (chat novo):** anexe como referência de design `leyn-soco-04.png` (a pose de impacto, mostra o design completo) e 1 quadro do `leyn-idle.png`. Cole o **BLOCO MESTRE** + o prompt "Folha 1 — imagem A".
2. **Mensagens seguintes (mesmo chat):** cole só o prompt da imagem. Se ele começar a derivar o design (cabelo, armadura, cor do olho), anexe a referência de novo e cole o mestre outra vez.
3. Baixe o arquivo original (nada de print nem JPG), tire o fundo no Photoroom **sem redimensionar** e me mande. Eu recorto, nivelo escala e linha do chão, e ligo no código.
4. **Folha 3:** anexe também o `leyn-estocada.png` atual como referência da arma (a lâmina e o brilho devem seguir o que já existe — só em resolução maior).
5. **Folha 4:** o `leyn-pose-olhando-para-cima.png` combina com o quadro 1 (olhando pra cima, à espera) — pode anexar como referência.

---

## BLOCO MESTRE (colar na primeira mensagem, junto com a Folha 1)

```
I am building a 2D fighting-game character. I will ask for several animations, each made of 5 frames, delivered as TWO images per animation (frames 1-3, then frames 4-5). Keep the character identical in every image.

OUTPUT FORMAT: one image, 1536x1024 landscape. FULL-BODY poses, side view, standing in a row left to right, with wide empty white gaps between them so they can be cut apart. Each full-body pose fills about 90% of the canvas height, head to boots, and the lowest boot of the grounded foot sits on the same invisible ground line in every pose (about 95% of the canvas height). Use the SAME scale for every pose in every image: in the neutral guard stance the character is about 85% of the canvas height, and lunging or kicking poses simply get wider, never smaller. If a pose is wide, keep it fully inside its own third of the canvas — never overlap a neighbor. When an image has only 2 poses, put them in the left two thirds and leave the right third empty.

ALL POSES FACE RIGHT (the opponent is to the right).

STYLE: detailed dark-fantasy pixel art, crisp visible pixel edges, painterly shading, high resolution — the exact rendering style of the attached reference images. Limited palette: black and charcoal armor, gold-bronze trim lines (#C4A35A), a pale face, tiny crimson red only in the eyes and the collar gem. Attack energy is DARK VIOLET (deep purple with a thin lighter edge), never red.

CHARACTER — LEYN: a tall, lean warrior. Very long, wild, black hair that streams behind him, long bangs over a pale face, sharp glowing RED eyes. Black layered plate armor covered in thin gold-bronze filigree cracks and trim lines: segmented pauldrons, armored arms ending in black gauntlets, a belt with a small leather pouch, armored thighs and greaves, black boots with gold-trimmed straps. A small red gem brooch at the collar. A long tattered black cape with ragged shredded edges that always reacts to movement. A sword is worn on his back with its dark grip and pommel rising behind his head (the sword stays sheathed unless the pose says otherwise).

RULES: exactly the same design, proportions, face, hair length, armor details and pixel density as the attached references in every pose. The character's head is always the same size relative to the body. Dynamic poses must look like consecutive frames of ONE smooth animation (same person, same camera distance, same ground line).

BACKGROUND: solid flat pure white (#FFFFFF), no gradient, no floor line, no cast shadow, no ground effects, no frame, no border. No text, no letters, no numbers, no UI, no watermark.
```

---

## Folha 1 — Soco (J / K / L)

Mesma animação pros 3 golpes; no jogo muda só a velocidade (140 / 180 / 230 ms por quadro) e o dano. O dano acontece nos **quadros 3 e 4**, então o 4 precisa ser o momento de impacto bem claro.

**Imagem A — quadros 1 a 3**

```
SHEET 1A — PUNCH, frames 1 to 3 of 5 (three full-body poses in one row, left to right). Same character and style as described.
1. Neutral fighting guard: knees slightly bent, weight on the rear leg, both gauntleted fists raised near the chin, elbows tucked in, eyes locked on the opponent to the right, cape hanging behind him.
2. Wind-up: shoulders rotating backward, the rear fist drawn back beside the ribs, the lead hand extended as a guard, torso coiled, knees bent deeper, cape swinging backward.
3. Strike begins: hips and shoulders snapping forward, the rear foot pivoting on its toes, the punching arm halfway extended at chest height, first faint dark-violet energy streaks trailing behind the fist, hair whipping back.
```

**Imagem B — quadros 4 e 5**

```
SHEET 1B — PUNCH, frames 4 and 5 of 5 (two full-body poses in the left two thirds of the canvas, right third empty). Same character, style, scale and ground line as sheet 1A.
4. IMPACT: the punching arm fully extended straight forward at chest height, fist clenched, dark-violet energy streaks and a small thin shock ring around the fist, front knee deeply bent, torso leaning forward, rear leg straight and braced, cape and hair streaming violently backward.
5. Recovery: the arm snapping back toward the guard, torso straightening, a few fading dark-violet energy wisps near the fist, cape settling, returning toward the neutral guard stance.
```

| Quadro | Arquivo | Observação |
|---|---|---|
| 1–5 | `leyn-soco-01.png` … `leyn-soco-05.png` | substituem os atuais; quadros ativos (hitbox) = 3 e 4 |

---

## Folha 2 — Chute (U / I / O)

Mesma lógica do soco: uma animação, 3 velocidades. Dano nos **quadros 3 e 4**.

**Imagem A — quadros 1 a 3**

```
SHEET 2A — FRONT KICK, frames 1 to 3 of 5 (three full-body poses in one row, left to right). Same character and style as described.
1. Neutral fighting guard: knees slightly bent, weight on the rear leg, both fists raised near the chin, eyes locked on the opponent to the right, cape hanging behind him.
2. Chamber: the lead knee lifted high toward the chest, shin folded back, both hands up in guard, the standing leg planted, torso leaning back slightly, cape swinging forward.
3. Kick launches: the shin whipping forward, the leg half extended at waist height, hips rotating, the standing foot pivoting, first faint dark-violet energy streaks behind the boot.
```

**Imagem B — quadros 4 e 5**

```
SHEET 2B — FRONT KICK, frames 4 and 5 of 5 (two full-body poses in the left two thirds of the canvas, right third empty). Same character, style, scale and ground line as sheet 2A.
4. IMPACT: the kicking leg fully extended in a straight horizontal front kick at hip-to-chest height, the sole of the boot pointing right, a dark-violet energy arc following the whole leg and a small shock ring at the boot, torso leaning back for balance, arms out for counterbalance, cape flared wide.
5. Recovery: the leg retracting with the knee still raised, a few fading dark-violet energy wisps, torso straightening, cape settling, about to land back into the guard.
```

| Quadro | Arquivo | Observação |
|---|---|---|
| 1–5 | `leyn-chute-01.png` … `leyn-chute-05.png` | novos; quadros ativos = 3 e 4 |

---

## Folha 3 — Estocada (cena do golpe de observação)

Aparece 2 vezes na cena: a 1ª o Malik resiste, a 2ª acerta de vez. Toca em ~1,4s no total. **Anexe o `leyn-estocada.png` atual** pra manter a espada igual.

**Imagem A — quadros 1 a 3**

```
SHEET 3A — SWORD THRUST, frames 1 to 3 of 5 (three full-body poses in one row, left to right). Same character and style as described. The weapon is the sword that is normally worn on his back; copy the blade and hilt design from the attached estocada reference if one is attached.
1. Ready: standing in a low guard, one hand rising to grip the dark sword hilt that rises behind his head, eyes locked forward on the opponent to the right, cape hanging.
2. Draw: the sword being pulled from his back in a wide overhead arc, the blade partially visible and catching a thin gold-white glint along its edge, cape swinging, hair flowing.
3. Lunge wind-up: the blade brought back beside his hip pointing forward, body dropping low, the front foot stepping forward, weight shifting, the gold-white glint running along the blade.
```

**Imagem B — quadros 4 e 5**

```
SHEET 3B — SWORD THRUST, frames 4 and 5 of 5 (two full-body poses in the left two thirds of the canvas, right third empty). Same character, style, scale and ground line as sheet 3A.
4. THRUST (impact): a deep lunge, the front knee bent about 90 degrees, the rear leg straight and braced, the arm fully extended with the sword pointing straight forward at chest height, a long bright gold-white streak along the whole blade and a small flash at the tip, hair and cape streaming violently backward.
5. Recovery: still low in the lunge, the blade starting to lower, the streak fading into a few sparks, the body beginning to rise out of the lunge, cape settling.
```

| Quadro | Arquivo | Observação |
|---|---|---|
| 1–5 | `leyn-estocada-01.png` … `leyn-estocada-05.png` | substituem o `leyn-estocada.png` (a tira de 1536×320) |

---

## Folha 4 — Fusão com a alma do viajante

No jogo, a alma (um pequeno escudo vermelho) voa da caixa até o peito do Leyn em ~1,3s; aos ~1,0s ele brilha em branco; aos ~1,9s a luta começa. **A alma é desenhada pelo código**, então os quadros mostram só a **reação** do Leyn e a luz saindo do peito — sem nenhum objeto de alma separado.

**Imagem A — quadros 1 a 3**

```
SHEET 4A — SOUL FUSION, frames 1 to 3 of 5 (three full-body poses in one row, left to right). Same character and style as described. In this sequence an invisible spirit flies into his chest from the right; do NOT draw any separate object, shape or heart — only his reaction and the light that comes from his own body.
1. Waiting: standing in a calm, quiet stance, head turned slightly up and toward the right, the red eyes following something approaching, arms loose at his sides, cape still.
2. Opening: his chest opened, shoulders back, both arms spreading slightly outward and down with open palms, the red collar gem glowing brighter, tiny crimson light particles drifting toward his chest from the right.
3. Contact: a blinding white-gold glow blooming from the center of his chest (soft light, no defined shape), head snapping back, thin crimson and gold light veins radiating across his armor, arms thrown back, cape lifting.
```

**Imagem B — quadros 4 e 5**

```
SHEET 4B — SOUL FUSION, frames 4 and 5 of 5 (two full-body poses in the left two thirds of the canvas, right third empty). Same character, style, scale and ground line as sheet 4A.
4. Surge: head thrown back looking up, arms flung wide and slightly down with clenched fists, a column of crimson-and-gold aura rising around him, hair and cape blown violently upward, the red eyes blazing, glowing embers rising, the gold filigree on his armor burning bright.
5. Fused: standing back in his fighting stance (both fists raised near the chin, knees slightly bent), head forward, glaring to the right at the opponent; his gold filigree lines now glow with a faint crimson light, the eyes a deeper brighter red, a few faint crimson-gold aura wisps around him. Calm, powerful, finished.
```

| Quadro | Arquivo | Momento (aprox.) |
|---|---|---|
| 1 | `leyn-fusao-01.png` | 0–600ms — a alma começa a voar |
| 2 | `leyn-fusao-02.png` | 600–1000ms — abre o peito |
| 3 | `leyn-fusao-03.png` | 1000–1250ms — contato + flash branco do código |
| 4 | `leyn-fusao-04.png` | 1250–1600ms — surto |
| 5 | `leyn-fusao-05.png` | 1600ms em diante — pronto pra luta |

---

## Checagem de resolução (faça antes de mandar pra mim)

O que decide se o Leyn fica "do mesmo nível" do idle atual é quantos pixels o boneco tem na imagem que você baixa. Medi o idle: o rosto dele (do olho ao queixo) tem ~33px e o boneco inteiro ~650px. O soco que veio com 5 poses numa imagem só tinha rosto de ~26px e boneco de ~447px — por isso parece "mais mole" mesmo depois de eu acertar o tamanho.

Teste rápido, em qualquer editor de imagem, no arquivo original (antes do Photoroom):

| O que medir | Mínimo pra bater com o idle |
|---|---|
| Altura do boneco em guarda (do topo do cabelo/espada até a bota) | **650px** ou mais |
| Do olho ao queixo | **33px** ou mais |

Se vier abaixo disso, gere de novo em **duas imagens (3 poses + 2 poses)** como descrito acima, nunca as 5 numa imagem só. A imagem da estocada que veio em 3+2 tinha 745–795px e passa com folga.

---

## Dicas rápidas

- **Linha do chão:** o que mais estraga a animação é o pé mudar de altura de um quadro pro outro. Se algum quadro sair com o boneco "flutuando", peça: *"same ground line as the previous pose, lowest boot at 95% of the height"*. Eu também acerto isso na hora de recortar.
- **Escala entre as duas imagens de uma animação:** se a imagem B vier com bonecos maiores ou menores que a A, tudo bem — eu igualo pelo tamanho da cabeça. O que não dá pra consertar é o desenho mudar (cabelo, armadura), aí vale regerar.
- **Sombra no chão ou brilho no fundo:** se vier, peça *"no cast shadow, flat #FFFFFF background, no glow bleeding into the background"*.
- **Energia violeta/dourada:** os efeitos são o que mais sofre ao tirar o fundo branco. Se saírem muito claros e lavados, peça *"more saturated, darker violet"* em vez de pedir menos brilho.
- Gere sempre no tamanho máximo e **não passe por compressão** (print de tela, WhatsApp, JPG).
