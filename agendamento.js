(function () {
  /*
    EDITE ESTES VALORES ANTES DE PUBLICAR.
    Para pagamento real, informe uma API própria em PAYMENT_API_URL.

    Contrato esperado:
    POST PAYMENT_API_URL -> { paymentId, status, pixCode }
    GET  PAYMENT_API_URL/:paymentId -> { status: "pending" | "approved" }

    A chave secreta do provedor de pagamento nunca deve ficar neste arquivo.
  */
  const PAYMENT_API_URL = '';
  const PACKAGES = {
    tela: { name: 'Tela', description: 'Proteção da tela', price: 79.90 },
    'tela-camera': { name: 'Tela + câmera', description: 'Tela e conjunto de câmeras', price: 99.90 },
    completo: { name: 'Completo', description: 'Tela, câmera e traseira', price: 129.90 }
  };

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const form = document.getElementById('bookingForm');
  const phone = document.getElementById('phone');
  const date = document.getElementById('bookingDate');
  const timeSelect = document.getElementById('bookingTime');
  const packageOptions = document.getElementById('packageOptions');
  const packageError = document.getElementById('packageError');
  const consentError = document.getElementById('consentError');
  const paymentPlaceholder = document.getElementById('paymentPlaceholder');
  const pixArea = document.getElementById('pixArea');
  const pixCode = document.getElementById('pixCode');
  const paymentIdText = document.getElementById('paymentIdText');
  const paymentStatus = document.getElementById('paymentStatus');
  const demoNotice = document.getElementById('demoNotice');
  const generateButton = document.getElementById('generatePayment');
  const checkButton = document.getElementById('checkPayment');
  const demoApprove = document.getElementById('demoApprove');
  let booking = null;
  let payment = { id: '', status: 'not_created' };

  Object.entries(PACKAGES).forEach(([id, item]) => {
    const label = document.createElement('label');
    label.className = 'package-option';
    label.innerHTML = `<input type="radio" name="package" value="${id}"><span class="package-card"><b>${item.name}</b><small>${item.description}</small><strong>${currency.format(item.price)}</strong></span>`;
    packageOptions.appendChild(label);
  });

  const requestedPackage = new URLSearchParams(location.search).get('pacote');
  if (PACKAGES[requestedPackage]) packageOptions.querySelector(`[value="${requestedPackage}"]`).checked = true;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  date.min = tomorrow.toISOString().split('T')[0];

  function readAvailableSlots() {
    try {
      const value = JSON.parse(localStorage.getItem('dgStoreAvailableSlots') || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function loadAvailableTimes() {
    const selectedDate = date.value;
    const slots = readAvailableSlots()
      .filter(slot => slot.date === selectedDate)
      .sort((a, b) => a.time.localeCompare(b.time));

    timeSelect.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = selectedDate
      ? (slots.length ? 'Selecione um horário' : 'Nenhum horário disponível nesta data')
      : 'Escolha uma data primeiro';
    timeSelect.appendChild(placeholder);

    slots.forEach(slot => {
      const option = document.createElement('option');
      option.value = slot.time;
      option.dataset.slotId = slot.id;
      option.textContent = `${slot.time} • ${slot.duration || 60} min`;
      timeSelect.appendChild(option);
    });

    timeSelect.disabled = !selectedDate || slots.length === 0;
    setFieldError(timeSelect, selectedDate && !slots.length ? 'Escolha outra data ou aguarde novos horários.' : '');
  }

  date.addEventListener('change', loadAvailableTimes);

  phone.addEventListener('input', event => {
    let value = event.target.value.replace(/\D/g, '').slice(0, 11);
    if (value.length > 10) value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    else if (value.length > 6) value = value.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
    else if (value.length > 2) value = value.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
    else if (value.length) value = value.replace(/^(\d{0,2})$/, '($1');
    event.target.value = value;
  });

  function setStep(step) {
    document.querySelectorAll('[data-step-panel]').forEach(panel => panel.classList.toggle('active', Number(panel.dataset.stepPanel) === step));
    document.querySelectorAll('[data-step-indicator]').forEach(indicator => {
      const value = Number(indicator.dataset.stepIndicator);
      indicator.classList.toggle('active', value === step);
      indicator.classList.toggle('complete', value < step);
    });
    window.scrollTo({ top: document.querySelector('.booking-content').offsetTop - 90, behavior: 'smooth' });
  }

  function setFieldError(field, message) {
    const wrapper = field.closest('.field');
    wrapper?.classList.toggle('invalid', Boolean(message));
    const small = wrapper?.querySelector('small');
    if (small) small.textContent = message;
  }

  function validate() {
    let valid = true;
    form.querySelectorAll('.field [required]').forEach(field => {
      const message = field.value.trim() ? '' : 'Este campo é obrigatório.';
      setFieldError(field, message);
      if (message) valid = false;
    });
    if (phone.value.replace(/\D/g, '').length < 10) {
      setFieldError(phone, 'Informe um telefone válido.');
      valid = false;
    }
    const selectedPackage = form.querySelector('[name="package"]:checked');
    packageError.textContent = selectedPackage ? '' : 'Selecione um pacote.';
    if (!selectedPackage) valid = false;
    const consent = document.getElementById('consent');
    consentError.textContent = consent.checked ? '' : 'Autorize o uso dos dados para continuar.';
    if (!consent.checked) valid = false;
    return valid;
  }

  function collectBooking() {
    const packageId = form.querySelector('[name="package"]:checked').value;
    return {
      id: `DG-${Date.now()}`,
      customerName: document.getElementById('customerName').value.trim(),
      phone: phone.value.trim(),
      device: document.getElementById('device').value.trim(),
      address: document.getElementById('address').value.trim(),
      packageId,
      packageName: PACKAGES[packageId].name,
      price: PACKAGES[packageId].price,
      date: date.value,
      time: timeSelect.value,
      slotId: timeSelect.selectedOptions[0]?.dataset.slotId || '',
      notes: document.getElementById('notes').value.trim(),
      createdAt: new Date().toISOString(),
      status: 'awaiting_payment'
    };
  }

  function updateSummary() {
    if (!booking) return;
    document.getElementById('summaryEmpty').hidden = true;
    document.getElementById('summaryDetails').hidden = false;
    document.getElementById('summaryName').textContent = booking.customerName;
    document.getElementById('summaryDevice').textContent = booking.device;
    document.getElementById('summaryAddress').textContent = booking.address;
    document.getElementById('summaryPackage').textContent = booking.packageName;
    const formattedDate = new Intl.DateTimeFormat('pt-BR').format(new Date(`${booking.date}T12:00:00`));
    document.getElementById('summarySchedule').textContent = `${formattedDate} às ${booking.time}`;
    document.getElementById('summaryPrice').textContent = currency.format(booking.price);
  }

  form.addEventListener('input', event => {
    if (event.target.matches('.field input, .field select')) setFieldError(event.target, '');
    if (event.target.name === 'package') packageError.textContent = '';
    if (event.target.id === 'consent') consentError.textContent = '';
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!validate()) {
      form.querySelector('.invalid input, .invalid select')?.focus();
      return;
    }
    booking = collectBooking();
    updateSummary();
    setStep(2);
  });

  function updatePaymentStatus(status) {
    payment.status = status;
    paymentStatus.className = `payment-status ${status === 'approved' ? 'approved' : status === 'pending' ? 'pending' : ''}`;
    paymentStatus.querySelector('span').textContent = status === 'approved' ? 'Pagamento aprovado' : status === 'pending' ? 'Aguardando pagamento' : 'Pagamento ainda não gerado';
    if (status === 'approved') setTimeout(() => setStep(3), 450);
  }

  async function createPayment() {
    if (!booking) return;
    generateButton.disabled = true;
    generateButton.textContent = 'Gerando...';
    try {
      if (!PAYMENT_API_URL) {
        payment = { id: `DEMO-${Date.now()}`, status: 'pending', pixCode: `00020126-DGSTORE-DEMO-${booking.id}-${booking.price.toFixed(2)}` };
        demoNotice.hidden = false;
        demoApprove.hidden = false;
      } else {
        const response = await fetch(PAYMENT_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: booking.id, amount: booking.price, customer: { name: booking.customerName, phone: booking.phone } }) });
        if (!response.ok) throw new Error('Não foi possível gerar o pagamento.');
        payment = await response.json();
        checkButton.hidden = false;
      }
      pixCode.value = payment.pixCode || '';
      paymentIdText.textContent = `Identificação: ${payment.id || payment.paymentId}`;
      paymentPlaceholder.hidden = true;
      pixArea.hidden = false;
      generateButton.hidden = true;
      updatePaymentStatus(payment.status || 'pending');
    } catch (error) {
      window.DGStore?.showToast(error.message || 'Erro ao gerar pagamento.');
      generateButton.disabled = false;
      generateButton.textContent = 'Gerar pagamento Pix';
    }
  }

  async function checkPayment() {
    const paymentId = payment.id || payment.paymentId;
    if (!PAYMENT_API_URL || !paymentId) return;
    checkButton.disabled = true;
    try {
      const response = await fetch(`${PAYMENT_API_URL}/${encodeURIComponent(paymentId)}`);
      if (!response.ok) throw new Error('Não foi possível verificar o pagamento.');
      const result = await response.json();
      updatePaymentStatus(result.status || 'pending');
      if (result.status !== 'approved') window.DGStore?.showToast('O pagamento ainda não foi aprovado.');
    } catch (error) {
      window.DGStore?.showToast(error.message || 'Erro ao verificar pagamento.');
    } finally {
      checkButton.disabled = false;
    }
  }

  generateButton.addEventListener('click', createPayment);
  checkButton.addEventListener('click', checkPayment);
  demoApprove.addEventListener('click', () => updatePaymentStatus('approved'));
  document.getElementById('copyPix').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(pixCode.value); window.DGStore?.showToast('Código Pix copiado.'); }
    catch { pixCode.select(); document.execCommand('copy'); window.DGStore?.showToast('Código Pix copiado.'); }
  });
  document.getElementById('backToData').addEventListener('click', () => {
    if (payment.status === 'pending' && !window.confirm('Voltar apagará o pagamento gerado. Deseja continuar?')) return;
    payment = { id: '', status: 'not_created' };
    paymentPlaceholder.hidden = false; pixArea.hidden = true; demoNotice.hidden = true; demoApprove.hidden = true; checkButton.hidden = true;
    generateButton.hidden = false; generateButton.disabled = false; generateButton.textContent = 'Gerar pagamento Pix';
    updatePaymentStatus('not_created'); setStep(1);
  });

  document.getElementById('confirmBooking').addEventListener('click', event => {
    if (!booking || payment.status !== 'approved') {
      window.DGStore?.showToast('O pagamento precisa estar aprovado.');
      return;
    }
    booking.status = 'confirmed';
    booking.paymentId = payment.id || payment.paymentId;
    booking.paidAt = new Date().toISOString();
    let bookings = [];
    try { bookings = JSON.parse(localStorage.getItem('dgStoreBookings') || '[]'); if (!Array.isArray(bookings)) bookings = []; } catch { bookings = []; }
    bookings.push(booking);
    localStorage.setItem('dgStoreBookings', JSON.stringify(bookings));
    const remainingSlots = readAvailableSlots().filter(slot => slot.id !== booking.slotId);
    localStorage.setItem('dgStoreAvailableSlots', JSON.stringify(remainingSlots));
    event.currentTarget.hidden = true;
    const confirmation = document.getElementById('bookingConfirmation');
    confirmation.hidden = false;
    document.getElementById('confirmationCode').textContent = booking.id;
    const formattedDate = new Intl.DateTimeFormat('pt-BR').format(new Date(`${booking.date}T12:00:00`));
    document.getElementById('confirmationMessage').textContent = `${booking.customerName}, sua blindagem ${booking.packageName} está reservada para ${formattedDate} às ${booking.time}.`;
  });
})();
