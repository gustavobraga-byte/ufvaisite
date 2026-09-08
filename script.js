/* ═══════════════════════════════════════════════════════════════════
   UFVAI — Site institucional v2 · interações
   Tema claro/escuro · menu mobile · digitação · contadores ·
   revelação ao rolar · acordeão FAQ · demo simulada do chat
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Atalho de tradução (i18n.js carrega antes; com fallback pt-BR) */
  function T(key, fb) {
    try {
      if (window.UFVAI_I18N) return window.UFVAI_I18N.t(key);
    } catch (e) {}
    return fb;
  }

  /* ── Tema claro/escuro (padrão: claro, como o logo) ───────────────── */
  var toggle = document.getElementById('theme-toggle');
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    if (toggle) {
      var dark = theme === 'dark';
      toggle.setAttribute('aria-pressed', String(dark));
      toggle.setAttribute('aria-label', dark ? T('theme.toLight', 'Ativar modo claro') : T('theme.toDark', 'Ativar modo escuro'));
    }
  }
  if (toggle) {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    toggle.addEventListener('click', function () {
      var dark = document.documentElement.getAttribute('data-theme') === 'dark';
      var next = dark ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem('ufvai-theme', next); } catch (e) { /* sem storage */ }
    });
  }

  /* ── Menu mobile ──────────────────────────────────────────────────── */
  var navToggle = document.getElementById('nav-toggle');
  var nav = document.getElementById('nav-principal');
  var navOpen = false;
  function setNavAria() {
    if (navToggle) navToggle.setAttribute('aria-label', navOpen ? T('navToggle.close', 'Fechar menu') : T('navToggle.open', 'Abrir menu'));
  }
  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      navOpen = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(navOpen));
      setNavAria();
    });
    nav.addEventListener('click', function (ev) {
      if (ev.target.tagName === 'A') {
        nav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ── Efeito de digitação na headline (refeito a cada troca de idioma) */
  var typedEl = document.getElementById('typed');
  var typeTimer = null;
  function typePhrase() {
    if (!typedEl) return;
    var PHRASE = T('hero.typed', 'A inteligência que acelera a ciência.');
    if (typeTimer) { clearTimeout(typeTimer); typeTimer = null; }
    if (reduceMotion) {
      typedEl.textContent = PHRASE;
      return;
    }
    var i = 0;
    typedEl.textContent = '';
    (function type() {
      if (i <= PHRASE.length) {
        typedEl.textContent = PHRASE.slice(0, i);
        i += 1;
        typeTimer = setTimeout(type, 52);
      }
    })();
  }
  typePhrase();

  /* ── Contadores animados (estatísticas) ──────────────────────────── */
  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (reduceMotion) { el.textContent = String(target); return; }
    var t0 = null;
    var DUR = 1400;
    function frame(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / DUR, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ── Revelação ao rolar + gatilho dos contadores ─────────────────── */
  var revealables = document.querySelectorAll('.reveal');
  var counters = document.querySelectorAll('[data-count]');
  var counted = false;
  function fireCounters() {
    if (counted) return;
    counted = true;
    counters.forEach(animateCount);
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealables.forEach(function (el) { io.observe(el); });

    var statsBox = document.querySelector('.stats');
    if (statsBox) {
      var ioStats = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { fireCounters(); ioStats.disconnect(); }
      }, { threshold: 0.4 });
      ioStats.observe(statsBox);
    } else {
      fireCounters();
    }
  } else {
    revealables.forEach(function (el) { el.classList.add('is-visible'); });
    fireCounters();
  }

  /* ── Acordeão do FAQ ─────────────────────────────────────────────── */
  var questions = document.querySelectorAll('.faq__q');
  questions.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      var open = btn.getAttribute('aria-expanded') === 'true';
      /* fecha os demais (comportamento de acordeão único) */
      questions.forEach(function (other) {
        if (other !== btn && other.getAttribute('aria-expanded') === 'true') {
          other.setAttribute('aria-expanded', 'false');
          var p = document.getElementById(other.getAttribute('aria-controls'));
          if (p) p.hidden = true;
        }
      });
      btn.setAttribute('aria-expanded', String(!open));
      if (panel) panel.hidden = open;
    });
  });

  /* ── Demo animada: boot → Termos (e-mail + aceite) → tela principal ─ */
  var panelBoot = document.getElementById('panel-boot');
  var panelTerms = document.getElementById('panel-terms');
  var panelApp = document.getElementById('panel-app');
  var chatBody = document.getElementById('chat-body');
  var replayBtn = document.getElementById('screen-replay');
  var demoTimers = [];

  /* Roteiro da demo: fluxo científico (autores, revisão de artigo) por idioma.
     Sem números inventados: só o dado verificado de Viçosa + citação real do projeto. */
  var SCRIPT_FALLBACK = [
    { who: 'sys',  text: 'UFVAI pronto! · atualização v0.6.17 aplicada · Minha memória instantânea ativada' },
    { who: 'user', text: 'Estruture um artigo sobre a dinâmica populacional de Viçosa (MG) e sugira referências.' },
    { who: 'ai',   text: 'Plano de pesquisa estruturado: ① pergunta e escopo · ② coleta IBGE/SIDRA · ③ triagem OpenAlex/SciELO · ④ validação de cada afirmação · ⑤ redação ABNT.' },
    { who: 'ai',   text: 'Coleta concluída: Viçosa (MG) — população residente de 76.430 pessoas (Censo 2022).',
      chip: '[DADO CONFIRMADO]', chipClass: 'chip--ok',
      source: 'Fonte: SIDRA, tab. 9514 (IBGE, Censo 2022) · consultado em 07/09/2026.' },
    { who: 'ai',   text: 'Triagem de literatura: candidatos deduplicados por DOI; autores e referências sugeridos somente após validação de identificadores persistentes via citation-management.' },
    { who: 'ai',   text: 'Revisão do rascunho: conferidas fonte, ano e nota metodológica de cada afirmação. Exemplo validado: BRAGA (2026) — UFVAI, URL oficial verificada.',
      chip: '[FONTE VERIFICADA]', chipClass: 'chip--ok' },
    { who: 'ai',   text: 'Onde a evidência não basta, marco [SEM DADOS SUFICIENTES] em vez de inventar. Entrega salva na Minha memória e em outputs-dinamica-vicosa/.' }
  ];
  function getScript() {
    try {
      if (window.UFVAI_I18N) {
        var s = window.UFVAI_I18N.script();
        if (s && s.length) return s;
      }
    } catch (e) {}
    return SCRIPT_FALLBACK;
  }

  function later(fn, ms) { demoTimers.push(setTimeout(fn, ms)); }
  function clearDemo() { demoTimers.forEach(clearTimeout); demoTimers = []; }

  function showPanel(panel) {
    [panelBoot, panelTerms, panelApp].forEach(function (p) {
      if (!p) return;
      var active = p === panel;
      p.classList.toggle('is-active', active);
      p.setAttribute('aria-hidden', String(!active));
    });
  }

  function buildMsg(item) {
    var div = document.createElement('div');
    if (item.who === 'sys') {
      div.className = 'sysline';
      div.textContent = item.text;
      return div;
    }
    div.className = 'msg msg--' + item.who;
    var p = document.createElement('p');
    p.textContent = item.text;
    div.appendChild(p);
    if (item.source) {
      var s = document.createElement('span');
      s.className = 'msg__source';
      s.textContent = item.source;
      div.appendChild(s);
    }
    if (item.chip) {
      var c = document.createElement('span');
      c.className = 'chip ' + (item.chipClass || '');
      c.textContent = item.chip;
      div.appendChild(c);
    }
    return div;
  }

  function buildTyping() {
    var div = document.createElement('div');
    div.className = 'msg msg--ai';
    div.innerHTML = '<span class="typing" aria-label="' + T('demo.typing', 'UFVAI digitando') + '"><span></span><span></span><span></span></span>';
    return div;
  }

  function runChat(done) {
    if (!chatBody) { if (done) done(); return; }
    chatBody.innerHTML = '';
    var SCRIPT = getScript();
    var idx = 0;
    function next() {
      if (idx >= SCRIPT.length) { if (done) done(); return; }
      var item = SCRIPT[idx];
      idx += 1;
      if (item.who === 'ai' && !reduceMotion) {
        var typing = buildTyping();
        chatBody.appendChild(typing);
        later(function () {
          if (typing.parentNode) chatBody.replaceChild(buildMsg(item), typing);
          later(next, 900);
        }, 1100);
      } else {
        chatBody.appendChild(buildMsg(item));
        later(next, item.who === 'user' ? 700 : 1000);
      }
    }
    next();
  }

  /* Estágio 1 — barra de progresso + checkpoints reais do boot */
  function runBoot(next) {
    var fill = document.getElementById('boot-fill');
    var pct = document.getElementById('boot-pct');
    var items = document.querySelectorAll('#boot-list li');
    var openBtn = document.getElementById('boot-open');
    var marks = [18, 42, 68, 88];
    var mi = 0;
    if (reduceMotion) {
      if (fill) fill.style.width = '100%';
      if (pct) pct.textContent = '100';
      items.forEach(function (li) { li.classList.add('done'); });
      if (openBtn) openBtn.classList.add('show');
      later(next, 400);
      return;
    }
    var t0 = null;
    var DUR = 3000;
    function frame(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / DUR, 1);
      var eased = p < .85 ? p * 1.06 : .9 + (p - .85) * .66; /* pausa sutil no fim */
      var val = Math.min(Math.round(eased * 100), 100);
      if (fill) fill.style.width = val + '%';
      if (pct) pct.textContent = String(val);
      while (mi < marks.length && val >= marks[mi]) {
        items[mi].classList.add('done');
        mi += 1;
      }
      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        items.forEach(function (li) { li.classList.add('done'); });
        if (openBtn) openBtn.classList.add('show');
        later(next, 1100);
      }
    }
    requestAnimationFrame(frame);
  }

  /* Estágio 2 — digitação de nome/e-mail + aceite + ativação */
  function runTerms(next) {
    var nameEl = document.getElementById('t-name');
    var mailEl = document.getElementById('t-email');
    var chk = document.getElementById('chk-terms');
    var btn = document.getElementById('terms-btn');
    var NAME = 'Ana Souza';
    var MAIL = 'ana.souza@ufv.br';
    function typeInto(el, text, fieldClass, done) {
      var field = el ? el.closest('.field') : null;
      if (field) field.classList.add('field--typing');
      var i = 0;
      (function step() {
        if (i <= text.length) {
          el.value = text.slice(0, i);
          i += 1;
          later(step, 42);
        } else {
          if (field) field.classList.remove('field--typing');
          later(done, 220);
        }
      })();
    }
    if (reduceMotion) {
      if (nameEl) nameEl.value = NAME;
      if (mailEl) mailEl.value = MAIL;
      if (chk) chk.checked = true;
      if (btn) btn.classList.add('ready');
      later(next, 400);
      return;
    }
    later(function () {
      typeInto(nameEl, NAME, null, function () {
        typeInto(mailEl, MAIL, null, function () {
          later(function () {
            if (chk) chk.checked = true;
            later(function () {
              if (btn) btn.classList.add('ready');
              later(function () {
                if (btn) btn.classList.add('clicked');
                later(next, 420);
              }, 650);
            }, 420);
          }, 260);
        });
      });
    }, 500);
  }

  function runDemo() {
    clearDemo();
    showPanel(panelBoot);
    runBoot(function () {
      showPanel(panelTerms);
      runTerms(function () {
        showPanel(panelApp);
        later(function () { runChat(null); }, 500);
      });
    });
  }

  if (panelBoot && panelTerms && panelApp) {
    if (reduceMotion) {
      /* Sem animação: vai direto à tela principal com a conversa completa */
      showPanel(panelApp);
      runChat(null);
    } else if ('IntersectionObserver' in window) {
      var ioDemo = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { runDemo(); ioDemo.disconnect(); }
      }, { threshold: 0.3 });
      ioDemo.observe(document.getElementById('screen-demo') || panelBoot);
    } else {
      runDemo();
    }
    if (replayBtn) {
      replayBtn.addEventListener('click', function () { runDemo(); });
    }
  }

  /* ── Player da apresentação: play + tela cheia ───────────────────── */
  var deckPlayer = document.getElementById('deck-player');
  var deckCover = document.getElementById('deck-cover');
  var deckFrame = document.getElementById('deck-frame');
  var deckPlay = document.getElementById('deck-play');
  var deckPlay2 = document.getElementById('deck-play-2');
  var deckFull = document.getElementById('deck-full');
  function playDeck() {
    if (deckCover) deckCover.classList.add('hidden');
    if (deckPlayer) deckPlayer.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    try { if (deckFrame) deckFrame.contentWindow.focus(); } catch (e) {}
  }
  function syncFullBtn() {
    if (!deckFull) return;
    var fs = !!(document.fullscreenElement);
    deckFull.textContent = fs ? T('apres.exitFull', 'Sair da tela cheia') : T('apres.full', 'Tela cheia');
  }
  function toggleDeckFull() {
    try {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen();
      } else if (deckPlayer) {
        if (deckPlayer.requestFullscreen) deckPlayer.requestFullscreen();
        else if (deckPlayer.webkitRequestFullscreen) deckPlayer.webkitRequestFullscreen();
      }
    } catch (e) {}
  }
  if (deckPlay) deckPlay.addEventListener('click', playDeck);
  if (deckPlay2) deckPlay2.addEventListener('click', playDeck);
  if (deckFull) deckFull.addEventListener('click', toggleDeckFull);
  document.addEventListener('fullscreenchange', syncFullBtn);
  document.addEventListener('webkitfullscreenchange', syncFullBtn);

  /* ── Ano corrente no rodapé ──────────────────────────────────────── */
  var yearEl = document.getElementById('ano');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ── Troca de idioma: re-digita a frase, atualiza rótulos e reinicia a demo */
  try {
    if (window.UFVAI_I18N && window.UFVAI_I18N.onChange) {
      window.UFVAI_I18N.onChange(function () {
        typePhrase();
        setNavAria();
        syncFullBtn();
        applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
        if (panelBoot && panelTerms && panelApp) runDemo();
      });
    }
  } catch (e) {}
})();
