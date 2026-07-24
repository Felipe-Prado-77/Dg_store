(function () {
  const fallback = [
    { id: 'tela', name: 'Tela', description: 'Proteção para a área mais usada do aparelho.', price: 79.90, features: ['Aplicação na tela', 'Limpeza e preparação', 'Revisão de acabamento'] },
    { id: 'tela-camera', name: 'Tela + câmera', description: 'Proteção para visualização e conjunto de lentes.', price: 99.90, features: ['Aplicação na tela', 'Proteção das câmeras', 'Revisão de acabamento'], featured: true },
    { id: 'completo', name: 'Completo', description: 'Tela, câmeras e traseira protegidas.', price: 129.90, features: ['Aplicação na tela', 'Câmeras e traseira', 'Revisão completa'] }
  ];
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const grid = document.getElementById('armorPackageGrid');

  function packageCard(item) {
    const article = document.createElement('article');
    if (item.featured) {
      article.classList.add('featured');
      const popular = document.createElement('span');
      popular.className = 'popular';
      popular.textContent = 'MAIS ESCOLHIDO';
      article.appendChild(popular);
    }
    const label = document.createElement('span');
    label.className = 'package-name';
    label.textContent = 'PACOTE DE BLINDAGEM';
    const title = document.createElement('h3');
    title.textContent = item.name;
    const description = document.createElement('p');
    description.textContent = item.description;
    const price = document.createElement('strong');
    price.className = 'package-price';
    price.textContent = currency.format(item.price);
    const list = document.createElement('ul');
    (item.features || []).forEach(feature => {
      const listItem = document.createElement('li');
      listItem.textContent = feature;
      list.appendChild(listItem);
    });
    const link = document.createElement('a');
    link.className = `button ${item.featured ? 'button-primary' : 'button-secondary'}`;
    link.href = `agendamento.html?pacote=${encodeURIComponent(item.id)}`;
    link.textContent = 'Selecionar';
    article.append(label, title, description, price, list, link);
    return article;
  }

  async function loadPackages() {
    try {
      await window.DGBackend?.ready;
      const loaded = window.DGBackend?.enabled ? await window.DGBackend.getArmorPackages() : fallback;
      const packages = (loaded || []).filter(item => item.active !== false);
      grid.replaceChildren();
      if (!packages.length) {
        const empty = document.createElement('p');
        empty.className = 'packages-loading';
        empty.textContent = 'Nenhum pacote disponível no momento.';
        grid.appendChild(empty);
        return;
      }
      grid.append(...packages.map(packageCard));
    } catch (error) {
      grid.replaceChildren(...fallback.map(packageCard));
      console.error('Não foi possível carregar os pacotes.', error);
    }
  }

  document.querySelectorAll('.faq-item').forEach(item => {
    const button = item.querySelector('button');
    button.addEventListener('click', () => {
      const willOpen = !item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(other => {
        other.classList.remove('open');
        other.querySelector('button')?.setAttribute('aria-expanded', 'false');
      });
      if (willOpen) {
        item.classList.add('open');
        button.setAttribute('aria-expanded', 'true');
      }
    });
  });

  loadPackages();
})();
