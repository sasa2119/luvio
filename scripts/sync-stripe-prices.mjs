import Stripe from 'stripe';
import { products, prices } from '../product-catalog.js';
import { stripeLineItems } from '../server/stripe-catalog.js';
import { stripeSecretKey } from '../server/stripe-key.js';

const key = stripeSecretKey();
const stripe = new Stripe(key, { apiVersion: '2026-03-25.dahlia' });
const lines = products.map((product) => ({ productId: product.id, product, unitPrice: product.price, quantity: 1 }));
const emerald = products.find((product) => product.id === 'emerald');
lines.push({ productId: emerald.id, product: emerald, unitPrice: prices.suppliedBracelet, quantity: 1 });
try {
  const items = await stripeLineItems(stripe, lines, process.env.SITE_URL || 'https://www.luvio.studio');
  console.log(`Stripe catalog ready: ${items.length} USD prices (${key.includes('_live_') ? 'live' : 'test'}).`);
  items.forEach((item, index) => console.log(`${lines[index].productId}: ${lines[index].unitPrice} cents → ${item.price}`));
} catch (error) {
  console.error('Stripe catalog setup failed:', error.type || error.name, error.code || '', error.param || '');
  process.exitCode = 1;
}
