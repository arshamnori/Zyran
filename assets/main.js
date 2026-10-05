const ZYRAN_CONFIG = window.ZYRAN_CONFIG || { features: {}, server: {}, links: {} };

document.addEventListener('DOMContentLoaded', () => {
  const initializers = [
    hideLoader,
    initTheme,
    initMobileNav,
    initConfiguredLinks,
    initCopyServerAddress,
    initServerStatus,
    initPetals,
    initAuthState,
    initScrollReveal,
    initStarfield,
    initClickFX,
    initTreeShed,
    initDonateSparkles,
    initAuthTabs,
    initCardHoverTouch
  ];

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  initializers.forEach(fn => {
    try {
      const result = fn();
      if (result && typeof result.catch === 'function') {
        result.catch(err => console.error('[zyran]', fn.name, 'failed:', err));
      }
    } catch (err) {
      console.error('[zyran]', fn.name, 'failed:', err);
    }
  });
});

function hideLoader(){
  const loader = document.getElementById('pageLoader');
  if (loader) requestAnimationFrame(() => loader.classList.add('hide'));
}

function initTheme(){
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;
  themeToggle.setAttribute('aria-pressed', document.documentElement.dataset.theme === 'light' ? 'true' : 'false');
  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    themeToggle.setAttribute('aria-pressed', next === 'light' ? 'true' : 'false');
    try { localStorage.setItem('zyran_theme', next); } catch (_) {}
  });
}

function getFocusable(container){
  return Array.from(container.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter(el => !el.hidden && el.getAttribute('aria-hidden') !== 'true');
}

function trapFocus(event, container){
  if (event.key !== 'Tab') return;
  const items = getFocusable(container);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function syncBodyLock(){
  const hasOpenDrawer = document.querySelector('.mobile-nav.open, .cart-drawer.open');
  document.body.classList.toggle('menu-open', Boolean(hasOpenDrawer));
}

function initMobileNav(){
  const burgerBtn = document.getElementById('burgerBtn');
  const mobileNav = document.getElementById('mobileNav');
  const mobileClose = document.getElementById('mobileClose');
  if (!burgerBtn || !mobileNav) return;

  let mobileOverlay = document.getElementById('mobileOverlay');
  if (!mobileOverlay) {
    mobileOverlay = document.createElement('div');
    mobileOverlay.className = 'mobile-overlay';
    mobileOverlay.id = 'mobileOverlay';
    document.body.insertBefore(mobileOverlay, mobileNav);
  }

  const currentHref = location.pathname.split('/').pop() || 'index.html';
  const menuItems = [
    ['index.html', 'خانه'],
    ['modes.html', 'حالت‌های بازی'],
    ['downloads.html', 'دانلودها'],
    ['guide.html', 'راهنما'],
    ['about.html', 'درباره ما'],
    ['shop.html', 'فروشگاه'],
    ['donate.html', 'حمایت از سرور'],
    ['telegram-bot.html', 'بات تلگرامی'],
    ['index.html#faq', 'سؤالات متداول'],
    ['index.html#feedback', 'انتقادات و پیشنهادات']
  ];
  menuItems.forEach(([href, label]) => {
    let link = mobileNav.querySelector(`a[href="${href}"]`);
    if (!link) {
      link = document.createElement('a');
      link.href = href;
      mobileNav.appendChild(link);
    }
    link.textContent = label;
    link.classList.toggle('current', href.split('#')[0] === currentHref && !href.includes('#'));
  });

  let auth = mobileNav.querySelector('a.btn-auth');
  if (!auth) {
    auth = document.createElement('a');
    auth.className = 'btn-auth';
    auth.href = 'login.html';
    const head = mobileNav.querySelector('.mobile-nav-head');
    head?.insertAdjacentElement('afterend', auth);
  }
  auth.textContent = ZYRAN_CONFIG.features?.auth ? 'ورود / ثبت‌نام' : 'حساب کاربری — به‌زودی';

  burgerBtn.setAttribute('aria-controls', mobileNav.id);
  burgerBtn.setAttribute('aria-expanded', 'false');
  mobileNav.setAttribute('role', 'dialog');
  mobileNav.setAttribute('aria-modal', 'true');
  mobileNav.setAttribute('aria-label', 'منوی سایت');
  mobileNav.setAttribute('aria-hidden', 'true');
  mobileNav.inert = true;
  let returnFocus = burgerBtn;

  const open = () => {
    returnFocus = document.activeElement;
    mobileNav.inert = false;
    mobileNav.classList.add('open');
    mobileOverlay.classList.add('open');
    mobileNav.setAttribute('aria-hidden', 'false');
    burgerBtn.setAttribute('aria-expanded', 'true');
    syncBodyLock();
    requestAnimationFrame(() => (mobileClose || getFocusable(mobileNav)[0])?.focus());
  };
  const close = () => {
    mobileNav.classList.remove('open');
    mobileOverlay.classList.remove('open');
    mobileNav.setAttribute('aria-hidden', 'true');
    burgerBtn.setAttribute('aria-expanded', 'false');
    mobileNav.inert = true;
    syncBodyLock();
    if (returnFocus instanceof HTMLElement) returnFocus.focus();
  };

  burgerBtn.addEventListener('click', open);
  mobileClose?.addEventListener('click', close);
  mobileOverlay.addEventListener('click', close);
  mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', close));
  mobileNav.addEventListener('keydown', event => trapFocus(event, mobileNav));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && mobileNav.classList.contains('open')) close();
  });
}

function disableConfiguredLink(link, message){
  link.removeAttribute('href');
  link.removeAttribute('target');
  link.setAttribute('aria-disabled', 'true');
  link.setAttribute('tabindex', '-1');
  link.classList.add('is-disabled');
  link.title = message;
}

function initConfiguredLinks(){
  const links = ZYRAN_CONFIG.links || {};
  document.querySelectorAll('[data-social="telegram"]').forEach(link => {
    if (ZYRAN_CONFIG.features?.telegram && links.telegramChannel) {
      link.href = links.telegramChannel;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    } else disableConfiguredLink(link, 'لینک تلگرام پس از راه‌اندازی اضافه می‌شود.');
  });
  document.querySelectorAll('[data-social="discord"]').forEach(link => {
    if (ZYRAN_CONFIG.features?.discord && links.discord) {
      link.href = links.discord;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    } else disableConfiguredLink(link, 'لینک دیسکورد پس از راه‌اندازی اضافه می‌شود.');
  });
  document.querySelectorAll('[data-config-link]').forEach(link => {
    const key = link.dataset.configLink;
    const url = links[key];
    const enabled = key === 'donation'
      ? ZYRAN_CONFIG.features?.donations
      : key === 'telegramBot'
        ? ZYRAN_CONFIG.features?.telegram
        : true;
    if (enabled && url) {
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.removeAttribute('aria-disabled');
      link.removeAttribute('tabindex');
      link.classList.remove('is-disabled');
      if (link.dataset.readyLabel) link.textContent = link.dataset.readyLabel;
    } else disableConfiguredLink(link, 'این سرویس هنوز راه‌اندازی نشده است.');
  });
}

function initCopyServerAddress(){
  const copyBtn = document.getElementById('copyBtn');
  const ipText = document.getElementById('ipText');
  const copyLabel = document.getElementById('copyLabel');
  if (!copyBtn || !ipText) return;

  const address = ZYRAN_CONFIG.server?.ready ? ZYRAN_CONFIG.server.address : '';
  if (!address) {
    ipText.textContent = 'آدرس پس از راه‌اندازی اعلام می‌شود';
    copyLabel.textContent = 'به‌زودی';
    copyBtn.disabled = true;
    copyBtn.setAttribute('aria-disabled', 'true');
    return;
  }

  ipText.textContent = address;
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(address);
    } catch (_) {
      const input = document.createElement('textarea');
      input.value = address;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    copyBtn.classList.add('copied');
    copyLabel.textContent = 'کپی شد ✓';
    showToast('آدرس سرور کپی شد: ' + address);
    setTimeout(() => {
      copyBtn.classList.remove('copied');
      copyLabel.textContent = 'کپی آدرس';
    }, 2000);
  });
}

async function initServerStatus(){
  const onlineEl = document.getElementById('onlineCount');
  const badge = document.querySelector('.eyebrow-badge');
  if (!onlineEl && !badge) return;

  const render = status => {
    const online = Boolean(status?.online);
    if (onlineEl) {
      onlineEl.textContent = online ? Number(status.playersOnline || 0).toLocaleString('fa-IR') : 'آفلاین';
      const label = onlineEl.closest('.meta-item')?.querySelector('.lbl');
      if (label) label.textContent = online ? `بازیکن از ${status.maxPlayers || ZYRAN_CONFIG.server?.maxPlayers || 0}` : 'وضعیت فعلی سرور';
    }
    if (badge) {
      badge.classList.toggle('is-offline', !online);
      const dot = document.createElement('span');
      dot.className = 'dot';
      badge.replaceChildren(dot, document.createTextNode(
        online ? 'سرور روشن است — همین حالا وصل شو' : 'سرور در حال راه‌اندازی است'
      ));
    }
  };

  if (!ZYRAN_CONFIG.server?.ready || !ZYRAN_CONFIG.features?.serverStatus || !window.ZyranAPI) {
    render({ online: false });
    return;
  }
  try {
    render(await window.ZyranAPI.status());
  } catch (_) {
    render({ online: false });
  }
}

async function initAuthState(){
  if (!ZYRAN_CONFIG.features?.auth || !window.ZyranAPI) return;
  try {
    const me = await window.ZyranAPI.me();
    document.querySelectorAll('.btn-auth').forEach(btn => {
      btn.textContent = me.username || 'حساب من';
      btn.setAttribute('href', me.role === 'admin' ? 'admin.html' : 'account.html');
    });
    if (me.role === 'admin') {
      const mobileNav = document.getElementById('mobileNav');
      if (mobileNav && !mobileNav.querySelector('a[href="admin.html"]')) {
        const link = document.createElement('a');
        link.href = 'admin.html';
        link.textContent = 'پنل ادمین';
        mobileNav.appendChild(link);
      }
    }
  } catch (_) {
    /* A missing session is the normal signed-out state. */
  }
}

/* ---------- scroll reveal: elements fade/slide in as they enter the viewport ---------- */
function initScrollReveal(){
  const selector = [
    '.mode-card', '.dl-card', '.pack-card', '.feature-box', '.admin-person',
    '.launcher-card', '.lb-table', '.section-head', '.donate-strip',
    '.auth-side', '.auth-form-side', '.checkout-card', '.checkout-icon',
    '.admin-card', '.stat-box', '.hero-art', '.eyebrow-badge', '.page-hero h1',
    '.page-hero p'
  ].join(', ');
  const els = document.querySelectorAll(selector);
  if (!els.length) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  els.forEach((el, i) => {
    el.classList.add('reveal');
    if (!reduceMotion) el.style.transitionDelay = (Math.min(i % 6, 5) * 0.08) + 's';
  });

  if (reduceMotion){
    els.forEach(el => el.classList.add('in-view'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  els.forEach(el => observer.observe(el));
}

/* ---------- toast (global helper) ---------- */
let toastTimer;
function showToast(msg){
  const toastEl = document.getElementById('toast');
  if (!toastEl) return;
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.classList.remove('show');
  requestAnimationFrame(() => toastEl.classList.add('show'));
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
    toastEl.textContent = '';
  }, 2400);
}

/* ---------- falling sakura petals (SVG-based) ---------- */
function petalSVG(color, edge){
  return `<svg width="18" height="22" viewBox="0 0 16 20" fill="none">
    <path d="M8 0C3 2.5 0 8 2 13C3.5 16.5 8 20 8 20C8 20 12.5 16.5 14 13C16 8 13 2.5 8 0Z" fill="${color}"/>
    <path d="M8 0C3 2.5 0 8 2 13C3.5 16.5 8 20 8 20" stroke="${edge}" stroke-width="0.6" fill="none" opacity="0.55"/>
    <path d="M8 4C6.5 6 6 9 7 13" stroke="${edge}" stroke-width="0.4" fill="none" opacity="0.4"/>
  </svg>`;
}
function initPetals(){
  const field = document.getElementById('petals');
  if (!field) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || window.innerWidth <= 720) return;

  const colors = [
    { fill: '#f0a8c4', edge: '#d6789f' },
    { fill: '#f7c4da', edge: '#e88bb2' },
    { fill: '#e88bb2', edge: '#c05c85' },
    { fill: '#fadce9', edge: '#e88bb2' }
  ];

  const COUNT = window.innerWidth < 720 ? 9 : 18;
  for (let i = 0; i < COUNT; i++){
    const petal = document.createElement('div');
    petal.className = 'petal';
    const c = colors[Math.floor(Math.random() * colors.length)];
    petal.innerHTML = petalSVG(c.fill, c.edge);
    const size = 0.55 + Math.random() * 1.0;
    const duration = 9 + Math.random() * 13;
    const delay = Math.random() * -22;
    const left = Math.random() * 100;
    const drift1 = (Math.random() * 140 - 70).toFixed(0) + 'px';
    const drift2 = (Math.random() * 140 - 70).toFixed(0) + 'px';
    petal.style.left = left + 'vw';
    petal.style.setProperty('--petal-scale', size.toFixed(2));
    petal.style.opacity = (0.5 + Math.random() * 0.4).toFixed(2);
    petal.style.animationDuration = duration.toFixed(1) + 's';
    petal.style.animationDelay = delay.toFixed(1) + 's';
    petal.style.setProperty('--drift1', drift1);
    petal.style.setProperty('--drift2', drift2);
    field.appendChild(petal);
  }
}

/* ---------- cosmic starfield: twinkling stars + occasional shooting star ---------- */
function initStarfield(){
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || window.innerWidth <= 720) return;

  if (document.documentElement.getAttribute('data-theme') === 'light') return;

  const field = document.createElement('div');
  field.className = 'star-field';
  field.id = 'starField';
  document.body.prepend(field);

  const COUNT = window.innerWidth < 720 ? 20 : 42;
  for (let i = 0; i < COUNT; i++){
    const star = document.createElement('div');
    star.className = 'star';
    const size = (Math.random() * 1.8 + 0.6).toFixed(1);
    star.style.width = size + 'px';
    star.style.height = size + 'px';
    star.style.top = (Math.random() * 100) + 'vh';
    star.style.left = (Math.random() * 100) + 'vw';
    star.style.animationDuration = (2 + Math.random() * 3.5).toFixed(1) + 's';
    star.style.animationDelay = (Math.random() * -5).toFixed(1) + 's';
    field.appendChild(star);
  }

  function launchShootingStar(){
    const s = document.createElement('div');
    s.className = 'shooting-star';
    s.style.top = (Math.random() * 55) + 'vh';
    s.style.left = (55 + Math.random() * 40) + 'vw';
    field.appendChild(s);
    requestAnimationFrame(() => s.classList.add('go'));
    setTimeout(() => s.remove(), 1400);
  }
  function scheduleShootingStar(){
    const delay = 4500 + Math.random() * 6000;
    setTimeout(() => { if (!document.hidden) launchShootingStar(); scheduleShootingStar(); }, delay);
  }
  scheduleShootingStar();
}

/* ---------- click FX: a soft burst of sakura petals wherever you click ---------- */
function initClickFX(){
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || window.innerWidth <= 720) return;

  const fx = document.createElement('div');
  fx.id = 'clickFX';
  document.body.appendChild(fx);

  const petalColors = ['#f0a8c4', '#f7c4da', '#e88bb2', '#fadce9'];

  document.addEventListener('click', (e) => {
    const x = e.clientX, y = e.clientY;
    if (x === 0 && y === 0) return;

    const pop = document.createElement('div');
    pop.className = 'hit-pop';
    pop.style.left = x + 'px'; pop.style.top = y + 'px';
    fx.appendChild(pop);

    // PERF/BUG FIX: this click burst used to remove *every* ".hit-petal" currently
    // in the DOM when its own timeout fired — including petals spawned by a later,
    // still-mid-animation click. On quick successive clicks (or on already-slower
    // pages), that wiped out the newer burst's petals early, so the animation looked
    // like it "stopped working" for that click. Now each burst only ever removes the
    // exact elements it created, so bursts no longer interrupt each other.
    const petalCount = 4;
    const thisBurstPetals = [];
    for (let i = 0; i < petalCount; i++){
      const petal = document.createElement('div');
      petal.className = 'hit-petal';
      const angle = (Math.PI * 2 * i) / petalCount + Math.random() * 0.6;
      const dist = 20 + Math.random() * 22;
      petal.style.left = x + 'px'; petal.style.top = y + 'px';
      petal.style.setProperty('--petal-color', petalColors[Math.floor(Math.random() * petalColors.length)]);
      petal.style.setProperty('--sx', (Math.cos(angle) * dist).toFixed(0) + 'px');
      petal.style.setProperty('--sy', (Math.sin(angle) * dist + 14).toFixed(0) + 'px');
      petal.style.setProperty('--start-rot', Math.floor(Math.random() * 360) + 'deg');
      petal.style.setProperty('--end-rot', Math.floor(180 + Math.random() * 260) + 'deg');
      fx.appendChild(petal);
      thisBurstPetals.push(petal);
    }

    setTimeout(() => {
      pop.remove();
      thisBurstPetals.forEach(el => el.remove());
    }, 800);
  });
}

/* ---------- click the hero tree: give it a little shake and shed a few petals ---------- */
function initTreeShed(){
  const hitArea = document.getElementById('treeHitArea');
  const tree = document.querySelector('.tree-sway');
  const shedField = document.getElementById('treeShed');
  if (!hitArea || !shedField) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.innerWidth <= 720;

  const petalColors = ['#f0a8c4', '#f7c4da', '#e88bb2', '#fadce9'];
  let shaking = false;

  hitArea.addEventListener('click', () => {
    if (tree && !reduceMotion && !shaking){
      shaking = true;
      tree.classList.add('shaking');
      setTimeout(() => { tree.classList.remove('shaking'); shaking = false; }, 500);
    }
    if (reduceMotion) return;

    const host = shedField.closest('.hero-art');
    const w = host ? host.clientWidth : 420;
    const scale = w / 420; // svg viewBox is 420 wide; convert canopy coords to real px

    const count = 10 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++){
      const petal = document.createElement('div');
      petal.className = 'shed-petal';
      const startX = (110 + Math.random() * 190) * scale;
      const startY = (70 + Math.random() * 170) * scale;
      petal.style.left = startX + 'px';
      petal.style.top = startY + 'px';
      petal.style.setProperty('--petal-color', petalColors[Math.floor(Math.random() * petalColors.length)]);
      petal.style.setProperty('--sx1', (Math.random() * 60 - 30).toFixed(0) + 'px');
      petal.style.setProperty('--sy1', (60 + Math.random() * 50).toFixed(0) + 'px');
      petal.style.setProperty('--rot1', Math.floor(80 + Math.random() * 160) + 'deg');
      petal.style.setProperty('--sx2', (Math.random() * 90 - 45).toFixed(0) + 'px');
      petal.style.setProperty('--sy2', (150 + Math.random() * 110).toFixed(0) + 'px');
      petal.style.setProperty('--rot2', Math.floor(220 + Math.random() * 260) + 'deg');
      petal.style.setProperty('--fall-dur', (1.8 + Math.random() * 1.3).toFixed(1) + 's');
      shedField.appendChild(petal);
      setTimeout(() => petal.remove(), 3300);
    }
  });
}

/* ---------- little sparkles drifting off the floating donate button ---------- */
function initDonateSparkles(){
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wrap = document.querySelector('.float-donate-wrap');
  if (!wrap || reduceMotion || window.innerWidth <= 720) return;

  function spawnSparkle(){
    if (document.hidden) return;
    const rect = wrap.getBoundingClientRect();
    const dot = document.createElement('div');
    dot.className = 'donate-sparkle';
    const size = 3 + Math.random() * 3;
    dot.style.width = size + 'px';
    dot.style.height = size + 'px';
    dot.style.left = (rect.left + Math.random() * rect.width) + 'px';
    dot.style.top = (rect.top + Math.random() * rect.height * 0.6) + 'px';
    dot.style.setProperty('--sx', (Math.random() * 30 - 15).toFixed(0) + 'px');
    document.body.appendChild(dot);
    setTimeout(() => dot.remove(), 1650);
  }
  // Recursive timer avoids keeping a permanent interval active in background tabs.
  function scheduleSparkle(){
    setTimeout(() => { spawnSparkle(); scheduleSparkle(); }, document.hidden ? 2200 : 1300);
  }
  scheduleSparkle();
}

/* ---------- auth page: animated sliding tab indicator + form switch ---------- */
function initAuthTabs(){
  const tabsWrap = document.querySelector('.auth-tabs');
  const indicator = document.getElementById('authTabIndicator');
  const tabs = Array.from(document.querySelectorAll('.auth-tab'));
  const forms = Array.from(document.querySelectorAll('.auth-form'));
  if (!tabsWrap || !tabs.length) return;

  tabsWrap.setAttribute('role', 'tablist');
  tabsWrap.setAttribute('aria-label', 'ورود یا ثبت‌نام');

  function activate(activeTab, moveFocus = false){
    tabs.forEach((tab, index) => {
      const active = tab === activeTab;
      const target = document.getElementById(tab.dataset.form);
      if (!tab.id) tab.id = `authTab${index}`;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', tab.dataset.form);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.tabIndex = active ? 0 : -1;
      tab.classList.toggle('active', active);
      if (target) {
        target.setAttribute('role', 'tabpanel');
        target.setAttribute('aria-labelledby', tab.id);
        target.classList.toggle('active', active);
        target.hidden = !active;
      }
    });
    indicator?.classList.toggle('pos-1', tabs.indexOf(activeTab) === 1);
    if (moveFocus) activeTab.focus();
  }

  const initialActive = document.querySelector('.auth-tab.active') || tabs[0];
  activate(initialActive);

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = index;
      if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = tabs.length - 1;
      else if (event.key === 'ArrowRight') nextIndex = (index - 1 + tabs.length) % tabs.length;
      else nextIndex = (index + 1) % tabs.length;
      activate(tabs[nextIndex], true);
    });
  });
}


/* ---------- mobile card hover bridge ----------
   Keeps the exact desktop hover visuals on touch devices without :active.
   The same class is added/removed, so CSS transitions handle both directions. */
function initCardHoverTouch(){
  if (!window.matchMedia || !window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
  const cards = document.querySelectorAll('.feature-box, .mode-card, .launcher-card');
  if (!cards.length) return;

  const clear = () => cards.forEach(card => card.classList.remove('hover-touch'));
  cards.forEach(card => {
    card.addEventListener('touchstart', () => {
      clear();
      card.classList.add('hover-touch');
    }, {passive:true});
    card.addEventListener('touchend', () => card.classList.remove('hover-touch'), {passive:true});
    card.addEventListener('touchcancel', () => card.classList.remove('hover-touch'), {passive:true});
  });
  window.addEventListener('scroll', clear, {passive:true});
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
}


/* ---------- FAQ + feedback ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    item.addEventListener('toggle', () => {
      if (!item.open) return;
      faqItems.forEach(other => { if (other !== item) other.open = false; });
    });
  });

  const feedbackForm = document.getElementById('feedbackForm');
  if (feedbackForm) {
    const submit = feedbackForm.querySelector('[type="submit"]');
    if (!ZYRAN_CONFIG.features?.feedback) {
      if (submit) {
        submit.disabled = true;
        submit.textContent = 'ارسال بازخورد — پس از راه‌اندازی';
      }
      feedbackForm.setAttribute('aria-describedby', 'feedbackAvailability');
    }

    feedbackForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!ZYRAN_CONFIG.features?.feedback || !window.ZyranAPI) {
        showToast('سامانه بازخورد هنوز راه‌اندازی نشده است.');
        return;
      }

      const payload = {
        type: document.getElementById('feedbackType')?.value || 'بازخورد',
        name: document.getElementById('feedbackName')?.value.trim() || '',
        message: document.getElementById('feedbackMessage')?.value.trim() || ''
      };
      if (!payload.message) return;

      if (submit) submit.disabled = true;
      try {
        await window.ZyranAPI.submitFeedback(payload);
        feedbackForm.reset();
        showToast('بازخوردت با موفقیت برای تیم زیران ارسال شد 🌸');
      } catch (error) {
        showToast(error.message || 'ارسال بازخورد انجام نشد.');
      } finally {
        if (submit) submit.disabled = false;
      }
    });
  }
});

