// Each word opens like a cut facet, once. Text remains readable without JavaScript.
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
if (!reduced.matches) {
  const pending = new Set();
  const introExists = Boolean(document.querySelector(".arrival"));
  let introComplete =
    !introExists || document.documentElement.dataset.introComplete === "true";
  const isHome = Boolean(document.querySelector('.hero'));
  const headings = [
    ...document.querySelectorAll("main h1, main h2, .newsletter h2"),
  ].filter((heading) => !(isHome && heading.matches('.hero h1')));
  for (const heading of headings) {
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let index = 0;
    for (const node of nodes) {
      const fragment = document.createDocumentFragment();
      for (const part of node.textContent.split(/(\s+)/)) {
        if (!part.trim()) fragment.append(document.createTextNode(part));
        else {
          const word = document.createElement("span");
          word.className = "facet-word";
          word.style.setProperty("--facet-order", Math.min(index++, 7));
          word.textContent = part;
          fragment.append(word);
        }
      }
      node.replaceWith(fragment);
    }
    heading.classList.add("text-faceted");
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const { target, isIntersecting } of entries) {
        if (!isIntersecting) continue;
        observer.unobserve(target);
        if (introComplete) target.classList.add("facet-play");
        else pending.add(target);
      }
    },
    { threshold: 0.2 },
  );
  headings.forEach((heading) => observer.observe(heading));
  document.addEventListener(
    "luvio:intro-end",
    () => {
      introComplete = true;
      pending.forEach((heading) => heading.classList.add("facet-play"));
      pending.clear();
    },
    { once: true },
  );
  reduced.addEventListener("change", () => {
    if (reduced.matches) {
      observer.disconnect();
      pending.clear();
      headings.forEach((heading) => heading.classList.remove("facet-play"));
    }
  });
}
