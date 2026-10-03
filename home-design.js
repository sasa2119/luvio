import { trackHeroScroll } from './hero-scroll.js';

const stage = document.querySelector('.light-product-stage');
if (stage) {
  const hero = stage.closest('.light-hero');
  const heroProgress = trackHeroScroll(hero);
  if (!matchMedia('(max-width: 760px)').matches) {
    const dust = document.createElement('div');
    dust.className = 'crystal-dissolve-dust';
    [[43,28,10,-80,-70,35,'#e8d4a8'],[49,34,7,80,-90,-40,'#8fb59c'],[57,22,6,110,-45,70,'#d8c095'],[34,42,8,-115,-20,-55,'#b9cdb7'],[67,47,9,130,25,45,'#d8c095'],[40,58,6,-90,70,-80,'#82aa91'],[72,64,7,90,95,55,'#e8d4a8'],[20,25,5,-120,-50,110,'#d8c095'],[29,72,8,-70,100,-35,'#9cbea5'],[82,31,6,115,-70,90,'#d8c095'],[61,78,5,70,110,-75,'#b5c9b1'],[10,58,7,-130,30,60,'#e8d4a8'],[76,83,9,125,85,-45,'#83a892'],[53,12,5,35,-100,80,'#d8c095'],[17,84,6,-80,95,-100,'#b5c9b1'],[90,54,8,110,20,70,'#e8d4a8']].forEach(([left,top,size,dx,dy,spin,tone], index) => {
      const shard = document.createElement('i');
      shard.style.cssText = `--left:${left}%;--top:${top}%;--size:${size}px;--dx:${dx}px;--dy:${dy}px;--spin:${spin}deg;--tone:${tone};--alpha:${.45 + (index % 3) * .18}`;
      dust.append(shard);
    });
    for (let index = 0; index < 36; index += 1) {
      const shard = document.createElement('i');
      const left = 6 + ((index * 29) % 88);
      const top = 12 + ((index * 47) % 76);
      const size = 3 + (index % 5) * 1.5;
      const dx = (index % 2 ? 1 : -1) * (35 + (index % 7) * 14);
      const dy = (index % 3 - 1) * (28 + (index % 6) * 13);
      const spin = (index % 2 ? 1 : -1) * (45 + index * 11);
      const tone = ['#e8d4a8', '#a8c4ad', '#d8c095'][index % 3];
      shard.style.cssText = `--left:${left}%;--top:${top}%;--size:${size}px;--dx:${dx}px;--dy:${dy}px;--spin:${spin}deg;--tone:${tone};--alpha:${.4 + (index % 4) * .13}`;
      dust.append(shard);
    }
    hero.append(dust);
  }
  const frames = [...stage.querySelectorAll('.light-product-frame')];
  const choices = [...stage.querySelectorAll('[data-piece]')];
  const windowElement = stage.querySelector('.light-product-window');
  const pause = stage.querySelector('.light-product-pause');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0, timer, finishTimer, visible = false, hovered = false;
  let paused = reduced.matches;
  let targetScroll = 0;
  let currentScroll = 0;
  let scrollFrame = 0;
  let renderedScroll = hero.style.getPropertyValue('--hero-scroll');
  function animateScrollObjects() {
    scrollFrame = 0;
    currentScroll += (targetScroll - currentScroll) * .14;
    if (Math.abs(targetScroll - currentScroll) < .001) currentScroll = targetScroll;
    const nextScroll = currentScroll.toFixed(3);
    if (nextScroll !== renderedScroll) {
      hero.style.setProperty('--hero-scroll', nextScroll);
      renderedScroll = nextScroll;
    }
    if (currentScroll !== targetScroll) scrollFrame = requestAnimationFrame(animateScrollObjects);
  }
  function syncScrollObjects() {
    if (!hero) return;
    targetScroll = heroProgress();
    if (!scrollFrame && currentScroll !== targetScroll) scrollFrame = requestAnimationFrame(animateScrollObjects);
  }
  function schedule() {
    clearTimeout(timer);
    if (!paused && visible && !hovered && !document.hidden && !stage.contains(document.activeElement)) {
      timer = setTimeout(() => show((active + 1) % frames.length), 4000);
    }
  }
  function show(index) {
    if (index === active) return;
    clearTimeout(finishTimer);
    frames.forEach(frame => frame.classList.remove('is-entering', 'is-outgoing'));
    frames[active].classList.replace('is-active', 'is-outgoing');
    frames[active].setAttribute('aria-hidden', 'true');
    active = index;
    frames[active].classList.add('is-active');
    frames[active].removeAttribute('aria-hidden');
    windowElement.classList.remove('is-turning');
    void windowElement.offsetWidth;
    frames[active].classList.add('is-entering');
    windowElement.classList.add('is-turning');
    choices.forEach((button, i) => button.setAttribute('aria-pressed', String(i === active)));
    finishTimer = setTimeout(() => {
      frames.forEach(frame => frame.classList.remove('is-entering', 'is-outgoing'));
      windowElement.classList.remove('is-turning');
    }, reduced.matches ? 0 : 1250);
    schedule();
  }
  function updatePause() {
    pause.textContent = paused ? '▷' : 'Ⅱ';
    pause.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
    schedule();
  }
  choices.forEach((button, index) => button.addEventListener('click', () => show(index)));
  pause.addEventListener('click', () => { paused = !paused; updatePause(); });
  stage.addEventListener('mouseenter', () => { hovered = true; schedule(); });
  stage.addEventListener('mouseleave', () => { hovered = false; schedule(); });
  stage.addEventListener('focusin', schedule);
  stage.addEventListener('focusout', () => setTimeout(schedule, 0));
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', () => { paused = reduced.matches; updatePause(); });
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); }, { threshold: .2 }).observe(stage);
  syncScrollObjects();
  window.addEventListener('scroll', syncScrollObjects, { passive: true });
  updatePause();
}
