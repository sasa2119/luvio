// Extends the prior project's seven-width layout QA for the commerce pages.
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = createRequire('C:/Users/sasha/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/runtime.cjs')('playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const page = await browser.newPage({ reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('response', (response) => { if (response.status() >= 400 && response.url().startsWith('http://127.0.0.1:4173')) errors.push(`${response.status()} ${response.url()}`); });
await fs.mkdir('qa/commerce', { recursive: true });
const sizes = [[320,740],[375,812],[430,932],[768,1024],[1024,900],[1440,1000],[1920,1080]];
const reports = [];
try {
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    const report = { width, height };
    for (const [name, route] of [['home','/'],['shop','/shop/'],['emerald','/shop/emerald/'],['cherry','/shop/cherry/'],['horse','/shop/horse/']]) {
      await page.goto('http://127.0.0.1:4173' + route);
      await page.evaluate(() => document.fonts.ready);
      await page.locator('main img').first().evaluate((img) => img.decode());
      const layout = await page.evaluate((name) => {
        const box = (selector) => {
          const r = document.querySelector(selector).getBoundingClientRect();
          return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) };
        };
        const result = { scrollWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth, logo: box('.logo-slot'), bag: box('[data-cart-open]') };
        if (name === 'home') {
          result.action = box('.hero-actions .button'); result.heroImage = box('.light-product-stage'); result.products = box('.home-product-grid');
          result.productCount = document.querySelectorAll('.home-product-grid .product-card').length;
        } else if (name === 'shop') result.products = box('.catalog .product-grid');
        else { result.image = box('.gallery-main'); result.title = box('.product-detail-copy h1'); result.action = box('.product-detail-copy .add-to-cart'); }
        return result;
      }, name);
      assert.ok(layout.scrollWidth <= width, `${name} overflows at ${width}: ${JSON.stringify(layout)}`);
      assert.ok(await page.locator('[data-cart-open]').isVisible());
      assert.ok(layout.logo.right <= layout.bag.left || layout.bag.right <= layout.logo.left, `Logo overlaps bag at ${width}`);
      if (name === 'home') {
        assert.equal(await page.locator('.hero h1').innerText().then((text) => text.replace(/\s+/g,' ')), 'Crystal creations, made by hand.');
        assert.ok(layout.action.bottom <= height, `Shop CTA below opening viewport at ${width}: ${JSON.stringify(layout)}`);
        assert.equal(layout.productCount, 5);
        assert.equal(await page.locator('.hero-actions .button').first().getAttribute('href'), '/shop/');
      } else if (name === 'shop') {
        assert.equal(await page.locator('.catalog .product-card').count(), 6);
        assert.ok(layout.products.top < height * .7, `Shop grid too low at ${width}`);
      } else {
        assert.ok(layout.action.bottom < height * 1.85, `Product ordering requires too much scrolling at ${width}: ${JSON.stringify(layout)}`);
        assert.ok(layout.image.top < layout.title.top || width > 650);
        assert.equal(await page.locator('.product-detail .made-to-order').innerText(), 'MADE TO ORDER');
      }
      await page.screenshot({ path: `qa/commerce/${name}-${width}.png` });
      report[name] = layout;
    }
    // The drawer must fit independently of the document width at every breakpoint.
    await page.locator('.product-detail [data-cart-add] button').click();
    await page.locator('#shopping-bag').waitFor({ state: 'visible' });
    const drawer = await page.locator('#shopping-bag').evaluate((e) => ({ width: e.getBoundingClientRect().width, contentWidth: e.scrollWidth, clientWidth: e.clientWidth, left: e.getBoundingClientRect().left, right: e.getBoundingClientRect().right }));
    assert.ok(drawer.width <= width && drawer.contentWidth <= drawer.clientWidth, `Cart overflows at ${width}: ${JSON.stringify(drawer)}`);
    await page.screenshot({ path: `qa/commerce/bag-${width}.png` });
    await page.keyboard.press('Escape');
    report.drawer = drawer;
    reports.push(report);
  }
  assert.deepEqual(errors, []);
  await fs.writeFile('qa/commerce/layout-report.json', JSON.stringify(reports, null, 2));
  console.log('PASS: home, shop, Cherry, Emerald, Horse, and cart at 320, 375, 430, 768, 1024, 1440, 1920px; no horizontal overflow or browser errors.');
} finally { await browser.close(); }
