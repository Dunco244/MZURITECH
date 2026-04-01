// routes/rewardsRoutes.js
const express = require('express');
const router  = express.Router();
const Rewards = require('../models/Rewards');
const Coupon  = require('../models/Coupon');
const { protect } = require('../middleware/auth'); // your existing auth middleware

// ── Constants ──────────────────────────────────────────────────────────────
const POINTS_PER_100_KES = 1;   // 1 point per KES 100 spent
const KES_PER_POINT      = 1;   // 1 point = KES 1 discount
const MIN_REDEEM         = 100; // minimum points to redeem
const REFERRAL_BONUS     = 200; // points for successful referral
const REFERRED_BONUS     = 100; // points for the referred user

// ── Helper: get or create rewards doc ─────────────────────────────────────
async function getOrCreate(userId) {
  let rewards = await Rewards.findOne({ user: userId });
  if (!rewards) {
    rewards = await Rewards.create({ user: userId });
  }
  return rewards;
}

// ── GET /api/rewards/me ───────────────────────────────────────────────────
// Returns current user's rewards data
router.get('/me', protect, async (req, res) => {
  try {
    const rewards = await getOrCreate(req.user._id);
    res.json({
      success: true,
      rewards: {
        points:        rewards.points,
        totalEarned:   rewards.totalEarned,
        totalRedeemed: rewards.totalRedeemed,
        referralCode:  rewards.referralCode,
        referralCount: rewards.referralCount,
        transactions:  rewards.transactions.slice().reverse().slice(0, 30), // latest 30
      },
    });
  } catch (err) {
    console.error('GET /rewards/me error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/rewards/earn ────────────────────────────────────────────────
// Called internally after a successful order is placed
// Body: { userId, orderId, orderTotal (KES) }
router.post('/earn', protect, async (req, res) => {
  try {
    const { orderId, orderTotal } = req.body;
    if (!orderTotal || orderTotal <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid order total' });
    }

    const pointsEarned = Math.floor((orderTotal / 100) * POINTS_PER_100_KES);
    if (pointsEarned <= 0) {
      return res.json({ success: true, pointsEarned: 0 });
    }

    const rewards = await getOrCreate(req.user._id);
    rewards.points      += pointsEarned;
    rewards.totalEarned += pointsEarned;
    rewards.transactions.push({
      type:        'earned',
      points:      pointsEarned,
      description: `Earned from purchase (KES ${orderTotal.toLocaleString()})`,
      orderId,
    });

    await rewards.save();
    res.json({ success: true, pointsEarned, newBalance: rewards.points });
  } catch (err) {
    console.error('POST /rewards/earn error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/rewards/redeem ──────────────────────────────────────────────
// Body: { points }
// Returns a coupon code the frontend can show / apply at checkout
router.post('/redeem', protect, async (req, res) => {
  try {
    const { points } = req.body;
    const pts = parseInt(points);

    if (!pts || pts < MIN_REDEEM) {
      return res.status(400).json({ success: false, message: `Minimum redemption is ${MIN_REDEEM} points` });
    }

    const rewards = await getOrCreate(req.user._id);
    if (rewards.points < pts) {
      return res.status(400).json({ success: false, message: 'Insufficient points' });
    }

    // Generate a coupon code
    const couponCode = `MZURI-${pts}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
    const kesValue   = pts * KES_PER_POINT;

    rewards.points        -= pts;
    rewards.totalRedeemed += pts;
    rewards.transactions.push({
      type:        'redeemed',
      points:      pts,
      description: `Redeemed for KES ${kesValue} discount (${couponCode})`,
      couponCode,
    });

    await rewards.save();

    // Save coupon to DB so it can be validated at checkout
    await Coupon.create({
      code:     couponCode,
      user:     req.user._id,
      kesValue,
    });

    res.json({
      success:     true,
      couponCode,
      kesValue,
      newBalance:  rewards.points,
    });
  } catch (err) {
    console.error('POST /rewards/redeem error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/rewards/coupon/validate ─────────────────────────────────────
// Body: { couponCode }
// Validates a coupon belongs to the current user and is unused
router.post('/coupon/validate', protect, async (req, res) => {
  try {
    const { couponCode } = req.body;
    if (!couponCode) {
      return res.status(400).json({ success: false, message: 'Coupon code is required' });
    }

    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim() });

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Invalid coupon code' });
    }
    if (coupon.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'This coupon does not belong to your account' });
    }
    if (coupon.isUsed) {
      return res.status(400).json({ success: false, message: 'This coupon has already been used' });
    }
    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return res.status(400).json({ success: false, message: 'This coupon has expired' });
    }

    res.json({ success: true, kesValue: coupon.kesValue, couponCode: coupon.code });
  } catch (err) {
    console.error('POST /rewards/coupon/validate error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/rewards/referral/apply ─────────────────────────────────────
// Called after a new user registers with a referral code and places first order
// Body: { referralCode }
router.post('/referral/apply', protect, async (req, res) => {
  try {
    const { referralCode } = req.body;
    if (!referralCode) {
      return res.status(400).json({ success: false, message: 'Referral code required' });
    }

    // Find referrer
    const referrerRewards = await Rewards.findOne({ referralCode: referralCode.toUpperCase() });
    if (!referrerRewards) {
      return res.status(404).json({ success: false, message: 'Invalid referral code' });
    }

    // Prevent self-referral
    if (referrerRewards.user.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot use your own referral code' });
    }

    // Check if this user was already referred
    const myRewards = await getOrCreate(req.user._id);
    if (myRewards.referredBy) {
      return res.status(400).json({ success: false, message: 'Referral already applied' });
    }

    // Credit referrer
    referrerRewards.points        += REFERRAL_BONUS;
    referrerRewards.totalEarned   += REFERRAL_BONUS;
    referrerRewards.referralCount += 1;
    referrerRewards.transactions.push({
      type:        'referral',
      points:      REFERRAL_BONUS,
      description: `Referral bonus — a friend joined using your code`,
    });
    await referrerRewards.save();

    // Credit referred user
    myRewards.points      += REFERRED_BONUS;
    myRewards.totalEarned += REFERRED_BONUS;
    myRewards.referredBy  =  referrerRewards.user;
    myRewards.transactions.push({
      type:        'bonus',
      points:      REFERRED_BONUS,
      description: `Welcome bonus — joined via referral`,
    });
    await myRewards.save();

    res.json({
      success:        true,
      pointsAwarded:  REFERRED_BONUS,
      newBalance:     myRewards.points,
    });
  } catch (err) {
    console.error('POST /rewards/referral/apply error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/rewards/bonus ───────────────────────────────────────────────
// Admin-only: manually award bonus points to a user
// Body: { userId, points, description }
router.post('/bonus', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const { userId, points, description } = req.body;
    if (!userId || !points || points <= 0) {
      return res.status(400).json({ success: false, message: 'userId and positive points required' });
    }

    const rewards = await getOrCreate(userId);
    rewards.points      += points;
    rewards.totalEarned += points;
    rewards.transactions.push({ type: 'bonus', points, description: description || 'Admin bonus' });
    await rewards.save();

    res.json({ success: true, newBalance: rewards.points });
  } catch (err) {
    console.error('POST /rewards/bonus error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;