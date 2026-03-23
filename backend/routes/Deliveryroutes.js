const express  = require('express');
const router   = express.Router();
const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const Delivery = require('../models/Delivery');
const Order    = require('../models/Order');
const Notification = require('../models/Notification');
const { sendDispatchedEmail, sendDeliveredEmail, sendDriverJobEmail, sendJobTakenEmail, sendAdminDeliveryFailedAlert } = require('../services/emailService');
const { awardOrderPoints } = require('../services/rewardsService');

// ─── Delivery fee rates by vehicle type ──────────────────────────────────────
// Fixed per-delivery earnings agreed with drivers — NOT the order value.
// Change these values to adjust what each driver earns per completed job.
const DELIVERY_FEES = {
  motorcycle: 200,
  bicycle:    200,
  car:        350,
  van:        500,
  truck:      800,
};
const getDeliveryFee = (vehicleType) => DELIVERY_FEES[vehicleType?.toLowerCase()] ?? 200;

// ─── Middleware ───────────────────────────────────────────────────────────────
async function protectAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select('-password');
    if (!user)                 return res.status(401).json({ success: false, message: 'User not found' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' });
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

async function protectDriver(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select('-password');
    if (!user)                  return res.status(401).json({ success: false, message: 'User not found' });
    if (user.role !== 'driver') return res.status(403).json({ success: false, message: 'Driver access required' });
    if (!user.isActive)         return res.status(403).json({ success: false, message: 'Account is deactivated' });
    req.driver = user;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

// ─── POST /api/deliveries/dispatch/:orderId ───────────────────────────────────
router.post('/dispatch/:orderId', protectAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate('user', 'name email');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const existing = await Delivery.findOne({ order: order._id });
    if (existing && ['accepted', 'in_transit', 'delivered'].includes(existing.status)) {
      return res.status(400).json({ success: false, message: 'This order already has an active delivery' });
    }

    const city = order.shippingAddress?.city?.trim() || '';
    let drivers = [];
    const { driverId } = req.body;

    if (driverId) {
      const chosen = await User.findOne({ _id: driverId, role: 'driver', isActive: true }).select('-password');
      if (!chosen) return res.status(404).json({ success: false, message: 'Selected driver not found or inactive' });
      drivers = [chosen];
    } else {
      drivers = await User.find({
        role: 'driver', driverStatus: 'available', isActive: true,
        ...(city ? { zone: { $regex: new RegExp(`^${city}$`, 'i') } } : {}),
      }).select('-password');

      if (drivers.length === 0) {
        return res.status(404).json({
          success: false,
          message: city
            ? `No available drivers in "${city}". Select a driver manually from the list instead.`
            : 'No available drivers found.',
        });
      }
    }

    const confirmationCode = String(Math.floor(100000 + Math.random() * 900000));
    let delivery = existing || new Delivery({ order: order._id });
    delivery.confirmationCode = confirmationCode;
    delivery.status           = 'dispatched';
    delivery.dispatchedAt     = new Date();
    delivery.driver           = driverId ? driverId : null;
    delivery.codeUsed         = false;
    await delivery.save();

    if (order.status === 'pending') { order.status = 'processing'; await order.save(); }

    const pickupAddress = process.env.SHOP_ADDRESS || 'MzuriTech Warehouse, Nairobi';
    await Promise.allSettled(
      drivers.map(driver =>
        sendDriverJobEmail({
          to:              driver.email,
          driverName:      driver.name,
          orderNumber:     order.orderNumber || order._id.toString().slice(-8),
          pickupAddress,
          deliveryCity:    city,
          deliveryAddress: order.shippingAddress?.address || '',
          itemCount:       order.orderItems?.length || 0,
          orderValue:      order.totalPrice,
        }).catch(e => console.error(`Job email failed for ${driver.email}:`, e.message))
      )
    );

    if (driverId && !delivery.customerNotified) {
      const customerEmail = order.user?.email || order.guestEmail;
      const customerName  = order.user?.name || order.shippingAddress?.fullName || 'Customer';
      if (customerEmail) {
        await sendDispatchedEmail({
          to:                customerEmail,
          customerName,
          orderNumber:       order.orderNumber || order._id.toString().slice(-8),
          driverName:        drivers[0].name,
          driverPhone:       drivers[0].phone,
          vehicleType:       drivers[0].vehicleType,
          licensePlate:      drivers[0].licensePlate,
          estimatedDelivery: delivery.estimatedDelivery
            ? delivery.estimatedDelivery.toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })
            : undefined,
          confirmationCode:  delivery.confirmationCode,
        }).catch(e => console.error('Customer dispatch email failed:', e.message));
        delivery.customerNotified = true;
        await delivery.save();
      }
    }

    const io = req.app.get('io');
    if (io) io.emit('delivery:dispatched', { orderId: order._id, driversNotified: drivers.length });

    res.json({
      success:         true,
      message:         driverId
        ? `Job sent to ${drivers[0].name}. They'll accept from their portal.`
        : `Dispatched to ${drivers.length} driver(s) in ${city}.`,
      driversNotified: drivers.length,
      deliveryId:      delivery._id,
    });
  } catch (err) {
    console.error('Dispatch error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/deliveries/accept/:orderId ─────────────────────────────────────
router.post('/accept/:orderId', protectDriver, async (req, res) => {
  try {
    const delivery = await Delivery.findOne({ order: req.params.orderId })
      .populate({ path: 'order', populate: { path: 'user', select: 'name email' } });

    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });
    if (delivery.status !== 'dispatched') return res.status(400).json({ success: false, message: 'Job no longer available — another driver accepted it' });

    const driver = req.driver;
    if (driver.driverStatus !== 'available') return res.status(400).json({ success: false, message: 'You are busy with another delivery' });

    delivery.driver            = driver._id;
    delivery.status            = 'accepted';
    delivery.acceptedAt        = new Date();
    delivery.estimatedDelivery = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await delivery.save();

    driver.driverStatus  = 'busy';
    driver.currentOrder  = delivery.order._id;
    await driver.save();

    const order = delivery.order;
    order.status = 'shipped';
    await order.save();

    if (!delivery.customerNotified) {
      const customerEmail = order.user?.email || order.guestEmail;
      const customerName  = order.user?.name || order.shippingAddress?.fullName || 'Customer';
      if (customerEmail) {
        if (!delivery.confirmationCode) {
          delivery.confirmationCode = String(Math.floor(100000 + Math.random() * 900000));
        }
        await sendDispatchedEmail({
          to:                  customerEmail,
          customerName,
          orderNumber:         order.orderNumber || order._id.toString().slice(-8),
          driverName:          driver.name,
          driverPhone:         driver.phone,
          vehicleType:         driver.vehicleType,
          licensePlate:        driver.licensePlate,
          estimatedDelivery:   delivery.estimatedDelivery.toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }),
          confirmationCode:    delivery.confirmationCode,
        }).catch(e => console.error('Customer dispatch email failed:', e.message));
        delivery.customerNotified = true;
        await delivery.save();
      }
    }

    const otherDrivers = await User.find({
      role: 'driver', driverStatus: 'available', isActive: true,
      zone: { $regex: new RegExp(`^${order.shippingAddress?.city || ''}$`, 'i') },
      _id: { $ne: driver._id },
    }).select('email name');

    await Promise.allSettled(
      otherDrivers.map(d =>
        sendJobTakenEmail({
          to: d.email, driverName: d.name,
          orderNumber: order.orderNumber || order._id.toString().slice(-8),
        }).catch(() => {})
      )
    );

    const io = req.app.get('io');
    if (io) io.emit('delivery:accepted', { orderId: order._id, driverId: driver._id, driverName: driver.name });

    res.json({
      success: true,
      message: 'Job accepted! Customer has been notified.',
      delivery: {
        _id:               delivery._id,
        status:            delivery.status,
        estimatedDelivery: delivery.estimatedDelivery,
        order: {
          _id:             order._id,
          orderNumber:     order.orderNumber,
          shippingAddress: order.shippingAddress,
          orderItems:      order.orderItems,
          totalPrice:      order.totalPrice,
        },
      },
    });
  } catch (err) {
    console.error('Accept job error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/deliveries/confirm-code ───────────────────────────────────────
router.post('/confirm-code', protectDriver, async (req, res) => {
  try {
    const { orderId, code } = req.body;
    if (!orderId || !code) {
      return res.status(400).json({ success: false, message: 'orderId and code are required' });
    }

    const delivery = await Delivery.findOne({ order: orderId })
      .populate({ path: 'order', populate: { path: 'user', select: 'name email' } });

    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }
    if (delivery.codeUsed) {
      return res.status(400).json({ success: false, message: 'Code already used' });
    }
    if (delivery.status === 'delivered') {
      return res.status(400).json({ success: false, message: 'Already delivered' });
    }

    const storedCode  = String(delivery.confirmationCode ?? '').trim();
    const enteredCode = String(code).trim();

    console.log(`[confirm-code] stored="${storedCode}" entered="${enteredCode}" match=${storedCode === enteredCode}`);

    if (delivery.driver && delivery.driver.toString() !== req.driver._id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this delivery' });
    }

    if (storedCode !== enteredCode) {
      return res.status(400).json({ success: false, message: '❌ Incorrect code. Ask the customer to check their email.' });
    }

    // ── Calculate fixed delivery fee based on vehicle type ────────────────
    // This is what the driver earns — NOT the order value.
    const fee = getDeliveryFee(req.driver.vehicleType);

    delivery.status        = 'delivered';
    delivery.codeUsed      = true;
    delivery.deliveredAt   = new Date();
    delivery.driverEarning = fee; // store per-job earning for audit trail
    if (!delivery.driver) delivery.driver = req.driver._id;
    await delivery.save();

    const order  = delivery.order;
    order.status = 'delivered';
    order.isPaid = true;
    await order.save();

    // ── Update driver stats with fixed fee ────────────────────────────────
    const driver = req.driver;
    driver.driverStatus          = 'available';
    driver.currentOrder          = null;
    driver.totalDeliveries      += 1;
    driver.successfulDeliveries += 1;
    driver.totalEarnings         = (driver.totalEarnings     || 0) + fee;
    driver.pendingEarnings       = (driver.pendingEarnings   || 0) + fee;
    driver.thisMonthEarnings     = (driver.thisMonthEarnings || 0) + fee;
    await driver.save();

    console.log(`✅ Delivery confirmed — ${driver.name} earned KES ${fee} (${driver.vehicleType})`);

    const customer = order.user;
    if (customer?.email) {
      await sendDeliveredEmail({
        to:           customer.email,
        customerName: customer.name,
        orderNumber:  order.orderNumber || order._id.toString().slice(-8),
        totalPrice:   order.totalPrice,
      }).catch(e => console.error('Delivered email failed:', e.message));
    }

    const io = req.app.get('io');
    if (io) io.emit('delivery:completed', { orderId: order._id, driverId: driver._id, earned: fee });

    // Award reward points to customer (non-blocking)
    awardOrderPoints(order).catch(err =>
      console.error('⚠️  Points award failed (non-blocking):', err.message)
    );

    res.json({
      success:  true,
      message:  '✅ Delivery confirmed! Well done.',
      earned:   fee,
      currency: 'KES',
    });
  } catch (err) {
    console.error('Confirm code error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/deliveries/fail/:orderId ──────────────────────────────────────
router.post('/fail/:orderId', protectDriver, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a failure reason' });
    }

    const delivery = await Delivery.findOne({ order: req.params.orderId })
      .populate({ path: 'order', populate: { path: 'user', select: 'name email' } });

    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    if (!['accepted', 'picked_up', 'in_transit', 'dispatched'].includes(delivery.status)) {
      return res.status(400).json({ success: false, message: `Cannot fail a delivery with status "${delivery.status}"` });
    }

    if (delivery.driver && delivery.driver.toString() !== req.driver._id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this delivery' });
    }

    delivery.status        = 'failed';
    delivery.failureReason = reason.trim();
    await delivery.save();

    const order  = delivery.order;
    order.status = 'processing';
    await order.save();

    const driver = req.driver;
    driver.driverStatus    = 'available';
    driver.currentOrder    = null;
    driver.totalDeliveries += 1;
    await driver.save();

    // Notify admin (email + dashboard notification) — non-blocking
    sendAdminDeliveryFailedAlert({
      order,
      driver,
      reason: reason.trim(),
    }).catch(err =>
      console.error('⚠️  Admin delivery-failed email failed (non-blocking):', err.message)
    );

    try {
      await Notification.create({
        title: 'Delivery Failed',
        message: `Driver ${driver.name} reported failure for order ${order.orderNumber || order._id.toString().slice(-8)}: ${reason.trim()}`,
        type: 'order_status',
        relatedId: order._id,
        relatedModel: 'Order',
        metadata: {
          driverId: driver._id,
          driverName: driver.name,
          reason: reason.trim(),
        },
      });
    } catch (notifErr) {
      console.error('Notification error (non-fatal):', notifErr.message);
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('delivery:failed', {
        orderId:     order._id,
        orderNumber: order.orderNumber || order._id.toString().slice(-8),
        driverId:    driver._id,
        driverName:  driver.name,
        reason:      reason.trim(),
      });
      io.emit('notification:new', {
        title: 'Delivery Failed',
        message: `Driver ${driver.name} reported failure for order ${order.orderNumber || order._id.toString().slice(-8)}.`,
        type: 'order_status',
        createdAt: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: 'Delivery reported as failed. You are now available for new jobs.',
    });
  } catch (err) {
    console.error('Fail delivery error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/deliveries/admin/fail/:orderId ────────────────────────────────
router.post('/admin/fail/:orderId', protectAdmin, async (req, res) => {
  try {
    const { reason } = req.body;

    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.status = 'failed';
    await order.save();

    const delivery = await Delivery.findOne({ order: order._id });
    if (delivery && !['delivered', 'failed', 'cancelled'].includes(delivery.status)) {
      delivery.status        = 'failed';
      delivery.failureReason = reason?.trim() || 'Marked failed by admin';
      await delivery.save();

      if (delivery.driver) {
        const driver = await User.findById(delivery.driver);
        if (driver && driver.role === 'driver') {
          driver.driverStatus    = 'available';
          driver.currentOrder    = null;
          driver.totalDeliveries += 1;
          await driver.save();
        }
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('order:updated', { _id: order._id, status: 'failed' });
    }

    res.json({ success: true, message: 'Order marked as failed.' });
  } catch (err) {
    console.error('Admin fail order error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/deliveries/driver/status ───────────────────────────────────────
router.put('/driver/status', protectDriver, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['available', 'offline'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be "available" or "offline"' });
    }
    const driver = req.driver;
    if (driver.driverStatus === 'busy') {
      return res.status(400).json({ success: false, message: 'Cannot go offline during an active delivery' });
    }
    driver.driverStatus = status;
    await driver.save();
    res.json({ success: true, status: driver.driverStatus });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/deliveries/driver/my-jobs ──────────────────────────────────────
router.get('/driver/my-jobs', protectDriver, async (req, res) => {
  try {
    const driver = req.driver;

    const myDeliveries = await Delivery.find({ driver: driver._id })
      .populate('order', 'orderNumber shippingAddress orderItems totalPrice status createdAt')
      .sort({ createdAt: -1 })
      .limit(20);

    const dispatchedJobs = await Delivery.find({ status: 'dispatched', driver: null })
      .populate('order', 'orderNumber shippingAddress orderItems totalPrice status createdAt')
      .sort({ dispatchedAt: -1 })
      .limit(10);

    const assignedJobs = await Delivery.find({ status: 'dispatched', driver: driver._id })
      .populate('order', 'orderNumber shippingAddress orderItems totalPrice status createdAt')
      .sort({ dispatchedAt: -1 })
      .limit(10);

    const openJobs = [
      ...assignedJobs,
      ...dispatchedJobs.filter(d => {
        const city = d.order?.shippingAddress?.city || '';
        return new RegExp(`^${driver.zone}$`, 'i').test(city);
      }),
    ];

    const dedupedOpenJobs = Array.from(
      new Map(openJobs.map(d => [String(d._id), d])).values()
    );

    res.json({
      success:      true,
      myDeliveries,
      openJobs:     dedupedOpenJobs,
      driverStatus: driver.driverStatus,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/deliveries/track/:orderNumber  (public) ────────────────────────
router.get('/track/:orderNumber', async (req, res) => {
  try {
    const q = {
      $or: [
        { orderNumber: req.params.orderNumber },
        ...(req.params.orderNumber.length === 24 ? [{ _id: req.params.orderNumber }] : []),
      ],
    };
    const order = await Order.findOne(q)
      .select('status orderNumber shippingAddress orderItems totalPrice createdAt');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const delivery = await Delivery.findOne({ order: order._id })
      .populate('driver', 'name phone vehicleType licensePlate')
      .select('-confirmationCode');

    res.json({
      success: true,
      order: {
        orderNumber:     order.orderNumber,
        status:          order.status,
        shippingAddress: order.shippingAddress,
        itemCount:       order.orderItems?.length || 0,
        totalPrice:      order.totalPrice,
        createdAt:       order.createdAt,
      },
      delivery: delivery ? {
        status:            delivery.status,
        estimatedDelivery: delivery.estimatedDelivery,
        dispatchedAt:      delivery.dispatchedAt,
        acceptedAt:        delivery.acceptedAt,
        deliveredAt:       delivery.deliveredAt,
        driver: delivery.driver ? {
          name:         delivery.driver.name,
          phone:        delivery.driver.phone,
          vehicleType:  delivery.driver.vehicleType,
          licensePlate: delivery.driver.licensePlate,
        } : null,
      } : null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/deliveries/admin/all  (admin) ───────────────────────────────────
router.get('/admin/all', protectAdmin, async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const total = await Delivery.countDocuments();

    const deliveries = await Delivery.find()
      .populate('order',  'orderNumber shippingAddress totalPrice status orderItems createdAt')
      .populate('driver', 'name phone vehicleType licensePlate zone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success:    true,
      deliveries,
      pagination: { page, pages: Math.ceil(total / limit), total, limit },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ─── POST /api/deliveries/fail/:orderId ──────────────────────────────────────
// Driver reports they cannot complete the delivery (customer not home, etc.)
// Releases the driver and returns the order to dispatched state for re-dispatch.
router.post('/fail/:orderId', protectDriver, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success:false, message:'Failure reason is required' });

    const delivery = await Delivery.findOne({ order: req.params.orderId });
    if (!delivery) return res.status(404).json({ success:false, message:'Delivery not found' });
    if (delivery.driver?.toString() !== req.driver._id.toString())
      return res.status(403).json({ success:false, message:'You are not assigned to this delivery' });
    if (!['accepted','picked_up','in_transit'].includes(delivery.status))
      return res.status(400).json({ success:false, message:'Delivery is not in an active state' });

    // Mark delivery as failed with reason
    delivery.status        = 'failed';
    delivery.failureReason = reason;
    delivery.failedAt      = new Date();
    await delivery.save();

    // Return order to processing so admin can re-dispatch
    const order = await Order.findById(req.params.orderId);
    if (order) { order.status = 'processing'; await order.save(); }

    // Free the driver
    const driver = req.driver;
    driver.driverStatus = 'available';
    driver.currentOrder = null;
    await driver.save();

    console.log(`⚠️ Delivery failed — driver ${driver.name} reported: ${reason}`);

    // Notify admin (email + dashboard notification) — non-blocking
    sendAdminDeliveryFailedAlert({
      order: order || { _id: req.params.orderId, orderNumber: undefined, shippingAddress: {} },
      driver,
      reason,
    }).catch(err =>
      console.error('⚠️  Admin delivery-failed email failed (non-blocking):', err.message)
    );

    if (order) {
      try {
        await Notification.create({
          title: 'Delivery Failed',
          message: `Driver ${driver.name} reported failure for order ${order.orderNumber || order._id.toString().slice(-8)}: ${reason}`,
          type: 'order_status',
          relatedId: order._id,
          relatedModel: 'Order',
          metadata: {
            driverId: driver._id,
            driverName: driver.name,
            reason,
          },
        });
      } catch (notifErr) {
        console.error('Notification error (non-fatal):', notifErr.message);
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('delivery:failed', { orderId: req.params.orderId, driverId: driver._id, reason });
      if (order) {
        io.emit('notification:new', {
          title: 'Delivery Failed',
          message: `Driver ${driver.name} reported failure for order ${order.orderNumber || order._id.toString().slice(-8)}.`,
          type: 'order_status',
          createdAt: new Date().toISOString(),
        });
      }
    }

    res.json({ success:true, message:'Reported. You have been released from this delivery.' });
  } catch (err) {
    console.error('Delivery fail error:', err);
    res.status(500).json({ success:false, message: err.message });
  }
});

module.exports = router;
