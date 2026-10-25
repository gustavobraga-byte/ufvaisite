/* ═══════════════════════════════════════════════════════════════════
   UFVAI — Site institucional v6 · complementos de interface
   1) libera a página após o i18n aplicar (evita flash de idioma)
   2) mantém os rótulos dos controles do topo no idioma ativo
   3) avisa quando o idioma veio do navegador
   4) abre/fecha e opera o painel de ajustes do hero
   Nenhuma regra científica/editorial é tocada aqui.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var root = document.documentElement;

  /* ── 1. i18n: libera a pintura ─────────────────────────────────── */
  function releasePaint() {
    root.classList.remove('i18n-pending');
    root.classList.add('i18n-ready');
  }
  releasePaint();

  /* ── 2. Rótulos próprios dos controles novos ─────────────────────
     Ficam fora do i18n.js (que é o dicionário editorial do site); aqui
     só entram palavras de interface que não existiam antes. */
  var UI = {
    pt: { lang: 'Idioma', theme: 'Tema', light: 'Claro', dark: 'Escuro',
          adjust: 'Ajustes', panel: 'Ajustes do cenário', reset: 'Restaurar',
          hint: 'Detectamos <b>{L}</b> no seu navegador. Troque quando quiser.',
          menuTitle: 'Idioma da interface' },
    en: { lang: 'Language', theme: 'Theme', light: 'Light', dark: 'Dark',
          adjust: 'Adjust', panel: 'Scene settings', reset: 'Reset',
          hint: 'We detected <b>{L}</b> in your browser. Change it anytime.',
          menuTitle: 'Interface language' },
    es: { lang: 'Idioma', theme: 'Tema', light: 'Claro', dark: 'Oscuro',
          adjust: 'Ajustes', panel: 'Ajustes de la escena', reset: 'Restaurar',
          hint: 'Detectamos <b>{L}</b> en tu navegador. Cámbialo cuando quieras.',
          menuTitle: 'Idioma de la interfaz' },
    fr: { lang: 'Langue', theme: 'Thème', light: 'Clair', dark: 'Sombre',
          adjust: 'Réglages', panel: 'Réglages de la scène', reset: 'Réinitialiser',
          hint: 'Nous avons détecté <b>{L}</b> dans votre navigateur. Modifiable à tout moment.',
          menuTitle: 'Langue de l’interface' },
    zh: { lang: '语言', theme: '主题', light: '浅色', dark: '深色',
          adjust: '调整', panel: '场景设置', reset: '重置',
          hint: '检测到浏览器语言为 <b>{L}</b>，可随时切换。',
          menuTitle: '界面语言' }
  };
  var NAMES = { pt: 'Português', en: 'English', es: 'Español', fr: 'Français', zh: '中文（简体）' };
  var CODES = { pt: 'PT', en: 'EN', es: 'ES', fr: 'FR', zh: 'ZH' };

  function currentLang() {
    try {
      if (window.UFVAI_I18N && window.UFVAI_I18N.lang) return window.UFVAI_I18N.lang;
    } catch (e) {}
    return root.getAttribute('data-lang') || 'pt';
  }
  function dict() { return UI[currentLang()] || UI.pt; }

  var elLangName = document.getElementById('lang-current-name');
  var elLangCode = document.getElementById('lang-current');
  var elLangHint = document.getElementById('lang-hint');
  var elThemeLabel = document.getElementById('theme-label');
  var elLangBtn = document.getElementById('lang-btn');
  var elThemeBtn = document.getElementById('theme-toggle');
  var elMenuTitle = document.querySelector('.lang-menu__title');
  var elHctrlLabel = document.getElementById('hctrl-label');
  var elHctrlTitle = document.getElementById('hctrl-title');
  var elHctrlReset = document.getElementById('hctrl-reset-label');
  var elHctrlToggle = document.getElementById('hctrl-toggle');

  function paintLabels() {
    var d = dict();
    var lang = currentLang();

    if (elLangName) elLangName.textContent = NAMES[lang] || NAMES.pt;
    if (elLangCode) elLangCode.textContent = CODES[lang] || 'PT';
    if (elThemeLabel) elThemeLabel.textContent = d.theme;
    if (elMenuTitle) elMenuTitle.textContent = d.menuTitle;
    if (elHctrlLabel) elHctrlLabel.textContent = d.adjust;
    if (elHctrlTitle) elHctrlTitle.textContent = d.panel;
    if (elHctrlReset) elHctrlReset.textContent = d.reset;

    if (elLangBtn) elLangBtn.setAttribute('title', d.lang + ' · ' + (NAMES[lang] || 'Português'));
    if (elHctrlToggle) elHctrlToggle.setAttribute('title', d.panel);

    /* Aviso de detecção: só quando a origem é o navegador (1ª visita). */
    if (elLangHint) {
      var src = root.getAttribute('data-lang-source');
      var det = root.getAttribute('data-lang-detected') || 'pt';
      var showHint = (src === 'browser' || src === 'default') && det === lang && lang !== 'pt';
      if (showHint) {
        elLangHint.innerHTML = d.hint.replace('{L}', NAMES[det] || det);
        elLangHint.hidden = false;
      } else if (src === 'browser' && det !== lang) {
        elLangHint.innerHTML = d.hint.replace('{L}', NAMES[det] || det);
        elLangHint.hidden = false;
      } else {
        elLangHint.hidden = true;
      }
    }
    paintThemeLabel();
  }

  function paintThemeLabel() {
    if (!elThemeLabel) return;
    var dark = root.getAttribute('data-theme') === 'dark';
    var d = dict();
    elThemeLabel.textContent = d.theme;
    if (elThemeBtn) {
      elThemeBtn.setAttribute('title', dark ? d.light : d.dark);
      elThemeBtn.setAttribute('aria-label', dark ? d.light : d.dark);
    }
  }

  paintLabels();
  try {
    if (window.UFVAI_I18N && window.UFVAI_I18N.onChange) {
      window.UFVAI_I18N.onChange(function () { paintLabels(); syncValues(); });
    }
  } catch (e) {}

  if (elThemeBtn) elThemeBtn.addEventListener('click', function () { setTimeout(paintThemeLabel, 0); });
  if ('MutationObserver' in window) {
    new MutationObserver(paintThemeLabel).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }

  /* Escolha explícita do usuário: o aviso "detectamos X no navegador"
     deixa de fazer sentido e é retirado. */
  var langMenu = document.getElementById('lang-menu');
  if (langMenu) {
    langMenu.addEventListener('click', function (ev) {
      var opt = ev.target.closest('[data-lang]');
      if (!opt) return;
      root.setAttribute('data-lang-source', 'saved');
      if (elLangHint) elLangHint.hidden = true;
    });
  }

  /* ── 3. Painel de ajustes do hero ──────────────────────────────── */
  var panel = document.getElementById('hctrl-panel');
  var btnToggle = document.getElementById('hctrl-toggle');
  var btnClose = document.getElementById('hctrl-close');
  var btnReset = document.getElementById('hctrl-reset');
  var box = document.getElementById('hero-controls');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var DEFAULTS = { cloudAmount: 0.65, flowSpeed: 3, ink: 0.9, immersion: 1 };

  /* Unidades por controle: velocidade é fator (3.0×); os demais são
     proporções (nuvens 65–500%, marca 0–100%, cobertura 0–100%). */
  function fmt(key, v) {
    return key === 'flowSpeed' ? v.toFixed(1) + '\u00d7' : Math.round(v * 100) + '%';
  }

  function rows() {
    return panel ? panel.querySelectorAll('.hctrl__row') : [];
  }

  function syncValues() {
    Array.prototype.forEach.call(rows(), function (row) {
      var input = row.querySelector('input[type="range"]');
      if (!input) return;
      var key = row.getAttribute('data-key');
      var out = row.querySelector('.hctrl__val');
      var txt = fmt(key, Number(input.value));
      if (out) out.textContent = txt;
      input.setAttribute('aria-valuetext', txt);
      var name = row.querySelector('.hero__control-label');
      var label = name ? (name.textContent || '').trim() : '';
      row.setAttribute('title', (label ? label + ': ' : '') + txt);
      row.style.setProperty('--progress', String(
        (Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min))
      ));
    });
  }

  function isOpen() { return panel && panel.classList.contains('is-open'); }

  function setOpen(open) {
    if (!panel || !btnToggle) return;
    panel.classList.toggle('is-open', open);
    btnToggle.setAttribute('aria-expanded', String(open));
    if (open) {
      syncValues();
      var first = panel.querySelector('input[type="range"]');
      if (first && !reduce) { try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); } }
    }
  }

  if (panel && btnToggle) {
    btnToggle.addEventListener('click', function (ev) {
      ev.stopPropagation();
      setOpen(!isOpen());
    });
    if (btnClose) btnClose.addEventListener('click', function () { setOpen(false); btnToggle.focus(); });
    document.addEventListener('click', function (ev) {
      if (isOpen() && box && !box.contains(ev.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && isOpen()) { setOpen(false); btnToggle.focus(); }
    });

    Array.prototype.forEach.call(rows(), function (row) {
      var input = row.querySelector('input[type="range"]');
      if (!input) return;
      input.addEventListener('input', syncValues);
      input.addEventListener('change', syncValues);
    });

    if (btnReset) {
      btnReset.addEventListener('click', function () {
        Array.prototype.forEach.call(rows(), function (row) {
          var input = row.querySelector('input[type="range"]');
          var key = row.getAttribute('data-key');
          if (!input || !(key in DEFAULTS)) return;
          input.value = DEFAULTS[key];
          input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        syncValues();
      });
    }

    /* O hero.js grava os rótulos/valores no seu próprio ciclo; aqui só
       garantimos que os números apareçam já no primeiro quadro. */
    syncValues();
    window.setTimeout(syncValues, 350);
    window.setTimeout(syncValues, 1200);
  }
})();
