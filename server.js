require('dotenv').config();

const fs = require('fs');
const http = require('http');
const express = require('express');
const MongoStore = require('connect-mongo');
const connectDB = require('./config/db');
const patchWholesaleAppSource = require('./utils/wholesale-app-source-patch');

/*
  Product-detail purchases include the product id in the request URL as a
  second source of truth. Preserve the existing /cart/add route for Home/Shop,
  but make the URL/header id authoritative when the product page supplies it.
  This avoids a browser/form serialization edge case from turning a valid,
  already-rendered product into "This product is unavailable."
*/
const originalApplicationPost = express.application.post;
express.application.post = function postWithProductCartFallback(routePath, ...handlers) {
  if (routePath !== '/cart/add') {
    return originalApplicationPost.call(this, routePath, ...handlers);
  }

  const wrappedHandlers = handlers.map(handler => {
    if (typeof handler !== 'function') return handler;

    return function productCartIdFallback(req, res, next) {
      const fallbackProductId = String(
        req.query?.productId ||
        req.get('X-TTT-Product-Id') ||
        ''
      ).trim();

      if (fallbackProductId) {
        req.body ||= {};
        req.body.productId = fallbackProductId;
      }

      return handler(req, res, next);
    };
  });

  return originalApplicationPost.call(this, routePath, ...wrappedHandlers);
};

/*
  Public assets have long browser cache lifetimes. Rewrite only known versioned
  URLs in rendered HTML so phones receive the current product/cart polish files
  immediately without changing the template structure.
*/
const originalSend = express.response.send;
express.response.send = function sendWithFreshPurchaseFlow(body) {
  if (typeof body === 'string') {
    const replacements = [
      ['/js/product-page-submit-fix.js?v=20260820-2', '/js/product-page-submit-fix.js?v=20260820-4'],
      ['/css/product-page-hotfix.css?v=20260820-7', '/css/product-page-hotfix.css?v=20260821-1'],
      ['/js/quick-cart-polish.js?v=20260820-5', '/js/quick-cart-polish.js?v=20260821-1'],
      ['/js/cart-page-fix.js?v=20260820-1', '/js/cart-page-fix.js?v=20260821-1']
    ];

    replacements.forEach(([from, to]) => {
      if (body.includes(from)) {
        body = body.replaceAll(from, to);
      }
    });
  }

  return originalSend.call(this, body);
};

/*
  Reuse Mongoose's MongoClient for the session store on Vercel.
  This avoids opening a second MongoDB connection pool per warm function.
*/
const originalMongoStoreCreate = MongoStore.create.bind(MongoStore);
MongoStore.create = function createSharedMongoStore(options = {}) {
  if (options.mongoUrl && process.env.MONGODB_URI) {
    const { mongoUrl, ...rest } = options;
    return originalMongoStoreCreate({
      ...rest,
      touchAfter: rest.touchAfter ?? 60 * 60 * 24,
      clientPromise: connectDB.getClientPromise()
    });
  }

  return originalMongoStoreCreate(options);
};

/*
  Keep existing templates unchanged while supplying the SEO variables that
  header.ejs expects. Route titles already passed by app.js become page titles,
  and canonical URLs follow the current public path.
*/
const originalRender = express.response.render;
const privateRoutePrefixes = [
  '/admin',
  '/account',
  '/cart',
  '/checkout',
  '/orders',
  '/wishlist',
  '/login',
  '/register',
  '/auth',
  '/forgot-password',
  '/reset-password'
];

express.response.render = function renderWithSeo(view, options, callback) {
  if (!options || typeof options === 'function') {
    return originalRender.call(this, view, options, callback);
  }

  const enriched = { ...options };
  const rawTitle = enriched.pageTitle || enriched.title;

  if (!enriched.pageTitle && rawTitle) {
    const cleanTitle = String(rawTitle).trim();
    enriched.pageTitle = /ttt outfit/i.test(cleanTitle)
      ? cleanTitle
      : `${cleanTitle} | TTT Outfit`;
  }

  if (!enriched.canonicalUrl && this.req) {
    const routePath = String(this.req.path || '/');
    enriched.canonicalUrl = `https://tttoutfit.bd${routePath === '/' ? '/' : routePath}`;
  }

  if (enriched.noIndex === undefined && this.req) {
    enriched.noIndex = privateRoutePrefixes.some(prefix =>
      this.req.path === prefix || this.req.path.startsWith(`${prefix}/`)
    );
  }

  /*
    Cart keeps its existing markup. When wholesale pricing is active, expose
    the effective unit prices and product subtotal to that same template.
  */
  if (view === 'cart' && Array.isArray(enriched.cart)) {
    enriched.cart = enriched.cart.map(item => ({
      ...item,
      price: Number(item.effectiveUnitPrice ?? item.price ?? 0)
    }));

    if (Number.isFinite(Number(enriched.subtotalAfterWholesale))) {
      enriched.subtotal = Number(enriched.subtotalAfterWholesale);
    }
  }

  if (view === 'product' && enriched.product) {
    const product = enriched.product;

    if (!enriched.pageDescription && product.description) {
      enriched.pageDescription = String(product.description).replace(/\s+/g, ' ').trim().slice(0, 155);
    }

    if (!enriched.socialImage) {
      enriched.socialImage =
        product.variants?.[0]?.mainImage?.url ||
        product.variants?.[0]?.images?.[0]?.url ||
        product.images?.[0]?.url ||
        undefined;
    }

    enriched.ogType = enriched.ogType || 'product';
  }

  return originalRender.call(this, view, enriched, callback);
};

/*
  app.js is still a large legacy monolith. Apply the wholesale/cart patch only
  while Node compiles that one module, with guarded source markers. The source
  file on disk is untouched; a marker mismatch fails loudly instead of serving
  partially patched checkout math.
*/
const appModulePath = require.resolve('./app');
const originalJsLoader = require.extensions['.js'];

const couponRemoveLegacyPricing = `    const subtotal =
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
      getWholesaleSummary(cart);`;

const couponRemoveNormalizedPricing = `      const subtotal =
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
        getWholesaleSummary(cart);`;

const duplicatedPatchBoundary =
  'function parseBangladeshDateTime(value) {function parseBangladeshDateTime(value) {';

require.extensions['.js'] = function compileWholesalePatchedApp(module, filename) {
  if (filename !== appModulePath) {
    return originalJsLoader(module, filename);
  }

  const originalSource = fs.readFileSync(filename, 'utf8');
  const normalizedSource = originalSource.includes(couponRemoveLegacyPricing)
    ? originalSource.replace(
        couponRemoveLegacyPricing,
        couponRemoveNormalizedPricing
      )
    : originalSource;

  let patchedSource = patchWholesaleAppSource(normalizedSource);

  if (patchedSource.includes(duplicatedPatchBoundary)) {
    patchedSource = patchedSource.replace(
      duplicatedPatchBoundary,
      'function parseBangladeshDateTime(value) {'
    );
  }

  return module._compile(patchedSource, filename);
};

let app;
try {
  app = require('./app');
} finally {
  require.extensions['.js'] = originalJsLoader;
}

function handler(req, res) {
  const startedAt = Date.now();
  const requestId = req.headers['x-vercel-id'] || '';

  res.once('finish', () => {
    const ms = Date.now() - startedAt;

    if (ms >= 750 || res.statusCode >= 500) {
      console.log(JSON.stringify({
        level: res.statusCode >= 500 ? 'error' : 'info',
        msg: 'request_complete',
        method: req.method,
        path: req.url?.split('?')[0] || '/',
        status: res.statusCode,
        ms,
        requestId
      }));
    }
  });

  return app(req, res);
}

if (require.main === module) {
  const port = process.env.PORT || 3000;
  http.createServer(handler).listen(port, () => {
    console.log(`TTT Outfit running at http://localhost:${port}`);
  });
}

module.exports = handler;
