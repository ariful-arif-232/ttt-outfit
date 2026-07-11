require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const helmet = require('helmet');

const connectDB = require('./config/db');
const { uploadBuffer, cloudinaryReady } = require('./config/cloudinary');
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');
const { requireLogin, requireAdmin } = require('./middleware/auth');
const { slugify, money, makeOrderNumber } = require('./utils/helpers');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let dbPromise;
app.use(async (req, res, next) => {
  try {
    dbPromise ||= connectDB();
    await dbPromise;
    next();
  } catch (error) {
    next(error);
  }
});

app.use(session({
  name: 'ttt.sid',
  secret: process.env.SESSION_SECRET || 'development-only-change-me',
  resave: false,
  saveUninitialized: false,
  store: process.env.MONGODB_URI ? MongoStore.create({ mongoUrl: process.env.MONGODB_URI, collectionName: 'sessions', ttl: 60 * 60 * 24 * 14 }) : undefined,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 24 * 14 }
}));

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.cart = req.session.cart || [];
  res.locals.cartCount = (req.session.cart || []).reduce((sum, item) => sum + item.quantity, 0);
  res.locals.flash = req.session.flash || null;
  res.locals.money = money;
  delete req.session.flash;
  next();
});

app.get('/', async (req, res, next) => {
  try {
    const featured = await Product.find({ active: true, featured: true }).sort({ createdAt: -1 }).limit(8).lean();
    const categories = await Product.distinct('category', { active: true });
    res.render('home', { title: 'TTT Outfit — Wear Your Identity', featured, categories });
  } catch (e) { next(e); }
});

app.get('/shop', async (req, res, next) => {
  try {
    const { q = '', category = '', sort = 'newest' } = req.query;
    const filter = { active: true };
    if (q) filter.$text = { $search: q };
    if (category) filter.category = category;
    const sorts = { newest: { createdAt: -1 }, price_low: { price: 1 }, price_high: { price: -1 }, popular: { soldCount: -1 } };
    const products = await Product.find(filter).sort(sorts[sort] || sorts.newest).lean();
    const categories = await Product.distinct('category', { active: true });
    res.render('shop', { title: 'Shop', products, categories, filters: { q, category, sort } });
  } catch (e) { next(e); }
});

app.get('/product/:slug', async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, active: true }).lean();
    if (!product) return res.status(404).render('message', { title: 'Not found', message: 'Product not found.' });
    const related = await Product.find({ _id: { $ne: product._id }, category: product.category, active: true }).limit(4).lean();
    res.render('product', { title: product.name, product, related });
  } catch (e) { next(e); }
});

app.get('/register', (req, res) => res.render('register', { title: 'Create account' }));
app.post('/register', async (req, res, next) => {
  try {
    const { name, email, phone, password, confirmPassword, address, city } = req.body;
    if (!name || !email || !phone || !password || password.length < 8) throw new Error('Complete all required fields. Password must be at least 8 characters.');
    if (password !== confirmPassword) throw new Error('Passwords do not match.');
    const exists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { phone }] });
    if (exists) throw new Error('An account with this email or phone already exists.');
    const user = await User.create({
      name, email: email.toLowerCase(), phone, passwordHash: await bcrypt.hash(password, 12),
      addresses: address && city ? [{ address, city, isDefault: true }] : []
    });
    req.session.user = { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
    req.session.flash = { type: 'success', message: 'Account created successfully.' };
    res.redirect('/account');
  } catch (e) {
    req.session.flash = { type: 'error', message: e.message };
    res.redirect('/register');
  }
});

app.get('/login', (req, res) => res.render('login', { title: 'Login' }));
app.post('/login', async (req, res, next) => {
  try {
    const identity = String(req.body.identity || '').trim();
    const user = await User.findOne({ $or: [{ email: identity.toLowerCase() }, { phone: identity }], isActive: true });
    if (!user || !(await bcrypt.compare(req.body.password || '', user.passwordHash))) throw new Error('Invalid email/phone or password.');
    user.lastLoginAt = new Date(); await user.save();
    req.session.user = { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
    const destination = req.session.returnTo || (user.role === 'admin' ? '/admin' : '/account');
    delete req.session.returnTo;
    res.redirect(destination);
  } catch (e) {
    req.session.flash = { type: 'error', message: e.message };
    res.redirect('/login');
  }
});

app.post('/logout', (req, res) => req.session.destroy(() => res.redirect('/')));

app.post('/cart/add', async (req, res, next) => {
  try {
    const product = await Product.findById(req.body.productId).lean();
    if (!product || !product.active || product.stock < 1) throw new Error('This product is unavailable.');
    const quantity = Math.max(1, Math.min(Number(req.body.quantity) || 1, product.stock));
    const size = req.body.size || product.sizes[0] || 'One Size';
    const color = req.body.color || product.colors[0] || 'Default';
    req.session.cart ||= [];
    const existing = req.session.cart.find(i => i.productId === product._id.toString() && i.size === size && i.color === color);
    if (existing) existing.quantity = Math.min(existing.quantity + quantity, product.stock);
    else req.session.cart.push({ productId: product._id.toString(), name: product.name, slug: product.slug, image: product.images[0]?.url || '', price: product.price, size, color, quantity });
    req.session.flash = { type: 'success', message: `${product.name} added to cart.` };
    res.redirect(req.get('referer') || '/cart');
  } catch (e) { req.session.flash = { type: 'error', message: e.message }; res.redirect('/shop'); }
});

app.get('/cart', (req, res) => {
  const subtotal = (req.session.cart || []).reduce((sum, i) => sum + i.price * i.quantity, 0);
  res.render('cart', { title: 'Your cart', subtotal });
});
app.post('/cart/update', (req, res) => {
  const index = Number(req.body.index); const qty = Number(req.body.quantity);
  if (req.session.cart?.[index]) qty <= 0 ? req.session.cart.splice(index, 1) : req.session.cart[index].quantity = Math.min(20, Math.max(1, qty));
  res.redirect('/cart');
});
app.post('/cart/remove', (req, res) => { req.session.cart?.splice(Number(req.body.index), 1); res.redirect('/cart'); });

app.get('/checkout', requireLogin, async (req, res, next) => {
  try {
    if (!(req.session.cart || []).length) return res.redirect('/cart');
    const user = await User.findById(req.session.user.id).lean();
    const subtotal = req.session.cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    res.render('checkout', { title: 'Checkout', user, subtotal, deliveryFee: subtotal >= 3000 ? 0 : 80 });
  } catch (e) { next(e); }
});

app.post('/checkout', requireLogin, async (req, res, next) => {
  try {
    const cart = req.session.cart || [];
    if (!cart.length) throw new Error('Your cart is empty.');
    const ids = cart.map(i => i.productId);
    const products = await Product.find({ _id: { $in: ids }, active: true });
    const map = new Map(products.map(p => [p._id.toString(), p]));
    const items = [];
    for (const cartItem of cart) {
      const product = map.get(cartItem.productId);
      if (!product || product.stock < cartItem.quantity) throw new Error(`${cartItem.name} does not have enough stock.`);
      items.push({ product: product._id, name: product.name, sku: product.sku, image: product.images[0]?.url || '', size: cartItem.size, color: cartItem.color, quantity: cartItem.quantity, unitPrice: product.price, lineTotal: product.price * cartItem.quantity });
    }
    const user = await User.findById(req.session.user.id);
    const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
    const deliveryFee = subtotal >= 3000 ? 0 : 80;
    const paymentMethod = ['COD', 'bKash', 'Nagad'].includes(req.body.paymentMethod) ? req.body.paymentMethod : 'COD';
    if (paymentMethod !== 'COD' && !String(req.body.transactionId || '').trim()) throw new Error('Transaction ID is required for bKash or Nagad.');
    const order = await Order.create({
      orderNumber: makeOrderNumber(), customer: user._id,
      customerSnapshot: { name: user.name, email: user.email, phone: req.body.phone || user.phone },
      items, shippingAddress: { address: req.body.address, city: req.body.city, postalCode: req.body.postalCode || '' },
      subtotal, deliveryFee, total: subtotal + deliveryFee, paymentMethod,
      transactionId: req.body.transactionId || '', paymentStatus: 'Pending', statusHistory: [{ status: 'Pending', note: 'Order placed by customer.' }], notes: req.body.notes || ''
    });
    await Promise.all(items.map(i => Product.updateOne({ _id: i.product, stock: { $gte: i.quantity } }, { $inc: { stock: -i.quantity, soldCount: i.quantity } })));
    req.session.cart = [];
    req.session.flash = { type: 'success', message: `Order ${order.orderNumber} placed successfully.` };
    res.redirect(`/orders/${order._id}`);
  } catch (e) {
    req.session.flash = { type: 'error', message: e.message };
    res.redirect('/checkout');
  }
});

app.get('/account', requireLogin, async (req, res, next) => {
  try {
    const [user, orders] = await Promise.all([User.findById(req.session.user.id).lean(), Order.find({ customer: req.session.user.id }).sort({ createdAt: -1 }).limit(5).lean()]);
    res.render('account', { title: 'My account', user, orders });
  } catch (e) { next(e); }
});
app.get('/orders', requireLogin, async (req, res, next) => { try { const orders = await Order.find({ customer: req.session.user.id }).sort({ createdAt: -1 }).lean(); res.render('orders', { title: 'My orders', orders }); } catch (e) { next(e); } });
app.get('/orders/:id', requireLogin, async (req, res, next) => {
  try {
    const filter = { _id: req.params.id };
    if (req.session.user.role !== 'admin') filter.customer = req.session.user.id;
    const order = await Order.findOne(filter).lean();
    if (!order) return res.status(404).render('message', { title: 'Order not found', message: 'This order does not exist or you cannot view it.' });
    res.render('order-detail', { title: order.orderNumber, order });
  } catch (e) { next(e); }
});

app.get('/admin', requireAdmin, async (req, res, next) => {
  try {
    const [productCount, customerCount, pendingCount, deliveredAgg, recentOrders, lowStock] = await Promise.all([
      Product.countDocuments(), User.countDocuments({ role: 'customer' }), Order.countDocuments({ status: 'Pending' }),
      Order.aggregate([{ $match: { status: 'Delivered' } }, { $group: { _id: null, sales: { $sum: '$total' }, count: { $sum: 1 } } }]),
      Order.find().sort({ createdAt: -1 }).limit(8).populate('customer', 'name email').lean(), Product.find({ stock: { $lte: 5 }, active: true }).sort({ stock: 1 }).limit(8).lean()
    ]);
    res.render('admin/dashboard', { title: 'Admin dashboard', stats: { productCount, customerCount, pendingCount, sales: deliveredAgg[0]?.sales || 0, deliveredCount: deliveredAgg[0]?.count || 0 }, recentOrders, lowStock });
  } catch (e) { next(e); }
});

app.get('/admin/products', requireAdmin, async (req, res, next) => { try { const products = await Product.find().sort({ createdAt: -1 }).lean(); res.render('admin/products', { title: 'Manage products', products }); } catch (e) { next(e); } });
app.get('/admin/products/new', requireAdmin, (req, res) => res.render('admin/product-form', { title: 'Add product', product: null, cloudinaryReady: cloudinaryReady() }));
app.get('/admin/products/:id/edit', requireAdmin, async (req, res, next) => { try { const product = await Product.findById(req.params.id).lean(); res.render('admin/product-form', { title: 'Edit product', product, cloudinaryReady: cloudinaryReady() }); } catch (e) { next(e); } });

async function productPayload(req, existing = null) {
  const images = existing?.images ? [...existing.images] : [];
  if (req.file) {
    const result = await uploadBuffer(req.file.buffer);
    images.unshift({ url: result.secure_url, publicId: result.public_id });
  } else if (req.body.imageUrl && (!existing || req.body.imageUrl !== existing.images?.[0]?.url)) {
    images.unshift({ url: req.body.imageUrl.trim(), publicId: '' });
  }
  return {
    name: req.body.name, slug: slugify(req.body.slug || req.body.name), sku: req.body.sku,
    description: req.body.description, category: req.body.category, gender: req.body.gender,
    material: req.body.material || '', price: Number(req.body.price), compareAtPrice: Number(req.body.compareAtPrice || 0),
    stock: Number(req.body.stock), sizes: String(req.body.sizes || '').split(',').map(s => s.trim()).filter(Boolean),
    colors: String(req.body.colors || '').split(',').map(s => s.trim()).filter(Boolean), images,
    featured: req.body.featured === 'on', active: req.body.active === 'on'
  };
}

app.post('/admin/products', requireAdmin, upload.single('image'), async (req, res) => {
  try { await Product.create(await productPayload(req)); req.session.flash = { type: 'success', message: 'Product added.' }; res.redirect('/admin/products'); }
  catch (e) { req.session.flash = { type: 'error', message: e.message }; res.redirect('/admin/products/new'); }
});
app.post('/admin/products/:id', requireAdmin, upload.single('image'), async (req, res) => {
  try { const existing = await Product.findById(req.params.id); Object.assign(existing, await productPayload(req, existing)); await existing.save(); req.session.flash = { type: 'success', message: 'Product updated.' }; res.redirect('/admin/products'); }
  catch (e) { req.session.flash = { type: 'error', message: e.message }; res.redirect(`/admin/products/${req.params.id}/edit`); }
});
app.post('/admin/products/:id/delete', requireAdmin, async (req, res, next) => { try { await Product.findByIdAndUpdate(req.params.id, { active: false }); res.redirect('/admin/products'); } catch (e) { next(e); } });

app.get('/admin/orders', requireAdmin, async (req, res, next) => { try { const filter = req.query.status ? { status: req.query.status } : {}; const orders = await Order.find(filter).sort({ createdAt: -1 }).populate('customer', 'name email phone').lean(); res.render('admin/orders', { title: 'Manage orders', orders, selectedStatus: req.query.status || '' }); } catch (e) { next(e); } });
app.post('/admin/orders/:id/update', requireAdmin, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id); if (!order) throw new Error('Order not found.');
    order.status = req.body.status; order.paymentStatus = req.body.paymentStatus;
    order.statusHistory.push({ status: req.body.status, note: req.body.note || `Updated by admin.` });
    await order.save(); req.session.flash = { type: 'success', message: 'Order updated.' }; res.redirect('/admin/orders');
  } catch (e) { next(e); }
});
app.get('/admin/customers', requireAdmin, async (req, res, next) => { try { const customers = await User.find({ role: 'customer' }).sort({ createdAt: -1 }).lean(); res.render('admin/customers', { title: 'Customers', customers }); } catch (e) { next(e); } });

app.use((req, res) => res.status(404).render('message', { title: 'Page not found', message: 'The page you requested does not exist.' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('message', { title: 'Something went wrong', message: process.env.NODE_ENV === 'production' ? 'A server error occurred. Please try again.' : err.message });
});

const port = process.env.PORT || 3000;
if (require.main === module) app.listen(port, () => console.log(`TTT Outfit running at http://localhost:${port}`));
module.exports = app;
