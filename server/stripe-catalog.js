import { cartTotals, normalizeCart, MAX_LINES } from '../cart-state.js';

export function checkoutLines(raw) {
  if (!Array.isArray(raw) || !raw.length || raw.length > MAX_LINES ||
      raw.some((item) => normalizeCart([item]).length !== 1)) {
    throw new Error('Check your bag items and quantities.');
  }
  // Resolve every amount from the server's catalog, including Emerald eligibility.
  return cartTotals(normalizeCart(raw)).lines;
}

export const priceKey = (line) => `luvio_${line.productId}_${line.unitPrice}_usd_v1`;

export async function stripeLineItems(stripe, lines, origin) {
  const unique = [...new Map(lines.map((line) => [priceKey(line), line])).values()];
  const existing = await stripe.prices.list({ active: true, lookup_keys: unique.map(priceKey), limit: 100 });
  const prices = new Map(existing.data.map((price) => [price.lookup_key, price]));
  let products;
  for (const line of unique) {
    const lookupKey = priceKey(line);
    let price = prices.get(lookupKey);
    if (!price) {
      products ||= (await stripe.products.list({ active: true, limit: 100 })).data;
      let product = products.find((entry) => entry.metadata?.luvio_product_id === line.productId);
      if (!product) {
        product = await stripe.products.create({
          name: line.product.name,
          images: [`${origin}/images/${line.product.images[0].name}-960.webp`],
          metadata: { luvio_product_id: line.productId },
        }, { idempotencyKey: `luvio_product_${line.productId}_v1` });
        products.push(product);
      }
      price = await stripe.prices.create({
        product: product.id, currency: 'usd', unit_amount: line.unitPrice, lookup_key: lookupKey,
        metadata: { luvio_product_id: line.productId },
      }, { idempotencyKey: lookupKey });
      prices.set(lookupKey, price);
    }
    if (price.currency !== 'usd' || price.unit_amount !== line.unitPrice || price.type !== 'one_time') {
      throw new Error('Stripe product pricing needs attention.');
    }
  }
  return lines.map((line) => ({ price: prices.get(priceKey(line)).id, quantity: line.quantity }));
}
