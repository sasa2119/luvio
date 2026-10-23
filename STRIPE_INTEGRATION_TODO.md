# LUVIO checkout

Stripe Checkout is connected to the shopping bag and deployed on `https://www.luvio.studio/checkout/`. It uses Stripe's embedded form; product IDs, quantities, and item notes are validated on the server, and all prices are resolved from the server's LUVIO catalog. No payment was submitted during setup.

## Live checkout configuration

- Stripe live keys are stored in the Vercel Production environment. The secret key is server-only.
- The production build creates or reuses seven USD one-time Prices in Stripe: Cherry $119, Hummingbird $119, Leopard $899, Horse $749, Emerald $119, Headphones $199, and Emerald $49.
- Emerald is $49 only when the order contains at least one additional item. It is $119 by itself.
- Checkout collects a US shipping address and charges $20 flat per order. Automatic tax is disabled.
- Customers can add sizing or fit notes in the bag; these are included in Stripe Checkout Session metadata along with each product, quantity, and unit price.
- The return page checks payment status through the server. It does not treat a browser redirect as proof of payment.

## Order handling

Paid orders are available in the Stripe Dashboard with their Checkout Session details and item metadata. LUVIO currently fulfills orders manually from that dashboard. Before automating fulfillment or customer receipts, add a signed Stripe webhook, durable order storage, and idempotent processing for successful and delayed payments. Do not fulfill an order based only on the browser return page.

The checkout flow has been exercised on the staged Vercel deployment: the bag opens the embedded form, the live Stripe form loads, and a Cherry order displays $139 including $20 shipping. A live Checkout Session was created to verify the server path; no card was entered and no charge was made.

## Local configuration

Copy `.env.example` to `.env` for local server testing. Use matching Stripe test keys for test mode; never place a secret key in browser code or commit it. Run `npm install`, `npm run build`, and `npm run dev`, then open `http://127.0.0.1:4173/`.

`vercel.json` builds the static pages and synchronizes the Stripe Price catalog during a Vercel deployment. The API function is in `api/create-checkout-session.js`; the checkout page and form client are sourced from `src/templates/checkout.html` and `stripe-checkout.js`.

## Reference

- [Stripe Checkout Sessions](https://docs.stripe.com/api/checkout/sessions)
- [Stripe embedded form](https://docs.stripe.com/checkout/embedded/quickstart)
- [Vercel Functions](https://vercel.com/docs/functions)
