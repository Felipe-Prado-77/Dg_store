(function () {
  function whatsappDigits(value) {
    let digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
    return digits;
  }
  function whatsappUrl(number, message = '') {
    const digits = whatsappDigits(number);
    if (digits.length < 12 || digits.length > 13) return '';
    return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
  }
  function instagramUrl(value) {
    const input = String(value || '').trim();
    if (!input) return '';
    if (/^https?:\/\//i.test(input)) return input;
    const handle = input.replace(/^@/, '').replace(/^instagram\.com\//i, '').replace(/\/+$/, '');
    return handle ? `https://www.instagram.com/${encodeURIComponent(handle)}/` : '';
  }
  function formatPhone(value) {
    let digits = whatsappDigits(value);
    if (digits.startsWith('55')) digits = digits.slice(2);
    if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return value;
  }
  function contactLink(className, href, text, label) {
    const link = document.createElement('a');
    link.className = `footer-contact-link ${className}`;
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', label);
    const mark = document.createElement('span');
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = className.includes('whatsapp') ? 'WA' : 'IG';
    const value = document.createElement('span');
    value.textContent = text;
    link.append(mark, value);
    return link;
  }
  function setText(selector, value, fallback = 'A preencher pela DG Store') {
    document.querySelectorAll(selector).forEach(element => {
      element.textContent = value || fallback;
      element.classList.toggle('policy-missing', !value);
    });
  }
  function apply(settings) {
    const wa = whatsappUrl(settings.whatsapp);
    const insta = instagramUrl(settings.instagram);
    document.querySelectorAll('.footer-column').forEach(column => {
      if (column.querySelector('h3')?.textContent.trim() !== 'Atendimento') return;
      column.querySelectorAll('.footer-contact-link').forEach(link => link.remove());
      if (wa) column.appendChild(contactLink('footer-whatsapp', wa, formatPhone(settings.whatsapp), 'Falar com a DG Store pelo WhatsApp'));
      if (insta) {
        const handle = String(settings.instagram).trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/+$/, '');
        column.appendChild(contactLink('footer-instagram', insta, `@${handle}`, 'Abrir Instagram da DG Store'));
      }
    });
    setText('[data-store-legal-name]', settings.legalName || settings.name);
    setText('[data-store-document]', settings.documentNumber);
    setText('[data-store-address]', settings.address);
    setText('[data-store-email]', settings.contactEmail);
    setText('[data-store-whatsapp]', settings.whatsapp ? formatPhone(settings.whatsapp) : '');
    document.querySelectorAll('[data-store-whatsapp-link]').forEach(link => {
      if (!wa) {
        link.removeAttribute('href');
        link.classList.add('policy-missing');
      } else {
        link.href = wa;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.classList.remove('policy-missing');
      }
    });
  }
  async function init() {
    try {
      await window.DGBackend?.ready;
      const settings = window.DGBackend?.config?.store || {};
      apply(settings);
      return settings;
    } catch (error) {
      console.error('Não foi possível carregar os contatos da loja.', error);
      return {};
    }
  }

  window.DGContacts = { whatsappDigits, whatsappUrl, instagramUrl, formatPhone, apply };
  window.DGContacts.ready = init();
})();
