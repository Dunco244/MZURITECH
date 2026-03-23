/**
 * Payment Routes — MzuriTech
 * Handles Stripe and M-Pesa STK Push
 *
 * UPDATES:
 *  1. M-Pesa STK push, query, and status routes support guest orders (optionalAuth)
 *  2. M-Pesa callback sends confirmation email to guests via order.guestEmail
 *  3. Auto-cancel timeout: if M-Pesa order not paid in 5 min, cancel it
 *  4. Socket.io emits real-time order updates to admin dashboard
 *  5. Stripe webhook auto-cancels on payment_intent.payment_failed
 */

const express = require('express');
const router  = express.Router();
const Stripe  = require('stripe');
const { body, validationResult } = require('express-validator');
const Order   = require('../models/Order');
const Product = require('../models/Product');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');
const jwt     = require('jsonwebtoken');
const { sendOrderConfirmation, sendPaymentConfirmation } = require('../services/emailService');
const { awardOrderPoints } = require('../services/rewardsService');

// ── Stripe ────────────────────────────────────────────────────────────────────
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// ── M-Pesa config ─────────────────────────────────────────────────────────────
const isSandbox = (process.env.MPESA_ENVIRONMENT || 'sandbox') !== 'production';

const MPESA = {
  consumerKey:    process.env.MPESA_CONSUMER_KEY    || '',
  consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
  shortCode:      process.env.MPESA_SHORT_CODE      || '174379',
  passkey: isSandbox
    ? 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'
    : (process.env.MPESA_PASSKEY || ''),
  callbackUrl: process.env.MPESA_CALLBACK_URL || 'https://YOUR_NGROK_URL/api/payment/mpesa/callback',
  baseUrl: isSandbox
    ? 'https://sandbox.safaricom.co.ke'
    : 'https://api.safaricom.co.ke',
};

// ── optionalAuth — sets req.user if token present, never blocks guests ────────
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token   = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user    = await User.findById(decoded.id).select('-password');
      if (user) req.user = user;
    }
  } catch {
    // Invalid/expired token — treat as guest, never block
  }
  next();
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatKenyanPhone(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if (digits.startsWith('0')   && digits.length === 10) return '254' + digits.slice(1);
  if (digits.length === 9)                               return '254' + digits;
  throw new Error(`Invalid Kenyan phone number: ${raw}`);
}

function mpesaTimestamp() {
  return new Date()
    .toISOString()
    .replace(/[-T:.Z]/g, '')
    .slice(0, 14);
}

async function getMpesaToken() {
  const auth = Buffer.from(`${MPESA.consumerKey}:${MPESA.consumerSecret}`).toString('base64');
  const res  = await fetch(
    `${MPESA.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );
  if (!res.ok) throw new Error(`M-Pesa auth failed: ${res.status} ${res.statusText}`);
  const data = await res.json();
  if (!data.access_token) throw new Error(`M-Pesa auth error: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function initiateStkPush({ phone, amount, orderId, orderNumber }) {
  const token     = await getMpesaToken();
  const timestamp = mpesaTimestamp();
  const password  = Buffer.from(`${MPESA.shortCode}${MPESA.passkey}${timestamp}`).toString('base64');

  const body = {
    BusinessShortCode: MPESA.shortCode,
    Password:          password,
    Timestamp:         timestamp,
    TransactionType:   'CustomerPayBillOnline',
    Amount:            Math.max(1, Math.floor(amount)),
    PartyA:            phone,
    PartyB:            MPESA.shortCode,
    PhoneNumber:       phone,
    CallBackURL:       MPESA.callbackUrl,
    AccountReference:  orderNumber,
    TransactionDesc:   `MzuriTech Order ${orderNumber}`,
  };

  const res = await fetch(`${MPESA.baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  const data = await res.json();
  console.log('[M-Pesa STK Push response]', data);

  if (!res.ok || data.ResponseCode !== '0') {
    const msg = data.errorMessage || data.ResponseDescription || 'STK Push failed';
    throw new Error(msg);
  }

  return data;
}

async function queryStkStatus(checkoutRequestId) {
  const token     = await getMpesaToken();
  const timestamp = mpesaTimestamp();
  const password  = Buffer.from(`${MPESA.shortCode}${MPESA.passkey}${timestamp}`).toString('base64');

  const res = await fetch(`${MPESA.baseUrl}/mpesa/stkpushquery/v1/query`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: MPESA.shortCode,
      Password:          password,
      Timestamp:         timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
  });

  return res.json();
}

// ── Helper: emit Socket.io event to admin ─────────────────────────────────────
function emitOrderUpdate(req, order) {
  try {
    const io = req.app.get('io');
    if (io) {
      io.emit('order:updated', {
        _id:           order._id,
        orderNumber:   order.orderNumber,
        status:        order.status,
        isPaid:        order.isPaid,
        paymentMethod: order.paymentMethod,
        totalPrice:    order.totalPrice,
      });
      console.log(`[Socket.io] Emitted order:updated for ${order.orderNumber}`);
    }
  } catch (e) {
    console.error('[Socket.io emit error]', e.message);
  }
}

// ── Helper: cancel order and emit ─────────────────────────────────────────────
async function cancelOrderOnFailure(order, reason, req) {
  order.status = 'cancelled';
  order.paymentResult = {
    ...order.paymentResult,
    status:     'failed',
    error:      reason,
    updateTime: new Date().toISOString(),
  };
  await order.save();
  if (req) emitOrderUpdate(req, order);
  console.warn(`[Payment] ❌ Order ${order.orderNumber} cancelled: ${reason}`);
}

// ── Helper: mark M-Pesa order paid (idempotent) ─────────────────────────────
async function markMpesaPaid({ order, req, receiptNum, amountPaid, phonePaid }) {
  if (!order || order.isPaid) return false;

  order.isPaid  = true;
  order.paidAt  = new Date();
  order.status  = 'processing';
  order.paymentResult = {
    id:          receiptNum || order.paymentResult?.id,
    type:        'mpesa',
    status:      'succeeded',
    phoneNumber: phonePaid?.toString() || order.paymentResult?.phoneNumber,
    amount:      amountPaid,
    updateTime:  new Date().toISOString(),
  };
  await order.save();

  emitOrderUpdate(req, order);

  // Deduct stock (only once because of isPaid guard above)
  for (const item of order.orderItems) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stockQuantity: -item.quantity },
    });
  }

  // Send payment confirmation email (guests and users)
  const recipient = await resolveEmailRecipient(order);
  if (recipient) {
    sendPaymentConfirmation(order, recipient, receiptNum || order.paymentResult?.id).catch(err =>
      console.error('⚠️  M-Pesa payment confirmation email failed:', err.message)
    );
  }

  // Award loyalty points for registered users (non-blocking)
  awardOrderPoints(order).catch(err =>
    console.error('⚠️  M-Pesa points award failed:', err.message)
  );

  return true;
}

// ── Helper: resolve email recipient for any order (user or guest) ─────────────
async function resolveEmailRecipient(order) {
  if (order.isGuestOrder) {
    if (!order.guestEmail) return null;
    return {
      name:  order.shippingAddress?.fullName || 'Customer',
      email: order.guestEmail,
    };
  }
  // Registered user
  if (order.user) {
    const user = await User.findById(order.user).select('name email');
    if (user) return { name: user.name, email: user.email };
  }
  return null;
}

// ── Validation middleware ──────────────────────────────────────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// ═════════════════════════════════════════════════════════════════════════════
//  ROUTES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/payment/mpesa/stkpush
 * Initiate M-Pesa STK Push — works for guests AND logged-in users
 */
router.post(
  '/mpesa/stkpush',
  optionalAuth,                          // ← was: protect (blocked guests)
  [
    body('orderId').notEmpty().withMessage('orderId is required'),
    body('phoneNumber').notEmpty().withMessage('phoneNumber is required'),
  ],
  validate,
  async (req, res) => {
    try {
      const { orderId, phoneNumber } = req.body;

      let phone;
      try {
        phone = formatKenyanPhone(phoneNumber);
      } catch {
        return res.status(400).json({
          success: false,
          message: `Invalid phone number: ${phoneNumber}. Use format +254XXXXXXXXX`,
        });
      }

      // Find order — for guests match by _id only; for users also verify ownership
      const query = req.user
        ? { _id: orderId, user: req.user.id }
        : { _id: orderId };

      const order = await Order.findOne(query);
      if (!order)       return res.status(404).json({ success: false, message: 'Order not found' });
      if (order.isPaid) return res.status(400).json({ success: false, message: 'Order is already paid' });

      if (MPESA.callbackUrl.includes('YOUR_NGROK') || MPESA.callbackUrl.includes('localhost')) {
        console.warn('[M-Pesa] WARNING: Callback URL is not publicly accessible.');
      }

      const mpesaData = await initiateStkPush({
        phone,
        amount:      order.totalPrice,
        orderId:     order._id.toString(),
        orderNumber: order.orderNumber,
      });

      order.paymentResult = {
        id:          mpesaData.CheckoutRequestID,
        type:        'mpesa',
        status:      'pending',
        phoneNumber: phone,
        updateTime:  new Date().toISOString(),
      };
      await order.save();

      // Auto-cancel if not paid within 5 minutes
      setTimeout(async () => {
        try {
          const freshOrder = await Order.findById(order._id);
          if (freshOrder && !freshOrder.isPaid && freshOrder.status !== 'cancelled') {
            await cancelOrderOnFailure(freshOrder, 'M-Pesa payment timed out (5 min)', req);
          }
        } catch (e) {
          console.error('[Auto-cancel error]', e.message);
        }
      }, 5 * 60 * 1000);

      res.json({
        success:           true,
        message:           'STK Push sent to your phone. Enter your M-Pesa PIN to complete payment.',
        checkoutRequestId: mpesaData.CheckoutRequestID,
      });
    } catch (err) {
      console.error('[M-Pesa STK Push error]', err.message);
      res.status(500).json({ success: false, message: err.message || 'M-Pesa payment failed' });
    }
  }
);

/**
 * POST /api/payment/mpesa/query
 * Poll STK Push status — works for guests AND logged-in users
 */
router.post(
  '/mpesa/query',
  optionalAuth,                          // ← was: protect (blocked guests)
  [body('orderId').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const query = req.user
        ? { _id: req.body.orderId, user: req.user.id }
        : { _id: req.body.orderId };

      const order = await Order.findOne(query);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      if (order.isPaid) {
        return res.json({ success: true, status: 'paid', isPaid: true });
      }

      const checkoutRequestId = order.paymentResult?.id;
      if (!checkoutRequestId) {
        return res.status(400).json({ success: false, message: 'No pending M-Pesa transaction' });
      }

      const queryResult = await queryStkStatus(checkoutRequestId);
      console.log('[M-Pesa query result]', queryResult);

      const resultCode = parseInt(queryResult.ResultCode ?? queryResult.errorCode ?? '-1');

      if (resultCode === 0) {
        // ✅ Mark as paid if callback didn't arrive
        await markMpesaPaid({ order, req });
        return res.json({ success: true, status: 'paid', isPaid: true });
      } else if (resultCode === 1032) {
        if (order.status !== 'cancelled') {
          await cancelOrderOnFailure(order, 'User cancelled M-Pesa payment', req);
        }
        return res.json({ success: true, status: 'cancelled', isPaid: false, message: 'Payment was cancelled' });
      } else if (resultCode === 1037) {
        if (order.status !== 'cancelled') {
          await cancelOrderOnFailure(order, 'M-Pesa payment request timed out', req);
        }
        return res.json({ success: true, status: 'timeout', isPaid: false, message: 'Payment request timed out' });
      } else if (resultCode === -1 || queryResult.errorCode) {
        return res.json({ success: true, status: 'pending', isPaid: false });
      } else {
        if (order.status !== 'cancelled') {
          await cancelOrderOnFailure(order, queryResult.ResultDesc || 'Payment failed', req);
        }
        return res.json({ success: true, status: 'failed', isPaid: false, message: queryResult.ResultDesc || 'Payment failed' });
      }
    } catch (err) {
      console.error('[M-Pesa query error]', err.message);
      res.status(500).json({ success: false, message: 'Error querying payment status' });
    }
  }
);

/**
 * POST /api/payment/mpesa/callback
 * Safaricom calls this after STK Push completes
 * Sends confirmation email to both guests and registered users
 */
router.post('/mpesa/callback', async (req, res) => {
  // Always respond 200 immediately so Safaricom doesn't retry
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

  try {
    const result = req.body?.Body?.stkCallback;
    if (!result) return console.warn('[M-Pesa callback] Missing stkCallback in body');

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = result;
    console.log(`[M-Pesa callback] RequestID: ${CheckoutRequestID} | Code: ${ResultCode} | ${ResultDesc}`);

    const order = await Order.findOne({ 'paymentResult.id': CheckoutRequestID });
    if (!order) return console.warn('[M-Pesa callback] No order for CheckoutRequestID:', CheckoutRequestID);

    if (ResultCode === 0) {
      // ✅ Payment successful
      const items      = CallbackMetadata?.Item || [];
      const receiptNum = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
      const amountPaid = items.find(i => i.Name === 'Amount')?.Value;
      const phonePaid  = items.find(i => i.Name === 'PhoneNumber')?.Value;

      await markMpesaPaid({
        order,
        req,
        receiptNum: receiptNum || CheckoutRequestID,
        amountPaid,
        phonePaid,
      });

      console.log(`[M-Pesa callback] ✅ Order ${order.orderNumber} paid — receipt ${receiptNum}`);
    } else {
      // Payment failed — auto-cancel order
      await cancelOrderOnFailure(order, ResultDesc || 'M-Pesa payment failed', req);
    }
  } catch (err) {
    console.error('[M-Pesa callback error]', err);
  }
});

/**
 * GET /api/payment/mpesa/status/:orderId
 * Simple status check for frontend polling — works for guests AND logged-in users
 */
router.get(
  '/mpesa/status/:orderId',
  optionalAuth,                          // ← was: protect (blocked guests)
  async (req, res) => {
    try {
      const query = req.user
        ? { _id: req.params.orderId, user: req.user.id }
        : { _id: req.params.orderId };

      const order = await Order.findOne(query);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      res.json({
        success:       true,
        isPaid:        order.isPaid,
        status:        order.status,
        paymentStatus: order.paymentResult?.status || 'none',
        orderStatus:   order.status,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error checking status' });
    }
  }
);

// ── Stripe routes ─────────────────────────────────────────────────────────────

router.post('/create-payment-intent', protect,
  [body('orderId').notEmpty()], validate,
  async (req, res) => {
    try {
      if (!stripe) return res.status(503).json({ success: false, message: 'Stripe not configured' });
      const order = await Order.findOne({ _id: req.body.orderId, user: req.user.id });
      if (!order)       return res.status(404).json({ success: false, message: 'Order not found' });
      if (order.isPaid) return res.status(400).json({ success: false, message: 'Already paid' });

      const intent = await stripe.paymentIntents.create({
        amount:   Math.round(order.totalPrice * 100),
        currency: 'kes',
        metadata: { orderId: order._id.toString(), orderNumber: order.orderNumber },
      });

      res.json({ success: true, clientSecret: intent.client_secret, paymentIntentId: intent.id });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error creating payment intent' });
    }
  }
);

/**
 * POST /api/payment/webhook
 * Stripe webhook — handles success and failure
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.status(503).send();
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === 'payment_intent.succeeded') {
      const pi    = event.data.object;
      const order = await Order.findById(pi.metadata.orderId);
      if (order && !order.isPaid) {
        order.isPaid  = true;
        order.paidAt  = new Date();
        order.status  = 'processing';
        order.paymentResult = {
          id:         pi.id,
          type:       'stripe',
          status:     'succeeded',
          updateTime: new Date().toISOString(),
        };
        await order.save();

        emitOrderUpdate(req, order);

        for (const item of order.orderItems) {
          await Product.findByIdAndUpdate(item.product, { $inc: { stockQuantity: -item.quantity } });
        }

        // ✅ Send payment confirmation email — guests and users
        const recipient = await resolveEmailRecipient(order);
        if (recipient) {
          sendPaymentConfirmation(order, recipient, pi.id).catch(err =>
            console.error('⚠️  Stripe payment confirmation email failed:', err.message)
          );
        }

        // ✅ Award loyalty points for registered users (non-blocking)
        awardOrderPoints(order).catch(err =>
          console.error('⚠️  Stripe points award failed:', err.message)
        );

        console.log(`[Stripe] ✅ Order ${order.orderNumber} paid`);
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const pi    = event.data.object;
      const order = await Order.findById(pi.metadata.orderId);
      if (order && !order.isPaid && order.status !== 'cancelled') {
        const reason = pi.last_payment_error?.message || 'Card payment failed';
        await cancelOrderOnFailure(order, reason, req);
        console.warn(`[Stripe] ❌ Order ${order.orderNumber} cancelled: ${reason}`);
      }
    }

    res.json({ received: true });
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

router.post('/confirm-order', protect, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.body.orderId, user: req.user.id });
    if (!order)       return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.isPaid) return res.status(400).json({ success: false, message: 'Already paid' });

    order.isPaid  = true;
    order.paidAt  = new Date();
    order.status  = 'processing';
    await order.save();

    emitOrderUpdate(req, order);

    for (const item of order.orderItems) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stockQuantity: -item.quantity } });
    }

    const recipient = await resolveEmailRecipient(order);
    if (recipient) await sendOrderConfirmation(order, recipient);

    // ✅ Award loyalty points for registered users (non-blocking)
    awardOrderPoints(order).catch(err =>
      console.error('⚠️  Confirm-order points award failed:', err.message)
    );

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error confirming order' });
  }
});

module.exports = router;
