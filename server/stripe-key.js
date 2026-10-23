export function stripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (key?.startsWith('pk_')) throw new Error('STRIPE_SECRET_KEY contains a publishable key. Replace it with a Stripe secret key in Vercel.');
  if (!/^(sk|rk)_(live|test)_[A-Za-z0-9]+$/.test(key || '')) {
    throw new Error('Set a valid STRIPE_SECRET_KEY in Vercel Production before enabling checkout.');
  }
  return key;
}
