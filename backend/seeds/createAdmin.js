/**
 * Admin User Creation Script
 * Run this script to create an admin user
 * 
 * Usage: node seeds/createAdmin.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// MongoDB Atlas Connection
const MONGODB_URI = 'mongodb+srv://kibet_duncan:mzruriproject@mzuri.9bzuhyl.mongodb.net/mzuri_marketplace?retryWrites=true&w=majority';

const adminUser = {
  name: 'Admin',
  email: 'admin@mzuritech.com',
  password: 'admin123',
  phone: '+254700000000',
  role: 'admin'
};

async function createAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminUser.email });
    
    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Admin email:', existingAdmin.email);
      console.log('Admin role:', existingAdmin.role);
      
      // Update existing user to admin
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log('✓ Updated existing user to admin role');
      }
    } else {
      // Create new admin user
      const salt = await bcrypt.genSalt(10);
      adminUser.password = await bcrypt.hash(adminUser.password, salt);
      
      const admin = await User.create(adminUser);
      console.log('✓ Admin user created successfully!');
      console.log('Admin email:', admin.email);
      console.log('Admin role:', admin.role);
    }

    console.log('\n--- Admin Login Credentials ---');
    console.log('Email: admin@mzuritech.com');
    console.log('Password: admin123');
    console.log('-------------------------------');

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error.message);
    process.exit(1);
  }
}

createAdmin();
