import { cartTotals } from './cart-state.js';
import { getVariant, money } from './product-catalog.js';

// This module deliberately supports inquiries only. There is no payment API call.
// Future Checkout must send IDs/options/quantities to a backend that validates
// products and prices server-side before creating a Stripe Checkout Session.
export const checkoutMode = 'order-inquiry';
export function orderInquiry(items) {
  const { lines, subtotal } = cartTotals(items);
  if (!lines.length) return '';
  return [
    'Hello LUVIO, I would like to inquire about the following made-to-order designs:', '',
    ...lines.flatMap((line, index) => [
      `${index + 1}. ${line.product.name} — ${line.product.type}`,
      ...(line.variantId ? [getVariant(line.product, line.variantId).name] : []),
      ...(line.notes ? [`Size / fit / order note: ${line.notes}`] : []),
      `Quantity: ${line.quantity} · Unit price: ${money(line.unitPrice)} · Line total: ${money(line.total)}`, '',
    ]),
    `Product subtotal: ${money(subtotal)}`, '',
    'This is an order inquiry, not a completed purchase. No payment has been made.',
    'Please confirm sizing, measurements, delivery costs, taxes, and the final total before I place my order.',
  ].join('\n');
}
