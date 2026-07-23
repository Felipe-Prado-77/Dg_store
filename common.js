(function () {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.menu-nav');
  const overlay = document.querySelector('.menu-overlay');

  function setMenu(open) {
    if (!toggle || !nav || !overlay) return;
    toggle.classList.toggle('is-open', open);
    nav.classList.toggle('is-open', open);
    overlay.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  }

  toggle?.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  overlay?.addEventListener('click', () => setMenu(false));
  nav?.addEventListener('click', event => {
    if (event.target.closest('a')) setMenu(false);
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1040) setMenu(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setMenu(false);
  });
  window.addEventListener('scroll', () => header?.classList.toggle('is-scrolled', window.scrollY > 10), { passive: true });

  document.querySelectorAll('[data-current-year]').forEach(item => {
    item.textContent = new Date().getFullYear();
  });

  function readCart() {
    try {
      const value = JSON.parse(localStorage.getItem('dgStoreCart') || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function updateCartBadge() {
    const total = readCart().reduce((sum, item) => sum + Math.max(1, Number(item.quantity) || 1), 0);
    document.querySelectorAll('[data-cart-count]').forEach(badge => {
      badge.textContent = total > 99 ? '99+' : String(total);
      badge.setAttribute('aria-label', `${total} item(ns) no carrinho`);
    });
  }

  function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  window.DGStore = { readCart, updateCartBadge, showToast };
  window.addEventListener('storage', updateCartBadge);
  updateCartBadge();
})();
