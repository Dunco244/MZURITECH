/**
 * Update User to Admin Script
 * Usage: node seeds/updateToAdmin.js user@email.com
 */

const mongoose = require('mongoose');
const User = require('../models/User');

// MongoDB Atlas Connection
const MONGODB_URI = 'mongodb+srv://kibet_duncan:mzruriproject@mzuri.9bzuhyl.mongodb.net/mzuri_marketplace?retryWrites=true&w=majority';

const email = process.argv[2];

if (!email) {
  console.log('Usage: node seeds/updateToAdmin.js user@email.com');
  console.log('Example: node seeds/updateToAdmin.js john@example.com');
  process.exit(1);
}

async function updateToAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log('User not found with email:', email);
      process.exit(1);
    }

    console.log('Found user:', user.name, '-', user.email);
    console.log('Current role:', user.role);
    
    user.role = 'admin';
    await user.save();
    
    console.log('✓ Successfully updated user role to admin!');
    console.log('\nYou can now login to access the admin dashboard.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

updateToAdmin();
