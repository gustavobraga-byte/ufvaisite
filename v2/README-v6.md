# UFVAI — site v6

Landing page institucional do UFVAI sobre a base da v5 (hero com mar de nuvens em
canvas), com uma **revisão de controles, ícones, idioma e da foto do campus**.
Conteúdo editorial, dados e alegações científicas permanecem intactos.

**Arquivos novos nesta versão:** `v6.css` (refino visual) e `v6.js`
(comportamento dos controles novos). Os demais arquivos são os da v5; só
`index.html` e `tutorial.html` receberam marcação nova.
A v6.5 mexeu em `v6.css` (marca navy), em `tutorial.html` (detecção de
idioma/tema do computador) e trouxe `tests/check_v6.py`.

---

## O que mudou da v5 → v6

| Item | v5 | v6 |
|---|---|---|
| Controles do hero | 4 quadrados 42×42 só com ícone; rótulo aparecia no hover e o preenchimento era **vertical** | **Painel “Ajustes”** com uma **linha horizontal** por controle: ícone, nome, trilho e valor sempre visíveis |
| Feedback do slider | Medidor vertical sem número | Valor ao vivo (`65%`, `3.0×`) + `aria-valuetext` sincronizado |
| Restaurar padrões | não existia | botão **Restaurar** (volta a 65% / 3.0× / 90% / 100%) |
| Idioma / tema no topo | bolha translúcida só com ícone | **pílula com nome** (“Português”, “Tema”) a partir de 620 px e código (PT/EN) abaixo disso |
| Ícones | traços mistos (1,6–1,7 px, ópticas diferentes) | conjunto refeito em grade 24, traço 1,7, pontas arredondadas |
| Detecção de idioma | só no `i18n.js`, no fim do `<body>` (piscava em PT) | decidida **antes da primeira pintura**, com lista `navigator.languages`, `data-lang-source` e *failsafe* de 1,6 s |
| Aviso de detecção | não existia | no menu: “Detectamos **English** no seu navegador…”, some após a escolha manual |
| Menu de idiomas | lista simples | radio buttons acessíveis, cabeçalho e nome nativo com fallback CJK |
| Foto da UFV | `height` fixa + `object-fit: cover` **cortava** o prédio | moldura 16:9 com a **foto inteira** (quadro 3:2 nativo) sobre fundo desenhado; **sem corte** |
| Animação da foto | estática | *reveal* com `clip-path`, flutuação de 14 s, brilho varrendo a cada 8,5 s, selo “UFV · Campus Viçosa” |
| Tutorial | barra de 52 px com emojis (🌙, ☰) e Montserrat | mesma identidade do site: topbar de 64 px em vidro, pílulas com ícones SVG, **Inter + Lora**, seleção de idioma por extenso |
| Nuvens da hero | campo FBM contínuo (lia como **névoa**) + `mix-blend-mode: screen` | **sprites cumulus** com sombreamento volumétrico, silhueta recortada por limiar modulado e `blend: normal` |
| Sem flash de idioma | — | `html.i18n-pending` + `html.i18n-ready` (com `<noscript>` de segurança) |

## Nuvens realistas (motor novo em `hero.js`)

O campo de ruído contínuo da v5 produzia uma massa uniforme — na prática, névoa.
A v6 gera **sprites de cúmulo** uma única vez no boot e os compõe como nuvens:

1. **Campo de altura** — 12 a 17 lóbulos gaussianos (corpo) + até 22 esferas
   pequenas na borda superior (efeito *couve-flor*), aceitas só quando há massa
   embaixo (evita bolinhas soltas).
2. **Detalhe fractal** — duas oitavas de fBm somadas ao campo de altura.
3. **Silhueta** — `smoothstep` com limiar modulado por ruído (`thrNoise`), o que
   recorta uma borda irregular em vez de uma elipse lisa.
4. **Sombreamento** — luz do alto-esquerda pelo gradiente do campo de altura,
   com oclusão na base e interior fechado; cores entre sombra azulada
   `rgb(172,186,204)`, meio `rgb(232,238,245)` e topo `rgb(255,255,255)`.
5. **Contorno** — blur curto no alfa (0,9–2,4 px conforme o sprite) tira o
   aspecto de recorte de papel.

Na composição, as nuvens vivem em **três faixas de profundidade** (longe/média/perto),
derivam em parallax com o ponteiro, sobem com a rolagem e são mascaradas por um
gradiente que as mantém na faixa do horizonte. A Cobertura regula densidade,
opacidade e a altura da faixa. O tamanho dos sprites é relativo à viewport
(0,42× a 1,1×), o que impede que no celular uma nuvem vire uma faixa de névoa.

O canvas passou de `mix-blend-mode: screen` para **`normal`**: com `screen` as
sombras sumiam e a nuvem virava algodão luminoso.

## Nevoa entre as serras, noite e marca (v6.3)

**Neblina no vale.** Os sprites passaram a ser gerados com `mist: true`: lóbulos
esticados na horizontal (2,35×), baixo contraste, `blur` de 3–4 px e banda de
transição larga. A composição vive numa faixa em torno do horizonte (43%–76% da
altura) e a máscara vertical cai a zero antes do céu e antes do primeiro plano —
a névoa fica *entre* as montanhas, não sobre o céu. Em telas estreitas a faixa
desce 17% da altura e perde 12% de opacidade, para não cobrir o texto.

**Mouse espalha.** O antigo "buraco" (`destination-out`) e os wisps giratórios
foram removidos. Agora cada nuvem sofre um empurrão radial a partir do cursor
(`f²`, raio ~30% da altura), com leve dilatação e rarefação: o véu se abre
suavemente e volta ao lugar quando o ponteiro sai (estado `spread` com
interpolação de 5,5% por quadro).

**Modo escuro = anoitecer.** A foto recebe
`brightness(.42) saturate(.58) contrast(1.06) hue-rotate(-9deg)`, um véu
azul-noite em `multiply` sobre a cena e `wash` mais profundo; a neblina fica
azulada. A transição dura 1,2 s.

**Marca com gradiente.** `UFV` navy no tema claro (`#3E4660 → #2E3242 → #1E2230`, centrado no navy oficial do logo)
e branco no escuro; `AI` dourado (`#F0D074 → #C9A227 → #8A6C13`), com versão
luminosa no escuro. No hero (fundo sempre fotográfico) o `UFV` usa branco com
base azulada para manter contraste, e o `AI` mantém o dourado com brilho.

**Rolagem com animação.** Ao rolar, a cópia sobe 70 px, reduz 4,5%, ganha até
5 px de desfoque e desaparece; a foto aproxima até 1,10×; a névoa sobe 26–70 px
conforme a profundidade. Tudo respeita `prefers-reduced-motion`.

## Tutorial remodelado (v6.4)

O `tutorial.html` deixou de ter tema próprio: passou a usar o **mesmo sistema de
design do site**.

| Elemento | Antes | Agora |
|---|---|---|
| Barra do topo | 52 px, Montserrat, botões com emoji | 74 px (64/58 no responsivo), vidro + `is-solid` ao rolar, marca com gradiente, pílulas com SVG |
| Tipografia | Montserrat em tudo | **Lora** nos títulos, **Inter** no texto, mesma escala do site |
| Títulos | `border-bottom` cinza | régua dourada de 46 px acima do `h2` (motivo do site) |
| Cartões | borda fina, sem sombra | superfície + `--shadow-sm`, raio 14 px, elevação no hover |
| Avisos | cores soltas | `warn` dourado, `ok` sálvia, `danger` vinho (paleta oficial) |
| Passos | cabeçalho cinza | cabeçalho dourado, número em disco dourado |
| Prompt | fundo escuro fixo | bloco de código do site (superfície + barra dourada à esquerda) |
| Tabelas | zebra genérica | cabeçalho dourado em versalete, hover suave |
| Navegação | item com borda esquerda | barra dourada + tint, como o menu do site |

**Gatilhos e animações** agora são os do site:

- **Revelação escalonada** a cada troca de página (`.rv` + `--d` de 55 ms,
  `cubic-bezier(.22,1,.36,1)`, 0,62 s) — o mesmo `reveal` da landing;
- **Revelação por rolagem** com `IntersectionObserver` (threshold 0,14,
  `rootMargin -36px`), igual ao site;
- **Barra do topo sólida** depois de 12 px de rolagem;
- **Microelevação** em botões, cartões, passos e paginação;
- **Brilho percorrendo** a barra de progresso;
- **Pop** do check ao concluir etapa e no selo do sumário;
- **Lightbox** com fade + zoom curto, na mesma curva das figuras do site;
- Tudo desligado em `prefers-reduced-motion` e neutralizado na impressão.

## Marca navy e detecção do computador (v6.5)

**UFV navy em toda superfície clara.** A regra "navy no claro · branco no
escuro" valia só para o cabeçalho; agora vale para a marca inteira:

| Onde aparece | Tema claro | Tema escuro |
|---|---|---|
| Cabeçalho | navy | branco |
| **Hero (marca grande)** | **navy — era branco** | branco |
| Tela de boot da demo | **navy — era branco e sumia sobre o off-white** | branco |
| Capa do deck | **navy — era branco e sumia sobre o off-white** | branco |
| Barra do app na demo | **navy, via `--t-ink`** — estava invisível (`background-clip: text` sem `background-image` deixava o glifo transparente) | tinta clara do app |
| Rodapé (fundo escuro nos dois temas) | branco | branco |

A hero é a mudança maior. A foto é clara exatamente na faixa onde mora a
marca (céu, luminância relativa 0,60–0,87): o branco dava **1,1–2,2:1** de
contraste e o navy dá **5,7–11,2:1**. O véu escuro de 44 px que sustentava o
branco saiu do `UFV` — ele só manchava o céu — e ficou só no `AI` dourado,
que continua precisando dele (1,5–2,1:1 sem véu).

**O tutorial detecta o computador.** Precedência nova, decidida antes da
primeira pintura (sem flash):

| O quê | Ordem |
|---|---|
| Tema | escolha salva (`ufvai-theme`) → **`prefers-color-scheme` do SO** → claro |
| Idioma | `?lang=` na URL → escolha salva (`ufvai-lang`) → última escolha do tutorial → **lista inteira `navigator.languages`** → pt-BR |

Sem escolha gravada o tutorial **acompanha o sistema** — inclusive se o SO
trocar o tema no meio da sessão (`matchMedia(...).addEventListener('change')`);
o primeiro clique no botão **Tema** grava a escolha e encerra a detecção. A
origem fica registrada em `data-ttheme-source` e `data-lang-source`
(`saved` | `system` | `browser` | `default`).

## Lapidar três detalhes (v6.6)

**1. Rótulo da hero.** `Viçosa · Minas Gerais · Brasil` →
**`Microrregião de Viçosa · Minas Gerais · Brasil`** (o campus fica na
microrregião, não na cidade). Atualizado no `index.html` e nas 5 línguas do
`i18n.js`: *Viçosa Microrregion · Minas Gerais · Brazil* (en) ·
*Microrregión de Viçosa · Minas Gerais · Brasil* (es) ·
*Microrégion de Viçosa · Minas Gerais · Brésil* (fr) ·
*维索萨微区 · 米纳斯吉拉斯州 · 巴西* (zh).

**2. Slider "Marca" passou a funcionar.** O `hero.js` já gravava
`settings.ink` em `--wm-ink`, mas **nada no CSS consumia a variável** — era um
controle decorativo. A seção **9.1** do `v6.css` aplica

```css
.hero[data-cloud-state="ready"] .wordmark--xl {
  opacity: calc(.40 + .60 * var(--wm-ink, .9));
  transition: opacity .16s linear, transform .9s cubic-bezier(.22,1,.36,1);
}
```

piso **0,40** (no mínimo a marca continua visível sobre a foto) até **1,00**
no máximo. O `transform` mantém os 0,9 s / 0,3 s da coreografia de entrada;
só a opacidade reage em 160 ms.

**3. Slider "Nuvens" agora acrescenta nuvens de verdade.** As nuvens são
construídas uma única vez, então cada grupo ganhou uma **reserva** (`extra`:
8+7, 9+8, 7+6 no fundo e 3+4 na frente) com `rank` próprio: as nuvens base
(`rank < 0,5`) continuam sempre visíveis — o visual de partida não muda — e
`paintClouds` corta em `0,5 + 0,5·an`. A faixa do `maskField` também sobe
com a densidade (`0,36 − 0,11·an`). Medido no canvas: **43.828 → 229.689 →
252.543** pixels com alfa ≥ 128 em 65% / 280% / 500% (monotônico).

**4. Palavras da animação do mouse.** Saíram `Viçosa`, `Minas Gerais` e
`incerteza` — com os equivalentes em en/es/fr/zh (`uncertainty`,
`incertidumbre`, `incertitude`, `不确定性`, `维索萨`, `米纳斯`). As 5 listas
ficaram com 12 termos cada; o local já aparece no rótulo da hero.

Backup pré-edição: `PesquisAI/backups/site-v6-antes-lapidar-20261025/`.

## Verificação

```bash
cd v6
python3 tests/validate_v5.py   # regressão da landing (28 checks)
python3 tests/check_v6.py      # v6.5 + v6.6 (32 checks)
```

`tests/check_v6.py` abre o site em Chromium com `color_scheme` e `locale`
simulados e confirma: navy em cada superfície clara, branco no rodapé e no
tema escuro, tutorial escuro quando o SO está escuro (sem gravar a chave),
tutorial em inglês com SO em `en-US`, escolha salva vencendo o sistema, clique
gravando a escolha, o rótulo da hero nas 5 línguas, o slider Marca variando a
opacidade (0,40 → 0,94 → 1,00), a densidade de nuvens crescendo no canvas e
as palavras proibidas fora do `hero.js`. As capturas vão para
`preview/v6-checks/` (inclui `densidade-min.png`, `densidade-max.png`,
`marca-opacidade-min.png`, `marca-opacidade-padrao.png`,
`index-claro-rotulo.png`).

> O renderizador headless roda a ~2 fps por causa do canvas: as esperas de
> 1,8–2,5 s antes de ler valores computados são intencionais, e a leitura de
> pixels precisa de `window.scrollTo(0, 0)` (a animação pausa fora de tela).

> As 3 falhas de `validate_v5.py` (`hero_controls_panel`,
> `hero_front_canvas_painted`, `responsive_layout_matrix` em 320 px) são
> **pré-existentes**: reproduzidas com o `v6.css` anterior a esta versão.

## Como testar localmente

```bash
cd v6
python3 -m http.server 8000
# abra http://localhost:8000
```

O idioma inicial segue o navegador (PT, EN, ES, FR ou ZH). Para simular outro
idioma, troque a preferência em **Idioma** no topo — a escolha fica salva em
`localStorage` (`ufvai-lang`) e é compartilhada com o tutorial e a apresentação.

## Publicação

1. Copie o conteúdo desta pasta para a raiz do repositório do site (ou para
   `v2/`, se for o caso) preservando `assets/`, `prints/` e `apresentacao/`.
2. Faça commit e push para a branch publicada pelo GitHub Pages.
3. Os arquivos novos (`v6.css`, `v6.js`) precisam subir junto — sem eles o
   `index.html` funciona, mas perde o refino dos controles e da foto.

## Acessibilidade

- Controles com `aria-label`, `aria-expanded`, `aria-pressed` e foco visível.
- Painel de ajustes fecha com `Esc` e com clique fora; foco vai ao primeiro
  slider ao abrir e volta ao botão ao fechar.
- `prefers-reduced-motion`: desliga flutuação, varredura, *drift* e *reveal*.
- Contraste do selo e dos valores revisado (texto claro sobre verde-noite).
