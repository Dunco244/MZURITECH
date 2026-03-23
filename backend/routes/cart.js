/**
 * Cart Routes
 * Handles shopping cart operations for users and guests
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

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

// Get cart helper - finds cart by user or session
const getCart = async (userId, sessionId) => {
  let cart;
  if (userId) {
    cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }
  } else if (sessionId) {
    cart = await Cart.findOne({ sessionId });
    if (!cart) {
      cart = await Cart.create({ sessionId, items: [] });
    }
  } else {
    cart = await Cart.create({ items: [] });
  }
  return cart;
};

/**
 * @route   GET /api/cart
 * @desc    Get current cart
 * @access  Private (User) / Public (Guest)
 */
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.user ? req.user.id : null;
  const sessionId = req.headers['x-session-id'] || null;

  const cart = await getCart(userId, sessionId);

  // Populate product details
  await cart.populate('items.product', 'name image price originalPrice stockQuantity');

  res.json({
    success: true,
    cart: {
      items: cart.items,
      totalPrice: cart.totalPrice,
      totalItems: cart.totalItems
    }
  });
}));

/**
 * @route   POST /api/cart
 * @desc    Add item to cart
 * @access  Private (User) / Public (Guest)
 */
router.post('/', [
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1')
], validate, asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  const userId = req.user ? req.user.id : null;
  const sessionId = req.headers['x-session-id'] || null;

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  // Check stock
  if (product.stockQuantity < quantity) {
    return res.status(400).json({
      success: false,
      message: `Insufficient stock. Available: ${product.stockQuantity}`
    });
  }

  // Find or create cart
  let cart;
  if (userId) {
    cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }
  } else if (sessionId) {
    cart = await Cart.findOne({ sessionId });
    if (!cart) {
      cart = await Cart.create({ sessionId, items: [] });
    }
  } else {
    cart = await Cart.create({ items: [] });
  }

  // Add or update item
  const existingItem = cart.items.find(item => 
    item.product.toString() === productId
  );

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;
    if (product.stockQuantity < newQuantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${product.stockQuantity}`
      });
    }
    existingItem.quantity = newQuantity;
  } else {
    cart.items.push({
      product: productId,
      quantity,
      price: product.price
    });
  }

  await cart.save();
  await cart.populate('items.product', 'name image price originalPrice stockQuantity');

  res.json({
    success: true,
    cart: {
      items: cart.items,
      totalPrice: cart.totalPrice,
      totalItems: cart.totalItems
    }
  });
}));

/**
 * @route   PUT /api/cart/:productId
 * @desc    Update item quantity in cart
 * @access  Private (User) / Public (Guest)
 */
router.put('/:productId', [
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be 0 or more')
], validate, asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const userId = req.user ? req.user.id : null;
  const sessionId = req.headers['x-session-id'] || null;

  const cart = await getCart(userId, sessionId);

  const item = cart.items.find(item => 
    item.product.toString() === req.params.productId
  );

  if (!item) {
    return res.status(404).json({
      success: false,
      message: 'Item not found in cart'
    });
  }

  if (quantity === 0) {
    // Remove item
    cart.items = cart.items.filter(item => 
      item.product.toString() !== req.params.productId
    );
  } else {
    // Check stock
    const product = await Product.findById(req.params.productId);
    if (product && product.stockQuantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${product.stockQuantity}`
      });
    }
    item.quantity = quantity;
  }

  await cart.save();
  await cart.populate('items.product', 'name image price originalPrice stockQuantity');

  res.json({
    success: true,
    cart: {
      items: cart.items,
      totalPrice: cart.totalPrice,
      totalItems: cart.totalItems
    }
  });
}));

/**
 * @route   DELETE /api/cart/:productId
 * @desc    Remove item from cart
 * @access  Private (User) / Public (Guest)
 */
router.delete('/:productId', asyncHandler(async (req, res) => {
  const userId = req.user ? req.user.id : null;
  const sessionId = req.headers['x-session-id'] || null;

  const cart = await getCart(userId, sessionId);

  cart.items = cart.items.filter(item => 
    item.product.toString() !== req.params.productId
  );

  await cart.save();
  await cart.populate('items.product', 'name image price originalPrice stockQuantity');

  res.json({
    success: true,
    cart: {
      items: cart.items,
      totalPrice: cart.totalPrice,
      totalItems: cart.totalItems
    }
  });
}));

/**
 * @route   DELETE /api/cart
 * @desc    Clear cart
 * @access  Private (User) / Public (Guest)
 */
router.delete('/', asyncHandler(async (req, res) => {
  const userId = req.user ? req.user.id : null;
  const sessionId = req.headers['x-session-id'] || null;

  const cart = await getCart(userId, sessionId);

  cart.items = [];
  await cart.save();

  res.json({
    success: true,
    cart: {
      items: [],
      totalPrice: 0,
      totalItems: 0
    }
  });
}));

/**
 * @route   POST /api/cart/merge
 * @desc    Merge guest cart into user cart on login
 * @access  Private
 */
router.post('/merge', protect, asyncHandler(async (req, res) => {
  const guestSessionId = req.headers['x-session-id'];

  if (!guestSessionId) {
    return res.json({
      success: true,
      cart: { items: [], totalPrice: 0, totalItems: 0 }
    });
  }

  const cart = await Cart.mergeCarts(guestSessionId, req.user.id);
  
  if (cart) {
    await cart.populate('items.product', 'name image price originalPrice stockQuantity');
  }

  res.json({
    success: true,
    cart: {
      items: cart ? cart.items : [],
      totalPrice: cart ? cart.totalPrice : 0,
      totalItems: cart ? cart.totalItems : 0
    }
  });
}));

module.exports = router;

