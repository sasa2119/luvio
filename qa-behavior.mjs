// Preserves the previous menu/gallery/upload QA and adds full cart/inquiry coverage.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { products } from './product-catalog.js';
const { chromium } = createRequire('C:/Users/sasha/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/runtime.cjs')('playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const context = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce', isMobile: true, hasTouch: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const goto = (route) => page.goto('http://127.0.0.1:4173' + route);
const closeBag = () => page.keyboard.press('Escape');
try {
  await goto('/');
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  assert.ok(await page.locator('#mobile-menu').evaluate((e) => e.open));
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#mobile-menu').evaluate((e) => e.open), false);
  await page.getByRole('button', { name: 'Show Hummingbird', exact: true }).click();
  assert.equal(await page.locator('.light-product-frame.is-active a').getAttribute('href'), '/shop/hummingbird/');
  assert.ok(await page.locator('.light-product-frame').first().evaluate((e) => e.inert));
  await goto('/shop/');
  await page.locator('[data-collection-filter="ready-to-order"]').click();
  assert.equal(await page.locator('.catalog .product-card:visible').count(), 6);
  await page.locator('[data-filter="original-artwork"]').click();
  assert.equal(await page.locator('.catalog .product-card:visible').count(), 2);
  assert.ok(page.url().includes('collection=ready-to-order'));
  await page.goBack();
  assert.equal(await page.locator('.catalog .product-card:visible').count(), 6);
  await page.locator('[data-filter="bracelets"]').click();
  assert.equal(await page.locator('.catalog .product-card:visible').count(), 1);
  await page.locator('.product-card:visible .product-photo').click();
  assert.ok(page.url().includes('/shop/emerald/'));
  await page.locator('.product-question').click();
  assert.match(await page.locator('#message').inputValue(), /Emerald/);

  // All detail-page Add to Cart buttons, including the real Horse product, work.
  for (const p of products) {
    await goto(`/shop/${p.id}/`);
    await page.locator('.product-detail [data-cart-add] button').click();
    assert.ok(await page.locator('#shopping-bag').evaluate((e) => e.open));
    assert.ok(await page.locator('.bag-item-title').allTextContents().then((names) => names.includes(p.name)));
    await closeBag();
  }
  await goto('/shop/emerald/');
  await page.getByLabel('Base item', { exact: true }).selectOption('customer-base');
  assert.equal(await page.locator('[data-product-price]').textContent(), '$49 USD');
  await page.getByLabel('Watch / wrist details (optional)', { exact: true }).fill('Confirm wrist fit');
  await page.locator('.product-detail [data-cart-add] button').click();
  assert.equal(await page.locator('.bag-item').count(), 7);
  assert.equal(await page.locator('[data-cart-subtotal]').textContent(), '$2,253 USD');
  await page.getByRole('button', { name: 'Increase quantity for Cherry', exact: true }).click();
  assert.equal(await page.locator('[data-cart-subtotal]').textContent(), '$2,372 USD');
  await page.getByRole('button', { name: 'Decrease quantity for Cherry', exact: true }).click();
  await closeBag();
  await page.reload();
  await page.locator('[data-cart-open]').click();
  assert.equal(await page.locator('.bag-item').count(), 7);
  assert.equal(await page.locator('[data-cart-subtotal]').textContent(), '$2,253 USD');
  await page.keyboard.press('Tab');
  assert.ok(await page.locator('#shopping-bag').evaluate((e) => e.contains(document.activeElement)));
  await page.getByRole('link', { name: 'Send order inquiry', exact: true }).click();
  const inquiry = await page.locator('#message').inputValue();
  assert.match(inquiry, /I supply my own base item/);
  assert.match(inquiry, /LUVIO supplies the base item/);
  assert.match(inquiry, /Confirm wrist fit/);
  assert.match(inquiry, /Product subtotal: \$2,253 USD/);
  assert.match(inquiry, /not a completed purchase/);
  assert.match(inquiry, /No payment has been made/);
  assert.equal(await page.locator('#order-inquiry').getAttribute('method'), 'POST');
  assert.equal(await page.locator('#order-inquiry').getAttribute('action'), 'https://formsubmit.co/hello.luvio8@gmail.com');
  assert.equal(await page.locator('#order-inquiry').evaluate((e) => e.checkValidity()), false);
  // Do not submit an actual inquiry as part of QA.
  await page.locator('[data-cart-open]').click();
  await page.getByRole('button', { name: 'Remove Emerald, I supply my own base item from bag', exact: true }).click();
  assert.equal(await page.locator('[data-cart-subtotal]').textContent(), '$2,204 USD');
  await closeBag();
  assert.ok(await page.locator('[data-cart-open]').evaluate((e) => document.activeElement === e));

  // A new tab receives the same persisted bag. Storage events update an open one.
  const other = await context.newPage();
  await other.goto('http://127.0.0.1:4173/shop/cherry/');
  await other.locator('.product-detail [data-cart-add] button').click();
  await page.locator('[data-cart-open]').click();
  assert.equal(await page.locator('[data-cart-subtotal]').textContent(), '$2,323 USD');
  await closeBag();
  await other.close();

  await goto('/shop/cherry/');
  await page.locator('[data-gallery-image="cherry-model"]').click();
  assert.match(await page.locator('.gallery-main img').getAttribute('src'), /cherry-model/);
  await page.locator('.gallery-main').click();
  assert.ok(await page.locator('.image-dialog').evaluate((e) => e.open));
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.image-dialog').evaluate((e) => e.open), false);
  await goto('/shop/horse/');
  assert.equal(await page.locator('[data-gallery-image]').count(), 2);
  await page.locator('[data-gallery-image="horse-room"]').click();
  assert.match(await page.locator('.gallery-main img').getAttribute('src'), /horse-room/);
  await page.locator('.gallery-main').click();
  assert.match(await page.locator('.image-dialog img').getAttribute('src'), /horse-room-1440/);
  await page.keyboard.press('Escape');

  await goto('/custom-orders/');
  await page.locator('#inspiration').setInputFiles({ name: 'reference.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64') });
  assert.equal(await page.locator('#attachment-fields input[name="attachment"]').count(), 1);
  await page.getByRole('button', { name: 'Remove reference.png', exact: true }).click();
  assert.equal(await page.locator('#attachment-fields input').count(), 0);
  await page.locator('#inspiration').setInputFiles({ name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from('bad') });
  assert.ok(await page.locator('#upload-error').textContent());
  assert.equal(await page.locator('#custom-order-form').evaluate((e) => e.checkValidity()), false);
  assert.deepEqual(errors, []);
  console.log('PASS: menu/Escape, slideshow focus, independent collection/category filters/history, all six products, bracelet options/prices, quantity/subtotal, reload/cross-tab persistence, removal, keyboard focus, cart-to-contact inquiry, both galleries, custom uploads and validation. No forms submitted.');
} finally { await browser.close(); }
