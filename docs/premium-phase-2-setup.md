# PMW Visuals Premium Paddle Setup

The website now uses Paddle as the premium checkout provider.

## Current Setup

- Paddle client-side token is stored in `js/paddle-config.js`.
- The checkout page is `premium.html`.
- Premium access is still controlled by Firebase account status through `js/premium-access.js`.
- Premium wallpapers are still protected by `premium-wallpapers.html`.

## Required Paddle Setup

1. Open your Paddle dashboard.
2. Create the PMW Visuals premium product.
3. Create a price for that product.
4. Copy the Paddle price ID. It usually starts with `pri_`.
5. Paste that price ID into `js/paddle-config.js`.

```js
export const PADDLE_CONFIG = {
  clientToken: "test_9462cd67818764d9e2dc77a8831",
  environment: "sandbox",
  priceId: "pri_your_paddle_price_id",
  itemName: "PMW Visuals Premium"
};
```

## Important

The client-side token is safe to keep in the public website. Do not put private Paddle API keys or webhook secrets in this repository.

## Premium Activation

The checkout can open after the Paddle price ID is added. To activate premium automatically after payment, connect a secure backend or serverless function to Paddle webhooks and update the user's Firebase account record after a verified payment.

The current premium check accepts either:

- Firebase custom claim `premium: true`
- Firebase custom claim `role: "premium"`
- Firestore user field `premium: true`
- Firestore user field `role: "premium"`
- Firestore user field `plan: "premium"`

## Testing

Because the token starts with `test_`, the checkout is configured for Paddle sandbox mode. Change the token, environment, and price ID when you are ready to use a live Paddle product.
