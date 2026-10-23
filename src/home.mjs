import { products, getProduct, money } from '../product-catalog.js';
import { template, productCard, button } from './components.mjs';

export function home() {
  let html = template('home').replace('href="#hero-details"', 'href="#explore"');
  html = html.replace('<h1><span>Crystal designs</span><em>for everyday wear.</em></h1>', '<h1><span>Crystal creations,</span><em>made by hand.</em></h1>');
  html = html.replace('T-shirts, hoodies, bracelets and artwork. Browse our designs or request your own.', 'LUVIO creates crystal-decorated clothing, accessories, and artwork, with every piece finished by hand. Shop our existing designs or bring your own vision to life with a custom order.');
  html = html.replace('<span>Shop products</span>', '<span>SHOP</span>');
  html = html.replace(/<div class="hero-actions">[\s\S]*?<\/div>/, `<div class="hero-actions">${button('SHOP', '/shop/')}${button('CUSTOM ORDER', '/custom-orders/')}</div>`);
  html = html.replace(/<article class="product-card"[\s\S]*?<\/article>/g, (card) => {
    const id = card.match(/href="\/shop\/([^/]+)\//)?.[1];
    return getProduct(id) ? productCard(getProduct(id)) : card;
  });
  // Keep all four existing featured designs, then introduce Horse alongside them.
  const lastCard = productCard(getProduct('leopard'));
  html = html.replace(lastCard, `${lastCard}${productCard(getProduct('horse'))}`);
  const headphonesCard = productCard(getProduct('headphones'));
  const emeraldCard = productCard(getProduct('emerald'));
  html = html.replace(emeraldCard, '');
  html = html.replace(headphonesCard, '');
  html = html.replace(productCard(getProduct('horse')), `${productCard(getProduct('horse'))}${emeraldCard}${headphonesCard}`);
  html = html.replace('<span class="eyebrow">Our products</span>', '<span class="eyebrow">Ready to Order</span>');
  html = html.replace('<span>View all products</span>', '<span>Explore Ready to Order</span>');
  html = html.replace(/(class="section-heading"[\s\S]*?href=")\/shop\/("[\s\S]*?Explore Ready to Order)/, '$1/shop/?collection=ready-to-order$2');
  html = html.replace('</h2></div>\n        <div>', '</h2></div>\n        <div>');
  html = html.replace('Choose Cherry on black or Hummingbird on white. Each design is made with crystals placed by hand. Ask us about sizes and availability.', `Choose Cherry on black or Hummingbird on white. Each design is made with crystals placed by hand. ${money(getProduct('cherry').price)} each. Made after you order; sizing is confirmed with your inquiry.`);
  html = html.replace('A framed leopard portrait on a dark background. Contact us for dimensions, pricing and availability.', `A framed leopard portrait on a dark background. ${money(getProduct('leopard').price)}. Made to order. Contact us for dimensions.`);
  return html;
}
