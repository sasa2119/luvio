import { escape, template, header, footer, cartDrawer } from './components.mjs';
export function document(page) {
  return `<!doctype html><html lang="en"><head>
    <meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="theme-color" content="#d6c5ae" />
    <meta name="description" content="${escape(page.description)}" /><title>${escape(page.title)}</title>
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" /><link rel="preload" href="/fonts/facets-1.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="stylesheet" href="/site-styles.css?v=20261022-commerce" />
${page.path === '/' ? '<link rel="stylesheet" href="/home-design.css?v=20261022-commerce" /><script src="/home-design.js?v=20261022-commerce" type="module"></script>' : ''}
${page.path === '/the-atelier/' ? '<link rel="stylesheet" href="/atelier-page.css?v=20261015" />' : ''}
    <link rel="stylesheet" href="/shopping.css?v=20261022-commerce" />
${page.path === '/checkout/' ? '<script src="https://js.stripe.com/dahlia/stripe.js"></script><script src="/stripe-checkout.js" type="module"></script>' : ''}
    <script src="/facet-text.js" type="module"></script><script src="/site.js?v=20261022-commerce" type="module"></script><script src="/cart.js?v=20261022-commerce" type="module"></script><script src="/motion.js?v=20261015-scroll" type="module"></script>
  </head><body>${page.path === '/' ? template('arrival') : ''}${header(page.path)}<main id="main">${page.render()}</main>${footer()}${cartDrawer()}</body></html>`;
}
