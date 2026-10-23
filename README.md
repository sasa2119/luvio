# LUVIO

For the live Stripe checkout setup and order handling notes, see [STRIPE_INTEGRATION_TODO.md](STRIPE_INTEGRATION_TODO.md).

This checkout is the current static website. Its recently edited hero, slimmer header, typography, colors, animations, WebGL modules, product galleries, and existing forms are retained.

The source layer here uses the existing small ESM/static-page approach and preserves this checkout's current content.

## Develop and build

Use Node.js 22 or later:

```sh
npm install
npm run build
npm run dev
```

The preview runs at `http://127.0.0.1:4173`. The build updates the existing root HTML files, which remain the deployable static site; it does not output to `dist/` or overwrite the CSS/WebGL assets. Edit `src/` rather than generated HTML.

## Source map

- `product-catalog.js`: the single product/pricing catalog, USD integer cents, image metadata, Ready to Order membership, and bracelet base-item choices.
- `src/components.mjs`: shared header, bag button/drawer, product cards, prices, ordering forms, footer, and image markup.
- `src/catalog.mjs`: shop filters and product detail/gallery templates, including Horse.
- `src/home.mjs`: updated hero copy/CTAs, discovery content, featured prices, and Horse.
- `src/pages.mjs` / `src/document.mjs`: route generation and shared document shell.
- `src/templates/`: retained page bodies and shared brand content captured from this checkout. Editorial/support/custom-order/contact content is preserved.
- `cart-state.js`: validated cart selections, merge rules, quantities, normalization, serialization, and integer-cent totals. Stored items contain IDs, choices, notes, and quantity—not prices.
- `cart.js`: bag controls, localStorage persistence, cross-tab updates, keyboard/focus behavior, live selected prices, and contact-form inquiry prefill.
- `checkout.js`: order-inquiry formatting and the existing inquiry flow.
- `api/create-checkout-session.js` and `stripe-checkout.js`: server-created Stripe Sessions and the embedded checkout form.
- `shopping.css`: small commerce and responsive extensions to the existing design. The mobile hero places the new copy and CTAs over the reserved blank video area so the first screen explains what LUVIO sells. Desktop keeps the photos / copy / blank video layout.
- `images/horse*.webp`: optimized derivatives of the two supplied Horse images. Originals are preserved. The closer photograph is the primary shop image; both are in the gallery, with larger versions for zoom.

All existing designs, including Leopard and Horse, belong to **Ready to Order** and are labeled **Made to Order**. This collection is independent of product-type filters. Tables and fully custom designs retain the custom inquiry process and receive no catalog price.

There were no confirmed size variants in the existing catalog, so no size inventory was invented. Customers may add a size/fit note; actual sizing is confirmed with their inquiry. Bracelet options distinguish LUVIO-supplied and customer-supplied base items and remain separate cart lines.

## Ordering flow

Add products to the bag, choose options where relevant, adjust quantities, and select **Send order inquiry**. The existing contact form is prefilled with each product, selection, quantity, unit price, line total, and product subtotal. Customers review it and provide their name and email before submitting through the existing FormSubmit configuration. No inquiry is submitted automatically. The bag is retained after sending an inquiry because sending a question does not complete a purchase.

Checkout is available from the bag. Stripe collects the shipping address and charges a flat $20 for US orders. Automatic tax is disabled. Emerald costs $119 by itself and $49 when any other item is in the order. The separate inquiry flow remains available. Paid orders are fulfilled manually from the Stripe Dashboard until webhook and order-storage automation is added.

## Checks

```sh
npm run check
npm test
python scripts/verify.py
# With the preview server running:
npm run qa:layout
npm run qa:behavior
```

The QA scripts extend the previous project's browser checks and use its existing locally bundled Playwright runtime and Edge, with no production dependency added. `scripts/verify.py` is adapted from the previous static verification script for the current root output and cart forms.

Validated widths: 320, 375, 430, 768, 1024, 1440, and 1920 px. Layout checks cover home, shop, Cherry, Emerald, Horse, and the bag. Behavior checks cover filters/history, all products, bracelet prices/options, quantity changes, totals, refresh/cross-tab persistence, removal, focus/Escape, inquiry handoff, galleries, and existing custom upload validation. No external forms or payments are submitted during QA. Screenshots and layout reports are written to ignored `qa/commerce/`.
