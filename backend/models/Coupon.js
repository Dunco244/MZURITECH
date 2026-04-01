const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code:       { type: String, required: true, unique: true, uppercase: true, trim: true },
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  kesValue:   { type: Number, required: true },
  isUsed:     { type: Boolean, default: false },
  usedAt:     { type: Date },
  usedInOrder:{ type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  expiresAt:  { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }, // 30 days
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
