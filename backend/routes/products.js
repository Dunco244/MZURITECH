/**
 * Product Routes
 * Handles product CRUD operations and reviews
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const Review = require('../models/Review');
const Order = require('../models/Order');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// ==================== MULTER IMAGE UPLOAD SETUP ====================

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads/products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // e.g. product-1717000000000-image.jpg
    const uniqueName = `product-${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
    cb(null, uniqueName);
  }
});

// Only allow image files
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const isValid = allowedTypes.test(path.extname(file.originalname).toLowerCase()) &&
                  allowedTypes.test(file.mimetype);
  if (isValid) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// ==================== VALIDATION ====================

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// ==================== IMAGE UPLOAD ROUTE ====================

/**
 * @route   POST /api/products/upload-image
 * @desc    Upload a product image and return its URL
 * @access  Private (Admin/Vendor)
 */
router.post('/upload-image', protect, authorize('admin', 'vendor'), upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image file provided' });
  }

  const imageUrl = `/uploads/products/${req.file.filename}`;

  // ✅ Instantly copy uploaded image to frontend public folder
  try {
    const srcPath  = path.join(__dirname, '../uploads/products', req.file.filename);
    const destDir  = path.join(__dirname, '../../app/public');
    const destPath = path.join(destDir, req.file.filename);

    if (fs.existsSync(destDir)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`✅ Image copied to public folder: ${req.file.filename}`);
    }
  } catch (copyErr) {
    console.warn('⚠️ Could not copy to public folder:', copyErr.message);
  }

  res.json({
    success: true,
    imageUrl,
    fullUrl: `${req.protocol}://${req.get('host')}${imageUrl}`
  });
}));

// ==================== PRODUCT ROUTES ====================

/**
 * @route   GET /api/products
 * @desc    Get all products with filtering, sorting, and pagination
 * @access  Public
 */
router.get('/', asyncHandler(async (req, res) => {
  const {
    category,
    brand,
    minPrice,
    maxPrice,
    search,
    sort,
    order,
    page = 1,
    limit = 12,
    inStock,
    rating
  } = req.query;

  let query = { isActive: true };

  if (category) query.category = category;

  if (brand) {
    const brands = brand.split(',');
    query.brand = { $in: brands };
  }

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } }
    ];
  }

  if (inStock === 'true') query.stockQuantity = { $gt: 0 };
  if (rating) query.rating = { $gte: Number(rating) };

  let sortOption = { createdAt: -1 };
  if (sort) {
    const sortOrder = order === 'asc' ? 1 : -1;
    if (sort === 'price') sortOption = { price: sortOrder };
    else if (sort === 'rating') sortOption = { rating: sortOrder };
    else if (sort === 'name') sortOption = { name: sortOrder };
    else if (sort === 'newest') sortOption = { createdAt: -1 };
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    Product.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .populate('vendor', 'businessName'),
    Product.countDocuments(query)
  ]);

  res.json({
    success: true,
    products,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    }
  });
}));

/**
 * @route   GET /api/products/:id
 * @desc    Get single product
 * @access  Public
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('vendor', 'businessName businessDescription businessPhone');

  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  const reviews = await Review.find({ product: req.params.id, isActive: true })
    .populate('user', 'name')
    .sort({ createdAt: -1 });

  res.json({ success: true, product, reviews });
}));

/**
 * @route   POST /api/products
 * @desc    Create a new product — emits 'product:created' via Socket.io
 * @access  Private (Admin/Vendor)
 */
router.post('/', [
  protect,
  authorize('admin', 'vendor'),
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('brand').trim().notEmpty().withMessage('Brand is required'),
  body('image').trim().notEmpty().withMessage('Image is required')
], validate, asyncHandler(async (req, res) => {
  const {
    name, description, price, originalPrice, image, images,
    category, brand, stockQuantity, specs, features, badge
  } = req.body;

  const productData = {
    name, description, price, originalPrice,
    image, images: images || [],
    category, brand,
    stockQuantity: stockQuantity || 0,
    specs: specs || {},
    features: features || [],
    badge
  };

  if (req.user.role === 'vendor') {
    const vendor = await User.findById(req.user.id);
    productData.vendor = req.user.id;
    productData.vendorName = vendor.businessName || vendor.name;
  }

  const product = await Product.create(productData);

  // ✅ Emit real-time event — all connected browsers get the new product instantly
  const io = req.app.get('io');
  if (io) io.emit('product:created', product);

  res.status(201).json({ success: true, product });
}));

/**
 * @route   PUT /api/products/:id
 * @desc    Update a product — emits 'product:updated' via Socket.io
 * @access  Private (Admin/Vendor)
 */
router.put('/:id', [
  protect,
  authorize('admin', 'vendor')
], asyncHandler(async (req, res) => {
  let product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  if (req.user.role === 'vendor' && product.vendor) {
    if (product.vendor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this product' });
    }
  }

  product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

  // ✅ Emit real-time update — product card updates on website instantly
  const io = req.app.get('io');
  if (io) io.emit('product:updated', product);

  res.json({ success: true, product });
}));

/**
 * @route   DELETE /api/products/:id
 * @desc    Soft delete a product — emits 'product:deleted' via Socket.io
 * @access  Private (Admin)
 */
router.delete('/:id', [
  protect,
  authorize('admin')
], asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  product.isActive = false;
  await product.save();

  // ✅ Emit real-time delete — product disappears from website instantly
  const io = req.app.get('io');
  if (io) io.emit('product:deleted', req.params.id);

  res.json({ success: true, message: 'Product deleted successfully' });
}));

// ==================== REVIEWS ====================

/**
 * @route   POST /api/products/:id/reviews
 * @desc    Add a review to a product
 * @access  Private
 */
router.post('/:id/reviews', [
  protect,
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').trim().notEmpty().withMessage('Comment is required')
], validate, asyncHandler(async (req, res) => {
  const { rating, comment, title } = req.body;

  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  // ── Verified purchase check ───────────────────────────────────────────────
  const purchasedOrder = await Order.findOne({
    user:   req.user.id,
    status: 'delivered',
    'orderItems.product': req.params.id,
  });

  if (!purchasedOrder) {
    return res.status(403).json({
      success: false,
      message: 'You can only review products you have purchased and received',
    });
  }

  const existingReview = await Review.findOne({ user: req.user.id, product: req.params.id });
  if (existingReview) {
    return res.status(400).json({ success: false, message: 'You have already reviewed this product' });
  }

  const review = await Review.create({
    user:       req.user.id,
    product:    req.params.id,
    rating, title, comment,
    isVerified: true, // mark as verified purchase
  });

  res.status(201).json({ success: true, review });
}));

/**
 * @route   GET /api/products/:id/reviews
 * @desc    Get reviews for a product
 * @access  Public
 */
router.get('/:id/reviews', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    Review.find({ product: req.params.id, isActive: true })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments({ product: req.params.id, isActive: true })
  ]);

  res.json({
    success: true,
    reviews,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) }
  });
}));

module.exports = router;