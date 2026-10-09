const CART_KEY = 'zyran_cart';

function loadCart(){
  try{
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  }catch(e){
    return [];
  }
}
function saveCart(cart){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}
function faNum(n){ return n.toLocaleString('fa-IR'); }

document.addEventListener('DOMContentLoaded', () => {
  const cartCountEl = document.getElementById('cartCount');
  const cartItemsEl = document.getElementById('cartItems');
  const cartTotalEl = document.getElementById('cartTotal');
  const cartDrawer = document.getElementById('cartDrawer');
  const cartOpenBtn = document.getElementById('cartOpen');
  const cartCloseBtn = document.getElementById('cartClose');
  const checkoutBtn = document.getElementById('checkoutBtn');

  function render(){
    const cart = loadCart();
    if (cartCountEl) cartCountEl.textContent = cart.length;
    if (cartItemsEl){
      if (cart.length === 0){
        cartItemsEl.innerHTML = '<p class="cart-empty">سبد خریدت خالیه، یک پک انتخاب کن 🌸</p>';
      } else {
        cartItemsEl.innerHTML = cart.map((item, i) => `
          <div class="cart-item" style="animation-delay:${Math.min(i,6) * 0.06}s">
            <span>${item.name}</span>
            <span style="display:flex; align-items:center; gap:10px;">
              ${faNum(item.price)} تومان
              <button data-i="${i}" class="remove-item" aria-label="حذف">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"/></svg>
              </button>
            </span>
          </div>
        `).join('');
        cartItemsEl.querySelectorAll('.remove-item').forEach(btn => {
          btn.addEventListener('click', () => {
            const c = loadCart();
            c.splice(Number(btn.dataset.i), 1);
            saveCart(c);
            render();
          });
        });
      }
    }
    if (cartTotalEl){
      const total = cart.reduce((s,i) => s + i.price, 0);
      cartTotalEl.textContent = faNum(total) + ' تومان';
    }
  }

  function bumpCartCount(){
    if (!cartCountEl) return;
    cartCountEl.classList.remove('bump');
    void cartCountEl.offsetWidth; // restart animation
    cartCountEl.classList.add('bump');
    if (cartOpenBtn){
      cartOpenBtn.classList.remove('shake');
      void cartOpenBtn.offsetWidth;
      cartOpenBtn.classList.add('shake');
    }
  }

  function flyToCart(fromEl){
    if (!cartOpenBtn || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const from = fromEl.getBoundingClientRect();
    const to = cartOpenBtn.getBoundingClientRect();
    const dot = document.createElement('div');
    dot.className = 'fly-dot';
    const size = 14;
    // PERF FIX: position is set once (left/top) and the actual movement now happens
    // via a CSS "transform" transition (see .fly-dot in style.css) instead of animating
    // left/top/width/height directly, which used to force a full layout recalculation
    // on every frame of this animation.
    const startX = from.left + from.width / 2 - size / 2;
    const startY = from.top + from.height / 2 - size / 2;
    const endX = to.left + to.width / 2 - size / 2;
    const endY = to.top + to.height / 2 - size / 2;
    dot.style.left = startX + 'px';
    dot.style.top = startY + 'px';
    dot.style.width = size + 'px';
    dot.style.height = size + 'px';
    dot.style.opacity = '1';
    dot.style.transform = 'translate(0,0) scale(1)';
    document.body.appendChild(dot);
    requestAnimationFrame(() => {
      dot.style.transform = `translate(${(endX - startX).toFixed(1)}px, ${(endY - startY).toFixed(1)}px) scale(0.28)`;
      dot.style.opacity = '0';
    });
    setTimeout(() => dot.remove(), 650);
  }

  document.querySelectorAll('.add-cart-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.pack-card');
      const cart = loadCart();
      cart.push({ id: card.dataset.id, name: card.dataset.name, price: Number(card.dataset.price) });
      saveCart(cart);
      render();
      showToast(card.dataset.name + ' به سبد اضافه شد');
      flyToCart(btn);
      bumpCartCount();
      if (cartDrawer) cartDrawer.classList.add('open');
    });
  });

  if (cartOpenBtn && cartDrawer) cartOpenBtn.addEventListener('click', () => cartDrawer.classList.add('open'));
  if (cartCloseBtn && cartDrawer) cartCloseBtn.addEventListener('click', () => cartDrawer.classList.remove('open'));

  if (checkoutBtn){
    checkoutBtn.addEventListener('click', () => {
      const cart = loadCart();
      if (cart.length === 0){ showToast('اول یک پک به سبد اضافه کن'); return; }
      localStorage.setItem('zyran_last_order', JSON.stringify(cart));
      saveCart([]);
      window.location.href = 'checkout.html';
    });
  }

  render();
});
