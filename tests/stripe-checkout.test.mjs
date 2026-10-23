import test from 'node:test';
import assert from 'node:assert/strict';
import { GET, POST } from '../api/create-checkout-session.js';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('checkout exposes only public configuration and blocks unconfigured sessions', async () => {
  const savedPublic = process.env.STRIPE_PUBLISHABLE_KEY;
  const savedSecret = process.env.STRIPE_SECRET_KEY;
  try {
    delete process.env.STRIPE_PUBLISHABLE_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    assert.equal((await GET()).status, 503);
    assert.equal((await POST()).status, 503);

    process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_...';
    assert.equal((await GET()).status, 503);

    process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_local_contract_test';
    process.env.STRIPE_SECRET_KEY = 'sk_test_donotexpose';
    const config = await GET();
    assert.equal(config.status, 200);
    assert.equal(config.headers.get('Cache-Control'), 'no-store');
    assert.deepEqual(await config.json(), { publishableKey: 'pk_test_local_contract_test' });

    // A seemingly configured key must not bypass the sample Price ID guard.
    const response = await POST(new Request('https://www.luvio.studio/api/create-checkout-session', { method: 'POST', body: '{}' }));
    assert.equal(response.status, 400);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    const body = await response.text();
    assert.match(body, /Check your bag/);
    assert.doesNotMatch(body, /sk_test|client_secret|price_/);
  } finally {
    if (savedPublic === undefined) delete process.env.STRIPE_PUBLISHABLE_KEY;
    else process.env.STRIPE_PUBLISHABLE_KEY = savedPublic;
    if (savedSecret === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = savedSecret;
  }
});

test('client mounts the embedded form and passes its confirm event to Stripe actions', async () => {
  const importedSource = await readFile(new URL('../stripe-checkout.js', import.meta.url), 'utf8');
  const source = importedSource.replace(/^import .*;$/gm, '');
  const status = { textContent: '', setAttribute() {} };
  const calls = [];
  let confirm;
  const event = { source: 'test-form-event' };
  vm.runInNewContext(source, {
    STORAGE_KEY: 'luvio.cart.v1', deserializeCart: () => [{ productId: 'cherry', quantity: 1 }], serializeCart: JSON.stringify,
    cartTotals: () => ({ quantity: 1, subtotal: 11900 }), money: () => '$119 USD',
    URLSearchParams, location: { search: '', assign() {} }, crypto: { randomUUID: () => 'valid-test-attempt-123456' },
    sessionStorage: { getItem: () => null, setItem() {} }, localStorage: { getItem: () => null },
    document: { querySelector: (selector) => selector === '#checkout-status' ? status : {} },
    fetch: async (url, options) => {
      calls.push({ url, method: options?.method || 'GET' });
      return { ok: true, headers: { get: () => 'application/json; charset=utf-8' }, json: async () => options?.method === 'POST'
        ? { client_secret: 'cs_test_client_secret' } : { publishableKey: 'pk_test_public' } };
    },
    window: { Stripe: (key) => {
      assert.equal(key, 'pk_test_public');
      return { initCheckoutFormSdk: ({ clientSecret, appearance }) => {
        assert.equal(appearance.variables.colorPrimary, '#0570de');
        return {
          createForm: ({ layout }) => {
            assert.equal(layout, 'expanded');
            return { mount: (selector) => assert.equal(selector, '#checkout-form'), on: (name, handler) => {
              assert.equal(name, 'confirm'); confirm = handler;
            } };
          },
          loadActions: async () => {
            assert.equal(await clientSecret, 'cs_test_client_secret');
            return { type: 'success', actions: { confirm: async ({ formConfirmEvent }) => {
              assert.equal(formConfirmEvent, event);
              return { type: 'error', error: { message: 'Card declined for this test.' } };
            } } };
          },
        };
      } };
    } },
  });
  await new Promise(setImmediate);
  assert.equal(status.textContent, '');
  assert.deepEqual(calls.map((call) => call.method), ['GET', 'POST']);
  assert.ok(calls.every((call) => call.url === '/api/create-checkout-session'));
  assert.equal(typeof confirm, 'function');
  await confirm(event);
  assert.equal(status.textContent, 'Card declined for this test.');
});
