(function () {
  const hero = document.getElementById('inicio');
  const image = document.getElementById('homeBannerImage');
  const title = document.getElementById('homeBannerTitle');
  const subtitle = document.getElementById('homeBannerSubtitle');
  const link = document.getElementById('homeBannerButton');
  const controls = document.getElementById('heroCarouselControls');
  const dots = document.getElementById('heroCarouselDots');
  const previous = document.getElementById('previousBanner');
  const next = document.getElementById('nextBanner');
  if (!hero || !image) return;

  const fallback = [{
    title: title?.textContent || '',
    subtitle: subtitle?.textContent || '',
    imageUrl: image.getAttribute('src') || 'assets/banner2.png',
    altText: image.getAttribute('alt') || 'Banner DG Store',
    buttonLabel: link?.textContent || '',
    buttonUrl: link?.getAttribute('href') || ''
  }];
  let banners = fallback;
  let current = 0;
  let timer = null;

  function validLink(value) {
    const url = String(value || '').trim();
    if (!url) return '';
    const scheme = url.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
    if (scheme && !['http', 'https'].includes(scheme)) return '';
    return url;
  }
  function show(index, animate = true) {
    if (!banners.length) return;
    current = (index + banners.length) % banners.length;
    const banner = banners[current];
    if (animate) image.classList.add('is-changing');
    const apply = () => {
      image.src = banner.imageUrl;
      image.alt = banner.altText || banner.title || 'Banner DG Store';
      if (title) {
        title.textContent = banner.title || '';
        title.hidden = !banner.title;
      }
      if (subtitle) {
        subtitle.textContent = banner.subtitle || '';
        subtitle.hidden = !banner.subtitle;
      }
      if (link) {
        const target = validLink(banner.buttonUrl);
        link.textContent = banner.buttonLabel || 'Saiba mais';
        link.href = target || '#novidades';
        link.hidden = !banner.buttonLabel || !target;
      }
      dots.querySelectorAll('button').forEach((dot, dotIndex) => {
        dot.classList.toggle('active', dotIndex === current);
        dot.setAttribute('aria-current', dotIndex === current ? 'true' : 'false');
      });
      hero.setAttribute('aria-label', `Destaque ${current + 1} de ${banners.length}: ${banner.title || banner.altText || 'DG Store'}`);
      requestAnimationFrame(() => image.classList.remove('is-changing'));
    };
    if (animate) window.setTimeout(apply, 130);
    else apply();
  }
  function restart() {
    clearInterval(timer);
    if (banners.length > 1 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      timer = window.setInterval(() => show(current + 1), 6000);
    }
  }
  function buildControls() {
    const multiple = banners.length > 1;
    controls.hidden = !multiple;
    dots.replaceChildren();
    if (!multiple) return;
    banners.forEach((banner, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Mostrar banner ${index + 1}: ${banner.title || banner.altText || 'DG Store'}`);
      dot.addEventListener('click', () => { show(index); restart(); });
      dots.appendChild(dot);
    });
  }
  async function load() {
    try {
      await window.DGBackend?.ready;
      const loaded = window.DGBackend?.enabled ? await window.DGBackend.getHomeBanners() : fallback;
      if (loaded?.length) banners = loaded;
    } catch (error) {
      console.error('Não foi possível carregar os banners.', error);
    }
    buildControls();
    show(0, false);
    restart();
  }

  previous?.addEventListener('click', () => { show(current - 1); restart(); });
  next?.addEventListener('click', () => { show(current + 1); restart(); });
  hero.addEventListener('mouseenter', () => clearInterval(timer));
  hero.addEventListener('mouseleave', restart);
  hero.addEventListener('focusin', () => clearInterval(timer));
  hero.addEventListener('focusout', restart);
  document.addEventListener('visibilitychange', () => document.hidden ? clearInterval(timer) : restart());
  load();
})();
