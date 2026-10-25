#!/usr/bin/env python3
"""Verificações do site v6 — marca navy no tema claro e detecção do sistema.

Uso (de dentro da pasta v6):  python3 tests/check_v6.py

Cobre os pontos das v6.5 e v6.6:
  1. UFV navy em toda superfície CLARA (hero, cabeçalho, tela de boot, capa do
     deck e barra do app da demo) e branco onde o fundo é escuro (rodapé e
     tema escuro);
  2. tutorial que detecta idioma e tema do COMPUTADOR (prefers-color-scheme e
     navigator.languages), sem gravar a escolha e cedendo a ela quando o
     usuário clica;
  3. rótulo "Microrregião de Viçosa · Minas Gerais · Brasil" nas 5 línguas;
  4. slider Marca (opacidade) funcionando, com piso que ainda exibe a marca;
  5. slider Nuvens acrescentando nuvens de verdade (mais pixels no canvas);
  6. palavras da animação do mouse sem "Viçosa", "Minas Gerais" e "incerteza"
     (+ equivalentes em en/es/fr/zh).

Requer Playwright + Chromium (mesma dependência de tests/validate_v5.py).
As capturas vão para preview/v6-checks/.
"""
#!/usr/bin/env python3
import json, subprocess, sys, time, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path("/content/drive/MyDrive/PesquisAI/sites/v6")
SHOTS = ROOT / "preview" / "v6-checks"; SHOTS.mkdir(parents=True, exist_ok=True)
PORT = 8137
BASE = f"http://127.0.0.1:{PORT}"
R = {"checks": {}, "errors": []}

def check(name, cond, details=None):
    R["checks"][name] = {"pass": bool(cond), "details": details}
    print(("PASS " if cond else "FAIL ") + name + ("" if cond else f"  -> {details}"))

# pixels com alfa >= 128 no canvas de nuvens (mede densidade de verdade)
COUNT = """(sel) => {
  const c = document.querySelector(sel), g = c.getContext('2d');
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] >= 128) n++;
  return n;
}"""

def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=ROOT,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(60):
        try:
            urllib.request.urlopen(BASE + "/index.html", timeout=1); break
        except Exception: time.sleep(0.2)
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()

            # ── 1. site, tema claro ────────────────────────────────────────
            ctx = b.new_context(viewport={"width":1440,"height":900}, locale="pt-BR")
            pg = ctx.new_page()
            errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.on("console", lambda m: errs.append("console:"+m.text) if m.type=="error" else None)
            pg.goto(BASE + "/index.html", wait_until="load")
            pg.wait_for_timeout(2500)
            check("claro_sem_erro_js", not errs, errs[:5])

            hero = pg.eval_on_selector(".hero .wordmark--xl",
                "el=>getComputedStyle(el).backgroundImage")
            check("hero_UFV_navy_claro", "rgb(62, 70, 96)" in hero, hero[:160])
            hdr = pg.eval_on_selector(".brand__word", "el=>getComputedStyle(el).backgroundImage")
            check("cabecalho_UFV_navy_claro", "rgb(62, 70, 96)" in hdr, hdr[:120])

            boot = pg.eval_on_selector("#panel-boot .wordmark--sm", "el=>getComputedStyle(el).backgroundImage")
            check("boot_demo_UFV_navy_claro", "rgb(62, 70, 96)" in boot, boot[:120])

            deck = pg.eval_on_selector(".deck-cover .wordmark--sm", "el=>getComputedStyle(el).backgroundImage")
            check("capa_deck_UFV_navy_claro", "rgb(62, 70, 96)" in deck, deck[:120])

            ab = pg.eval_on_selector(".app-brand",
                "el=>[getComputedStyle(el).webkitTextFillColor, getComputedStyle(el).color]")
            check("marca_app_visivel_claro", ab[0] not in ("rgba(0, 0, 0, 0)","transparent"), ab)
            check("marca_app_navy_claro", ab[0] == "rgb(46, 50, 66)", ab)

            ft = pg.eval_on_selector(".brand__word--inv", "el=>getComputedStyle(el).backgroundImage")
            check("rodape_UFV_branco", "rgb(255, 255, 255)" in ft, ft[:120])

            # contraste real: mede pixels da marca da hero sobre a foto
            pg.screenshot(path=str(SHOTS/"index-claro-hero.png"), clip={"x":0,"y":0,"width":1440,"height":900})
            box = pg.eval_on_selector(".hero .wordmark--xl", "el=>{const r=el.getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height}}")
            pg.screenshot(path=str(SHOTS/"index-claro-marca.png"), clip=box)

            # demo: estágio 1 (boot) visível
            pg.eval_on_selector("#screen-demo", "el=>el.scrollIntoView({block:'center'})")
            pg.wait_for_timeout(600)
            pg.locator("#screen-demo").screenshot(path=str(SHOTS/"index-claro-boot.png"))
            bootbox = pg.eval_on_selector("#panel-boot .wordmark--sm", "el=>{const r=el.getBoundingClientRect();return {width:r.width}}")
            check("marca_boot_no_layout", bootbox["width"] > 10, bootbox)

            # ── 1b. v6.6: rótulo, slider Marca, densidade, palavras ─────
            # (o renderizador headless roda ~2 fps por causa do canvas, daí
            #  as esperas de 1,8–2,5 s antes de ler valores computados)
            pg.wait_for_selector('.hero[data-cloud-state="ready"]', timeout=20000)
            loc = pg.eval_on_selector(".hero__place", "el=>el.textContent.trim()")
            check("rotulo_hero_pt", loc == "Microrregião de Viçosa · Minas Gerais · Brasil", loc)

            def set_range(key, value):
                pg.evaluate("""([k, v]) => {
                    const i = document.querySelector('.hctrl__row[data-key="' + k + '"] input');
                    i.value = String(v);
                    i.dispatchEvent(new Event('input', {bubbles: true}));
                }""", [key, value])

            def opacity_at(v):
                set_range("ink", v)
                pg.wait_for_timeout(2500)
                return float(pg.eval_on_selector(".hero .wordmark--xl",
                                                 "el=>getComputedStyle(el).opacity"))

            o0, o9, o1 = opacity_at(0), opacity_at(0.9), opacity_at(1)
            check("marca_min_ainda_visivel", 0.35 <= o0 <= 0.45, o0)
            check("marca_padrao_quase_opaca", abs(o9 - 0.94) < 0.01, o9)
            check("marca_max_opaca", abs(o1 - 1.0) < 0.01, [o0, o9, o1])

            def cloud_pixels(v):
                set_range("cloudAmount", v)
                pg.wait_for_timeout(1800)
                return pg.evaluate(COUNT, "#hero-clouds")

            # a animação do canvas só roda com a hero visível: volta ao topo
            pg.evaluate("() => window.scrollTo(0, 0)")
            pg.wait_for_timeout(1200)
            nmin, nmid, nmax = cloud_pixels(0.65), cloud_pixels(2.8), cloud_pixels(5)
            check("nuvens_cresce_com_a_densidade", nmin < nmid < nmax and nmax > nmin * 1.15,
                  [nmin, nmid, nmax])
            set_range("cloudAmount", 0.65)
            set_range("ink", 0.9)

            # palavras que o mouse escreve na hero
            banned = ["incerteza", "uncertainty", "incertidumbre", "incertitude",
                      "不确定性", "Viçosa", "Minas Gerais", "维索萨", "米纳斯"]
            block = (ROOT / "hero.js").read_text(encoding="utf-8").split("var WORDS = {", 1)[1].split("};", 1)[0]
            left = [w for w in banned if w in block]
            check("palavras_da_animacao_limpas", not left, left)
            check("animacao_com_5_listas", all((l + ": [") in block for l in ("pt", "en", "es", "fr", "zh")), None)

            # rótulo da hero nas 5 línguas
            expect = {
                "pt": "Microrregião de Viçosa · Minas Gerais · Brasil",
                "en": "Viçosa Microrregion · Minas Gerais · Brazil",
                "es": "Microrregión de Viçosa · Minas Gerais · Brasil",
                "fr": "Microrégion de Viçosa · Minas Gerais · Brésil",
                "zh": "维索萨微区 · 米纳斯吉拉斯州 · 巴西",
            }
            for code, want in expect.items():
                pg.evaluate("(c) => localStorage.setItem('ufvai-lang', c)", code)
                pg.reload(wait_until="load")
                pg.wait_for_timeout(1400)
                got = pg.eval_on_selector(".hero__place", "el=>el.textContent.trim()")
                check(f"rotulo_hero_{code}", got == want, got)
            pg.evaluate("() => localStorage.removeItem('ufvai-lang')")
            pg.reload(wait_until="load")
            pg.wait_for_timeout(2500)
            pg.screenshot(path=str(SHOTS/"index-claro-rotulo.png"),
                           clip={"x": 0, "y": 0, "width": 1440, "height": 900})
            ctx.close()

            # ── 2. site, tema escuro ───────────────────────────────────────
            ctx = b.new_context(viewport={"width":1440,"height":900}, locale="pt-BR", color_scheme="dark")
            pg = ctx.new_page(); pg.goto(BASE + "/index.html", wait_until="load")
            pg.evaluate("localStorage.setItem('ufvai-theme','dark')"); pg.reload(wait_until="load")
            pg.wait_for_timeout(2000)
            hero_d = pg.eval_on_selector(".hero .wordmark--xl", "el=>getComputedStyle(el).backgroundImage")
            check("hero_UFV_branco_escuro", "rgb(255, 255, 255)" in hero_d, hero_d[:120])
            boot_d = pg.eval_on_selector("#panel-boot .wordmark--sm", "el=>getComputedStyle(el).backgroundImage")
            check("boot_demo_UFV_branco_escuro", "rgb(255, 255, 255)" in boot_d, boot_d[:120])
            pg.screenshot(path=str(SHOTS/"index-escuro-hero.png"))
            ctx.close()

            # ── 3. tutorial: SO escuro + SO em inglês, sem escolha salva ──
            ctx = b.new_context(viewport={"width":1440,"height":900}, locale="en-US", color_scheme="dark")
            pg = ctx.new_page()
            errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.goto(BASE + "/tutorial.html", wait_until="load")
            pg.wait_for_timeout(1800)
            state = pg.evaluate("""()=>({
                theme: document.documentElement.dataset.ttheme,
                tsrc: document.documentElement.getAttribute('data-ttheme-source'),
                lang: document.documentElement.lang,
                lsrc: document.documentElement.getAttribute('data-lang-source'),
                title: document.title,
                stored: localStorage.getItem('ufvai-theme'),
                bg: getComputedStyle(document.body).backgroundColor
            })""")
            check("tutorial_tema_do_computador", state["theme"] == "dark", state)
            check("tutorial_fonte_sistema", state["tsrc"] == "system", state)
            check("tutorial_nao_gravou_tema", state["stored"] is None, state)
            check("tutorial_sem_erro_js", not errs, errs[:5])
            check("tutorial_idioma_do_computador",
                  state["lang"].lower().startswith("en") and state["lsrc"] == "browser", state)
            check("tutorial_conteudo_em_ingles", "from first click" in state["title"], state["title"])
            pg.screenshot(path=str(SHOTS/"tutorial-so-escuro-en.png"), full_page=False)
            ctx.close()

            # ── 4. tutorial: SO escuro + escolha explícita "claro" vence ──
            ctx = b.new_context(viewport={"width":1440,"height":900}, locale="pt-BR", color_scheme="dark")
            pg = ctx.new_page(); pg.goto(BASE + "/tutorial.html", wait_until="load")
            pg.evaluate("localStorage.setItem('ufvai-theme','light')")
            pg.reload(wait_until="load"); pg.wait_for_timeout(1000)
            st = pg.evaluate("()=>({t:document.documentElement.dataset.ttheme,s:document.documentElement.getAttribute('data-ttheme-source')})")
            check("tutorial_escolha_salva_vence_sistema", st["t"] == "light" and st["s"] == "saved", st)
            ctx.close()

            # ── 5. tutorial: clique grava a escolha ───────────────────────
            ctx = b.new_context(viewport={"width":1440,"height":900}, locale="pt-BR", color_scheme="light")
            pg = ctx.new_page(); pg.goto(BASE + "/tutorial.html", wait_until="load")
            pg.wait_for_timeout(800)
            pg.click("#theme-btn"); pg.wait_for_timeout(400)
            st = pg.evaluate("()=>({t:document.documentElement.dataset.ttheme,s:document.documentElement.getAttribute('data-ttheme-source'),saved:localStorage.getItem('ufvai-theme')})")
            check("tutorial_clique_grava_escolha", st["t"] == "dark" and st["s"] == "saved" and st["saved"] == "dark", st)
            ctx.close()

            # ── 6. tutorial: SO claro sem escolha → claro ─────────────────
            ctx = b.new_context(viewport={"width":1440,"height":900}, locale="pt-BR", color_scheme="light")
            pg = ctx.new_page(); pg.goto(BASE + "/tutorial.html", wait_until="load")
            pg.wait_for_timeout(900)
            st = pg.evaluate("()=>({t:document.documentElement.dataset.ttheme,s:document.documentElement.getAttribute('data-ttheme-source'),stored:localStorage.getItem('ufvai-theme')})")
            check("tutorial_sistema_claro", st["t"] == "light" and st["s"] == "system", st)
            pg.screenshot(path=str(SHOTS/"tutorial-so-claro.png"))
            ctx.close()
            b.close()
    finally:
        srv.terminate()

    ok = all(v["pass"] for v in R["checks"].values())
    Path(__file__).with_name("check_v6-report.json").write_text(json.dumps(R, indent=2, ensure_ascii=False))
    print("\nRESULTADO:", "TODOS OK" if ok else "HÁ FALHAS")
    print("screenshots:", sorted(p.name for p in SHOTS.glob("*.png")))

main()
