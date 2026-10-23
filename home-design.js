const stage = document.querySelector('.light-product-stage');
if (stage) {
  const frames = [...stage.querySelectorAll('.light-product-frame')];
  const choices = [...stage.querySelectorAll('[data-piece]')];
  const windowElement = stage.querySelector('.light-product-window');
  const pause = stage.querySelector('.light-product-pause');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0, timer, finishTimer, visible = false, hovered = false;
  let paused = reduced.matches;
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
    frames[active].inert = true;
    active = index;
    frames[active].classList.add('is-active');
    frames[active].removeAttribute('aria-hidden');
    frames[active].inert = false;
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
  updatePause();
}
