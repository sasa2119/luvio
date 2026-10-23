import { getProduct, unitPrice, prices } from './product-catalog.js';

export const STORAGE_KEY = 'luvio.cart.v1';
export const MAX_QUANTITY = 99;
export const MAX_LINES = 30;
export const MAX_NOTE = 150;
const cleanNotes = (value) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, MAX_NOTE) : '';
export const itemKey = (item) => JSON.stringify([item.productId, item.variantId || '', cleanNotes(item.notes)]);

function validItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const p = getProduct(raw.productId);
  const variantId = raw.productId === 'emerald' && ['luvio-base', 'customer-base'].includes(raw.variantId) ? '' : typeof raw.variantId === 'string' ? raw.variantId : '';
  if (!p || !Number.isInteger(raw.quantity) || raw.quantity < 1 || raw.quantity > MAX_QUANTITY) return null;
  try { unitPrice(p, variantId); } catch { return null; }
  return { productId: p.id, variantId, notes: cleanNotes(raw.notes), quantity: raw.quantity };
}

export function normalizeCart(raw) {
  if (!Array.isArray(raw)) return [];
  const merged = new Map();
  for (const value of raw.slice(0, 200)) {
    const item = validItem(value);
    if (!item) continue;
    const key = itemKey(item);
    if (merged.has(key)) merged.get(key).quantity = Math.min(MAX_QUANTITY, merged.get(key).quantity + item.quantity);
    else if (merged.size < MAX_LINES) merged.set(key, item);
  }
  return [...merged.values()];
}
export function deserializeCart(json) {
  try {
    const data = JSON.parse(json);
    return data?.version === 1 ? normalizeCart(data.items) : [];
  } catch { return []; }
}
export const serializeCart = (items) => JSON.stringify({ version: 1, items: normalizeCart(items) });
export function addItem(items, selection) {
  const item = validItem(selection);
  if (!item) throw new Error('Check your product options and quantity.');
  const result = normalizeCart(items);
  const existing = result.find((entry) => itemKey(entry) === itemKey(item));
  if (existing) {
    if (existing.quantity + item.quantity > MAX_QUANTITY) throw new Error('You can add up to 99 of the same selection.');
    existing.quantity += item.quantity;
  } else {
    if (result.length >= MAX_LINES) throw new Error('Your bag can hold 30 different selections. Send an inquiry for a larger order.');
    result.push(item);
  }
  return result;
}
export function setQuantity(items, key, quantity) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) throw new Error('Choose a quantity from 1 to 99.');
  return normalizeCart(items).map((entry) => itemKey(entry) === key ? { ...entry, quantity } : entry);
}
export const removeItem = (items, key) => normalizeCart(items).filter((entry) => itemKey(entry) !== key);
export function cartTotals(items) {
  const normalized = normalizeCart(items);
  const quantity = normalized.reduce((sum, item) => sum + item.quantity, 0);
  const lines = normalized.map((item) => {
    const product = getProduct(item.productId);
    const price = item.productId === 'emerald' && quantity >= 2
      ? prices.suppliedBracelet : unitPrice(product, item.variantId);
    return { ...item, product, unitPrice: price, total: price * item.quantity, key: itemKey(item) };
  });
  return { lines, quantity: lines.reduce((sum, line) => sum + line.quantity, 0), subtotal: lines.reduce((sum, line) => sum + line.total, 0) };
}
