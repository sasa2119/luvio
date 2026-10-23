import test from 'node:test';
import assert from 'node:assert/strict';
import { products, getProduct, unitPrice, money } from '../product-catalog.js';
import { addItem, normalizeCart, cartTotals, serializeCart, deserializeCart, setQuantity, removeItem, itemKey, MAX_LINES } from '../cart-state.js';
import { orderInquiry, checkoutMode } from '../checkout.js';
const selection = (productId, variantId = '', quantity = 1, notes = '') => ({ productId, variantId, quantity, notes });

test('all six products have the requested USD prices and made-to-order collection', () => {
  assert.deepEqual(Object.fromEntries(products.map((p) => [p.id, p.price])), { cherry: 11900, hummingbird: 11900, headphones: 19900, leopard: 89900, emerald: 11900, horse: 74900 });
  assert.equal(unitPrice(getProduct('emerald')), 11900);
  assert.equal(cartTotals([selection('emerald'), selection('cherry')]).lines[0].unitPrice, 4900);
  assert.equal(money(74900), '$749 USD');
  assert.ok(products.every((p) => p.madeToOrder && p.collection === 'ready-to-order'));
});
test('same selections merge and distinct sizing notes remain separate', () => {
  let cart = addItem([], selection('emerald', 'customer-base', 2));
  cart = addItem(cart, selection('emerald', '', 1, 'Different wrist'));
  cart = addItem(cart, selection('emerald', 'customer-base'));
  cart = addItem(cart, selection('cherry', '', 1, '  Fit   to confirm  '));
  cart = addItem(cart, selection('cherry', '', 1, 'Fit to confirm'));
  assert.equal(cart.length, 3);
  assert.equal(cart[0].quantity, 3);
  assert.equal(cart[2].quantity, 2);
  assert.equal(cartTotals(cart).subtotal, 4 * 4900 + 2 * 11900);
});
test('mixed totals and quantities use integer cents and recalculate after removal', () => {
  let cart = addItem([], selection('horse', '', 2));
  cart = addItem(cart, selection('headphones', '', 3));
  cart = addItem(cart, selection('emerald', 'customer-base', 2));
  assert.equal(cartTotals(cart).subtotal, 219300);
  cart = setQuantity(cart, itemKey(cart[0]), 1);
  assert.equal(cartTotals(cart).subtotal, 144400);
  cart = removeItem(cart, itemKey(cart[1]));
  assert.equal(cartTotals(cart).subtotal, 84700);
  assert.equal(cartTotals(cart).quantity, 3);
});
test('storage round trips selections and refuses tampered prices, products, and variants', () => {
  const saved = JSON.stringify({ version: 1, items: [
    { ...selection('cherry'), price: 1, unitPrice: 1, name: '<script>bad</script>' },
    selection('unknown'), selection('emerald', 'free'), selection('horse', '', -1),
    selection('cherry', '', 1.5), selection('headphones', '', 100),
  ] });
  const cart = deserializeCart(saved);
  assert.equal(cart.length, 1);
  assert.equal(cartTotals(cart).subtotal, 11900);
  assert.equal('price' in cart[0], false);
  assert.deepEqual(deserializeCart(serializeCart(cart)), cart);
  assert.deepEqual(deserializeCart('broken json'), []);
  assert.deepEqual(deserializeCart('{"version":2,"items":[]}'), []);
});
test('invalid quantity/option changes fail without mutating the bag', () => {
  const cart = addItem([], selection('cherry', '', 99));
  assert.throws(() => addItem(cart, selection('cherry')));
  assert.throws(() => setQuantity(cart, itemKey(cart[0]), 0));
  assert.throws(() => setQuantity(cart, itemKey(cart[0]), 2.5));
  assert.throws(() => addItem(cart, selection('emerald', 'invalid')));
  assert.throws(() => addItem(cart, selection('cherry', 'customer-base')));
  assert.equal(cart[0].quantity, 99);
  assert.equal(normalizeCart([...cart, ...cart])[0].quantity, 99);
});
test('inquiry preserves every option and clearly does not complete a purchase', () => {
  const cart = [selection('emerald', 'customer-base', 2, 'Fit to confirm'), selection('horse')];
  const text = orderInquiry(cart);
  assert.doesNotMatch(text, /I supply my own base item/);
  assert.match(text, /Fit to confirm/);
  assert.match(text, /Unit price: \$49 USD/);
  assert.match(text, /Product subtotal: \$847 USD/);
  assert.match(text, /not a completed purchase/);
  assert.match(text, /No payment has been made/);
  assert.equal(checkoutMode, 'order-inquiry');
  assert.equal(orderInquiry([]), '');
  const maximum = Array.from({ length: MAX_LINES }, (_, i) => selection('emerald', 'customer-base', 99, `${i} ${'x'.repeat(146)}`));
  assert.ok(orderInquiry(maximum).length < 10000, 'The contact form must preserve the complete maximum-size inquiry.');
});
