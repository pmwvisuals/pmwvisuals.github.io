# PMW Visuals Premium Phase 2 Setup

This website uses the Firebase Stripe Payments extension pattern.

## Required Firebase/Stripe Setup

1. Create a Stripe product for PMW Visuals Premium.
2. Create a one-time price or subscription price in Stripe.
3. Install the Firebase extension `stripe/firestore-stripe-payments`.
4. Configure the extension to use the same Firebase project as the website.
5. Copy the public Stripe price ID, for example `price_123...`.
6. Put that value in `js/stripe-config.js`.

```js
export const STRIPE_PRICE_ID = "price_your_real_id_here";
export const STRIPE_MODE = "payment";
```

Use `payment` for a one-time purchase or `subscription` for monthly/yearly access.

## Important

Do not put Stripe secret keys in this repository. GitHub Pages is public, so only public configuration such as a Stripe price ID belongs in frontend files.

Premium download protection still needs Phase 3 with Firebase Storage rules or signed Cloudinary delivery.

