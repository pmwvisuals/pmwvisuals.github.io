import crypto from "node:crypto";
import admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

admin.initializeApp();

const db = admin.firestore();

function env(name, fallback = "") {
  return process.env[name] || fallback;
}

function md5(value) {
  return crypto.createHash("md5").update(value, "utf8").digest("hex").toUpperCase();
}

function normalizeAmount(amount) {
  const value = Number.parseFloat(amount);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Invalid PayHere amount.");
  }
  return value.toFixed(2);
}

function merchantSecretHash() {
  const secret = env("PAYHERE_MERCHANT_SECRET");
  if (!secret) throw new Error("PAYHERE_MERCHANT_SECRET is not configured.");
  return md5(secret);
}

function checkoutHash({ merchantId, orderId, amount, currency }) {
  return md5(`${merchantId}${orderId}${amount}${currency}${merchantSecretHash()}`);
}

function notifyHash({ merchantId, orderId, amount, currency, statusCode }) {
  return md5(`${merchantId}${orderId}${amount}${currency}${statusCode}${merchantSecretHash()}`);
}

function allowedOrigins() {
  return env("PMW_SITE_ORIGINS", "https://pmwvisuals.com,https://pmwvisuals.github.io")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function applyCors(req, res) {
  const origin = req.get("origin");
  if (origin && allowedOrigins().includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  res.set("Vary", "Origin");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
}

async function getAuthedUser(req) {
  const authHeader = req.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) throw new Error("Missing Firebase ID token.");
  return admin.auth().verifyIdToken(token);
}

function requestBaseUrl(req) {
  const forwardedProto = req.get("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  return `${protocol}://${req.get("host")}`;
}

export const createPayHerePayment = onRequest({ cors: false }, async (req, res) => {
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  try {
    const user = await getAuthedUser(req);
    const merchantId = env("PAYHERE_MERCHANT_ID");
    if (!merchantId) throw new Error("PAYHERE_MERCHANT_ID is not configured.");

    const amount = normalizeAmount(req.body?.amount || env("PAYHERE_PREMIUM_AMOUNT"));
    const currency = req.body?.currency || env("PAYHERE_PREMIUM_CURRENCY", "LKR");
    const itemName = req.body?.itemName || "PMW Visuals Premium";
    const orderId = `pmw-${Date.now()}-${user.uid.slice(0, 8)}`;
    const baseUrl = requestBaseUrl(req);

    await db.collection("payhere_orders").doc(orderId).set({
      uid: user.uid,
      email: user.email || "",
      amount,
      currency,
      itemName,
      status: "created",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({
      sandbox: env("PAYHERE_SANDBOX", "true") === "true",
      merchant_id: merchantId,
      return_url: req.body?.returnUrl || "https://pmwvisuals.com/premium-success.html",
      cancel_url: req.body?.cancelUrl || "https://pmwvisuals.com/premium-cancel.html",
      notify_url: `${baseUrl}/payHereNotify`,
      order_id: orderId,
      items: itemName,
      amount,
      currency,
      first_name: user.name || "PMW",
      last_name: "Member",
      email: user.email || "member@pmwvisuals.com",
      phone: "0000000000",
      address: "PMW Visuals",
      city: "Colombo",
      country: "Sri Lanka",
      custom_1: user.uid,
      custom_2: "pmw-premium",
      hash: checkoutHash({ merchantId, orderId, amount, currency })
    });
  } catch (error) {
    logger.error("Unable to create PayHere payment.", error);
    res.status(400).json({ error: "Unable to create PayHere payment." });
  }
});

export const payHereNotify = onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  try {
    const body = req.body || {};
    const merchantId = body.merchant_id;
    const orderId = body.order_id;
    const amount = normalizeAmount(body.payhere_amount);
    const currency = body.payhere_currency;
    const statusCode = String(body.status_code || "");
    const md5sig = String(body.md5sig || "").toUpperCase();

    const expected = notifyHash({ merchantId, orderId, amount, currency, statusCode });
    if (md5sig !== expected) {
      logger.warn("Rejected PayHere notify with invalid signature.", { orderId });
      res.status(400).send("Invalid signature");
      return;
    }

    const orderRef = db.collection("payhere_orders").doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      logger.warn("PayHere notify for unknown order.", { orderId });
      res.status(404).send("Unknown order");
      return;
    }

    const order = orderSnap.data();
    const isPaid = statusCode === "2";
    await orderRef.set({
      payherePaymentId: body.payment_id || "",
      statusCode,
      status: isPaid ? "paid" : "not_paid",
      notifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      rawStatusMessage: body.status_message || ""
    }, { merge: true });

    if (isPaid) {
      await db.collection("users").doc(order.uid).set({
        role: "premium",
        premium: true,
        premiumProvider: "payhere",
        premiumOrderId: orderId,
        premiumUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    res.status(200).send("OK");
  } catch (error) {
    logger.error("Unable to process PayHere notify.", error);
    res.status(400).send("Unable to process notify");
  }
});

