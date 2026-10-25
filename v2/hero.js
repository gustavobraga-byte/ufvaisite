/* ═══════════════════════════════════════════════════════════════════
   UFVAI — Site institucional v5 · hero vivo (v2)
   Cena de "mar de nuvens" interativa no espírito do hero do Kimi
   K3.1 Pro:
     • gatilho de carga (loading → ready) preso à decodificação da foto;
     • painel de CONTROLES (data-cloud-controls) com 4 sliders —
       Nuvens (cloudAmount), Velocidade (flowSpeed), Marca (ink),
       Cobertura (immersion) — mesmas chaves/faixas/formatos do Kimi;
     • logo UFVAI com revelação em glitch (canais + fatias que afinam
       até a marca nítida, 3.2 s) disparada pelo gatilho;
     • parallax de ponteiro normalizado em -1..1 (com recentragem no
       pointerleave) sobre as nuvens, a camada frontal e a cópia;
     • camada frontal de nuvens que passa por cima da marca, regida
       pela Cobertura.
   Sem dependências. Movimento desativado por prefers-reduced-motion.
   Nenhum asset do Kimi é utilizado.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var hero = document.getElementById('hero');
  var photo = document.getElementById('hero-photo');
  var canvas = document.getElementById('hero-clouds');
  var frontCanvas = document.getElementById('hero-clouds-front');
  var topbar = document.getElementById('topo');
  var scrollButton = document.getElementById('hero-scroll');
  var demo = document.getElementById('demonstracao');
  var nav = document.getElementById('nav-principal');
  var navToggle = document.getElementById('nav-toggle');
  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduce = motionQuery.matches;
  var cloudStart = null, cloudStop = null;   /* ligados se o canvas existir */
  var redrawStatic = function () {};         /* redesenho p/ reduced-motion */

  document.body.classList.add('landscape-ready');

  /* ── Configurações do hero (espelho do defaultHeroSettings do Kimi) ── */
  var settings = { cloudAmount: 0.65, flowSpeed: 3, ink: 0.9, immersion: 1 };

  function formatSetting(key, v) {
    return key === 'flowSpeed' ? v.toFixed(1) + '\u00d7' : Math.round(v * 100) + '%';
  }
  function applyInk() {
    if (hero) hero.style.setProperty('--wm-ink', String(settings.ink));
  }
  applyInk();

  /* ── Header: sólido após rolagem (ou com menu aberto) ─────────────── */
  function updateHeader() {
    if (!topbar) return;
    var menuOpen = !!(nav && nav.classList.contains('open'));
    topbar.classList.toggle('is-solid', window.scrollY > 24 || menuOpen);
  }

  /* ── Gatilho de carga: loading → ready ──────────────────────────────
     Espera a foto decodificar (ou um teto de 1.6 s) e então revela a
     cena: a névoa se dissipa, a cópia entra escalonada e o logo roda a
     animação de glitch (3.2 s). */
  var revealed = false;
  function reveal() {
    if (revealed || !hero) return;
    revealed = true;
    hero.setAttribute('data-cloud-state', 'ready');
  }
  if (reduce) {
    reveal();
  } else if (photo) {
    var done = false;
    var fire = function () { if (!done) { done = true; reveal(); } };
    if (photo.complete && photo.naturalWidth) {
      window.requestAnimationFrame(function () { window.setTimeout(fire, 60); });
    } else {
      photo.addEventListener('load', fire);
      photo.addEventListener('error', fire);
    }
    window.setTimeout(fire, 1600); /* teto: nunca prende a revelação */
  } else {
    reveal();
  }

  /* ── Painel de controles (data-cloud-controls) ───────────────────── */
  function initControls() {
    var box = document.querySelector('[data-cloud-controls]');
    if (!box) return;
    var wraps = box.querySelectorAll('.hero__control');
    Array.prototype.forEach.call(wraps, function (wrap) {
      var input = wrap.querySelector('input[type="range"]');
      var labelEl = wrap.querySelector('.hero__control-label');
      if (!input) return;
      var key = wrap.getAttribute('data-key');

      function sync() {
        var v = Number(input.value);
        var min = Number(input.min), max = Number(input.max);
        if (!isNaN(v)) settings[key] = v;
        wrap.style.setProperty('--progress', ((v - min) / (max - min)));
        var txt = formatSetting(key, v);
        input.setAttribute('aria-valuetext', txt);
        var lb = labelEl ? (labelEl.textContent || '').trim() : '';
        wrap.title = (lb ? lb + ': ' : '') + txt;
        applyInk();
        if (reduce) redrawStatic();   /* atualiza o quadro estático */
      }

      input.addEventListener('input', sync);
      input.addEventListener('focus', function () { wrap.setAttribute('data-expanded', ''); });
      input.addEventListener('blur', function () { wrap.removeAttribute('data-expanded'); });
      sync();
      /* título/valor volta a ser recalculado após o i18n aplicar os rótulos */
      window.setTimeout(sync, 320);
    });
  }
  initControls();

  /* ── Cena das nuvens (canvas de fundo + camada frontal) ─────────────
     Nuvens FLUIDAS: em vez de puffs discretos (silhueta definida),
     usa-se um campo de ruído FBM tileable que deriva e se morpha —
     massa contínua, sem forma fixa. O ponteiro BAGUNÇA a nuvem:
     abre uma cavidade (destination-out) e sopra "wisps" giratórios
     que se dissipam, mexendo localmente o campo. */
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext('2d');
    var fctx = (frontCanvas && frontCanvas.getContext) ? frontCanvas.getContext('2d') : null;
    var off = document.createElement('canvas');      /* buffer do campo */
    var octx = off.getContext('2d');
    var W = 0, H = 0, FW = 0, FH = 0, DPR = 1;
    var OFFS = 0.6;                                  /* downscale do buffer de nuvens */
    var wisps = [];                                  /* "bagunço" do ponteiro */
    var t0 = performance.now();
    var raf = null;
    var prog = 0;                   /* progresso da rolagem dentro do hero */
    var ptrX = 0, ptrY = 0;         /* ponteiro suavizado, -1..1 */
    var tPtrX = 0, tPtrY = 0;       /* alvo do ponteiro, -1..1 */
    var hasPointer = false;         /* ponteiro ativo sobre a cena */
    var ptrSpeed = 0;               /* velocidade recente (intensidade do bagunço) */
    var lastPX = null, lastPY = null, lastPT = 0;
    var spread = 0;                 /* 0..1: quanto a neblina está aberta */
    var running = false;

    /* PRNG determinista para nuvens estáveis entre recargas */
    function prng(seed) {
      var s = seed >>> 0;
      return function () {
        s = (s + 0x6D2B79F5) >>> 0;
        var t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    /* ══════════════════════════════════════════════════════════════════
       NUVENS REALISTAS — sprites cumulus procedurais
       ──────────────────────────────────────────────────────────────────
       O campo de ruído contínuo lia como NÉVOA. Aqui cada nuvem é um
       sprite gerado uma única vez no boot:
         1. fBm com domain warping  → massa com lóbulos (couve-flor);
         2. erosão de alta frequência → bordas rendadas;
         3. sombreamento pelo gradiente de densidade (luz alto-esquerda)
            → sombras azuladas na base + topos quentes.
       As nuvens são dispostas em três profundidades, derivam em parallax
       e a Cobertura regula densidade/opacidade do conjunto.
       ══════════════════════════════════════════════════════════════════ */

    /* Ruído de valor 2D determinista (hash inteiro + smoothstep). */
    function hash2(ix, iy, seed) {
      var n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 144269);
      n = Math.imul(n ^ (n >>> 13), 1274126177);
      n = n ^ (n >>> 16);
      return ((n >>> 0) / 2147483647) - 1;              /* -1..1 */
    }
    function vnoise(x, y, seed) {
      var x0 = Math.floor(x), y0 = Math.floor(y);
      var tx = x - x0, ty = y - y0;
      tx = tx * tx * (3 - 2 * tx);
      ty = ty * ty * (3 - 2 * ty);
      var v00 = hash2(x0, y0, seed), v10 = hash2(x0 + 1, y0, seed);
      var v01 = hash2(x0, y0 + 1, seed), v11 = hash2(x0 + 1, y0 + 1, seed);
      var a = v00 + (v10 - v00) * tx;
      var b = v01 + (v11 - v01) * tx;
      return a + (b - a) * ty;
    }
    function fbm2(x, y, oct, seed) {
      var sum = 0, amp = 1, f = 1, norm = 0;
      for (var i = 0; i < oct; i++) {
        sum += amp * vnoise(x * f, y * f, seed + i * 131);
        norm += amp; amp *= 0.5; f *= 2.02;
      }
      return sum / norm;
    }
    function smooth01(a, b, x) {
      var t = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    }

    /* Sprite de cumulus: campo de altura (blobs) + detalhe fBm +
       sombreamento por gradiente (luz do alto-esquerda). */
    function makeCloudSprite(w, h, seed, opts) {
      opts = opts || {};
      var r = prng(seed);
      var c = document.createElement('canvas');
      c.width = w; c.height = h;
      var g = c.getContext('2d');
      var img = g.createImageData(w, h);
      var d = img.data;
      var dens = new Float32Array(w * h);
      var hfld = new Float32Array(w * h);
      var i, x, y, px, py;

      /* corpos: lóbulos grandes na base, pequenos no topo (couve-flor) */
      var blobs = [];
      var nb = opts.blobs || 12;
      for (i = 0; i < nb; i++) {
        var ang = r() * 6.2832, rad = Math.sqrt(r());
        var bx = 0.5 + Math.cos(ang) * rad * 0.24;
        var by = 0.58 + Math.sin(ang) * rad * 0.17;
        var sz = 0.075 + r() * 0.10;
        blobs.push({ x: bx, y: by, sx: sz * (1.05 + r() * 0.55), sy: sz * (0.85 + r() * 0.4), amp: 0.55 + r() * 0.6 });
      }
      var nt = opts.tops || 8;
      for (i = 0; i < nt; i++) {
        var bx2 = 0.5 + (r() - 0.5) * 0.44;
        var by2 = 0.27 + r() * 0.16;
        var s2 = 0.045 + r() * 0.05;
        blobs.push({ x: bx2, y: by2, sx: s2 * 1.2, sy: s2, amp: 0.55 + r() * 0.6 });
      }
      /* "couve-flor": esferas miúdas coladas à borda superior.
         Só entram se houver massa embaixo — evita bolinhas soltas. */
      function heightAt(qx, qy) {
        var hh = 0;
        for (var bi = 0; bi < blobs.length; bi++) {
          var Bb = blobs[bi];
          var ddx = (qx - Bb.x) / Bb.sx, ddy = (qy - Bb.y) / Bb.sy;
          var ee = ddx * ddx + ddy * ddy;
          if (ee < 9) hh += Bb.amp * Math.exp(-ee * 1.5);
        }
        return hh;
      }
      var nc = opts.cauli == null ? 22 : opts.cauli;
      var placed = 0, tries = 0;
      while (placed < nc && tries < nc * 6) {
        tries++;
        var bcx = 0.5 + (r() - 0.5) * 0.58;
        var bcy = 0.36 + (r() - 0.5) * 0.16;
        if (heightAt(bcx, bcy) < 0.52) continue;      /* precisa de corpo */
        var csz = 0.016 + r() * 0.020;
        blobs.push({ x: bcx, y: bcy, sx: csz, sy: csz, amp: 0.26 + r() * 0.26 });
        placed++;
      }
      var mist = !!opts.mist;
      if (mist) {
        /* neblina: corpos LARGOS e baixos, como véus entre as serras */
        for (i = 0; i < blobs.length; i++) { blobs[i].sx *= 2.35; blobs[i].sy *= 0.92; }
      }
      var baseY = opts.baseY == null ? 0.80 : opts.baseY;
      var baseSoft = opts.baseSoft || 0.14;
      var lo = opts.lo == null ? (mist ? 0.28 : 0.42) : opts.lo;
      var band = opts.band == null ? (mist ? 0.58 : 0.34) : opts.band;
      var thrNoise = opts.thrNoise == null ? (mist ? 0.07 : 0.14) : opts.thrNoise;

      for (y = 0; y < h; y++) {
        py = y / h;
        for (x = 0; x < w; x++) {
          px = x / w;
          var hgt = 0;
          for (var b = 0; b < blobs.length; b++) {
            var B = blobs[b];
            var dx = (px - B.x) / B.sx, dy = (py - B.y) / B.sy;
            var e = dx * dx + dy * dy;
            if (e < 9) hgt += B.amp * Math.exp(-e * 1.5);
          }
          hgt += 0.32 * fbm2(px * 6.0, py * 6.0, 4, seed + 3);
          hgt += 0.22 * fbm2(px * 18.0, py * 18.0, 3, seed + 27);
          if (py > baseY) hgt *= Math.max(0, 1 - (py - baseY) / baseSoft);
          hfld[y * w + x] = hgt;
          /* limiar modulado: recorta a silhueta com detalhe irregular */
          var thr = lo + thrNoise * fbm2(px * 8.5 + 5.1, py * 8.5 + 2.3, 3, seed + 55);
          dens[y * w + x] = smooth01(thr, thr + band, hgt);
        }
      }

      var shadow = opts.shadow || (mist ? [198, 210, 224] : [172, 186, 204]);
      var mid = opts.mid || (mist ? [236, 241, 247] : [232, 238, 245]);
      var light = opts.light || (mist ? [252, 254, 255] : [255, 255, 255]);
      var alpha = opts.alpha == null ? 1 : opts.alpha;
      var kx = opts.kx == null ? (mist ? 0.55 : 1.2) : opts.kx;
      var ky = opts.ky == null ? (mist ? 0.85 : 1.7) : opts.ky;

      for (y = 0; y < h; y++) {
        py = y / h;
        for (x = 0; x < w; x++) {
          i = y * w + x;
          var a = dens[i];
          if (a <= 0.004) { d[i * 4 + 3] = 0; continue; }
          var xm = x > 2 ? x - 2 : 0, xp = x < w - 3 ? x + 2 : w - 1;
          var ym = y > 2 ? y - 2 : 0, yp = y < h - 3 ? y + 2 : h - 1;
          var hx = hfld[y * w + xp] - hfld[y * w + xm];
          var hy = hfld[yp * w + x] - hfld[ym * w + x];

          var lit = 0.66 + hx * kx + hy * ky;
          lit -= 0.30 * smooth01(0.42, 1.0, py);           /* base em sombra */
          lit -= 0.12 * a;                                  /* interior fechado */
          lit += 0.07 * fbm2(x / w * 14, y / h * 14, 3, seed + 9);

          /* bordas: dissolve a sombra (evita contorno de recorte) */
          var edge = smooth01(0.05, 0.5, a);
          lit = 0.70 + (lit - 0.70) * edge;
          lit = Math.max(0, Math.min(1, lit));
          if (opts.gamma) lit = Math.pow(lit, opts.gamma);

          var r0, g0, b0;
          if (lit < 0.5) {
            var t0 = lit * 2;
            r0 = shadow[0] + (mid[0] - shadow[0]) * t0;
            g0 = shadow[1] + (mid[1] - shadow[1]) * t0;
            b0 = shadow[2] + (mid[2] - shadow[2]) * t0;
          } else {
            var t1 = (lit - 0.5) * 2;
            r0 = mid[0] + (light[0] - mid[0]) * t1;
            g0 = mid[1] + (light[1] - mid[1]) * t1;
            b0 = mid[2] + (light[2] - mid[2]) * t1;
          }
          var k = i * 4;
          d[k] = r0; d[k + 1] = g0; d[k + 2] = b0;
          d[k + 3] = Math.round(Math.min(1, a * alpha) * 255);
        }
      }
      g.putImageData(img, 0, 0);

      /* contorno macio: blur curto no alfa remove o "recorte de papel" */
      var blur = opts.blur == null ? (mist ? 3.4 : 1.0) : opts.blur;
      if (blur > 0) {
        var c2 = document.createElement('canvas');
        c2.width = w; c2.height = h;
        var g2 = c2.getContext('2d');
        g2.filter = 'blur(' + blur + 'px)';
        g2.drawImage(c, 0, 0);
        g2.filter = 'none';
        return c2;
      }
      return c;
    }

    /* Conjunto de sprites: formas variadas e três temperaturas de luz. */
    var sprites = [];
    var spritesReady = false;
    function buildSprites() {
      if (spritesReady) return;
      spritesReady = true;
      sprites = [
        /* véu largo entre as serras (neblina) */
        makeCloudSprite(520, 260, 9137,  { mist: true, blobs: 14, tops: 0, cauli: 0 }),
        /* neblina mais alta e fina */
        makeCloudSprite(520, 220, 24221, { mist: true, blobs: 17, tops: 0, cauli: 0, alpha: .85, blur: 4.2 }),
        /* neblina baixa, densa no vale */
        makeCloudSprite(560, 260, 55711, { mist: true, blobs: 12, tops: 0, cauli: 0, alpha: .95,
                                           shadow: [186, 199, 216], blur: 3.0 }),
        /* cúmulo suave encostado na encosta (quebra a monotonia) */
        makeCloudSprite(380, 220, 78017, { blobs: 10, tops: 7, cauli: 12, blur: 2.2, alpha: .55,
                                           shadow: [178, 192, 210] })
      ];
    }

    /* ── Distribuição em profundidade ────────────────────────────────
       Três faixas: longe (alta, pequena, lenta), média e perto (baixa,
       grande, rápida). O y é relativo à altura do hero. */
    var backGroups = [], frontGroups = [];

    function buildGroup(seed, n, o) {
      var r = prng(seed);
      var list = [];
      var extra = o.extra || 0;                 /* nuvens "reserva" do slider */
      var total = n + extra;
      for (var i = 0; i < total; i++) {
        var depth = r();                          /* 0 = longe · 1 = perto */
        var sc = o.sc0 + (o.sc1 - o.sc0) * depth;
        var sp = (sprites.length ? sprites[(i + Math.floor(seed)) % 3] : null);
        /* rank de densidade: as n nuvens base ficam em 0..0.5 e estão
           SEMPRE visíveis (o visual de partida não muda); as extras
           ocupam 0.5..1 e só aparecem quando o slider "Nuvens" sobe —
           paintClouds corta em 0.5 + 0.5·an. */
        var rank = i < n ? (i / (n || 1)) * 0.49
                         : 0.5 + ((i - n) / (extra || 1)) * 0.49;
        list.push({
          sprite: sp,
          rank: rank,
          w: 460 * sc,
          h: 272 * sc,
          x0: r(),                                /* posição inicial no laço */
          y: o.y0 + (o.y1 - o.y0) * r(),           /* 0..1 na altura */
          a: o.a * (0.72 + 0.28 * r()),
          vx: (o.vx0 + (o.vx1 - o.vx0) * depth) * (0.85 + 0.3 * r()),
          bob: o.bob * (0.6 + 0.8 * r()),
          ph: r() * 6.283
        });
      }
      return { list: list, alpha: o.alpha || 1 };
    }

    /* Contagem base = a da v5/v6 (8+9+7 de fundo, 3 na frente). O extra
       é o teto do slider "Nuvens": no máximo (~2×) o mar fica bem mais
       carregado sem redesenhar sprites. */
    function buildGroups() {
      backGroups = [
        buildGroup(1201, 8, { extra: 7, sc0: .85, sc1: 1.35, y0: .43, y1: .57, a: .34, vx0: .9, vx1: 1.9, bob: 4, alpha: .9 }),
        buildGroup(2203, 9, { extra: 8, sc0: 1.25, sc1: 1.95, y0: .49, y1: .67, a: .44, vx0: 1.6, vx1: 3.0, bob: 6, alpha: 1 }),
        buildGroup(3307, 7, { extra: 6, sc0: 1.75, sc1: 2.55, y0: .56, y1: .76, a: .38, vx0: 2.3, vx1: 4.0, bob: 8, alpha: .95 })
      ];
      frontGroups = [
        buildGroup(4409, 3, { extra: 4, sc0: 1.55, sc1: 2.15, y0: .62, y1: .78, a: .18, vx0: 3.2, vx1: 5.2, bob: 7, alpha: .85 })
      ];
    }

    function build() {
      DPR = Math.min(2, window.devicePixelRatio || 1);
      W = canvas.clientWidth || hero.offsetWidth || window.innerWidth;
      H = canvas.clientHeight || hero.offsetHeight || window.innerHeight;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      off.width = Math.max(1, Math.round(W * OFFS));
      off.height = Math.max(1, Math.round(H * OFFS));
      if (fctx) {
        FW = frontCanvas.clientWidth || W;
        FH = frontCanvas.clientHeight || H;
        frontCanvas.width = Math.round(FW * DPR);
        frontCanvas.height = Math.round(FH * DPR);
        fctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      }
      buildSprites();
      buildGroups();
    }

    /* Derivadas dos sliders (faixas idênticas às do Kimi) */
    function amountN() { return (settings.cloudAmount - 0.65) / (5 - 0.65); } /* 0..1 */
    function driftTime(t) { return t * (settings.flowSpeed / 3); }            /* 3× = base */

    /* Desenha as nuvens (billboards) com deriva, brisa e paralaxe. */
    function paintClouds(g, w, h, groupSet, dt, an, front) {
      g.globalCompositeOperation = 'source-over';
      var haze = 1.12 + an * 0.28;
      /* densidade: 0.5 no mínimo (só as nuvens base) → 1 no máximo
         (base + reserva). an vem do slider "Nuvens" (0..1). */
      var cut = 0.5 + 0.5 * an;
      var par = reduce ? 0 : 1;
      var vs = Math.max(0.42, Math.min(1.1, w / 1440));
      /* telas estreitas: a faixa desce (fica no vale, longe do texto) e
         fica um pouco mais discreta */
      var narrow = Math.max(0, Math.min(1, 1 - w / 1100));
      /* ponteiro em coordenadas do canvas + raio de influência */
      var mx = ((ptrX + 1) / 2) * w;
      var my = ((ptrY + 1) / 2) * h;
      var R = Math.max(170, h * 0.30);
      for (var gi = 0; gi < groupSet.length; gi++) {
        var G = groupSet[gi];
        var depthShift = (gi + 1) * 9 * ptrX * par;
        for (var i = 0; i < G.list.length; i++) {
          var p = G.list[i];
          if (!p.sprite) continue;
          if (p.rank >= cut) continue;          /* reserva: entra com a densidade */
          var pw = p.w * vs, ph = p.h * vs;
          var span = w + pw;
          var x = p.x0 * span + dt * p.vx * vs + depthShift;
          x = ((x % span) + span) % span;               /* laço contínuo */
          var px = x - pw;
          var py = p.y * h + Math.sin(dt * 0.11 + p.ph) * p.bob
                 - prog * (26 + gi * 22) + ptrY * 5 * par
                 + narrow * h * 0.17;
          var alpha = p.a * haze * G.alpha * (1 - 0.12 * narrow);

          /* ── ESPALHAR: a neblina se afasta do cursor ──────────────
             Empurrão radial com queda suave (f²) + leve dilatação e
             rarefação: o véu "abre" em vez de ganhar um buraco. */
          if (spread > 0.001) {
            var cx = px + pw * 0.5, cy = py + ph * 0.5;
            var dx = cx - mx, dy = cy - my;
            var d = Math.sqrt(dx * dx + dy * dy);
            if (d < R && d > 0.5) {
              var f = 1 - d / R;
              var push = f * f * (34 + gi * 16) * spread;
              px += (dx / d) * push;
              py += (dy / d) * push * 0.55;
              pw *= 1 + f * 0.09 * spread;
              ph *= 1 + f * 0.05 * spread;
              alpha *= 1 - 0.30 * f * spread;
            }
          }
          g.globalAlpha = Math.min(1, alpha);
          g.drawImage(p.sprite, px, py, pw, ph);
        }
      }
      g.globalAlpha = 1;
    }

    /* Máscara vertical: a nuvem só existe na faixa do horizonte — evita
       "algodão" sobre o céu limpo e sobre o primeiro plano. */
    function maskField(g, w, h, an) {
      g.globalCompositeOperation = 'destination-in';
      var grad = g.createLinearGradient(0, 0, 0, h);
      var lo = 0.36 - an * 0.11;                       /* mais cobertura → a faixa sobe */
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(Math.max(0, lo - 0.02), 'rgba(0,0,0,0)');
      grad.addColorStop(lo + 0.10, 'rgba(0,0,0,0.28)');
      grad.addColorStop(lo + 0.20, 'rgba(0,0,0,0.78)');
      grad.addColorStop(0.78, 'rgba(0,0,0,0.72)');
      grad.addColorStop(0.93, 'rgba(0,0,0,0.18)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.setTransform(OFFS, 0, 0, OFFS, 0, 0);
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'source-over';
    }

    /* O ponteiro BAGUNÇA: abre uma cavidade + sopra wisps giratórios. */
    function stirField(g, w, h) {
      if (!hasPointer) return;
      var px = ((ptrX + 1) / 2) * w;
      var py = ((ptrY + 1) / 2) * h;
      var R = h * (0.30 + Math.min(ptrSpeed, 1) * 0.10);
      g.globalCompositeOperation = 'destination-out';
      var cav = g.createRadialGradient(px, py, 0, px, py, R);
      var punch = 0.34 + Math.min(ptrSpeed, 1) * 0.28;
      cav.addColorStop(0, 'rgba(0,0,0,' + punch.toFixed(3) + ')');
      cav.addColorStop(0.55, 'rgba(0,0,0,' + (punch * 0.5).toFixed(3) + ')');
      cav.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = cav;
      g.setTransform(OFFS, 0, 0, OFFS, 0, 0);
      g.fillRect(px - R, py - R, R * 2, R * 2);
      g.globalCompositeOperation = 'source-over';
    }

    /* Wisps: núvens miúdas sopradas pelo mouse que se dissipam. */
    function spawnWisps(w, h) {
      if (!hasPointer || wisps.length > 90) return;
      var px = ((ptrX + 1) / 2) * w;
      var py = ((ptrY + 1) / 2) * h;
      var n = ptrSpeed > 0.02 ? 2 : 1;
      for (var i = 0; i < n; i++) {
        var ang = Math.random() * 6.2832;
        var spd = (0.4 + Math.random() * 0.9) * (0.5 + ptrSpeed * 2.2);
        wisps.push({
          x: px + (Math.random() - 0.5) * 40,
          y: py + (Math.random() - 0.5) * 40,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 0.25,
          life: 1,
          size: 70 + Math.random() * 130,
          rot: Math.random() * 6.2832,
          si: Math.floor(Math.random() * sprites.length)
        });
      }
    }
    function drawWisps(g, w, h, dtFrame) {
      if (!wisps.length) return;
      g.globalCompositeOperation = 'source-over';
      g.setTransform(OFFS, 0, 0, OFFS, 0, 0);
      for (var i = wisps.length - 1; i >= 0; i--) {
        var W2 = wisps[i];
        W2.x += W2.vx * dtFrame * 60;
        W2.y += W2.vy * dtFrame * 60;
        W2.vy += 0.006 * dtFrame * 60;      /* leve gravidade → assentam */
        W2.rot += 0.02 * dtFrame * 60;      /* giro → "bagunçado" */
        W2.life -= dtFrame * 0.85;
        if (W2.life <= 0) { wisps.splice(i, 1); continue; }
        var spr = sprites[W2.si] || sprites[0];
        if (!spr) continue;
        g.save();
        g.globalAlpha = 0.20 * W2.life;
        g.translate(W2.x, W2.y);
        g.rotate(W2.rot);
        g.drawImage(spr, -W2.size * 0.5, -W2.size * 0.3, W2.size, W2.size * 0.6);
        g.restore();
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }

    /* ── Texto que o mouse ESCREVE na hero ──────────────────────────────
       Espírito do efeito de escrita do Kimi (writingProgress/inkStarts):
       ao mover o cursor, palavras-chave do UFVAI (no idioma corrente)
       são "escritas" como tinta — revelam-se da esquerda para a
       direita, borram e se dissolvem na nuvem, subindo com a deriva.
       (v6.6: saíram "Viçosa", "Minas Gerais" e "incerteza" + equivalentes
       nas 5 línguas — o local já aparece no rótulo da hero.) */
    var WORDS = {
      pt: ['integridade', 'reprodutibilidade', 'transparência', 'evidência',
           'rigor', 'método', 'hipótese', 'pesquisa', 'ciência',
           'dados', 'validação', 'UFVAI'],
      en: ['integrity', 'reproducibility', 'transparency', 'evidence',
           'rigor', 'method', 'hypothesis', 'research', 'science',
           'data', 'validation', 'UFVAI'],
      es: ['integridad', 'reproducibilidad', 'transparencia', 'evidencia',
           'rigor', 'método', 'hipótesis', 'investigación', 'ciencia',
           'datos', 'validación', 'UFVAI'],
      fr: ['intégrité', 'reproductibilité', 'transparence', 'preuve',
           'rigueur', 'méthode', 'hypothèse', 'recherche', 'science',
           'données', 'validation', 'UFVAI'],
      zh: ['诚信', '可复现', '透明', '证据', '严谨', '方法', '假设',
           '科研', '科学', '数据', '验证', 'UFVAI']
    };
    var inkWords = [];        /* palavras ativas na cena */
    var wordIdx = 0;
    var lastInkX = null, lastInkY = null;
    function currentWords() {
      var lang = (document.documentElement.lang || 'pt-BR').slice(0, 2).toLowerCase();
      return WORDS[lang] || WORDS.pt;
    }
    function spawnInkWord(px, py) {
      if (inkWords.length > 14) return;
      var bank = currentWords();
      var text = bank[wordIdx % bank.length];
      wordIdx++;
      var size = Math.max(15, Math.min(W, H) * 0.026);
      inkWords.push({
        text: text, x: px, y: py,
        size: size,
        born: performance.now(),
        /* duração: escrever (~0.9s) + dissolver (~2.4s) */
        write: 900 + text.length * 32,
        fade: 2400,
        drift: 10 + Math.random() * 16,
        sway: (Math.random() - 0.5) * 22,
        rot: (Math.random() - 0.5) * 0.06,
        /* deslocamento de canal sutil (eco do glitch do logo) */
        tint: Math.random() < 0.5 ? 'rgba(231,199,102,' : 'rgba(111,227,214,'
      });
    }
    function drawInkWords(g, w, h, now) {
      if (!inkWords.length) return;
      var baseFont = "600 " + Math.round(Math.max(15, Math.min(w, h) * 0.026)) + "px 'Lora', Georgia, serif";
      for (var i = inkWords.length - 1; i >= 0; i--) {
        var Wd = inkWords[i];
        var age = now - Wd.born;
        var total = Wd.write + Wd.fade;
        if (age > total) { inkWords.splice(i, 1); continue; }
        var prog2 = Math.min(1, age / Wd.write);           /* progresso da escrita */
        var ease = prog2 * prog2 * (3 - 2 * prog2);
        var dissolve = age > Wd.write ? (age - Wd.write) / Wd.fade : 0;
        /* revela caracteres da esquerda para a direita */
        var shown = Math.max(1, Math.ceil(Wd.text.length * ease));
        var str = Wd.text.slice(0, shown);
        /* deriva + dissipação: borra e sobe, entrando na nuvem */
        var y = Wd.y - dissolve * Wd.drift * 2.4 + Math.sin(age / 500 + i) * 3;
        var x = Wd.x + dissolve * Wd.sway;
        var blur = dissolve * 9;
        var alpha = (1 - dissolve) * (0.55 + 0.25 * ease);
        if (alpha <= 0.01) continue;
        g.save();
        g.globalAlpha = alpha;
        g.translate(x, y);
        g.rotate(Wd.rot);
        g.font = baseFont;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        if (blur > 0.2) { g.shadowBlur = blur; g.shadowColor = 'rgba(235,241,234,.6)'; }
        /* halo de tinta sobre a nuvem */
        g.fillStyle = 'rgba(20,40,36,.34)';
        g.fillText(str, 1, 1.5);
        /* núcleo claro */
        g.fillStyle = 'rgba(247,245,238,.92)';
        g.fillText(str, 0, 0);
        /* eco de canal (glitch) enquanto escreve */
        if (dissolve < 0.15) {
          g.globalAlpha = alpha * (0.5 - dissolve * 3);
          g.fillStyle = Wd.tint + '0.8)';
          g.fillText(str, 1.5, -1);
        }
        g.restore();
      }
      g.globalAlpha = 1;
    }

    var lastT = 0;
    function frame(now) {
      var t = (now - t0) / 1000;
      var dtFrame = Math.min(0.05, t - (lastT || t));
      lastT = t;
      var dt = driftTime(t);
      var an = amountN();

      /* suaviza o ponteiro (-1..1) e decai a velocidade do bagunço */
      ptrX += (tPtrX - ptrX) * 0.06;
      ptrY += (tPtrY - ptrY) * 0.06;
      ptrSpeed *= 0.94;
      /* espalhamento: abre ao entrar, fecha devagar ao sair */
      spread += ((hasPointer ? 1 : 0) - spread) * 0.055;

      /* paralaxe da cópia (só o eixo x; o y é da rolagem) */
      if (!reduce && hero) {
        hero.style.setProperty('--hero-copy-x', (ptrX * -12).toFixed(2) + 'px');
        /* 3 planos de montanha (CSS aplica taxas distintas por camada) */
        hero.style.setProperty('--hero-px', ptrX.toFixed(4));
        hero.style.setProperty('--hero-py', ptrY.toFixed(4));
      }

      /* ── camada de fundo: campo fluido ── */
      octx.setTransform(1, 0, 0, 1, 0, 0);
      octx.globalCompositeOperation = 'source-over';
      octx.globalAlpha = 1;
      octx.clearRect(0, 0, off.width, off.height);
      octx.setTransform(OFFS, 0, 0, OFFS, 0, 0);
      paintClouds(octx, W, H, backGroups, dt, an, false);
      maskField(octx, W, H, an);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(off, 0, 0, canvas.width, canvas.height);

      /* palavras escritas pelo mouse, por cima da nuvem (fonte do hero) */
      if (!reduce) {
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        drawInkWords(ctx, W, H, now);
      }

      /* ── camada frontal (sobre a marca), regida pela Cobertura ── */
      if (fctx) {
        fctx.setTransform(1, 0, 0, 1, 0, 0);
        fctx.clearRect(0, 0, frontCanvas.width, frontCanvas.height);
        var imm = settings.immersion;
        if (imm > 0.01) {
          octx.setTransform(1, 0, 0, 1, 0, 0);
          octx.globalCompositeOperation = 'source-over';
          octx.globalAlpha = 1;
          octx.clearRect(0, 0, off.width, off.height);
          octx.setTransform(OFFS, 0, 0, OFFS, 0, 0);
          paintClouds(octx, FW, FH, frontGroups, dt, an, true);
          /* frontal: faixa central (passa por cima da marca) */
          octx.globalCompositeOperation = 'destination-in';
          var fg = octx.createLinearGradient(0, 0, 0, FH);
          fg.addColorStop(0, 'rgba(0,0,0,0)');
          fg.addColorStop(0.30, 'rgba(0,0,0,0.55)');
          fg.addColorStop(0.68, 'rgba(0,0,0,0.85)');
          fg.addColorStop(1, 'rgba(0,0,0,0)');
          octx.fillStyle = fg;
          octx.setTransform(OFFS, 0, 0, OFFS, 0, 0);
          octx.fillRect(0, 0, FW, FH);
          octx.globalCompositeOperation = 'source-over';
          octx.globalAlpha = imm;
          fctx.drawImage(off, 0, 0, frontCanvas.width, frontCanvas.height);
          octx.globalAlpha = 1;
        }
      }

      if (reduce) { running = false; return; } /* quadro estático único */
      raf = window.requestAnimationFrame(frame);
    }

    function start() {
      if (running) return;
      running = true;
      if (reduce) { frame(t0); running = false; return; }
      raf = window.requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      if (raf) { window.cancelAnimationFrame(raf); raf = null; }
    }

    build();
    start();
    cloudStart = start;
    cloudStop = stop;
    redrawStatic = function () { frame(performance.now()); };

    /* Pausa quando o hero sai da viewport ou a aba fica oculta */
    if ('IntersectionObserver' in window && !reduce) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) start(); else stop();
      }, { threshold: 0 }).observe(hero);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else if (!reduce) start();
    });

    /* ── Ponteiro: normalizado em -1..1, como o do Kimi ────────────── */
    function overControls(target) {
      return target && target.closest && target.closest('[data-cloud-controls]');
    }
    function setPointer(e) {
      if (!hero || overControls(e.target)) return;   /* ignora sobre os controles */
      var r = hero.getBoundingClientRect();
      var nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / Math.max(r.width, 1)) * 2 - 1));
      var ny = Math.max(-1, Math.min(1, ((e.clientY - r.top) / Math.max(r.height, 1)) * 2 - 1));
      var now = performance.now();
      if (lastPX !== null) {
        var ddt = Math.max(16, now - lastPT);
        var sp = Math.hypot(nx - lastPX, ny - lastPY) / (ddt / 1000);
        ptrSpeed = Math.min(1.4, ptrSpeed + sp * 0.05);
      }
      lastPX = nx; lastPY = ny; lastPT = now;
      tPtrX = nx; tPtrY = ny;
      hasPointer = true;
      var cw = W || hero.offsetWidth, ch = H || hero.offsetHeight;
      /* escreve uma palavra quando o cursor percorre distância suficiente */
      var wpx = ((nx + 1) / 2) * cw, wpy = ((ny + 1) / 2) * ch;
      if (lastInkX === null || Math.hypot(wpx - lastInkX, wpy - lastInkY) > Math.max(120, cw * 0.10)) {
        spawnInkWord(wpx, wpy);
        lastInkX = wpx; lastInkY = wpy;
      }
    }
    function resetPointer() { tPtrX = 0; tPtrY = 0; hasPointer = false; lastPX = null; }
    if (!reduce) {
      hero.addEventListener('pointermove', setPointer, { passive: true });
      hero.addEventListener('pointerdown', setPointer, { passive: true });
      hero.addEventListener('pointerleave', resetPointer, { passive: true });
      hero.addEventListener('pointercancel', resetPointer, { passive: true });
      window.addEventListener('blur', resetPointer, { passive: true });
    }

    /* Redimensiona com debounce */
    var rt;
    window.addEventListener('resize', function () {
      window.clearTimeout(rt);
      rt = window.setTimeout(function () { build(); if (reduce) frame(performance.now()); }, 180);
    }, { passive: true });
  }

  /* ── Parallax de rolagem (variáveis CSS) ──────────────────────────── */
  function updateParallax() {
    if (!hero || reduce) return;
    var y = Math.max(0, window.scrollY || window.pageYOffset || 0);
    var height = Math.max(hero.offsetHeight, 1);
    prog = Math.min(y / height, 1);
    hero.style.setProperty('--hero-photo-y', (prog * 52).toFixed(2) + 'px');
    hero.style.setProperty('--hero-scale', (1.045 + prog * .055).toFixed(4));
    hero.style.setProperty('--hero-copy-y', (prog * -70).toFixed(2) + 'px');
    hero.style.setProperty('--hero-copy-scale', (1 - prog * .045).toFixed(4));
    hero.style.setProperty('--hero-copy-blur', (prog * 5).toFixed(2) + 'px');
    hero.style.setProperty('--hero-copy-opacity', Math.max(1 - prog * 1.15, 0).toFixed(3));
  }

  var ticking = false;
  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () { updateHeader(); updateParallax(); ticking = false; });
  }

  /* ── Botão "role para explorar" ───────────────────────────────────── */
  if (scrollButton && demo) {
    scrollButton.addEventListener('click', function () {
      demo.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  }

  if (navToggle) {
    navToggle.addEventListener('click', function () { window.setTimeout(updateHeader, 0); });
  }
  if (nav) {
    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) window.setTimeout(updateHeader, 0);
    });
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
  if (motionQuery.addEventListener) motionQuery.addEventListener('change', function () {
    reduce = motionQuery.matches;
    if (reduce) { reveal(); if (cloudStop) cloudStop(); redrawStatic(); }
    else if (cloudStart) { cloudStart(); }
    requestUpdate();
  });

  updateHeader();
  updateParallax();
})();
