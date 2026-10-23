import Stripe from 'stripe';
import { checkoutLines, stripeLineItems } from '../server/stripe-catalog.js';
import { stripeSecretKey } from '../server/stripe-key.js';

const json = (body, status = 200) => Response.json(body, {
  status, headers: { 'Cache-Control': 'no-store' },
});

// Only the publishable key is sent to the browser. The secret key stays here.
export async function GET(request) {
  const sessionId = request ? new URL(request.url).searchParams.get('session_id') : null;
  if (sessionId) {
    if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId) || !process.env.STRIPE_SECRET_KEY) return json({ error: 'Invalid checkout reference.' }, 400);
    try {
      const stripe = new Stripe(stripeSecretKey(), { apiVersion: '2026-03-25.dahlia' });
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      return json({ status: session.status, payment_status: session.payment_status });
    } catch { return json({ error: 'Unable to check payment status.' }, 502); }
  }
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey?.startsWith('pk_') || publishableKey.includes('...')) {
    return json({ error: 'Checkout is not configured yet. Please contact LUVIO.' }, 503);
  }
  return json({ publishableKey });
}

export async function POST(request) {
  let secretKey;
  try { secretKey = stripeSecretKey(); } catch {
    return json({ error: 'Checkout is not configured yet. Please contact LUVIO.' }, 503);
  }
  let body, lines;
  try {
    body = await request.json();
    lines = checkoutLines(body.items);
    if (!/^[a-zA-Z0-9-]{16,64}$/.test(body.attempt || '')) throw new Error();
  } catch { return json({ error: 'Check your bag items and quantities.' }, 400); }
  const origin = process.env.SITE_URL || 'https://www.luvio.studio';
  let shippingCountries;
  const shippingCents = Number(process.env.SHIPPING_FLAT_RATE_CENTS);
  try {
    shippingCountries = JSON.parse(process.env.SHIPPING_COUNTRIES || 'null');
    if (!Array.isArray(shippingCountries) || !shippingCountries.length || shippingCountries.some((country) => !/^[A-Z]{2}$/.test(country)) ||
        process.env.SHIPPING_FLAT_RATE_CENTS === undefined || !Number.isSafeInteger(shippingCents) || shippingCents < 0) throw new Error();
  } catch { return json({ error: 'Shipping is being configured. Please contact LUVIO to order.' }, 503); }
  const mode = 'payment';
  try {
    const stripe = new Stripe(secretKey, { apiVersion: '2026-03-25.dahlia' });
    const sessionParams = {
    ui_mode: 'form',
    mode,
    billing_address_collection: 'auto',
    phone_number_collection: { enabled: false },
    automatic_tax: { enabled: false },
    submit_type: 'auto',
    integration_identifier: 'custom_embedded_web_0001',
      line_items: await stripeLineItems(stripe, lines, origin),
      shipping_address_collection: { allowed_countries: shippingCountries },
      shipping_options: [{ shipping_rate_data: {
        type: 'fixed_amount', fixed_amount: { amount: shippingCents, currency: 'usd' },
        display_name: shippingCents ? 'Shipping' : 'Free shipping',
      } }],
      return_url: `${origin}/checkout/?session_id={CHECKOUT_SESSION_ID}`,
      metadata: Object.fromEntries(lines.map((line, index) => [`item_${index + 1}`, JSON.stringify({
        product: line.productId, quantity: line.quantity, unit_price: line.unitPrice, notes: line.notes,
      })])),
    };
    // Stripe accepts this setting only for recurring prices (not LUVIO's one-time items).
    if (mode === 'subscription') sessionParams.payment_method_collection = 'always';
    const session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey: `luvio_checkout_${body.attempt}` });
    if (!session.client_secret) return json({ error: 'Unable to start checkout. Please try again.' }, 502);
    return json({ client_secret: session.client_secret });
  } catch (error) {
    const detail = String(error.message || '').replace(secretKey, '[redacted]')
      .replace(/(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]+/g, '[redacted]').slice(0, 500);
    console.error('Stripe checkout error', error.type || error.name, error.code || '', error.param || '', detail);
    // Never return Stripe internals, keys, or request details to the browser.
    return json({ error: 'Unable to start checkout. Please try again or contact LUVIO.' }, 502);
  }
}
