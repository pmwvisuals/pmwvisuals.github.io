import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import worker, { pickSubscription, planForSubscription, verifyPaddleSignature } from "./index.js";

const proPrice = "pri_01kxsfyk134yk1y741d0vcm45c";

function subscription(status, updatedAt, priceId = proPrice) {
  return {
    id: `sub_${status}`,
    status,
    updated_at: updatedAt,
    items: [{ price: { id: priceId } }]
  };
}

test("active subscriptions win over newer canceled subscriptions", () => {
  const chosen = pickSubscription([
    subscription("canceled", "2026-10-01T12:00:00Z"),
    subscription("active", "2026-09-01T12:00:00Z")
  ]);
  assert.equal(chosen.status, "active");
  assert.equal(planForSubscription(chosen), "pro");
});

test("unrelated Paddle products do not grant premium access", () => {
  const unrelated = subscription("active", "2026-10-01T12:00:00Z", "pri_other");
  unrelated.custom_data = { product: "pmw-premium", plan: "elite" };
  assert.equal(pickSubscription([unrelated]), null);
  assert.equal(planForSubscription(subscription("active", "2026-10-01T12:00:00Z", "pri_01kx81warb6jfesz3awzzxyn4v")), "pro");
});

test("Paddle signatures require the exact raw body and a recent timestamp", async () => {
  const timestamp = 1790870400;
  const rawBody = '{"event_type":"subscription.updated"}';
  const secret = "test-secret";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}:${rawBody}`));
  const signature = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const header = `ts=${timestamp};h1=${signature}`;
  assert.equal(await verifyPaddleSignature(rawBody, header, secret, timestamp), true);
  assert.equal(await verifyPaddleSignature(`${rawBody} `, header, secret, timestamp), false);
  assert.equal(await verifyPaddleSignature(rawBody, header, secret, timestamp + 31), false);
});

test("a signed subscription event updates the matched Firebase account", async () => {
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" }
  });
  const secret = "test-webhook-secret";
  const customerId = "ctm_01grnn4zta5a1mf02jjze7y2ys";
  const uid = "firebase-user-1";
  const event = JSON.stringify({ event_type: "subscription.updated", data: { customer_id: customerId } });
  const timestamp = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}:${event}`));
  const signature = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const originalFetch = globalThis.fetch;
  let writtenFields = null;
  let subscriptionStatus = "active";
  globalThis.fetch = async (url, options = {}) => {
    const address = String(url);
    if (address.includes("/subscriptions?")) {
      return Response.json({ data: [{
        id: "sub_01h04vsc0qhwtsbsxh3422wjs4",
        customer_id: customerId,
        status: subscriptionStatus,
        custom_data: { uid, product: "pmw-premium" },
        items: [{ price: { id: proPrice } }]
      }], meta: { pagination: { has_more: false } } });
    }
    if (address === "https://oauth2.googleapis.com/token") {
      return Response.json({ access_token: "mock-google-token", expires_in: 3600 });
    }
    if (address.includes(`/users/${uid}`) && options.method === "PATCH") {
      writtenFields = JSON.parse(options.body).fields;
      return Response.json({ name: address });
    }
    throw new Error(`Unexpected request: ${address}`);
  };
  try {
    const request = new Request("https://worker.example/paddle-webhook", {
      method: "POST",
      headers: { "Paddle-Signature": `ts=${timestamp};h1=${signature}` },
      body: event
    });
    const response = await worker.fetch(request, {
      PADDLE_WEBHOOK_SECRET: secret,
      PADDLE_API_KEY: "test-api-key",
      FIREBASE_PROJECT_ID: "pmw-visuals-b14e8",
      FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({
        client_email: "test@pmw-visuals-b14e8.iam.gserviceaccount.com",
        private_key: privateKey,
        project_id: "pmw-visuals-b14e8"
      })
    });
    assert.equal(response.status, 200);
    assert.equal(writtenFields.premium.booleanValue, true);
    assert.equal(writtenFields.plan.stringValue, "pro");
    assert.equal(writtenFields.paddleCustomerId.stringValue, customerId);
    assert.equal(writtenFields.role, undefined);

    subscriptionStatus = "canceled";
    const canceledResponse = await worker.fetch(new Request("https://worker.example/paddle-webhook", {
      method: "POST",
      headers: { "Paddle-Signature": `ts=${timestamp};h1=${signature}` },
      body: event
    }), {
      PADDLE_WEBHOOK_SECRET: secret,
      PADDLE_API_KEY: "test-api-key",
      FIREBASE_PROJECT_ID: "pmw-visuals-b14e8",
      FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({
        client_email: "test@pmw-visuals-b14e8.iam.gserviceaccount.com",
        private_key: privateKey,
        project_id: "pmw-visuals-b14e8"
      })
    });
    assert.equal(canceledResponse.status, 200);
    assert.equal(writtenFields.premium.booleanValue, false);
    assert.equal(writtenFields.plan.stringValue, "free");
    assert.equal(writtenFields.paddleSubscriptionStatus.stringValue, "canceled");

    writtenFields = null;
    subscriptionStatus = "active";
    const isolatedSandboxResponse = await worker.fetch(new Request("https://worker.example/paddle-webhook", {
      method: "POST",
      headers: { "Paddle-Signature": `ts=${timestamp};h1=${signature}` },
      body: event
    }), {
      PADDLE_ENV: "sandbox",
      PMW_SANDBOX_TEST_UID: "a-different-test-user",
      PADDLE_WEBHOOK_SECRET: secret,
      PADDLE_API_KEY: "test-api-key",
      FIREBASE_PROJECT_ID: "pmw-visuals-b14e8",
      FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({
        client_email: "test@pmw-visuals-b14e8.iam.gserviceaccount.com",
        private_key: privateKey,
        project_id: "pmw-visuals-b14e8"
      })
    });
    assert.equal(isolatedSandboxResponse.status, 200);
    assert.equal(writtenFields, null, "sandbox events must not update an account outside the designated test UID");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
