/**
 * Wishlist Routes
 * Handles wishlist operations for users and guests
 */

const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Get wishlist helper - finds wishlist by user or session
const getWishlist = async (userId, sessionId) => {
  let wishlist;
  if (userId) {
    wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      wishlist = await Wishlist.create({ user: userId, items: [] });
    }
  } else if (sessionId) {
    wishlist = await Wishlist.findOne({ sessionId });
    if (!wishlist) {
      wishlist = await Wishlist.create({ sessionId, items: [] });
    }
  } else {
    wishlist = await Wishlist.create({ items: [] });
  }
  return wishlist;
};

/**
 * @route   GET /api/wishlist
 * @desc    Get current wishlist
 * @access  Private (User) / Public (Guest)
 */
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.user ? req.user.id : null;
  const sessionId = req.headers['x-session-id'] || null;

  const wishlist = await getWishlist(userId, sessionId);

  // Populate product details
  await wishlist.populate('items.product', 'name image price originalPrice rating stockQuantity');

  res.json({
    success: true,
    wishlist: wishlist.items
  });
}));

/**
 * @route   POST /api/wishlist
 * @desc    Add product to wishlist
 * @access  Private (User) / Public (Guest)
 */
router.post('/', asyncHandler(async (req, res) => {
  const { productId } = req.body;
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

  // Find or create wishlist
  let wishlist;
  if (userId) {
    wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      wishlist = await Wishlist.create({ user: userId, items: [] });
    }
  } else if (sessionId) {
    wishlist = await Wishlist.findOne({ sessionId });
    if (!wishlist) {
      wishlist = await Wishlist.create({ sessionId, items: [] });
    }
  } else {
    wishlist = await Wishlist.create({ items: [] });
  }

  // Check if product already in wishlist
  const exists = wishlist.items.some(item => 
    item.product.toString() === productId
  );

  if (exists) {
    return res.status(400).json({
      success: false,
      message: 'Product already in wishlist'
    });
  }

  await wishlist.addProduct(productId);
  await wishlist.populate('items.product', 'name image price originalPrice rating stockQuantity');

  res.json({
    success: true,
    wishlist: wishlist.items
  });
}));

/**
 * @route   DELETE /api/wishlist/:productId
 * @desc    Remove product from wishlist
 * @access  Private (User) / Public (Guest)
 */
router.delete('/:productId', asyncHandler(async (req, res) => {
  const userId = req.user ? req.user.id : null;
  const sessionId = req.headers['x-session-id'] || null;

  const wishlist = await getWishlist(userId, sessionId);

  wishlist.items = wishlist.items.filter(item => 
    item.product.toString() !== req.params.productId
  );

  await wishlist.save();
  await wishlist.populate('items.product', 'name image price originalPrice rating stockQuantity');

  res.json({
    success: true,
    wishlist: wishlist.items
  });
}));

/**
 * @route   GET /api/wishlist/:productId/check
 * @desc    Check if product is in wishlist
 * @access  Private (User) / Public (Guest)
 */
router.get('/:productId/check', asyncHandler(async (req, res) => {
  const userId = req.user ? req.user.id : null;
  const sessionId = req.headers['x-session-id'] || null;

  const wishlist = await getWishlist(userId, sessionId);

  const isInWishlist = wishlist.items.some(item => 
    item.product.toString() === req.params.productId
  );

  res.json({
    success: true,
    isInWishlist
  });
}));

/**
 * @route   POST /api/wishlist/merge
 * @desc    Merge guest wishlist into user wishlist on login
 * @access  Private
 */
router.post('/merge', protect, asyncHandler(async (req, res) => {
  const guestSessionId = req.headers['x-session-id'];

  if (!guestSessionId) {
    return res.json({
      success: true,
      wishlist: []
    });
  }

  const wishlist = await Wishlist.mergeWishlists(guestSessionId, req.user.id);
  
  if (wishlist) {
    await wishlist.populate('items.product', 'name image price originalPrice rating stockQuantity');
  }

  res.json({
    success: true,
    wishlist: wishlist ? wishlist.items : []
  });
}));

module.exports = router;

