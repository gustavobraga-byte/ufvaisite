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
    var noiseTex = null;                             /* textura FBM tileable */
    var cloudPattern = null;                         /* pattern cacheado (1 criação) */
    var backLayers = [], frontLayers = [];           /* camadas do campo */
    var wisps = [];                                  /* "bagunço" do ponteiro */
    var t0 = performance.now();
    var raf = null;
    var prog = 0;                   /* progresso da rolagem dentro do hero */
    var ptrX = 0, ptrY = 0;         /* ponteiro suavizado, -1..1 */
    var tPtrX = 0, tPtrY = 0;       /* alvo do ponteiro, -1..1 */
    var hasPointer = false;         /* ponteiro ativo sobre a cena */
    var ptrSpeed = 0;               /* velocidade recente (intensidade do bagunço) */
    var lastPX = null, lastPY = null, lastPT = 0;
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

    /* Ruído de valor FBM tileable (4 oitavas) → massa de nuvem contínua. */
    function makeNoiseTexture(size, seed) {
      var c = document.createElement('canvas');
      c.width = c.height = size;
      var g = c.getContext('2d');
      var img = g.createImageData(size, size);
      var d = img.data;
      var r = prng(seed);
      var smooth = function (t) { return t * t * (3 - 2 * t); };
      /* amostra FBM tileable: grades de lattice com wrap-around */
      function fbm(x, y) {
        var amp = 1, freq = 4, sum = 0, norm = 0;
        for (var o = 0; o < 4; o++) {
          var N = freq;
          /* lattice aleatório N×N (por oitava) */
          var lat = new Float32Array(N * N);
          for (var i = 0; i < N * N; i++) lat[i] = r();
          var fx = x * N, fy = y * N;
          var x0 = Math.floor(fx), y0 = Math.floor(fy);
          var tx = smooth(fx - x0), ty = smooth(fy - y0);
          var xa = ((x0 % N) + N) % N, ya = ((y0 % N) + N) % N;
          var xb = (xa + 1) % N, yb = (ya + 1) % N;
          var v00 = lat[ya * N + xa], v10 = lat[ya * N + xb];
          var v01 = lat[yb * N + xa], v11 = lat[yb * N + xb];
          var v0 = v00 + (v10 - v00) * tx;
          var v1 = v01 + (v11 - v01) * tx;
          sum += (v0 + (v1 - v0) * ty) * amp;
          norm += amp;
          amp *= 0.55; freq *= 2;
        }
        return sum / norm;
      }
      for (var y = 0; y < size; y++) {
        for (var x = 0; x < size; x++) {
          var n = fbm(x / size, y / size);
          /* contraste suave → brancos densos, bordas dissolvidas */
          var a = Math.pow(Math.max(0, Math.min(1, (n - 0.34) / 0.5)), 1.35);
          var k = (y * size + x) * 4;
          d[k] = d[k + 1] = d[k + 2] = 255;
          d[k + 3] = Math.round(a * 255);
        }
      }
      g.putImageData(img, 0, 0);
      return c;
    }

    /* Camadas do campo: escala/velocidade/opacidade distintas (profundidade). */
    function buildLayers() {
      backLayers = [
        { s: 0.85, sp: 0.011, a: 0.55, bob: 7, ph: 0.0 },
        { s: 1.55, sp: 0.020, a: 0.40, bob: 11, ph: 2.1 },
        { s: 2.70, sp: 0.033, a: 0.28, bob: 16, ph: 4.2 }
      ];
      frontLayers = [
        { s: 1.20, sp: 0.014, a: 0.60, bob: 9, ph: 1.3 },
        { s: 2.20, sp: 0.027, a: 0.34, bob: 14, ph: 3.6 }
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
      if (!noiseTex) noiseTex = makeNoiseTexture(256, 9137);
      if (!cloudPattern) cloudPattern = octx.createPattern(noiseTex, 'repeat');
      if (!backLayers.length) buildLayers();
    }

    /* Derivadas dos sliders (faixas idênticas às do Kimi) */
    function amountN() { return (settings.cloudAmount - 0.65) / (5 - 0.65); } /* 0..1 */
    function driftTime(t) { return t * (settings.flowSpeed / 3); }            /* 3× = base */

    /* Desenha uma camada do campo FBM com deriva (pattern escalado). */
    function paintField(g, w, h, layers, dt, an) {
      g.globalCompositeOperation = 'source-over';
      for (var i = 0; i < layers.length; i++) {
        var L = layers[i];
        var ox = -(dt * L.sp * w * 0.06) % (256 * L.s);
        var oy = Math.sin(dt * 0.10 + L.ph) * L.bob - prog * 26 * (i + 1);
        g.globalAlpha = Math.min(1, L.a * (0.55 + an * 0.9));
        g.save();
        g.setTransform(OFFS, 0, 0, OFFS, 0, 0);
        g.translate(ox, oy);
        g.scale(L.s, L.s);
        g.fillStyle = cloudPattern;
        g.fillRect(-ox / L.s, -oy / L.s, w / L.s + 2, h / L.s + 2);
        g.restore();
        g.setTransform(OFFS, 0, 0, OFFS, 0, 0);
      }
      g.globalAlpha = 1;
    }

    /* Mascara o campo: denso na base (mar de nuvens), ralo no alto. */
    function maskField(g, w, h, an) {
      g.globalCompositeOperation = 'destination-in';
      var grad = g.createLinearGradient(0, 0, 0, h);
      var top = 0.06 + (1 - an) * 0.10;
      grad.addColorStop(0, 'rgba(0,0,0,' + top.toFixed(3) + ')');
      grad.addColorStop(0.34, 'rgba(0,0,0,0.16)');
      grad.addColorStop(0.62, 'rgba(0,0,0,0.72)');
      grad.addColorStop(1, 'rgba(0,0,0,1)');
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
          size: 46 + Math.random() * 90,
          rot: Math.random() * 6.2832
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
        g.save();
        g.globalAlpha = 0.22 * W2.life;
        g.translate(W2.x, W2.y);
        g.rotate(W2.rot);
        g.scale(W2.size / 256, W2.size / 256);
        g.fillStyle = cloudPattern;
        g.fillRect(-128, -128, 256, 256);
        g.restore();
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }

    /* ── Texto que o mouse ESCREVE na hero ──────────────────────────────
       Espírito do efeito de escrita do Kimi (writingProgress/inkStarts):
       ao mover o cursor, palavras-chave do UFVAI (no idioma corrente)
       são "escritas" como tinta — revelam-se da esquerda para a
       direita, borram e se dissolvem na nuvem, subindo com a deriva. */
    var WORDS = {
      pt: ['integridade', 'reprodutibilidade', 'transparência', 'evidência',
           'rigor', 'método', 'hipótese', 'incerteza', 'pesquisa', 'ciência',
           'dados', 'validação', 'UFVAI', 'Viçosa', 'Minas Gerais'],
      en: ['integrity', 'reproducibility', 'transparency', 'evidence',
           'rigor', 'method', 'hypothesis', 'uncertainty', 'research', 'science',
           'data', 'validation', 'UFVAI', 'Viçosa', 'Minas Gerais'],
      es: ['integridad', 'reproducibilidad', 'transparencia', 'evidencia',
           'rigor', 'método', 'hipótesis', 'incertidumbre', 'investigación', 'ciencia',
           'datos', 'validación', 'UFVAI', 'Viçosa', 'Minas Gerais'],
      fr: ['intégrité', 'reproductibilité', 'transparence', 'preuve',
           'rigueur', 'méthode', 'hypothèse', 'incertitude', 'recherche', 'science',
           'données', 'validation', 'UFVAI', 'Viçosa', 'Minas Gerais'],
      zh: ['诚信', '可复现', '透明', '证据', '严谨', '方法', '假设',
           '不确定性', '科研', '科学', '数据', '验证', 'UFVAI', '维索萨', '米纳斯']
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
      paintField(octx, W, H, backLayers, dt, an);
      maskField(octx, W, H, an);
      stirField(octx, W, H);
      drawWisps(octx, W, H, dtFrame);
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
          paintField(octx, FW, FH, frontLayers, dt, an);
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
      spawnWisps(cw, ch);
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
    hero.style.setProperty('--hero-scale', (1.045 + prog * .035).toFixed(4));
    hero.style.setProperty('--hero-copy-y', (prog * -48).toFixed(2) + 'px');
    hero.style.setProperty('--hero-copy-opacity', Math.max(1 - prog * 1.1, 0).toFixed(3));
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
