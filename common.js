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
    if (window.innerWidth > 1180) setMenu(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setMenu(false);
  });
  window.addEventListener('scroll', () => header?.classList.toggle('is-scrolled', window.scrollY > 10), { passive: true });

  document.querySelectorAll('[data-current-year]').forEach(item => {
    item.textContent = new Date().getFullYear();
  });
  document.querySelectorAll('.footer-column').forEach(column => {
    if (column.querySelector('h3')?.textContent.trim() === 'Informações' && !column.querySelector('a[href="politicas.html"]')) {
      const link = document.createElement('a');
      link.href = 'politicas.html';
      link.textContent = 'Políticas da loja';
      column.prepend(link);
    }
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

  function addToCart(product) {
    const cart = readCart();
    const item = {
      id: String(product.id || `produto-${Date.now()}`),
      productId: String(product.productId || product.id || ''),
      name: String(product.name || 'Produto DG Store'),
      variant: String(product.variant || ''),
      image: String(product.image || ''),
      price: Math.max(0, Number(product.price) || 0),
      quantity: Math.max(1, Math.min(99, Number(product.quantity) || 1))
    };
    const existing = cart.find(current => String(current.id) === item.id);
    if (existing) existing.quantity = Math.min(99, (Number(existing.quantity) || 1) + item.quantity);
    else cart.push(item);
    localStorage.setItem('dgStoreCart', JSON.stringify(cart));
    updateCartBadge();
    showToast(`${item.name} foi adicionado ao carrinho.`);
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

  window.DGStore = { readCart, updateCartBadge, showToast, addToCart };
  window.DGCart = window.DGCart || { addItem: addToCart };
  window.addEventListener('storage', updateCartBadge);
  updateCartBadge();
})();
