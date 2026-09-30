// One entrance controller for the homepage. All effects settle and release their layers.
export function prepareHomeEntrance(reduced) {
  if (!document.querySelector('.hero')) return false;
  document.body.classList.add('home-entrance');
  if (reduced.matches) return true;

  const targets = new Map();
  const running = new Map();
  const add = (selector, kind, delay = 0, stagger = 0) => {
    document.querySelectorAll(selector).forEach((element, index) => {
      if (!element.getClientRects().length) return;
      targets.set(element, { kind, delay: delay + index * stagger });
      element.classList.add('home-enter-pending');
    });
  };
  add('.header .logo-slot, .header .header-crystals', 'header');
  add('.header .desktop-nav, .header .menu-toggle', 'header', 70);
  add('.hero-intro', 'copy', 120);
  add('.hero h1 > span, .hero h1 > em', 'title', 180, 70);
  add('.hero-note', 'copy', 360);
  add('.hero-actions > *', 'copy', 430, 60);
  add('.hero-foot > .crystal-scene', 'jewel', 480);
  add('.hero-foot > span, .scroll-note', 'copy', 530);
  add('.hero-photo', 'photo', 100);
  add('.light-sculpture', 'jewel', 150);
  add('.light-materials, .light-stage-label, .light-handnote, .light-orbit', 'copy', 360);
  add('.brand-ribbon > span', 'copy', 180, 60);

  const poses = {
    header: { translate: '0 -10px', scale: '1' },
    copy: { translate: '0 10px', scale: '1' },
    title: { translate: '0 14px', scale: '.985' },
    photo: { translate: '0 18px', scale: '.985' },
    jewel: { translate: '0 10px', scale: '.9' },
  };
  const settle = (element) => {
    element.classList.remove('home-enter-pending');
    running.get(element)?.cancel();
    running.delete(element);
    targets.delete(element);
  };
  const observer = new IntersectionObserver((entries) => {
    let order = 0;
    for (const { target, isIntersecting } of entries) {
      if (!isIntersecting || !targets.has(target)) continue;
      observer.unobserve(target);
      const { kind, delay } = targets.get(target);
      const pose = poses[kind];
      const jewelTurn = kind === 'jewel' ? { transform: 'rotate(-7deg)' } : {};
      const animation = target.animate([
        { opacity: 0, ...pose, ...jewelTurn },
        { opacity: getComputedStyle(target).getPropertyValue('--home-final-opacity') || 1,
          translate: '0 0', scale: '1', ...(kind === 'jewel' ? { transform: 'none' } : {}) },
      ], {
        duration: kind === 'photo' || kind === 'jewel' ? 850 : 680,
        delay: Math.min(delay + order++ * 18, 580),
        easing: 'cubic-bezier(.16, 1, .3, 1)',
        fill: 'both',
      });
      running.set(target, animation);
      animation.finished.then(() => settle(target)).catch(() => {});
    }
  }, { threshold: 0.04, rootMargin: '0px 0px 16px 0px' });

  // Preserve intentional translucency once the entrance finishes.
  targets.forEach((_, element) => {
    element.classList.remove('home-enter-pending');
    element.style.setProperty('--home-final-opacity', getComputedStyle(element).opacity);
    element.classList.add('home-enter-pending');
  });
  const start = () => targets.forEach((_, element) => observer.observe(element));
  if (!document.querySelector('.arrival') || document.documentElement.dataset.introComplete === 'true') start();
  else document.addEventListener('luvio:intro-end', start, { once: true });

  const showAll = () => {
    observer.disconnect();
    document.removeEventListener('luvio:intro-end', start);
    [...targets.keys()].forEach(settle);
  };
  reduced.addEventListener('change', () => { if (reduced.matches) showAll(); });
  window.addEventListener('pageshow', (event) => { if (event.persisted) showAll(); });
  document.addEventListener('focusin', (event) => {
    const element = event.target.closest('.home-enter-pending');
    if (element) { observer.unobserve(element); settle(element); }
  });
  return true;
}
