(function () {
  const itemsContainer = document.getElementById('cartItems');
  const emptyState = document.getElementById('emptyCart');
  const clearButton = document.getElementById('clearCart');
  const checkoutButton = document.getElementById('checkoutButton');
  const subtotalElement = document.getElementById('subtotal');
  const totalElement = document.getElementById('total');
  const description = document.getElementById('itemsDescription');
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  function readCart() { return window.DGStore?.readCart() || []; }
  function saveCart(cart) {
    localStorage.setItem('dgStoreCart', JSON.stringify(cart));
    window.DGStore?.updateCartBadge();
    render();
  }

  function normaliseItem(item) {
    return {
      id: String(item.id || `produto-${Date.now()}`),
      name: String(item.name || 'Produto DG Store'),
      variant: String(item.variant || ''),
      image: String(item.image || ''),
      price: Math.max(0, Number(item.price) || 0),
      quantity: Math.max(1, Math.min(99, Number(item.quantity) || 1))
    };
  }

  function changeQuantity(id, amount) {
    const cart = readCart().map(normaliseItem);
    const item = cart.find(product => product.id === id);
    if (!item) return;
    item.quantity = Math.max(1, Math.min(99, item.quantity + amount));
    saveCart(cart);
  }

  function removeItem(id) {
    saveCart(readCart().map(normaliseItem).filter(item => item.id !== id));
    window.DGStore?.showToast('Item removido do carrinho.');
  }

  function buildItem(item) {
    const article = document.createElement('article');
    article.className = 'cart-item';

    const imageBox = document.createElement('div');
    imageBox.className = 'cart-item-image';
    if (item.image) {
      const image = document.createElement('img');
      image.src = item.image;
      image.alt = item.name;
      image.addEventListener('error', () => { imageBox.textContent = '◇'; });
      imageBox.appendChild(image);
    } else {
      imageBox.textContent = '◇';
    }

    const info = document.createElement('div');
    info.className = 'cart-item-info';
    const title = document.createElement('h3');
    title.textContent = item.name;
    const variant = document.createElement('p');
    variant.textContent = item.variant || 'Produto DG Store';
    const controls = document.createElement('div');
    controls.className = 'cart-item-controls';
    const quantity = document.createElement('div');
    quantity.className = 'quantity-control';
    const minus = document.createElement('button');
    minus.type = 'button'; minus.textContent = '−'; minus.setAttribute('aria-label', `Diminuir quantidade de ${item.name}`);
    minus.addEventListener('click', () => changeQuantity(item.id, -1));
    const amount = document.createElement('span'); amount.textContent = item.quantity;
    const plus = document.createElement('button');
    plus.type = 'button'; plus.textContent = '+'; plus.setAttribute('aria-label', `Aumentar quantidade de ${item.name}`);
    plus.addEventListener('click', () => changeQuantity(item.id, 1));
    quantity.append(minus, amount, plus);
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'remove-item'; remove.textContent = 'Remover';
    remove.addEventListener('click', () => removeItem(item.id));
    controls.append(quantity, remove);
    info.append(title, variant, controls);

    const price = document.createElement('div');
    price.className = 'cart-item-price';
    const lineTotal = document.createElement('strong'); lineTotal.textContent = currency.format(item.price * item.quantity);
    const unit = document.createElement('small'); unit.textContent = `${currency.format(item.price)} cada`;
    price.append(lineTotal, unit);
    article.append(imageBox, info, price);
    return article;
  }

  function render() {
    const cart = readCart().map(normaliseItem);
    const quantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    itemsContainer.replaceChildren(...cart.map(buildItem));
    emptyState.hidden = cart.length > 0;
    clearButton.disabled = cart.length === 0;
    checkoutButton.disabled = cart.length === 0;
    description.textContent = quantity === 0 ? 'Nenhum item adicionado' : `${quantity} item(ns) no carrinho`;
    subtotalElement.textContent = currency.format(subtotal);
    totalElement.textContent = currency.format(subtotal);
  }

  clearButton.addEventListener('click', () => {
    if (readCart().length && window.confirm('Deseja remover todos os itens do carrinho?')) saveCart([]);
  });
  checkoutButton.addEventListener('click', () => {
    window.DGStore?.showToast('Carrinho pronto. Conecte esta etapa ao checkout da sua loja.');
  });

  window.DGCart = {
    addItem(product) {
      const newItem = normaliseItem(product);
      const cart = readCart().map(normaliseItem);
      const existing = cart.find(item => item.id === newItem.id);
      if (existing) existing.quantity = Math.min(99, existing.quantity + newItem.quantity);
      else cart.push(newItem);
      saveCart(cart);
      window.DGStore?.showToast(`${newItem.name} foi adicionado ao carrinho.`);
    },
    clear() { saveCart([]); }
  };

  render();
})();
