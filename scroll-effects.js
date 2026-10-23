// Decorative motion only. Content stays visible if this module cannot load.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const nativeScroll = CSS.supports('animation-timeline: view()') &&
  CSS.supports('animation-range: entry 0% entry 100%');
const cards = [...document.querySelectorAll('.product-card')];
const photos = [...document.querySelectorAll(
  '.category-tile, .signature-photo, .artwork-image, .split-photo, ' +
  '.story-image figure, .studio-photo-window, .contact-photo'
)];

cards.forEach((card) => {
  const index = [...card.parentElement.children].indexOf(card);
  card.classList.add('scroll-card');
  card.style.setProperty('--scroll-order', index % 4);
  card.style.setProperty('--scroll-tilt', `${index % 2 ? 2 : -2}deg`);
});
photos.forEach((photo) => {
  const previousReveal = photo.closest('[data-reveal="image"], [data-reveal="studio-photo"]');
  previousReveal?.removeAttribute('data-reveal');
  photo.classList.add('scroll-photo');
  if (!nativeScroll) return;
  const sheen = document.createElement('span');
  sheen.className = 'scroll-sheen';
  sheen.setAttribute('aria-hidden', 'true');
  photo.append(sheen);
});

if (nativeScroll) {
  document.documentElement.classList.add('scroll-native');
  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.append(progress);
} else {
  // Older browsers get a one-time entrance, with no scroll listeners or idle loop.
  const pending = new Set([...cards, ...photos]);
  const running = new Set();
  const observer = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      if (!isIntersecting || reduced.matches || document.hidden) continue;
      observer.unobserve(target);
      pending.delete(target);
      const order = Number(target.style.getPropertyValue('--scroll-order')) || 0;
      const animation = target.animate([
        { opacity: 0.35, transform: 'translate3d(0, 28px, 0) scale(.97)' },
        { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
      ], {
        duration: 720, delay: order * 65, fill: 'backwards',
        easing: 'cubic-bezier(.16, 1, .3, 1)',
      });
      running.add(animation);
      animation.finished.catch(() => {}).finally(() => running.delete(animation));
    }
  }, { threshold: 0.08 });
  const sync = () => {
    observer.disconnect();
    if (reduced.matches || document.hidden) {
      running.forEach((animation) => animation.cancel());
      running.clear();
    } else pending.forEach((element) => observer.observe(element));
  };
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  addEventListener('pagehide', () => observer.disconnect());
  addEventListener('pageshow', sync);
  sync();
}
