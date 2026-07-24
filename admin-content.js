(function () {
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const packageModal = document.getElementById('packageModal');
  const packageForm = document.getElementById('packageForm');
  const bannerModal = document.getElementById('bannerModal');
  const bannerForm = document.getElementById('bannerForm');
  let packages = [];
  let banners = [];

  function toast(message) {
    const item = document.getElementById('adminToast');
    item.textContent = message;
    item.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => item.classList.remove('show'), 2800);
  }
  function lines(value) {
    return String(value || '').split(/\r?\n/).map(item => item.trim()).filter(Boolean);
  }
  function slug(value) {
    return String(value || 'pacote')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 55) || 'pacote';
  }
  function statusBadge(active) {
    const badge = document.createElement('span');
    badge.className = `status-badge ${active ? 'active' : 'inactive'}`;
    badge.textContent = active ? 'Ativo' : 'Inativo';
    return badge;
  }
  function actionButton(label, title, handler) {
    const button = document.createElement('button');
    button.className = 'icon-button';
    button.type = 'button';
    button.textContent = label;
    button.title = title;
    button.addEventListener('click', handler);
    return button;
  }
  function actionGroup(...buttons) {
    const group = document.createElement('div');
    group.className = 'action-group';
    group.append(...buttons);
    return group;
  }
  function clearErrors(form) {
    form.querySelectorAll('label.invalid').forEach(label => label.classList.remove('invalid'));
  }
  function fieldError(field, message) {
    const label = field.closest('label');
    label?.classList.toggle('invalid', Boolean(message));
    const small = label?.querySelector('small');
    if (small && message) small.textContent = message;
  }
  function requireBackend() {
    if (!window.DGBackend?.enabled) throw new Error('Configure o Supabase para gerenciar este conteúdo.');
    return window.DGBackend.client;
  }

  async function fetchPackages() {
    packages = await window.DGBackend.getArmorPackages({ includeInactive: true }) || [];
    renderPackages();
  }
  function renderPackages() {
    const body = document.getElementById('packagesTableBody');
    const empty = document.getElementById('packagesEmpty');
    if (!body || !empty) return;
    body.replaceChildren(...packages.map(item => {
      const row = document.createElement('tr');
      const name = document.createElement('td');
      const nameStrong = document.createElement('strong');
      nameStrong.className = 'cell-primary';
      nameStrong.textContent = item.name;
      const id = document.createElement('span');
      id.className = 'cell-secondary';
      id.textContent = item.id;
      name.append(nameStrong, id);
      const description = document.createElement('td');
      description.className = 'order-products';
      description.textContent = item.description || '—';
      const price = document.createElement('td');
      const priceStrong = document.createElement('strong');
      priceStrong.className = 'cell-primary';
      priceStrong.textContent = currency.format(item.price);
      price.appendChild(priceStrong);
      const order = document.createElement('td');
      order.textContent = String(item.displayOrder);
      const featured = document.createElement('td');
      featured.textContent = item.featured ? 'Mais escolhido' : '—';
      const status = document.createElement('td');
      status.appendChild(statusBadge(item.active));
      const actions = document.createElement('td');
      actions.appendChild(actionGroup(
        actionButton('✎', 'Editar pacote', () => openPackage(item)),
        actionButton('×', 'Excluir pacote', () => deletePackage(item))
      ));
      row.append(name, description, price, order, featured, status, actions);
      return row;
    }));
    empty.hidden = packages.length > 0;
  }
  function openPackage(item = null) {
    packageForm.reset();
    clearErrors(packageForm);
    document.getElementById('packageModalTitle').textContent = item ? 'Editar pacote' : 'Adicionar pacote';
    document.getElementById('packageId').value = item?.id || '';
    document.getElementById('packageName').value = item?.name || '';
    document.getElementById('packageDescription').value = item?.description || '';
    document.getElementById('packagePrice').value = item?.price ?? '';
    document.getElementById('packageOrder').value = item?.displayOrder ?? ((packages.length + 1) * 10);
    document.getElementById('packageActive').value = String(item?.active ?? true);
    document.getElementById('packageFeatured').value = String(item?.featured ?? false);
    document.getElementById('packageFeatures').value = (item?.features || []).join('\n');
    packageModal.showModal();
  }
  async function deletePackage(item) {
    if (!window.confirm(`Excluir o pacote “${item.name}”? Os agendamentos antigos continuarão com o nome e valor já pagos.`)) return;
    try {
      const client = requireBackend();
      const { error } = await client.from('armor_packages').delete().eq('id', item.id);
      if (error) throw error;
      await fetchPackages();
      toast('Pacote excluído.');
    } catch (error) {
      toast(error.message || 'Não foi possível excluir o pacote.');
    }
  }
  packageForm.addEventListener('submit', async event => {
    event.preventDefault();
    clearErrors(packageForm);
    const name = document.getElementById('packageName');
    const description = document.getElementById('packageDescription');
    const price = document.getElementById('packagePrice');
    let valid = true;
    if (!name.value.trim()) { fieldError(name, 'Informe o nome.'); valid = false; }
    if (!description.value.trim()) { fieldError(description, 'Informe a descrição.'); valid = false; }
    if (!(Number(price.value) > 0)) { fieldError(price, 'Informe um preço maior que zero.'); valid = false; }
    if (!valid) return;
    const button = event.submitter || packageForm.querySelector('[type="submit"]');
    button.disabled = true;
    const existingId = document.getElementById('packageId').value;
    const id = existingId || `${slug(name.value)}-${Date.now().toString(36)}`;
    const row = {
      id,
      name: name.value.trim(),
      description: description.value.trim(),
      price: Number(price.value),
      features: lines(document.getElementById('packageFeatures').value),
      active: document.getElementById('packageActive').value === 'true',
      featured: document.getElementById('packageFeatured').value === 'true',
      display_order: Number(document.getElementById('packageOrder').value) || 0
    };
    try {
      const client = requireBackend();
      if (row.featured) {
        const { error: clearError } = await client.from('armor_packages').update({ featured: false }).neq('id', id);
        if (clearError) throw clearError;
      }
      const { error } = await client.from('armor_packages').upsert(row, { onConflict: 'id' });
      if (error) throw error;
      packageModal.close();
      await fetchPackages();
      toast(existingId ? 'Pacote atualizado.' : 'Pacote adicionado.');
    } catch (error) {
      toast(error.message || 'Não foi possível salvar o pacote.');
    } finally {
      button.disabled = false;
    }
  });

  async function fetchBanners() {
    banners = await window.DGBackend.getHomeBanners({ includeInactive: true }) || [];
    renderBanners();
  }
  function bannerCard(item) {
    const article = document.createElement('article');
    article.className = 'banner-admin-card';
    const preview = document.createElement('div');
    preview.className = 'banner-admin-preview';
    const image = document.createElement('img');
    image.src = item.imageUrl;
    image.alt = item.altText || item.title || 'Banner DG Store';
    image.addEventListener('error', () => {
      preview.classList.add('image-error');
      preview.textContent = 'Imagem não encontrada';
    });
    preview.appendChild(image);
    const body = document.createElement('div');
    body.className = 'banner-admin-body';
    const top = document.createElement('div');
    top.className = 'banner-admin-top';
    const info = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = item.title || 'Banner sem título';
    const meta = document.createElement('p');
    meta.textContent = `Ordem ${item.displayOrder} • ${item.buttonLabel || 'Sem botão'}`;
    info.append(title, meta);
    top.append(info, statusBadge(item.active));
    const subtitle = document.createElement('p');
    subtitle.className = 'banner-admin-subtitle';
    subtitle.textContent = item.subtitle || 'Sem texto de apoio.';
    const actions = actionGroup(
      actionButton('✎', 'Editar banner', () => openBanner(item)),
      actionButton('×', 'Excluir banner', () => deleteBanner(item))
    );
    body.append(top, subtitle, actions);
    article.append(preview, body);
    return article;
  }
  function renderBanners() {
    const grid = document.getElementById('bannersGrid');
    const empty = document.getElementById('bannersEmpty');
    if (!grid || !empty) return;
    grid.replaceChildren(...banners.map(bannerCard));
    empty.hidden = banners.length > 0;
  }
  function renderBannerModalPreview() {
    const preview = document.getElementById('bannerModalPreview');
    const source = document.getElementById('bannerImageUrl').value.trim();
    preview.replaceChildren();
    if (!source) return;
    const image = document.createElement('img');
    image.src = source;
    image.alt = 'Prévia do banner';
    image.addEventListener('error', () => { preview.textContent = 'Não foi possível carregar a prévia desta imagem.'; });
    preview.appendChild(image);
  }
  function openBanner(item = null) {
    bannerForm.reset();
    clearErrors(bannerForm);
    document.getElementById('bannerModalTitle').textContent = item ? 'Editar banner' : 'Adicionar banner';
    document.getElementById('bannerId').value = item?.id || '';
    document.getElementById('bannerImageUrl').value = item?.imageUrl || '';
    document.getElementById('bannerTitle').value = item?.title || '';
    document.getElementById('bannerSubtitle').value = item?.subtitle || '';
    document.getElementById('bannerButtonLabel').value = item?.buttonLabel || '';
    document.getElementById('bannerButtonUrl').value = item?.buttonUrl || '';
    document.getElementById('bannerAltText').value = item?.altText || '';
    document.getElementById('bannerOrder').value = item?.displayOrder ?? ((banners.length + 1) * 10);
    document.getElementById('bannerActive').value = String(item?.active ?? true);
    renderBannerModalPreview();
    bannerModal.showModal();
  }
  async function deleteBanner(item) {
    if (!window.confirm(`Excluir o banner “${item.title || 'sem título'}”?`)) return;
    try {
      const client = requireBackend();
      const { error } = await client.from('home_banners').delete().eq('id', item.id);
      if (error) throw error;
      await fetchBanners();
      toast('Banner excluído.');
    } catch (error) {
      toast(error.message || 'Não foi possível excluir o banner.');
    }
  }
  document.getElementById('bannerImageUrl').addEventListener('input', renderBannerModalPreview);
  document.getElementById('bannerImageFile').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast('A imagem deve ter no máximo 8 MB.');
      event.target.value = '';
      return;
    }
    try {
      const url = await window.DGBackend.uploadSiteImage(file);
      document.getElementById('bannerImageUrl').value = url;
      renderBannerModalPreview();
      toast('Imagem enviada.');
    } catch (error) {
      toast(error.message || 'Não foi possível enviar a imagem.');
    } finally {
      event.target.value = '';
    }
  });
  bannerForm.addEventListener('submit', async event => {
    event.preventDefault();
    clearErrors(bannerForm);
    const imageUrl = document.getElementById('bannerImageUrl');
    const buttonLabel = document.getElementById('bannerButtonLabel').value.trim();
    const buttonUrl = document.getElementById('bannerButtonUrl').value.trim();
    let valid = true;
    if (!imageUrl.value.trim()) { fieldError(imageUrl, 'Envie ou informe uma imagem.'); valid = false; }
    if (Boolean(buttonLabel) !== Boolean(buttonUrl)) {
      fieldError(document.getElementById(buttonLabel ? 'bannerButtonUrl' : 'bannerButtonLabel'), 'Preencha o texto e o destino do botão.');
      valid = false;
    }
    const buttonScheme = buttonUrl.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
    if (buttonScheme && !['http', 'https'].includes(buttonScheme)) {
      fieldError(document.getElementById('bannerButtonUrl'), 'Use um endereço http(s) ou uma página do site.');
      valid = false;
    }
    if (!valid) return;
    const button = event.submitter || bannerForm.querySelector('[type="submit"]');
    button.disabled = true;
    const existingId = document.getElementById('bannerId').value;
    const row = {
      title: document.getElementById('bannerTitle').value.trim(),
      subtitle: document.getElementById('bannerSubtitle').value.trim(),
      image_url: imageUrl.value.trim(),
      alt_text: document.getElementById('bannerAltText').value.trim() || document.getElementById('bannerTitle').value.trim() || 'Banner DG Store',
      button_label: buttonLabel,
      button_url: buttonUrl,
      active: document.getElementById('bannerActive').value === 'true',
      display_order: Number(document.getElementById('bannerOrder').value) || 0
    };
    try {
      const client = requireBackend();
      const result = existingId
        ? await client.from('home_banners').update(row).eq('id', existingId)
        : await client.from('home_banners').insert(row);
      if (result.error) throw result.error;
      bannerModal.close();
      await fetchBanners();
      toast(existingId ? 'Banner atualizado.' : 'Banner adicionado.');
    } catch (error) {
      toast(error.message || 'Não foi possível salvar o banner.');
    } finally {
      button.disabled = false;
    }
  });

  document.getElementById('addPackageButton').addEventListener('click', () => openPackage());
  document.getElementById('closePackageModal').addEventListener('click', () => packageModal.close());
  document.getElementById('cancelPackageModal').addEventListener('click', () => packageModal.close());
  document.getElementById('addBannerButton').addEventListener('click', () => openBanner());
  document.getElementById('closeBannerModal').addEventListener('click', () => bannerModal.close());
  document.getElementById('cancelBannerModal').addEventListener('click', () => bannerModal.close());
  [packageModal, bannerModal].forEach(modal => modal.addEventListener('click', event => {
    if (event.target === modal) modal.close();
  }));

  window.DGAdminContent = { renderPackages, renderBanners, fetchPackages, fetchBanners };
  async function boot() {
    try {
      await window.DGBackend?.ready;
      if (!window.DGBackend?.enabled || !(await window.DGBackend.requireAdmin())) return;
      await Promise.all([fetchPackages(), fetchBanners()]);
    } catch (error) {
      toast(`Não foi possível carregar pacotes e banners: ${error.message}`);
    }
  }
  boot();
})();
