/**
 * migrate-images.js
 * Place this in: backend/scripts/migrate-images.js
 * 
 * Run once to convert all existing base64 images in MongoDB
 * to proper files saved on disk.
 * 
 * Usage:
 *   cd backend
 *   node scripts/migrate-images.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const connectDB = require('../config/db');
const Product = require('../models/Product');

const uploadDir = path.join(__dirname, '../uploads/products');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Converts a base64 data URL to a saved file
 * Returns the relative URL path e.g. /uploads/products/product-123.jpg
 */
function saveBase64Image(base64String, productId) {
  try {
    // Extract mime type and data
    const matches = base64String.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) return null;

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const imageData = matches[2];
    const filename = `product-${productId}-${Date.now()}.${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Write file to disk
    fs.writeFileSync(filepath, Buffer.from(imageData, 'base64'));
    console.log(`  ✅ Saved: ${filename}`);
    
    return `/uploads/products/${filename}`;
  } catch (err) {
    console.error(`  ❌ Failed to save image for product ${productId}:`, err.message);
    return null;
  }
}

async function migrateImages() {
  await connectDB();
  console.log('\n🔄 Starting image migration...\n');

  // Find all products with base64 images
  const products = await Product.find({
    image: { $regex: '^data:image', $options: 'i' }
  });

  console.log(`Found ${products.length} products with base64 images\n`);

  let success = 0;
  let failed = 0;

  for (const product of products) {
    console.log(`Processing: ${product.name} (${product._id})`);

    // Migrate main image
    if (product.image?.startsWith('data:image')) {
      const newImageUrl = saveBase64Image(product.image, product._id);
      if (newImageUrl) {
        product.image = newImageUrl;
        success++;
      } else {
        failed++;
      }
    }

    // Migrate additional images array
    if (product.images?.length > 0) {
      product.images = product.images.map((img, idx) => {
        if (img?.startsWith('data:image')) {
          const newUrl = saveBase64Image(img, `${product._id}-${idx}`);
          return newUrl || img;
        }
        return img;
      });
    }

    // Save updated product (bypass slug middleware by using updateOne)
    await Product.updateOne(
      { _id: product._id },
      { $set: { image: product.image, images: product.images } }
    );
  }

  console.log(`\n✅ Migration complete!`);
  console.log(`   Success: ${success} images converted`);
  console.log(`   Failed:  ${failed} images`);
  console.log(`\nImages saved to: ${uploadDir}`);
  console.log('Restart your backend server to serve the new images.\n');

  mongoose.connection.close();
}

migrateImages().catch(err => {
  console.error('Migration failed:', err);
  mongoose.connection.close();
  process.exit(1);
});