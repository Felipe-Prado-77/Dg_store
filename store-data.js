(function () {
  /*
    FUTURA INTEGRAÇÃO:
    Preencha PRODUCTS_ENDPOINT com a rota pública do catálogo.
    Preencha SHIPPING_ENDPOINT com uma rota segura que consulte sua transportadora.
    Chaves privadas nunca devem ficar neste arquivo.
  */
  const PRODUCTS_ENDPOINT = '';
  const SHIPPING_ENDPOINT = '';
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  function normaliseProduct(product) {
    return {
      id: String(product.id || ''),
      name: String(product.name || 'Produto DG Store'),
      description: String(product.description || ''),
      category: product.category === 'relogios' ? 'relogios' : 'produtos',
      price: Math.max(0, Number(product.price) || 0),
      cost: Math.max(0, Number(product.cost) || 0),
      stock: Math.max(0, Number(product.stock) || 0),
      active: product.active !== false,
      images: Array.isArray(product.images) ? product.images.filter(Boolean).map(String) : [],
      specifications: Array.isArray(product.specifications) ? product.specifications : [],
      createdAt: product.createdAt || '',
      updatedAt: product.updatedAt || ''
    };
  }

  function readLocalProducts() {
    try {
      const value = JSON.parse(localStorage.getItem('dgStoreProducts') || '[]');
      return Array.isArray(value) ? value.map(normaliseProduct) : [];
    } catch {
      return [];
    }
  }

  async function getProducts() {
    if (!PRODUCTS_ENDPOINT) return readLocalProducts();
    const response = await fetch(PRODUCTS_ENDPOINT, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Não foi possível carregar os produtos.');
    const data = await response.json();
    const products = Array.isArray(data) ? data : data.products;
    return Array.isArray(products) ? products.map(normaliseProduct) : [];
  }

  async function getProduct(id) {
    const products = await getProducts();
    return products.find(product => product.id === String(id)) || null;
  }

  async function calculateShipping({ cep, productId, quantity = 1 }) {
    const digits = String(cep || '').replace(/\D/g, '');
    if (digits.length !== 8) throw new Error('Informe um CEP com 8 números.');
    if (SHIPPING_ENDPOINT) {
      const response = await fetch(SHIPPING_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cep: digits, productId, quantity })
      });
      if (!response.ok) throw new Error('Não foi possível calcular o frete.');
      return response.json();
    }

    const regionFactor = Number(digits[0]) * 1.65;
    const extraItem = Math.max(0, Number(quantity) - 1) * 2.5;
    const standard = 14.9 + regionFactor + extraItem;
    return {
      demo: true,
      destination: `CEP ${digits.slice(0, 5)}-${digits.slice(5)}`,
      options: [
        { id: 'standard', name: 'Entrega padrão', price: standard, minDays: 5 + (Number(digits[0]) % 3), maxDays: 9 + (Number(digits[0]) % 3) },
        { id: 'express', name: 'Entrega expressa', price: standard + 18, minDays: 2, maxDays: 4 }
      ]
    };
  }

  window.DGData = { getProducts, getProduct, calculateShipping, money: value => currency.format(Number(value) || 0), productsEndpoint: PRODUCTS_ENDPOINT, shippingEndpoint: SHIPPING_ENDPOINT };
})();
