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
