/**
 * ElectroStore Backend Server
 * Main entry point for the Electronics E-commerce API
 */

require('./config/dns');
require('dotenv').config();

const express = require('express');
const http    = require('http');
const path    = require('path');
const { Server } = require('socket.io');
const cors    = require('cors');
const helmet  = require('helmet');
const rateLimit  = require('express-rate-limit');
const swaggerUi  = require('swagger-ui-express');

const authRoutes       = require('./routes/auth');
const productRoutes    = require('./routes/products');
const categoryRoutes   = require('./routes/categories');
const cartRoutes       = require('./routes/cart');
const wishlistRoutes   = require('./routes/wishlist');
const orderRoutes      = require('./routes/orders');
const paymentRoutes    = require('./routes/payment');
const adminRoutes      = require('./routes/admin');
const adminAuthRoutes  = require('./routes/adminAuth');
const vendorRoutes     = require('./routes/vendor');
const newsletterRoutes = require('./routes/Newsletter');
const driverRoutes     = require('./routes/Driverroutes');
const deliveryRoutes   = require('./routes/Deliveryroutes');
const rewardsRoutes    = require('./routes/RewardsRoute');
const contactRoutes    = require('./routes/Contact'); // ✅ ADDED

const connectDB    = require('./config/db');
const swaggerSpecs = require('./config/swagger');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { sendTestEmail } = require('./services/emailService');

const app  = express();
const PORT = process.env.PORT || 8080;

const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'https://mzuritech.netlify.app',
  'https://69c10cd5dbbf3e0824de7f42--mzuritech.netlify.app',
  'https://69c113c60e84741f2529f706--mzuritech.netlify.app',
  'https://69c120fb3c410539feb8f9f5--mzuritech.netlify.app',
  'https://69c12aea74f04800081c6ad2--mzuritech.netlify.app',
];
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.set('io', io);
connectDB();

// ==================== SOCKET.IO ====================

io.on('connection', (socket) => {
  console.log(`⚡ Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// ==================== SECURITY ====================

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// ==================== CORS ====================

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// ==================== BODY PARSING ====================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== STATIC FILES ====================

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==================== SWAGGER ====================

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// ==================== ROUTES ====================

app.use('/api/auth',       authRoutes);
app.use('/api/products',   productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart',       cartRoutes);
app.use('/api/wishlist',   wishlistRoutes);
app.use('/api/orders',     orderRoutes);
app.use('/api/payment',    paymentRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/admin',      adminAuthRoutes);
app.use('/api/vendor',     vendorRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/drivers',    driverRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/rewards',    rewardsRoutes);
app.use('/api/contact',    contactRoutes); // ✅ ADDED

// ==================== DEBUG ====================

app.post('/api/debug/email', async (req, res) => {
  try {
    const to = req.body?.to || process.env.ADMIN_EMAIL || process.env.FROM_EMAIL;
    if (!to) {
      return res.status(400).json({ success: false, message: 'No recipient email provided' });
    }
    await sendTestEmail({ to });
    return res.json({ success: true, message: `Test email sent to ${to}` });
  } catch (error) {
    console.error('❌ Debug email failed:', error?.message || error);
    return res.status(500).json({ success: false, message: 'Debug email failed', error: error?.message || 'unknown' });
  }
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ==================== ERROR HANDLERS ====================

app.use(notFound);
app.use(errorHandler);

// ==================== START ====================

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 Phone access:    http://192.168.1.5:${PORT}`);
  console.log(`📚 API Docs:        http://localhost:${PORT}/api-docs`);
  console.log(`⚡ Socket.io enabled for real-time updates`);
  console.log(`\n✅ Server ready!\n`);
});

module.exports = app;