(function () {
  const category = document.body.dataset.category || 'produtos';
  const grid = document.getElementById('productGrid');
  const empty = document.getElementById('catalogEmpty');
  const search = document.getElementById('catalogSearch');
  const sort = document.getElementById('catalogSort');
  const count = document.getElementById('catalogCount');
  let products = [];

  function productLink(product) { return `produto.html?id=${encodeURIComponent(product.id)}`; }
  function placeholder() { const box = document.createElement('span'); box.className = 'product-placeholder'; box.textContent = category === 'relogios' ? '◷' : '◇'; return box; }

  function buildCard(product) {
    const card = document.createElement('article'); card.className = 'product-card';
    const imageLink = document.createElement('a'); imageLink.className = 'product-image-link'; imageLink.href = productLink(product); imageLink.setAttribute('aria-label', `Ver ${product.name}`);
    if (product.images[0]) {
      const image = document.createElement('img'); image.src = product.images[0]; image.alt = product.name; image.loading = 'lazy';
      image.addEventListener('error', () => imageLink.replaceChildren(placeholder())); imageLink.appendChild(image);
    } else imageLink.appendChild(placeholder());
    const stock = document.createElement('span'); stock.className = `stock-flag ${product.stock ? '' : 'out'}`; stock.textContent = product.stock ? `${product.stock} em estoque` : 'Esgotado'; imageLink.appendChild(stock);
    const body = document.createElement('div'); body.className = 'product-card-body';
    const label = document.createElement('span'); label.className = 'product-category'; label.textContent = product.category === 'relogios' ? 'Relógios' : 'Produtos';
    const name = document.createElement('h3'); const nameLink = document.createElement('a'); nameLink.href = productLink(product); nameLink.textContent = product.name; name.appendChild(nameLink);
    const description = document.createElement('p'); description.className = 'product-description'; description.textContent = product.description;
    const currentPrice = window.DGData.effectivePrice(product);
    const price = document.createElement('strong'); price.className = 'product-price'; price.textContent = window.DGData.money(currentPrice);
    if (currentPrice < product.price) { const regular = document.createElement('del'); regular.className = 'product-regular-price'; regular.textContent = window.DGData.money(product.price); body.append(label, name, description, regular); } else body.append(label, name, description);
    const actions = document.createElement('div'); actions.className = 'product-actions';
    const details = document.createElement('a'); details.className = 'button button-secondary'; details.href = productLink(product); details.textContent = 'Ver produto';
    const cart = document.createElement('button'); cart.type = 'button'; cart.className = 'quick-cart'; cart.textContent = '+'; cart.title = 'Adicionar ao carrinho'; cart.disabled = product.stock < 1;
    cart.addEventListener('click', () => window.DGStore.addToCart({ id: product.id, name: product.name, price: currentPrice, image: product.images[0] || '', quantity: 1 }));
    actions.append(details, cart); body.append(price, actions); card.append(imageLink, body); return card;
  }

  function render() {
    const query = search.value.trim().toLowerCase();
    const filtered = products.filter(product => product.active && product.category === category && `${product.name} ${product.description}`.toLowerCase().includes(query));
    if (sort.value === 'price-asc') filtered.sort((a, b) => window.DGData.effectivePrice(a) - window.DGData.effectivePrice(b));
    if (sort.value === 'price-desc') filtered.sort((a, b) => window.DGData.effectivePrice(b) - window.DGData.effectivePrice(a));
    if (sort.value === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    grid.replaceChildren(...filtered.map(buildCard)); empty.hidden = filtered.length > 0;
    count.textContent = `${filtered.length} ${filtered.length === 1 ? 'item encontrado' : 'itens encontrados'}`;
  }

  async function load() {
    try { products = await window.DGData.getProducts(); render(); }
    catch (error) { empty.hidden = false; empty.querySelector('h3').textContent = 'Não foi possível carregar o catálogo'; empty.querySelector('p').textContent = error.message; }
  }
  search.addEventListener('input', render); sort.addEventListener('change', render); window.addEventListener('storage', load); load();
})();
