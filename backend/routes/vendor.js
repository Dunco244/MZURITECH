/**
 * Vendor Routes
 * Handles vendor-specific operations like product management
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

// Middleware to check if user is a vendor
const isVendor = async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user || !user.isVendor) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Vendor account required.'
    });
  }
  req.vendorUser = user;

  // Attach the Vendor document (create if missing for legacy accounts)
  let vendor = await Vendor.findOne({ user: req.user.id });
  if (!vendor) {
    vendor = await Vendor.create({
      user:                user._id,
      businessName:        user.businessName || user.name + "'s Store",
      businessDescription: user.businessDescription || '',
      businessPhone:       user.businessPhone || user.phone,
      isApproved:          user.isApproved || false,
    });
  }
  req.vendor = vendor;
  next();
};

/**
 * @route   GET /api/vendor/dashboard
 * @desc    Get vendor dashboard stats
 * @access  Private (Vendor)
 */
router.get('/dashboard', protect, isVendor, async (req, res) => {
  try {
    const vendorId = req.user.id;
    
    // Get vendor's products
    const products = await Product.find({ vendor: vendorId });
    
    // Get orders containing vendor's products
    const orders = await Order.find({
      'orderItems.product': { $in: products.map(p => p._id) }
    }).populate('user', 'name email').sort({ createdAt: -1 });
    
    // Calculate stats
    const totalProducts = products.length;
    const totalOrders = orders.length;
    const totalSales = orders
      .filter(o => o.isPaid)
      .reduce((sum, order) => {
        const vendorItems = order.orderItems.filter(
          item => item.product && products.some(p => p._id.toString() === (typeof item.product === 'string' ? item.product : item.product.toString()))
        );
        return sum + vendorItems.reduce((s, item) => s + item.price * item.quantity, 0);
      }, 0);
    
    // Get recent orders for vendor
    const recentOrders = orders.slice(0, 10);
    
    res.json({
      success: true,
      stats: {
        totalProducts,
        totalOrders,
        totalSales,
        pendingOrders: orders.filter(o => o.status === 'pending').length
      },
      recentOrders,
      products: products.slice(0, 10),
      vendor: {
        businessName:        req.vendor.businessName,
        businessDescription: req.vendor.businessDescription,
        businessPhone:       req.vendor.businessPhone,
        isApproved:          req.vendor.isApproved,
        createdAt:           req.vendor.createdAt,
      }
    });
  } catch (error) {
    console.error('Vendor dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   GET /api/vendor/products
 * @desc    Get all vendor products
 * @access  Private (Vendor)
 */
router.get('/products', protect, isVendor, async (req, res) => {
  try {
    const products = await Product.find({ vendor: req.user.id }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Get vendor products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   POST /api/vendor/products
 * @desc    Create a new product
 * @access  Private (Vendor)
 */
router.post('/products', [
  protect,
  isVendor,
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('description').trim().notEmpty().withMessage('Product description is required'),
  body('price').isNumeric().withMessage('Price must be a number'),
  body('category').isIn(['laptops', 'phones', 'audio', 'gaming', 'tablets', 'accessories', 'cameras', 'wearables']).withMessage('Invalid category'),
  body('brand').trim().notEmpty().withMessage('Brand is required'),
  body('image').trim().notEmpty().withMessage('Product image is required')
], validate, async (req, res) => {
  try {
    const { name, description, price, originalPrice, image, images, category, brand, stockQuantity, specs, features } = req.body;
    
    const product = await Product.create({
      name,
      description,
      price,
      originalPrice,
      image,
      images: images || [],
      category,
      brand,
      stockQuantity: stockQuantity || 0,
      specs: specs || {},
      features: features || [],
      vendor: req.user.id,
      vendorName: req.vendorUser.businessName || req.vendorUser.name
    });
    
    // Update vendor's product count on both User and Vendor docs
    await User.findByIdAndUpdate(req.user.id, { $inc: { totalProducts: 1 } });
    await Vendor.findByIdAndUpdate(req.vendor._id, {
      $inc: { totalProducts: 1 },
      $push: { products: product._id },
    });
    
    res.status(201).json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   PUT /api/vendor/products/:id
 * @desc    Update a product
 * @access  Private (Vendor)
 */
router.put('/products/:id', [
  protect,
  isVendor,
  body('name').optional().trim().notEmpty().withMessage('Product name cannot be empty'),
  body('price').optional().isNumeric().withMessage('Price must be a number')
], validate, async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Check if product belongs to vendor
    if (product.vendor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product'
      });
    }
    
    const { name, description, price, originalPrice, image, images, category, brand, stockQuantity, inStock, specs, features } = req.body;
    
    product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, description, price, originalPrice, image, images, category, brand, stockQuantity, inStock, specs, features },
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   DELETE /api/vendor/products/:id
 * @desc    Delete a product
 * @access  Private (Vendor)
 */
router.delete('/products/:id', protect, isVendor, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Check if product belongs to vendor
    if (product.vendor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this product'
      });
    }
    
    await Product.findByIdAndDelete(req.params.id);

    // Update vendor's product count on both User and Vendor docs
    await User.findByIdAndUpdate(req.user.id, { $inc: { totalProducts: -1 } });
    await Vendor.findByIdAndUpdate(req.vendor._id, {
      $inc: { totalProducts: -1 },
      $pull: { products: product._id },
    });
    
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   GET /api/vendor/orders
 * @desc    Get vendor orders
 * @access  Private (Vendor)
 */
router.get('/orders', protect, isVendor, async (req, res) => {
  try {
    const vendorId = req.user.id;
    
    // Get vendor's products
    const products = await Product.find({ vendor: vendorId });
    const productIds = products.map(p => p._id);
    
    // Get orders containing vendor's products
    const orders = await Order.find({
      'orderItems.product': { $in: productIds }
    })
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 });
    
    // Filter and transform order items to show only vendor's products
    const vendorOrders = orders.map(order => {
      const vendorItems = order.orderItems.filter(
        item => productIds.some(pid => pid.toString() === (typeof item.product === 'string' ? item.product : item.product.toString()))
      );
      
      return {
        ...order.toObject(),
        orderItems: vendorItems,
        totalVendorAmount: vendorItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
      };
    });
    
    res.json({
      success: true,
      orders: vendorOrders
    });
  } catch (error) {
    console.error('Get vendor orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   PUT /api/vendor/profile
 * @desc    Update vendor profile
 * @access  Private (Vendor)
 */
router.put('/profile', [
  protect,
  body('businessName').optional().trim(),
  body('businessDescription').optional().trim()
], validate, async (req, res) => {
  try {
    const { businessName, businessDescription, businessPhone, businessAddress } = req.body;

    const user = await User.findById(req.user.id);
    if (!user || !user.isVendor) {
      return res.status(403).json({ success: false, message: 'Vendor account required' });
    }

    // Update User doc (keep in sync for auth/profile)
    if (businessName)        user.businessName        = businessName;
    if (businessDescription) user.businessDescription = businessDescription;
    if (businessPhone)       user.businessPhone       = businessPhone;
    if (businessAddress)     user.businessAddress     = { ...user.businessAddress, ...businessAddress };
    await user.save();

    // Update Vendor doc (primary vendor record)
    const vendor = await Vendor.findOne({ user: req.user.id });
    if (vendor) {
      if (businessName)        vendor.businessName        = businessName;
      if (businessDescription) vendor.businessDescription = businessDescription;
      if (businessPhone)       vendor.businessPhone       = businessPhone;
      if (businessAddress)     vendor.businessAddress     = { ...vendor.businessAddress, ...businessAddress };
      await vendor.save();
    }

    res.json({ success: true, user: user.getPublicProfile(), vendor });
  } catch (error) {
    console.error('Update vendor profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

