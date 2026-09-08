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
| `i18n.js` | Dicionários pt/en/es/fr/zh (138 chaves), detecção automática (`localStorage` > navegador > pt-BR), seletor no header |
| `favicon.svg` | Favicon oficial UFVAI (lupa com rede de nós, cópia de `UFVAI-v0.6.9/assets/ico.svg`; anterior mini-constelação preservada em `favicon.svg.constelacao-bak`) |
| `favicon-64.png` / `favicon-128.png` / `favicon-180.png` | Fallbacks PNG (64/128) + apple-touch-icon (180), do pacote oficial UFVAI |
| `og-logo.jpg` | Logotipo oficial para Open Graph (cópia byte-idêntica de `registrodemarca/logocerto.jpeg`) |
| `apresentacao/index.html` | Cópia autocontida do deck UFVAI (10 slides) — permite publicar esta pasta sozinha no GitHub Pages |
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
3. **Tela principal (atualização v0.6.17)** — topbar com logo, chip de versão, status
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

## Seção Apresentação (deck HTML incorporado)

`#apresentacao` incorpora `apresentacao/index.html` (cópia autocontida do deck,
sincronizada de `outputs-ufvai-apresentacao/` em 08/09/2026) em `<iframe>`
com capa de play (clique revela e foca o deck), botões Assistir / Tela cheia
(Fullscreen API, com fallback webkit) / abrir em nova aba. A pasta agora é
publicável sozinha — sem dependência de `../`.

## Como publicar (GitHub Pages)

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
   seletor PT/EN/ES/FR/ZH, demo do hero, player do deck e validação mobile.

## Proveniência dos dados exibidos (zero fabricação)

| Dado no site | Fonte |
|---|---|
| População de Viçosa (MG) = 76.430 (Censo 2022) | [DADO CONFIRMADO] SIDRA tab. 9514, var. 93, consultado via API IBGE em 07/09/2026 (código municipal 3171303). O site antigo citava 76.381; usa-se o valor verificado |
| 174 skills científicas | Auditoria interna de 26/08/2026 ("Skills: 174 instaladas via opencode"), nota `research/2026-08-26-auditoria-seguranca-ufvai-v069` |
| 139 datasets de saúde pública | Descrição oficial da skill `opendatasus` (Ministério da Saúde) |
| 38+ fontes do agro | Descrição oficial da skill `agrobr` |
| 7 bases acadêmicas | Descrição oficial da skill `meta-search-br` |
| Changelog 0.6.9–0.6.17 (datas e títulos) | `UFVAI-v0.6.9/CHANGELOG.md` (árvore de release canônica) |
| Novas ferramentas (cep-ufv, BR-DWGD, meta-search-br, grant-finder) | Catálogo de skills do `AGENTS.md` v0.6.17 (§2.1.6) |
| Depoimentos (A. C./UFV, D. I./IF Baiano, I. B./Unicamp) | Depoimentos reais de usuários, reproduzidos com iniciais e instituição; nome da marca atualizado para UFVAI a pedido (07/09/2026) |
| Citação ABNT e BibTeX (`braga2026ufvai`, v0.6.17) | `UFVAI-v0.6.9/citacao_pesquisai.md` e `README.md` do repositório |
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
- [ ] Revisão visual humana (claro/escuro, mobile).
- [ ] Definir URL canônica real (hoje placeholder `https://ufvai.ufv.br/`) e trocar nos 4 lugares indicados acima.
- [ ] Publicar (GitHub Pages) quando aprovado.
