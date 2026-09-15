document.addEventListener('DOMContentLoaded', () => {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
  hideLoader();

  /* ---------- mobile nav ---------- */
  const burgerBtn = document.getElementById('burgerBtn');
  const mobileNav = document.getElementById('mobileNav');
  const mobileOverlay = document.getElementById('mobileOverlay');
  const mobileClose = document.getElementById('mobileClose');
  function openMobile(){ mobileNav.classList.add('open'); mobileOverlay.classList.add('open'); }
  function closeMobile(){ mobileNav.classList.remove('open'); mobileOverlay.classList.remove('open'); }
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

  initPetals();
  initAuthState();
  initScrollReveal();
  initPageTransitions();
  initStarfield();
  initClickFX();
  initDonateSparkles();
  initAuthTabs();
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

/* ---------- page transitions: reuse the sakura loader as a bridge between pages ---------- */
function initPageTransitions(){
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href$=".html"]');
    if (!link) return;
    if (link.target === '_blank' || link.hasAttribute('download')) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;

    e.preventDefault();
    const destination = link.href;
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
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
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

  const COUNT = window.innerWidth < 720 ? 16 : 28;
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

  const field = document.createElement('div');
  field.className = 'star-field';
  field.id = 'starField';
  document.body.prepend(field);

  const COUNT = window.innerWidth < 720 ? 45 : 80;
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
    setTimeout(() => { launchShootingStar(); scheduleShootingStar(); }, delay);
  }
  scheduleShootingStar();
}

/* ---------- click burst: a playful pink hit effect wherever you click on the page ---------- */
function initClickFX(){
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const fx = document.createElement('div');
  fx.id = 'clickFX';
  document.body.appendChild(fx);

  document.addEventListener('click', (e) => {
    const x = e.clientX, y = e.clientY;
    if (x === 0 && y === 0) return; // keyboard-triggered clicks

    const burst = document.createElement('div');
    burst.className = 'click-burst';
    burst.style.left = x + 'px'; burst.style.top = y + 'px';
    fx.appendChild(burst);

    const ring = document.createElement('div');
    ring.className = 'click-ring';
    ring.style.left = x + 'px'; ring.style.top = y + 'px';
    fx.appendChild(ring);

    const sparkCount = 6;
    for (let i = 0; i < sparkCount; i++){
      const spark = document.createElement('div');
      spark.className = 'click-spark';
      const angle = (Math.PI * 2 * i) / sparkCount + Math.random() * 0.5;
      const dist = 22 + Math.random() * 26;
      spark.style.left = x + 'px'; spark.style.top = y + 'px';
      spark.style.setProperty('--sx', (Math.cos(angle) * dist).toFixed(0) + 'px');
      spark.style.setProperty('--sy', (Math.sin(angle) * dist).toFixed(0) + 'px');
      fx.appendChild(spark);
    }

    setTimeout(() => {
      burst.remove(); ring.remove();
      fx.querySelectorAll('.click-spark').forEach(s => s.remove());
    }, 650);
  });
}

/* ---------- little sparkles drifting off the floating donate button ---------- */
function initDonateSparkles(){
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wrap = document.querySelector('.float-donate-wrap');
  if (!wrap || reduceMotion) return;

  function spawnSparkle(){
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
  setInterval(spawnSparkle, 900);
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
