/**
 * Fix missing product images in MongoDB
 * Run from backend folder: node scripts/fixImages.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const imageMap = [
  { name: /iphone 15/i, image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&h=600&fit=crop' },
  { name: /samsung galaxy s24 ultra/i, image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&h=600&fit=crop' },
  { name: /samsung galaxy s24/i, image: 'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=600&h=600&fit=crop' },
  { name: /macbook air/i, image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&h=600&fit=crop' },
  { name: /macbook pro/i, image: 'https://images.unsplash.com/photo-1611186871525-de8c8cc49c87?w=600&h=600&fit=crop' },
  { name: /dell xps 15/i, image: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&h=600&fit=crop' },
  { name: /dell xps 13/i, image: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=600&h=600&fit=crop' },
  { name: /asus rog/i, image: 'https://images.unsplash.com/photo-1593642634367-d91a135587b5?w=600&h=600&fit=crop' },
  { name: /asus rt/i, image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&h=600&fit=crop' },
  { name: /sony wh/i, image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600&h=600&fit=crop' },
  { name: /sony alpha/i, image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&h=600&fit=crop' },
  { name: /airpods/i, image: 'https://images.unsplash.com/photo-1603351154351-5e2d0600bb77?w=600&h=600&fit=crop' },
  { name: /ipad pro/i, image: 'https://images.unsplash.com/photo-1544244015-0df4592c5636?w=600&h=600&fit=crop' },
  { name: /ipad air/i, image: 'https://images.unsplash.com/photo-1589739900266-43b2843f4c12?w=600&h=600&fit=crop' },
  { name: /galaxy tab/i, image: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=600&h=600&fit=crop' },
  { name: /playstation/i, image: 'https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=600&h=600&fit=crop' },
  { name: /xbox/i, image: 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=600&h=600&fit=crop' },
  { name: /nintendo/i, image: 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=600&h=600&fit=crop' },
  { name: /canon/i, image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&h=600&fit=crop' },
  { name: /gopro/i, image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=600&fit=crop' },
  { name: /apple watch/i, image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&h=600&fit=crop' },
  { name: /galaxy watch/i, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop' },
  { name: /garmin/i, image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&h=600&fit=crop' },
  { name: /fitbit/i, image: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=600&h=600&fit=crop' },
  { name: /logitech mx/i, image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&h=600&fit=crop' },
  { name: /logitech c920/i, image: 'https://images.unsplash.com/photo-1587826080692-f439cd0b70a1?w=600&h=600&fit=crop' },
  { name: /anker/i, image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&h=600&fit=crop' },
  { name: /keychron/i, image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&h=600&fit=crop' },
  { name: /netgear/i, image: 'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=600&h=600&fit=crop' },
  { name: /ubiquiti/i, image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&h=600&fit=crop' },
  { name: /tp-link/i, image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&h=600&fit=crop' },
  { name: /steelseries/i, image: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=600&h=600&fit=crop' },
  { name: /pixel/i, image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&h=600&fit=crop' },
  { name: /oneplus/i, image: 'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=600&h=600&fit=crop' },
  { name: /lenovo/i, image: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=600&h=600&fit=crop' },
  { name: /hp spectre/i, image: 'https://images.unsplash.com/photo-1544731612-de7f96afe55f?w=600&h=600&fit=crop' },
  { name: /msi/i, image: 'https://images.unsplash.com/photo-1619953942547-233ac5d748ff?w=600&h=600&fit=crop' },
  { name: /bose/i, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop' },
  { name: /samsung galaxy buds/i, image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&h=600&fit=crop' },
  { name: /intel core/i, image: 'https://images.unsplash.com/photo-1555617766-c94804975da7?w=600&h=600&fit=crop' },
];

const fixImages = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    let totalFixed = 0;

    // Fix products with missing/local images
    for (const entry of imageMap) {
      const result = await Product.updateMany(
        {
          name: entry.name,
          $or: [
            { image: { $exists: false } },
            { image: null },
            { image: '' },
            { image: /^\// }  // local paths starting with /
          ]
        },
        { $set: { image: entry.image } }
      );
      if (result.modifiedCount > 0) {
        console.log(`✅ Fixed: ${entry.name} → ${result.modifiedCount} product(s)`);
        totalFixed += result.modifiedCount;
      }
    }

    // Show remaining products still missing images
    const stillMissing = await Product.find({
      $or: [
        { image: { $exists: false } },
        { image: null },
        { image: '' },
        { image: /^\// }
      ]
    }).select('name image');

    if (stillMissing.length > 0) {
      console.log('\n⚠️  Products still missing images:');
      stillMissing.forEach(p => console.log(' -', p.name, '| image:', p.image));
    }

    console.log(`\n✅ Done! Fixed ${totalFixed} products.`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

fixImages();