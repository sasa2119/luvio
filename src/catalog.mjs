import { products } from '../product-catalog.js';
import { escape, photo, productCard, priceMarkup, status, addForm, button, arrow } from './components.mjs';
export { products, productCard };

export function shop() {
  return `<section class="catalog section-pad" aria-label="Shop products">
    <h1 class="sr-only">Shop LUVIO designs</h1>
    <nav class="collection-nav" aria-label="Order collection"><a href="/shop/" data-collection-filter="all" aria-current="true">All designs</a><a href="/shop/?collection=ready-to-order" data-collection-filter="ready-to-order">Ready to Order</a><a href="/custom-orders/">Custom Orders ${arrow}</a></nav>
    <nav class="category-nav" aria-label="Product categories"><a href="/shop/" data-filter="all" aria-current="true">All</a><a href="/shop/?category=t-shirts" data-filter="t-shirts">T-Shirts</a><a href="/shop/?category=hoodies" data-filter="hoodies">Hoodies</a><a href="/shop/?category=bracelets" data-filter="bracelets">Bracelets</a><a href="/shop/?category=original-artwork" data-filter="original-artwork">Artwork</a><a href="/shop/?category=tables" data-filter="tables">Tables</a></nav>
    <div class="catalog-status" aria-live="polite"><span id="collection-label">All designs</span><span id="piece-count">${products.length} products</span></div>
    <div class="product-grid">${products.map(productCard).join('')}</div>
    <div id="tables-empty" class="collection-empty" hidden><span class="eyebrow">Tables</span><h2>Custom<br /><em>crystal tables.</em></h2><p>Product photos are not available yet. Send us your table idea to discuss the design, size and price.</p>${button('Discuss a custom table', '/custom-orders/?type=Table#custom-form')}</div>
    <div class="custom-order-note"><span class="eyebrow">A design that is yours alone</span><p>Ready to Order pieces use our existing designs and are made after you order. For a new design, photo, logo, or personal idea, request a custom order. Custom work is quoted individually.</p><a class="text-link" href="/custom-orders/">Request a custom design ${arrow}</a></div>
  </section>`.replace(/[ \t]+$/gm, '');
}
export function productPage(p) {
  return `<section class="product-detail section-pad" data-product-detail="${p.id}">
    <a class="text-link back-link" href="/shop/?category=${p.category}">← ${escape(p.categoryName)}</a>
    <div class="product-detail-grid">
      <div class="product-gallery">
        <button class="gallery-main" type="button" aria-label="Enlarge ${escape(p.name)} photograph">${photo(p.images[0], '', true)}</button>
        ${p.images.length > 1 ? `<div class="gallery-thumbnails">${p.images.map((im, i) => `<button type="button" data-gallery-image="${im.name}" ${p.id === 'horse' ? `data-gallery-full="/images/${im.name}-1440.webp"` : ''} aria-label="Show ${p.id === 'horse' ? (i ? 'living room' : 'close product') : (i ? 'styled' : 'product')} photograph" aria-pressed="${!i}">${photo(im)}</button>`).join('')}</div>` : ''}
      </div>
      <div class="product-detail-copy">
        <span class="eyebrow">LUVIO / ${escape(p.categoryName)}</span>
        <h1>${escape(p.name)}</h1>
        ${priceMarkup(p, true)}${status}
        <div id="product-options">${addForm(p)}</div>
        <a class="text-link product-question" href="/contact/?piece=${p.id}">Ask about this product ${arrow}</a>
        <div class="product-details">
          <details><summary>Care &amp; details <span>+</span></summary><p>Contact us for the materials, measurements, and care instructions for this product.</p><a href="/contact/" class="text-link">Contact LUVIO ${arrow}</a></details>
          <details><summary>Shipping &amp; returns <span>+</span></summary><p>Ask us about delivery options, costs and return terms before placing your order.</p><a href="/shipping/" class="text-link">Shipping information ${arrow}</a></details>
        </div>
      </div>
    </div>
  </section>
  <dialog class="image-dialog" aria-label="${escape(p.name)} photograph"><button class="image-close" type="button" aria-label="Close enlarged photograph">×</button><div class="zoom-stage">${photo(p.images[0])}</div><p>Click the image to zoom. Press Escape to close.</p></dialog>`.replace(/[ \t]+$/gm, '');
}
