import fs from 'node:fs';
import { money, productUrl, prices } from '../product-catalog.js';

export const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export const arrow = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" stroke-width="1.3"/></svg>';
export const button = (label, href, outline = false) => `<a class="button ${outline ? 'button-outline' : ''}" href="${escape(href)}"><span>${escape(label)}</span>${arrow}</a>`;
export const template = (name) => fs.readFileSync(new URL(`./templates/${name}.html`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
export function photo(image, cls = '', eager = false) {
  return `<img class="${escape(cls)}" src="/images/${image.name}-960.webp" srcset="/images/${image.name}-480.webp 480w, /images/${image.name}-960.webp 960w" sizes="(max-width: 650px) 100vw, 50vw" alt="${escape(image.alt)}" width="${image.width}" height="${image.height}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`;
}
export const status = '<span class="made-to-order">Made to order</span>';
export const priceMarkup = (p, detail = false) => `<p class="product-price" ${detail ? 'data-product-price' : ''}>${money(p.price)}${p.id === 'emerald' ? `<small>${money(prices.suppliedBracelet)} when you order at least one other item</small>` : p.variants && !detail ? `<small>or ${money(p.variants.find((v) => v.id === 'customer-base').price)} when you order at least one other item</small>` : ''}</p>`;
export function addForm(p, compact = false) {
  if (compact && p.variants) return `<a class="card-add" href="${productUrl(p)}#product-options">Choose options ${arrow}</a>`;
  return `<form class="add-to-cart-form ${compact ? 'card-add-form' : ''}" data-cart-add data-product="${p.id}" action="/contact/" method="get">
    <input type="hidden" name="piece" value="${p.id}" />
    ${!compact && p.variants ? `<div class="field"><label for="base-${p.id}">Order option</label><select id="base-${p.id}" name="variant" required>${p.variants.map((v) => `<option value="${v.id}">${escape(v.name)} — ${money(v.price)}</option>`).join('')}</select><p class="option-help">${money(p.variants[0].price)} when ordered alone. ${money(p.variants[1].price)} when you also order at least one other item of any kind.</p></div>` : ''}
    ${!compact && p.noteLabel ? `<div class="field"><label for="note-${p.id}">${escape(p.noteLabel)}</label><input id="note-${p.id}" name="notes" maxlength="150" autocomplete="off" /></div>` : ''}
    ${!compact ? `<div class="purchase-row"><div class="field quantity-field"><label for="quantity-${p.id}">Quantity</label><input id="quantity-${p.id}" name="quantity" type="number" value="1" min="1" max="99" step="1" required inputmode="numeric" /></div>` : '<input type="hidden" name="quantity" value="1" />'}
    <button class="${compact ? 'card-add' : 'button add-to-cart'}" type="submit"><span>Add to Cart</span>${compact ? '<span aria-hidden="true">+</span>' : arrow}</button>${!compact ? '</div>' : ''}
    <p class="cart-form-error" role="alert" hidden></p>
    <noscript><p>JavaScript is needed for the shopping bag. <a href="/contact/?piece=${p.id}">Send a product inquiry</a>.</p></noscript>
  </form>`.replace(/[ \t]+$/gm, '');
}
export function productCard(p) {
  return `<article class="product-card" data-product="${p.id}" data-category="${p.category}" data-collection="${p.collection}">
    <a class="product-photo" href="${productUrl(p)}">${photo(p.images[0])}${p.images[1] ? photo(p.images[1], 'product-alternate') : ''}<span class="product-view">View product ${arrow}</span></a>
    <div class="product-info"><div><h2><a href="${productUrl(p)}">${escape(p.name)}</a></h2>${priceMarkup(p)}${status}</div></div>
    ${addForm(p, true)}
  </article>`;
}
export function header(path) {
  const active = path.startsWith('/shop/') ? '/shop/' : path;
  return template('header').replace(/<a\b([^>]*?)>/g, (tag, attrs) => {
    const href = attrs.match(/href="([^"]+)"/)?.[1];
    return href === active && !attrs.includes('logo-slot') ? `<a aria-current="page"${attrs}>` : tag;
  }).replace('      <button\n        class="menu-toggle"', `      <button class="cart-toggle" type="button" data-cart-open aria-label="Open shopping bag" aria-haspopup="dialog" aria-controls="shopping-bag"><svg viewBox="0 0 24 26" fill="none" aria-hidden="true"><path d="M4 8h16l1 16H3L4 8Z M8 9V6a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="1.3"/></svg><span class="cart-count" data-cart-count hidden>0</span></button>\n      <button\n        class="menu-toggle"`);
}
export const footer = () => template('footer').replace('<h3>Shop</h3>', '<h3>Shop</h3><a href="/shop/?collection=ready-to-order">Ready to Order</a>');
export const cartDrawer = () => `<dialog id="shopping-bag" class="cart-drawer" aria-labelledby="bag-title">
  <div class="bag-heading"><div><span class="eyebrow">LUVIO</span><h2 id="bag-title">Your bag</h2></div><button class="bag-close" type="button" data-cart-close aria-label="Close shopping bag"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></button></div>
  <div class="bag-empty" data-cart-empty>${button('Explore all designs', '/shop/?collection=ready-to-order')}</div>
  <ul class="bag-items" data-cart-items aria-label="Products in your bag"></ul>
  <div class="bag-summary" data-cart-summary hidden><div class="bag-subtotal"><span>Subtotal</span><strong data-cart-subtotal></strong></div><p>Every piece is made by hand after you order. Shipping is shown at checkout. Include your size or watch details with your selection.</p><a class="button bag-inquiry" href="/checkout/" data-checkout-open><span>Checkout</span>${arrow}</a><a class="text-link" href="/contact/?order=cart#order-inquiry" data-order-inquiry>Ask about your order ${arrow}</a><a class="text-link" href="/shop/?collection=ready-to-order">Continue browsing ${arrow}</a></div>
  <p class="bag-error" data-cart-error role="alert" hidden></p>
</dialog><p class="sr-only" role="status" aria-live="polite" data-cart-status></p>`;
