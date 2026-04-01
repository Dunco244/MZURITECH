/**
 * Order Model
 * Handles order data for the e-commerce store
 */

const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: false,
    default: ''
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // null for guest orders
    default: null
  },
  isGuestOrder: {
    type: Boolean,
    default: false
  },
  // ── Guest email — used to send order confirmation when no account ──
  guestEmail: {
    type: String,
    default: null,
    lowercase: true,
    trim: true,
  },
  orderItems: [orderItemSchema],
  shippingAddress: {
    fullName: { type: String },
    street:   { type: String, required: true },
    city:     { type: String, required: true },
    state:    { type: String, required: true },
    zipCode:  { type: String, required: true },
    country:  { type: String, default: 'Kenya' },
    phone:    { type: String },
    landmark:             { type: String },
    deliveryInstructions: { type: String },
  },
  paymentMethod: {
    type: String,
    enum: ['cod', 'mpesa'],
    default: 'cod'
  },
  paymentResult: {
    id:         String,
    status:     String,
    email:      String,
    updateTime: String
  },
  itemsPrice: {
    type: Number,
    required: true
  },
  taxPrice: {
    type: Number,
    default: 0
  },
  shippingPrice: {
    type: Number,
    default: 0
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  appliedCouponCode: {
    type: String,
    default: null
  },
  totalPrice: {
    type: Number,
    required: true
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  pointsAwarded: {
    type: Boolean,
    default: false
  },
  pointsEarned: {
    type: Number,
    default: 0,
    min: 0
  },
  paidAt: {
    type: Date
  },
  isDelivered: {
    type: Boolean,
    default: false
  },
  deliveredAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'failed', 'refunded'],
    default: 'pending'
  },
  notes: {
    type: String
  },
  trackingNumber: {
    type: String
  },
  shippedBy: {
    type: String
  }
}, {
  timestamps: true
});

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const date   = new Date();
    const year   = date.getFullYear();
    const month  = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.orderNumber = `ORD-${year}${month}-${random}`;
  }
  next();
});

// Virtual: total item count
orderSchema.virtual('itemsCount').get(function() {
  return this.orderItems.reduce((acc, item) => acc + item.quantity, 0);
});

module.exports = mongoose.model('Order', orderSchema);
