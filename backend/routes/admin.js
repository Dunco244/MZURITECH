/**
 * Admin Routes
 * Handles admin operations for product, category, and order management
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const User = require('../models/User');
const Delivery = require('../models/Delivery');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');
const { awardOrderPoints } = require('../services/rewardsService'); // ✅ ADDED

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// ==================== DASHBOARD STATS ====================

router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments({ isActive: true });
    const totalOrders   = await Order.countDocuments();
    const totalUsers    = await User.countDocuments({ role: 'customer' });

    const revenueResult = await Order.aggregate([
      {
        $match: {
          $or: [
            { isPaid: true, paymentMethod: { $in: ['mpesa'] } },
            { status: 'delivered', paymentMethod: 'cod' },
          ]
        }
      },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({ path: 'user', select: 'name email', options: { strictPopulate: false } })
      .lean();

    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const topProducts = await Order.aggregate([
      { $unwind: '$orderItems' },
      { $group: { _id: '$orderItems.product', totalSold: { $sum: '$orderItems.quantity' } } },
      { $sort: { totalSold: -1 } },
      { $limit: 5 }
    ]);

    const topProductIds     = topProducts.map(p => p._id);
    const topProductsDetails = await Product.find({ _id: { $in: topProductIds } });

    res.json({
      success: true,
      stats: {
        totalProducts, totalOrders, totalUsers, totalRevenue,
        recentOrders, ordersByStatus,
        topProducts: topProducts.map(p => ({
          ...topProductsDetails.find(d => d._id.toString() === p._id?.toString())?.toObject(),
          totalSold: p.totalSold
        }))
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: 'Error fetching dashboard stats' });
  }
});

// ==================== PRODUCT MANAGEMENT ====================

router.get('/products', async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const filter = { isActive: true };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.brand)    filter.brand    = req.query.brand;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const products = await Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total    = await Product.countDocuments(filter);

    res.json({
      success: true, products,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, message: 'Error fetching products' });
  }
});

router.post('/products', [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('brand').trim().notEmpty().withMessage('Brand is required'),
], validate, async (req, res) => {
  try {
    const productData = { ...req.body };
    const baseSlug = (productData.name || '')
      .toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    productData.slug = `${baseSlug}-${Date.now()}`;
    const product = await Product.create(productData);
    res.status(201).json({ success: true, product });
  } catch (error) {
    console.error('Create product error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Error deleting product' });
  }
});

// ==================== CATEGORY MANAGEMENT ====================

router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ displayOrder: 1 });
    const productCounts = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: { $toLower: '$category' }, count: { $sum: 1 } } }
    ]);
    const countMap = {};
    productCounts.forEach(({ _id, count }) => { if (_id) countMap[_id] = count; });
    const categoriesWithCount = categories.map(cat => {
      const obj = cat.toObject();
      const key = (obj.slug || obj.name || '').toLowerCase();
      obj.count = countMap[key] || 0;
      return obj;
    });
    res.json({ success: true, categories: categoriesWithCount });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, message: 'Error fetching categories' });
  }
});

router.post('/categories', [
  body('name').trim().notEmpty().withMessage('Category name is required')
], validate, async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, category });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ success: false, message: 'Error creating category' });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, category });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ success: false, message: 'Error updating category' });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ success: false, message: 'Error deleting category' });
  }
});

// ==================== ORDER MANAGEMENT ====================

router.get('/orders', async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
    if (req.query.orderNumber) filter.orderNumber = { $regex: req.query.orderNumber, $options: 'i' };

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate({ path: 'user', select: 'name email', options: { strictPopulate: false } })
      .lean();
    const total = await Order.countDocuments(filter);

    res.json({
      success: true, orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Error fetching orders', error: error.message });
  }
});

router.get('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate({ path: 'user', select: 'name email phone', options: { strictPopulate: false } })
      .lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ success: false, message: 'Error fetching order' });
  }
});

router.put('/orders/:id', [
  body('status')
    .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'failed', 'refunded'])
    .withMessage('Invalid status')
], validate, async (req, res) => {
  try {
    const { status, trackingNumber, notes } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.status = status || order.status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (notes)          order.notes          = notes;

    if (status === 'shipped'   && !order.isDelivered) order.shippedAt   = new Date();
    if (status === 'delivered') {
      order.isDelivered = true;
      order.deliveredAt = new Date();
      // ✅ Mark as paid for COD (cash collected at door)
      if (!order.isPaid) {
        order.isPaid  = true;
        order.paidAt  = new Date();
      }
    }

    if (status === 'failed') {
      order.isDelivered = false;
      order.deliveredAt = undefined;
      const delivery = await Delivery.findOne({ order: order._id });
      if (delivery) {
        delivery.status = 'failed';
        if (notes) delivery.failureReason = notes;
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

    await order.save();

    const io = req.app.get('io');
    if (io) io.emit('order:updated', { _id: order._id, status: order.status });

    // ✅ Award reward points when admin marks order as delivered (non-blocking)
    if (status === 'delivered') {
      awardOrderPoints(order).catch(err =>
        console.error('⚠️  Points award failed (non-blocking):', err.message)
      );
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ success: false, message: 'Error updating order' });
  }
});

// ==================== USER MANAGEMENT ====================

router.get('/users', async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.role) filter.role = req.query.role;

    const users = await User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await User.countDocuments(filter);

    res.json({
      success: true, users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { isActive, role, isApproved } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (isActive   !== undefined) user.isActive   = isActive;
    if (role)                     user.role        = role;
    if (isApproved !== undefined) {
      user.isApproved = isApproved;
      if (isApproved === true && user.role !== 'vendor') {
        user.role     = 'vendor';
        user.isVendor = true;
      }
    }

    await user.save();
    res.json({ success: true, user: user.getPublicProfile() });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Error updating user' });
  }
});

// ==================== VENDOR MANAGEMENT ====================

router.get('/vendors', async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const filter = { role: 'vendor' };
    if (req.query.status === 'pending')  filter.isApproved = false;
    if (req.query.status === 'approved') filter.isApproved = true;

    const vendors = await User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total   = await User.countDocuments(filter);

    res.json({
      success: true, vendors,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ success: false, message: 'Error fetching vendors' });
  }
});

router.put('/vendors/:id/approve', async (req, res) => {
  try {
    const { isApproved } = req.body;
    const vendor = await User.findById(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    vendor.isApproved = isApproved;
    await vendor.save();

    res.json({
      success:  true,
      message:  isApproved ? 'Vendor approved successfully' : 'Vendor rejected',
      vendor:   vendor.getPublicProfile()
    });
  } catch (error) {
    console.error('Approve vendor error:', error);
    res.status(500).json({ success: false, message: 'Error approving vendor' });
  }
});

// ==================== NOTIFICATION MANAGEMENT ====================

router.get('/notifications', protect, authorize('admin'), async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.unread === 'true') filter.isRead = false;
    if (req.query.type)              filter.type   = req.query.type;

    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total         = await Notification.countDocuments(filter);
    const unreadCount   = await Notification.countDocuments({ isRead: false });

    res.json({
      success: true, notifications, unreadCount,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: 'Error fetching notifications' });
  }
});

router.put('/notifications/read-all', protect, authorize('admin'), async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true, readAt: new Date() });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ success: false, message: 'Error marking all notifications as read' });
  }
});

router.get('/notifications/unread-count', protect, authorize('admin'), async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({ isRead: false });
    res.json({ success: true, unreadCount });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, message: 'Error getting unread count' });
  }
});

router.put('/notifications/:id/read', protect, authorize('admin'), async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
    res.json({ success: true, notification });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ success: false, message: 'Error marking notification as read' });
  }
});

router.delete('/notifications/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, message: 'Error deleting notification' });
  }
});

module.exports = router;