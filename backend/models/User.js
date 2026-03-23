/**
 * User Model — MzuriTech
 * Handles all user types: customer, admin, vendor, driver
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String, required: [true, 'Name is required'],
    trim: true, maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String, required: [true, 'Email is required'],
    unique: true, lowercase: true, trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String, required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'], select: false
  },
  phone:  { type: String, trim: true },
  avatar: { type: String, default: '' },

  // ── Role ──────────────────────────────────────────────────────────────────
  role: {
    type: String,
    enum: ['customer', 'admin', 'vendor', 'driver'],
    default: 'customer'
  },

  // ── Driver-specific fields ────────────────────────────────────────────────
  vehicleType: {
    type: String,
    enum: ['motorcycle', 'bicycle', 'car', 'van', 'truck'],
    default: 'motorcycle'
  },
  licensePlate: { type: String, trim: true },
  zone:         { type: String, trim: true },

  driverStatus: {
    type: String,
    enum: ['available', 'busy', 'offline'],
    default: 'offline'
  },

  // Availability preferences
  availableFrom:  { type: String }, // e.g. "08:00"
  availableUntil: { type: String }, // e.g. "17:00"

  currentOrder:         { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  totalDeliveries:      { type: Number, default: 0 },
  successfulDeliveries: { type: Number, default: 0 },
  driverRating:         { type: Number, default: 5.0, min: 1, max: 5 },

  // ── Driver earnings ───────────────────────────────────────────────────────
  // Fixed delivery fee per job — NOT the order value
  totalEarnings:     { type: Number, default: 0 }, // all-time accumulated earnings
  pendingEarnings:   { type: Number, default: 0 }, // earned but not yet paid out
  thisMonthEarnings: { type: Number, default: 0 }, // current month (reset on payout/monthly)
  lastPayoutAt:      { type: Date },               // timestamp of last payout
  lastPayoutAmount:  { type: Number, default: 0 }, // amount of last payout

  // ── Vendor-specific fields ────────────────────────────────────────────────
  isVendor:            { type: Boolean, default: false },
  isApproved:          { type: Boolean, default: false },
  businessName:        { type: String, trim: true },
  businessDescription: { type: String, trim: true },
  businessAddress: {
    street: String, city: String, state: String, zipCode: String, country: String
  },
  businessPhone: { type: String, trim: true },
  totalSales:    { type: Number, default: 0 },
  totalOrders:   { type: Number, default: 0 },
  totalProducts: { type: Number, default: 0 },
  vendorProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

  // ── Common fields ─────────────────────────────────────────────────────────
  address: {
    street: String, city: String, state: String, zipCode: String, country: String
  },
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  orders:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order'   }],
  isActive:  { type: Boolean, default: true },
  lastLogin: Date,
  resetPasswordToken:  String,
  resetPasswordExpire: Date,
}, { timestamps: true });

// ── Hash password before saving ───────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ── Compare password ──────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// ── Delivery fee rates — must match deliveryRoutes.js DELIVERY_FEES ───────────
const DELIVERY_FEES = { motorcycle: 200, bicycle: 200, car: 350, van: 500, truck: 800 };

// ── Public profile ────────────────────────────────────────────────────────────
userSchema.methods.getPublicProfile = function () {
  const profile = {
    id:        this._id,
    name:      this.name,
    email:     this.email,
    phone:     this.phone,
    avatar:    this.avatar,
    role:      this.role,
    address:   this.address,
    isActive:  this.isActive,
    createdAt: this.createdAt,
  };

  // Driver fields
  if (this.role === 'driver') {
    const vehicleType = this.vehicleType || 'motorcycle';
    profile.vehicleType          = vehicleType;
    profile.licensePlate         = this.licensePlate;
    profile.zone                 = this.zone;
    profile.availableFrom        = this.availableFrom;
    profile.availableUntil       = this.availableUntil;
    profile.driverStatus         = this.driverStatus;
    profile.currentOrder         = this.currentOrder;
    profile.totalDeliveries      = this.totalDeliveries      || 0;
    profile.successfulDeliveries = this.successfulDeliveries || 0;
    profile.driverRating         = this.driverRating         || 5.0;

    // Earnings — fixed fee per job, NOT order value
    profile.totalEarnings        = this.totalEarnings        || 0;
    profile.pendingEarnings      = this.pendingEarnings      || 0;
    profile.thisMonthEarnings    = this.thisMonthEarnings    || 0;
    profile.lastPayoutAt         = this.lastPayoutAt         || null;
    profile.lastPayoutAmount     = this.lastPayoutAmount     || 0;
    profile.deliveryFee          = DELIVERY_FEES[vehicleType] || 200; // their rate per job
  }

  // Vendor fields
  if (this.isVendor || this.role === 'vendor') {
    profile.isVendor            = this.isVendor;
    profile.isApproved          = this.isApproved;
    profile.businessName        = this.businessName;
    profile.businessDescription = this.businessDescription;
    profile.businessAddress     = this.businessAddress;
    profile.businessPhone       = this.businessPhone;
    profile.totalSales          = this.totalSales;
    profile.totalOrders         = this.totalOrders;
    profile.totalProducts       = this.totalProducts;
  }

  return profile;
};

module.exports = mongoose.model('User', userSchema);