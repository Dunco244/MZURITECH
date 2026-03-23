/**
 * Notification Model
 * Stores notifications for admin dashboard
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['new_vendor', 'new_customer', 'new_order', 'order_status', 'system'],
    default: 'system'
  },
  // Reference to related entity
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'relatedModel'
  },
  relatedModel: {
    type: String,
    enum: ['User', 'Order', 'Product', null],
    default: null
  },
  // For new vendor/customer notifications
  userName: {
    type: String,
    trim: true
  },
  userEmail: {
    type: String,
    trim: true
  },
  // Additional data (business name for vendors, etc.)
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient querying
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ type: 1 });

module.exports = mongoose.model('Notification', notificationSchema);

