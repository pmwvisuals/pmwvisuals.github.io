# PMW Visuals Premium Phase 2 Setup

This website now uses Firebase account status with a PayHere checkout entry point.

## Required PayHere Setup

1. Create a PayHere merchant account.
2. Get the PayHere merchant ID.
3. Build a backend endpoint, preferably Firebase Functions, that creates a PayHere payment object and signs it with your PayHere merchant secret.
4. Put the public merchant ID and backend endpoint in `js/payhere-config.js`.

```js
export const PAYHERE_CONFIG = {
  merchantId: "your_payhere_merchant_id",
  amount: "1000.00",
  currency: "LKR",
  itemName: "PMW Visuals Premium",
  createPaymentEndpoint: "https://your-function-url/createPayHerePayment"
};
```

## Backend Requirement

Do not put the PayHere merchant secret in this repository. GitHub Pages is public.

The backend endpoint should:

1. Verify the Firebase user ID token from the `Authorization` header.
2. Create an order ID.
3. Generate the PayHere hash using the merchant secret.
4. Return the signed PayHere payment object to the browser.
5. Handle the PayHere notify URL and mark the user as premium in Firestore after a successful verified payment.

Premium download protection still needs Phase 3 with Firebase Storage rules or signed Cloudinary delivery.
