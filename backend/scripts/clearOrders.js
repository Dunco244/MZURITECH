/**
 * Delete all order-related data (Orders, Deliveries, Order Notifications)
 * Usage: node backend/scripts/clearOrders.js
 */

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('../config/db');
const Order = require('../models/Order');
const Delivery = require('../models/Delivery');
const Notification = require('../models/Notification');

async function run() {
  await connectDB();

  const [ordersCount, deliveriesCount, notifCount] = await Promise.all([
    Order.countDocuments(),
    Delivery.countDocuments(),
    Notification.countDocuments({ relatedModel: 'Order' }),
  ]);

  console.log(`Orders: ${ordersCount}, Deliveries: ${deliveriesCount}, Order Notifications: ${notifCount}`);
  console.log('Deleting all order data...');

  await Promise.all([
    Order.deleteMany({}),
    Delivery.deleteMany({}),
    Notification.deleteMany({ relatedModel: 'Order' }),
  ]);

  console.log('✅ All order data deleted.');
  await mongoose.connection.close();
}

run().catch(err => {
  console.error('❌ Failed to clear orders:', err);
  process.exit(1);
});
