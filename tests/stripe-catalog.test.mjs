import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutLines, stripeLineItems } from '../server/stripe-catalog.js';
import { POST } from '../api/create-checkout-session.js';

const bracelet = { productId: 'emerald', quantity: 1 };
const shirt = { productId: 'cherry', quantity: 1 };
test('server ignores submitted prices, applies bracelet eligibility, and rejects invalid bags', () => {
  assert.equal(checkoutLines([{ ...bracelet, price: 1 }])[0].unitPrice, 11900);
  assert.equal(checkoutLines([bracelet, { ...shirt, price: 0 }])[0].unitPrice, 4900);
  assert.equal(checkoutLines([{ ...bracelet, quantity: 2 }])[0].unitPrice, 4900);
  for (const invalid of [[], [{ productId: 'free', quantity: 1 }], [{ ...shirt, quantity: -1 }], [{ ...shirt, quantity: 1.5 }], [shirt, {}]]) {
    assert.throws(() => checkoutLines(invalid));
  }
});

test('Stripe prices are persistent, reused, and checked against the trusted catalog', async () => {
  const savedPrices = [], savedProducts = [];
  const stripe = {
    prices: {
      list: async ({ lookup_keys }) => ({ data: savedPrices.filter((price) => lookup_keys.includes(price.lookup_key)) }),
      create: async (params) => { const price = { ...params, id: `price_${savedPrices.length}`, type: 'one_time' }; savedPrices.push(price); return price; },
    },
    products: {
      list: async () => ({ data: [...savedProducts] }),
      create: async (params) => { const product = { ...params, id: `prod_${savedProducts.length}` }; savedProducts.push(product); return product; },
    },
  };
  const origin = 'https://www.luvio.studio';
  const lines = checkoutLines([bracelet, shirt]);
  const first = await stripeLineItems(stripe, lines, origin);
  assert.deepEqual(await stripeLineItems(stripe, lines, origin), first);
  assert.equal(savedProducts.length, 2);
  assert.equal(savedPrices.length, 2);
  assert.deepEqual(savedPrices.map((price) => price.unit_amount), [4900, 11900]);
  await stripeLineItems(stripe, checkoutLines([bracelet]), origin);
  assert.equal(savedProducts.length, 2);
  assert.equal(savedPrices.length, 3);
  savedPrices[0].unit_amount = 1;
  await assert.rejects(() => stripeLineItems(stripe, lines, origin), /pricing needs attention/);
});

test('session creation fails closed when shipping has not been configured', async () => {
  const saved = { key: process.env.STRIPE_SECRET_KEY, countries: process.env.SHIPPING_COUNTRIES, rate: process.env.SHIPPING_FLAT_RATE_CENTS };
  process.env.STRIPE_SECRET_KEY = 'sk_test_contractonly';
  delete process.env.SHIPPING_COUNTRIES;
  delete process.env.SHIPPING_FLAT_RATE_CENTS;
  try {
    const response = await POST(new Request('https://www.luvio.studio/api/create-checkout-session', {
      method: 'POST', body: JSON.stringify({ items: [shirt], attempt: 'valid-attempt-123456' }),
    }));
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /Shipping is being configured/);
  } finally {
    for (const [name, value] of [['STRIPE_SECRET_KEY', saved.key], ['SHIPPING_COUNTRIES', saved.countries], ['SHIPPING_FLAT_RATE_CENTS', saved.rate]]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});
