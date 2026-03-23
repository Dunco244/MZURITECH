/**
 * Category Routes
 * Handles category CRUD operations
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');
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

/**
 * @route   GET /api/categories
 * @desc    Get all categories
 * @access  Public
 */
router.get('/', asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true })
    .sort({ displayOrder: 1, name: 1 });

  // Add product count to each category
  const categoriesWithCount = await Promise.all(
    categories.map(async (category) => {
      const count = await Product.countDocuments({ 
        category: category.slug,
        isActive: true 
      });
      return {
        ...category.toObject(),
        productCount: count
      };
    })
  );

  res.json({
    success: true,
    categories: categoriesWithCount
  });
}));

/**
 * @route   GET /api/categories/:id
 * @desc    Get single category
 * @access  Public
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    $or: [
      { _id: req.params.id },
      { slug: req.params.id }
    ]
  });

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }

  // Get product count
  const productCount = await Product.countDocuments({
    category: category.slug,
    isActive: true
  });

  res.json({
    success: true,
    category: {
      ...category.toObject(),
      productCount
    }
  });
}));

/**
 * @route   POST /api/categories
 * @desc    Create a new category
 * @access  Private (Admin)
 */
router.post('/', [
  protect,
  authorize('admin'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ max: 50 })
    .withMessage('Name cannot exceed 50 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
], validate, asyncHandler(async (req, res) => {
  const { name, description, icon, image, displayOrder } = req.body;

  // Check if category already exists
  const existingCategory = await Category.findOne({ 
    name: { $regex: new RegExp(`^${name}$`, 'i') } 
  });
  
  if (existingCategory) {
    return res.status(400).json({
      success: false,
      message: 'Category already exists'
    });
  }

  const category = await Category.create({
    name,
    description,
    icon: icon || 'Folder',
    image,
    displayOrder: displayOrder || 0
  });

  res.status(201).json({
    success: true,
    category
  });
}));

/**
 * @route   PUT /api/categories/:id
 * @desc    Update a category
 * @access  Private (Admin)
 */
router.put('/:id', [
  protect,
  authorize('admin'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 50 })
    .withMessage('Name cannot exceed 50 characters')
], validate, asyncHandler(async (req, res) => {
  const { name, description, icon, image, displayOrder, isActive } = req.body;

  let category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }

  // Check if new name already exists
  if (name && name !== category.name) {
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      _id: { $ne: category._id }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists'
      });
    }
  }

  category = await Category.findByIdAndUpdate(
    req.params.id,
    { name, description, icon, image, displayOrder, isActive },
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    category
  });
}));

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete a category
 * @access  Private (Admin)
 */
router.delete('/:id', [
  protect,
  authorize('admin')
], asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }

  // Check if category has products
  const productCount = await Product.countDocuments({
    category: category.slug,
    isActive: true
  });

  if (productCount > 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete category with existing products'
    });
  }

  await category.deleteOne();

  res.json({
    success: true,
    message: 'Category deleted successfully'
  });
}));

module.exports = router;

