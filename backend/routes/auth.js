/**
 * Authentication Routes
 * Handles user registration, login, and profile management
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const { sendWelcomeEmail, sendPasswordReset } = require('../services/emailService');
const { v4: uuidv4 } = require('uuid');

// Helper function to create notification for admin
const createNotification = async (title, message, type, userData) => {
  try {
    const admins = await User.find({ role: 'admin' });
    if (admins.length > 0) {
      await Notification.create({
        title,
        message,
        type,
        relatedId: userData._id,
        relatedModel: 'User',
        userName: userData.name,
        userEmail: userData.email,
        metadata: {
          businessName: userData.businessName,
          phone: userData.phone
        }
      });
    }
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (customer or vendor)
 * @access  Public
 */
router.post('/register', [
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
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?\d{10,15}$/)
    .withMessage('Phone number must be 10-15 digits (with optional + prefix)'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
], validate, async (req, res) => {
  try {
    const { name, email, password, phone, isVendor, businessName, businessDescription, businessPhone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    const userData = { name, email, password, phone };

    if (isVendor) {
      userData.role = 'vendor';
      userData.isVendor = true;
      userData.isApproved = false;
      userData.businessName = businessName || name + "'s Store";
      userData.businessDescription = businessDescription || '';
      userData.businessPhone = businessPhone || phone;
    }

    const user = await User.create(userData);
    sendWelcomeEmail(user);

    if (isVendor) {
      await createNotification(
        'New Vendor Registration',
        `A new vendor "${userData.businessName || userData.name}" has registered and is awaiting approval.`,
        'new_vendor', user
      );
    } else {
      await createNotification(
        'New Customer Registration',
        `A new customer "${userData.name}" has registered.`,
        'new_customer', user
      );
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    res.status(201).json({ success: true, token, user: user.getPublicProfile() });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

/**
 * @route   POST /api/drivers/register
 * @desc    Register a new driver — called by the admin portal
 * @access  Private (admin only)
 *
 * Body: { name, email, password, phone, zone, vehicleType, licensePlate }
 *
 * Password rules are relaxed here because the admin is creating the account,
 * not the driver. The driver can change their password after first login.
 */
router.post('/drivers/register', protect, [
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('phone')
    .notEmpty()
    .withMessage('Phone is required'),
  body('zone')
    .notEmpty()
    .withMessage('Zone / city is required'),
], validate, async (req, res) => {
  try {
    // Only admins can register drivers
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { name, email, password, phone, zone, vehicleType, licensePlate } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'A user already exists with this email' });
    }

    const driver = await User.create({
      name,
      email,
      password,
      phone,
      role:         'driver',
      zone:         zone.trim(),
      vehicleType:  vehicleType  || 'motorcycle',
      licensePlate: licensePlate || '',
      driverStatus: 'offline',
    });

    // Notify admins
    await createNotification(
      'New Driver Added',
      `Admin added a new driver "${name}" for the ${zone} zone.`,
      'new_driver',
      driver
    );

    res.status(201).json({
      success: true,
      message: 'Driver registered successfully',
      driver: driver.getPublicProfile(),
    });
  } catch (error) {
    console.error('Driver register error:', error);
    res.status(500).json({ success: false, message: 'Server error during driver registration' });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user (all roles — customer, admin, vendor, driver)
 * @access  Public
 */
router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], validate, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    res.json({ success: true, token, user: user.getPublicProfile() });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, user: user.getPublicProfile() });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/profile', protect, [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('phone').optional().trim().matches(/^\+?\d{10,}$/).withMessage('Phone number must be at least 10 digits (with optional + prefix)')
], validate, async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const user = await User.findById(req.user.id);
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = { ...user.address, ...address };
    await user.save();
    res.json({ success: true, user: user.getPublicProfile() });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   PUT /api/auth/password
 * @desc    Update password
 * @access  Private
 */
router.put('/password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
], validate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    user.password = newPassword;
    await user.save();
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );
    res.json({ success: true, message: 'Password updated successfully', token });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Forgot password - send reset email
 * @access  Public
 */
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Please provide a valid email')
], validate, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: true, message: 'If an account exists, a password reset email will be sent' });
    }
    const resetToken = uuidv4();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });
    await sendPasswordReset(user, resetToken);
    res.json({ success: true, message: 'If an account exists, a password reset email will be sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   POST /api/auth/reset-password/:token
 * @desc    Reset password
 * @access  Public
 */
router.post('/reset-password/:token', [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
], validate, async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpire: { $gt: Date.now() }
    });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, user: user.getPublicProfile() });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', protect, async (req, res) => {
  try {
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
