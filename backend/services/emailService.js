/**
 * Email Service — MzuriTech
 * Handles all transactional emails via Brevo (formerly Sendinblue)
 */

const SibApiV3Sdk = require('@getbrevo/brevo');

// ─────────────────────────────────────────────────────────────
// Brevo API Setup
// ─────────────────────────────────────────────────────────────
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
apiInstance.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

console.log('📧 Using Brevo transporter');
if (!process.env.BREVO_API_KEY) {
  console.warn('⚠️  BREVO_API_KEY is not set. Email sending will fail.');
}

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const SUPPORT    = process.env.FROM_EMAIL  || 'support@mzuritech.com';
const FROM_NAME  = process.env.FROM_NAME   || 'MzuriTech';
const FROM_EMAIL = process.env.FROM_EMAIL  || 'noreply@mzuritech.com';
const YEAR       = new Date().getFullYear();

// ─────────────────────────────────────────────────────────────
// Core send function — replaces transporter.sendMail()
// ─────────────────────────────────────────────────────────────
const sendMail = async ({ to, subject, html }) => {
  const email = new SibApiV3Sdk.SendSmtpEmail();
  email.subject     = subject;
  email.htmlContent = html;
  email.sender      = { name: FROM_NAME, email: FROM_EMAIL };
  email.to          = [{ email: to }];

  try {
    const result = await apiInstance.sendTransacEmail(email);
    return result;
  } catch (error) {
    const brevoDetails = error?.response?.body || error?.response?.text || error?.message || error;
    console.error('❌ Brevo sendTransacEmail failed:', brevoDetails);
    throw error;
  }
};

// Simple test email for debugging deployments
exports.sendTestEmail = async ({ to }) => {
  const body = `
    <tr><td style="padding:32px 40px;text-align:center;">
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Brevo Test Email</h2>
      <p style="margin:0;color:#6b7280;font-size:14px;">If you can read this, Brevo is working.</p>
    </td></tr>`;
  await sendMail({ to, subject: '✅ Brevo Test Email | MzuriTech', html: wrapEmail(body) });
  return true;
};

// ─────────────────────────────────────────────────────────────
// Shared header / footer
// ─────────────────────────────────────────────────────────────
const emailHeader = `
  <tr>
    <td style="background:linear-gradient(135deg,#1a3faa,#2563eb);padding:32px 40px;text-align:center;">
      <p style="margin:0;font-size:22px;font-weight:700;color:#fff;">
        <span style="background:rgba(255,255,255,0.18);border-radius:8px;padding:4px 12px;margin-right:8px;">M</span>
        MzuriTech
      </p>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.72);font-size:13px;">Electronics &amp; Tech Store · Nairobi, Kenya</p>
    </td>
  </tr>`;

const emailFooter = `
  <tr>
    <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:22px 40px;text-align:center;">
      <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.7;">
        Questions? Contact <a href="mailto:${SUPPORT}" style="color:#2563eb;text-decoration:none;">${SUPPORT}</a><br/>
        © ${YEAR} MzuriTech. All rights reserved.
      </p>
    </td>
  </tr>`;

const wrapEmail = (innerRows) => `
  <!DOCTYPE html><html lang="en">
  <head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
  <body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
      <tr><td align="center">
        <table width="100%" cellpadding="0" cellspacing="0"
          style="max-width:620px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          ${emailHeader}
          ${innerRows}
          ${emailFooter}
        </table>
      </td></tr>
    </table>
  </body></html>`;

// ─────────────────────────────────────────────────────────────
// Delivery estimate helper
// ─────────────────────────────────────────────────────────────
function getDeliveryEstimate(city = '') {
  const nairobi = /nairobi|westlands|karen|kilimani|lavington|kiambu|ruiru|thika|juja/i.test(city);
  function addBusinessDays(date, days) {
    let d = new Date(date); let added = 0;
    while (added < days) { d.setDate(d.getDate() + 1); const w = d.getDay(); if (w !== 0 && w !== 6) added++; }
    return d;
  }
  const fmt = (d) => d.toLocaleDateString('en-KE', { weekday:'long', day:'numeric', month:'long' });
  const now = new Date();
  return {
    earliest:  fmt(addBusinessDays(now, nairobi ? 1 : 3)),
    latest:    fmt(addBusinessDays(now, nairobi ? 2 : 5)),
    range:     nairobi ? '1–2 business days' : '3–5 business days',
    isNairobi: nairobi,
  };
}


// ═════════════════════════════════════════════════════════════
//  1. PASSWORD RESET
// ═════════════════════════════════════════════════════════════
exports.sendPasswordReset = async (user, resetToken) => {
  const resetURL = `${CLIENT_URL}/reset-password/${resetToken}`;
  const body = `
    <tr><td style="padding:40px;">
      <h2 style="margin:0 0 10px;font-size:22px;font-weight:700;color:#111827;">Reset Your Password</h2>
      <p style="margin:0 0 8px;color:#374151;font-size:15px;">Dear ${user.name},</p>
      <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.7;">
        We received a request to reset your MzuriTech password. Click below to set a new one.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${resetURL}" style="display:inline-block;background:linear-gradient(135deg,#1a3faa,#2563eb);color:#fff;text-decoration:none;padding:15px 40px;border-radius:8px;font-size:16px;font-weight:600;">
          → Reset My Password
        </a>
      </div>
      <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin:24px 0;">
        <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">
          ⏰ <strong>This link expires in 15 minutes.</strong><br/>
          If you didn't request this, ignore this email — your password stays unchanged.
        </p>
      </div>
      <p style="color:#9ca3af;font-size:12px;margin:24px 0 0;line-height:1.6;">
        Button not working? Copy this link:<br/>
        <a href="${resetURL}" style="color:#2563eb;word-break:break-all;">${resetURL}</a>
      </p>
    </td></tr>`;
  try {
    if (process.env.NODE_ENV !== 'test') {
      await sendMail({ to: user.email, subject: '🔐 Reset Your MzuriTech Password', html: wrapEmail(body) });
      console.log(`✅ Password reset email → ${user.email}`);
    }
    return true;
  } catch (e) { console.error('❌ Password reset email failed:', e.message); return false; }
};


// ═════════════════════════════════════════════════════════════
//  2. ORDER CONFIRMATION
// ═════════════════════════════════════════════════════════════
exports.sendOrderConfirmation = async (order, recipient) => {
  const { name, email } = recipient;
  const isGuest   = order.isGuestOrder;
  const trackUrl  = `${CLIENT_URL}/track-order?order=${order.orderNumber}`;
  const ordersUrl = `${CLIENT_URL}/orders`;
  const shopUrl   = `${CLIENT_URL}/shop`;
  const paymentLabel = { cod: 'Cash on Delivery', mpesa: 'M-Pesa' }[order.paymentMethod] || order.paymentMethod;
  const shippingCost = order.shippingPrice || 0;
  const subtotal     = order.itemsPrice || (order.totalPrice - shippingCost);

  const itemRows = order.orderItems.map(item => `
    <tr>
      <td style="padding:11px 8px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;">${item.name}</td>
      <td style="padding:11px 8px;border-bottom:1px solid #f3f4f6;text-align:center;font-size:14px;color:#6b7280;">${item.quantity}</td>
      <td style="padding:11px 8px;border-bottom:1px solid #f3f4f6;text-align:right;font-size:14px;font-weight:600;color:#111827;">KES ${(item.price * item.quantity).toLocaleString()}</td>
    </tr>`).join('');

  const body = `
    <tr><td style="padding:30px 40px 0;text-align:center;">
      <div style="width:64px;height:64px;background:#dcfce7;border-radius:50%;margin:0 auto 14px;line-height:64px;font-size:32px;">✅</div>
      <h2 style="margin:0 0 6px;font-size:24px;font-weight:700;color:#111827;">Order Confirmed!</h2>
      <p style="margin:0;color:#6b7280;font-size:14px;">Hi ${name}, we've received your order and will begin processing it shortly.</p>
    </td></tr>
    <tr><td style="padding:22px 40px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        ${[
          ['Order Number', `<strong>${order.orderNumber}</strong>`],
          ['Order Date',   new Date(order.createdAt).toLocaleDateString('en-KE', { day:'numeric', month:'long', year:'numeric' })],
          ['Payment',      paymentLabel],
          ['Status',       `<span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">${order.status}</span>`],
        ].map(([l, v]) => `<tr><td style="padding:13px 18px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;font-weight:600;">${l}</td><td style="padding:13px 18px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;color:#111827;">${v}</td></tr>`).join('')}
      </table>
    </td></tr>
    ${order.paymentMethod === 'cod' ? `<tr><td style="padding:16px 40px 0;"><div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:13px 18px;"><p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">💵 <strong>Cash on Delivery:</strong> Please have <strong>KES ${order.totalPrice.toLocaleString()}</strong> ready when your order arrives.</p></div></td></tr>` : ''}
    ${order.paymentMethod === 'mpesa' ? `<tr><td style="padding:16px 40px 0;"><div style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:10px;padding:13px 18px;"><p style="margin:0;color:#065f46;font-size:13px;line-height:1.6;">📱 <strong>M-Pesa STK Push</strong> sent to your phone. Enter your PIN to complete payment.</p></div></td></tr>` : ''}
    <tr><td style="padding:22px 40px 0;">
      <h3 style="margin:0 0 12px;font-size:15px;font-weight:700;color:#111827;">Items Ordered</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
        <thead><tr style="background:#f9fafb;"><th style="padding:9px 8px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Product</th><th style="padding:9px 8px;text-align:center;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Qty</th><th style="padding:9px 8px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Total</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;">
        <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Subtotal</td><td style="padding:4px 0;text-align:right;font-size:13px;color:#374151;">KES ${subtotal.toLocaleString()}</td></tr>
        <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Shipping</td><td style="padding:4px 0;text-align:right;font-size:13px;color:${shippingCost === 0 ? '#16a34a' : '#374151'};">${shippingCost === 0 ? 'Free' : `KES ${shippingCost.toLocaleString()}`}</td></tr>
        <tr><td style="padding:10px 0 4px;font-size:16px;font-weight:700;color:#111827;border-top:2px solid #e5e7eb;">Total</td><td style="padding:10px 0 4px;text-align:right;font-size:18px;font-weight:700;color:#1a3faa;border-top:2px solid #e5e7eb;">KES ${order.totalPrice.toLocaleString()}</td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:22px 40px 0;">
      <h3 style="margin:0 0 10px;font-size:15px;font-weight:700;color:#111827;">Delivering To</h3>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;">
        <p style="margin:0 0 4px;font-weight:600;font-size:14px;color:#111827;">${order.shippingAddress.fullName || name}</p>
        <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.7;">
          ${order.shippingAddress.street || order.shippingAddress.address || ''}<br/>
          ${order.shippingAddress.city}${order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ''} ${order.shippingAddress.zipCode || order.shippingAddress.postalCode || ''}<br/>
          ${order.shippingAddress.country || 'Kenya'}
          ${order.shippingAddress.phone    ? `<br/>📞 ${order.shippingAddress.phone}` : ''}
          ${order.shippingAddress.landmark ? `<br/>📍 Near: ${order.shippingAddress.landmark}` : ''}
        </p>
      </div>
    </td></tr>
    <tr><td style="padding:26px 40px 32px;text-align:center;">
      ${isGuest
        ? `<a href="${trackUrl}" style="display:inline-block;background:linear-gradient(135deg,#1a3faa,#2563eb);color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:15px;font-weight:600;margin:0 6px 8px;">📦 Track My Order</a><a href="${CLIENT_URL}/register" style="display:inline-block;background:#fff;color:#1a3faa;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;border:2px solid #1a3faa;margin:0 6px 8px;">Create Account</a>`
        : `<a href="${ordersUrl}" style="display:inline-block;background:linear-gradient(135deg,#1a3faa,#2563eb);color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:15px;font-weight:600;margin:0 6px 8px;">📦 View My Orders</a><a href="${shopUrl}" style="display:inline-block;background:#fff;color:#1a3faa;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;border:2px solid #1a3faa;margin:0 6px 8px;">Continue Shopping</a>`}
    </td></tr>`;

  try {
    if (process.env.NODE_ENV !== 'test') {
      await sendMail({ to: email, subject: `✅ Order Confirmed — ${order.orderNumber} | MzuriTech`, html: wrapEmail(body) });
      console.log(`✅ Order confirmation email → ${email} (${isGuest ? 'guest' : 'user'})`);
    }
    return true;
  } catch (e) { console.error('❌ Order confirmation email failed:', e.message); return false; }
};


// ═════════════════════════════════════════════════════════════
//  3. PAYMENT CONFIRMATION
// ═════════════════════════════════════════════════════════════
exports.sendPaymentConfirmation = async (order, recipient, receiptNumber) => {
  const { name, email } = recipient;
  const isGuest   = order.isGuestOrder;
  const ordersUrl = `${CLIENT_URL}/orders`;
  const shopUrl   = `${CLIENT_URL}/shop`;
  const isMpesa   = order.paymentMethod === 'mpesa';
  const city      = order.shippingAddress?.city || '';
  const estimate  = getDeliveryEstimate(city);
  const paidAt    = new Date().toLocaleString('en-KE', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });

  const itemRows = order.orderItems.map(item => `
    <tr>
      <td style="padding:11px 8px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;">${item.name}</td>
      <td style="padding:11px 8px;border-bottom:1px solid #f3f4f6;text-align:center;font-size:14px;color:#6b7280;">${item.quantity}</td>
      <td style="padding:11px 8px;border-bottom:1px solid #f3f4f6;text-align:right;font-size:14px;font-weight:600;color:#111827;">KES ${(item.price * item.quantity).toLocaleString()}</td>
    </tr>`).join('');

  const body = `
    <tr><td style="background:linear-gradient(135deg,#065f46,#059669);padding:32px 40px;text-align:center;">
      <div style="width:72px;height:72px;background:rgba(255,255,255,0.18);border-radius:50%;margin:0 auto 14px;line-height:72px;font-size:38px;">💚</div>
      <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#fff;">${isMpesa ? 'M-Pesa Payment Confirmed!' : 'Payment Successful!'}</h1>
      <p style="margin:0;color:rgba(255,255,255,0.88);font-size:15px;line-height:1.6;">Thank you, <strong>${name}</strong>!<br/>Your payment has been received and your order is now being processed.</p>
    </td></tr>
    <tr><td style="padding:26px 40px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:18px 22px;">
          <p style="margin:0 0 14px;font-size:12px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.06em;">${isMpesa ? '📱 M-Pesa Receipt' : '💳 Payment Receipt'}</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${receiptNumber ? `<tr><td style="padding:5px 0;font-size:13px;color:#6b7280;">Transaction ID</td><td style="padding:5px 0;font-size:13px;font-weight:700;color:#111827;text-align:right;">${receiptNumber}</td></tr>` : ''}
            <tr><td style="padding:5px 0;font-size:13px;color:#6b7280;">Order Number</td><td style="padding:5px 0;font-size:13px;font-weight:700;color:#111827;text-align:right;">${order.orderNumber}</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#6b7280;">Amount Paid</td><td style="padding:5px 0;font-size:16px;font-weight:800;color:#059669;text-align:right;">KES ${order.totalPrice.toLocaleString()}</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#6b7280;">Paid At</td><td style="padding:5px 0;font-size:13px;color:#374151;text-align:right;">${paidAt}</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#6b7280;">Status</td><td style="padding:5px 0;text-align:right;"><span style="background:#dcfce7;color:#166534;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">✅ Paid</span></td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:20px 40px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #bfdbfe;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:.06em;">🚚 Estimated Delivery</p>
          <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#1e3a8a;">${estimate.earliest}</p>
          ${estimate.earliest !== estimate.latest ? `<p style="margin:0 0 8px;font-size:13px;color:#3b82f6;">to <strong>${estimate.latest}</strong></p>` : ''}
          <p style="margin:0;font-size:13px;color:#1d4ed8;line-height:1.5;">📍 Delivering to <strong>${order.shippingAddress.city}${order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ''}</strong> &nbsp;·&nbsp; ${estimate.range}</p>
          ${estimate.isNairobi ? `<p style="margin:8px 0 0;font-size:12px;color:#2563eb;">⚡ You're in our fast-delivery zone — expect your order soon!</p>` : `<p style="margin:8px 0 0;font-size:12px;color:#2563eb;">Our delivery partner will contact you before arrival.</p>`}
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:22px 40px 0;">
      <h3 style="margin:0 0 14px;font-size:15px;font-weight:700;color:#111827;">What happens next?</h3>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${[
          ['📦','Order Processing','Your items are being picked, packed, and quality-checked by our team.'],
          ['🚚','Out for Delivery',`Our rider will bring your order to ${order.shippingAddress.city}. Keep your phone nearby — they'll call before arrival.`],
          ['🎉','Delivered & Enjoyed','Sign off on delivery and enjoy your new tech. We hope to see you again!'],
        ].map(([icon,title,desc]) => `<tr><td style="padding:0 0 12px;"><table cellpadding="0" cellspacing="0"><tr><td style="width:38px;height:38px;background:#dbeafe;border-radius:50%;text-align:center;line-height:38px;font-size:18px;vertical-align:top;">${icon}</td><td style="padding-left:14px;vertical-align:top;"><p style="margin:0;font-size:14px;font-weight:600;color:#111827;">${title}</p><p style="margin:3px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">${desc}</p></td></tr></table></td></tr>`).join('')}
      </table>
    </td></tr>
    <tr><td style="padding:22px 40px 0;">
      <h3 style="margin:0 0 12px;font-size:15px;font-weight:700;color:#111827;">Your Order</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
        <thead><tr style="background:#f9fafb;"><th style="padding:9px 8px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Product</th><th style="padding:9px 8px;text-align:center;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Qty</th><th style="padding:9px 8px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Total</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;">
        <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Shipping</td><td style="padding:4px 0;text-align:right;font-size:13px;color:${order.shippingPrice === 0 ? '#16a34a' : '#374151'};">${order.shippingPrice === 0 ? 'Free' : `KES ${order.shippingPrice.toLocaleString()}`}</td></tr>
        <tr><td style="padding:10px 0 4px;font-size:16px;font-weight:700;color:#111827;border-top:2px solid #e5e7eb;">Total Paid</td><td style="padding:10px 0 4px;text-align:right;font-size:18px;font-weight:800;color:#059669;border-top:2px solid #e5e7eb;">KES ${order.totalPrice.toLocaleString()}</td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:18px 40px 0;">
      <h3 style="margin:0 0 10px;font-size:15px;font-weight:700;color:#111827;">Delivery Address</h3>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:15px 20px;">
        <p style="margin:0 0 3px;font-weight:600;font-size:14px;color:#111827;">${order.shippingAddress.fullName || name}</p>
        <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.7;">
          ${order.shippingAddress.street || order.shippingAddress.address || ''}<br/>
          ${order.shippingAddress.city}${order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ''} ${order.shippingAddress.zipCode || order.shippingAddress.postalCode || ''}<br/>
          ${order.shippingAddress.country || 'Kenya'}
          ${order.shippingAddress.phone    ? `<br/>📞 ${order.shippingAddress.phone}` : ''}
          ${order.shippingAddress.landmark ? `<br/>📍 Near: ${order.shippingAddress.landmark}` : ''}
        </p>
      </div>
    </td></tr>
    <tr><td style="padding:26px 40px 32px;text-align:center;">
      ${isGuest
        ? `<a href="${CLIENT_URL}/track-order?order=${order.orderNumber}" style="display:inline-block;background:linear-gradient(135deg,#1a3faa,#2563eb);color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:15px;font-weight:600;margin:0 6px 8px;">📦 Track My Order</a><a href="${shopUrl}" style="display:inline-block;background:#fff;color:#1a3faa;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;border:2px solid #1a3faa;margin:0 6px 8px;">Shop Again</a><p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">Want order history & faster checkout? <a href="${CLIENT_URL}/register" style="color:#2563eb;text-decoration:none;">Create a free account →</a></p>`
        : `<a href="${ordersUrl}" style="display:inline-block;background:linear-gradient(135deg,#1a3faa,#2563eb);color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:15px;font-weight:600;margin:0 6px 8px;">📦 View My Orders</a><a href="${shopUrl}" style="display:inline-block;background:#fff;color:#1a3faa;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;border:2px solid #1a3faa;margin:0 6px 8px;">Shop Again</a>`}
    </td></tr>`;

  try {
    if (process.env.NODE_ENV !== 'test') {
      await sendMail({ to: email, subject: `🎉 Payment Received — Your order is on its way! | ${order.orderNumber}`, html: wrapEmail(body) });
      console.log(`✅ Payment confirmation email → ${email} (${isGuest ? 'guest' : 'user'})`);
    }
    return true;
  } catch (e) { console.error('❌ Payment confirmation email failed:', e.message); return false; }
};


// ═════════════════════════════════════════════════════════════
//  4. WELCOME EMAIL
// ═════════════════════════════════════════════════════════════
exports.sendWelcomeEmail = async (user) => {
  const body = `
    <tr><td style="padding:40px;">
      <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">Welcome to MzuriTech, ${user.name}! 🎉</h2>
      <p style="margin:0 0 20px;color:#6b7280;font-size:15px;line-height:1.7;">Thank you for joining us. Your account is ready — here's what you can do:</p>
      <table width="100%" cellpadding="8" cellspacing="0" style="margin:0 0 28px;">
        ${[['🛒','Browse and purchase our wide range of electronics'],['❤️','Save favourite items to your wishlist'],['📦','Track your orders in real time'],['🎁','Earn and redeem loyalty rewards points']].map(([icon,text]) => `<tr><td style="background:#f9fafb;border-radius:8px;padding:12px 16px;font-size:14px;color:#374151;">${icon} ${text}</td></tr><tr><td style="height:6px;"></td></tr>`).join('')}
      </table>
      <div style="text-align:center;">
        <a href="${CLIENT_URL}/shop" style="display:inline-block;background:linear-gradient(135deg,#1a3faa,#2563eb);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:16px;font-weight:600;">→ Start Shopping</a>
      </div>
    </td></tr>`;
  try {
    if (process.env.NODE_ENV !== 'test') {
      await sendMail({ to: user.email, subject: '🎉 Welcome to MzuriTech!', html: wrapEmail(body) });
      console.log(`✅ Welcome email → ${user.email}`);
    }
    return true;
  } catch (e) { console.error('❌ Welcome email failed:', e.message); return false; }
};


// ═════════════════════════════════════════════════════════════
//  5. NEWSLETTER CONFIRMATION
// ═════════════════════════════════════════════════════════════
exports.sendNewsletterConfirmation = async (toEmail) => {
  const body = `
    <tr><td style="padding:40px;text-align:center;">
      <div style="width:64px;height:64px;background:#dcfce7;border-radius:50%;margin:0 auto 20px;line-height:64px;font-size:32px;">✅</div>
      <h2 style="margin:0 0 10px;font-size:24px;font-weight:700;color:#111827;">You're in the Tech Elite!</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.7;">Thanks for subscribing to MzuriTech.<br/>Exclusive deals, new arrivals, and tech tips are coming your way.</p>
      <table width="100%" cellpadding="8" cellspacing="0" style="margin:0 0 28px;text-align:left;">
        ${[['🔥','Exclusive Deals','Early access to flash sales and member-only discounts'],['📦','New Arrivals First','Be the first to know when new products land'],['💡','Tech Tips','Expert guides to get the most from your devices']].map(([icon,title,desc]) => `<tr><td style="background:#f9fafb;border-radius:8px;padding:12px 16px;font-size:14px;color:#374151;">${icon} <strong>${title}</strong> — ${desc}</td></tr><tr><td style="height:6px;"></td></tr>`).join('')}
      </table>
      <a href="${CLIENT_URL}/shop" style="display:inline-block;background:linear-gradient(135deg,#1a3faa,#2563eb);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:16px;font-weight:600;">→ Start Shopping</a>
      <p style="color:#9ca3af;font-size:12px;margin:20px 0 0;line-height:1.6;">You subscribed with <strong>${toEmail}</strong>. You can unsubscribe anytime.</p>
    </td></tr>`;
  try {
    if (process.env.NODE_ENV !== 'test') {
      await sendMail({ to: toEmail, subject: '🎉 Welcome to MzuriTech Newsletter!', html: wrapEmail(body) });
      console.log(`✅ Newsletter confirmation → ${toEmail}`);
    }
    return true;
  } catch (e) { console.error('❌ Newsletter confirmation failed:', e.message); return false; }
};


// ═════════════════════════════════════════════════════════════
//  6. DRIVER: New Job Available
// ═════════════════════════════════════════════════════════════
exports.sendDriverJobEmail = async ({ to, driverName, orderNumber, pickupAddress, deliveryCity, deliveryAddress, itemCount, orderValue }) => {
  const body = `
    <tr><td style="padding:30px 40px 0;text-align:center;">
      <div style="width:64px;height:64px;background:#dbeafe;border-radius:50%;margin:0 auto 14px;line-height:64px;font-size:32px;">📦</div>
      <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">New Delivery Job!</h2>
      <p style="margin:0;color:#6b7280;font-size:14px;">Hi ${driverName}, a new job is available in your zone. Be the first to accept!</p>
    </td></tr>
    <tr><td style="padding:22px 40px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:18px 22px;">
          <p style="margin:0 0 14px;font-size:12px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:.06em;">📋 Job Details</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${[
              ['Order Number', `<strong>#${orderNumber}</strong>`],
              ['Items',        `${itemCount} item(s)`],
              ['Order Value',  `<strong style="color:#059669;">KES ${Number(orderValue).toLocaleString()}</strong>`],
              ['Pickup From',  pickupAddress],
              ['Deliver To',   `${deliveryCity}${deliveryAddress ? ` — ${deliveryAddress}` : ''}`],
            ].map(([l,v]) => `<tr><td style="padding:6px 0;font-size:13px;color:#6b7280;width:120px;">${l}</td><td style="padding:6px 0;font-size:13px;color:#111827;text-align:right;">${v}</td></tr>`).join('')}
          </table>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:24px 40px 32px;text-align:center;">
      <a href="${CLIENT_URL}/driver/portal" style="display:inline-block;background:linear-gradient(135deg,#1a3faa,#2563eb);color:#fff;text-decoration:none;padding:15px 40px;border-radius:8px;font-size:16px;font-weight:700;box-shadow:0 4px 14px rgba(37,99,235,0.3);">
        🚚 Accept This Job
      </a>
      <p style="margin:14px 0 0;font-size:12px;color:#9ca3af;">⏳ First driver to accept gets the job. Don't wait!</p>
    </td></tr>`;
  try {
    if (process.env.NODE_ENV !== 'test') {
      await sendMail({ to, subject: `📦 New Delivery Job — Order #${orderNumber} in Your Zone | MzuriTech`, html: wrapEmail(body) });
      console.log(`✅ Driver job email → ${to}`);
    }
    return true;
  } catch (e) { console.error('❌ Driver job email failed:', e.message); return false; }
};


// ═════════════════════════════════════════════════════════════
//  7. DRIVER: Job Taken by Someone Else
// ═════════════════════════════════════════════════════════════
exports.sendJobTakenEmail = async ({ to, driverName, orderNumber }) => {
  const body = `
    <tr><td style="padding:40px;text-align:center;">
      <div style="width:56px;height:56px;background:#fef3c7;border-radius:50%;margin:0 auto 14px;line-height:56px;font-size:28px;">⚡</div>
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Job No Longer Available</h2>
      <p style="margin:0 0 16px;color:#6b7280;font-size:14px;line-height:1.6;">Hi ${driverName}, Order <strong>#${orderNumber}</strong> has been accepted by another driver.</p>
      <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin:0 0 24px;text-align:left;">
        <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">💡 <strong>Tip:</strong> Stay online and set yourself to <em>Available</em> — more jobs will be dispatched soon!</p>
      </div>
      <a href="${CLIENT_URL}/driver/portal" style="display:inline-block;background:linear-gradient(135deg,#1a3faa,#2563eb);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">Open Driver Portal</a>
    </td></tr>`;
  try {
    if (process.env.NODE_ENV !== 'test') {
      await sendMail({ to, subject: `Job Taken — Order #${orderNumber} | MzuriTech`, html: wrapEmail(body) });
      console.log(`✅ Job taken email → ${to}`);
    }
    return true;
  } catch (e) { console.error('❌ Job taken email failed:', e.message); return false; }
};


// ═════════════════════════════════════════════════════════════
//  8. CUSTOMER: Dispatched — includes 6-digit confirmation code
// ═════════════════════════════════════════════════════════════
exports.sendDispatchedEmail = async ({ to, customerName, orderNumber, driverName, driverPhone, vehicleType, licensePlate, estimatedDelivery, confirmationCode }) => {
  const body = `
    <tr><td style="padding:30px 40px 0;text-align:center;">
      <div style="width:64px;height:64px;background:#ede9fe;border-radius:50%;margin:0 auto 14px;line-height:64px;font-size:32px;">🚚</div>
      <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">Your Order Is On Its Way!</h2>
      <p style="margin:0;color:#6b7280;font-size:14px;">Hi ${customerName}, a driver has been assigned to your order.</p>
    </td></tr>
    <tr><td style="padding:22px 40px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:18px 22px;">
          <p style="margin:0 0 14px;font-size:12px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.06em;">🧑‍✈️ Your Delivery Driver</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${[
              ['Driver',  driverName],
              ['Phone',   `<a href="tel:${driverPhone}" style="color:#059669;text-decoration:none;font-weight:600;">📞 ${driverPhone}</a>`],
              ['Vehicle', `${vehicleType}${licensePlate ? ` · ${licensePlate}` : ''}`],
              ...(estimatedDelivery ? [['ETA', `<strong>${estimatedDelivery}</strong>`]] : []),
            ].map(([l,v]) => `<tr><td style="padding:6px 0;font-size:13px;color:#6b7280;width:120px;">${l}</td><td style="padding:6px 0;font-size:13px;color:#111827;text-align:right;">${v}</td></tr>`).join('')}
          </table>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:22px 40px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1a3faa,#2563eb);border-radius:16px;overflow:hidden;">
        <tr><td style="padding:28px 24px;text-align:center;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:.08em;">🔐 Delivery Confirmation Code</p>
          <p style="margin:0 0 16px;font-size:13px;color:rgba(255,255,255,0.7);line-height:1.5;">Show this code to the driver when they arrive at your door</p>
          <div style="background:rgba(255,255,255,0.15);border-radius:12px;padding:18px 24px;display:inline-block;">
            <span style="font-family:'Courier New',Courier,monospace;font-size:48px;font-weight:900;color:#ffffff;letter-spacing:14px;">${confirmationCode}</span>
          </div>
          <p style="margin:14px 0 0;font-size:12px;color:rgba(255,255,255,0.65);">⚠️ Do not share this code until the driver is at your door</p>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:20px 40px 0;">
      <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;">
        <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
          💡 <strong>How it works:</strong> When the driver arrives, they will ask for this 6-digit code and enter it in their app to confirm delivery. This keeps your order 100% secure.
        </p>
      </div>
    </td></tr>
    <tr><td style="padding:24px 40px 32px;text-align:center;">
      <a href="${CLIENT_URL}/track/${orderNumber}" style="display:inline-block;background:linear-gradient(135deg,#1a3faa,#2563eb);color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:15px;font-weight:600;">📦 Track My Order</a>
    </td></tr>`;
  try {
    if (process.env.NODE_ENV !== 'test') {
      await sendMail({ to, subject: `🚚 Order #${orderNumber} Is On Its Way! — Delivery Code Inside | MzuriTech`, html: wrapEmail(body) });
      console.log(`✅ Dispatched email → ${to}`);
    }
    return true;
  } catch (e) { console.error('❌ Dispatched email failed:', e.message); return false; }
};


// ═════════════════════════════════════════════════════════════
//  9. CUSTOMER: Delivered Successfully
// ═════════════════════════════════════════════════════════════
exports.sendDeliveredEmail = async ({ to, customerName, orderNumber, totalPrice }) => {
  const body = `
    <tr><td style="padding:30px 40px 0;text-align:center;">
      <div style="width:72px;height:72px;background:#dcfce7;border-radius:50%;margin:0 auto 16px;line-height:72px;font-size:38px;">🎉</div>
      <h2 style="margin:0 0 6px;font-size:24px;font-weight:800;color:#111827;">Successfully Delivered!</h2>
      <p style="margin:0;color:#6b7280;font-size:14px;">Hi ${customerName}, your order has arrived. Enjoy your new tech!</p>
    </td></tr>
    <tr><td style="padding:22px 40px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:18px 22px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${[
              ['Order',  `<strong>#${orderNumber}</strong>`],
              ['Status', `<span style="background:#dcfce7;color:#166534;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">✅ Delivered</span>`],
              ['Total',  `<strong style="color:#059669;font-size:16px;">KES ${Number(totalPrice).toLocaleString()}</strong>`],
            ].map(([l,v]) => `<tr><td style="padding:7px 0;font-size:13px;color:#6b7280;">${l}</td><td style="padding:7px 0;font-size:13px;color:#111827;text-align:right;">${v}</td></tr>`).join('')}
          </table>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:20px 40px 0;">
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;">
        <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#111827;">Any issues?</p>
        <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">Contact us within 24 hours at <a href="mailto:${SUPPORT}" style="color:#2563eb;">${SUPPORT}</a> and we'll make it right.</p>
      </div>
    </td></tr>
    <tr><td style="padding:26px 40px 32px;text-align:center;">
      <a href="${CLIENT_URL}/shop" style="display:inline-block;background:linear-gradient(135deg,#1a3faa,#2563eb);color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:15px;font-weight:600;margin:0 6px 8px;">🛒 Shop Again</a>
      <a href="${CLIENT_URL}/orders" style="display:inline-block;background:#fff;color:#1a3faa;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;border:2px solid #1a3faa;margin:0 6px 8px;">View Orders</a>
      <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">Thank you for shopping with MzuriTech!</p>
    </td></tr>`;
  try {
    if (process.env.NODE_ENV !== 'test') {
      await sendMail({ to, subject: `✅ Order #${orderNumber} Delivered! | MzuriTech`, html: wrapEmail(body) });
      console.log(`✅ Delivered email → ${to}`);
    }
    return true;
  } catch (e) { console.error('❌ Delivered email failed:', e.message); return false; }
};


// ═════════════════════════════════════════════════════════════
//  10. ADMIN: New Driver Registration Alert
// ═════════════════════════════════════════════════════════════
exports.sendNewDriverAlertEmail = async ({ driverName, driverEmail, zone, vehicleType }) => {
  const body = `
    <tr><td style="padding:40px;">
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">New Driver Registered</h2>
      <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">A new driver account has been created and is ready to take deliveries.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:24px;">
        ${[['Name',driverName],['Email',driverEmail],['Zone',zone],['Vehicle',vehicleType]].map(([l,v]) => `<tr><td style="padding:12px 18px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;font-weight:600;">${l}</td><td style="padding:12px 18px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;color:#111827;">${v}</td></tr>`).join('')}
      </table>
      <div style="text-align:center;">
        <a href="${CLIENT_URL}/admin" style="display:inline-block;background:linear-gradient(135deg,#1a3faa,#2563eb);color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:14px;font-weight:600;">Open Admin Dashboard</a>
      </div>
    </td></tr>`;
  try {
    if (process.env.NODE_ENV !== 'test') {
      const adminEmail = process.env.ADMIN_EMAIL || process.env.FROM_EMAIL;
      await sendMail({ to: adminEmail, subject: `🚗 New Driver — ${driverName} (${zone}) | MzuriTech`, html: wrapEmail(body) });
      console.log(`✅ New driver alert → ${adminEmail}`);
    }
    return true;
  } catch (e) { console.error('❌ New driver alert failed:', e.message); return false; }
};


// ═════════════════════════════════════════════════════════════
//  11. ADMIN: New Order Alert
// ═════════════════════════════════════════════════════════════
exports.sendAdminOrderAlert = async ({ order, customerName, customerEmail }) => {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.FROM_EMAIL;
  if (!adminEmail) {
    console.warn('⚠️  No ADMIN_EMAIL set — admin order alert skipped');
    return false;
  }

  const itemRows = order.orderItems.map(item => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;">${item.name}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;text-align:center;font-size:14px;color:#6b7280;">${item.quantity}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;text-align:right;font-size:14px;font-weight:600;color:#111827;">KES ${(item.price * item.quantity).toLocaleString()}</td>
    </tr>`).join('');

  const paymentLabel = { cod: 'Cash on Delivery', mpesa: 'M-Pesa' }[order.paymentMethod] || order.paymentMethod;
  const paymentSubjectLabel = { cod: 'COD', mpesa: 'M-Pesa' }[order.paymentMethod] || 'Order';
  const orderIdLabel = order.orderNumber || order._id.toString().slice(-8);
  const createdAt = new Date(order.createdAt).toLocaleString('en-KE', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });
  const ship = order.shippingAddress || {};

  const body = `
    <tr><td style="padding:30px 40px 0;text-align:center;">
      <div style="width:64px;height:64px;background:#dbeafe;border-radius:50%;margin:0 auto 14px;line-height:64px;font-size:32px;">🧾</div>
      <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">New Order Placed</h2>
      <p style="margin:0;color:#6b7280;font-size:14px;">Order <strong>#${orderIdLabel}</strong> has been placed.</p>
      <div style="display:inline-block;margin-top:10px;padding:6px 12px;border-radius:999px;background:#eef2ff;color:#3730a3;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;">
        ${paymentLabel}
      </div>
    </td></tr>
    <tr><td style="padding:22px 40px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        ${[
          ['Order', `<strong>#${orderIdLabel}</strong>`],
          ['Date', createdAt],
          ['Payment', paymentLabel],
          ['Total', `<strong>KES ${Number(order.totalPrice).toLocaleString()}</strong>`],
          ['Customer', `${customerName}${customerEmail ? ` — ${customerEmail}` : ''}`],
          ['Guest', order.isGuestOrder ? 'Yes' : 'No'],
        ].map(([l, v]) => `<tr><td style="padding:12px 18px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;font-weight:600;">${l}</td><td style="padding:12px 18px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;color:#111827;">${v}</td></tr>`).join('')}
      </table>
    </td></tr>
    <tr><td style="padding:22px 40px 0;">
      <h3 style="margin:0 0 12px;font-size:15px;font-weight:700;color:#111827;">Items</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
        <thead><tr style="background:#f9fafb;"><th style="padding:9px 8px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Product</th><th style="padding:9px 8px;text-align:center;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Qty</th><th style="padding:9px 8px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Total</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
    </td></tr>
    <tr><td style="padding:22px 40px 0;">
      <h3 style="margin:0 0 10px;font-size:15px;font-weight:700;color:#111827;">Shipping Address</h3>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;">
        <p style="margin:0 0 4px;font-weight:600;font-size:14px;color:#111827;">${ship.fullName || customerName}</p>
        <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.7;">
          ${ship.street || ship.address || ''}<br/>
          ${ship.city || ''}${ship.state ? `, ${ship.state}` : ''} ${ship.zipCode || ship.postalCode || ''}<br/>
          ${ship.country || 'Kenya'}
          ${ship.phone ? `<br/>📞 ${ship.phone}` : ''}
          ${ship.landmark ? `<br/>📍 Near: ${ship.landmark}` : ''}
        </p>
      </div>
    </td></tr>
    <tr><td style="padding:26px 40px 32px;text-align:center;">
      <a href="${CLIENT_URL}/admin" style="display:inline-block;background:linear-gradient(135deg,#1a3faa,#2563eb);color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:15px;font-weight:600;">Open Admin Dashboard</a>
    </td></tr>`;

  try {
    if (process.env.NODE_ENV !== 'test') {
      await sendMail({ to: adminEmail, subject: `🧾 New ${paymentSubjectLabel} Order — #${orderIdLabel} | MzuriTech`, html: wrapEmail(body) });
      console.log(`✅ Admin order alert → ${adminEmail}`);
    }
    return true;
  } catch (e) { console.error('❌ Admin order alert failed:', e.message); return false; }
};


// ═════════════════════════════════════════════════════════════
//  12. ADMIN: Delivery Failed Alert
// ═════════════════════════════════════════════════════════════
exports.sendAdminDeliveryFailedAlert = async ({ order, driver, reason }) => {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.FROM_EMAIL;
  if (!adminEmail) {
    console.warn('⚠️  No ADMIN_EMAIL set — admin delivery-failed alert skipped');
    return false;
  }

  const orderIdLabel = order?.orderNumber || order?._id?.toString()?.slice(-8) || 'Unknown';
  const failedAt = new Date().toLocaleString('en-KE', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });
  const ship = order?.shippingAddress || {};

  const body = `
    <tr><td style="padding:30px 40px 0;text-align:center;">
      <div style="width:64px;height:64px;background:#fee2e2;border-radius:50%;margin:0 auto 14px;line-height:64px;font-size:32px;">⚠️</div>
      <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">Delivery Failed</h2>
      <p style="margin:0;color:#6b7280;font-size:14px;">Driver reported failure for order <strong>#${orderIdLabel}</strong>.</p>
      <div style="display:inline-block;margin-top:10px;padding:6px 12px;border-radius:999px;background:#fef2f2;color:#b91c1c;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;">
        Action Needed
      </div>
    </td></tr>
    <tr><td style="padding:22px 40px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        ${[
          ['Order', `<strong>#${orderIdLabel}</strong>`],
          ['Reported At', failedAt],
          ['Driver', `${driver?.name || 'Unknown'}${driver?.phone ? ` — ${driver.phone}` : ''}`],
          ['Reason', reason || 'No reason provided'],
        ].map(([l, v]) => `<tr><td style="padding:12px 18px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;font-weight:600;">${l}</td><td style="padding:12px 18px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;color:#111827;">${v}</td></tr>`).join('')}
      </table>
    </td></tr>
    <tr><td style="padding:22px 40px 0;">
      <h3 style="margin:0 0 10px;font-size:15px;font-weight:700;color:#111827;">Delivery Address</h3>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;">
        <p style="margin:0 0 4px;font-weight:600;font-size:14px;color:#111827;">${ship.fullName || 'Customer'}</p>
        <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.7;">
          ${ship.street || ship.address || ''}<br/>
          ${ship.city || ''}${ship.state ? `, ${ship.state}` : ''} ${ship.zipCode || ship.postalCode || ''}<br/>
          ${ship.country || 'Kenya'}
          ${ship.phone ? `<br/>📞 ${ship.phone}` : ''}
        </p>
      </div>
    </td></tr>
    <tr><td style="padding:26px 40px 32px;text-align:center;">
      <a href="${CLIENT_URL}/admin" style="display:inline-block;background:linear-gradient(135deg,#b91c1c,#ef4444);color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:15px;font-weight:600;">Open Admin Dashboard</a>
    </td></tr>`;

  try {
    if (process.env.NODE_ENV !== 'test') {
      await sendMail({ to: adminEmail, subject: `⚠️ Delivery Failed — #${orderIdLabel} | MzuriTech`, html: wrapEmail(body) });
      console.log(`✅ Admin delivery-failed alert → ${adminEmail}`);
    }
    return true;
  } catch (e) { console.error('❌ Admin delivery-failed alert failed:', e.message); return false; }
};
