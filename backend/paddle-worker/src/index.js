import { PADDLE_CONFIG } from "../../../js/paddle-config.js";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);
const PROJECT_ID = "pmw-visuals-b14e8";
const encoder = new TextEncoder();
const PRICE_PLANS = new Map(
  [
    ...Object.entries(PADDLE_CONFIG.prices).flatMap(([plan, cycles]) =>
      Object.values(cycles).map((priceId) => [priceId, plan.toLowerCase()])
    ),
    ["pri_01kx81warb6jfesz3awzzxyn4v", "pro"],
    ["pri_01kx826h5xqqt2sje6j94azkgj", "pro"],
    ["pri_01kx81z21ke3yfeh52y6s79j34", "advance"],
    ["pri_01kx828jc4dzy23nwe7fe79hz2", "advance"],
    ["pri_01kx820hy8vw78t19xfs9w5n4g", "elite"],
    ["pri_01kx82a4xbqsjs2bv0hhm6avay", "elite"]
  ]
);
let cachedGoogleToken = null;

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function bytesFromBase64(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function hex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeHexEqual(left, right) {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) return false;
  let difference = 0;
  for (let i = 0; i < 64; i += 1) difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return difference === 0;
}

export async function verifyPaddleSignature(rawBody, header, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  const parts = Object.fromEntries(String(header || "").split(";").map((part) => part.trim().split("=")));
  const timestamp = Number(parts.ts);
  if (!Number.isInteger(timestamp) || Math.abs(nowSeconds - timestamp) > 30 || !parts.h1) return false;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}:${rawBody}`));
  return safeHexEqual(hex(new Uint8Array(digest)), parts.h1);
}

function paddleBase(env) {
  return env.PADDLE_ENV === "sandbox" ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";
}

async function paddleGet(pathOrUrl, env) {
  const base = paddleBase(env);
  const url = new URL(pathOrUrl, base);
  if (url.origin !== base) throw new Error("Unexpected Paddle pagination URL");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${env.PADDLE_API_KEY}`, Accept: "application/json" }
  });
  if (!response.ok) throw new Error(`Paddle API returned ${response.status}`);
  return response.json();
}

async function listSubscriptions(customerId, env) {
  const subscriptions = [];
  let next = `/subscriptions?customer_id=${encodeURIComponent(customerId)}&per_page=200`;
  for (let page = 0; next && page < 100; page += 1) {
    const payload = await paddleGet(next, env);
    subscriptions.push(...(payload.data || []));
    next = payload.meta?.pagination?.has_more ? payload.meta.pagination.next : "";
  }
  if (next) throw new Error("Paddle subscription pagination was incomplete");
  return subscriptions;
}

function subscriptionPriceId(subscription) {
  return subscription.items?.[0]?.price?.id || subscription.items?.[0]?.price_id || "";
}

export function planForSubscription(subscription) {
  return PRICE_PLANS.get(subscriptionPriceId(subscription)) || "";
}

export function pickSubscription(subscriptions) {
  const relevant = subscriptions.filter((subscription) => planForSubscription(subscription));
  relevant.sort((left, right) => {
    const activeDifference = Number(ACTIVE_STATUSES.has(right.status)) - Number(ACTIVE_STATUSES.has(left.status));
    if (activeDifference) return activeDifference;
    return Date.parse(right.updated_at || right.created_at || 0) - Date.parse(left.updated_at || left.created_at || 0);
  });
  return relevant[0] || null;
}

async function googleAccessToken(env) {
  if (cachedGoogleToken && cachedGoogleToken.expiresAt > Date.now() + 60_000) return cachedGoogleToken.value;
  const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON || "{}");
  if (!serviceAccount.client_email || !serviceAccount.private_key) throw new Error("Firebase service account secret is incomplete");
  const projectId = env.FIREBASE_PROJECT_ID || PROJECT_ID;
  if (serviceAccount.project_id !== projectId) throw new Error("Firebase service account project does not match");
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(encoder.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = base64Url(encoder.encode(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  })));
  const unsigned = `${header}.${payload}`;
  const pem = serviceAccount.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const key = await crypto.subtle.importKey("pkcs8", bytesFromBase64(pem), {
    name: "RSASSA-PKCS1-v1_5", hash: "SHA-256"
  }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(unsigned));
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });
  if (!response.ok) throw new Error(`Google token exchange returned ${response.status}`);
  const token = await response.json();
  cachedGoogleToken = { value: token.access_token, expiresAt: Date.now() + Number(token.expires_in || 3600) * 1000 };
  return cachedGoogleToken.value;
}

function firestoreBase(env) {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID || PROJECT_ID)}/databases/(default)/documents`;
}

async function firestoreRequest(url, env, options = {}) {
  const token = await googleAccessToken(env);
  const response = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...options.headers }
  });
  if (!response.ok) throw new Error(`Firestore API returned ${response.status}`);
  return response.json();
}

async function queryUserIds(fieldPath, value, env) {
  const results = await firestoreRequest(`${firestoreBase(env)}:runQuery`, env, {
    method: "POST",
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: "users" }],
      where: { fieldFilter: { field: { fieldPath }, op: "EQUAL", value: { stringValue: value } } },
      limit: 10
    } })
  });
  return results.filter((result) => result.document?.name).map((result) => result.document.name.split("/").pop());
}

async function findUserIds(subscription, customerId, env) {
  const uid = String(subscription?.custom_data?.uid || "");
  if (uid && !uid.includes("/")) return [uid];
  const customer = await paddleGet(`/customers/${encodeURIComponent(customerId)}`, env);
  const email = String(customer.data?.email || "").trim();
  if (!email) return [];
  const lowerIds = await queryUserIds("email_lower", email.toLowerCase(), env);
  return lowerIds.length ? lowerIds : queryUserIds("email", email, env);
}

async function updateUser(uid, customerId, subscription, env) {
  const active = Boolean(subscription && ACTIVE_STATUSES.has(subscription.status));
  const values = {
    premium: { booleanValue: active },
    plan: { stringValue: active ? planForSubscription(subscription) : "free" },
    paddleCustomerId: { stringValue: customerId },
    paddleSubscriptionId: subscription ? { stringValue: subscription.id } : { nullValue: null },
    paddleSubscriptionStatus: subscription ? { stringValue: subscription.status } : { nullValue: null },
    premiumUpdatedAt: { timestampValue: new Date().toISOString() }
  };
  const url = new URL(`${firestoreBase(env)}/users/${encodeURIComponent(uid)}`);
  Object.keys(values).forEach((field) => url.searchParams.append("updateMask.fieldPaths", field));
  url.searchParams.set("currentDocument.exists", "true");
  await firestoreRequest(url, env, { method: "PATCH", body: JSON.stringify({ fields: values }) });
}

async function syncCustomer(customerId, env) {
  const subscriptions = await listSubscriptions(customerId, env);
  const subscription = pickSubscription(subscriptions);
  if (!subscription) return { updatedUsers: 0, status: "ignored" };
  let userIds = await findUserIds(subscription, customerId, env);
  if (env.PADDLE_ENV === "sandbox") {
    const testUid = String(env.PMW_SANDBOX_TEST_UID || "").trim();
    if (!testUid) throw new Error("Sandbox test account is not configured");
    userIds = userIds.filter((uid) => uid === testUid);
    if (!userIds.length) return { updatedUsers: 0, status: "ignored" };
  }
  if (!userIds.length) throw new Error("No matching PMW account for this Paddle customer");
  await Promise.all(userIds.map((uid) => updateUser(uid, customerId, subscription, env)));
  return { updatedUsers: userIds.length, status: subscription?.status || "none" };
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === "/health") return jsonResponse({ ok: true });
    if (path === "/sync-customer") {
      if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
      if (!env.PMW_SYNC_KEY || !safeHexEqual(request.headers.get("X-PMW-Sync-Key") || "", env.PMW_SYNC_KEY)) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      try {
        const { customerId } = await request.json();
        if (!/^ctm_[a-z\d]{26}$/.test(customerId || "")) return jsonResponse({ error: "Invalid customer ID" }, 400);
        return jsonResponse(await syncCustomer(customerId, env));
      } catch (error) {
        console.error("Manual Paddle sync failed", error);
        return jsonResponse({ error: "Subscription sync failed" }, 503);
      }
    }
    if (path !== "/paddle-webhook") return jsonResponse({ error: "Not found" }, 404);
    if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
    if (!env.PADDLE_WEBHOOK_SECRET || !env.PADDLE_API_KEY || !env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      return jsonResponse({ error: "Service is not configured" }, 503);
    }
    const rawBody = await request.text();
    if (!await verifyPaddleSignature(rawBody, request.headers.get("Paddle-Signature"), env.PADDLE_WEBHOOK_SECRET)) {
      return jsonResponse({ error: "Invalid signature" }, 401);
    }
    try {
      const event = JSON.parse(rawBody);
      const relevant = new Set([
        "subscription.created", "subscription.activated", "subscription.updated", "subscription.canceled",
        "subscription.past_due", "subscription.paused", "subscription.resumed",
        "transaction.completed"
      ]);
      if (!relevant.has(event.event_type)) return jsonResponse({ received: true, ignored: true });
      const customerId = event.data?.customer_id;
      if (!customerId) return jsonResponse({ received: true, ignored: true });
      const result = await syncCustomer(customerId, env);
      return jsonResponse({ received: true, ...result });
    } catch (error) {
      console.error("Paddle sync failed", error);
      return jsonResponse({ error: "Subscription sync failed" }, 503);
    }
  }
};
