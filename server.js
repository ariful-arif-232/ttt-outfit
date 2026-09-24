require('dotenv').config();

const http = require('http');
const express = require('express');
const MongoStore = require('connect-mongo');
const connectDB = require('./config/db');

/*
  Product-detail purchases include the product id in the request URL as a
  second source of truth. Preserve the existing /cart/add route for Home/Shop,
  but make the URL/header id authoritative when the product page supplies it.
  This avoids a browser/form serialization edge case from turning a valid,
  already-rendered product into "This product is unavailable."

  Popup uploads also pass through this registration hook. Mobile Safari was
  replaying a popup POST after a 307 redirect, which turned one replacement
  into many new popup records. A short session lock stops duplicate submits
  before Multer/Cloudinary run; popup routes then use explicit 303 redirects.
*/
const originalApplicationPost = express.application.post;
express.application.post = function postWithProductCartFallback(routePath, ...handlers) {
  if (routePath === '/cart/add') {
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
  }

  if (routePath === '/admin/popups' || routePath === '/admin/popups/:id') {
    const popupSubmissionGuard = function popupSubmissionGuard(req, res, next) {
      const now = Date.now();
      const previousSubmit = Number(req.session?.popupSubmissionStartedAt || 0);

      if (previousSubmit && now - previousSubmit < 15 * 1000) {
        req.session.flash = {
          type: 'success',
          message: 'Popup update is already being processed.'
        };
        return res.redirect(303, '/admin/popups');
      }

      if (req.session) {
        req.session.popupSubmissionStartedAt = now;
      }

      return next();
    };

    return originalApplicationPost.call(
      this,
      routePath,
      popupSubmissionGuard,
      ...handlers
    );
  }

  return originalApplicationPost.call(this, routePath, ...handlers);
};

/*
  Product pages start with an explicit "nothing selected" state before
  client scripts run.
*/
function rewritePurchaseMarkup(body) {
  if (typeof body !== 'string') return body;

  return body
    .replace(
      /(id="selectedColor"\s+value=")[^"]*(")/,
      '$1$2'
    )
    .replace(
      /(id="selectedSize"\s+value=")[^"]*(")/,
      '$1$2'
    )
    .replace(
      /(<span\s+id="selectedColorLabel">\s*)[^<]*(\s*<\/span>)/,
      '$1Select a color$2'
    )
    .replace(
      /(class="product-color-option\s+)active(\s*")/g,
      '$1$2'
    )
    .replace(
      /(<span\s+id="variantStockText">\s*)[^<]*(\s*<\/span>)/,
      '$1Select color$2'
    )
    .replace(
      "        button.className =\n          `product-size-option ${\n            index === 0 ? 'active' : ''\n          }`;",
      "        button.className =\n          'product-size-option';"
    )
    .replace(
      "      sizeInput.value = sizes[0];",
      "      sizeInput.value = '';"
    )
    .replace(
      "        addButton.disabled = false;\n        buyNowButton.disabled = false;",
      "        addButton.disabled = true;\n        buyNowButton.disabled = true;"
    )
    .replace(
      "    selectVariant(0);\n    updateWholesaleOffer();",
      "    updateWholesaleOffer();"
    );
}

const originalSend = express.response.send;

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

    /*
      Use an explicit render callback for product pages so the final HTML is
      rewritten before sending it.
    */
    const suppliedCallback = typeof callback === 'function'
      ? callback
      : null;

    return originalRender.call(this, view, enriched, (error, html) => {
      if (error) {
        if (suppliedCallback) return suppliedCallback(error);

        if (this.req && typeof this.req.next === 'function') {
          return this.req.next(error);
        }

        throw error;
      }

      const finalHtml = rewritePurchaseMarkup(html);

      if (suppliedCallback) {
        return suppliedCallback(null, finalHtml);
      }

      return originalSend.call(this, finalHtml);
    });
  }

  return originalRender.call(this, view, enriched, callback);
};

const app = require('./app');

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