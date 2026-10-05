(function () {
  'use strict';

  const CART_KEY = 'zyran_cart_v2';
  const config = window.ZYRAN_CONFIG || { features: {}, shopPacks: {} };
  const catalog = config.shopPacks || {};

  function loadCart(){
    try {
      const raw = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      const ids = Array.isArray(raw) ? raw.map(item => typeof item === 'string' ? item : item?.id) : [];
      return [...new Set(ids.filter(id => Object.hasOwn(catalog, id)))];
    } catch (_) {
      return [];
    }
  }

  function saveCart(ids){
    try { localStorage.setItem(CART_KEY, JSON.stringify(ids)); } catch (_) {}
  }

  function formatPrice(value){
    return Number(value || 0).toLocaleString('fa-IR') + ' تومان';
  }

  function createCartItem(id, remove){
    const item = catalog[id];
    const row = document.createElement('div');
    row.className = 'cart-item';

    const name = document.createElement('span');
    name.textContent = item.name;

    const detail = document.createElement('span');
    detail.className = 'cart-item-detail';
    const price = document.createElement('span');
    price.textContent = formatPrice(item.price);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'remove-item';
    button.setAttribute('aria-label', `حذف ${item.name} از سبد`);
    button.textContent = '×';
    button.addEventListener('click', () => remove(id));

    detail.append(price, button);
    row.append(name, detail);
    return row;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const count = document.getElementById('cartCount');
    const itemsHost = document.getElementById('cartItems');
    const total = document.getElementById('cartTotal');
    const drawer = document.getElementById('cartDrawer');
    const openButton = document.getElementById('cartOpen');
    const closeButton = document.getElementById('cartClose');
    const checkout = document.getElementById('checkoutBtn');
    const shopEnabled = Boolean(config.features?.shop);

    let overlay;
    let returnFocus = openButton;

    function render(){
      const cart = loadCart();
      if (count) count.textContent = cart.length.toLocaleString('fa-IR');

      if (itemsHost) {
        itemsHost.replaceChildren();
        if (!cart.length) {
          const empty = document.createElement('p');
          empty.className = 'cart-empty';
          empty.textContent = shopEnabled ? 'سبد خریدت خالی است.' : 'فروشگاه هنوز راه‌اندازی نشده است.';
          itemsHost.appendChild(empty);
        } else {
          cart.forEach(id => itemsHost.appendChild(createCartItem(id, removeItem)));
        }
      }
      if (total) {
        const value = cart.reduce((sum, id) => sum + Number(catalog[id]?.price || 0), 0);
        total.textContent = formatPrice(value);
      }
      if (checkout) checkout.disabled = !shopEnabled || cart.length === 0;
    }

    function removeItem(id){
      saveCart(loadCart().filter(itemId => itemId !== id));
      render();
    }

    function ensureOverlay(){
      if (overlay) return overlay;
      overlay = document.createElement('div');
      overlay.className = 'cart-overlay';
      overlay.addEventListener('click', closeDrawer);
      document.body.appendChild(overlay);
      return overlay;
    }

    function openDrawer(){
      if (!drawer) return;
      returnFocus = document.activeElement;
      drawer.inert = false;
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
      openButton?.setAttribute('aria-expanded', 'true');
      ensureOverlay().classList.add('open');
      if (typeof syncBodyLock === 'function') syncBodyLock();
      requestAnimationFrame(() => closeButton?.focus());
    }

    function closeDrawer(){
      if (!drawer) return;
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
      openButton?.setAttribute('aria-expanded', 'false');
      overlay?.classList.remove('open');
      drawer.inert = true;
      if (typeof syncBodyLock === 'function') syncBodyLock();
      if (returnFocus instanceof HTMLElement) returnFocus.focus();
    }

    if (drawer) {
      drawer.setAttribute('role', 'dialog');
      drawer.setAttribute('aria-modal', 'true');
      drawer.setAttribute('aria-label', 'سبد خرید');
      drawer.setAttribute('aria-hidden', 'true');
      drawer.inert = true;
      drawer.addEventListener('keydown', event => {
        if (typeof trapFocus === 'function') trapFocus(event, drawer);
      });
    }
    if (openButton) {
      openButton.setAttribute('aria-controls', drawer?.id || 'cartDrawer');
      openButton.setAttribute('aria-expanded', 'false');
      openButton.addEventListener('click', openDrawer);
    }
    closeButton?.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && drawer?.classList.contains('open')) closeDrawer();
    });

    document.querySelectorAll('.pack-card .add-cart-btn').forEach(button => {
      const card = button.closest('.pack-card');
      const id = card?.dataset.id;
      const item = id ? catalog[id] : null;
      if (card && item) {
        card.dataset.name = item.name;
        card.dataset.price = String(item.price);
        const priceHost = card.querySelector('.pack-price');
        if (priceHost) {
          const currency = document.createElement('span');
          currency.textContent = ' تومان';
          priceHost.replaceChildren(document.createTextNode(Number(item.price).toLocaleString('fa-IR')), currency);
        }
      }
      if (!shopEnabled || !id || !item) {
        button.disabled = true;
        button.textContent = 'فروش هنوز فعال نیست';
        return;
      }
      button.addEventListener('click', () => {
        const cart = loadCart();
        if (!cart.includes(id)) cart.push(id);
        saveCart(cart);
        render();
        showToast(`${catalog[id].name} به سبد اضافه شد.`);
        openDrawer();
      });
    });

    checkout?.addEventListener('click', () => {
      if (!shopEnabled) {
        showToast('فروشگاه هنوز راه‌اندازی نشده است.');
        return;
      }
      const cart = loadCart();
      if (!cart.length) return;
      try { sessionStorage.setItem('zyran_checkout_items', JSON.stringify(cart)); } catch (_) {}
      window.location.href = 'checkout.html';
    });

    render();
  });
})();
