import { prepareHomeEntrance } from './home-entrance.js';
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
prepareHomeEntrance(reduced);
const reveals = [...document.querySelectorAll("[data-reveal]")];

// Observe the box, animate only its contents: clipping never prevents entrance detection.
for (const element of reveals) {
  if (!element.dataset.reveal) {
    element.dataset.reveal = element.classList.contains("crystal-wordmark")
      ? "stones"
      : element.querySelector(":scope > img")
        ? "image"
        : "text";
  }
}
const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting) {
        target.classList.add("visible");
        revealObserver.unobserve(target);
      }
    }
  },
  { threshold: 0.04, rootMargin: "0px 0px 32px 0px" },
);

if (!reduced.matches) {
  document.body.classList.add("motion-ready");
  reveals.forEach((el) => revealObserver.observe(el));
}
reduced.addEventListener("change", () => {
  if (reduced.matches) {
    reveals.forEach((el) => el.classList.add("visible"));
    revealObserver.disconnect();
  }
});

// Load the tiny renderer only when a jewel approaches the viewport.
let crystalModule;

// The optional introduction never delays page construction or locks scrolling.
// Play on each homepage load; respect reduced motion and direct section links.
const arrival = document.querySelector(".arrival");
const signalIntroEnd = () => {
  document.documentElement.dataset.introComplete = "true";
  document.dispatchEvent(new Event("luvio:intro-end"));
};
if (arrival) {
  if (reduced.matches || location.hash) {
    arrival.remove();
    signalIntroEnd();
  } else {
    arrival.hidden = false;
    let destroy,
      timer,
      closing = false;
    const events = new AbortController();
    const finish = (immediate = false) => {
      if (closing) return;
      closing = true;
      clearTimeout(timer);
      events.abort();
      arrival.classList.add("arrival-leaving");
      // Let the home entrance begin as the intro fades, not after a blank gap.
      signalIntroEnd();
      // Do not leave focus on a button that is about to be removed.
      if (arrival.contains(document.activeElement))
        document.querySelector(".logo-slot")?.focus({ preventScroll: true });
      setTimeout(
        () => {
          destroy?.();
          arrival.remove();
        },
        immediate ? 0 : 480,
      );
    };
    arrival
      .querySelector(".arrival-skip")
      .addEventListener("click", () => finish(), { signal: events.signal });
    arrival.addEventListener(
      "animationend",
      (event) => {
        if (event.target === arrival && event.animationName === "arrival-open")
          finish();
      },
      { signal: events.signal },
    );
    document.addEventListener("keydown", () => finish(true), {
      signal: events.signal,
    });
    window.addEventListener("scroll", () => finish(true), {
      signal: events.signal,
      once: true,
    });
    reduced.addEventListener(
      "change",
      () => {
        if (reduced.matches) finish(true);
      },
      { signal: events.signal },
    );
    import("./crystal-intro.js")
      .then(({ mountCrystalIntro }) => {
        if (!closing) {
          destroy = mountCrystalIntro(arrival.querySelector("[data-crystal]"));
          arrival.classList.add("arrival-running");
          clearTimeout(timer);
          // Backup only: the CSS intro animation normally ends this sequence.
          timer = setTimeout(() => finish(), 3000);
        }
      })
      .catch(() => {});
    // Fixed upper bound, even when WebGL or the renderer cannot load.
    timer = setTimeout(() => finish(), 2800);
  }
}
const jewelObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      jewelObserver.unobserve(entry.target);
      crystalModule ||= import("./crystal-3d.js");
      crystalModule
        .then(({ mountCrystal }) => mountCrystal(entry.target))
        .catch(() => {
          entry.target.querySelector("button").disabled = true;
        });
    }
  },
  { rootMargin: "150px" },
);
document
  .querySelectorAll("[data-crystal]:not(.arrival-jewel):not(.static-crystal)")
  .forEach((el) => jewelObserver.observe(el));

// Facets settle into place when a collection filter changes. No image lighting overlays.
document.addEventListener("collection:change", () => {
  if (reduced.matches) return;
  document
    .querySelectorAll(".product-grid .product-card:not([hidden])")
    .forEach((card, i) => {
      card.getAnimations().forEach((animation) => animation.cancel());
      card.animate(
        [
          { opacity: 0.45, scale: ".985" },
          { opacity: 1, scale: "1" },
        ],
        {
          duration: 350,
          delay: i * 35,
          easing: "cubic-bezier(.2,.7,.2,1)",
        },
      );
    });
});
// Tiny ornaments use CSS facets instead of allocating WebGL contexts.
const microCrystals = new Set();
let microFrame = 0;
function updateMicroCrystals() {
  if (microFrame || document.hidden) return;
  microFrame = requestAnimationFrame(() => {
    microFrame = 0;
    const turn = reduced.matches ? 0 : window.scrollY * .12;
    for (const stone of microCrystals) {
      stone.firstElementChild.style.transform = `rotateX(18deg) rotateY(${turn}deg) rotateZ(12deg)`;
    }
  });
}
const microObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.isIntersecting) microCrystals.add(entry.target);
    else microCrystals.delete(entry.target);
  }
  updateMicroCrystals();
});
document.querySelectorAll('.tiny-crystal, .crystal-rule i, .crystal-field i, .brand-ribbon i').forEach(stone => {
  stone.classList.add('micro-crystal');
  const shape = document.createElement('span');
  shape.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 3; i++) shape.append(document.createElement('b'));
  stone.append(shape);
  microObserver.observe(stone);
});
window.addEventListener('scroll', updateMicroCrystals, { passive: true });
reduced.addEventListener('change', updateMicroCrystals);
