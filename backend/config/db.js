
/**
 * Database Configuration
 * Handles MongoDB connection - tries local first, then falls back to Atlas
 */

const mongoose = require('mongoose');

// Local MongoDB connection string
const LOCAL_URI = 'mongodb://127.0.0.1:27017/mzuri_marketplace';

// MongoDB Atlas connection string (fallback)
const ATLAS_URI = 'mongodb+srv://kibet_duncan:mzruri2024@mzuri.9bzuhyl.mongodb.net/mzuri_marketplace?retryWrites=true&w=majority';

// Determine which connection to use
const getConnectionString = () => {
  // Check for environment variable first
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }
  
  // Default to local MongoDB
  return LOCAL_URI;
};

const connectDB = async () => {
  const mongoURI = getConnectionString();
  
  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
      connectTimeoutMS: 10000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    
    // If local failed and we haven't tried Atlas yet, try Atlas as fallback
    if (mongoURI === LOCAL_URI && process.env.MONGODB_URI === undefined) {
      console.log('Trying MongoDB Atlas as fallback...');
      try {
        const conn = await mongoose.connect(ATLAS_URI, {
          serverSelectionTimeoutMS: 10000,
          connectTimeoutMS: 15000,
        });
        console.log(`MongoDB Atlas Connected: ${conn.connection.host}`);
      } catch (atlasError) {
        console.error(`MongoDB Atlas Connection Failed: ${atlasError.message}`);
        console.log('\n=== SETUP INSTRUCTIONS ===');
        console.log('To fix this, you have two options:');
        console.log('1. Install MongoDB Community Server locally');
        console.log('   Download from: https://www.mongodb.com/try/download/community');
        console.log('2. Or update your .env file with a valid MongoDB Atlas connection string');
        console.log('==============================\n');
        process.exit(1);
      }
    } else {
      console.log('Please check your MongoDB connection string');
      process.exit(1);
    }
  }
};

module.exports = connectDB;
