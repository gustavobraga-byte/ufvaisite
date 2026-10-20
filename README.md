# Site UFVAI v2 — identidade do logotipo oficial

Site institucional de página única do **UFVAI** (agente de IA científica da Universidade
Federal de Viçosa), redesenhado para seguir fielmente a identidade visual do logotipo
oficial (`registrodemarca/logocerto.jpeg`): wordmark "UFV" navy + "AI" dourado com V/A
encaixados, linha fina sob o título, tagline "INTELIGÊNCIA ARTIFICIAL" com tracking
ampliado e constelações de rede neural nos cantos superior direito e inferior esquerdo.

Substitui visualmente a versão anterior (`outputs-ufvai-site/`, tema escuro de agosto/2026),
que permanece preservada como histórico. O site anterior público
(`gustavobraga-byte.github.io/pesquisai-site/`) foi usado apenas como **fonte de informações
reais** (contato, links, depoimentos, registro SisPPG), sem clonagem de layout ou texto.

## Arquivos

| Arquivo | Papel |
|---|---|
| `index.html` | Página única (hero, sobre, funcionalidades, novidades, como funciona, casos, FAQ, citar, apresentação, CTA, footer) |
| `styles.css` | Design system: tokens claro/escuro, componentes, responsivo, `prefers-reduced-motion` |
| `script.js` | Tema, menu mobile, digitação, contadores, reveal, acordeão, demo animada e player da apresentação |
| `i18n.js` | Dicionários pt/en/es/fr/zh (147 chaves cada, 19/10/2026), detecção automática (`localStorage` > navegador > pt-BR), seletor no header |
| `tutorial.html` | Tutorial interativo (12 seções + galeria de prints) — **preferências compartilhadas com o site**: idioma (`ufvai-lang`) e tema (`ufvai-theme`) |
| `favicon.svg` | Favicon oficial UFVAI (lupa com rede de nós, cópia de `UFVAI-v0.6.9/assets/ico.svg`; anterior mini-constelação preservada em `favicon.svg.constelacao-bak`) |
| `favicon-64.png` / `favicon-128.png` / `favicon-180.png` | Fallbacks PNG (64/128) + apple-touch-icon (180), do pacote oficial UFVAI |
| `og-logo.jpg` | Logotipo oficial para Open Graph (cópia byte-idêntica de `registrodemarca/logocerto.jpeg`) |
| `apresentacao/index.html` | Cópia autocontida do deck UFVAI (10 slides) — publicável sozinha, **com i18n próprio em 5 idiomas** (ver seção abaixo) |
| `404.html` | Página de erro 404 no mesmo visual (exigida pelo GitHub Pages) |
| `robots.txt` / `sitemap.xml` / `.nojekyll` | SEO e deploy estático (sitemap aponta p/ placeholder `https://ufvai.ufv.br/`) |

## Paleta (derivada do logo oficial)

| Cor | Hex | Uso |
|---|---|---|
| Azul-marinho grafite | `#2E3242` | Títulos, textos fortes, estrutura, CTA band, footer |
| Dourado | `#C9A227` | CTAs, acentos, ícones-chave, nós da constelação |
| Dourado-ink (texto pequeno) | `#7D6216` / `#D9B441` (dark) | Ajuste de contraste WCAG AA para texto miúdo |
| Off-white | `#F2F2F0` | Fundo principal (modo claro, padrão) |
| Verde-sálvia | `#8FA382` | Acentos secundários, status "agente ativo" |
| Vinho | `#7B3B44` | Acentos terciários, nós da constelação |

Modo escuro opcional: fundo navy profundo `#171A24`, dourado como acento; preferência
persistida em `localStorage` (`ufvai-theme`), padrão claro como no logo.

## Demo animada do hero (fluxo real de abertura)

Sequência em 3 estágios, fiel à tela real do UFVAI (wrapper `launch_app_responsive_v041.py`):

1. **Tela de carregamento** — wordmark, barra de progresso com percentual e checkpoints
   reais do boot ("Verificando dependências", "Carregando chaves de API", "Iniciando
   terminal interativo (ttyd)", "Iniciando o servidor web") e botão "ABRIR O UFVAI".
2. **Termos de Uso** — card com resumo LGPD, digitação animada de nome e e-mail,
   checkbox de aceite + checkbox de telemetria anônima e botão "ATIVAR O UFVAI".
3. **Tela principal (atualização v0.6.24)** — topbar com logo, chip de versão, status
   "agente ativo", chips memória/pt-BR/tema, e conversa com marcadores de evidência.

Botão "↻" rever a demonstração. Com `prefers-reduced-motion`, a sequência salta direto
para a tela principal com a conversa completa. Os dados digitados (nome/e-mail) são
fictícios e nada é enviado.

A conversa da tela principal simula a **produção de um fluxo científico**: plano de
pesquisa, coleta IBGE/SIDRA, sugestão de autores/referências (somente após validação
via `citation-management`) e revisão do rascunho ABNT — sem nenhum número, autor ou
DOI inventado (só o dado verificado de Viçosa + a citação real do projeto).

## Idiomas (5, com detecção automática)

Seletor no header (PT/EN/ES/FR/ZH, mesmos idiomas do UFVAI). Ordem de resolução:
`localStorage` (`ufvai-lang`) > `navigator.languages` > pt-BR; o `lang` do `<html>`
é definido antes da pintura. Depoimentos e blocos de código permanecem no original
(integridade). Trocar o idioma re-executa a digitação da headline e a demo do hero.

**A apresentação acompanha o idioma** (`script.js` → `syncDeckLang`): o site envia
`postMessage({type:'ufvai-lang', lang})` ao `<iframe>` no carregamento do deck e a
cada troca de idioma. O deck tem i18n próprio (`window.DECK_I18N` + `DECK_I18N_DICT`,
198 chaves × 4 idiomas, PT-BR vindo do HTML original) e re-renderiza também o que é
gerado em JS (nome da seção, aria dos dots, demos do terminal). O deck sozinho, em
nova aba, resolve o idioma por `?lang=` > `localStorage` > navegador.

## Seção Apresentação (deck HTML incorporado)

`#apresentacao` incorpora `apresentacao/index.html` (cópia autocontida do deck,
sincronizada de `outputs-ufvai-apresentacao/` em 08/09/2026) em `<iframe>`
com capa de play (clique revela e foca o deck), botões Assistir / Tela cheia
(Fullscreen API, com fallback webkit) / abrir em nova aba. A pasta agora é
publicável sozinha — sem dependência de `../`.

## Como publicar (GitHub Pages)

> **Site publicado:** <https://github.com/gustavobraga-byte/ufvaisite> (o conteúdo
> desta pasta é a fonte do GitHub Pages). Para atualizar: edite aqui, valide
> (ver "Validação" abaixo) e copie os arquivos alterados para o clone do repositório,
> commit + push.

1. Crie o repositório do site (ex.: `ufvai-site`) e copie **só o conteúdo desta
   pasta** para a raiz (ou para `docs/`).
2. No GitHub: Settings → Pages → Deploy from branch → `main` + `/ (root)`
   (ou `/docs`). Aguarde o deploy.
3. Depois de publicado, troque o placeholder `https://ufvai.ufv.br/` em 4 lugares:
   `index.html` (canonical, `og:url`, `og:image`, `twitter:image`),
   `robots.txt` e `sitemap.xml` pela URL real do Pages
   (ex.: `https://gustavobraga-byte.github.io/ufvai-site/`).
4. Opcional: domínio próprio via arquivo `CNAME` com o domínio + ajuste no DNS.
5. Teste pós-deploy: home 200, `apresentacao/` 200, `404.html`, alternância de tema,
   seletor PT/EN/ES/FR/ZH, demo do hero, player do deck (**trocar idioma e conferir
   o deck**) e validação mobile.

## Validação (13/10/2026 — atualização 0.6.21, site + deck)

- `node --check` OK em `script.js`, `i18n.js` e nos 3 blocos `<script>` inline do deck.
- Cobertura i18n do site: 142 chaves `data-i18n` do HTML presentes nos 5 dicionários (0 faltando); a chave nova `nov.v621` existe nos **5** idiomas.
- Cobertura i18n do deck: 144 chaves `data-i18n` presentes nos 4 dicionários (0 faltando); `s9.i6h`/`s9.i6p` presentes nos 4 idiomas.
- HTML do deck balanceado: `section` 10/10, `div` 49/49, `ol` 4/4, `li` 28/28, `span` 103/103, `p` 54/54.
- Nenhum `0.6.20` remanescente em `index.html`, `i18n.js` ou `script.js`; as duas ocorrências remanescentes são **marcos históricos** (timeline do site e rota de evolução do deck), o que é correto.
- **Teste anti-reuso de tradução** (o que pegou os bugs): percorrer os 5 idiomas pela API real (`apply()` + `t()`) e conferir que `nov.v621` devolve **5 textos distintos** — sem isso, uma tradução pode ser escrita no bloco errado e ninguém percebe, porque a chave existe e o arquivo é sintaticamente válido.
- **Grade da rota de evolução do deck** conferida em 10 larguras (1920→375px): 6 colunas no desktop, degradação sem item órfão; altura útil de 694px em viewport de 900px, sem risco de overflow.
- HTTP 200 em **9 rotas** com servidor real, incluindo `/robots.txt` e `/sitemap.xml`.

## Modo escuro e responsivo do deck (13/10/2026)

- **Tema** — execução real via jsdom: clique 1 → `data-theme="dark"` + `aria-pressed="true"`; clique 2 → `light`. `localStorage['ufvai-deck-theme']` persistido, `meta[theme-color]` alternando `#F2F2F0` ↔ `#171A24`. **0 erros de runtime.**
- **Chaves novas** `top.theme`, `top.themeDark`, `top.themeLight` nos **4 dicionários** (203 chaves cada, 0 duplicada). O PT é o HTML literal, como no resto do deck.
- **Sincronia com o site** — `postMessage` nos dois sentidos; mensagem conferida: `{"type":"ufvai-deck-theme","theme":"dark"}`.
- **Responsivo** — 10 media queries; `overflow:auto` e `min-height:100dvh` abaixo de 1100px; `.evo` em 1 coluna abaixo de 760px.
- `node --check` OK nos **4 blocos `<script>`** do deck (o 4º é o novo script anti-flash no `<head>`).

## Validação (01/10/2026 — atualização 0.6.20 + deck multilíngue)

- `node --check` em `script.js`, `i18n.js` e nos 3 blocos `<script>` inline do deck.
- Cobertura i18n do site: 145 chaves do HTML presentes nos 5 dicionários (0 faltando).
- Cobertura i18n do deck: 198 chaves × 4 idiomas, placeholders/números/marcadores idênticos ao PT.
- HTML balanceado (deck e página), `grep ../outputs` = 0, HTTP 200 em 15 rotas (porta 8097).
- Testes jsdom: motor do deck (24 asserções), ponte site→deck e integração ao vivo
  (site servido → iframe troca en/fr/pt/zh) — todos verdes.

## Proveniência dos dados exibidos (zero fabricação)

| Dado no site | Fonte |
|---|---|
| População de Viçosa (MG) = 76.430 (Censo 2022) | [DADO CONFIRMADO] SIDRA tab. 9514, var. 93, consultado via API IBGE em 07/09/2026 (código municipal 3171303). O site antigo citava 76.381; usa-se o valor verificado |
| 174 skills científicas | Auditoria interna de 26/08/2026 ("Skills: 174 instaladas via opencode"), nota `research/2026-08-26-auditoria-seguranca-ufvai-v069` |
| 139 datasets de saúde pública | Descrição oficial da skill `opendatasus` (Ministério da Saúde) |
| 38+ fontes do agro | Descrição oficial da skill `agrobr` |
| 7 bases acadêmicas | Descrição oficial da skill `meta-search-br` |
| Changelog 0.6.9–0.6.21 (datas e títulos) | `UFVAI-v0.6.20/CHANGELOG.md`, entrada `[0.6.21]` de 13/10/2026 (árvore de release canônica; a pasta em disco ainda é `UFVAI-v0.6.20/`) |
| Novas ferramentas (cep-ufv, BR-DWGD, meta-search-br, grant-finder) | Catálogo de skills do `AGENTS.md` (§2.1.6) |
| Depoimentos (A. C./UFV, D. I./IF Baiano, I. B./Unicamp) | Depoimentos reais de usuários, reproduzidos com iniciais e instituição; nome da marca atualizado para UFVAI a pedido (07/09/2026) |
| Citação ABNT e BibTeX (`braga2026ufvai`, v0.6.21) | `citacao_pesquisai.md` e `README.md` do repositório |
| Contato `gustavo.braga@ufv.br`, links GitHub/Colab/YouTube/manual/apresentação, SisPPG nº 10356285004 | Site anterior do projeto e rodapé oficial do `AGENTS.md` |

## Acessibilidade e SEO

- WCAG AA: contraste verificado nos pares texto/fundo (dourado só em texto grande ou
  como gráfico; texto miúdo dourado usa `--gold-ink`); foco visível; skip-link;
  acordeão com `aria-expanded`/`region`; demo com alternativo textual (`sr-only`).
- `prefers-reduced-motion` desliga digitação, pulsos, contadores e revelações.
- Meta tags completas (description, Open Graph, Twitter), JSON-LD `SoftwareApplication`,
  HTML semântico (`header/main/section/footer/nav`), `lang="pt-BR"`.

## Como servir

```bash
cd outputs-ufvai-site-v2
python3 -m http.server 8093        # e abrir http://127.0.0.1:8093
```

Publicação sugerida (pendente de aprovação): GitHub Pages, como substituto do site atual.

## Pendências

- [x] Revisão técnica 08/09/2026: bundle autocontido (`apresentacao/`), 404/robots/sitemap/nojekyll, og:image absoluta, HTML balanceado, JS `node --check` OK, HTTP 200 em todos os assets.
- [x] Atualização 01/10/2026: conteúdo em **v0.6.20** (timeline 0.6.18/0.6.19/0.6.20, citação/BibTeX, rodapé, demo) + **apresentação em 5 idiomas** sincronizada com o site.
- [x] Atualização 13/10/2026: conteúdo em **v0.6.21** — chip da demo, timeline (nova entrada 0.6.21), citação ABNT, BibTeX, rodapé e a primeira mensagem da demo, nos **5 idiomas** (chave nova `nov.v621`). Backup prévio em `backups/site-antes-0621-20261013-202x/`.
- [x] Deck `apresentacao/index.html` sincronizado no mesmo dia: badges de versão atual, `s1.mockTitle` e `s9.badge` nos **4 idiomas**, mais a nova entrada `s9.i6h`/`s9.i6p` na rota de evolução. **O marco 0.6.20 foi preservado** como entrada histórica, como no timeline do site.
- [x] **CSS da rota de evolução do deck ajustado** ao 6º item (v0.6.21): `grid-template-columns: repeat(auto-fit, minmax(190px,1fr))` com `minmax(170px,1fr)` abaixo de 1320px. Sem isso, o 6º card caía numa segunda linha órfã e os cards ficavam com 175px de área de texto.
- [x] **Modo escuro no deck** (v0.6.21): tokens `[data-theme="dark"]` espelhando a paleta do site, com fallback `prefers-color-scheme` quando não há escolha explícita. Botão de sol/lua na topbar, persistido em `localStorage['ufvai-deck-theme']` (chave **separada** da do site, para o deck funcionar standalone), aplicado **antes do primeiro paint** por script no `<head>` para não piscar. `aria-pressed`/`aria-label` sincronizados e `meta[theme-color]` acompanha o fundo. O **site sincroniza o deck por `postMessage`** (`ufvai-deck-theme`), nos dois sentidos.
- [x] **Deck responsivo** (v0.6.21): até 1100px o slide deixa de ser `position:absolute` e passa a **rolar** (`overflow:auto` + `min-height:100dvh`), porque o conteúdo estourava a altura da viewport e ficava cortado. Breakpoints em 1100 / 760 / 420px, mais `max-height:560px` (celular deitado) e `min-width:1800px`. No celular os cards de evolução vão a 1 coluna e os alvos de toque têm 44px.
- [x] **Atualização 19/10/2026 — v0.6.24 e histórico enxuto:** chip da demo, citação ABNT, BibTeX, rodapé e a primeira mensagem da demo passam a **0.6.24**, nos **5 idiomas**. O **changelog do site foi encurtado**: o timeline vai de 10 para **5 entradas** (0.6.24, 0.6.23, 0.6.21, 0.6.20, 0.6.19) e o subtítulo virou "O que chegou nas últimas versões" — o histórico completo continua a um clique, no `CHANGELOG.md` do repositório (link já presente na seção). Chaves novas `nov.v624`/`nov.v623`; as chaves antigas (`nov.v618`, `nov.v1`–`nov.v6`) foram removidas dos 5 idiomas. Backup prévio em `/tmp/site-backup-20261019/`.
- [x] **`tutorial.html` agora SEGUE o site (idioma + tema), 19/10/2026:** o tutorial usa as **mesmas chaves** do site — `ufvai-lang` (pt/en/es/fr/zh) e `ufvai-theme` (light/dark). Ordem de resolução do idioma: escolha do site → última escolha do tutorial → idioma do navegador → pt-BR; o tema é aplicado **antes do primeiro paint** por script no `<head>` (sem piscar). Trocar no tutorial **devolve a escolha ao site** (escrita nas mesmas chaves, nos dois sentidos — mesma lógica já usada entre o site e o deck por `postMessage`). A chave antiga `ufvai_tutorial_tema` é lida como fallback. Verificado em DOM real (jsdom): 4 cenários de idioma/tema + clique no botão de tema + troca pelo seletor, nos 5 idiomas.
- [ ] Revisão visual humana (claro/escuro, mobile) **e nos 5 idiomas**.
- [x] **`tutorial-ufvai.pdf` regenerado (20/10/2026)** a partir do `tutorial.html` de 19/10 — **A3 retrato, 22 páginas, 34 imagens, texto pesquisável**, mesmo motor do PDF anterior (Chromium/Skia m156). Gerador: `PesquisAI/ferramentas/gerar-pdf-tutorial.py`. Backup do anterior (17/10) em `backups/site-v2/tutorial-ufvai-20261017-A3-22p.pdf`. Verificado: diff de texto página a página vs. PDF antigo (só 3 quebras de linha cosméticas), 34 imagens com as mesmas dimensões de origem, conjunto de fontes idêntico. **Dois defeitos corrigidos no caminho:** (a) o ambiente não tinha fonte de emoji/símbolo → ⚡📖🧠📋 saíam vazios (resolvido com `fonts-wqy-zenhei` + `fonts-freefont-ttf`); (b) o layout de impressão do Chromium **reinicia animações CSS**, o que zerava a opacidade do card da seção 8 (`.tabpane.on`, keyframe `fade`) → o script injeta `animation:none !important` antes de imprimir.
- [ ] Definir URL canônica real (hoje placeholder `https://ufvai.ufv.br/`) e trocar nos 4 lugares indicados acima.
- [x] Publicar (GitHub Pages) — repositório `gustavobraga-byte/ufvaisite`; atualização pendente de `git push` (credencial do usuário).
