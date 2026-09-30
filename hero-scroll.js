// Share the hero's layout measurement between the DOM and WebGL animations.
// Scrolling changes the viewport offset, not the hero's document position.
const measurements = new WeakMap();

export function trackHeroScroll(hero) {
  if (measurements.has(hero)) return measurements.get(hero);
  let top = 0, distance = 1, dirty = true;
  const invalidate = () => { dirty = true; };
  const observer = new ResizeObserver(invalidate);
  observer.observe(hero);
  observer.observe(document.body);
  window.addEventListener('resize', invalidate, { passive: true });
  window.addEventListener('pageshow', invalidate);
  document.fonts.ready.then(invalidate);
  const progress = () => {
    if (dirty) {
      top = hero.getBoundingClientRect().top + window.scrollY;
      distance = Math.max(1, hero.offsetHeight * .85);
      dirty = false;
    }
    return Math.max(0, Math.min(1, (window.scrollY - top) / distance));
  };
  measurements.set(hero, progress);
  return progress;
}
