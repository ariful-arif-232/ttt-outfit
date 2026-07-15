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
const Review = require('./models/Review');
const Coupon = require('./models/Coupon');
const Wishlist = require('./models/Wishlist');
const ProductView =
  require('./models/ProductView');
const {
    sendAdminOrderEmail,
    sendCustomerOrderEmail
} = require('./utils/mailer');

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
  res.locals.currentPath = req.path;
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
    const product = await Product.findOne({
      slug: req.params.slug,
      active: true
    }).lean();

    if (!product) {
      return res.status(404).render('message', {
        title: 'Not found',
        message: 'Product not found.'
      });
    }
const viewWindowStart =
  new Date(
    Date.now() -
    15 * 60 * 1000
  );

await ProductView.findOneAndUpdate(
  {
    product:
      product._id,

    sessionId:
      req.sessionID,

    viewedAt: {
      $gte:
        viewWindowStart
    }
  },
  {
    $set: {
      viewedAt:
        new Date()
    }
  },
  {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true
  }
);
    const [reviews, relatedProducts] = await Promise.all([
      Review.find({
        product: product._id,
        approved: true
      })
        .sort({ createdAt: -1 })
        .lean(),

      Product.find({
        _id: { $ne: product._id },
        category: product.category,
        active: true
      })
        .sort({
          featured: -1,
          soldCount: -1,
          createdAt: -1
        })
        .limit(4)
        .lean()
    ]);
const recentViewerSessions =
  await ProductView.distinct(
    'sessionId',
    {
      product:
        product._id,

      viewedAt: {
        $gte:
          viewWindowStart
      }
    }
  );

const viewerCount =
  recentViewerSessions.length;
    res.render('product', {
  title: product.name,
  product,
  reviews,
  relatedProducts,
  viewerCount
});
  } catch (error) {
    next(error);
  }
});


app.post(
  '/product/:id/reviews',
  requireLogin,
  async (req, res) => {
    try {
      const product =
        await Product.findById(req.params.id);

      if (!product) {
        throw new Error('Product not found.');
      }

      const rating =
        Number(req.body.rating);

      const comment =
        String(req.body.comment || '').trim();

      if (
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5
      ) {
        throw new Error(
          'Rating must be between 1 and 5.'
        );
      }

      if (!comment) {
        throw new Error(
          'Please write a review.'
        );
      }

      await Review.findOneAndUpdate(
        {
          product: product._id,
          user: req.session.user.id
        },
        {
          name: req.session.user.name,
          rating,
          comment,
          approved: true
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true
        }
      );

      const reviewStats =
        await Review.aggregate([
          {
            $match: {
              product: product._id,
              approved: true
            }
          },
          {
            $group: {
              _id: '$product',
              average: {
                $avg: '$rating'
              }
            }
          }
        ]);

      product.ratingAverage =
        reviewStats[0]?.average || 0;

      await product.save();

      req.session.flash = {
        type: 'success',
        message:
          'Review submitted successfully.'
      };

      res.redirect(
        `/product/${product.slug}`
      );
    } catch (error) {
      req.session.flash = {
        type: 'error',
        message: error.message
      };

      res.redirect(
        req.get('referer') || '/shop'
      );
    }
  }
);
/* =========================================
   WISHLIST PAGE
========================================= */

app.get('/wishlist', async (req, res, next) => {
  try {
    let products = [];

    if (req.session.user?.id) {
      const wishlist = await Wishlist.findOne({
        user: req.session.user.id
      })
        .populate({
          path: 'products',
          match: { active: true }
        })
        .lean();

      products =
        wishlist?.products?.filter(Boolean) || [];
    }

    res.render('wishlist', {
      title: 'My Wishlist',
      products
    });
  } catch (error) {
    next(error);
  }
});


/* =========================================
   GET LOGGED-IN WISHLIST IDS
========================================= */

app.get('/api/wishlist', async (req, res) => {
  try {
    if (!req.session.user?.id) {
      return res.json({
        loggedIn: false,
        productIds: []
      });
    }

    const wishlist = await Wishlist.findOne({
      user: req.session.user.id
    }).lean();

    res.json({
      loggedIn: true,

      productIds:
        wishlist?.products?.map(
          productId => productId.toString()
        ) || []
    });
  } catch (error) {
    console.error('Wishlist read error:', error);

    res.status(500).json({
      loggedIn: Boolean(req.session.user?.id),
      productIds: [],
      message: 'Could not load wishlist.'
    });
  }
});


/* =========================================
   ADD PRODUCT TO LOGGED-IN WISHLIST
========================================= */

app.post('/api/wishlist/add', async (req, res) => {
  try {
    if (!req.session.user?.id) {
      return res.status(401).json({
        loggedIn: false,
        message: 'Login is required.'
      });
    }

    const productId =
      String(req.body.productId || '').trim();

    const product = await Product.findOne({
      _id: productId,
      active: true
    }).lean();

    if (!product) {
      return res.status(404).json({
        message: 'Product not found.'
      });
    }

    const wishlist =
      await Wishlist.findOneAndUpdate(
        {
          user: req.session.user.id
        },
        {
          $addToSet: {
            products: product._id
          }
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true
        }
      );

    res.json({
      success: true,
      added: true,
      count: wishlist.products.length
    });
  } catch (error) {
    console.error('Wishlist add error:', error);

    res.status(500).json({
      message: 'Could not add product to wishlist.'
    });
  }
});


/* =========================================
   REMOVE PRODUCT FROM LOGGED-IN WISHLIST
========================================= */

app.post('/api/wishlist/remove', async (req, res) => {
  try {
    if (!req.session.user?.id) {
      return res.status(401).json({
        loggedIn: false,
        message: 'Login is required.'
      });
    }

    const productId =
      String(req.body.productId || '').trim();

    const wishlist =
      await Wishlist.findOneAndUpdate(
        {
          user: req.session.user.id
        },
        {
          $pull: {
            products: productId
          }
        },
        {
          new: true
        }
      );

    res.json({
      success: true,
      added: false,
      count: wishlist?.products?.length || 0
    });
  } catch (error) {
    console.error('Wishlist remove error:', error);

    res.status(500).json({
      message: 'Could not remove product from wishlist.'
    });
  }
});


/* =========================================
   SYNC GUEST WISHLIST AFTER LOGIN
========================================= */

app.post('/api/wishlist/sync', async (req, res) => {
  try {
    if (!req.session.user?.id) {
      return res.status(401).json({
        loggedIn: false,
        message: 'Login is required.'
      });
    }

    const rawProductIds =
      Array.isArray(req.body.productIds)
        ? req.body.productIds
        : [];

    const productIds = [
      ...new Set(
        rawProductIds
          .map(id => String(id || '').trim())
          .filter(Boolean)
      )
    ].slice(0, 100);

    if (!productIds.length) {
      const existing = await Wishlist.findOne({
        user: req.session.user.id
      }).lean();

      return res.json({
        success: true,

        productIds:
          existing?.products?.map(
            id => id.toString()
          ) || []
      });
    }

    const validProducts = await Product.find({
      _id: { $in: productIds },
      active: true
    })
      .select('_id')
      .lean();

    const validIds =
      validProducts.map(product => product._id);

    const wishlist =
      await Wishlist.findOneAndUpdate(
        {
          user: req.session.user.id
        },
        {
          $addToSet: {
            products: {
              $each: validIds
            }
          }
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true
        }
      );

    res.json({
      success: true,

      productIds:
        wishlist.products.map(
          id => id.toString()
        )
    });
  } catch (error) {
    console.error('Wishlist sync error:', error);

    res.status(500).json({
      message: 'Could not sync wishlist.'
    });
  }
});
app.post('/api/wishlist/cards', async (req, res) => {
  try {
    const productIds =
      Array.isArray(req.body.productIds)
        ? req.body.productIds
        : [];

    if (!productIds.length) {
      return res.json({
        cards: []
      });
    }

    const products = await Product.find({
      _id: { $in: productIds },
      active: true
    }).lean();

    const orderedProducts =
      productIds
        .map(id =>
          products.find(
            product =>
              product._id.toString() === id
          )
        )
        .filter(Boolean);

    const cards = await Promise.all(
      orderedProducts.map(
        product =>
          new Promise((resolve, reject) => {
            res.app.render(
              'partials/product-card',
              {
                p: product,
                money
              },
              (error, html) => {
                if (error) {
                  reject(error);
                  return;
                }

                resolve({
                  productId:
                    product._id.toString(),

                  html
                });
              }
            );
          })
      )
    );

    res.json({ cards });
  } catch (error) {
    console.error(
      'Guest wishlist cards error:',
      error
    );

    res.status(500).json({
      cards: [],
      message:
        'Could not load wishlist products.'
    });
  }
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

app.post('/cart/add', async (req, res) => {
  try {
    const product =
      await Product.findById(req.body.productId)
        .lean();

    if (!product || !product.active) {
      throw new Error(
        'This product is unavailable.'
      );
    }

    const requestedColor =
      String(req.body.color || '').trim();

    const variant =
      product.variants?.find(
        item => item.color === requestedColor
      ) ||
      product.variants?.[0] ||
      null;

    const availableStock =
      variant
        ? Number(variant.stock || 0)
        : Number(product.stock || 0);

    if (availableStock < 1) {
      throw new Error(
        'This color is currently out of stock.'
      );
    }

    const availableSizes =
      variant?.sizes?.length
        ? variant.sizes
        : product.sizes || [];

    const requestedSize =
      String(req.body.size || '').trim();

    const size =
      availableSizes.includes(requestedSize)
        ? requestedSize
        : availableSizes[0] || 'One Size';

    const color =
      variant?.color ||
      requestedColor ||
      product.colors?.[0] ||
      'Default';

    const quantity = Math.max(
      1,
      Math.min(
        Number(req.body.quantity) || 1,
        availableStock
      )
    );

    const selectedImage =
      variant?.images?.[0]?.url ||
      product.images?.[0]?.url ||
      '';

    req.session.cart ||= [];

    const existing =
      req.session.cart.find(item =>
        item.productId === product._id.toString() &&
        item.size === size &&
        item.color === color
      );

    if (existing) {
      existing.quantity = Math.min(
        existing.quantity + quantity,
        availableStock
      );

      existing.image = selectedImage;
    } else {
      req.session.cart.push({
        productId: product._id.toString(),
        name: product.name,
        slug: product.slug,
        image: selectedImage,
        price: product.price,
        size,
        color,
        quantity
      });
    }

    req.session.flash = {
      type: 'success',
      message:
        `${product.name} (${color}, ${size}) added to cart.`
    };

const requestedRedirect =
  String(req.body.redirectTo || '').trim();

const safeRedirect =
  requestedRedirect === '/checkout'
    ? '/checkout'
    : req.get('referer') || '/cart';

res.redirect(safeRedirect);
  } catch (error) {
    req.session.flash = {
      type: 'error',
      message: error.message
    };

    res.redirect(
      req.get('referer') || '/shop'
    );
  }
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
/* =========================================
   COUPON HELPERS
========================================= */

async function getValidCoupon(code, subtotal) {
  const normalizedCode =
    String(code || '')
      .trim()
      .toUpperCase();

  if (!normalizedCode) {
    return {
      coupon: null,
      discount: 0
    };
  }

  const coupon =
    await Coupon.findOne({
      code: normalizedCode,
      active: true
    }).lean();

  if (!coupon) {
    throw new Error('Invalid coupon code.');
  }

  if (
    coupon.expiresAt &&
    new Date(coupon.expiresAt) < new Date()
  ) {
    throw new Error('This coupon has expired.');
  }

  const minimumOrder =
    Number(coupon.minimumOrder || 0);

  if (subtotal < minimumOrder) {
    throw new Error(
      `Minimum order amount is ৳${money(minimumOrder)}.`
    );
  }

  let discount = 0;

  if (coupon.type === 'percentage') {
    discount =
      Math.round(
        subtotal *
        Number(coupon.value || 0) /
        100
      );
  } else if (coupon.type === 'fixed') {
    discount =
      Number(coupon.value || 0);
  }

  discount =
    Math.min(
      Math.max(discount, 0),
      subtotal
    );

  return {
    coupon,
    discount
  };
}


/* =========================================
   APPLY COUPON — GUEST + LOGGED-IN
========================================= */

app.post(
  '/coupon/apply',
  async (req, res) => {
    try {
      const cart =
        req.session.cart || [];

      if (!cart.length) {
        throw new Error('Your cart is empty.');
      }

      const subtotal =
        cart.reduce(
          (sum, item) =>
            sum +
            Number(item.price || 0) *
            Number(item.quantity || 0),
          0
        );

      const { coupon } =
        await getValidCoupon(
          req.body.code,
          subtotal
        );

      req.session.coupon = {
        code: coupon.code
      };

      req.session.flash = {
        type: 'success',
        message:
          `Coupon ${coupon.code} applied successfully.`
      };

      res.redirect('/checkout');
    } catch (error) {
      delete req.session.coupon;

      req.session.flash = {
        type: 'error',
        message: error.message
      };

      res.redirect('/checkout');
    }
  }
);


/* =========================================
   REMOVE COUPON — GUEST + LOGGED-IN
========================================= */

app.post(
  '/coupon/remove',
  (req, res) => {
    delete req.session.coupon;

    req.session.flash = {
      type: 'success',
      message: 'Coupon removed.'
    };

    res.redirect('/checkout');
  }
);


/* =========================================
   GET CHECKOUT — GUEST + LOGGED-IN
========================================= */

app.get(
  '/checkout',
  async (req, res, next) => {
    try {
      const cart =
        req.session.cart || [];

      if (!cart.length) {
        return res.redirect('/cart');
      }

      let user = null;

      if (req.session.user?.id) {
        user =
          await User.findById(
            req.session.user.id
          ).lean();
      }

      const subtotal =
        cart.reduce(
          (sum, item) =>
            sum +
            Number(item.price || 0) *
            Number(item.quantity || 0),
          0
        );

      const deliveryFee =
        subtotal >= 3000
          ? 0
          : 80;

      let coupon = null;
      let discount = 0;

      if (req.session.coupon?.code) {
        try {
          const result =
            await getValidCoupon(
              req.session.coupon.code,
              subtotal
            );

          coupon = result.coupon;
          discount = result.discount;
        } catch (couponError) {
          delete req.session.coupon;

          req.session.flash = {
            type: 'error',
            message: couponError.message
          };
        }
      }

      const total =
        subtotal +
        deliveryFee -
        discount;

      res.render('checkout', {
        title: 'Checkout',
        user,
        subtotal,
        deliveryFee,
        discount,
        total,
        coupon,
        bkashNumber:
          process.env.BKASH_NUMBER || '',
        nagadNumber:
          process.env.NAGAD_NUMBER || ''
      });
    } catch (error) {
      next(error);
    }
  }
);


/* =========================================
   POST CHECKOUT — GUEST + LOGGED-IN
========================================= */

app.post(
  '/checkout',
  async (req, res) => {
    try {
      const cart =
        req.session.cart || [];

      if (!cart.length) {
        throw new Error('Your cart is empty.');
      }

      /* Optional logged-in user */

      let user = null;

      if (req.session.user?.id) {
        user =
          await User.findById(
            req.session.user.id
          );
      }

      /* Customer information */

      const customerName =
        String(
          req.body.name ||
          user?.name ||
          ''
        ).trim();

      const customerPhone =
        String(
          req.body.phone ||
          user?.phone ||
          ''
        ).trim();

      const customerEmail =
        String(
          req.body.email ||
          user?.email ||
          ''
        )
          .trim()
          .toLowerCase();

      if (!customerName) {
        throw new Error(
          'Recipient name is required.'
        );
      }

      if (!customerPhone) {
        throw new Error(
          'Contact number is required.'
        );
      }

      if (!/^01\d{9}$/.test(customerPhone)) {
        throw new Error(
          'Enter a valid 11-digit Bangladeshi phone number.'
        );
      }

      if (
        customerEmail &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          customerEmail
        )
      ) {
        throw new Error(
          'Enter a valid email address.'
        );
      }

      /* Shipping information */

      const country =
        String(
          req.body.country ||
          'Bangladesh'
        ).trim();

      const city =
        String(
          req.body.city || ''
        ).trim();

      const area =
        String(
          req.body.area || ''
        ).trim();

      const address =
        String(
          req.body.address || ''
        ).trim();

      const postalCode =
        String(
          req.body.postalCode || ''
        ).trim();

      const deliveryType =
        ['Home', 'Office'].includes(
          req.body.deliveryType
        )
          ? req.body.deliveryType
          : 'Home';

      const notes =
        String(
          req.body.notes || ''
        )
          .trim()
          .slice(0, 500);

      if (!city) {
        throw new Error(
          'District or city is required.'
        );
      }

      if (!area) {
        throw new Error(
          'Area, thana or upazila is required.'
        );
      }

      if (!address) {
        throw new Error(
          'Full shipping address is required.'
        );
      }

      /* Load real products */

      const productIds =
        cart.map(
          item => item.productId
        );

      const products =
        await Product.find({
          _id: {
            $in: productIds
          },
          active: true
        });

      const productMap =
        new Map(
          products.map(product => [
            product._id.toString(),
            product
          ])
        );

      const items = [];

      for (const cartItem of cart) {
        const product =
          productMap.get(
            cartItem.productId
          );

        if (!product) {
          throw new Error(
            `${cartItem.name} is unavailable.`
          );
        }

        const selectedVariant =
          product.variants?.find(
            variant =>
              variant.color ===
              cartItem.color
          );

        const availableStock =
          selectedVariant
            ? Number(
                selectedVariant.stock || 0
              )
            : Number(
                product.stock || 0
              );

        const quantity =
          Number(cartItem.quantity || 0);

        if (
          quantity < 1 ||
          availableStock < quantity
        ) {
          throw new Error(
            `${cartItem.name} (${cartItem.color}) does not have enough stock.`
          );
        }

        const selectedImage =
          cartItem.image ||
          selectedVariant
            ?.images?.[0]?.url ||
          product.images?.[0]?.url ||
          '';

        items.push({
          product: product._id,
          name: product.name,
          sku: product.sku,
          image: selectedImage,
          size: cartItem.size,
          color: cartItem.color,
          quantity,
          unitPrice:
            Number(product.price),
          lineTotal:
            Number(product.price) *
            quantity
        });
      }

      /* Calculate totals */

      const subtotal =
        items.reduce(
          (sum, item) =>
            sum + item.lineTotal,
          0
        );

      const deliveryFee =
        subtotal >= 3000
          ? 0
          : 80;

      let coupon = null;
      let discount = 0;

      if (req.session.coupon?.code) {
        const couponResult =
          await getValidCoupon(
            req.session.coupon.code,
            subtotal
          );

        coupon =
          couponResult.coupon;

        discount =
          couponResult.discount;
      }

      const total =
        subtotal +
        deliveryFee -
        discount;

      /* Payment validation */

      const paymentMethod =
        ['COD', 'bKash', 'Nagad']
          .includes(
            req.body.paymentMethod
          )
          ? req.body.paymentMethod
          : 'COD';

      const senderNumber =
        String(
          req.body.senderNumber || ''
        ).trim();

      const transactionId =
        String(
          req.body.transactionId || ''
        ).trim();

      if (paymentMethod !== 'COD') {
        if (!senderNumber) {
          throw new Error(
            'Sender bKash/Nagad number is required.'
          );
        }

        if (!/^01\d{9}$/.test(senderNumber)) {
          throw new Error(
            'Enter a valid 11-digit sender number.'
          );
        }

        if (!transactionId) {
          throw new Error(
            'Transaction ID is required.'
          );
        }
      }

      /* Create order */

      const order =
        await Order.create({
          orderNumber:
            makeOrderNumber(),

          customer:
            user?._id || null,

          customerSnapshot: {
            name: customerName,
            email: customerEmail,
            phone: customerPhone
          },

          items,

          shippingAddress: {
            country,
            city,
            area,
            address,
            postalCode,
            deliveryType
          },

          subtotal,
          deliveryFee,
          discount,

          couponCode:
            coupon?.code || '',

          total,

          paymentMethod,

          senderNumber:
            paymentMethod === 'COD'
              ? ''
              : senderNumber,

          transactionId:
            paymentMethod === 'COD'
              ? ''
              : transactionId,

          paymentStatus:
            paymentMethod === 'COD'
              ? 'Pending'
              : 'Submitted',

          notes,

          status: 'Pending',

          statusHistory: [
            {
              status: 'Pending',

              note:
                paymentMethod === 'COD'
                  ? 'Cash on Delivery order placed.'
                  : `${paymentMethod} payment submitted for manual verification.`
            }
          ]
        });

      /* Reduce product stock */

      await Promise.all(
        items.map(async item => {
          const product =
            await Product.findById(
              item.product
            );

          if (!product) {
            throw new Error(
              `${item.name} was not found.`
            );
          }

          const variant =
            product.variants?.find(
              option =>
                option.color ===
                item.color
            );

          if (variant) {
            if (
              Number(variant.stock) <
              item.quantity
            ) {
              throw new Error(
                `${item.name} (${item.color}) does not have enough stock.`
              );
            }

            variant.stock -=
              item.quantity;

            product.stock =
              product.variants.reduce(
                (totalStock, option) =>
                  totalStock +
                  Number(
                    option.stock || 0
                  ),
                0
              );
          } else {
            if (
              Number(product.stock) <
              item.quantity
            ) {
              throw new Error(
                `${item.name} does not have enough stock.`
              );
            }

            product.stock -=
              item.quantity;
          }

          product.soldCount =
            Number(
              product.soldCount || 0
            ) +
            item.quantity;

          await product.save();
        })
      );

      /* Email notifications */

      try {
        await sendAdminOrderEmail(order);

        if (customerEmail) {
          await sendCustomerOrderEmail(
            order
          );
        }
      } catch (emailError) {
        console.error(
          'Order email notification failed:',
          emailError
        );
      }

      /* Save success access in session */

      req.session.lastOrder = {
        id:
          order._id.toString(),

        orderNumber:
          order.orderNumber,

        phone:
          customerPhone
      };

      req.session.cart = [];

      delete req.session.coupon;

      res.redirect(
        `/order-success/${order._id}`
      );
    } catch (error) {
      console.error(
        'Checkout error:',
        error
      );

      req.session.flash = {
        type: 'error',
        message: error.message
      };

      res.redirect('/checkout');
    }
  }
);


/* =========================================
   ORDER SUCCESS PAGE
========================================= */

app.get(
  '/order-success/:id',
  async (req, res, next) => {
    try {
      const order =
        await Order.findById(
          req.params.id
        ).lean();

      if (!order) {
        return res
          .status(404)
          .render('message', {
            title:
              'Order not found',

            message:
              'This order does not exist.'
          });
      }

      const isAdmin =
        req.session.user?.role ===
        'admin';

      const isLoggedInOwner =
        req.session.user?.id &&
        order.customer &&
        order.customer.toString() ===
          req.session.user.id;

      const isGuestOwner =
        req.session.lastOrder?.id ===
        order._id.toString();

      if (
        !isAdmin &&
        !isLoggedInOwner &&
        !isGuestOwner
      ) {
        return res
          .status(403)
          .render('message', {
            title:
              'Access denied',

            message:
              'You cannot view this order.'
          });
      }

      res.render(
        'order-success',
        {
          title:
            'Order placed successfully',

          order
        }
      );
    } catch (error) {
      next(error);
    }
  }
);
app.get('/track-order', (req, res) => {
  res.render('track-order', {
    title: 'Track Order',
    order: null,
    error: null
  });
});

app.post('/track-order', async (req, res) => {
  try {
    const orderNumber = String(req.body.orderNumber || '')
      .trim()
      .toUpperCase();

    const phone = String(req.body.phone || '')
      .replace(/\s+/g, '');

    const order = await Order.findOne({
      orderNumber,
      'customerSnapshot.phone': phone
    }).lean();

    if (!order) {
      return res.render('track-order', {
        title: 'Track Order',
        order: null,
        error: 'Order not found.'
      });
    }

    res.render('track-order', {
      title: 'Track Order',
      order,
      error: null
    });

  } catch (err) {
    res.render('track-order', {
      title: 'Track Order',
      order: null,
      error: 'Something went wrong.'
    });
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

function splitCommaValues(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function getVariantFiles(req, index) {
  return (req.files || []).filter(
    file => file.fieldname === `variantImages_${index}`
  );
}

async function uploadVariantFiles(files) {
  const uploadedImages = [];

  for (const file of files.slice(0, 6)) {
    const result = await uploadBuffer(file.buffer);

    uploadedImages.push({
      url: result.secure_url || result.url,
      publicId: result.public_id || ''
    });
  }

  return uploadedImages;
}

async function productPayload(req, existing = null) {
  const variantCount =
    Math.max(1, Number(req.body.variantCount) || 1);

  const existingVariants =
    Array.isArray(existing?.variants)
      ? existing.variants
      : [];

  const variants = [];

  for (let index = 0; index < variantCount; index += 1) {
    const color = String(
      req.body[`variantColor_${index}`] || ''
    ).trim();

    /*
      Removed rows create missing indexes.
      Skip any index that has no color.
    */
    if (!color) continue;

    const colorHex = String(
      req.body[`variantHex_${index}`] || '#cccccc'
    ).trim();

    const stock = Math.max(
      0,
      Number(req.body[`variantStock_${index}`]) || 0
    );

    const sizes = splitCommaValues(
      req.body[`variantSizes_${index}`]
    );

    const oldVariant =
      existingVariants[index] || null;

    let images = oldVariant?.images
      ? oldVariant.images.map(image => ({
          url: image.url,
          publicId: image.publicId || ''
        }))
      : [];

    const files =
      getVariantFiles(req, index);

    if (files.length) {
      const newImages =
        await uploadVariantFiles(files);

      const shouldReplace =
        req.body[
          `replaceVariantImages_${index}`
        ] === 'on';

      images = shouldReplace
        ? newImages
        : [...images, ...newImages];
    }

    const fallbackUrl = String(
      req.body[`variantImageUrl_${index}`] || ''
    ).trim();

    if (
      fallbackUrl &&
      !images.some(image => image.url === fallbackUrl)
    ) {
      images.push({
        url: fallbackUrl,
        publicId: ''
      });
    }

    variants.push({
      color,
      colorHex,
      stock,
      sizes,
      images
    });
  }

  if (!variants.length) {
    throw new Error(
      'Add at least one product color.'
    );
  }

  const colors =
    variants.map(variant => variant.color);

  const sizes = [
    ...new Set(
      variants.flatMap(variant => variant.sizes)
    )
  ];

  const stock =
    variants.reduce(
      (total, variant) => total + variant.stock,
      0
    );

  const images =
    variants.flatMap(variant => variant.images);

  if (!images.length) {
    throw new Error(
      'Upload at least one product image.'
    );
  }

  return {
    name: String(req.body.name || '').trim(),

    slug: slugify(
      req.body.slug || req.body.name
    ),

    sku: String(req.body.sku || '')
      .trim()
      .toUpperCase(),

    description:
      String(req.body.description || '').trim(),

    category:
      String(req.body.category || '').trim(),

    gender:
      req.body.gender || 'Unisex',

    material:
      String(req.body.material || '').trim(),

    price:
      Number(req.body.price),

    compareAtPrice:
      Number(req.body.compareAtPrice || 0),

    stock,
    sizes,
    colors,
    images,
    variants,

    featured:
      req.body.featured === 'on',

    active:
      req.body.active === 'on'
  };
}

app.post(
  '/admin/products',
  requireAdmin,
  upload.any(),
  async (req, res) => {
    try {
      const payload =
        await productPayload(req);

      await Product.create(payload);

      req.session.flash = {
        type: 'success',
        message: 'Product added successfully.'
      };

      res.redirect('/admin/products');
    } catch (error) {
      console.error(error);

      req.session.flash = {
        type: 'error',
        message: error.message
      };

      res.redirect('/admin/products/new');
    }
  }
);

app.post(
  '/admin/products/:id',
  requireAdmin,
  upload.any(),
  async (req, res) => {
    try {
      const existing =
        await Product.findById(req.params.id);

      if (!existing) {
        throw new Error('Product not found.');
      }

      const payload =
        await productPayload(req, existing);

      Object.assign(existing, payload);

      await existing.save();

      req.session.flash = {
        type: 'success',
        message: 'Product updated successfully.'
      };

      res.redirect('/admin/products');
    } catch (error) {
      console.error(error);

      req.session.flash = {
        type: 'error',
        message: error.message
      };

      res.redirect(
        `/admin/products/${req.params.id}/edit`
      );
    }
  }
);
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
