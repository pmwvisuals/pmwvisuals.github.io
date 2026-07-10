# PMW Visuals Premium Phase 2 Setup

This website now uses Firebase account status with a PayHere checkout entry point.

## Required PayHere Setup

1. Create a PayHere merchant account.
2. Get the PayHere merchant ID.
3. Deploy the included Firebase Functions backend.
4. Put the public merchant ID and deployed `createPayHerePayment` endpoint in `js/payhere-config.js`.

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

This repo now includes a Firebase Functions scaffold:

- `functions/index.js`
- `functions/package.json`
- `functions/.env.example`
- `firebase.json`

Before deployment, create a real `functions/.env` file locally using `functions/.env.example` as the template. Do not commit the real `.env` file.

## Deploy Checklist

From the repository root:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

After deployment, Firebase will show URLs for:

- `createPayHerePayment`
- `payHereNotify`

Put the `createPayHerePayment` URL into `js/payhere-config.js`:

```js
createPaymentEndpoint: "https://your-region-your-project.cloudfunctions.net/createPayHerePayment"
```

Use the `payHereNotify` URL as the server notification URL in PayHere if PayHere asks for it manually. The website also sends it inside the signed payment object.

The backend endpoint should:

1. Verify the Firebase user ID token from the `Authorization` header.
2. Create an order ID.
3. Generate the PayHere hash using the merchant secret.
4. Return the signed PayHere payment object to the browser.
5. Handle the PayHere notify URL and mark the user as premium in Firestore after a successful verified payment.

Premium download protection still needs Phase 3 with Firebase Storage rules or signed Cloudinary delivery.
