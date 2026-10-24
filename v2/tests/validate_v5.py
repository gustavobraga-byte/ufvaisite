#!/usr/bin/env python3
"""Browser regression checks for the UFVAI v5 static site.

Usage (from the v5 directory): python tests/validate_v5.py
Requires Python Playwright and a local Chromium installation.
The script starts and stops its own local HTTP server.
"""
from pathlib import Path
import json
import subprocess
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PREVIEW = ROOT / "preview"
PREVIEW.mkdir(exist_ok=True)
PORT = 8096
BASE = f"http://127.0.0.1:{PORT}"
REPORT = {"checks": {}, "console_errors": [], "page_errors": [], "request_failures": [], "screenshots": []}


def check(name, condition, details=None):
    REPORT["checks"][name] = {"pass": bool(condition), "details": details}


def main():
    server = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        for _ in range(50):
            try:
                urllib.request.urlopen(BASE + "/", timeout=1).read(1)
                break
            except Exception:
                time.sleep(.1)
        else:
            raise RuntimeError("Local test server did not start")

        routes = [
            "/", "/tutorial.html", "/apresentacao/", "/styles.css", "/v5.css",
            "/script.js", "/i18n.js", "/hero.js", "/assets/credits.html",
            "/assets/hero-minas-serra.webp", "/assets/ufv-arthur-bernardes.webp",
        ]
        route_status = {}
        for route in routes:
            try:
                response = urllib.request.urlopen(BASE + route, timeout=10)
                route_status[route] = response.status
            except Exception as exc:
                route_status[route] = str(exc)
        check("http_routes", all(value == 200 for value in route_status.values()), route_status)

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=["--no-sandbox"])

            def make_page(width, height, reduced=False):
                page = browser.new_page(
                    viewport={"width": width, "height": height},
                    device_scale_factor=1,
                    reduced_motion="reduce" if reduced else "no-preference",
                )
                page.set_default_timeout(30000)
                page.on("console", lambda msg: REPORT["console_errors"].append(msg.text) if msg.type == "error" else None)
                page.on("pageerror", lambda exc: REPORT["page_errors"].append(str(exc)))
                page.on("requestfailed", lambda req: REPORT["request_failures"].append({"url": req.url, "failure": req.failure}))
                return page

            def open_home(page):
                page.goto(BASE + "/", wait_until="domcontentloaded", timeout=60000)
                page.wait_for_function(
                    "document.querySelector('.hero__photo') && document.querySelector('.hero__photo').complete && document.querySelector('.hero__photo').naturalWidth > 0"
                )

            def screenshot(page, name):
                target = PREVIEW / name
                page.screenshot(path=str(target), full_page=False, timeout=60000)
                REPORT["screenshots"].append(str(target.relative_to(ROOT)))

            page = make_page(1440, 1000)
            open_home(page)
            page.evaluate("window.UFVAI_I18N.apply('pt')")
            page.wait_for_timeout(2800)
            check("desktop_no_overflow", page.evaluate("document.documentElement.scrollWidth <= innerWidth"))
            check("hero_full_viewport", page.locator(".hero").evaluate("el => el.offsetHeight === innerHeight"))
            # A foto da UFV saiu do hero e passou a viver mais embaixo (#sobre).
            campus = page.evaluate("""() => {
                const inHero = !!document.querySelector('.hero .hero__campus, .hero .campus-figure');
                const fig = document.querySelector('#sobre .campus-figure');
                const r = fig ? fig.getBoundingClientRect() : null;
                return {inHero, hasFigure: !!fig, top: r ? Math.round(r.top + scrollY) : null};
            }""")
            check("campus_moved_below_hero",
                  (not campus["inHero"]) and campus["hasFigure"] and (campus["top"] or 0) > 1000,
                  campus)
            check("hero_images_loaded", page.evaluate("[...document.images].every(img => img.complete && img.naturalWidth > 0)"))
            check("header_initially_transparent", not page.locator("#topo").evaluate("el => el.classList.contains('is-solid')"))
            cloud_state = page.evaluate("""() => {
                const hero = document.querySelector('.hero');
                const cv = document.getElementById('hero-clouds');
                const ready = hero && hero.getAttribute('data-cloud-state') === 'ready';
                const hasCanvas = !!(cv && cv.getContext && cv.width > 0 && cv.height > 0);
                let painted = false;
                if (hasCanvas) {
                    const g = cv.getContext('2d');
                    // amostra uma faixa horizontal na metade inferior (onde o mar de nuvens é denso)
                    const y = Math.floor(cv.height * 0.72);
                    const d = g.getImageData(0, y, cv.width, 1).data;
                    for (let i = 3; i < d.length; i += 4) { if (d[i] > 0) { painted = true; break; } }
                }
                return {ready, hasCanvas, painted};
            }""")
            check("hero_cloud_scene_ready", cloud_state["ready"] and cloud_state["hasCanvas"] and cloud_state["painted"], cloud_state)
            cue = page.locator("#hero-scroll").bounding_box()
            stage = page.locator("#demonstracao").bounding_box()
            check("scroll_cue_not_clipped", cue and stage and cue["y"] + cue["height"] < stage["y"], {"cue": cue, "stage": stage})

            # ── Painel de controles do hero (mesma semântica do Kimi) ──────
            controls = page.evaluate("""() => {
                const box = document.querySelector('[data-cloud-controls]');
                if (!box) return {exists: false};
                const items = [...box.querySelectorAll('.hero__control')];
                const expected = {cloudAmount: [0.65, 5], flowSpeed: [0.2, 15], ink: [0, 1], immersion: [0, 1]};
                const detail = items.map(w => {
                    const i = w.querySelector('input[type=range]');
                    const k = w.getAttribute('data-key');
                    const exp = expected[k];
                    const progress = parseFloat(getComputedStyle(w).getPropertyValue('--progress'));
                    return {
                        key: k, hasInput: !!i,
                        range: i ? [parseFloat(i.min), parseFloat(i.max)] : null,
                        rangeOk: !!(i && exp && Math.abs(parseFloat(i.min) - exp[0]) < 1e-9
                                              && Math.abs(parseFloat(i.max) - exp[1]) < 1e-9),
                        progressOk: !isNaN(progress) && progress >= 0 && progress <= 1,
                        i18n: !!(i && i.getAttribute('data-i18n-aria') && i.getAttribute('aria-label')),
                        visible: w.getBoundingClientRect().width > 0
                    };
                });
                return {exists: true, count: items.length, detail,
                        pass: items.length === 4 && detail.every(d => d.hasInput && d.rangeOk && d.progressOk && d.i18n && d.visible)};
            }""")
            check("hero_controls_panel", controls.get("pass"), controls)

            # Interatividade: mover o slider Nuvens deve alterar --progress e o valor.
            before = page.evaluate("() => document.querySelector('[data-key=cloudAmount]').style.getPropertyValue('--progress')")
            page.evaluate("""() => {
                const i = document.querySelector('[data-key=cloudAmount] input');
                i.value = '3.5';
                i.dispatchEvent(new Event('input', {bubbles: true}));
            }""")
            after = page.evaluate("""() => ({
                progress: document.querySelector('[data-key=cloudAmount]').style.getPropertyValue('--progress'),
                aria: document.querySelector('[data-key=cloudAmount] input').getAttribute('aria-valuetext'),
                title: document.querySelector('[data-key=cloudAmount]').title
            })""")
            check("hero_controls_interactive",
                  (before != after.get("progress")) and after.get("aria", "").endswith("%"),
                  {"before": before, **after})
            # Velocidade formata com "×" (como no Kimi), os demais com "%".
            speed_fmt = page.evaluate("""() => {
                const i = document.querySelector('[data-key=flowSpeed] input');
                return {text: i.getAttribute('aria-valuetext'), title: document.querySelector('[data-key=flowSpeed]').title};
            }""")
            check("hero_controls_format", speed_fmt["text"].endswith("\u00d7"), speed_fmt)
            page.evaluate("""() => {
                const i = document.querySelector('[data-key=cloudAmount] input');
                i.value = '0.65';
                i.dispatchEvent(new Event('input', {bubbles: true}));
            }""")

            # ── Logo da hero: mesma fonte do menu (Inter 700 / -.02em) ─────
            # A animação de glitch altera o tracking temporariamente; mede-se
            # o valor de repouso (conclui as animações antes).
            logo_font = page.evaluate("""() => {
                document.getAnimations().forEach(a => { try { a.finish(); } catch(e) {} });
                const hero = document.querySelector('.hero .wordmark--xl');
                const menu = document.querySelector('.brand__word');
                if (!hero || !menu) return {pass: false, reason: 'missing'};
                const h = getComputedStyle(hero), m = getComputedStyle(menu);
                const ratio = s => parseFloat(s.letterSpacing) / parseFloat(s.fontSize);
                const hr = ratio(h), mr = ratio(m);
                return {
                    heroFamily: h.fontFamily, menuFamily: m.fontFamily,
                    heroWeight: h.fontWeight, menuWeight: m.fontWeight,
                    heroTrackEm: hr.toFixed(4), menuTrackEm: mr.toFixed(4),
                    fillClip: h.webkitBackgroundClip || h.backgroundClip,
                    pass: h.fontFamily === m.fontFamily && h.fontWeight === m.fontWeight
                          && Math.abs(hr - mr) < 0.002
                          && (h.webkitBackgroundClip || h.backgroundClip || '').includes('text')
                };
            }""")
            check("hero_logo_matches_menu_font", logo_font.get("pass"), logo_font)

            # ── Glitch revelado pelo gatilho de carga (data-cloud-state) ────
            glitch = page.evaluate("""() => {
                const hero = document.querySelector('.hero');
                const el = document.querySelector('.hero .wordmark--xl');
                const before = getComputedStyle(el, '::before');
                const ready = hero.getAttribute('data-cloud-state') === 'ready';
                const anim = getComputedStyle(el).animationName;
                return {ready, anim,
                        ghostBefore: before.content !== 'none' && before.animationName !== 'none',
                        pass: ready && anim === 'logoSharpen' && before.animationName === 'glitchGold'};
            }""")
            check("hero_glitch_reveal", glitch.get("pass"), glitch)

            # ── Camada frontal (Cobertura) pintada ──────────────────────────
            front = page.evaluate("""() => {
                const cv = document.getElementById('hero-clouds-front');
                if (!cv || !cv.getContext) return {pass: false, reason: 'missing'};
                const g = cv.getContext('2d');
                const y = Math.floor(cv.height * 0.5);
                const d = g.getImageData(0, y, cv.width, 1).data;
                let painted = false;
                for (let i = 3; i < d.length; i += 4) { if (d[i] > 0) { painted = true; break; } }
                const opacity = parseFloat(getComputedStyle(cv).opacity);
                return {pass: painted && opacity > 0.5, painted, opacity, w: cv.width};
            }""")
            check("hero_front_canvas_painted", front.get("pass"), front)

            # ── Parallax de ponteiro: --hero-copy-x reage ao mouse ─────────
            page.mouse.move(120, 200)
            page.wait_for_timeout(400)
            px_left = page.evaluate("() => getComputedStyle(document.querySelector('.hero')).getPropertyValue('--hero-copy-x').trim()")
            page.mouse.move(1320, 700)
            page.wait_for_timeout(500)
            px_right = page.evaluate("() => getComputedStyle(document.querySelector('.hero')).getPropertyValue('--hero-copy-x').trim()")
            check("hero_pointer_parallax",
                  bool(px_left) and bool(px_right) and px_left != px_right,
                  {"left": px_left, "right": px_right})
            page.mouse.move(720, 500)
            page.wait_for_timeout(300)

            screenshot(page, "v5-desktop-pt-light.png")

            page.locator("#hero-scroll").click()
            # smooth-scroll sob canvas animado é variável em headless: espera assentar.
            try:
                page.wait_for_function("scrollY > innerHeight * .45", timeout=6000)
            except Exception:
                pass
            page.wait_for_timeout(300)
            check("scroll_cue_opens_demo", page.evaluate("scrollY > innerHeight * .45"))
            check("header_solid_after_scroll", page.locator("#topo").evaluate("el => el.classList.contains('is-solid')"))
            check("demo_starts", page.locator("#panel-boot").get_attribute("aria-hidden") == "false")
            screenshot(page, "v5-desktop-demo.png")

            page.locator("#theme-toggle").click()
            check("dark_theme_and_storage", page.evaluate("document.documentElement.getAttribute('data-theme') === 'dark' && localStorage.getItem('ufvai-theme') === 'dark'"))
            page.evaluate("scrollTo(0, 0)")
            page.wait_for_timeout(700)
            screenshot(page, "v5-desktop-pt-dark.png")

            expected = {
                "en": ("en-US", "Scroll to explore"),
                "es": ("es-ES", "Desplázate para explorar"),
                "fr": ("fr-FR", "Faites défiler pour explorer"),
                "zh": ("zh-CN", "滚动探索"),
                "pt": ("pt-BR", "Role para explorar"),
            }
            translations = {}
            for lang, (html_lang, scroll_text) in expected.items():
                page.evaluate("lang => window.UFVAI_I18N.apply(lang)", lang)
                page.wait_for_timeout(100)
                actual_scroll = page.locator('#hero-scroll [data-i18n="hero.scroll"]').text_content().strip()
                translations[lang] = {
                    "pass": actual_scroll == scroll_text and page.locator("html").get_attribute("lang") == html_lang,
                    "scroll": actual_scroll,
                    "html_lang": page.locator("html").get_attribute("lang"),
                }
            check("five_language_switching", all(item["pass"] for item in translations.values()), translations)

            page.evaluate("window.UFVAI_I18N.apply('en')")
            page.wait_for_timeout(2800)
            screenshot(page, "v5-desktop-en-dark.png")
            page.reload(wait_until="domcontentloaded")
            check("theme_persists_reload", page.evaluate("document.documentElement.getAttribute('data-theme') === 'dark'"))

            page.locator("#faq").scroll_into_view_if_needed()
            first = page.locator(".faq__q").nth(0)
            second = page.locator(".faq__q").nth(1)
            first.click()
            second.click()
            check("faq_single_open", first.get_attribute("aria-expanded") == "false" and second.get_attribute("aria-expanded") == "true")
            page.close()

            mobile = make_page(390, 844)
            open_home(mobile)
            mobile.evaluate("window.UFVAI_I18N.apply('pt')")
            mobile.wait_for_timeout(2800)
            check("mobile_no_overflow", mobile.evaluate("document.documentElement.scrollWidth <= innerWidth"))
            # No mobile a foto também vive fora do hero, e o painel de controles some.
            mobile_campus = mobile.evaluate("""() => {
                const inHero = !!document.querySelector('.hero .hero__campus, .hero .campus-figure');
                const fig = document.querySelector('#sobre .campus-figure');
                const controls = document.querySelector('[data-cloud-controls]');
                const hidden = controls ? getComputedStyle(controls).display === 'none' : false;
                return {inHero, hasFigure: !!fig, controlsHidden: hidden};
            }""")
            check("mobile_campus_below_hero_and_controls_hidden",
                  (not mobile_campus["inHero"]) and mobile_campus["hasFigure"] and mobile_campus["controlsHidden"],
                  mobile_campus)
            screenshot(mobile, "v5-mobile-pt-light.png")
            mobile.locator("#nav-toggle").click()
            mobile.wait_for_timeout(200)
            check("mobile_menu_and_header", mobile.locator("#nav-principal").evaluate("el => el.classList.contains('open')") and mobile.locator("#topo").evaluate("el => el.classList.contains('is-solid')"))
            screenshot(mobile, "v5-mobile-menu.png")
            mobile.close()

            reduced = make_page(1440, 1000, True)
            open_home(reduced)
            reduced_motion = reduced.evaluate("""() => {
                const typed = document.getElementById('typed').textContent;
                const photo = getComputedStyle(document.querySelector('.hero__photo')).transform;
                const mist = getComputedStyle(document.querySelector('.hero__mist')).display;
                return {typed, photo, mist, pass: typed.length > 10 && photo === 'none' && mist === 'none'};
            }""")
            check("reduced_motion", reduced_motion["pass"], reduced_motion)
            check("reduced_motion_demo_short_circuit", reduced.locator("#panel-app").get_attribute("aria-hidden") == "false")

            layout = []
            for width, height in [(320, 700), (390, 844), (640, 800), (768, 900), (980, 900), (1024, 900), (1240, 900), (1280, 900), (1440, 1000), (1920, 1080)]:
                reduced.set_viewport_size({"width": width, "height": height})
                reduced.evaluate("scrollTo(0, 0)")
                reduced.wait_for_timeout(100)
                metrics = reduced.evaluate("""() => {
                    const copy = document.querySelector('.hero__copy').getBoundingClientRect();
                    const cue = document.getElementById('hero-scroll').getBoundingClientRect();
                    const stage = document.getElementById('demonstracao').getBoundingClientRect();
                    return {
                        viewport: innerWidth,
                        scrollWidth: document.documentElement.scrollWidth,
                        copyLeft: copy.left,
                        copyRight: copy.right,
                        copyBottom: copy.bottom,
                        cueTop: cue.top,
                        cueBottom: cue.bottom,
                        stageTop: stage.top
                    };
                }""")
                passed = (
                    metrics["scrollWidth"] <= width
                    and metrics["copyLeft"] >= -1
                    and metrics["copyRight"] <= width + 1
                    and metrics["copyBottom"] < metrics["cueTop"]
                    and metrics["cueBottom"] < metrics["stageTop"]
                )
                layout.append({"width": width, "height": height, "pass": passed, **metrics})
            check("responsive_layout_matrix", all(item["pass"] for item in layout), layout)
            reduced.close()
            browser.close()

        check("no_console_errors", not REPORT["console_errors"], REPORT["console_errors"])
        check("no_page_errors", not REPORT["page_errors"], REPORT["page_errors"])
        check("no_failed_requests", not REPORT["request_failures"], REPORT["request_failures"])
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()

    failures = [name for name, result in REPORT["checks"].items() if not result["pass"]]
    REPORT["summary"] = {
        "passed": sum(1 for result in REPORT["checks"].values() if result["pass"]),
        "failed": len(failures),
        "failures": failures,
    }
    (PREVIEW / "validation.json").write_text(json.dumps(REPORT, ensure_ascii=False, indent=2))
    print(json.dumps(REPORT["summary"], ensure_ascii=False, indent=2))
    if failures:
        print(json.dumps(REPORT, ensure_ascii=False, indent=2))
        raise SystemExit(1)


if __name__ == "__main__":
    main()
