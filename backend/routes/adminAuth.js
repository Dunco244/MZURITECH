/**
 * Admin Authentication Routes
 * Handles admin registration and login
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

// Password validation rules
const passwordValidation = [
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('phone')
    .optional()
    .matches(/^\+?\d{10,15}$/)
    .withMessage('Phone number must be 10-15 digits (with optional + prefix)'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
];

/**
 * @route   POST /api/admin/register-admin
 * @desc    Register or login as admin using secret key
 * @access  Public
 */
router.post('/register-admin', passwordValidation, validate, async (req, res) => {
  try {
    const { name, email, password, phone, secretKey } = req.body;
    
    // Secret key validation
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'mzuri-admin-2024';
    
    if (secretKey !== ADMIN_SECRET) {
      return res.status(401).json({
        success: false,
        message: 'Invalid secret key'
      });
    }
    
    // Check if user already exists
    let user = await User.findOne({ email });
    
    if (user) {
      // Update existing user to admin
      user.role = 'admin';
      user.name = name || user.name;
      if (phone) user.phone = phone;
      await user.save();
    } else {
      // Create new admin user
      user = await User.create({
        name: name || 'Admin',
        email,
        password,
        phone,
        role: 'admin'
      });
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    res.json({
      success: true,
      message: 'Admin login successful!',
      token,
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   POST /api/admin/login-admin
 * @desc    Login as admin
 * @access  Public
 */
router.post('/login-admin', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user with password
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not an admin. Please contact the administrator.'
      });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    
    // Generate token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    res.json({
      success: true,
      message: 'Admin login successful!',
      token,
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
