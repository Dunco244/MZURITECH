// backend/seeds/seed.js
// Run with: npm run seed  OR  node seeds/seed.js

// ─── DNS fix (same as server.js) ─────────────────────────────────────────────
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
console.log('DNS configured to use Google DNS: 8.8.8.8, 8.8.4.4');

require('dotenv').config();
const mongoose = require('mongoose');
const Product  = require('../models/Product');
const Category = require('../models/Category');

const MONGODB_URI = process.env.MONGODB_URI;

// ─── Categories (all 10) ──────────────────────────────────────────────────────
const categories = [
  { name: 'Laptops',     slug: 'laptops',     displayOrder: 1  },
  { name: 'Phones',      slug: 'phones',      displayOrder: 2  },
  { name: 'Tablets',     slug: 'tablets',     displayOrder: 3  },
  { name: 'Audio',       slug: 'audio',       displayOrder: 4  },
  { name: 'Gaming',      slug: 'gaming',      displayOrder: 5  },
  { name: 'Accessories', slug: 'accessories', displayOrder: 6  },
  { name: 'Cameras',     slug: 'cameras',     displayOrder: 7  },
  { name: 'Wearables',   slug: 'wearables',   displayOrder: 8  },
  { name: 'Computers',   slug: 'computers',   displayOrder: 9  },
  { name: 'Monitors',    slug: 'monitors',    displayOrder: 10 },
];

// ─── Products ─────────────────────────────────────────────────────────────────
const products = [

  // ══ LAPTOPS (10) ══════════════════════════════════════════════════════════════

  { name: 'Dell XPS 15', slug: 'dell-xps-15', description: 'Intel Core i9, 32GB RAM, NVIDIA RTX 4060 graphics.', price: 299850, originalPrice: 344850, brand: 'Dell', category: 'laptops', image: '/product-dell-xps15.png', stockQuantity: 10, inStock: true, badge: 'Featured', isActive: true, isFeatured: true, rating: 4.8, numReviews: 128 },
  { name: 'MacBook Air M3', slug: 'macbook-air-m3', description: 'Apple M3 chip, 18-hour battery, ultra-thin design.', price: 164850, originalPrice: 179850, brand: 'Apple', category: 'laptops', image: '/product-macbook-air.png', stockQuantity: 8, inStock: true, badge: 'Popular', isActive: true, isFeatured: true, rating: 4.8, numReviews: 203 },
  { name: 'Dell XPS 13 Pro', slug: 'dell-xps-13-pro', description: 'Intel Core Ultra 7, ultra-thin, 14-hour battery.', price: 194850, originalPrice: 224850, brand: 'Dell', category: 'laptops', image: '/hero-laptop.png', stockQuantity: 7, inStock: true, badge: 'Best Seller', isActive: true, isFeatured: true, rating: 4.8, numReviews: 312 },
  { name: 'HP Pavilion 15', slug: 'hp-pavilion-15', description: 'AMD Ryzen 5 7530U, 8GB RAM, 512GB SSD. Reliable everyday laptop for students and professionals.', price: 74850, originalPrice: 84850, brand: 'HP', category: 'laptops', image: '/product-hp-pavilion.png', stockQuantity: 14, inStock: true, badge: null, isActive: true, isFeatured: false, rating: 4.3, numReviews: 156 },
  { name: 'Lenovo ThinkPad X1 Carbon', slug: 'lenovo-thinkpad-x1-carbon', description: 'Ultra-lightweight business laptop with Intel Core i7, 16GB RAM, MIL-SPEC durability and legendary keyboard.', price: 219850, originalPrice: 249850, brand: 'Lenovo', category: 'laptops', image: '/product-thinkpad-x1.png', stockQuantity: 6, inStock: true, badge: 'Best Seller', isActive: true, isFeatured: true, rating: 4.8, numReviews: 189 },
  { name: 'Acer Aspire 5', slug: 'acer-aspire-5', description: 'Intel Core i5 12th Gen, 8GB RAM, 512GB SSD. Best budget laptop for university students in Kenya.', price: 59850, originalPrice: 69850, brand: 'Acer', category: 'laptops', image: '/product-acer-aspire5.png', stockQuantity: 18, inStock: true, badge: 'Sale', isActive: true, isFeatured: false, rating: 4.2, numReviews: 267 },
  { name: 'ASUS ROG Strix G16', slug: 'asus-rog-strix-g16', description: 'RTX 4070, 240Hz display, Intel Core i7. Dominate every game.', price: 224850, originalPrice: 254850, brand: 'ASUS', category: 'laptops', image: '/product-gaming-laptop.png', stockQuantity: 5, inStock: true, badge: 'Gaming', isActive: true, isFeatured: true, rating: 4.7, numReviews: 78 },
  { name: 'Lenovo IdeaPad Slim 3i', slug: 'lenovo-ideapad-slim-3i', description: 'Lightweight everyday laptop perfect for students and home users. Intel Core i3, slim profile, solid performance for browsing and documents.', price: 62000, originalPrice: 74000, brand: 'Lenovo', category: 'laptops', image: '/product-ideapad-slim3i.png', stockQuantity: 20, inStock: true, badge: 'Popular', isActive: true, isFeatured: false, rating: 4.3, numReviews: 112 },
  { name: 'HP EliteBook 840 G10', slug: 'hp-elitebook-840-g10', description: 'Enterprise laptop with Intel Core i7 13th Gen, MIL-SPEC durability, HP Wolf Security, and AI noise cancellation for professionals.', price: 148500, originalPrice: 172000, brand: 'HP', category: 'laptops', image: '/product-elitebook-840-g10.png', stockQuantity: 8, inStock: true, badge: 'Premium', isActive: true, isFeatured: true, rating: 4.8, numReviews: 67 },
  { name: 'MacBook Air M2 13"', slug: 'macbook-air-m2-13', description: 'Fanless M2 chip, all-day battery life, and studio-quality mics in a beautiful aluminium enclosure. The perfect everyday Mac.', price: 172000, originalPrice: 195000, brand: 'Apple', category: 'laptops', image: '/product-macbook-air-m2.png', stockQuantity: 9, inStock: true, badge: 'Featured', isActive: true, isFeatured: true, rating: 4.9, numReviews: 214 },

  // ══ PHONES (10) ═══════════════════════════════════════════════════════════════
  { name: 'iPhone 15 Pro', slug: 'iphone-15-pro', description: 'A17 Pro chip, titanium design, 48MP camera system.', price: 149850, originalPrice: 164850, brand: 'Apple', category: 'phones', image: '/product-iphone15.png', stockQuantity: 15, inStock: true, badge: 'New Arrival', isActive: true, isFeatured: true, rating: 4.9, numReviews: 256 },
  { name: 'Samsung Galaxy S24', slug: 'samsung-galaxy-s24', description: 'Galaxy AI, Snapdragon 8 Gen 3, 50MP camera.', price: 119850, originalPrice: 134850, brand: 'Samsung', category: 'phones', image: '/product-samsung-s24.png', stockQuantity: 12, inStock: true, badge: null, isActive: true, isFeatured: false, rating: 4.6, numReviews: 167 },
  { name: 'Samsung Galaxy A54', slug: 'samsung-galaxy-a54', description: '6.4" Super AMOLED display, 50MP camera, 5000mAh battery. Best mid-range Android phone in Kenya.', price: 52850, originalPrice: 59850, brand: 'Samsung', category: 'phones', image: '/product-samsung-a54.png', stockQuantity: 25, inStock: true, badge: 'Popular', isActive: true, isFeatured: false, rating: 4.5, numReviews: 211 },
  { name: 'Tecno Camon 20 Pro', slug: 'tecno-camon-20-pro', description: '64MP RGBW camera, 6.67" AMOLED display, 33W fast charging. Kenya\'s favourite mid-range smartphone.', price: 29850, originalPrice: 34850, brand: 'Tecno', category: 'phones', image: '/product-tecno-camon.png', stockQuantity: 30, inStock: true, badge: 'New Arrival', isActive: true, isFeatured: true, rating: 4.4, numReviews: 178 },
  { name: 'Infinix Note 30 Pro', slug: 'infinix-note-30-pro', description: '6.78" AMOLED 120Hz display, Helio G99, 68W fast charging, 5000mAh battery. Incredible value for money.', price: 24850, originalPrice: 27850, brand: 'Infinix', category: 'phones', image: '/product-infinix-note30.png', stockQuantity: 35, inStock: true, badge: 'Sale', isActive: true, isFeatured: false, rating: 4.3, numReviews: 134 },
  { name: 'Google Pixel 8', slug: 'google-pixel-8', description: 'Tensor G3 chip, 50MP camera with Magic Eraser, 7 years of Android updates guaranteed.', price: 89850, originalPrice: 104850, brand: 'Google', category: 'phones', image: '/product-pixel8.png', stockQuantity: 8, inStock: true, badge: null, isActive: true, isFeatured: false, rating: 4.6, numReviews: 95 },
  { name: 'Samsung Galaxy Z Flip 6', slug: 'samsung-galaxy-z-flip-6', description: 'Iconic flip design with Snapdragon 8 Gen 3, FlexCam hands-free shooting, Galaxy AI, and the smoothest hinge Samsung has ever built.', price: 138000, originalPrice: 158000, brand: 'Samsung', category: 'phones', image: '/product-galaxy-z-flip6.png', stockQuantity: 9, inStock: true, badge: 'Premium', isActive: true, isFeatured: true, rating: 4.7, numReviews: 72 },
  { name: 'Xiaomi 14T Pro', slug: 'xiaomi-14t-pro', description: 'Leica-tuned triple camera, Snapdragon 8 Gen 3, 144Hz AMOLED, and 90W HyperCharge fills the battery in under 30 minutes.', price: 88000, originalPrice: 102000, brand: 'Xiaomi', category: 'phones', image: '/product-xiaomi-14t-pro.png', stockQuantity: 14, inStock: true, badge: 'New Arrival', isActive: true, isFeatured: false, rating: 4.6, numReviews: 84 },
  { name: 'Tecno Spark 30 Pro', slug: 'tecno-spark-30-pro', description: '6.78" FHD+ display, 64MP AI triple camera, and 5000mAh battery with 18W charging. A reliable everyday smartphone at an accessible price.', price: 22500, originalPrice: 27000, brand: 'Tecno', category: 'phones', image: '/product-tecno-spark30.png', stockQuantity: 50, inStock: true, badge: null, isActive: true, isFeatured: false, rating: 4.1, numReviews: 203 },
  { name: 'Itel P55+', slug: 'itel-p55-plus', description: 'Entry-level smartphone with a massive 6000mAh battery and 6.6" HD+ display. Reliable daily driver for calls, messaging, and social media.', price: 14500, originalPrice: 17500, brand: 'Itel', category: 'phones', image: '/product-itel-p55.png', stockQuantity: 60, inStock: true, badge: null, isActive: true, isFeatured: false, rating: 3.9, numReviews: 312 },

  // ══ TABLETS (6) ═══════════════════════════════════════════════════════════════
  { name: 'iPad Pro 12.9"', slug: 'ipad-pro-12-9', description: 'M2 chip, Liquid Retina XDR, Apple Pencil support.', price: 164850, originalPrice: 179850, brand: 'Apple', category: 'tablets', image: '/product-ipad-pro.png', stockQuantity: 6, inStock: true, badge: null, isActive: true, isFeatured: false, rating: 4.9, numReviews: 145 },
  { name: 'Samsung Galaxy Tab S9', slug: 'samsung-galaxy-tab-s9', description: 'Snapdragon 8 Gen 2, 11" Dynamic AMOLED 2X, S Pen included, IP68 water resistant.', price: 89850, originalPrice: 104850, brand: 'Samsung', category: 'tablets', image: '/product-galaxy-tab-s9.png', stockQuantity: 9, inStock: true, badge: null, isActive: true, isFeatured: false, rating: 4.7, numReviews: 112 },
  { name: 'Lenovo Tab P12 Pro', slug: 'lenovo-tab-p12-pro', description: '12.6" AMOLED 2K display, Snapdragon 870, Dolby Atmos quad speakers for entertainment.', price: 74850, originalPrice: 84850, brand: 'Lenovo', category: 'tablets', image: '/product-lenovo-tab-p12.png', stockQuantity: 7, inStock: true, badge: null, isActive: true, isFeatured: false, rating: 4.5, numReviews: 67 },
  { name: 'Samsung Galaxy Tab S9 FE', slug: 'samsung-galaxy-tab-s9-fe', description: 'Fan Edition tablet with IP68, 10.9" LCD 90Hz display, and S Pen included. DeX mode turns it into a full desktop experience.', price: 58000, originalPrice: 68000, brand: 'Samsung', category: 'tablets', image: '/product-galaxy-tab-s9-fe.png', stockQuantity: 18, inStock: true, badge: 'Popular', isActive: true, isFeatured: true, rating: 4.6, numReviews: 167 },
  { name: 'Apple iPad 10th Gen', slug: 'apple-ipad-10th-gen', description: 'Redesigned with USB-C, 10.9" Liquid Retina display, and A14 Bionic. Great for creative work, education, and entertainment.', price: 72000, originalPrice: 84000, brand: 'Apple', category: 'tablets', image: '/product-ipad-10th.png', stockQuantity: 15, inStock: true, badge: null, isActive: true, isFeatured: false, rating: 4.7, numReviews: 298 },
  { name: 'Tecno MegaPad 10', slug: 'tecno-megapad-10', description: 'Affordable 10-inch Android tablet with FHD display and 6000mAh battery. Perfect for students, streaming, and light productivity.', price: 22000, originalPrice: 27000, brand: 'Tecno', category: 'tablets', image: '/product-tecno-megapad.png', stockQuantity: 30, inStock: true, badge: null, isActive: true, isFeatured: false, rating: 4.1, numReviews: 134 },

  // ══ AUDIO (6) ═════════════════════════════════════════════════════════════════
  { name: 'Sony WH-1000XM5', slug: 'sony-wh-1000xm5', description: 'Industry-leading noise canceling, 30-hour battery.', price: 52200, originalPrice: 59850, brand: 'Sony', category: 'audio', image: '/product-headphones.png', stockQuantity: 20, inStock: true, badge: 'Sale', isActive: true, isFeatured: false, rating: 4.7, numReviews: 89 },
  { name: 'JBL Charge 5', slug: 'jbl-charge-5', description: 'Portable Bluetooth speaker, 20 hours playtime, IP67 waterproof, built-in powerbank.', price: 14850, originalPrice: 17850, brand: 'JBL', category: 'audio', image: '/product-jbl-charge5.png', stockQuantity: 30, inStock: true, badge: 'Popular', isActive: true, isFeatured: false, rating: 4.6, numReviews: 342 },
  { name: 'Apple AirPods Pro 2', slug: 'apple-airpods-pro-2', description: 'Active noise cancellation, Adaptive Transparency, Personalized Spatial Audio, USB-C charging.', price: 34850, originalPrice: 39850, brand: 'Apple', category: 'audio', image: '/product-airpods-pro2.png', stockQuantity: 20, inStock: true, badge: 'New Arrival', isActive: true, isFeatured: true, rating: 4.8, numReviews: 445 },
  { name: 'Bose QuietComfort 45', slug: 'bose-qc45', description: 'World-class noise cancellation, 24-hour battery, lightweight comfortable design.', price: 44850, originalPrice: 52850, brand: 'Bose', category: 'audio', image: '/product-bose-qc45.png', stockQuantity: 12, inStock: true, badge: null, isActive: true, isFeatured: false, rating: 4.7, numReviews: 198 },
  { name: 'JBL Tune 770NC', slug: 'jbl-tune-770nc', description: 'Adaptive noise cancelling headphones with JBL Pure Bass Sound. 70-hour battery and fast charging — 10 minutes gives 3 hours playback.', price: 12500, originalPrice: 15500, brand: 'JBL', category: 'audio', image: '/product-jbl-tune770nc.png', stockQuantity: 30, inStock: true, badge: null, isActive: true, isFeatured: false, rating: 4.5, numReviews: 193 },
  { name: 'Samsung Galaxy Buds3 Pro', slug: 'samsung-galaxy-buds3-pro', description: 'Blade-inspired ANC earbuds with hi-fi 24-bit audio, 360 Audio, seamless Galaxy switching, and IPX7 waterproofing.', price: 22000, originalPrice: 27000, brand: 'Samsung', category: 'audio', image: '/product-galaxy-buds3-pro.png', stockQuantity: 25, inStock: true, badge: 'New Arrival', isActive: true, isFeatured: false, rating: 4.6, numReviews: 141 },

  // ══ GAMING (6) ════════════════════════════════════════════════════════════════
  { name: 'PlayStation 5', slug: 'playstation-5', description: 'Next-gen console with ultra-high speed SSD, 4K gaming, ray tracing, DualSense haptic feedback.', price: 74850, originalPrice: 84850, brand: 'Sony', category: 'gaming', image: '/product-ps5.png', stockQuantity: 4, inStock: true, badge: 'Featured', isActive: true, isFeatured: true, rating: 4.9, numReviews: 521 },
  { name: 'Xbox Series X', slug: 'xbox-series-x', description: '12 teraflops, 4K 120fps, 1TB SSD, Xbox Game Pass compatible. The most powerful Xbox ever.', price: 69850, originalPrice: 79850, brand: 'Microsoft', category: 'gaming', image: '/product-xbox-series-x.png', stockQuantity: 5, inStock: true, badge: null, isActive: true, isFeatured: false, rating: 4.8, numReviews: 389 },
  { name: 'Razer DeathAdder V3', slug: 'razer-deathadder-v3', description: '30K DPI optical sensor, 90-hour battery, ultra-lightweight 63g. The world\'s best-selling gaming mouse.', price: 9850, originalPrice: 11850, brand: 'Razer', category: 'gaming', image: '/product-razer-mouse.png', stockQuantity: 25, inStock: true, badge: 'Sale', isActive: true, isFeatured: false, rating: 4.7, numReviews: 267 },
  { name: 'Nintendo Switch OLED', slug: 'nintendo-switch-oled', description: 'Play at home or on the go. Vibrant 7-inch OLED screen, enhanced audio, and 64GB storage for extraordinary gaming anywhere.', price: 42000, originalPrice: 50000, brand: 'Nintendo', category: 'gaming', image: '/product-switch-oled.png', stockQuantity: 15, inStock: true, badge: null, isActive: true, isFeatured: false, rating: 4.7, numReviews: 445 },
  { name: 'Logitech G Pro X Superlight 2', slug: 'logitech-g-pro-x-superlight-2', description: 'Pro-level wireless gaming mouse at just 60g. HERO 2 sensor with 32K DPI, zero click latency, and 95-hour battery life for tournament play.', price: 14500, originalPrice: 18500, brand: 'Logitech', category: 'gaming', image: '/product-gpro-superlight2.png', stockQuantity: 28, inStock: true, badge: 'Pro Choice', isActive: true, isFeatured: false, rating: 4.8, numReviews: 267 },
  { name: 'HyperX Cloud Alpha Wireless', slug: 'hyperx-cloud-alpha-wireless', description: 'Industry-leading 300-hour battery gaming headset. Dual Chamber drivers deliver exceptional bass without distortion for PC and PlayStation.', price: 18500, originalPrice: 23000, brand: 'HyperX', category: 'gaming', image: '/product-hyperx-cloud-alpha.png', stockQuantity: 22, inStock: true, badge: null, isActive: true, isFeatured: false, rating: 4.6, numReviews: 189 },

  // ══ ACCESSORIES (5) ═══════════════════════════════════════════════════════════
  { name: 'Anker 65W GaN Charger', slug: 'anker-65w-gan-charger', description: 'Compact 3-port GaN charger (2 USB-C + 1 USB-A). Charge laptop, phone, and earbuds simultaneously.', price: 4850, originalPrice: 5850, brand: 'Anker', category: 'accessories', image: '/product-anker-charger.png', stockQuantity: 50, inStock: true, badge: 'Popular', isActive: true, isFeatured: false, rating: 4.7, numReviews: 678 },
  { name: 'Samsung 1TB Portable SSD T7', slug: 'samsung-t7-ssd', description: 'Pocket-sized 1TB SSD, USB 3.2, 1050MB/s transfer speeds, password protection built-in.', price: 12850, originalPrice: 14850, brand: 'Samsung', category: 'accessories', image: '/product-samsung-t7.png', stockQuantity: 28, inStock: true, badge: null, isActive: true, isFeatured: false, rating: 4.8, numReviews: 423 },
  { name: 'Logitech MX Master 3S', slug: 'logitech-mx-master-3s', description: '8K DPI sensor, MagSpeed scroll wheel, quiet clicks, works on glass. The ultimate productivity mouse.', price: 14850, originalPrice: 17850, brand: 'Logitech', category: 'accessories', image: '/product-mx-master3s.png', stockQuantity: 20, inStock: true, badge: 'Best Seller', isActive: true, isFeatured: true, rating: 4.9, numReviews: 891 },
  { name: 'Baseus 20000mAh Power Bank 65W', slug: 'baseus-20000mah-65w', description: 'High-capacity power bank that charges a laptop once and a phone 4× over. Dual USB-C with 65W combined output and LED power indicator.', price: 5500, originalPrice: 7200, brand: 'Baseus', category: 'accessories', image: '/product-baseus-powerbank.png', stockQuantity: 45, inStock: true, badge: null, isActive: true, isFeatured: false, rating: 4.6, numReviews: 287 },
  { name: 'Logitech K380 Multi-Device Keyboard', slug: 'logitech-k380', description: 'Slim wireless keyboard that pairs with up to 3 devices simultaneously. Round keys with quiet clicks, compact design for desk and travel.', price: 4200, originalPrice: 5500, brand: 'Logitech', category: 'accessories', image: '/product-logitech-k380.png', stockQuantity: 50, inStock: true, badge: null, isActive: true, isFeatured: false, rating: 4.5, numReviews: 423 },

  // ══ CAMERAS (4) ═══════════════════════════════════════════════════════════════
  { name: 'Canon EOS R50', slug: 'canon-eos-r50', description: '24.2MP mirrorless camera, 4K video, Dual Pixel autofocus. Perfect for content creators and vloggers.', price: 89850, originalPrice: 104850, brand: 'Canon', category: 'cameras', image: '/product-canon-r50.png', stockQuantity: 6, inStock: true, badge: 'New Arrival', isActive: true, isFeatured: true, rating: 4.6, numReviews: 87 },
  { name: 'GoPro Hero 12 Black', slug: 'gopro-hero12-black', description: '5.3K waterproof action camera, HyperSmooth 6.0 stabilization. Built for Kenyan adventures.', price: 52850, originalPrice: 59850, brand: 'GoPro', category: 'cameras', image: '/product-gopro-hero12.png', stockQuantity: 10, inStock: true, badge: 'Popular', isActive: true, isFeatured: false, rating: 4.7, numReviews: 312 },
  { name: 'Sony ZV-E10 II', slug: 'sony-zv-e10-ii', description: 'Perfect vlogging camera with APS-C sensor, real-time Eye AF, fully articulating touchscreen, and plug-in mic support for clean audio.', price: 62000, originalPrice: 74000, brand: 'Sony', category: 'cameras', image: '/product-sony-zv-e10-ii.png', stockQuantity: 12, inStock: true, badge: 'New Arrival', isActive: true, isFeatured: true, rating: 4.7, numReviews: 118 },
  { name: 'DJI Osmo Pocket 3', slug: 'dji-osmo-pocket-3', description: 'Pocket-sized cinema camera with a 1-inch CMOS sensor, 3-axis stabilisation, 4K 120fps, and a rotating OLED touchscreen — all in 179g.', price: 45000, originalPrice: 54000, brand: 'DJI', category: 'cameras', image: '/product-dji-osmo-pocket3.png', stockQuantity: 14, inStock: true, badge: 'Featured', isActive: true, isFeatured: false, rating: 4.8, numReviews: 87 },

  // ══ WEARABLES (4) ═════════════════════════════════════════════════════════════
  { name: 'Apple Watch Series 9', slug: 'apple-watch-series-9', description: 'Advanced health sensors, Double Tap gesture, Always-On Retina display, crash & fall detection.', price: 52850, originalPrice: 59850, brand: 'Apple', category: 'wearables', image: '/product-apple-watch-s9.png', stockQuantity: 14, inStock: true, badge: 'New Arrival', isActive: true, isFeatured: true, rating: 4.8, numReviews: 334 },
  { name: 'Samsung Galaxy Watch 6', slug: 'samsung-galaxy-watch-6', description: 'Advanced sleep coaching, body composition analysis, sapphire crystal glass, 40-hour battery.', price: 34850, originalPrice: 39850, brand: 'Samsung', category: 'wearables', image: '/product-galaxy-watch6.png', stockQuantity: 16, inStock: true, badge: null, isActive: true, isFeatured: false, rating: 4.6, numReviews: 189 },
  { name: 'Fitbit Charge 6', slug: 'fitbit-charge-6', description: 'Built-in GPS, heart rate monitoring, Google Maps & Wallet integration, 7-day battery life.', price: 17850, originalPrice: 21850, brand: 'Fitbit', category: 'wearables', image: '/product-fitbit-charge6.png', stockQuantity: 22, inStock: true, badge: 'Sale', isActive: true, isFeatured: false, rating: 4.4, numReviews: 156 },
  { name: 'Samsung Galaxy Watch 7', slug: 'samsung-galaxy-watch-7', description: '3nm chip, advanced BioActive Sensor, and Galaxy AI-powered sleep coaching. Brightest Galaxy Watch ever at 2000 nits peak brightness.', price: 38000, originalPrice: 46000, brand: 'Samsung', category: 'wearables', image: '/product-galaxy-watch7.png', stockQuantity: 20, inStock: true, badge: 'New Arrival', isActive: true, isFeatured: true, rating: 4.7, numReviews: 189 },

  // ══ COMPUTERS (10) ════════════════════════════════════════════════════════════
  { name: 'Apple Mac Mini M4', slug: 'apple-mac-mini-m4', description: 'The most powerful Mac mini ever in the smallest design. M4 chip with 10-core CPU, 10-core GPU, and Thunderbolt 4 ports for a clutter-free desk.', price: 82000, originalPrice: 96000, brand: 'Apple', category: 'computers', image: '/product-mac-mini-m4.png', stockQuantity: 9, inStock: true, badge: 'New Arrival', isActive: true, isFeatured: true, rating: 4.9, numReviews: 178 },
  { name: 'Lenovo ThinkCentre M70q Gen 4 Tiny', slug: 'lenovo-thinkcentre-m70q-gen4', description: 'Ultra-compact business desktop that fits behind your monitor. Intel Core i5 13th Gen vPro, whisper-quiet operation, enterprise-grade reliability.', price: 78500, originalPrice: 92000, brand: 'Lenovo', category: 'computers', image: '/product-thinkcentre-m70q.png', stockQuantity: 14, inStock: true, badge: 'Best Seller', isActive: true, isFeatured: true, rating: 4.6, numReviews: 87 },
  { name: 'HP EliteDesk 800 G9 Mini', slug: 'hp-elitedesk-800-g9-mini', description: 'Enterprise mini PC with HP Wolf Security and Intel 13th Gen vPro. Powerful enough for demanding business workloads in a palm-sized chassis.', price: 98000, originalPrice: 115000, brand: 'HP', category: 'computers', image: '/product-elitedesk-800-g9.png', stockQuantity: 10, inStock: true, badge: 'Premium', isActive: true, isFeatured: false, rating: 4.7, numReviews: 62 },
  { name: 'Dell OptiPlex 7010 Tower', slug: 'dell-optiplex-7010-tower', description: 'Workhorse tower desktop for offices and classrooms. Tool-less chassis, Intel Core i5 13th Gen, and enterprise reliability backed by Dell ProSupport.', price: 88000, originalPrice: 104000, brand: 'Dell', category: 'computers', image: '/product-optiplex-7010.png', stockQuantity: 12, inStock: true, badge: null, isActive: true, isFeatured: false, rating: 4.6, numReviews: 104 },
  { name: 'ASUS ProArt Station PD500TE', slug: 'asus-proart-station-pd500te', description: 'Creator workstation with Intel Core i9 and NVIDIA RTX 4060 for 3D rendering, video editing, and design. PCIe 5.0 storage and 240mm liquid cooling.', price: 198000, originalPrice: 232000, brand: 'ASUS', category: 'computers', image: '/product-proart-station-pd500te.png', stockQuantity: 5, inStock: true, badge: 'Pro Workstation', isActive: true, isFeatured: true, rating: 4.8, numReviews: 45 },
  { name: 'Lenovo IdeaCentre AIO 27', slug: 'lenovo-ideacentre-aio-27', description: 'All-in-one desktop with a 27" QHD touchscreen and Intel Core i5. Display, CPU, and speakers all in one slim aluminium stand — no cables to manage.', price: 112000, originalPrice: 132000, brand: 'Lenovo', category: 'computers', image: '/product-ideacentre-aio-27.png', stockQuantity: 8, inStock: true, badge: 'Popular', isActive: true, isFeatured: false, rating: 4.5, numReviews: 93 },
  { name: 'HP Pavilion Desktop TP01', slug: 'hp-pavilion-desktop-tp01', description: 'Slim tower desktop for everyday home computing. AMD Ryzen 5 with fast SSD ensures quick boot times and responsive multitasking for the whole family.', price: 68000, originalPrice: 80000, brand: 'HP', category: 'computers', image: '/product-pavilion-desktop-tp01.png', stockQuantity: 16, inStock: true, badge: null, isActive: true, isFeatured: false, rating: 4.4, numReviews: 128 },
  { name: 'Dell Inspiron 3030 Desktop', slug: 'dell-inspiron-3030-desktop', description: 'Affordable family desktop with Intel Core i3 14th Gen and fast SSD. Compact tower handles browsing, documents, video calls, and streaming with ease.', price: 52000, originalPrice: 62000, brand: 'Dell', category: 'computers', image: '/product-inspiron-3030-desktop.png', stockQuantity: 20, inStock: true, badge: 'Sale', isActive: true, isFeatured: false, rating: 4.2, numReviews: 156 },
  { name: 'MSI MAG Infinite S3 Gaming Desktop', slug: 'msi-mag-infinite-s3', description: 'High-performance gaming desktop with Intel Core i7 14th Gen and RTX 4070. Customisable RGB, tool-less chassis, and MSI Center software for easy control.', price: 178000, originalPrice: 210000, brand: 'MSI', category: 'computers', image: '/product-msi-infinite-s3.png', stockQuantity: 6, inStock: true, badge: 'Gaming', isActive: true, isFeatured: true, rating: 4.7, numReviews: 58 },
  { name: 'Intel NUC 14 Pro Mini PC', slug: 'intel-nuc-14-pro', description: 'Powerful mini PC with Intel Core Ultra 7 and Thunderbolt 4. Drive triple 4K displays and connect any peripherals — smaller than a paperback book.', price: 88500, originalPrice: 104000, brand: 'Intel', category: 'computers', image: '/product-nuc-14-pro.png', stockQuantity: 11, inStock: true, badge: 'Featured', isActive: true, isFeatured: false, rating: 4.6, numReviews: 71 },

  // ══ MONITORS (10) ═════════════════════════════════════════════════════════════
  { name: 'LG 27GP850-B 27" QHD Gaming Monitor', slug: 'lg-27gp850-b', description: '27-inch QHD Nano IPS with 180Hz and 1ms GtG. NVIDIA G-Sync Compatible and AMD FreeSync Premium for smooth, tear-free competitive gameplay.', price: 42000, originalPrice: 52000, brand: 'LG', category: 'monitors', image: '/product-lg-27gp850.png', stockQuantity: 18, inStock: true, badge: 'Best Seller', isActive: true, isFeatured: true, rating: 4.8, numReviews: 312 },
  { name: 'Samsung 24" FHD Business Monitor S36C', slug: 'samsung-24-s36c', description: 'Eye-care certified FHD monitor with flicker-free technology and Eye Saver blue light filter. Simple HDMI and VGA connectivity for any office or home setup.', price: 18500, originalPrice: 23000, brand: 'Samsung', category: 'monitors', image: '/product-samsung-s36c.png', stockQuantity: 35, inStock: true, badge: 'Popular', isActive: true, isFeatured: false, rating: 4.4, numReviews: 428 },
  { name: 'Dell UltraSharp 32" 4K USB-C Monitor U3223QE', slug: 'dell-u3223qe', description: 'Reference-quality 4K IPS Black panel with 2000:1 contrast and USB-C 90W power delivery. Built-in KVM switch and RJ-45 for a true single-cable desk.', price: 92000, originalPrice: 112000, brand: 'Dell', category: 'monitors', image: '/product-dell-u3223qe.png', stockQuantity: 7, inStock: true, badge: 'Premium', isActive: true, isFeatured: true, rating: 4.9, numReviews: 134 },
  { name: 'ASUS ProArt PA278CGV 27" QHD', slug: 'asus-proart-pa278cgv', description: 'Factory-calibrated creator display for designers and photographers. 165Hz, 100% sRGB, 95% DCI-P3, and hardware calibration support built in.', price: 58000, originalPrice: 70000, brand: 'ASUS', category: 'monitors', image: '/product-proart-pa278cgv.png', stockQuantity: 10, inStock: true, badge: 'Creator Pick', isActive: true, isFeatured: false, rating: 4.8, numReviews: 96 },
  { name: 'LG 34WP65C-B 34" UltraWide Curved', slug: 'lg-34wp65c-b', description: 'Immersive 34-inch 21:9 curved WQHD display with 160Hz and USB-C 65W. FreeSync Premium for both productivity and gaming in one stunning panel.', price: 68000, originalPrice: 82000, brand: 'LG', category: 'monitors', image: '/product-lg-34wp65c.png', stockQuantity: 9, inStock: true, badge: 'Featured', isActive: true, isFeatured: true, rating: 4.7, numReviews: 167 },
  { name: 'HP 24mh FHD Monitor', slug: 'hp-24mh-fhd', description: 'Budget-friendly IPS monitor with ultra-thin bezels and built-in 2W speakers. Height-adjustable stand with HDMI and DisplayPort inputs.', price: 16500, originalPrice: 20500, brand: 'HP', category: 'monitors', image: '/product-hp-24mh.png', stockQuantity: 40, inStock: true, badge: 'Sale', isActive: true, isFeatured: false, rating: 4.4, numReviews: 354 },
  { name: 'BenQ EW2880U 28" 4K USB-C', slug: 'benq-ew2880u', description: '4K HDRi entertainment monitor with B.I.+ ambient light sensing. USB-C power delivery and built-in 2.1 speakers for a clean minimal desk setup.', price: 48000, originalPrice: 58000, brand: 'BenQ', category: 'monitors', image: '/product-benq-ew2880u.png', stockQuantity: 13, inStock: true, badge: null, isActive: true, isFeatured: false, rating: 4.6, numReviews: 112 },
  { name: 'MSI MAG 274QRF-QD 27" QHD 165Hz', slug: 'msi-mag-274qrf-qd', description: 'Quantum Dot gaming monitor with vivid 97% DCI-P3 colors and 165Hz for buttery-smooth gameplay. G-Sync Compatible and FreeSync Premium.', price: 45000, originalPrice: 54000, brand: 'MSI', category: 'monitors', image: '/product-msi-mag-274qrf.png', stockQuantity: 14, inStock: true, badge: 'Gaming', isActive: true, isFeatured: false, rating: 4.7, numReviews: 145 },
  { name: 'Philips 271V8L 27" FHD IPS', slug: 'philips-271v8l', description: 'No-frills 27-inch FHD monitor with LowBlue Light certification and slim bezels. Excellent value as a secondary or first monitor for any home office.', price: 19500, originalPrice: 24500, brand: 'Philips', category: 'monitors', image: '/product-philips-271v8l.png', stockQuantity: 28, inStock: true, badge: null, isActive: true, isFeatured: false, rating: 4.3, numReviews: 267 },
  { name: 'Samsung 32" Curved VA Monitor S32C552', slug: 'samsung-32-s32c552', description: 'Immersive 1500R curved display for long work sessions. 165Hz and 1ms response with Eye Saver and Flicker-Free technology for all-day comfort.', price: 32000, originalPrice: 39000, brand: 'Samsung', category: 'monitors', image: '/product-samsung-s32c552.png', stockQuantity: 22, inStock: true, badge: 'New Arrival', isActive: true, isFeatured: false, rating: 4.5, numReviews: 198 },

];

// ─── Seed function ────────────────────────────────────────────────────────────
async function seed() {
  try {
    if (!MONGODB_URI) throw new Error('MONGODB_URI is not set in your .env file');

    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // ── Categories ───────────────────────────────────────────────────────────
    console.log('📁 Seeding categories...');
    let catsAdded = 0;
    for (const cat of categories) {
      const result = await Category.updateOne(
        { slug: cat.slug },
        { $setOnInsert: cat },
        { upsert: true }
      );
      if (result.upsertedCount > 0) {
        console.log(`   ✅ Added: ${cat.name}`);
        catsAdded++;
      } else {
        console.log(`   ⏭️  Skipping "${cat.name}" (already exists)`);
      }
    }

    // ── Products ─────────────────────────────────────────────────────────────
    console.log('\n📦 Seeding products...');
    let added = 0, skipped = 0;

    for (const p of products) {
      const result = await Product.updateOne(
        { slug: p.slug },
        { $setOnInsert: p },
        { upsert: true }
      );
      if (result.upsertedCount > 0) {
        console.log(`   ✅ ${p.name} — KES ${p.price.toLocaleString()}`);
        added++;
      } else {
        console.log(`   ⏭️  Skipping "${p.name}" (already exists)`);
        skipped++;
      }
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════════');
    console.log('🎉 Seed complete!');
    console.log(`   Categories added : ${catsAdded}`);
    console.log(`   Products added   : ${added}`);
    console.log(`   Products skipped : ${skipped}`);
    console.log(`   Total in DB      : ${added + skipped}`);
    console.log('══════════════════════════════════════════════');

    console.log('\n📊 Products per category (this file):');
    const breakdown = {};
    products.forEach(p => { breakdown[p.category] = (breakdown[p.category] || 0) + 1; });
    Object.entries(breakdown).forEach(([cat, count]) => {
      console.log(`   ${cat.padEnd(15)} → ${count} products`);
    });
    console.log('');

  } catch (err) {
    console.error('\n❌ Seed error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

seed();