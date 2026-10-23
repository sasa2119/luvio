// One price catalog for static rendering, cart estimates, and a future server adapter.
// A server must resolve its own trusted catalog; a browser is never a payment authority.
export const currency = 'USD';
export const prices = Object.freeze({ tShirt: 11900, hoodie: 19900, bracelet: 11900, suppliedBracelet: 4900, horse: 74900, leopard: 89900 });
const image = (name, alt, width = 960, height = 1280) => ({ name, alt, width, height });
const product = (value) => Object.freeze({ collection: 'ready-to-order', madeToOrder: true, ...value });
export const products = Object.freeze([
  product({ id: 'cherry', name: 'Cherry', type: 'Crystal T-Shirt', category: 't-shirts', categoryName: 'T-Shirts', price: prices.tShirt,
    description: 'Black T-shirt with a cherry design in red and green crystals, placed by hand.',
    images: [image('cherry', 'Black LUVIO T-shirt with a red and green crystal cherry design'), image('cherry-model', 'Black LUVIO crystal cherry T-shirt styled with jeans')], noteLabel: 'Size / fit note (optional)' }),
  product({ id: 'hummingbird', name: 'Hummingbird', type: 'Crystal T-Shirt', category: 't-shirts', categoryName: 'T-Shirts', price: prices.tShirt,
    description: 'White T-shirt with a hummingbird design in colored crystals, placed by hand.',
    images: [image('hummingbird', 'White LUVIO T-shirt with a colorful crystal hummingbird'), image('hummingbird-model', 'White LUVIO crystal hummingbird T-shirt styled with jeans')], noteLabel: 'Size / fit note (optional)' }),
  product({ id: 'leopard', name: 'Leopard', type: 'Original Crystal Artwork', category: 'original-artwork', categoryName: 'Artwork', price: prices.leopard,
    description: 'Framed leopard portrait made with crystals on a dark background. Contact us for dimensions.',
    images: [image('leopard-close', 'Close view of the crystal leopard portrait in a black frame', 960, 1280), image('leopard-room', 'Framed crystal leopard artwork displayed above a black console in a sunlit living room', 1122, 1402)] }),
  product({ id: 'horse', name: 'Crystal Horse Artwork', type: 'Crystal Artwork', category: 'original-artwork', categoryName: 'Artwork', price: prices.horse,
    description: 'A striking crystal horse artwork, carefully decorated by hand with shimmering crystals and presented in an ornate gold frame.',
    images: [image('horse', 'Close view of a silver crystal horse on black, framed in an ornate gold frame', 1122, 1402), image('horse-room', 'Crystal horse artwork in an ornate gold frame displayed above a brown sofa in a sunlit living room', 1122, 1402)] }),
  product({ id: 'emerald', name: 'Emerald', type: 'Crystal Watch Bracelet', category: 'bracelets', categoryName: 'Bracelets', price: prices.bracelet,
    description: 'Watch bracelet with green crystals and gold-toned edges. Contact us to confirm the fit for your watch and wrist.',
    images: [image('emerald', 'Emerald green crystal watch bracelet with gold-toned edges', 1280, 853)], noteLabel: 'Watch / wrist details',
    }),
  product({ id: 'headphones', name: 'Headphones', type: 'Crystal Hoodie', category: 'hoodies', categoryName: 'Hoodies', price: prices.hoodie,
    description: 'White hoodie with a headphones design made from multicolored crystals.',
    images: [image('headphones', 'White LUVIO hoodie with multicolored crystal headphones')], noteLabel: 'Size / fit note (optional)' }),
]);
export const getProduct = (id) => products.find((entry) => entry.id === id);
export const getVariant = (p, id = '') => p?.variants?.find((entry) => entry.id === id);
export function unitPrice(p, variantId = '') {
  if (!p) throw new Error('This product is not in the catalog.');
  if (!p.variants) {
    if (variantId) throw new Error('This product option is not available.');
    return p.price;
  }
  const variant = getVariant(p, variantId);
  if (!variant) throw new Error('Choose a bracelet base item.');
  return variant.price;
}
const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2, minimumFractionDigits: 0 });
export const money = (cents) => `${formatter.format(cents / 100)} USD`;
export const productUrl = (p) => `/shop/${p.id}/`;
