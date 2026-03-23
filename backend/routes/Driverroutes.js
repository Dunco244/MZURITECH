/**
 * Driver Routes
 * Handles driver registration (admin), login, profile, status, and jobs
 */

const express = require('express');
const router  = express.Router();
const { body, validationResult } = require('express-validator');
const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const Delivery = require('../models/Delivery');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

/**
 * @route   POST /api/drivers/register
 * @desc    Create a new driver account — admin only
 * @access  Private (admin)
 */
router.post('/register', protect, [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').notEmpty().withMessage('Phone is required'),
  body('zone').notEmpty().withMessage('Zone / city is required'),
], validate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { name, email, password, phone, zone, vehicleType, licensePlate } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
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

    try {
      await Notification.create({
        title:        'New Driver Added',
        message:      `Admin added driver "${name}" for the ${zone} zone.`,
        type:         'new_driver',
        relatedId:    driver._id,
        relatedModel: 'User',
        userName:     driver.name,
        userEmail:    driver.email,
        metadata:     { phone, zone, vehicleType },
      });
    } catch (notifErr) {
      console.error('Notification error (non-fatal):', notifErr);
    }

    res.status(201).json({
      success: true,
      message: 'Driver registered successfully',
      driver:  driver.getPublicProfile(),
    });
  } catch (error) {
    console.error('Driver register error:', error);
    res.status(500).json({ success: false, message: 'Server error during driver registration' });
  }
});

/**
 * @route   GET /api/drivers/admin/all
 * @desc    Get all drivers — admin only
 * @access  Private (admin)
 */
router.get('/admin/all', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const total   = await User.countDocuments({ role: 'driver' });
    const drivers = await User.find({ role: 'driver' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const driverIds = drivers.map(d => d._id);
    const activeDeliveries = await Delivery.find({
      driver: { $in: driverIds },
      status: { $in: ['accepted', 'picked_up', 'in_transit'] },
    }).select('driver');

    const activeDriverIds = new Set(activeDeliveries.map(d => String(d.driver)));
    const staleBusyIds = drivers
      .filter(d => d.driverStatus === 'busy' && !activeDriverIds.has(String(d._id)))
      .map(d => d._id);

    if (staleBusyIds.length > 0) {
      await User.updateMany(
        { _id: { $in: staleBusyIds } },
        { $set: { driverStatus: 'available', currentOrder: null } }
      );
    }

    res.json({
      success: true,
      drivers: drivers.map(d => ({
        _id:                  d._id,
        name:                 d.name,
        email:                d.email,
        phone:                d.phone,
        vehicleType:          d.vehicleType,
        licensePlate:         d.licensePlate,
        zone:                 d.zone,
        status:               activeDriverIds.has(String(d._id))
                               ? 'busy'
                               : (d.driverStatus === 'busy' ? 'available' : d.driverStatus),
        isActive:             d.isActive,
        isApproved:           true,
        totalDeliveries:      d.totalDeliveries,
        successfulDeliveries: d.successfulDeliveries,
        rating:               d.driverRating,
        availableFrom:        d.availableFrom,
        availableUntil:       d.availableUntil,
        createdAt:            d.createdAt,
      })),
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total,
        limit,
      },
    });
  } catch (error) {
    console.error('Fetch drivers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   GET /api/drivers/admin/available
 * @desc    Get only available drivers (for admin job assignment)
 * @access  Private (admin)
 */
router.get('/admin/available', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { zone } = req.query; // optional filter by zone

    const query = { role: 'driver', driverStatus: 'available', isActive: true };
    if (zone) query.zone = zone;

    const drivers = await User.find(query).sort({ driverRating: -1 });

    const driverIds = drivers.map(d => d._id);
    const activeDeliveries = await Delivery.find({
      driver: { $in: driverIds },
      status: { $in: ['accepted', 'picked_up', 'in_transit'] },
    }).select('driver');
    const activeDriverIds = new Set(activeDeliveries.map(d => String(d.driver)));
    const availableDrivers = drivers.filter(d => !activeDriverIds.has(String(d._id)));

    res.json({
      success: true,
      count: availableDrivers.length,
      drivers: availableDrivers.map(d => ({
        _id:            d._id,
        name:           d.name,
        email:          d.email,
        phone:          d.phone,
        vehicleType:    d.vehicleType,
        licensePlate:   d.licensePlate,
        zone:           d.zone,
        driverRating:   d.driverRating,
        availableFrom:  d.availableFrom,
        availableUntil: d.availableUntil,
        totalDeliveries: d.totalDeliveries,
      })),
    });
  } catch (error) {
    console.error('Fetch available drivers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   PUT /api/drivers/admin/:id
 * @desc    Update driver (activate/deactivate) — admin only
 * @access  Private (admin)
 */
router.put('/admin/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const driver = await User.findOne({ _id: req.params.id, role: 'driver' });
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    if (typeof req.body.isActive === 'boolean') driver.isActive = req.body.isActive;
    if (req.body.zone)        driver.zone        = req.body.zone;
    if (req.body.vehicleType) driver.vehicleType = req.body.vehicleType;

    await driver.save({ validateBeforeSave: false });

    res.json({ success: true, message: 'Driver updated', driver: driver.getPublicProfile() });
  } catch (error) {
    console.error('Update driver error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/drivers/admin/:id
 * @desc    Remove a driver — admin only
 * @access  Private (admin)
 */
router.delete('/admin/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const driver = await User.findOneAndDelete({ _id: req.params.id, role: 'driver' });
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    res.json({ success: true, message: 'Driver removed successfully' });
  } catch (error) {
    console.error('Delete driver error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   POST /api/drivers/login
 * @desc    Driver login
 * @access  Public
 */
router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
], validate, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, role: 'driver' }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or not a driver account' });
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

    res.json({ success: true, token, driver: user.getPublicProfile() });
  } catch (error) {
    console.error('Driver login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

/**
 * @route   GET /api/drivers/me
 * @desc    Get current driver profile
 * @access  Private (driver)
 */
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'driver') {
      return res.status(403).json({ success: false, message: 'Driver access required' });
    }
    res.json({ success: true, driver: user.getPublicProfile() });
  } catch (error) {
    console.error('Driver me error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   PUT /api/drivers/status
 * @desc    Driver toggles their own online/offline status
 * @access  Private (driver)
 *
 * Body: { status: "available" | "offline" }
 *
 * NOTE: "busy" is set automatically by the system when a driver
 *       accepts a job — drivers cannot set it manually.
 */
router.put('/status', protect, async (req, res) => {
  try {
    // Only drivers can call this
    if (req.user.role !== 'driver') {
      return res.status(403).json({ success: false, message: 'Driver access required' });
    }

    const { status } = req.body;

    // Validate
    if (!status || !['available', 'offline'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be "available" or "offline"',
      });
    }

    // Find the driver and update
    const driver = await User.findByIdAndUpdate(
      req.user._id,
      { driverStatus: status },
      { new: true, runValidators: false }  // new:true returns the updated doc
    );

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    console.log(`Driver ${driver.name} set status → ${driver.driverStatus}`);

    res.json({
      success: true,
      status:  driver.driverStatus,   // ← frontend reads this field
      message: `You are now ${driver.driverStatus}`,
    });
  } catch (error) {
    console.error('Driver status update error:', error);
    res.status(500).json({ success: false, message: 'Server error updating status' });
  }
});

/**
 * @route   PUT /api/drivers/preferences
 * @desc    Driver saves their availability time window and zone preference
 * @access  Private (driver)
 *
 * Body: { availableFrom: "08:00", availableUntil: "17:00", zone: "Nairobi CBD" }
 */
router.put('/preferences', protect, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ success: false, message: 'Driver access required' });
    }

    const { availableFrom, availableUntil, zone } = req.body;

    const updates = {};
    if (availableFrom)  updates.availableFrom  = availableFrom;
    if (availableUntil) updates.availableUntil = availableUntil;
    if (zone)           updates.zone           = zone;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No preferences provided' });
    }

    const driver = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: false }
    );

    res.json({
      success:        true,
      message:        'Preferences saved',
      availableFrom:  driver.availableFrom,
      availableUntil: driver.availableUntil,
      zone:           driver.zone,
    });
  } catch (error) {
    console.error('Driver preferences error:', error);
    res.status(500).json({ success: false, message: 'Server error saving preferences' });
  }
});

// Append earnings endpoint after existing code
// ─── UTILITY FUNCTION ──────────────────────────────────────────────────────────
const timeAgo = (d) => {
  if (!d) return "";
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
};

// ─── GET /api/drivers/earnings ─────────────────────────────────────────────────
router.get('/earnings', protect, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ success: false, message: 'Driver access required' });
    }

    const driver = req.user;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Recent successful deliveries for list view (limit 20)
    const recentDeliveries = await Delivery.find({ 
      driver: driver._id, 
      status: 'delivered',
      deliveredAt: { $gte: monthStart }
    })
    .populate('order', 'orderNumber totalPrice createdAt')
    .sort({ deliveredAt: -1 })
    .limit(20);

    // Aggregates
    const todayEarnings = await Delivery.aggregate([
      { $match: { driver: driver._id, status: 'delivered', deliveredAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$driverEarnings' } } }
    ]);
    const weekEarnings = await Delivery.aggregate([
      { $match: { driver: driver._id, status: 'delivered', deliveredAt: { $gte: weekAgo } } },
      { $group: { _id: null, total: { $sum: '$driverEarnings' } } }
    ]);
    const monthEarnings = await Delivery.aggregate([
      { $match: { driver: driver._id, status: 'delivered', deliveredAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$driverEarnings' } } }
    ]);
    const pendingPayout = driver.pendingEarnings || 0;
    const totalCount = await Delivery.countDocuments({ driver: driver._id, status: 'delivered' });

    res.json({
      success: true,
      summary: {
        today: todayEarnings[0]?.total || 0,
        week: weekEarnings[0]?.total || 0,
        month: monthEarnings[0]?.total || 0,
        pendingPayout,
        totalDeliveries: totalCount,
        deliveryFee: driver.deliveryFee || 200,
      },
      recent: recentDeliveries.map(d => ({
        _id: d._id,
        orderNumber: d.order.orderNumber,
        orderCost: d.order.totalPrice,
        earnings: d.driverEarnings,
        date: d.deliveredAt,
        timeAgo: timeAgo(d.deliveredAt),
      })),
    });
  } catch (err) {
    console.error('Earnings error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

