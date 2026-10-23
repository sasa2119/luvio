import { getProduct, getVariant, money, unitPrice } from './product-catalog.js';
import { STORAGE_KEY, deserializeCart, serializeCart, addItem, setQuantity, removeItem, cartTotals, MAX_QUANTITY } from './cart-state.js';
import { orderInquiry } from './checkout.js';

let items = [];
let storageAvailable = true;
try { items = deserializeCart(localStorage.getItem(STORAGE_KEY)); } catch { storageAvailable = false; }
const drawer = document.querySelector('#shopping-bag');
const list = drawer?.querySelector('[data-cart-items]');
const error = drawer?.querySelector('[data-cart-error]');
const announcement = document.querySelector('[data-cart-status]');
let returnFocus;
const say = (text) => { if (announcement) announcement.textContent = text; };
function showError(text) {
  if (!error) return;
  error.textContent = text;
  error.hidden = !text;
}
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function control(label, text, action) {
  const button = element('button', '', text);
  button.type = 'button';
  button.setAttribute('aria-label', label);
  button.addEventListener('click', action);
  return button;
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, serializeCart(items)); storageAvailable = true; }
  catch { storageAvailable = false; }
}
function update(next, focus) {
  items = next;
  persist();
  render(focus);
}
function render(focus) {
  const { lines, quantity, subtotal } = cartTotals(items);
  document.querySelectorAll('[data-cart-count]').forEach((counter) => {
    counter.textContent = quantity > 99 ? '99+' : String(quantity);
    counter.hidden = quantity === 0;
    counter.closest('button')?.setAttribute('aria-label', quantity ? `Open shopping bag, ${quantity} ${quantity === 1 ? 'item' : 'items'}` : 'Open shopping bag');
  });
  if (!drawer) return;
  drawer.querySelector('[data-cart-empty]').hidden = lines.length > 0;
  drawer.querySelector('[data-cart-summary]').hidden = lines.length === 0;
  drawer.querySelector('[data-cart-subtotal]').textContent = money(subtotal);
  list.replaceChildren();
  lines.forEach((line) => {
    const label = line.product.name + (line.variantId ? `, ${getVariant(line.product, line.variantId).name}` : '');
    const li = element('li', 'bag-item');
    li.dataset.key = line.key;
    const imageLink = element('a', 'bag-image');
    imageLink.href = `/shop/${line.productId}/`;
    imageLink.tabIndex = -1;
    imageLink.setAttribute('aria-hidden', 'true');
    const img = element('img');
    img.src = `/images/${line.product.images[0].name}-480.webp`;
    img.alt = line.product.images[0].alt;
    img.width = 120; img.height = 160;
    imageLink.append(img);
    const info = element('div', 'bag-item-info');
    const title = element('a', 'bag-item-title', line.product.name);
    title.href = `/shop/${line.productId}/`;
    info.append(title);
    if (line.variantId) info.append(element('p', 'bag-item-option', getVariant(line.product, line.variantId).name));
    if (line.notes) info.append(element('p', 'bag-item-note', line.notes));
    info.append(element('p', 'bag-unit-price', `${money(line.unitPrice)} each`));
    const quantityControl = element('div', 'bag-quantity');
    const changeQuantity = (value, focusControl = 'input') => {
      showError('');
      try {
        update(setQuantity(items, line.key, value), { key: line.key, control: focusControl });
        say(`${line.product.name}: ${value}. Subtotal ${money(cartTotals(items).subtotal)}.`);
      } catch (exception) { showError(exception.message); quantityInput.value = String(line.quantity); }
    };
    const minus = control(`Decrease quantity for ${label}`, '−', () => changeQuantity(line.quantity - 1, 'minus'));
    minus.disabled = line.quantity === 1;
    minus.dataset.control = 'minus';
    const quantityInput = element('input');
    quantityInput.type = 'number'; quantityInput.min = '1'; quantityInput.max = String(MAX_QUANTITY); quantityInput.step = '1';
    quantityInput.inputMode = 'numeric'; quantityInput.value = String(line.quantity);
    quantityInput.setAttribute('aria-label', `Quantity for ${label}`);
    quantityInput.dataset.control = 'input';
    quantityInput.addEventListener('change', () => changeQuantity(Number(quantityInput.value)));
    const plus = control(`Increase quantity for ${label}`, '+', () => changeQuantity(line.quantity + 1, 'plus'));
    plus.disabled = line.quantity === MAX_QUANTITY;
    plus.dataset.control = 'plus';
    quantityControl.append(minus, quantityInput, plus);
    const remove = control(`Remove ${label} from bag`, 'Remove', () => {
      const index = lines.findIndex((entry) => entry.key === line.key);
      const nextKey = lines[index + 1]?.key || lines[index - 1]?.key;
      update(removeItem(items, line.key), { key: nextKey, control: 'remove' });
      say(`${line.product.name} removed from your bag.`);
    });
    remove.className = 'bag-remove'; remove.dataset.control = 'remove';
    const bottom = element('div', 'bag-item-bottom');
    bottom.append(quantityControl, element('strong', 'bag-line-total', money(line.total)), remove);
    info.append(bottom);
    li.append(imageLink, info);
    list.append(li);
  });
  if (!storageAvailable) showError('Your browser could not save the bag. Keep this page open while choosing your designs.');
  if (focus) {
    const row = [...list.children].find((node) => node.dataset.key === focus.key);
    const target = row?.querySelector(`[data-control="${focus.control}"]`);
    (target && !target.disabled ? target : row?.querySelector('input') || drawer.querySelector('[data-cart-close]')).focus({ preventScroll: true });
  }
}
function openBag() {
  if (!drawer || drawer.open) return;
  returnFocus = document.activeElement;
  document.querySelector('#mobile-menu')?.close();
  render();
  drawer.showModal();
  document.documentElement.classList.add('cart-open');
  drawer.querySelector('[data-cart-close]').focus();
}
document.querySelectorAll('[data-cart-open]').forEach((button) => button.addEventListener('click', openBag));
drawer?.querySelector('[data-cart-close]').addEventListener('click', () => drawer.close());
drawer?.addEventListener('click', (event) => {
  if (event.target !== drawer) return;
  const rect = drawer.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) drawer.close();
});
drawer?.addEventListener('close', () => {
  document.documentElement.classList.remove('cart-open');
  returnFocus?.focus({ preventScroll: true });
});

document.querySelectorAll('[data-cart-add]').forEach((form) => {
  const p = getProduct(form.dataset.product);
  const variant = form.querySelector('[name="variant"]');
  const price = form.closest('[data-product-detail]')?.querySelector('[data-product-price]');
  variant?.addEventListener('change', () => { if (price) price.textContent = money(unitPrice(p, variant.value)); });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const formError = form.querySelector('.cart-form-error');
    formError.hidden = true;
    const data = new FormData(form);
    try {
      update(addItem(items, { productId: p?.id, variantId: data.get('variant') || '', quantity: Number(data.get('quantity')), notes: data.get('notes') || '' }));
      say(`${p.name} added to your bag.`);
      openBag();
    } catch (exception) { formError.textContent = exception.message; formError.hidden = false; }
  });
});
drawer?.querySelector('[data-order-inquiry]').addEventListener('click', (event) => {
  if (!cartTotals(items).lines.length) { event.preventDefault(); return; }
  try { sessionStorage.setItem('luvio.orderInquiry.v1', serializeCart(items)); }
  catch {
    if (!storageAvailable) {
      event.preventDefault();
      showError('Your browser cannot carry the bag to the contact page. Copy this order summary into the contact form instead.');
      let summary = drawer.querySelector('.manual-order-summary');
      if (!summary) {
        summary = element('textarea', 'manual-order-summary'); summary.readOnly = true;
        summary.setAttribute('aria-label', 'Order inquiry summary to copy');
        error.after(summary);
        const link = element('a', 'text-link', 'Open contact form'); link.href = '/contact/'; summary.after(link);
      }
      summary.value = orderInquiry(items); summary.focus(); summary.select();
    }
  }
});
if (new URLSearchParams(location.search).get('order') === 'cart') {
  const message = document.querySelector('#message');
  let draft = items;
  try { draft = deserializeCart(sessionStorage.getItem('luvio.orderInquiry.v1')); } catch { /* Use the persisted bag. */ }
  if (!draft.length) draft = items;
  const summary = orderInquiry(draft);
  if (message && summary) {
    message.value = summary;
    const form = message.closest('form');
    form.id = 'order-inquiry';
    form.querySelector('[name="_subject"]').value = 'New LUVIO Order Inquiry';
    form.querySelector('button[type="submit"] span').textContent = 'Send order inquiry';
    form.parentElement.querySelector('.eyebrow').textContent = 'Your order inquiry';
    const note = element('p', 'order-inquiry-note', 'Review your selection and add your questions below. This sends an inquiry only; it does not place an order or take payment.');
    message.closest('.field').before(note);
    if (location.hash === '#order-inquiry') requestAnimationFrame(() => form.scrollIntoView({ block: 'start' }));
  }
}
drawer?.querySelector('[data-checkout-open]')?.addEventListener('click', (event) => {
  try {
    sessionStorage.setItem('luvio.checkout.items', serializeCart(items));
    sessionStorage.removeItem('luvio.checkout.attempt');
  } catch {
    event.preventDefault();
    showError('Your browser could not open checkout. Please allow session storage or send an order inquiry.');
  }
});
addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  try { items = deserializeCart(localStorage.getItem(STORAGE_KEY)); render(); } catch { /* Keep the in-memory bag. */ }
});
render();
