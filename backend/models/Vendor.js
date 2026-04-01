/**
 * Vendor Model
 * Stores vendor-specific business records, linked to a User account.
 * When a vendor registers, a User doc (role: 'vendor') AND a Vendor doc are created.
 */

const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  // Reference to the User account
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },

  // Business details
  businessName:        { type: String, required: true, trim: true },
  businessDescription: { type: String, trim: true, default: '' },
  businessPhone:       { type: String, trim: true },
  businessAddress: {
    street:  String,
    city:    String,
    state:   String,
    zipCode: String,
    country: { type: String, default: 'Kenya' },
  },

  // Approval status
  isApproved: { type: Boolean, default: false },
  approvedAt: { type: Date },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // Stats (kept in sync by vendor routes)
  totalProducts: { type: Number, default: 0 },
  totalOrders:   { type: Number, default: 0 },
  totalSales:    { type: Number, default: 0 },

  // Products listed by this vendor
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Vendor', vendorSchema);
