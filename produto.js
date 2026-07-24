(function () {
  const id = new URLSearchParams(location.search).get('id');
  const loading = document.getElementById('productLoading');
  const content = document.getElementById('productContent');
  const notFound = document.getElementById('productNotFound');
  const quantityInput = document.getElementById('productQuantity');
  const variantSelect = document.getElementById('productVariant');
  let product = null;

  function showNotFound() { loading.hidden = true; content.hidden = true; notFound.hidden = false; }
  function placeholder() { const span = document.createElement('span'); span.className = 'gallery-placeholder'; span.textContent = product?.category === 'relogios' ? '◷' : '◇'; return span; }

  function selectImage(source, button) {
    const main = document.getElementById('galleryMain'); main.replaceChildren(); const image = document.createElement('img'); image.src = source; image.alt = product.name; image.addEventListener('error', () => main.replaceChildren(placeholder())); main.appendChild(image);
    document.querySelectorAll('.gallery-thumb').forEach(thumb => thumb.classList.toggle('active', thumb === button));
  }
  function renderGallery() {
    const main = document.getElementById('galleryMain'); const thumbs = document.getElementById('galleryThumbs'); main.replaceChildren(); thumbs.replaceChildren();
    if (!product.images.length) { main.appendChild(placeholder()); return; }
    product.images.forEach((source, index) => { const button = document.createElement('button'); button.type = 'button'; button.className = `gallery-thumb ${index === 0 ? 'active' : ''}`; const image = document.createElement('img'); image.src = source; image.alt = `${product.name} - imagem ${index + 1}`; button.appendChild(image); button.addEventListener('click', () => selectImage(source, button)); thumbs.appendChild(button); });
    selectImage(product.images[0], thumbs.firstElementChild);
  }

  function renderSpecifications() {
    const list = document.getElementById('specificationsList'); list.replaceChildren();
    const baseSpecs = [
      ...(product.brand ? [{ label: 'Marca', value: product.brand }] : []),
      ...(product.model ? [{ label: 'Modelo', value: product.model }] : []),
      ...(product.warranty ? [{ label: 'Garantia', value: product.warranty }] : [])
    ];
    const specs = product.specifications.length ? [...baseSpecs, ...product.specifications] : [
      ...baseSpecs,
      { label: 'Categoria', value: product.category === 'relogios' ? 'Relógios' : 'Produtos' },
      { label: 'Disponibilidade', value: product.stock > 0 ? `${product.stock} unidade(s)` : 'Esgotado' },
      { label: 'Código', value: product.id }
    ];
    specs.forEach(spec => { const row = document.createElement('div'); const term = document.createElement('dt'); term.textContent = spec.label || spec.name || 'Informação'; const value = document.createElement('dd'); value.textContent = spec.value || '—'; row.append(term, value); list.appendChild(row); });
  }

  function relatedCard(item) {
    const card = document.createElement('article'); card.className = 'related-card'; const imageLink = document.createElement('a'); imageLink.href = `produto.html?id=${encodeURIComponent(item.id)}`;
    if (item.images[0]) { const image = document.createElement('img'); image.src = item.images[0]; image.alt = item.name; imageLink.appendChild(image); } else imageLink.appendChild(placeholder());
    const info = document.createElement('div'); const label = document.createElement('span'); label.textContent = item.category === 'relogios' ? 'RELÓGIOS' : 'PRODUTOS'; const title = document.createElement('h3'); const link = document.createElement('a'); link.href = imageLink.href; link.textContent = item.name; title.appendChild(link); const price = document.createElement('strong'); price.textContent = window.DGData.money(window.DGData.effectivePrice(item)); info.append(label, title, price); card.append(imageLink, info); return card;
  }

  async function renderRelated() { const all = await window.DGData.getProducts(); const related = all.filter(item => item.active && item.category === product.category && item.id !== product.id).slice(0, 3); document.getElementById('relatedProducts').replaceChildren(...related.map(relatedCard)); }

  function render() {
    const categoryName = product.category === 'relogios' ? 'Relógios' : 'Produtos'; const categoryUrl = product.category === 'relogios' ? 'relogios.html' : 'produtos.html';
    document.body.classList.toggle('watch-detail', product.category === 'relogios'); document.title = `${product.name} | DG Store`;
    const breadcrumb = document.getElementById('categoryBreadcrumb'); breadcrumb.textContent = categoryName; breadcrumb.href = categoryUrl; document.getElementById('backToCategory').href = categoryUrl;
    document.getElementById('breadcrumbName').textContent = product.name; document.getElementById('productCategory').textContent = categoryName.toUpperCase(); document.getElementById('productName').textContent = product.name; document.getElementById('productCode').textContent = `Código: ${product.id}`;
    document.getElementById('productDescription').textContent = product.description; document.getElementById('fullDescription').textContent = product.description;
    const currentPrice = window.DGData.effectivePrice(product); document.getElementById('productPrice').textContent = window.DGData.money(currentPrice);
    const regularPrice = document.getElementById('productRegularPrice'); regularPrice.hidden = currentPrice >= product.price; regularPrice.textContent = window.DGData.money(product.price);
    const variantField = document.getElementById('variantField'); variantField.hidden = !product.variants.length;
    variantSelect.replaceChildren(...product.variants.map(variant => new Option(`${variant.name} — ${window.DGData.money(currentPrice + variant.priceAdjustment)} (${variant.stock} un.)`, variant.id)));
    updatePurchaseState();
    renderGallery(); renderSpecifications(); loading.hidden = true; content.hidden = false; renderRelated();
  }

  function selectedVariant() { return product?.variants.find(variant => variant.id === variantSelect.value) || null; }
  function availableStock() { const variant = selectedVariant(); return variant ? variant.stock : product?.stock || 0; }
  function purchasePrice() { return window.DGData.effectivePrice(product) + (selectedVariant()?.priceAdjustment || 0); }
  function updatePurchaseState() {
    const stockValue = availableStock();
    const stock = document.getElementById('stockMessage'); stock.classList.toggle('out', stockValue < 1); stock.querySelector('span').textContent = stockValue > 0 ? `${stockValue} unidade(s) disponível(is)` : 'Produto esgotado';
    quantityInput.max = String(Math.max(1, stockValue)); document.getElementById('addProductToCart').disabled = stockValue < 1;
    document.getElementById('productPrice').textContent = window.DGData.money(purchasePrice());
    safeQuantity();
  }

  function safeQuantity() { const value = Math.max(1, Math.min(availableStock() || 1, Number(quantityInput.value) || 1)); quantityInput.value = value; return value; }
  document.getElementById('quantityMinus').addEventListener('click', () => { quantityInput.value = Math.max(1, safeQuantity() - 1); });
  document.getElementById('quantityPlus').addEventListener('click', () => { quantityInput.value = Math.min(availableStock() || 1, safeQuantity() + 1); }); quantityInput.addEventListener('change', safeQuantity);
  variantSelect.addEventListener('change', updatePurchaseState);
  document.getElementById('addProductToCart').addEventListener('click', () => { if (!product || availableStock() < 1) return; const variant = selectedVariant(); window.DGStore.addToCart({ id: variant ? `${product.id}::${variant.id}` : product.id, productId: product.id, name: product.name, variant: variant?.name || '', price: purchasePrice(), image: product.images[0] || '', quantity: safeQuantity() }); });

  const cep = document.getElementById('shippingCep'); cep.addEventListener('input', event => { let value = event.target.value.replace(/\D/g, '').slice(0, 8); if (value.length > 5) value = `${value.slice(0, 5)}-${value.slice(5)}`; event.target.value = value; });
  document.getElementById('shippingForm').addEventListener('submit', async event => {
    event.preventDefault(); const error = document.getElementById('shippingError'); const results = document.getElementById('shippingResults'); error.textContent = ''; results.replaceChildren(); const button = event.submitter; button.disabled = true; button.textContent = 'Calculando...';
    try {
      const response = await window.DGData.calculateShipping({ cep: cep.value, productId: product.id, quantity: safeQuantity() });
      const destination = document.createElement('p'); destination.className = 'shipping-destination'; destination.textContent = `Opções para ${response.destination || cep.value}`; results.appendChild(destination);
      if (response.demo) { const notice = document.createElement('p'); notice.className = 'shipping-demo'; notice.textContent = 'Simulação de frete para teste. Conecte uma API antes de publicar.'; results.appendChild(notice); }
      (response.options || []).forEach(option => { const item = document.createElement('div'); item.className = 'shipping-option'; const info = document.createElement('div'); const name = document.createElement('strong'); name.textContent = option.name; const time = document.createElement('span'); time.textContent = `${option.minDays} a ${option.maxDays} dias úteis`; info.append(name, time); const price = document.createElement('b'); price.textContent = window.DGData.money(option.price); item.append(info, price); results.appendChild(item); });
    } catch (failure) { error.textContent = failure.message || 'Não foi possível calcular o frete.'; }
    finally { button.disabled = false; button.textContent = 'Calcular'; }
  });

  async function load() { if (!id) return showNotFound(); try { product = await window.DGData.getProduct(id); if (!product || !product.active) return showNotFound(); render(); } catch { showNotFound(); } }
  load();
})();
