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
const Category = require('./models/Category');
const HomeSlider = require('./models/HomeSlider');
const Subscriber = require('./models/Subscriber');
const crypto = require('crypto');
const ProductView =
  require('./models/ProductView');
const passport = require('./config/passport');
const {
  sendAdminOrderEmail,
  sendCustomerOrderEmail,
  sendPasswordResetEmail
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
app.use(passport.initialize());
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

/*
  Homepage navigation data is intentionally non-blocking.
  If categories have not been seeded yet, existing pages continue to render.
*/
app.use(async (req, res, next) => {
  try {
    res.locals.menuCategories = await Category.find({
      active: true,
      showInMenu: true
    }).sort({ displayOrder: 1, name: 1 }).lean();
  } catch (error) {
    console.error('Menu category lookup failed:', error.message);
    res.locals.menuCategories = [];
  }
  next();
});

function categoryProductNames(categoryName) {
  const aliases = {
    'T-Shirt': ['T-Shirt', 'T-Shirts'],
    'Drop Shoulder T-Shirt': ['Drop Shoulder T-Shirt', 'Drop Shoulder'],
    'Polo Shirt': ['Polo Shirt', 'Polo', 'Polo Shirts'],
    'Old Money Polo Shirt': ['Old Money Polo Shirt', 'Old Money Polo'],
    'Jacket': ['Jacket', 'Jackets'],
    'Trouser': ['Trouser', 'Trousers'],
    'Joggers': ['Joggers', 'Jogger'],
    'Formal Pant': ['Formal Pant', 'Formal Pants'],
    'Sweatshirt': ['Sweatshirt', 'Sweatshirts'],
    'Hoodie': ['Hoodie', 'Hoodies'],
    'Zipper Hoodie': ['Zipper Hoodie', 'Zip Hoodie']
  };
  return aliases[categoryName] || [categoryName];
}

app.get('/', async (req, res, next) => {
  try {
    const [featured, productCategories, sliders, showcaseCategories, homepageCategories] = await Promise.all([
      Product.find({ active: true, featured: true }).sort({ createdAt: -1 }).limit(8).lean(),
      Product.distinct('category', { active: true }),
      HomeSlider.find({ active: true }).sort({ displayOrder: 1, createdAt: 1 }).lean(),
      Category.find({ active: true, showInShowcase: true }).sort({ displayOrder: 1, name: 1 }).lean(),
      Category.find({ active: true, showOnHomepage: true }).sort({ displayOrder: 1, name: 1 }).lean()
    ]);

    const categorySections = await Promise.all(
      homepageCategories.map(async category => ({
        category,
        products: await Product.find({
          active: true,
          category: { $in: categoryProductNames(category.name) }
        }).sort({ featured: -1, soldCount: -1, createdAt: -1 }).limit(12).lean()
      }))
    );

    res.render('home', {
      title: 'TTT Outfit — Wear Your Identity',
      featured,
      categories: productCategories,
      sliders,
      showcaseCategories,
      homepageCategories,
      categorySections
    });
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
/* =========================================
   GOOGLE AUTHENTICATION
========================================= */

app.get(
  '/auth/google',
  (req, res, next) => {
    if (
      !process.env.GOOGLE_CLIENT_ID ||
      !process.env.GOOGLE_CLIENT_SECRET ||
      !process.env.GOOGLE_CALLBACK_URL
    ) {
      req.session.flash = {
        type: 'error',
        message:
          'Google login is not configured yet.'
      };

      return res.redirect(
        '/auth?tab=login'
      );
    }

    passport.authenticate(
      'google',
      {
        scope: [
          'profile',
          'email'
        ],

        prompt:
          'select_account'
      }
    )(req, res, next);
  }
);


app.get(
  '/auth/google/callback',

  passport.authenticate(
    'google',
    {
      session: false,
      failureRedirect:
        '/auth/google/failure'
    }
  ),

  async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        throw new Error(
          'Google login failed.'
        );
      }

      req.session.user = {
        id:
          user._id.toString(),

        name:
          user.name,

        email:
          user.email,

        role:
          user.role,

        avatar:
          user.avatar || '',

        provider:
          user.provider || 'google'
      };

      req.session.flash = {
        type: 'success',
        message:
          `Welcome, ${user.name}! Google login successful.`
      };

      const destination =
        req.session.returnTo ||
        (
          user.role === 'admin'
            ? '/admin'
            : '/account'
        );

      delete req.session.returnTo;

      req.session.save(error => {
        if (error) {
          return next(error);
        }

        res.redirect(destination);
      });
    } catch (error) {
      next(error);
    }
  }
);


app.get(
  '/auth/google/failure',
  (req, res) => {
    req.session.flash = {
      type: 'error',
      message:
        'Google login was cancelled or failed. Please try again.'
    };

    res.redirect('/auth?tab=login');
  }
);
app.get('/auth', (req, res) => {
  const selectedTab =
    req.query.tab === 'register'
      ? 'register'
      : 'login';

  res.render('auth', {
    title: 'Login / Register',
    tab: selectedTab
  });
});
app.get('/register', (req, res) => {
  res.render('auth', {
    title: 'Create Account',
    tab: 'register'
  });
});
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
res.redirect('/auth?tab=register');
  }
});

app.get('/login', (req, res) => {
  res.render('auth', {
    title: 'Login',
    tab: 'login'
  });
});
app.post('/login', async (req, res, next) => {
  try {
    const identity = String(req.body.identity || '').trim();
    const user = await User.findOne({ $or: [{ email: identity.toLowerCase() }, { phone: identity }], isActive: true });
   if (!user) {
  throw new Error(
    'Invalid email/phone or password.'
  );
}

if (!user.passwordHash) {
  throw new Error(
    'This account uses Google login. Please continue with Google.'
  );
}

const passwordMatches =
  await bcrypt.compare(
    req.body.password || '',
    user.passwordHash
  );

if (!passwordMatches) {
  throw new Error(
    'Invalid email/phone or password.'
  );
} 
    user.lastLoginAt = new Date(); await user.save();
    req.session.user = { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
    const destination = req.session.returnTo || (user.role === 'admin' ? '/admin' : '/account');
    delete req.session.returnTo;
    res.redirect(destination);
  } catch (e) {
    req.session.flash = { type: 'error', message: e.message };
res.redirect('/auth?tab=login');
  }
});
/* =========================================
   FORGOT PASSWORD
========================================= */

app.get(
  '/forgot-password',
  (req, res) => {
    res.render(
      'forgot-password',
      {
        title: 'Forgot Password'
      }
    );
  }
);


app.post(
  '/forgot-password',
  async (req, res) => {
    try {
      const email =
        String(req.body.email || '')
          .trim()
          .toLowerCase();

      if (
        !email ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email
        )
      ) {
        throw new Error(
          'Enter a valid email address.'
        );
      }

      const user =
        await User.findOne({
          email,
          isActive: true
        });
console.log(
  'Forgot password email:',
  email
);

console.log(
  'Reset user found:',
  user ? user.email : 'NO USER FOUND'
);
      /*
        Always show the same success message.
        This prevents people from discovering
        which emails are registered.
      */

      if (user) {
        const rawToken =
          crypto
            .randomBytes(32)
            .toString('hex');

        const hashedToken =
          crypto
            .createHash('sha256')
            .update(rawToken)
            .digest('hex');

        user.resetPasswordToken =
          hashedToken;

        user.resetPasswordExpires =
          new Date(
            Date.now() +
            30 * 60 * 1000
          );

        await user.save();

        const baseUrl =
          process.env.APP_BASE_URL ||
          `${req.protocol}://${req.get('host')}`;

        const resetUrl =
          `${baseUrl}/reset-password/${rawToken}`;

        try {
          await sendPasswordResetEmail({
            email: user.email,
            name: user.name,
            resetUrl
          });
        } catch (emailError) {
          console.error(
            'Password reset email failed:',
            emailError.response?.body ||
            emailError.message ||
            emailError
          );

          user.resetPasswordToken = null;
          user.resetPasswordExpires = null;

          await user.save();

          throw new Error(
            'Could not send the reset email. Please try again.'
          );
        }
      }

      req.session.flash = {
        type: 'success',
        message:
          'If an account exists with that email, a password reset link has been sent.'
      };

      res.redirect(
        '/forgot-password'
      );
    } catch (error) {
      req.session.flash = {
        type: 'error',
        message: error.message
      };

      res.redirect(
        '/forgot-password'
      );
    }
  }
);


/* =========================================
   RESET PASSWORD PAGE
========================================= */

app.get(
  '/reset-password/:token',
  async (req, res) => {
    try {
      const rawToken =
        String(req.params.token || '');

      const hashedToken =
        crypto
          .createHash('sha256')
          .update(rawToken)
          .digest('hex');

      const user =
        await User.findOne({
          resetPasswordToken:
            hashedToken,

          resetPasswordExpires: {
            $gt: new Date()
          },

          isActive: true
        }).lean();

      if (!user) {
        req.session.flash = {
          type: 'error',
          message:
            'This password reset link is invalid or has expired.'
        };

        return res.redirect(
          '/forgot-password'
        );
      }

      res.render(
        'reset-password',
        {
          title: 'Reset Password',
          token: rawToken
        }
      );
    } catch (error) {
      req.session.flash = {
        type: 'error',
        message:
          'Could not open the password reset page.'
      };

      res.redirect(
        '/forgot-password'
      );
    }
  }
);


/* =========================================
   SAVE NEW PASSWORD
========================================= */

app.post(
  '/reset-password/:token',
  async (req, res) => {
    try {
      const password =
        String(
          req.body.password || ''
        );

      const confirmPassword =
        String(
          req.body.confirmPassword || ''
        );

      if (password.length < 8) {
        throw new Error(
          'Password must be at least 8 characters.'
        );
      }

      if (
        password !== confirmPassword
      ) {
        throw new Error(
          'Passwords do not match.'
        );
      }

      const rawToken =
        String(req.params.token || '');

      const hashedToken =
        crypto
          .createHash('sha256')
          .update(rawToken)
          .digest('hex');

      const user =
        await User.findOne({
          resetPasswordToken:
            hashedToken,

          resetPasswordExpires: {
            $gt: new Date()
          },

          isActive: true
        });

      if (!user) {
        throw new Error(
          'This password reset link is invalid or has expired.'
        );
      }

      user.passwordHash =
        await bcrypt.hash(
          password,
          12
        );

      user.resetPasswordToken =
        null;

      user.resetPasswordExpires =
        null;

      /*
        If the account was created through Google,
        it can now also use password login.
      */

      if (
        user.provider === 'google'
      ) {
        user.provider = 'local';
      }

      await user.save();

      req.session.flash = {
        type: 'success',
        message:
          'Your password has been updated. You can now login.'
      };

      res.redirect(
        '/auth?tab=login'
      );
    } catch (error) {
      req.session.flash = {
        type: 'error',
        message: error.message
      };

      res.redirect(
        `/reset-password/${req.params.token}`
      );
    }
  }
);
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

if (requestedRedirect === '/checkout') {
  return res.redirect('/checkout');
}

/*
  Add to Cart from Home / Shop / Product
  Stay on the same page.
*/

return res.redirect(
  req.get('referer') || '/shop'
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
   WHOLESALE HELPERS
========================================= */

const DEFAULT_WHOLESALE_MINIMUM_QUANTITY = 10;
const DEFAULT_WHOLESALE_DISCOUNT_RATE = 0.20;

function getWholesaleSummary(items = []) {
  const itemCount = items.reduce(
    (sum, item) => sum + Math.max(0, Number(item.quantity || 0)),
    0
  );

  const subtotal = items.reduce(
    (sum, item) => {
      const lineTotal = Number(item.lineTotal);

      if (Number.isFinite(lineTotal)) {
        return sum + lineTotal;
      }

      return sum +
        Number(item.price || item.unitPrice || 0) *
        Math.max(0, Number(item.quantity || 0));
    },
    0
  );

  const wholesaleEligible =
    itemCount >= DEFAULT_WHOLESALE_MINIMUM_QUANTITY;

  const wholesaleDiscount = wholesaleEligible
    ? Math.round(subtotal * DEFAULT_WHOLESALE_DISCOUNT_RATE)
    : 0;

  return {
    itemCount,
    wholesaleEligible,
    wholesaleDiscount,
    subtotalAfterWholesale: Math.max(
      0,
      subtotal - wholesaleDiscount
    )
  };
}
function parseBangladeshDateTime(value) {
  const rawValue =
    String(value || '').trim();

  if (!rawValue) {
    return null;
  }

  /*
    datetime-local value example:
    2026-07-19T02:42

    Treat this time as Bangladesh time (UTC+6)
    and save the correct UTC value in MongoDB.
  */

  const match =
    rawValue.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/
    );

  if (!match) {
    throw new Error(
      'Invalid date and time.'
    );
  }

  const [
    ,
    year,
    month,
    day,
    hour,
    minute
  ] = match;

  const utcTime =
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour) - 6,
      Number(minute),
      0
    );

  return new Date(utcTime);
}

/* =========================================
   COUPON HELPERS
========================================= */

async function getValidCoupon(
  code,
  subtotal,
  options = {}
) {
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

  const now = new Date();

  if (
    coupon.startsAt &&
    new Date(coupon.startsAt) > now
  ) {
    throw new Error('This coupon is not active yet.');
  }

  if (
    coupon.expiresAt &&
    new Date(coupon.expiresAt) < now
  ) {
    throw new Error('This coupon has expired.');
  }

  const usageLimit = Number(
    coupon.usageLimit || coupon.maxUses || 0
  );

  const usedCount = Number(
    coupon.usedCount || coupon.usageCount || 0
  );

  if (usageLimit > 0 && usedCount >= usageLimit) {
    throw new Error('This coupon usage limit has been reached.');
  }

  if (
    options.wholesaleEligible &&
    coupon.allowWholesale === false
  ) {
    throw new Error(
      'This coupon cannot be combined with wholesale pricing.'
    );
  }

  const minimumOrder =
    Number(coupon.minimumOrder || 0);

  if (subtotal < minimumOrder) {
    throw new Error(
      `Minimum order amount is ৳${money(minimumOrder)}.`
    );
  }

  if (
    options.userId &&
    Number(coupon.perUserLimit || 0) > 0
  ) {
    const previousUses = await Order.countDocuments({
      customer: options.userId,
      couponCode: normalizedCode
    });

    if (previousUses >= Number(coupon.perUserLimit)) {
      throw new Error(
        'You have already used this coupon the maximum number of times.'
      );
    }
  }

  let discount = 0;

  if (coupon.type === 'percentage') {
    discount = Math.round(
      subtotal * Number(coupon.value || 0) / 100
    );
  } else if (coupon.type === 'fixed') {
    discount = Number(coupon.value || 0);
  }

  const maxDiscount = Number(coupon.maxDiscount || 0);

  if (maxDiscount > 0) {
    discount = Math.min(discount, maxDiscount);
  }

  discount = Math.min(
    Math.max(discount, 0),
    subtotal
  );

  return {
    coupon,
    discount
  };
}

/* =========================================
   APPLY COUPON — AJAX + FALLBACK
========================================= */

app.post(
  '/coupon/apply',
  async (req, res) => {
    const wantsJson =
      req.xhr ||
      req.get('accept')?.includes(
        'application/json'
      );

    try {
      const cart =
        req.session.cart || [];

      if (!cart.length) {
        throw new Error(
          'Your cart is empty.'
        );
      }

      const code =
        String(req.body.code || '')
          .trim()
          .toUpperCase();

      if (!code) {
        throw new Error(
          'Enter a coupon code.'
        );
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

      const wholesale =
        getWholesaleSummary(cart);

      const couponResult =
        await getValidCoupon(
          code,
          wholesale.subtotalAfterWholesale,
          {
            userId:
              req.session.user?.id || null,

            wholesaleEligible:
              wholesale.wholesaleEligible
          }
        );

      req.session.coupon = {
        code:
          couponResult.coupon.code
      };

      const couponDiscount =
        Number(couponResult.discount || 0);

      const wholesaleDiscount =
        Number(
          wholesale.wholesaleDiscount || 0
        );

      const discount =
        wholesaleDiscount +
        couponDiscount;

      const total = Math.max(
        0,
        subtotal +
        deliveryFee -
        discount
      );

      const message =
        `Coupon ${couponResult.coupon.code} applied successfully.`;

      if (wantsJson) {
        return res.json({
          success: true,
          message,

          coupon: {
            code:
              couponResult.coupon.code
          },

          subtotal,
          deliveryFee,
          wholesaleDiscount,
          couponDiscount,
          discount,
          total
        });
      }

      req.session.flash = {
        type: 'success',
        message
      };

      return res.redirect(
        '/checkout'
      );
    } catch (error) {
      if (wantsJson) {
        return res.status(400).json({
          success: false,
          message:
            error.message ||
            'Could not apply coupon.'
        });
      }

      req.session.flash = {
        type: 'error',
        message:
          error.message ||
          'Could not apply coupon.'
      };

      return res.redirect(
        '/checkout'
      );
    }
  }
);


/* =========================================
   REMOVE COUPON — AJAX + FALLBACK
========================================= */

app.post(
  '/coupon/remove',
  (req, res) => {
    const wantsJson =
      req.xhr ||
      req.get('accept')?.includes(
        'application/json'
      );

    const cart =
      req.session.cart || [];

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

    const wholesale =
      getWholesaleSummary(cart);

    const discount =
      wholesale.wholesaleDiscount;

    const total = Math.max(
      0,
      subtotal +
      deliveryFee -
      discount
    );

    delete req.session.coupon;

    const message =
      'Coupon removed successfully.';

    if (wantsJson) {
      return res.json({
        success: true,
        message,
        subtotal,
        deliveryFee,

        wholesaleDiscount:
          wholesale.wholesaleDiscount,

        couponDiscount: 0,
        discount,
        total
      });
    }

    req.session.flash = {
      type: 'success',
      message
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

      const wholesale =
        getWholesaleSummary(cart);

      const wholesaleDiscount =
        wholesale.wholesaleDiscount;

      let coupon = null;
      let couponDiscount = 0;

      if (req.session.coupon?.code) {
        try {
          const result =
            await getValidCoupon(
              req.session.coupon.code,
              wholesale.subtotalAfterWholesale,
              {
                userId: req.session.user?.id || null,
                wholesaleEligible:
                  wholesale.wholesaleEligible
              }
            );

          coupon = result.coupon;
          couponDiscount = result.discount;
        } catch (couponError) {
          delete req.session.coupon;

          req.session.flash = {
            type: 'error',
            message: couponError.message
          };
        }
      }

      const discount =
        wholesaleDiscount + couponDiscount;

      const total = Math.max(
        0,
        subtotal + deliveryFee - discount
      );

      res.render('checkout', {
        title: 'Checkout',
        user,
        subtotal,
        deliveryFee,
        discount,
        couponDiscount,
        wholesaleDiscount,
        wholesaleEligible:
          wholesale.wholesaleEligible,
        wholesaleItemCount:
          wholesale.itemCount,
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

      const wholesale =
        getWholesaleSummary(items);

      const wholesaleDiscount =
        wholesale.wholesaleDiscount;

      let coupon = null;
      let couponDiscount = 0;

      if (req.session.coupon?.code) {
        const couponResult =
          await getValidCoupon(
            req.session.coupon.code,
            wholesale.subtotalAfterWholesale,
            {
              userId: user?._id || null,
              wholesaleEligible:
                wholesale.wholesaleEligible
            }
          );

        coupon =
          couponResult.coupon;

        couponDiscount =
          couponResult.discount;
      }

      const discount =
        wholesaleDiscount + couponDiscount;

      const total = Math.max(
        0,
        subtotal + deliveryFee - discount
      );

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

          couponDiscount,

          wholesaleEligible:
            wholesale.wholesaleEligible,

          wholesaleDiscount,

          wholesaleItemCount:
            wholesale.itemCount,

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

      if (coupon?._id) {
        await Coupon.updateOne(
          { _id: coupon._id },
          { $inc: { usedCount: 1 } }
        ).catch(error => {
          console.error(
            'Coupon usage count update failed:',
            error
          );
        });
      }

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
async function getProductFormCategories(currentCategory = '') {
  const [managedCategories, legacyCategories] = await Promise.all([
    Category.find({ active: true }).sort({ group: 1, displayOrder: 1, name: 1 }).select('name group').lean(),
    Product.distinct('category')
  ]);

  const byName = new Map();
  managedCategories.forEach(category => {
    const name = cleanText(category.name);
    if (name) byName.set(name.toLowerCase(), { name, group: category.group || 'Other', managed: true });
  });
  legacyCategories.forEach(value => {
    const name = cleanText(value);
    if (name && !byName.has(name.toLowerCase())) byName.set(name.toLowerCase(), { name, group: 'Existing product categories', managed: false });
  });
  const current = cleanText(currentCategory);
  if (current && !byName.has(current.toLowerCase())) byName.set(current.toLowerCase(), { name: current, group: 'Current value', managed: false });
  return [...byName.values()].sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
}

app.get('/admin/products/new', requireAdmin, async (req, res, next) => {
  try {
    const managedCategories = await getProductFormCategories();
    res.render('admin/product-form', { title: 'Add product', product: null, managedCategories, cloudinaryReady: cloudinaryReady() });
  } catch (error) { next(error); }
});
app.get('/admin/products/:id/edit', requireAdmin, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).render('message', { title: 'Not found', message: 'Product not found.' });
    const managedCategories = await getProductFormCategories(product.category);
    res.render('admin/product-form', { title: 'Edit product', product, managedCategories, cloudinaryReady: cloudinaryReady() });
  } catch (error) { next(error); }
});

function splitCommaValues(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function getVariantFiles(
  req,
  index,
  fieldPrefix = 'variantImages'
) {
  return (req.files || []).filter(
    file =>
      file.fieldname ===
      `${fieldPrefix}_${index}`
  );
}

async function uploadVariantFiles(files, limit = 6) {
  const uploadedImages = [];

  for (const file of files.slice(0, limit)) {
    const result = await uploadBuffer(file.buffer);

    uploadedImages.push({
      url: result.secure_url || result.url,
      publicId: result.public_id || ''
    });
  }

  return uploadedImages;
}

function normalizeImage(image) {
  if (!image?.url) return null;

  return {
    url: image.url,
    publicId: image.publicId || '',
    alt: image.alt || ''
  };
}

function uniqueImages(images = []) {
  const seen = new Set();

  return images
    .map(normalizeImage)
    .filter(Boolean)
    .filter(image => {
      if (seen.has(image.url)) return false;
      seen.add(image.url);
      return true;
    });
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

    /* Removed rows create missing indexes. */
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

    const oldImages = uniqueImages(
      oldVariant?.images || []
    );

    let mainImage = normalizeImage(
      oldVariant?.mainImage || oldImages[0]
    );

    let hoverImage = normalizeImage(
      oldVariant?.hoverImage || oldImages[1]
    );

    let galleryImages = uniqueImages(
      oldVariant?.galleryImages?.length
        ? oldVariant.galleryImages
        : oldImages.slice(2)
    );

    let images = oldImages;

    const legacyFiles =
      getVariantFiles(req, index);

    if (legacyFiles.length) {
      const newImages =
        await uploadVariantFiles(legacyFiles);

      const shouldReplace =
        req.body[`replaceVariantImages_${index}`] === 'on';

      images = shouldReplace
        ? newImages
        : uniqueImages([...images, ...newImages]);

      mainImage = images[0] || null;
      hoverImage = images[1] || null;
      galleryImages = images.slice(2);
    }

    const mainFiles =
      getVariantFiles(req, index, 'variantMainImage');

    if (mainFiles.length) {
      [mainImage] = await uploadVariantFiles(mainFiles, 1);
    }

    const hoverFiles =
      getVariantFiles(req, index, 'variantHoverImage');

    if (hoverFiles.length) {
      [hoverImage] = await uploadVariantFiles(hoverFiles, 1);
    }

    const galleryFiles =
      getVariantFiles(req, index, 'variantGalleryImages');

    if (galleryFiles.length) {
      const uploadedGallery =
        await uploadVariantFiles(galleryFiles, 8);

      galleryImages = uniqueImages([
        ...galleryImages,
        ...uploadedGallery
      ]);
    }

    const fallbackUrl = String(
      req.body[`variantImageUrl_${index}`] || ''
    ).trim();

    if (fallbackUrl) {
      const fallbackImage = {
        url: fallbackUrl,
        publicId: ''
      };

      if (!mainImage) {
        mainImage = fallbackImage;
      } else if (
        !uniqueImages([
          mainImage,
          hoverImage,
          ...galleryImages
        ]).some(image => image.url === fallbackUrl)
      ) {
        galleryImages.push(fallbackImage);
      }
    }

    images = uniqueImages([
      mainImage,
      hoverImage,
      ...galleryImages
    ]);

    if (!images.length) {
      throw new Error(
        `Upload at least one image for ${color}.`
      );
    }

    variants.push({
      color,
      colorHex,
      stock,
      sizes,
      images,
      mainImage: mainImage || undefined,
      hoverImage: hoverImage || undefined,
      galleryImages
    });
  }

  if (!variants.length) {
    throw new Error('Add at least one product color.');
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

  const images = uniqueImages(
    variants.flatMap(variant => variant.images)
  );

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

    costPrice:
      Math.max(0, Number(req.body.costPrice || 0)),

    wholesalePrice:
      Math.max(0, Number(req.body.wholesalePrice || 0)),

    wholesaleMinimumQuantity:
      Math.max(
        1,
        Number(
          req.body.wholesaleMinimumQuantity ||
          DEFAULT_WHOLESALE_MINIMUM_QUANTITY
        )
      ),

    stock,
    sizes,
    colors,
    images,
    variants,

    featured:
      req.body.featured === 'on',

    active:
      req.body.active === 'on',

    isNewArrival:
      req.body.isNewArrival === 'on',

    isBestSeller:
      req.body.isBestSeller === 'on',

    isOnSale:
      req.body.isOnSale === 'on'
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
app.post(
  '/admin/products/:id/duplicate',
  requireAdmin,
  async (req, res) => {
    try {
      const sourceProduct =
        await Product.findById(req.params.id).lean();

      if (!sourceProduct) {
        throw new Error('Product not found.');
      }

      const suffix = Date.now().toString().slice(-6);

      const duplicate = {
        ...sourceProduct,
        _id: undefined,
        name: `${sourceProduct.name} Copy`,
        slug: `${sourceProduct.slug}-copy-${suffix}`,
        sku: `${sourceProduct.sku}-COPY-${suffix}`,
        soldCount: 0,
        ratingAverage: 0,
        createdAt: undefined,
        updatedAt: undefined
      };

      delete duplicate.__v;

      await Product.create(duplicate);

      req.session.flash = {
        type: 'success',
        message: 'Product duplicated successfully.'
      };

      res.redirect('/admin/products');
    } catch (error) {
      console.error(error);

      req.session.flash = {
        type: 'error',
        message: error.message
      };

      res.redirect('/admin/products');
    }
  }
);

app.post('/admin/products/:id/delete', requireAdmin, async (req, res, next) => { try { await Product.findByIdAndUpdate(req.params.id, { active: false }); res.redirect('/admin/products'); } catch (e) { next(e); } });
/* =========================================
   ADMIN COUPON MANAGEMENT
========================================= */

/* Coupon list */

app.get(
  '/admin/coupons',
  requireAdmin,
  async (req, res, next) => {
    try {
      const coupons = await Coupon.find()
        .sort({ createdAt: -1 })
        .lean();

      res.render('admin/coupons', {
        title: 'Manage Coupons',
        coupons
      });
    } catch (error) {
      next(error);
    }
  }
);


/* New coupon page */

app.get(
  '/admin/coupons/new',
  requireAdmin,
  (req, res) => {
    res.render('admin/coupon-form', {
      title: 'Add Coupon',
      coupon: null
    });
  }
);


/* Create coupon */

app.post(
  '/admin/coupons',
  requireAdmin,
  async (req, res) => {
    try {
      const code = String(
        req.body.code || ''
      )
        .trim()
        .toUpperCase();

      const type =
        req.body.type === 'percentage'
          ? 'percentage'
          : 'fixed';

      const value = Number(
        req.body.value || 0
      );

      const minimumOrder = Math.max(
        0,
        Number(req.body.minimumOrder || 0)
      );

      if (!code) {
        throw new Error(
          'Coupon code is required.'
        );
      }

      if (value <= 0) {
        throw new Error(
          'Discount value must be greater than zero.'
        );
      }

      if (
        type === 'percentage' &&
        value > 100
      ) {
        throw new Error(
          'Percentage discount cannot exceed 100%.'
        );
      }

      const existing =
        await Coupon.findOne({ code });

      if (existing) {
        throw new Error(
          'This coupon code already exists.'
        );
      }

      await Coupon.create({
        code,
        type,
        value,
        minimumOrder,

        maxDiscount: Math.max(
          0,
          Number(req.body.maxDiscount || 0)
        ),

        usageLimit: Math.max(
          0,
          Number(req.body.usageLimit || 0)
        ),

        perUserLimit: Math.max(
          0,
          Number(req.body.perUserLimit || 0)
        ),

startsAt:
  parseBangladeshDateTime(
    req.body.startsAt
  ),

expiresAt:
  parseBangladeshDateTime(
    req.body.expiresAt
  ),

        allowWholesale:
          req.body.allowWholesale === 'on',

        active:
          req.body.active === 'on'
      });

      req.session.flash = {
        type: 'success',
        message:
          `Coupon ${code} created successfully.`
      };

      res.redirect('/admin/coupons');
    } catch (error) {
      req.session.flash = {
        type: 'error',
        message: error.message
      };

      res.redirect('/admin/coupons/new');
    }
  }
);


/* Edit coupon page */

app.get(
  '/admin/coupons/:id/edit',
  requireAdmin,
  async (req, res, next) => {
    try {
      const coupon =
        await Coupon.findById(
          req.params.id
        ).lean();

      if (!coupon) {
        return res.status(404).render(
          'message',
          {
            title: 'Coupon not found',
            message:
              'This coupon does not exist.'
          }
        );
      }

      res.render('admin/coupon-form', {
        title: 'Edit Coupon',
        coupon
      });
    } catch (error) {
      next(error);
    }
  }
);


/* Update coupon */

app.post(
  '/admin/coupons/:id/update',
  requireAdmin,
  async (req, res) => {
    try {
      const coupon =
        await Coupon.findById(
          req.params.id
        );

      if (!coupon) {
        throw new Error(
          'Coupon not found.'
        );
      }

      const code = String(
        req.body.code || ''
      )
        .trim()
        .toUpperCase();

      const type =
        req.body.type === 'percentage'
          ? 'percentage'
          : 'fixed';

      const value =
        Number(req.body.value || 0);

      if (!code) {
        throw new Error(
          'Coupon code is required.'
        );
      }

      if (value <= 0) {
        throw new Error(
          'Discount value must be greater than zero.'
        );
      }

      if (
        type === 'percentage' &&
        value > 100
      ) {
        throw new Error(
          'Percentage discount cannot exceed 100%.'
        );
      }

      const duplicate =
        await Coupon.findOne({
          code,
          _id: {
            $ne: coupon._id
          }
        });

      if (duplicate) {
        throw new Error(
          'This coupon code already exists.'
        );
      }

      coupon.code = code;
      coupon.type = type;
      coupon.value = value;

      coupon.minimumOrder = Math.max(
        0,
        Number(req.body.minimumOrder || 0)
      );

      coupon.maxDiscount = Math.max(
        0,
        Number(req.body.maxDiscount || 0)
      );

      coupon.usageLimit = Math.max(
        0,
        Number(req.body.usageLimit || 0)
      );

      coupon.perUserLimit = Math.max(
        0,
        Number(req.body.perUserLimit || 0)
      );

coupon.startsAt =
  parseBangladeshDateTime(
    req.body.startsAt
  );

coupon.expiresAt =
  parseBangladeshDateTime(
    req.body.expiresAt
  );
      coupon.allowWholesale =
        req.body.allowWholesale === 'on';

      coupon.active =
        req.body.active === 'on';

      await coupon.save();

      req.session.flash = {
        type: 'success',
        message:
          `Coupon ${coupon.code} updated successfully.`
      };

      res.redirect('/admin/coupons');
    } catch (error) {
      req.session.flash = {
        type: 'error',
        message: error.message
      };

      res.redirect(
        `/admin/coupons/${req.params.id}/edit`
      );
    }
  }
);


/* Toggle active / inactive */

app.post(
  '/admin/coupons/:id/toggle',
  requireAdmin,
  async (req, res) => {
    try {
      const coupon =
        await Coupon.findById(
          req.params.id
        );

      if (!coupon) {
        throw new Error(
          'Coupon not found.'
        );
      }

      coupon.active = !coupon.active;

      await coupon.save();

      req.session.flash = {
        type: 'success',
        message:
          `Coupon ${coupon.code} is now ${
            coupon.active
              ? 'active'
              : 'inactive'
          }.`
      };

      res.redirect('/admin/coupons');
    } catch (error) {
      req.session.flash = {
        type: 'error',
        message: error.message
      };

      res.redirect('/admin/coupons');
    }
  }
);


/* Delete coupon */

app.post(
  '/admin/coupons/:id/delete',
  requireAdmin,
  async (req, res) => {
    try {
      const coupon =
        await Coupon.findByIdAndDelete(
          req.params.id
        );

      if (!coupon) {
        throw new Error(
          'Coupon not found.'
        );
      }

      req.session.flash = {
        type: 'success',
        message:
          `Coupon ${coupon.code} deleted successfully.`
      };

      res.redirect('/admin/coupons');
    } catch (error) {
      req.session.flash = {
        type: 'error',
        message: error.message
      };

      res.redirect('/admin/coupons');
    }
  }
);
/* =========================
   Homepage CMS and newsletter
   ========================= */

function formBoolean(value) {
  return value === 'on' || value === 'true' || value === true || value === '1';
}

function cleanText(value) {
  return String(value || '').trim();
}

app.post('/newsletter/subscribe', async (req, res) => {
  const email = cleanText(req.body.email).toLowerCase();
  const returnTo = cleanText(req.body.returnTo) || '/';

  try {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Please enter a valid email address.');
    const existing = await Subscriber.findOne({ email });
    if (existing) {
      if (existing.status !== 'active') {
        existing.status = 'active';
        existing.subscribedAt = new Date();
        existing.unsubscribedAt = null;
        await existing.save();
        req.session.flash = { type: 'success', message: 'Welcome back to the TTT Community.' };
      } else {
        req.session.flash = { type: 'success', message: 'You are already subscribed to the TTT Community.' };
      }
      return res.redirect(returnTo.startsWith('/') ? returnTo : '/');
    }
    await Subscriber.create({ email, source: cleanText(req.body.source) || 'homepage' });
    req.session.flash = { type: 'success', message: 'Thank you for joining the TTT Community.' };
    return res.redirect(returnTo.startsWith('/') ? returnTo : '/');
  } catch (error) {
    req.session.flash = { type: 'error', message: error.code === 11000 ? 'You are already subscribed.' : error.message };
    return res.redirect(returnTo.startsWith('/') ? returnTo : '/');
  }
});

app.get('/admin/categories', requireAdmin, async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ group: 1, displayOrder: 1, name: 1 }).lean();
    res.render('admin/categories', { title: 'Homepage categories', categories });
  } catch (error) { next(error); }
});

app.get('/admin/categories/new', requireAdmin, (req, res) => {
  res.render('admin/category-form', { title: 'Add category', category: null, groups: Category.GROUPS, cloudinaryReady: cloudinaryReady() });
});

app.get('/admin/categories/:id/edit', requireAdmin, async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id).lean();
    if (!category) return res.status(404).render('message', { title: 'Not found', message: 'Category not found.' });
    res.render('admin/category-form', { title: 'Edit category', category, groups: Category.GROUPS, cloudinaryReady: cloudinaryReady() });
  } catch (error) { next(error); }
});

async function categoryPayload(req, existing = null) {
  const name = cleanText(req.body.name);
  if (!name) throw new Error('Category name is required.');
  let image = existing?.image || { url: '', publicId: '', alt: '' };
  if (req.file) {
    const uploaded = await uploadBuffer(req.file.buffer, 'ttt-outfit/categories');
    image = { url: uploaded.secure_url || uploaded.url, publicId: uploaded.public_id || '', alt: name };
  } else if (cleanText(req.body.imageUrl)) {
    image = { url: cleanText(req.body.imageUrl), publicId: '', alt: name };
  }
  return {
    name,
    slug: slugify(cleanText(req.body.slug) || name),
    group: Category.GROUPS.includes(req.body.group) ? req.body.group : 'Other',
    image,
    buttonText: cleanText(req.body.buttonText) || 'Shop Now',
    offerText: cleanText(req.body.offerText) || 'GET 20% OFF',
    showInMenu: formBoolean(req.body.showInMenu),
    showInShowcase: formBoolean(req.body.showInShowcase),
    showOnHomepage: formBoolean(req.body.showOnHomepage),
    displayOrder: Number(req.body.displayOrder) || 0,
    active: formBoolean(req.body.active)
  };
}

app.post('/admin/categories', requireAdmin, upload.single('imageFile'), async (req, res) => {
  try {
    await Category.create(await categoryPayload(req));
    req.session.flash = { type: 'success', message: 'Category created.' };
    res.redirect('/admin/categories');
  } catch (error) {
    req.session.flash = { type: 'error', message: error.code === 11000 ? 'Category name or slug already exists.' : error.message };
    res.redirect('/admin/categories/new');
  }
});

app.post('/admin/categories/:id', requireAdmin, upload.single('imageFile'), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) throw new Error('Category not found.');
    Object.assign(category, await categoryPayload(req, category));
    await category.save();
    req.session.flash = { type: 'success', message: 'Category updated.' };
    res.redirect('/admin/categories');
  } catch (error) {
    req.session.flash = { type: 'error', message: error.code === 11000 ? 'Category name or slug already exists.' : error.message };
    res.redirect(`/admin/categories/${req.params.id}/edit`);
  }
});

app.post('/admin/categories/:id/delete', requireAdmin, async (req, res) => {
  try {
    await Category.findByIdAndUpdate(req.params.id, { active: false });
    req.session.flash = { type: 'success', message: 'Category deactivated.' };
  } catch (error) { req.session.flash = { type: 'error', message: error.message }; }
  res.redirect('/admin/categories');
});

app.get('/admin/sliders', requireAdmin, async (req, res, next) => {
  try {
    const sliders = await HomeSlider.find().sort({ displayOrder: 1, createdAt: 1 }).lean();
    res.render('admin/sliders', { title: 'Homepage sliders', sliders });
  } catch (error) { next(error); }
});

app.get('/admin/sliders/new', requireAdmin, (req, res) => {
  res.render('admin/slider-form', { title: 'Add hero slide', slider: null, cloudinaryReady: cloudinaryReady() });
});

app.get('/admin/sliders/:id/edit', requireAdmin, async (req, res, next) => {
  try {
    const slider = await HomeSlider.findById(req.params.id).lean();
    if (!slider) return res.status(404).render('message', { title: 'Not found', message: 'Hero slide not found.' });
    res.render('admin/slider-form', { title: 'Edit hero slide', slider, cloudinaryReady: cloudinaryReady() });
  } catch (error) { next(error); }
});

async function sliderPayload(req, existing = null) {
  let desktopImage = existing?.desktopImage || { url: '', publicId: '' };
  let mobileImage = existing?.mobileImage || { url: '', publicId: '' };
  const desktopFile = (req.files || []).find(file => file.fieldname === 'desktopImageFile');
  const mobileFile = (req.files || []).find(file => file.fieldname === 'mobileImageFile');
  if (desktopFile) {
    const uploaded = await uploadBuffer(desktopFile.buffer, 'ttt-outfit/home-sliders');
    desktopImage = { url: uploaded.secure_url || uploaded.url, publicId: uploaded.public_id || '' };
  } else if (cleanText(req.body.desktopImageUrl)) desktopImage = { url: cleanText(req.body.desktopImageUrl), publicId: '' };
  if (mobileFile) {
    const uploaded = await uploadBuffer(mobileFile.buffer, 'ttt-outfit/home-sliders');
    mobileImage = { url: uploaded.secure_url || uploaded.url, publicId: uploaded.public_id || '' };
  } else if (cleanText(req.body.mobileImageUrl)) mobileImage = { url: cleanText(req.body.mobileImageUrl), publicId: '' };
  if (!desktopImage.url) throw new Error('Desktop hero image is required.');
  return {
    desktopImage, mobileImage,
    subtitle: cleanText(req.body.subtitle),
    title: cleanText(req.body.title),
    description: cleanText(req.body.description),
    buttonText: cleanText(req.body.buttonText) || 'Shop Now',
    buttonLink: cleanText(req.body.buttonLink) || '/shop',
    textPosition: cleanText(req.body.textPosition) || 'left-center',
    displayOrder: Number(req.body.displayOrder) || 0,
    active: formBoolean(req.body.active)
  };
}

const sliderUpload = upload.fields([{ name: 'desktopImageFile', maxCount: 1 }, { name: 'mobileImageFile', maxCount: 1 }]);

app.post('/admin/sliders', requireAdmin, sliderUpload, async (req, res) => {
  try {
    await HomeSlider.create(await sliderPayload(req));
    req.session.flash = { type: 'success', message: 'Hero slide created.' };
    res.redirect('/admin/sliders');
  } catch (error) {
    req.session.flash = { type: 'error', message: error.message };
    res.redirect('/admin/sliders/new');
  }
});

app.post('/admin/sliders/:id', requireAdmin, sliderUpload, async (req, res) => {
  try {
    const slider = await HomeSlider.findById(req.params.id);
    if (!slider) throw new Error('Hero slide not found.');
    Object.assign(slider, await sliderPayload(req, slider));
    await slider.save();
    req.session.flash = { type: 'success', message: 'Hero slide updated.' };
    res.redirect('/admin/sliders');
  } catch (error) {
    req.session.flash = { type: 'error', message: error.message };
    res.redirect(`/admin/sliders/${req.params.id}/edit`);
  }
});

app.post('/admin/sliders/:id/delete', requireAdmin, async (req, res) => {
  try {
    await HomeSlider.findByIdAndUpdate(req.params.id, { active: false });
    req.session.flash = { type: 'success', message: 'Hero slide deactivated.' };
  } catch (error) { req.session.flash = { type: 'error', message: error.message }; }
  res.redirect('/admin/sliders');
});

app.get('/admin/subscribers', requireAdmin, async (req, res, next) => {
  try {
    const subscribers = await Subscriber.find().sort({ createdAt: -1 }).lean();
    res.render('admin/subscribers', { title: 'Newsletter subscribers', subscribers });
  } catch (error) { next(error); }
});

app.post('/admin/subscribers/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const subscriber = await Subscriber.findById(req.params.id);
    if (!subscriber) throw new Error('Subscriber not found.');
    subscriber.status = subscriber.status === 'active' ? 'unsubscribed' : 'active';
    subscriber.unsubscribedAt = subscriber.status === 'unsubscribed' ? new Date() : null;
    if (subscriber.status === 'active') subscriber.subscribedAt = new Date();
    await subscriber.save();
    req.session.flash = { type: 'success', message: 'Subscriber status updated.' };
  } catch (error) { req.session.flash = { type: 'error', message: error.message }; }
  res.redirect('/admin/subscribers');
});

app.post('/admin/subscribers/:id/delete', requireAdmin, async (req, res) => {
  try {
    await Subscriber.findByIdAndDelete(req.params.id);
    req.session.flash = { type: 'success', message: 'Subscriber deleted.' };
  } catch (error) { req.session.flash = { type: 'error', message: error.message }; }
  res.redirect('/admin/subscribers');
});

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
