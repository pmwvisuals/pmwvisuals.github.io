# PMW Visuals: Firebase Spark migration

This migration keeps GitHub Pages, Firebase Authentication, the default Firestore
database, Paddle plans, and the existing image links. Wallpaper browsing and
downloads no longer call Firebase Cloud Functions. A small Cloudflare Worker
receives Paddle subscription events and updates the matching Firestore user.

## Important current state

- `js/paddle-config.js` has `fulfillmentReady: false`. This deliberately pauses
  new checkouts until the replacement webhook is deployed and tested. The plan
  cards and prices remain visible. Set it to `true` only at the end of this guide.
- The repository contains cached thumbnails, but not the full size originals.
  Mobile originals are linked from Google Drive. Existing desktop assets and
  any Firestore premium assets hosted on Cloudinary continue to use those URLs
  until they are copied to another image host. An asset with a private or
  authenticated Cloudinary delivery type needs a public replacement URL before
  it can be downloaded directly.
- Firestore wallpaper records become publicly readable when `visible == true`.
  This includes their original image URLs. This is intentional for direct
  downloads. Admin write access remains restricted.
- Paddle's emailed receipt links customers to its customer portal to manage or
  cancel a subscription. The old on-site portal button now explains this.

## 1. Deploy Firestore rules

From the repository root, while signed in to the correct Firebase project:

```powershell
firebase use pmw-visuals-b14e8
firebase deploy --only firestore:rules
```

Confirm that the wallpaper gallery and a visible premium record load without
the old `listWallpapers` function. Keep the old Functions running during this
check. The default Firestore database must stay within Spark's free quota. The
site loads premium Firestore records only when someone selects the Premium
filter or signs in with premium access, reducing reads from casual visits.

## 2. Create the free Worker

Create a Cloudflare account on the Workers Free plan. From
`backend/paddle-worker`:

```powershell
npx wrangler login
npx wrangler deploy
```

The deploy prints a `workers.dev` URL. Its `/health` path should respond with
`{"ok":true}`. No domain move is needed for this endpoint.

Configure these **encrypted Worker secrets** in Cloudflare's dashboard under
the deployed Worker's settings. Never place their values in Git or website JS:

| Secret | Value |
| --- | --- |
| `PADDLE_API_KEY` | Live Paddle API key with subscription read and customer read permissions. |
| `PADDLE_WEBHOOK_SECRET` | Signing secret from the new Paddle notification destination. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Full JSON service account key for the `pmw-visuals-b14e8` Firebase project, with access to its Firestore database. |
| `PMW_SYNC_KEY` | A random, private 64 character hexadecimal string for the manual sync endpoint. |

To create the Firebase key, use Firebase Console → Project settings → Service
accounts → Generate new private key. Paste the JSON into the Worker secret as
one value, and protect the downloaded file. The service account project ID must
match `FIREBASE_PROJECT_ID` in `wrangler.toml`.

## 3. Connect Paddle

In Paddle Live → Developer tools → Notifications, add a URL destination:

```text
https://YOUR-WORKER.workers.dev/paddle-webhook
```

Select `customer.created`, `subscription.created`, `subscription.activated`,
`subscription.updated`, `subscription.canceled`, `subscription.past_due`,
`subscription.paused`, `subscription.resumed`, and `transaction.completed`.
Copy this **new destination's** signing secret into the Worker. Leave the old
Firebase destination active until the new one has successfully processed a
subscription event.

Paddle's webhook simulator can send a `customer.created` event to check the
endpoint and signature without a purchase. It should receive HTTP 200 with
`ignored: true`. A subscription event with a real Paddle customer ID should
update that customer's `users/{uid}` document in Firestore. For an existing
customer, `/sync-customer` can run the same reconciliation manually using the
private `X-PMW-Sync-Key` header and a JSON body such as
`{"customerId":"ctm_..."}`. Only use a real Paddle customer ID.

The Worker checks Paddle's **current** subscription state, so old or repeated
webhooks cannot turn a canceled plan back on. It grants access for `active` and
`trialing`; a scheduled cancellation stays active until Paddle actually
changes the subscription status.

## 4. Verify without a live subscriber

If there is no existing live paid subscriber, use the isolated Paddle sandbox
Worker. Do not point sandbox webhooks at the production Worker or use a normal
customer account for the test.

1. Create a **dedicated test account** on the PMW website. Find its Firebase
   Authentication UID in Firebase Console → Authentication → Users.
2. From `backend/paddle-worker`, run `npx wrangler deploy --env sandbox`.
   Cloudflare creates a separate `pmw-paddle-sync-sandbox` Worker. It uses the
   Paddle sandbox API and cannot update any Firebase account until
   `PMW_SANDBOX_TEST_UID` is configured.
3. In that **sandbox Worker only**, add the sandbox `PADDLE_API_KEY` (with
   `customer.read` and `subscription.read`), the sandbox notification
   destination's `PADDLE_WEBHOOK_SECRET`, the Firebase JSON service account
   key as `FIREBASE_SERVICE_ACCOUNT_JSON`, and the test account UID as
   `PMW_SANDBOX_TEST_UID`. Never copy the live Paddle API key or webhook secret
   into the sandbox Worker.
4. In Paddle **Sandbox** → Developer tools → Notifications, create a new URL
   destination at the sandbox Worker's `/paddle-webhook` URL. Select the same
   subscription events listed above. Its signing secret belongs only to the
   sandbox Worker.
5. From `backend/paddle-worker`, run `node serve-sandbox-checkout.mjs`, then
   open `http://127.0.0.1:8766/sandbox-checkout.html` and enter the dedicated
   test account's exact email. Open the Pro monthly sandbox
   checkout and pay with Paddle's test card `4242 4242 4242 4242` (any future
   expiry). No real money is taken. Confirm `users/{testUid}` becomes
   `premium: true`, `plan: pro`, and `paddleSubscriptionStatus: active`.
6. Cancel that sandbox subscription in Paddle Sandbox. Confirm the same test
   account changes back to `premium: false`, `plan: free`, and
   `paddleSubscriptionStatus: canceled`.

The sandbox Worker filters every subscription update to the one configured
test UID. Leave `PMW_SANDBOX_TEST_UID` set while it exists. The local test page
uses a public sandbox client token only; it contains no server-side secret.

## 5. Reopen checkout and switch to Spark

After a real customer sync or the isolated sandbox test confirms the correct
`premium`, `plan`, `paddleSubscriptionId`, and
`paddleSubscriptionStatus` in Firestore:

1. Change `fulfillmentReady` to `true` in `js/paddle-config.js`.
2. Publish the site changes to GitHub Pages.
3. Confirm checkout's signed in account requirement and that the new Paddle
   destination receives new subscription events.
4. Deactivate the old Firebase Functions notification destination in Paddle.
5. Remove the old Firebase Cloud Functions in the Firebase Console once you
   have verified no active route uses them. The legacy source is retained in
   `functions/` as historical reference, but `firebase.json` no longer deploys
   it. Deleting those deployed Functions is a separate action from changing
   this repository.
6. Downgrade Firebase to Spark in the Firebase Console.

The browser gives the purchaser temporary access after Paddle.js reports a
completed checkout. The Worker then writes the durable status to Firestore.
If the Worker is unavailable, this temporary browser access expires after one
hour and Paddle retries failed webhooks. Watch Paddle's notification logs for
non-2xx responses.

## Adding wallpapers without Cloudinary

The admin form now accepts any direct HTTPS original image URL and an optional
HTTPS preview URL. For Google Drive, use the file's public direct download URL
as the original and a displayable preview URL as the preview. The original file
must be publicly readable. Move existing Cloudinary files gradually after you
have full size copies and a replacement image host.

GitHub Pages has a 1 GB published site limit, so it is not a good place for
thousands of full size originals. Google Drive can temporarily throttle popular
public files. Whichever free host you choose, test a full size download from a
private browser window before changing the Firestore record.

## References

- [Firebase plan changes](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)
- [Firestore free quota](https://firebase.google.com/docs/firestore/pricing)
- [Cloudflare Workers free plan](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Paddle webhook signatures](https://developer.paddle.com/webhooks/about/signature-verification/)
- [Paddle customer portal](https://developer.paddle.com/concepts/sell/customer-portal/)
- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
