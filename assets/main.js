document.addEventListener('DOMContentLoaded', () => {
  /* BUG FIX: this whole setup block now runs inside a try/catch. Previously, if any one
     piece here threw on a given page, every line after it — including the init functions
     below (page transitions, click-burst animation, etc.) — would silently never run on
     that page, since one uncaught error stops the rest of this callback. */
  try{
    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
    hideLoader();

    /* ---------- dark / light theme ---------- */
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle){
      themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        const next = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        try{ localStorage.setItem('zyran_theme', next); }catch(e){}
      });
    }

    /* ---------- mobile nav ---------- */
    const burgerBtn = document.getElementById('burgerBtn');
    const mobileNav = document.getElementById('mobileNav');
    const mobileOverlay = document.getElementById('mobileOverlay');
    const mobileClose = document.getElementById('mobileClose');

    // Keep the mobile menu identical on every page. Missing/old links are repaired here.
    if (mobileNav) {
      const currentHref = location.pathname.split('/').pop() || 'index.html';
      const menuItems = [
        ['index.html','خانه'],
        ['modes.html','حالت‌های بازی'],
        ['downloads.html','دانلودها'],
        ['guide.html','راهنما'],
        ['about.html','درباره ما'],
        ['shop.html','فروشگاه'],
        ['donate.html','حمایت از سرور']
      ];
      menuItems.forEach(([href,label]) => {
        let a = mobileNav.querySelector(`a[href="${href}"]`);
        if (!a) { a = document.createElement('a'); a.href = href; mobileNav.appendChild(a); }
        a.textContent = label;
        a.classList.toggle('current', href === currentHref);
      });
      let auth = mobileNav.querySelector('a.btn-auth');
      if (!auth) {
        auth = document.createElement('a');
        auth.className='btn-auth';
        auth.href='login.html';
        auth.textContent='ورود / ثبت‌نام';
        auth.style.textAlign='center';
        const head = mobileNav.querySelector('.mobile-nav-head');
        if (head && head.nextSibling) mobileNav.insertBefore(auth, head.nextSibling);
        else mobileNav.appendChild(auth);
      }
      auth.href='login.html'; auth.textContent='ورود / ثبت‌نام'; auth.style.textAlign='center';
    }
    const openMobile = () => { mobileNav.classList.add('open'); mobileOverlay.classList.add('open'); };
    const closeMobile = () => { mobileNav.classList.remove('open'); mobileOverlay.classList.remove('open'); };
    if (burgerBtn) burgerBtn.addEventListener('click', openMobile);
    if (mobileClose) mobileClose.addEventListener('click', closeMobile);
    if (mobileOverlay) mobileOverlay.addEventListener('click', closeMobile);
    if (mobileNav) mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMobile));

    /* ---------- copy IP ---------- */
    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
      const copyLabel = document.getElementById('copyLabel');
      copyBtn.addEventListener('click', async () => {
        const ip = document.getElementById('ipText').textContent.trim();
        try{
          await navigator.clipboard.writeText(ip);
        }catch(e){
          const ta = document.createElement('textarea');
          ta.value = ip; document.body.appendChild(ta); ta.select();
          document.execCommand('copy'); document.body.removeChild(ta);
        }
        copyBtn.classList.add('copied');
        copyLabel.textContent = 'کپی شد ✓';
        showToast('آی‌پی سرور کپی شد: ' + ip);
        setTimeout(() => { copyBtn.classList.remove('copied'); copyLabel.textContent = 'کپی آی‌پی'; }, 2000);
      });
    }

    /* ---------- fake online counter (DEMO ONLY) ----------
       برای عدد واقعی باید از API بک‌اند بخش status استفاده کنیم، مثل:
       fetch('https://api.zyran.ir/status').then(r=>r.json()).then(d => onlineVal = d.players_online)
       الان فقط شبیه‌سازی شده تا شکل سایت مشخص باشه. */
    const onlineEl = document.getElementById('onlineCount');
    if (onlineEl) {
      let onlineVal = 60 + Math.floor(Math.random()*40);
      const render = () => { onlineEl.textContent = onlineVal; };
      render();
      setInterval(() => {
        onlineVal = Math.max(20, Math.min(190, onlineVal + (Math.floor(Math.random()*7) - 3)));
        render();
      }, 4000);
    }
  }catch(err){ console.error('[zyran] header/nav setup failed:', err); }

  /* BUG FIX: these used to be called back-to-back with no error handling. If any single
     init function threw on a given page (e.g. a page missing an element another one
     assumed was there), every init call after it in this list — including the click-burst
     animation and the page-transition/logo-launch click handler — would silently never run
     on that page, since one uncaught error stops the rest of this function. Running each one
     independently means a problem in one feature can no longer take out the others. */
  const inits = [
    initPetals, initAuthState, initScrollReveal, initPageTransitions,
    initStarfield, initClickFX, initTreeShed, initDonateSparkles, initAuthTabs, initCardHoverTouch
  ];
  inits.forEach(fn => {
    try{ fn(); }catch(err){ console.error('[zyran]', fn.name, 'failed to init:', err); }
  });
});

/* ---------- logged-in / admin nav state ----------
   بعد از ورود موفق، login.html توکن رو در localStorage با کلید zyran_token
   و نقش کاربر رو با کلید zyran_role ذخیره می‌کنه. اینجا فقط همون مقدار رو
   می‌خونیم تا رابط کاربری رو بروز کنیم؛ دسترسی واقعی ادمین همیشه سمت
   بک‌اند با همون توکن چک می‌شه، نه اینجا. */
function initAuthState(){
  const token = localStorage.getItem('zyran_token');
  const role = localStorage.getItem('zyran_role');
  const username = localStorage.getItem('zyran_username');

  if (token) {
    document.querySelectorAll('.btn-auth').forEach(btn => {
      btn.textContent = username ? username : 'حساب من';
      btn.setAttribute('href', role === 'admin' ? 'admin.html' : 'account.html');
    });
  }

  if (role === 'admin') {
    const navLinks = document.querySelector('.nav-links');
    const mobileNav = document.getElementById('mobileNav');
    if (navLinks && !navLinks.querySelector('a[href="admin.html"]')) {
      const li = document.createElement('li');
      li.innerHTML = '<a href="admin.html">پنل ادمین</a>';
      navLinks.appendChild(li);
    }
    if (mobileNav && !mobileNav.querySelector('a[href="admin.html"]')) {
      const a = document.createElement('a');
      a.href = 'admin.html';
      a.textContent = 'پنل ادمین';
      mobileNav.insertBefore(a, mobileNav.querySelector('.btn-auth'));
    }
  }
}

/* ---------- sakura page loader ---------- */
function hideLoader(){
  const loader = document.getElementById('pageLoader');
  if (!loader) return;
  const MIN_VISIBLE_MS = 500;
  const start = Date.now();
  const finish = () => {
    const elapsed = Date.now() - start;
    const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
    setTimeout(() => loader.classList.add('hide'), wait);
  };
  if (document.readyState === 'complete') finish();
  else window.addEventListener('load', finish);
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

/* ---------- logo "launch" shortcut: try to open the local Minecraft launcher ----------
   Best-effort only: browsers can't force-launch a specific third-party app like TLauncher —
   only apps that register their own protocol can be opened this way. TLauncher itself doesn't
   register a dedicated scheme, so this uses the standard "minecraft://" protocol, which the
   official Minecraft Launcher (and some TLauncher setups) register on install. If nothing is
   registered, the browser just ignores it silently and the click still navigates home normally. */
function tryOpenLauncher(){
  try{ window.location.href = 'minecraft://'; }catch(e){}
}

/* ---------- page transitions: reuse the sakura loader as a bridge between pages ---------- */
function initPageTransitions(){
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href$=".html"]');
    if (!link) return;
    if (link.target === '_blank' || link.hasAttribute('download')) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;

    e.preventDefault();
    const destination = link.href;
    const isBrand = !!link.closest('.brand');
    if (isBrand){
      tryOpenLauncher();
      showToast('در حال تلاش برای باز کردن لانچر ماینکرفت... 🌸 اگه لانچرت (مثل TLauncher) نصب باشه باز می‌شه، وگرنه فقط میری صفحه‌ی اصلی.');
    }
    const loader = document.getElementById('pageLoader');
    if (loader){
      loader.classList.remove('hide');
      setTimeout(() => { window.location.href = destination; }, 420);
    } else {
      window.location.href = destination;
    }
  });
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
  if (reduceMotion) return;

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
  if (reduceMotion) return;

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
  if (reduceMotion) return;

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
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  if (!wrap || reduceMotion) return;

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
  const tabs = document.querySelectorAll('.auth-tab');
  const forms = document.querySelectorAll('.auth-form');
  if (!tabsWrap || !tabs.length) return;

  function setIndicator(activeTab){
    if (!indicator) return;
    const isSecond = Array.from(tabs).indexOf(activeTab) === 1;
    indicator.classList.toggle('pos-1', isSecond);
  }

  const initialActive = document.querySelector('.auth-tab.active') || tabs[0];
  setIndicator(initialActive);

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      forms.forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      const target = document.getElementById(tab.dataset.form);
      if (target) target.classList.add('active');
      setIndicator(tab);
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
    feedbackForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const type = document.getElementById('feedbackType')?.value || 'بازخورد';
      const name = document.getElementById('feedbackName')?.value.trim() || 'بازیکن';
      const message = document.getElementById('feedbackMessage')?.value.trim() || '';
      if (!message) return;
      const feedback = { type, name, message, createdAt: new Date().toISOString() };
      try {
        const saved = JSON.parse(localStorage.getItem('zyran_feedback') || '[]');
        saved.push(feedback);
        localStorage.setItem('zyran_feedback', JSON.stringify(saved.slice(-20)));
      } catch (err) {}
      feedbackForm.reset();
      if (typeof showToast === 'function') {
        showToast('بازخوردت ثبت شد 🌸 ممنون که برای بهتر شدن زیران کمک می‌کنی');
      }
    });
  }
});

