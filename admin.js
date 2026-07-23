(function () {
  const KEYS = {
    orders: 'dgStoreOrders',
    bookings: 'dgStoreBookings',
    slots: 'dgStoreAvailableSlots',
    products: 'dgStoreProducts'
  };
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const dateFormatter = new Intl.DateTimeFormat('pt-BR');
  const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
  const sectionTitles = { dashboard: 'Dashboard', vendas: 'Vendas', blindagens: 'Blindagens', horarios: 'Horários', produtos: 'Produtos' };
  const orderLabels = { em_preparo: 'Em preparo', a_caminho: 'A caminho', entregue: 'Entregue' };
  const bookingLabels = { confirmed: 'Confirmada', completed: 'Efetuada', cancelled: 'Cancelada', awaiting_payment: 'Aguardando pagamento' };
  let currentSection = 'dashboard';
  let chartResizeTimer;

  function read(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function money(value) { return currency.format(Number(value) || 0); }
  function safeDate(value) {
    const date = value ? new Date(value.includes('T') ? value : `${value}T12:00:00`) : null;
    return date && !Number.isNaN(date.getTime()) ? date : null;
  }
  function displayDate(value) { const date = safeDate(value); return date ? dateFormatter.format(date) : '—'; }
  function localDateValue(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  function isSameMonth(value, reference = new Date()) {
    const date = safeDate(value);
    return Boolean(date && date.getMonth() === reference.getMonth() && date.getFullYear() === reference.getFullYear());
  }
  function escapeText(value) { return String(value ?? ''); }

  function showToast(message) {
    const toast = document.getElementById('adminToast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function setSidebar(open) {
    document.getElementById('adminSidebar').classList.toggle('open', open);
    document.getElementById('sidebarOverlay').classList.toggle('open', open);
    document.getElementById('sidebarToggle').setAttribute('aria-expanded', String(open));
  }
  document.getElementById('sidebarToggle').addEventListener('click', () => setSidebar(!document.getElementById('adminSidebar').classList.contains('open')));
  document.getElementById('sidebarOverlay').addEventListener('click', () => setSidebar(false));

  function openSection(name) {
    if (!sectionTitles[name]) return;
    currentSection = name;
    document.querySelectorAll('[data-section]').forEach(section => section.classList.toggle('active', section.dataset.section === name));
    document.querySelectorAll('[data-section-target]').forEach(button => button.classList.toggle('active', button.dataset.sectionTarget === name));
    document.getElementById('pageTitle').textContent = sectionTitles[name];
    setSidebar(false);
    if (name === 'dashboard') renderDashboard();
    if (name === 'vendas') renderOrders();
    if (name === 'blindagens') renderBookings();
    if (name === 'horarios') renderSlots();
    if (name === 'produtos') renderProducts();
  }
  document.querySelectorAll('[data-section-target]').forEach(button => button.addEventListener('click', () => openSection(button.dataset.sectionTarget)));
  document.querySelectorAll('[data-go-section]').forEach(button => button.addEventListener('click', () => openSection(button.dataset.goSection)));

  function orderProfit(order) {
    if (Number.isFinite(Number(order.profit))) return Number(order.profit);
    if (Array.isArray(order.items)) return order.items.reduce((sum, item) => sum + ((Number(item.price) || 0) - (Number(item.cost) || 0)) * (Number(item.quantity) || 1), 0);
    return Number(order.total) || 0;
  }
  function bookingProfit(booking) { return booking.status === 'cancelled' ? 0 : Number(booking.profit ?? booking.price) || 0; }
  function eventDate(item) { return item.paidAt || item.createdAt || item.date || ''; }

  function renderDashboard() {
    const orders = read(KEYS.orders);
    const bookings = read(KEYS.bookings);
    const validOrders = orders.filter(order => order.status !== 'cancelled');
    const validBookings = bookings.filter(booking => ['confirmed', 'completed'].includes(booking.status));
    const totalProfit = validOrders.reduce((sum, order) => sum + orderProfit(order), 0) + validBookings.reduce((sum, booking) => sum + bookingProfit(booking), 0);
    const monthProfit = validOrders.filter(order => isSameMonth(eventDate(order))).reduce((sum, order) => sum + orderProfit(order), 0) + validBookings.filter(booking => isSameMonth(eventDate(booking))).reduce((sum, booking) => sum + bookingProfit(booking), 0);
    document.getElementById('totalProfit').textContent = money(totalProfit);
    document.getElementById('monthProfit').textContent = money(monthProfit);
    document.getElementById('salesCount').textContent = validOrders.length;
    document.getElementById('completedBookings').textContent = bookings.filter(booking => booking.status === 'completed').length;
    document.getElementById('chartTotal').textContent = money(totalProfit);
    drawProfitChart(validOrders, validBookings);
    renderTopProducts(validOrders);
    renderRecentOrders(orders);
    renderUpcomingBookings(bookings);
    updateNavCounts();
  }

  function lastSixMonths() {
    const result = [];
    const now = new Date();
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      result.push({ year: date.getFullYear(), month: date.getMonth(), label: monthFormatter.format(date).replace('.', '') });
    }
    return result;
  }
  function drawProfitChart(orders, bookings) {
    const canvas = document.getElementById('profitChart');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(600, Math.round(rect.width * ratio));
    canvas.height = Math.max(260, Math.round(rect.height * ratio));
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    const months = lastSixMonths();
    const values = months.map(period => {
      const orderValue = orders.filter(order => { const date = safeDate(eventDate(order)); return date && date.getFullYear() === period.year && date.getMonth() === period.month; }).reduce((sum, order) => sum + orderProfit(order), 0);
      const bookingValue = bookings.filter(booking => { const date = safeDate(eventDate(booking)); return date && date.getFullYear() === period.year && date.getMonth() === period.month; }).reduce((sum, booking) => sum + bookingProfit(booking), 0);
      return orderValue + bookingValue;
    });
    const padding = { top: 25 * ratio, right: 18 * ratio, bottom: 42 * ratio, left: 48 * ratio };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;
    const max = Math.max(...values, 1);
    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.fillStyle = '#737d8a';
    ctx.font = `${10 * ratio}px Inter`;
    ctx.textAlign = 'right';
    for (let line = 0; line <= 4; line += 1) {
      const y = padding.top + graphHeight * (line / 4);
      ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(width - padding.right, y); ctx.stroke();
      const value = max * (1 - line / 4);
      ctx.fillText(value >= 1000 ? `R$ ${(value / 1000).toFixed(1)}k` : `R$ ${Math.round(value)}`, padding.left - 8 * ratio, y + 3 * ratio);
    }
    const cell = graphWidth / months.length;
    const barWidth = Math.min(cell * .46, 54 * ratio);
    months.forEach((month, index) => {
      const barHeight = graphHeight * (values[index] / max);
      const x = padding.left + cell * index + (cell - barWidth) / 2;
      const y = padding.top + graphHeight - barHeight;
      const gradient = ctx.createLinearGradient(0, y, 0, padding.top + graphHeight);
      gradient.addColorStop(0, '#f2cf82'); gradient.addColorStop(1, '#a87827');
      ctx.fillStyle = gradient;
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, barWidth, Math.max(barHeight, 2 * ratio), 6 * ratio); ctx.fill(); }
      else ctx.fillRect(x, y, barWidth, Math.max(barHeight, 2 * ratio));
      ctx.fillStyle = '#929ba8'; ctx.textAlign = 'center'; ctx.fillText(month.label, x + barWidth / 2, height - 16 * ratio);
    });
  }

  function renderTopProducts(orders) {
    const list = document.getElementById('topProducts');
    const empty = document.getElementById('topProductsEmpty');
    const totals = new Map();
    orders.filter(order => isSameMonth(eventDate(order))).forEach(order => (order.items || []).forEach(item => totals.set(item.name || 'Produto', (totals.get(item.name || 'Produto') || 0) + (Number(item.quantity) || 1))));
    const ranking = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    list.replaceChildren();
    empty.hidden = ranking.length > 0;
    const max = ranking[0]?.[1] || 1;
    ranking.forEach(([name, quantity], index) => {
      const item = document.createElement('div'); item.className = 'ranking-item';
      const line = document.createElement('div'); line.className = 'ranking-line';
      const label = document.createElement('span'); label.textContent = `${index + 1}. ${name}`;
      const value = document.createElement('strong'); value.textContent = `${quantity} un.`;
      line.append(label, value);
      const track = document.createElement('div'); track.className = 'ranking-track';
      const fill = document.createElement('i'); fill.style.width = `${Math.max(8, (quantity / max) * 100)}%`; track.appendChild(fill);
      item.append(line, track); list.appendChild(item);
    });
  }

  function compactEmpty(message) { const div = document.createElement('div'); div.className = 'empty-small'; div.textContent = message; return div; }
  function renderRecentOrders(orders) {
    const container = document.getElementById('recentOrders'); container.replaceChildren();
    const recent = [...orders].sort((a, b) => new Date(eventDate(b)) - new Date(eventDate(a))).slice(0, 5);
    if (!recent.length) { container.appendChild(compactEmpty('Nenhuma venda recente.')); return; }
    recent.forEach(order => {
      const item = document.createElement('div'); item.className = 'compact-item';
      const mark = document.createElement('div'); mark.className = 'compact-mark'; mark.textContent = '▣';
      const info = document.createElement('div'); const name = document.createElement('strong'); name.textContent = order.customerName || order.customer?.name || 'Cliente'; const id = document.createElement('span'); id.textContent = order.id || 'Sem ID'; info.append(name, id);
      const value = document.createElement('div'); value.className = 'compact-value'; const total = document.createElement('b'); total.textContent = money(order.total); const status = document.createElement('small'); status.textContent = orderLabels[order.status] || order.status || 'Em preparo'; value.append(total, status);
      item.append(mark, info, value); container.appendChild(item);
    });
  }
  function renderUpcomingBookings(bookings) {
    const container = document.getElementById('upcomingBookings'); container.replaceChildren();
    const now = new Date();
    const upcoming = bookings.filter(booking => ['confirmed', 'completed'].includes(booking.status) && safeDate(booking.date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate())).sort((a, b) => safeDate(a.date) - safeDate(b.date)).slice(0, 5);
    if (!upcoming.length) { container.appendChild(compactEmpty('Nenhuma blindagem futura.')); return; }
    upcoming.forEach(booking => {
      const item = document.createElement('div'); item.className = 'compact-item';
      const mark = document.createElement('div'); mark.className = 'compact-mark'; mark.textContent = displayDate(booking.date).slice(0, 5);
      const info = document.createElement('div'); const name = document.createElement('strong'); name.textContent = booking.customerName || 'Cliente'; const packageName = document.createElement('span'); packageName.textContent = `${booking.packageName || 'Blindagem'} • ${booking.device || ''}`; info.append(name, packageName);
      const value = document.createElement('div'); value.className = 'compact-value'; const time = document.createElement('b'); time.textContent = booking.time || '—'; const status = document.createElement('small'); status.textContent = bookingLabels[booking.status] || booking.status; value.append(time, status);
      item.append(mark, info, value); container.appendChild(item);
    });
  }

  function updateNavCounts() {
    document.getElementById('ordersNavCount').textContent = read(KEYS.orders).length;
    document.getElementById('bookingsNavCount').textContent = read(KEYS.bookings).filter(item => item.status !== 'cancelled').length;
    document.getElementById('productsNavCount').textContent = read(KEYS.products).length;
  }

  function orderMatches(order, query) {
    const products = (order.items || []).map(item => item.name).join(' ');
    return `${order.id || ''} ${order.customerName || order.customer?.name || ''} ${products}`.toLowerCase().includes(query);
  }
  function renderOrders() {
    const body = document.getElementById('ordersTableBody');
    const query = document.getElementById('orderSearch').value.trim().toLowerCase();
    const filter = document.getElementById('orderStatusFilter').value;
    const orders = read(KEYS.orders).filter(order => orderMatches(order, query) && (filter === 'all' || order.status === filter)).sort((a, b) => new Date(eventDate(b)) - new Date(eventDate(a)));
    body.replaceChildren(...orders.map(buildOrderRow));
    document.getElementById('ordersEmpty').hidden = orders.length > 0;
    updateNavCounts();
  }
  function buildOrderRow(order) {
    const row = document.createElement('tr');
    const idCell = cell(order.id || '—', displayDate(eventDate(order)));
    const productsCell = document.createElement('td'); productsCell.className = 'order-products';
    const productNames = (order.items || []).map(item => `${Number(item.quantity) || 1}× ${item.name || 'Produto'}`).join(', ') || order.productName || 'Produto não informado'; productsCell.textContent = productNames;
    const customer = order.customer || {};
    const customerCell = cell(order.customerName || customer.name || '—', order.email || customer.email || '');
    const phoneCell = document.createElement('td'); phoneCell.textContent = order.phone || customer.phone || '—';
    const addressCell = document.createElement('td'); addressCell.className = 'order-products'; addressCell.textContent = order.address || customer.address || '—';
    const totalCell = document.createElement('td'); totalCell.innerHTML = `<strong class="cell-primary">${money(order.total)}</strong>`;
    const statusCell = document.createElement('td');
    const select = document.createElement('select'); select.className = `status-select ${statusClass(order.status)}`; select.setAttribute('aria-label', `Status do pedido ${order.id}`);
    Object.entries(orderLabels).forEach(([value, label]) => { const option = document.createElement('option'); option.value = value; option.textContent = label; option.selected = (order.status || 'em_preparo') === value; select.appendChild(option); });
    select.addEventListener('change', () => updateOrderStatus(order.id, select.value)); statusCell.appendChild(select);
    const actionCell = document.createElement('td'); const remove = document.createElement('button'); remove.className = 'icon-button'; remove.type = 'button'; remove.textContent = '×'; remove.title = 'Excluir pedido'; remove.addEventListener('click', () => deleteOrder(order.id)); actionCell.appendChild(remove);
    row.append(idCell, productsCell, customerCell, phoneCell, addressCell, totalCell, statusCell, actionCell); return row;
  }
  function cell(primary, secondary = '') { const td = document.createElement('td'); const strong = document.createElement('strong'); strong.className = 'cell-primary'; strong.textContent = escapeText(primary); td.appendChild(strong); if (secondary) { const small = document.createElement('span'); small.className = 'cell-secondary'; small.textContent = escapeText(secondary); td.appendChild(small); } return td; }
  function statusClass(status) { return status === 'a_caminho' ? 'shipping' : status === 'entregue' ? 'delivered' : status === 'completed' ? 'completed' : status === 'cancelled' ? 'cancelled' : 'preparing'; }
  function updateOrderStatus(id, status) { const orders = read(KEYS.orders).map(order => order.id === id ? { ...order, status, statusUpdatedAt: new Date().toISOString() } : order); write(KEYS.orders, orders); showToast(`Pedido ${id}: ${orderLabels[status]}.`); renderOrders(); }
  function deleteOrder(id) { if (!window.confirm(`Excluir o pedido ${id}?`)) return; write(KEYS.orders, read(KEYS.orders).filter(order => order.id !== id)); renderOrders(); showToast('Pedido excluído.'); }
  document.getElementById('orderSearch').addEventListener('input', renderOrders);
  document.getElementById('orderStatusFilter').addEventListener('change', renderOrders);

  function bookingMatches(booking, query) { return `${booking.id || ''} ${booking.customerName || ''} ${booking.phone || ''} ${booking.device || ''}`.toLowerCase().includes(query); }
  function renderBookings() {
    const body = document.getElementById('bookingsTableBody');
    const query = document.getElementById('bookingSearch').value.trim().toLowerCase();
    const filter = document.getElementById('bookingStatusFilter').value;
    const bookings = read(KEYS.bookings).filter(booking => bookingMatches(booking, query) && (filter === 'all' || booking.status === filter)).sort((a, b) => safeDate(a.date) - safeDate(b.date));
    body.replaceChildren(...bookings.map(buildBookingRow));
    document.getElementById('bookingsEmpty').hidden = bookings.length > 0;
    updateNavCounts();
  }
  function buildBookingRow(booking) {
    const row = document.createElement('tr');
    const dateCell = cell(`${displayDate(booking.date)} • ${booking.time || '—'}`, booking.id || '');
    const nameCell = cell(booking.customerName || '—');
    const phoneCell = document.createElement('td'); phoneCell.textContent = booking.phone || '—';
    const addressCell = document.createElement('td'); addressCell.className = 'order-products'; addressCell.textContent = booking.address || '—';
    const deviceCell = document.createElement('td'); deviceCell.textContent = booking.device || '—';
    const packageCell = document.createElement('td'); packageCell.textContent = booking.packageName || booking.packageId || '—';
    const priceCell = document.createElement('td'); priceCell.innerHTML = `<strong class="cell-primary">${money(booking.price)}</strong>`;
    const statusCell = document.createElement('td'); const select = document.createElement('select'); select.className = `status-select ${statusClass(booking.status)}`;
    ['confirmed', 'completed', 'cancelled'].forEach(value => { const option = document.createElement('option'); option.value = value; option.textContent = bookingLabels[value]; option.selected = booking.status === value; select.appendChild(option); });
    select.addEventListener('change', () => updateBookingStatus(booking.id, select.value)); statusCell.appendChild(select);
    row.append(dateCell, nameCell, phoneCell, addressCell, deviceCell, packageCell, priceCell, statusCell); return row;
  }
  function updateBookingStatus(id, status) {
    const bookings = read(KEYS.bookings); const booking = bookings.find(item => item.id === id);
    write(KEYS.bookings, bookings.map(item => item.id === id ? { ...item, status, statusUpdatedAt: new Date().toISOString() } : item));
    if (status === 'cancelled' && booking && booking.date && booking.time) {
      const slots = read(KEYS.slots);
      if (!slots.some(slot => slot.date === booking.date && slot.time === booking.time)) slots.push({ id: `SLOT-${Date.now()}`, date: booking.date, time: booking.time, duration: 60, createdAt: new Date().toISOString() });
      write(KEYS.slots, slots);
    }
    renderBookings(); showToast(`Blindagem marcada como ${bookingLabels[status].toLowerCase()}.`);
  }
  document.getElementById('bookingSearch').addEventListener('input', renderBookings);
  document.getElementById('bookingStatusFilter').addEventListener('change', renderBookings);

  const slotDate = document.getElementById('slotDate');
  slotDate.min = localDateValue(new Date(Date.now() + 86400000));
  document.getElementById('slotForm').addEventListener('submit', event => {
    event.preventDefault();
    const date = slotDate.value; const time = document.getElementById('slotTime').value; const duration = Number(document.getElementById('slotDuration').value);
    if (!date || !time) return;
    const slots = read(KEYS.slots);
    if (slots.some(slot => slot.date === date && slot.time === time)) { showToast('Este horário já foi cadastrado.'); return; }
    slots.push({ id: `SLOT-${Date.now()}`, date, time, duration, createdAt: new Date().toISOString() }); write(KEYS.slots, slots);
    event.target.reset(); slotDate.min = localDateValue(new Date(Date.now() + 86400000)); renderSlots(); showToast('Horário disponibilizado para os clientes.');
  });
  function renderSlots() {
    const filterSelect = document.getElementById('slotDateFilter');
    const currentFilter = filterSelect.value;
    const allSlots = read(KEYS.slots).filter(slot => safeDate(slot.date) >= new Date(new Date().setHours(0, 0, 0, 0))).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    const dates = [...new Set(allSlots.map(slot => slot.date))];
    filterSelect.replaceChildren(new Option('Todas as datas', 'all'), ...dates.map(date => new Option(displayDate(date), date)));
    filterSelect.value = dates.includes(currentFilter) ? currentFilter : 'all';
    const slots = allSlots.filter(slot => filterSelect.value === 'all' || slot.date === filterSelect.value);
    const list = document.getElementById('slotsList'); list.replaceChildren(...slots.map(buildSlotItem));
    document.getElementById('slotsEmpty').hidden = slots.length > 0;
  }
  function buildSlotItem(slot) {
    const date = safeDate(slot.date); const item = document.createElement('div'); item.className = 'slot-item';
    const day = document.createElement('div'); day.className = 'slot-day'; const dayNumber = document.createElement('strong'); dayNumber.textContent = String(date.getDate()).padStart(2, '0'); const month = document.createElement('span'); month.textContent = monthFormatter.format(date).replace('.', '').toUpperCase(); day.append(dayNumber, month);
    const info = document.createElement('div'); info.className = 'slot-info'; const time = document.createElement('strong'); time.textContent = slot.time; const details = document.createElement('span'); details.textContent = `${displayDate(slot.date)} • ${slot.duration || 60} min`; info.append(time, details);
    const badge = document.createElement('span'); badge.className = 'slot-badge'; badge.textContent = 'Disponível';
    const remove = document.createElement('button'); remove.className = 'icon-button'; remove.type = 'button'; remove.textContent = '×'; remove.title = 'Remover horário'; remove.addEventListener('click', () => { if (window.confirm(`Remover ${displayDate(slot.date)} às ${slot.time}?`)) { write(KEYS.slots, read(KEYS.slots).filter(item => item.id !== slot.id)); renderSlots(); showToast('Horário removido.'); } });
    item.append(day, info, badge, remove); return item;
  }
  document.getElementById('slotDateFilter').addEventListener('change', renderSlots);

  const productModal = document.getElementById('productModal'); const productForm = document.getElementById('productForm');
  function openProductModal(product = null) {
    productForm.reset(); clearProductErrors();
    document.getElementById('productModalTitle').textContent = product ? 'Editar produto' : 'Adicionar produto';
    document.getElementById('productId').value = product?.id || '';
    document.getElementById('productName').value = product?.name || '';
    document.getElementById('productCategory').value = product?.category === 'relogios' ? 'relogios' : 'produtos';
    document.getElementById('productDescription').value = product?.description || '';
    document.getElementById('productPrice').value = product?.price ?? '';
    document.getElementById('productCost').value = product?.cost ?? '';
    document.getElementById('productStock').value = product?.stock ?? '';
    document.getElementById('productActive').value = String(product?.active ?? true);
    document.getElementById('productImages').value = (product?.images || []).join('\n');
    document.getElementById('productSpecifications').value = (product?.specifications || []).map(spec => `${spec.label || spec.name}: ${spec.value || ''}`).join('\n');
    renderImagePreview(); productModal.showModal();
  }
  function closeProductModal() { productModal.close(); }
  document.getElementById('addProductButton').addEventListener('click', () => openProductModal());
  document.getElementById('closeProductModal').addEventListener('click', closeProductModal);
  document.getElementById('cancelProductModal').addEventListener('click', closeProductModal);
  productModal.addEventListener('click', event => { if (event.target === productModal) closeProductModal(); });
  document.getElementById('productImages').addEventListener('input', renderImagePreview);
  function productImages() { return document.getElementById('productImages').value.split(/\r?\n/).map(value => value.trim()).filter(Boolean).slice(0, 8); }
  function productSpecifications() {
    return document.getElementById('productSpecifications').value.split(/\r?\n/).map(line => {
      const separator = line.indexOf(':');
      if (separator < 1) return null;
      return { label: line.slice(0, separator).trim(), value: line.slice(separator + 1).trim() };
    }).filter(spec => spec && spec.label && spec.value).slice(0, 20);
  }
  function renderImagePreview() {
    const preview = document.getElementById('productImagePreview'); preview.replaceChildren();
    productImages().forEach(source => { const box = document.createElement('div'); const image = document.createElement('img'); image.src = source; image.alt = 'Prévia'; image.addEventListener('error', () => { box.textContent = 'Imagem não encontrada'; }); box.appendChild(image); preview.appendChild(box); });
  }
  function clearProductErrors() { productForm.querySelectorAll('.modal-grid label').forEach(label => { label.classList.remove('invalid'); const small = label.querySelector('small'); if (small && !label.querySelector('#productImages')) small.textContent = ''; }); }
  function validateProduct() {
    clearProductErrors(); let valid = true;
    ['productName', 'productDescription', 'productPrice', 'productStock'].forEach(id => { const field = document.getElementById(id); if (!field.value.trim()) { const label = field.closest('label'); label.classList.add('invalid'); label.querySelector('small').textContent = 'Campo obrigatório.'; valid = false; } });
    return valid;
  }
  productForm.addEventListener('submit', event => {
    event.preventDefault(); if (!validateProduct()) return;
    const id = document.getElementById('productId').value || `PROD-${Date.now()}`;
    const products = read(KEYS.products); const current = products.find(product => product.id === id);
    const product = { id, name: document.getElementById('productName').value.trim(), category: document.getElementById('productCategory').value, description: document.getElementById('productDescription').value.trim(), price: Number(document.getElementById('productPrice').value), cost: Number(document.getElementById('productCost').value) || 0, stock: Number(document.getElementById('productStock').value), active: document.getElementById('productActive').value === 'true', images: productImages(), specifications: productSpecifications(), createdAt: current?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    write(KEYS.products, current ? products.map(item => item.id === id ? product : item) : [...products, product]); closeProductModal(); renderProducts(); showToast(current ? 'Produto atualizado.' : 'Produto adicionado.');
  });
  function renderProducts() {
    const query = document.getElementById('productSearch').value.trim().toLowerCase(); const filter = document.getElementById('productStatusFilter').value;
    const allProducts = read(KEYS.products);
    const products = allProducts.filter(product => product.name.toLowerCase().includes(query) && (filter === 'all' || (filter === 'active' && product.active) || (filter === 'inactive' && !product.active) || (filter === 'low' && product.stock <= 5)));
    document.getElementById('productsTableBody').replaceChildren(...products.map(buildProductRow));
    document.getElementById('productsEmpty').hidden = products.length > 0;
    document.getElementById('activeProductsCount').textContent = allProducts.filter(product => product.active).length;
    document.getElementById('stockUnitsCount').textContent = allProducts.reduce((sum, product) => sum + (Number(product.stock) || 0), 0);
    document.getElementById('lowStockCount').textContent = allProducts.filter(product => product.stock <= 5).length;
    updateNavCounts();
  }
  function buildProductRow(product) {
    const row = document.createElement('tr');
    const productCell = document.createElement('td'); const wrapper = document.createElement('div'); wrapper.className = 'product-cell'; const thumb = document.createElement('div'); thumb.className = 'product-thumb';
    if (product.images?.[0]) { const image = document.createElement('img'); image.src = product.images[0]; image.alt = product.name; image.addEventListener('error', () => { thumb.textContent = '□'; }); thumb.appendChild(image); } else thumb.textContent = '□';
    const info = document.createElement('div'); const name = document.createElement('strong'); name.className = 'cell-primary'; name.textContent = product.name; const description = document.createElement('span'); description.className = 'cell-secondary'; description.textContent = product.description; info.append(name, description); wrapper.append(thumb, info); productCell.appendChild(wrapper);
    const category = document.createElement('td'); category.textContent = product.category === 'relogios' ? 'Relógios' : 'Produtos';
    const price = document.createElement('td'); price.innerHTML = `<strong class="cell-primary">${money(product.price)}</strong>`;
    const cost = document.createElement('td'); cost.textContent = money(product.cost);
    const stock = document.createElement('td'); stock.innerHTML = `<strong class="cell-primary ${product.stock <= 5 ? 'stock-low' : ''}">${product.stock} un.</strong>`;
    const status = document.createElement('td'); status.innerHTML = `<span class="status-badge ${product.active ? 'active' : 'inactive'}">${product.active ? 'Ativo' : 'Inativo'}</span>`;
    const updated = document.createElement('td'); updated.textContent = displayDate(product.updatedAt);
    const actions = document.createElement('td'); const group = document.createElement('div'); group.className = 'action-group'; const edit = document.createElement('button'); edit.className = 'icon-button'; edit.type = 'button'; edit.textContent = '✎'; edit.title = 'Editar produto'; edit.addEventListener('click', () => openProductModal(product)); const remove = document.createElement('button'); remove.className = 'icon-button'; remove.type = 'button'; remove.textContent = '×'; remove.title = 'Excluir produto'; remove.addEventListener('click', () => deleteProduct(product.id)); group.append(edit, remove); actions.appendChild(group);
    row.append(productCell, category, price, cost, stock, status, updated, actions); return row;
  }
  function deleteProduct(id) { const product = read(KEYS.products).find(item => item.id === id); if (!product || !window.confirm(`Excluir “${product.name}”?`)) return; write(KEYS.products, read(KEYS.products).filter(item => item.id !== id)); renderProducts(); showToast('Produto excluído.'); }
  document.getElementById('productSearch').addEventListener('input', renderProducts);
  document.getElementById('productStatusFilter').addEventListener('change', renderProducts);
  document.getElementById('refreshDashboard').addEventListener('click', () => { renderDashboard(); showToast('Dashboard atualizado.'); });

  window.addEventListener('resize', () => { clearTimeout(chartResizeTimer); chartResizeTimer = setTimeout(() => { if (currentSection === 'dashboard') renderDashboard(); }, 160); });
  window.addEventListener('storage', () => { if (currentSection === 'dashboard') renderDashboard(); else openSection(currentSection); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') setSidebar(false); });
  updateNavCounts(); renderDashboard();
})();
