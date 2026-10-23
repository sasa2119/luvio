import routeData from './routes.json' with { type: 'json' };
import { template } from './components.mjs';
import { home } from './home.mjs';
import { shop, productPage, products } from './catalog.mjs';

export const routes = routeData.map((page) => ({ ...page, render: () => template(page.template) })).filter((page) => !page.path.startsWith('/shop/'));
routes.find((page) => page.path === '/').render = home;
routes.find((page) => page.path === '/').description = 'Luxury crystal-decorated clothing, accessories, and artwork, finished by hand. Shop existing designs made after you order or request a custom creation.';
routes.push({ path: '/shop/', title: 'Shop Made-to-Order Crystal Designs — LUVIO', description: 'Explore LUVIO T-shirts, hoodies, bracelets and crystal artwork. Shop existing designs, each made by hand after you order. Prices in USD.', render: shop });
routes.push(...products.map((p) => ({ path: `/shop/${p.id}/`, title: `${p.name} — LUVIO`, description: p.description, render: () => productPage(p) })));
routes.push({ path: '/checkout/', title: 'Checkout — LUVIO', description: 'Secure checkout for LUVIO.', render: () => template('checkout') });
