# UFVAI — site v5 (clean)

Página única (landing) do UFVAI. Continuação direta da v4, com o **gatilho e a
animação da hero no espírito do blog do Kimi K3.1 Pro**
(`kimi.com/en/blog/kimi-k3-1-pro`): um **"mar de nuvens" interativo** em `<canvas>`
sobre a serra de Minas, com entrada escalonada e reação à rolagem e ao ponteiro.
Identidade, conteúdo e funcionalidades da v2/v4 preservados. **Nenhum asset do
Kimi é utilizado.**

**Arquivos:** `index.html` · `styles.css` (base v2) · `v5.css` (direção v5) ·
`hero.js` (cena + interações do topo) · `script.js` · `i18n.js` ·
`assets/` · `preview/` · `tests/validate_v5.py`.

---

## O que mudou da v4 → v5

| Item | v4 | v5 |
|---|---|---|
| Cena da hero | Foto + névoa só em CSS | **Canvas de nuvens vivo** por cima da foto |
| Gatilho de carga | Nenhum | `data-cloud-state: loading → ready` revela a cena |
| Entrada do texto | Imediata | **Escalonada** (eyebrow → wordmark → frase → régua → texto → CTAs) |
| "Role para explorar" | Linha vertical animada | **Chevron** quicando (estilo Kimi) |
| Interação | Parallax de rolagem | + **reação ao ponteiro** nas nuvens |
| Overflow 320px | Falhava (blockquote) | Corrigido (margem do `blockquote` zerada) |
| Validação | 22/23 | **24/24** ✅ |

## A cena do hero (canvas)

`hero.js` desenha, a ~60 fps, um **mar de nuvens** por cima da foto da Serra do
Brigadeiro:

1. **Sprite de nuvem** pré-renderizado (aglomerado de gradientes radiais brancos).
2. ~29 nuvens em duas faixas: **véus altos** (atmosfera) e **mar de nuvens** denso
   na metade inferior, ordenadas por profundidade para parallax coerente.
3. Deriva horizontal lenta em loop + oscilação vertical suave.
4. **Reação à rolagem:** as nuvens sobem e se dissipam conforme o progresso.
5. **Reação ao ponteiro:** deslocamento sutil por profundidade (camada próxima
   move mais).
6. `mix-blend-mode: screen` para integrar à luz da foto.

**Gatilho de carga:** a seção começa em `data-cloud-state="loading"` (névoa cobre
a foto, foto dessaturada/desfocada, nuvens ausentes). Quando a foto decodifica
(ou após teto de 1,6 s) vira `"ready"`: a névoa dissipa, a foto ganha foco e o
texto entra escalonado.

**Acessibilidade:** `prefers-reduced-motion` renderiza **um quadro estático** de
nuvens (sem deriva, sem parallax, texto já visível). A animação pausa quando o
hero sai da viewport ou a aba fica oculta. Nenhum texto é lido do canvas (tudo
fica no HTML, com `aria-hidden` no canvas).

## Funcionalidades preservadas da v2

- **i18n em 5 idiomas** (PT/EN/ES/FR/ZH) com detecção de idioma e `hero.scroll`
  traduzido.
- **Tema claro/escuro** persistente e espelhado no deck.
- **Demo animada** (boot → Termos → tela principal com conversa).
- FAQ em acordeão, deck de apresentação embutido, seção "Como citar", rodapé.
- Números: 174 skills · 139 datasets · 38+ fontes · 7 bases.

## Como visualizar

```bash
cd outputs-ufvai-site-v5
python3 -m http.server 8096
# http://localhost:8096
```

## Validação (24/24 ✅)

`python3 tests/validate_v5.py` (requer Playwright + Chromium):

- Rotas HTTP 200 (incl. `hero.js`, `v5.css`, assets).
- Sem overflow horizontal (desktop e mobile, **incl. 320 px**).
- Hero ocupa a viewport; foto carregada; header inicialmente transparente.
- **`hero_cloud_scene_ready`:** canvas existe, foi pintado e a cena saiu de
  `loading` para `ready`.
- Cue de rolagem não clipada e abre a demo; header vira sólido ao rolar.
- Tema escuro + persistência; 5 idiomas com `html.lang` correto.
- FAQ abre um por vez; mobile sem overflow; menu mobile + header.
- `prefers-reduced-motion`: texto completo, foto/mist estáticos, demo encurtada.
- Matriz responsiva 320→1920 px; zero erros de console, de página e de rede.
- Capturas em `preview/`.

## Pendências

- Revisão visual humana (claro/escuro, mobile, leitores de tela).
- Publicar no GitHub Pages quando aprovado.
- Definir URL canônica (`ufvai.ufv.br` é placeholder).
