const mongoose = require('mongoose');
const crypto   = require('crypto');

const transactionSchema = new mongoose.Schema({
  type:        { type: String, enum: ['earned','redeemed','referral','bonus'], required: true },
  points:      { type: Number, required: true },
  description: { type: String, default: '' },
  orderId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  couponCode:  { type: String, default: null },
  createdAt:   { type: Date, default: Date.now },
}, { _id: true });

const rewardsSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  points:        { type: Number, default: 0, min: 0 },
  totalEarned:   { type: Number, default: 0, min: 0 },
  totalRedeemed: { type: Number, default: 0, min: 0 },
  referralCode:  { type: String, unique: true, sparse: true },
  referralCount: { type: Number, default: 0 },
  referredBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  transactions:  [transactionSchema],
}, { timestamps: true });

rewardsSchema.pre('save', function (next) {
  if (!this.referralCode) {
    this.referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Rewards', rewardsSchema);