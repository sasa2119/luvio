import { STORAGE_KEY, deserializeCart, serializeCart } from './cart-state.js';
import { money } from './product-catalog.js';
import { cartTotals } from './cart-state.js';

const status = document.querySelector('#checkout-status');
const container = document.querySelector('#checkout-form');
const showError = (message) => {
  status.textContent = message;
  status.setAttribute('role', 'alert');
};

async function readJson(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error(response.ok
      ? 'Checkout returned an unexpected response. Please refresh and try again.'
      : `Checkout could not load (server error ${response.status}). Please refresh or contact LUVIO.`);
  }
  let data;
  try { data = await response.json(); } catch {
    throw new Error('Checkout returned an invalid response. Please refresh and try again.');
  }
  if (!response.ok) throw new Error(data.error || 'Checkout is temporarily unavailable.');
  return data;
}

async function startCheckout() {
  const sessionId = new URLSearchParams(location.search).get('session_id');
  if (sessionId) {
    const payment = await fetch(`/api/create-checkout-session?session_id=${encodeURIComponent(sessionId)}`, { cache: 'no-store' }).then(readJson);
    status.textContent = payment.payment_status === 'paid'
      ? 'Thank you. Your payment has been received. LUVIO will prepare your order.'
      : payment.status === 'complete' ? 'Your payment is processing. LUVIO will confirm your order once payment is received.'
      : 'Checkout has not been completed. You can return to your bag to try again.';
    return;
  }
  let saved;
  try { saved = sessionStorage.getItem('luvio.checkout.items') || localStorage.getItem(STORAGE_KEY); } catch { /* Handled by empty bag. */ }
  const items = deserializeCart(saved);
  if (!items.length) throw new Error('Your bag is empty. Add a design before checking out.');
  const totals = cartTotals(items);
  document.querySelector('#checkout-summary').textContent = `${totals.quantity} ${totals.quantity === 1 ? 'item' : 'items'} · ${money(totals.subtotal)} before shipping`;
  const fingerprint = serializeCart(items);
  let attempt;
  try {
    const previous = JSON.parse(sessionStorage.getItem('luvio.checkout.attempt') || 'null');
    attempt = previous?.cart === fingerprint ? previous.id : crypto.randomUUID();
    sessionStorage.setItem('luvio.checkout.attempt', JSON.stringify({ cart: fingerprint, id: attempt }));
  } catch { attempt = crypto.randomUUID(); }
  const { publishableKey } = await fetch('/api/create-checkout-session', { cache: 'no-store' }).then(readJson);
  if (typeof window.Stripe !== 'function') throw new Error('The payment form could not load. Please refresh and try again.');
  const stripe = window.Stripe(publishableKey);
  const appearance = {
    theme: 'stripe',
    labels: 'auto',
    inputs: 'spaced',
    variables: {
      borderRadius: '4px',
      colorBackground: '#ffffff',
      colorDanger: '#df1b41',
      colorPrimary: '#0570de',
      colorSuccess: '#00c853',
      colorText: '#30313d',
      fontFamily: 'default',
      fontSizeBase: '16px',
      spacingUnit: '4px',
    },
  };
  let activeSession;
  const clientSecret = fetch('/api/create-checkout-session', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items, attempt }),
  })
    .then(readJson)
    .then((data) => {
      if (!data.client_secret) throw new Error('Unable to start checkout.');
      activeSession = data.client_secret.split('_secret_')[0];
      return data.client_secret;
    });
  // Observe rejection immediately, including if SDK initialization fails.
  clientSecret.catch(() => {});
  const checkout = stripe.initCheckoutFormSdk({ clientSecret, appearance });
  const form = checkout.createForm({ layout: 'expanded' });
  form.mount('#checkout-form');
  const result = await checkout.loadActions();
  if (result.type !== 'success') throw new Error('Unable to load checkout. Please try again.');
  form.on('confirm', async (event) => {
    try {
      const confirmation = await result.actions.confirm({ formConfirmEvent: event });
      if (confirmation?.type === 'error') showError(confirmation.error?.message || 'Payment could not be confirmed. Please try again.');
      else if (activeSession) location.assign(`/checkout/?session_id=${encodeURIComponent(activeSession)}`);
    } catch {
      showError('Payment could not be confirmed. Please try again or contact LUVIO.');
    }
  });
  status.textContent = '';
}

if (container && status) {
  startCheckout().catch((error) => showError(error.message || 'Checkout is temporarily unavailable.'));
}
