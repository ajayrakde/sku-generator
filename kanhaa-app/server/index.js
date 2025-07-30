const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const User = require('./models/user');
const Product = require('./models/product');
const Sku = require('./models/sku');
const DiscountCode = require('./models/discountCode');
const Order = require('./models/order');

// In‑memory storage for OTP codes keyed by phone number.  In production,
// these codes should be stored in Redis or a persistent cache with expiry.
const otpStore = new Map();

// Load environment variables from .env if present
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

// Immediately invoked async function to start the application once the
// in‑memory MongoDB server is ready.
(async () => {
  // Spin up an in‑memory MongoDB instance.  In production, connect to a
  // persistent MongoDB service instead.
  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to in‑memory MongoDB');

  // Seed database with a few sample products and SKUs if none exist
  const existing = await Product.countDocuments();
  if (existing === 0) {
    // Create products
    const chocolate = await Product.create({ name: 'Chocolate Cake', description: 'Delicious chocolate cake' });
    const vanilla = await Product.create({ name: 'Vanilla Ice Cream', description: 'Creamy vanilla ice cream' });
    // Create SKUs
    const chocolateSkus = await Sku.create([
      { product: chocolate._id, variant: '250g', price: 500, inventory: 100 },
      { product: chocolate._id, variant: '500g', price: 900, inventory: 50 },
    ]);
    const vanillaSkus = await Sku.create([
      { product: vanilla._id, variant: '100ml', price: 250, inventory: 100 },
      { product: vanilla._id, variant: '250ml', price: 450, inventory: 50 },
    ]);
    // Attach SKUs to products
    chocolate.skus = chocolateSkus.map((s) => s._id);
    vanilla.skus = vanillaSkus.map((s) => s._id);
    await chocolate.save();
    await vanilla.save();
    console.log('Seeded sample products and SKUs');
    // Seed a sample discount code
    const codeExists = await DiscountCode.countDocuments();
    if (codeExists === 0) {
      await DiscountCode.create({ code: 'WELCOME10', type: 'percent', amount: 10, minimumSpend: 300 });
      console.log('Seeded sample discount code WELCOME10');
    }
  }

  const app = express();
  app.use(cors());
  app.use(bodyParser.json());

  /**
   * Middleware to authenticate requests using JWT tokens.  If the token is
   * missing or invalid, `req.user` will be undefined.
   */
  function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return next();
    const token = authHeader.split(' ')[1];
    if (!token) return next();
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // token invalid
    }
    return next();
  }
  app.use(authMiddleware);

  /**
   * Middleware to restrict routes to admin users.  Responds with 403 if the
   * authenticated user is not an admin.
   */
  function adminMiddleware(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: admin access required' });
    }
    return next();
  }

  /**
   * Route: POST /api/auth/send-otp
   *
   * Generate a 6‑digit OTP for the given phone number, store it in memory and
   * send it via SMS (here we simply log it to the console).  Create a user
   * record if it doesn't exist.
   */
  app.post('/api/auth/send-otp', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone number is required' });
    // Generate 6‑digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // Store OTP with expiry of 5 minutes (store time now + 5min)
    otpStore.set(phone, { code, expires: Date.now() + 5 * 60 * 1000 });
    console.log(`OTP for ${phone}: ${code}`);
    // Create user if not exists
    let user = await User.findOne({ phone });
    if (!user) {
      user = await User.create({ phone, phoneVerified: false });
    }
    return res.json({ message: 'OTP sent' });
  });

  /**
   * Route: POST /api/auth/verify-otp
   *
   * Verify the code sent to the user's phone.  If valid and not expired,
   * mark the user's phone as verified and issue a JWT.
   */
  app.post('/api/auth/verify-otp', async (req, res) => {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ message: 'Phone and OTP are required' });
    const record = otpStore.get(phone);
    if (!record || record.expires < Date.now()) {
      return res.status(400).json({ message: 'OTP expired' });
    }
    if (record.code !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    // Mark phone as verified
    let user = await User.findOne({ phone });
    // If user exists, update phoneVerified
    if (user) {
      user.phoneVerified = true;
      // If a special phone number is used for admin login, assign admin role.
      // In a real application you would manage roles via a user management interface.
      const adminPhone = process.env.ADMIN_PHONE || '9999999999';
      if (phone === adminPhone) {
        user.role = 'admin';
      }
      await user.save();
    }
    // Issue JWT
    const token = jwt.sign({ id: user._id, phone: user.phone, role: user.role || 'customer' }, JWT_SECRET, { expiresIn: '7d' });
    // Remove OTP from store
    otpStore.delete(phone);
    return res.json({ token });
  });

  /**
   * Route: GET /api/products
   *
   * Return all products in the database.  For simplicity, SKUs are not
   * implemented yet; each product has a single price field.
   */
  app.get('/api/products', async (req, res) => {
    const search = req.query.search;
    // Populate SKUs to compute base price
    let query = Product.find({});
    if (search) {
      const regex = new RegExp(search, 'i');
      query = Product.find({ name: regex });
    }
    const products = await query.populate('skus');
    const formatted = products.map((prod) => {
      const basePrice = prod.skus && prod.skus.length > 0 ? Math.min(...prod.skus.map((s) => s.price)) : 0;
      return {
        _id: prod._id,
        name: prod.name,
        description: prod.description,
        basePrice,
      };
    });
    res.json(formatted);
  });

  /**
   * Route: GET /api/products/:id
   *
   * Return a single product by ID.
   */
  app.get('/api/products/:id', async (req, res) => {
    try {
      const product = await Product.findById(req.params.id).populate('skus');
      if (!product) return res.status(404).json({ message: 'Product not found' });
      res.json(product);
    } catch (err) {
      res.status(400).json({ message: 'Invalid product ID' });
    }
  });

  /**
   * Route: POST /api/products
   *
   * Create a new product.  This endpoint should be protected and only
   * accessible by admin users, but for demonstration it is open.  The
   * request body should contain `name`, `description` and `price`.
   */
  app.post('/api/products', async (req, res) => {
    const { name, description, skus } = req.body;
    if (!name || !Array.isArray(skus) || skus.length === 0) {
      return res.status(400).json({ message: 'Name and at least one SKU are required' });
    }
    const product = await Product.create({ name, description });
    const createdSkus = [];
    for (const skuData of skus) {
      const { variant, price, inventory } = skuData;
      const sku = await Sku.create({ product: product._id, variant, price, inventory });
      createdSkus.push(sku._id);
    }
    product.skus = createdSkus;
    await product.save();
    res.status(201).json(await product.populate('skus'));
  });

  /**
   * Route: GET /api/users/me
   *
   * Return the authenticated user's profile.  The `authMiddleware` sets
   * `req.user` if a valid JWT is provided.  If no user is authenticated,
   * respond with 401.
   */
  app.get('/api/users/me', async (req, res) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const user = await User.findById(req.user.id);
    res.json(user);
  });

  /**
   * Route: POST /api/discounts
   *
   * Create a new discount code.  Only admins should be allowed to call
   * this endpoint (not enforced in this demo).  The request body should
   * include `code`, `type` ("percent" or "fixed"), `amount` and optional
   * `minimumSpend`, `expiryDate` and `usageLimit`.
   */
  app.post('/api/discounts', async (req, res) => {
    const { code, type, amount, minimumSpend, expiryDate, usageLimit } = req.body;
    if (!code || !type || !amount) return res.status(400).json({ message: 'code, type and amount are required' });
    try {
      const discount = await DiscountCode.create({ code, type, amount, minimumSpend, expiryDate, usageLimit });
      res.status(201).json(discount);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  });

  /**
   * Route: POST /api/orders
   *
   * Create a new order for the authenticated user.  Request body should
   * include an array of items with `productId` and `quantity`, an optional
   * `discountCode`, and a `shippingAddress` object.  The endpoint calculates
   * the subtotal, applies any valid discount code and returns the saved
   * order.  Shipping integration is stubbed with a fake AWB.
   */
  app.post('/api/orders', async (req, res) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    // Ensure the authenticated user's phone number is verified before placing an order
    const currentUser = await User.findById(req.user.id);
    if (!currentUser || !currentUser.phoneVerified) {
      return res.status(400).json({ message: 'You must verify your phone number before placing an order' });
    }
    const { items, discountCode, shippingAddress } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order items are required' });
    }
    // Fetch SKUs to compute subtotal and update inventory
    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      const { skuId, productId, quantity } = item;
      let sku;
      if (skuId) {
        sku = await Sku.findById(skuId);
      } else if (productId) {
        // If only productId provided, choose first SKU for the product
        const product = await Product.findById(productId).populate('skus');
        if (!product || !product.skus || product.skus.length === 0) {
          return res.status(400).json({ message: `Invalid product: ${productId}` });
        }
        sku = await Sku.findById(product.skus[0]._id);
      }
      if (!sku) return res.status(400).json({ message: 'Invalid SKU' });
      if (sku.inventory < quantity) {
        return res.status(400).json({ message: `Insufficient stock for SKU ${sku._id}` });
      }
      subtotal += sku.price * quantity;
      // Reduce inventory
      sku.inventory -= quantity;
      await sku.save();
      orderItems.push({ sku: sku._id, quantity });
    }
    // Apply discount code if provided
    let discountAmount = 0;
    if (discountCode) {
      const code = await DiscountCode.findOne({ code: discountCode, active: true });
      if (!code) {
        return res.status(400).json({ message: 'Invalid or inactive discount code' });
      }
      // Check expiry
      if (code.expiryDate && code.expiryDate < new Date()) {
        return res.status(400).json({ message: 'Discount code expired' });
      }
      // Check minimum spend
      if (code.minimumSpend && subtotal < code.minimumSpend) {
        return res.status(400).json({ message: `Minimum spend for this code is ₹${code.minimumSpend}` });
      }
      // Check usage limit
      if (code.usageLimit && code.usageCount >= code.usageLimit) {
        return res.status(400).json({ message: 'Discount code usage limit reached' });
      }
      // Calculate discount
      if (code.type === 'percent') {
        discountAmount = (code.amount / 100) * subtotal;
      } else if (code.type === 'fixed') {
        discountAmount = code.amount;
      }
      // Ensure discount does not exceed subtotal
      if (discountAmount > subtotal) discountAmount = subtotal;
      // Increment usage count
      code.usageCount = code.usageCount + 1;
      await code.save();
    }
    const total = subtotal - discountAmount;
    // Stub shipping integration: generate fake AWB
    const shippingInfo = {
      awb: `SR${Math.floor(100000 + Math.random() * 900000)}`,
      carrier: 'Shiprocket (stub)',
      trackingUrl: null,
    };
    // Save order
    const order = await Order.create({
      user: req.user.id,
      items: orderItems,
      subtotal,
      discount: discountAmount,
      total,
      paymentStatus: 'paid', // assume payment success
      shippingStatus: 'pending',
      shippingInfo,
    });
    // Optionally, save shipping address to user
    if (shippingAddress) {
      const user = await User.findById(req.user.id);
      user.addresses.push(shippingAddress);
      await user.save();
    }
    res.status(201).json(order);
  });

  // Fallback route for health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  /**
   * Route: GET /api/orders
   *
   * Return all orders for the authenticated user.  If the user is an admin,
   * return all orders; otherwise return only the user's orders.
   */
  app.get('/api/orders', async (req, res) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    let query = {};
    if (req.user.role !== 'admin') {
      query.user = req.user.id;
    }
    const orders = await Order.find(query).populate({ path: 'items.sku', populate: { path: 'product' } });
    res.json(orders);
  });

  /**
   * Route: GET /api/orders/:id
   *
   * Return the details of a single order.  Admins can access any order;
   * customers can only access their own orders.
   */
  app.get('/api/orders/:id', async (req, res) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    try {
      const order = await Order.findById(req.params.id).populate({ path: 'items.sku', populate: { path: 'product' } });
      if (!order) return res.status(404).json({ message: 'Order not found' });
      if (req.user.role !== 'admin' && order.user.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      res.json(order);
    } catch (err) {
      res.status(400).json({ message: 'Invalid order ID' });
    }
  });

  /**
   * Admin Route: GET /api/admin/orders
   *
   * Return all orders across the system.  Requires admin.
   */
  app.get('/api/admin/orders', adminMiddleware, async (req, res) => {
    const orders = await Order.find({}).populate({ path: 'items.sku', populate: { path: 'product' } });
    res.json(orders);
  });

  /**
   * Admin Route: GET /api/admin/analytics
   *
   * Return aggregated sales metrics: total revenue, order count and average order
   * value.  Requires admin.
   */
  app.get('/api/admin/analytics', adminMiddleware, async (req, res) => {
    const orders = await Order.find({ paymentStatus: 'paid' });
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const orderCount = orders.length;
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
    res.json({ totalRevenue, orderCount, avgOrderValue });
  });

  /**
   * Admin Route: POST /api/admin/discounts
   *
   * Create a discount code (same as /api/discounts but restricted).  Requires admin.
   */
  app.post('/api/admin/discounts', adminMiddleware, async (req, res) => {
    const { code, type, amount, minimumSpend, expiryDate, usageLimit } = req.body;
    if (!code || !type || !amount) return res.status(400).json({ message: 'code, type and amount are required' });
    try {
      const discount = await DiscountCode.create({ code, type, amount, minimumSpend, expiryDate, usageLimit });
      res.status(201).json(discount);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  });

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
})();