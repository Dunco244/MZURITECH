/**
 * Order Routes
 * Handles order creation and retrieval for customers
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Delivery = require('../models/Delivery');
const { protect, authorize } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendOrderConfirmation, sendAdminOrderAlert } = require('../services/emailService');
const { awardOrderPoints } = require('../services/rewardsService');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

/**
 * optionalAuth middleware
 * Like protect, but does NOT block the request if no token is provided.
 * Sets req.user if a valid token is present, otherwise leaves req.user undefined.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user) req.user = user;
    }
  } catch (err) {
    // Invalid or expired token — treat as guest, do not block
  }
  next();
};

/**
 * @route   POST /api/orders
 * @desc    Create a new order — works for both logged-in users and guests
 * @access  Public (guests) + Private (logged-in users)
 */
router.post('/', optionalAuth, [
  body('orderItems').isArray({ min: 1 }).withMessage('Order must have at least one item'),
  body('orderItems.*.product').notEmpty().withMessage('Product ID is required'),
  body('orderItems.*.name').notEmpty().withMessage('Product name is required'),
  body('orderItems.*.price').isNumeric().withMessage('Price must be a number'),
  body('orderItems.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('shippingAddress.street').notEmpty().withMessage('Street address is required'),
  body('shippingAddress.city').notEmpty().withMessage('City is required'),
  body('shippingAddress.state').notEmpty().withMessage('State/County is required'),
  body('shippingAddress.zipCode').notEmpty().withMessage('Postal code is required'),
  body('shippingAddress.country').optional().default('Kenya'),
  body('shippingAddress.phone').notEmpty().withMessage('Phone number is required'),
  body('paymentMethod').isIn(['cod', 'mpesa']).withMessage('Invalid payment method'),
  // Guest email: required only when no auth token (validated in handler)
  body('guestEmail').optional().isEmail().withMessage('Invalid guest email address'),
], validate, async (req, res) => {
  try {
    const { orderItems, shippingAddress, paymentMethod, notes, isGuestOrder, guestEmail } = req.body;

    // Require email for guest orders
    if (!req.user && !guestEmail) {
      return res.status(400).json({ success: false, message: 'Email address is required for guest orders' });
    }

    let itemsPrice = 0;
    const orderItemsWithPrice = [];

    for (const item of orderItems) {
      const product = await Product.findById(item.product);

      if (!product || !product.isActive) {
        return res.status(404).json({ success: false, message: `Product not found: ${item.name}` });
      }

      if (!product.inStock) {
        return res.status(400).json({ success: false, message: `${item.name} is currently out of stock` });
      }

      if (product.stockQuantity > 0 && product.stockQuantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${item.name}. Available: ${product.stockQuantity}`
        });
      }

      itemsPrice += item.price * item.quantity;
      orderItemsWithPrice.push({
        product:  item.product,
        name:     item.name,
        image:    item.image || product.image,
        price:    item.price,
        quantity: item.quantity
      });
    }

    // ── Totals ────────────────────────────────────────────────────────────
    const shippingPrice = itemsPrice >= 50000 ? 0 : 350;
    const taxPrice      = 0;
    const totalPrice    = itemsPrice + shippingPrice;

    const order = await Order.create({
      user:         req.user ? req.user.id : null,
      isGuestOrder: !req.user,
      // Store guest email so we can send confirmation & allow tracking
      guestEmail:   req.user ? null : guestEmail.trim().toLowerCase(),
      orderItems:   orderItemsWithPrice,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      notes,
      status: 'pending'
    });

    // ── Send order confirmation email (non-blocking) ──────────────────────
    const emailRecipient = req.user
      ? { name: req.user.name, email: req.user.email }
      : { name: shippingAddress.fullName || 'Customer', email: guestEmail.trim().toLowerCase() };

    sendOrderConfirmation(order, emailRecipient).catch(err =>
      console.error('⚠️  Order confirmation email failed (non-blocking):', err.message)
    );

    sendAdminOrderAlert({
      order,
      customerName: emailRecipient.name,
      customerEmail: emailRecipient.email,
    }).catch(err =>
      console.error('⚠️  Admin order alert email failed (non-blocking):', err.message)
    );

    // ── Notify admin of new order (non-blocking) ─────────────────────────
    try {
      await Notification.create({
        title: 'New Order',
        message: `New order ${order.orderNumber || order._id.toString().slice(-8)} placed (${paymentMethod}).`,
        type: 'new_order',
        relatedId: order._id,
        relatedModel: 'Order',
        userName: emailRecipient.name,
        userEmail: emailRecipient.email,
        metadata: {
          totalPrice: order.totalPrice,
          paymentMethod,
          isGuest: !req.user,
        },
      });
    } catch (notifErr) {
      console.error('Notification error (non-fatal):', notifErr.message);
    }

    // ── Emit real-time order update to admin dashboard ────────────────────
    const io = req.app.get('io');
    if (io) {
      io.emit('order:updated', order);
      io.emit('notification:new', {
        title: 'New Order',
        message: `New order ${order.orderNumber || order._id.toString().slice(-8)} placed (${paymentMethod}).`,
        type: 'new_order',
        createdAt: new Date().toISOString(),
      });
    }

    // ── Reduce tracked stock immediately for COD orders ───────────────────
    if (paymentMethod === 'cod') {
      for (const item of orderItems) {
        const product = await Product.findById(item.product);
        if (product && product.stockQuantity > 0) {
          const newQty = product.stockQuantity - item.quantity;
          await Product.findByIdAndUpdate(item.product, {
            stockQuantity: Math.max(0, newQty),
            ...(newQty <= 0 ? { inStock: false } : {})
          });
        }
      }
    }

    res.status(201).json({ success: true, order });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: 'Error creating order' });
  }
});

/**
 * @route   GET /api/orders/track/:orderNumber
 * @desc    Public order tracking — guests look up by order number + email
 * @access  Public
 */
router.get('/track/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { email } = req.query; // guests must supply their email to verify ownership

    const order = await Order.findOne({ orderNumber });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // For guest orders: verify the email matches
    if (order.isGuestOrder) {
      if (!email) {
        return res.status(401).json({ success: false, message: 'Email is required to track a guest order' });
      }
      if (order.guestEmail !== email.trim().toLowerCase()) {
        return res.status(403).json({ success: false, message: 'Email does not match this order' });
      }
    }

    // Return order (strip sensitive internal fields)
    res.json({ success: true, order });
  } catch (error) {
    console.error('Track order error:', error);
    res.status(500).json({ success: false, message: 'Error fetching order' });
  }
});

/**
 * @route   GET /api/orders
 * @desc    Get orders — admin gets all, customer gets own
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';

    const orders = isAdmin
      ? await Order.find({}).sort({ createdAt: -1 }).populate('user', 'name email phone')
      : await Order.find({ user: req.user.id }).sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Error fetching orders' });
  }
});

/**
 * @route   GET /api/orders/:id
 * @desc    Get a single order
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';

    const query = isAdmin
      ? { _id: req.params.id }
      : { _id: req.params.id, user: req.user.id };

    const order = await Order.findOne(query).populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ success: false, message: 'Error fetching order' });
  }
});

/**
 * @route   PUT /api/orders/:id/status
 * @desc    Admin updates order status
 *          Pending → Processing → Shipped → Delivered (auto-marks Paid for COD)
 * @access  Private (Admin)
 */
router.put('/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.body;

    const validTransitions = {
      pending:    ['processing', 'cancelled', 'failed'],
      processing: ['shipped',    'cancelled', 'failed'],
      shipped:    ['delivered',  'cancelled', 'failed'],
      delivered:  [],
      cancelled:  [],
      failed:     [],
    };

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot move order from "${order.status}" to "${status}"`
      });
    }

    order.status = status;

    // When delivered: mark as paid (COD cash collected by rider)
    if (status === 'delivered') {
      order.isPaid      = true;
      order.paidAt      = new Date();
      order.isDelivered = true;
      order.deliveredAt = new Date();
    }

    if (status === 'failed') {
      order.isDelivered = false;
      order.deliveredAt = undefined;

      const delivery = await Delivery.findOne({ order: order._id });
      if (delivery) {
        delivery.status = 'failed';
        await delivery.save();

        if (delivery.driver) {
          await User.findByIdAndUpdate(
            delivery.driver,
            { driverStatus: 'available', currentOrder: null },
            { new: true }
          );
        }
      }
    }

    // When cancelled after processing: restore stock
    if (status === 'cancelled' && order.paymentMethod === 'cod') {
      for (const item of order.orderItems) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stockQuantity: item.quantity },
          inStock: true
        });
      }
    }

    await order.save();

    const io = req.app.get('io');
    if (io) io.emit('order:updated', order);

    // ✅ For COD orders, award points when delivered (non-blocking)
    if (status === 'delivered') {
      awardOrderPoints(order).catch(err =>
        console.error('⚠️  COD points award failed:', err.message)
      );
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Error updating order status' });
  }
});

/**
 * @route   PUT /api/orders/:id/cancel
 * @desc    Customer cancels a pending order
 * @access  Private
 */
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending orders can be cancelled' });
    }

    for (const item of order.orderItems) {
      const product = await Product.findById(item.product);
      if (product && product.stockQuantity >= 0) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stockQuantity: item.quantity },
          inStock: true
        });
      }
    }

    order.status = 'cancelled';
    await order.save();

    res.json({ success: true, order });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ success: false, message: 'Error cancelling order' });
  }
});

module.exports = router;
