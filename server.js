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
  Public assets have long browser cache lifetimes. Keep the current asset keys
  deterministic at render time so phones cannot stay on a stale product UI.
  Product pages also start with an explicit "nothing selected" state before
  client scripts run.
*/
const purchaseAssetReplacements = [
  ['/js/product-page-submit-fix.js?v=20260820-2', '/js/product-page-submit-fix.js?v=20260821-6'],
  ['/js/product-page-submit-fix.js?v=20260820-4', '/js/product-page-submit-fix.js?v=20260821-6'],
  ['/js/product-page-submit-fix.js?v=20260821-5', '/js/product-page-submit-fix.js?v=20260821-6'],
  ['/js/product-detail-polish.js?v=20260821-4', '/js/product-detail-polish.js?v=20260821-6'],
  ['/js/product-detail-polish.js?v=20260821-5', '/js/product-detail-polish.js?v=20260821-6'],
  ['/css/product-page-hotfix.css?v=20260820-7', '/css/product-page-hotfix.css?v=20260821-1'],
  ['/css/wholesale-final-ui.css?v=20260821-4', '/css/wholesale-final-ui.css?v=20260821-6'],
  ['/css/wholesale-final-ui.css?v=20260821-5', '/css/wholesale-final-ui.css?v=20260821-6'],
  ['/js/quick-cart-polish.js?v=20260820-5', '/js/quick-cart-polish.js?v=20260821-1'],
  ['/js/cart-page-fix.js?v=20260820-1', '/js/cart-page-fix.js?v=20260821-1']
];

function rewritePurchaseMarkup(body, { productView = false } = {}) {
  if (typeof body !== 'string') return body;

  purchaseAssetReplacements.forEach(([from, to]) => {
    if (body.includes(from)) {
      body = body.replaceAll(from, to);
    }
  });

  if (!productView) return body;

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
express.response.send = function sendWithFreshPurchaseFlow(body) {
  return originalSend.call(this, rewritePurchaseMarkup(body));
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

    /*
      Use an explicit render callback for product pages. Express' default send
      path is not guaranteed to pass through our prototype send wrapper on all
      Vercel/Express combinations, so rewrite the final HTML before sending it.
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

      const finalHtml = rewritePurchaseMarkup(html, {
        productView: true
      });

      if (suppliedCallback) {
        return suppliedCallback(null, finalHtml);
      }

      return originalSend.call(this, finalHtml);
    });
  }

  return originalRender.call(this, view, enriched, callback);
};

/*
  app.js is still a large legacy monolith. Apply focused guarded patches only
  while Node compiles that one module. The source file on disk is untouched;
  marker mismatches fail loudly instead of serving partially patched behavior.
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

function replaceRequired(source, from, to, label) {
  if (!source.includes(from)) {
    throw new Error(`Popup source patch marker missing: ${label}`);
  }
  return source.replace(from, to);
}

function patchPopupAdminSource(source) {
  source = replaceRequired(
    source,
    "const { uploadBuffer, cloudinaryReady } = require('./config/cloudinary');",
    "const { uploadBuffer, cloudinaryReady, cloudinary } = require('./config/cloudinary');",
    'cloudinary import'
  );

  const popupListOld = [
    "app.get('/admin/popups', requireAdmin, async (req, res, next) => {",
    '  try {',
    '    const popups = await Popup.find().sort({ createdAt: -1 }).lean();',
    "    res.render('admin/popups', { title: 'Site popup', popups });",
    '  } catch (error) { next(error); }',
    '});'
  ].join('\n');

  const popupListNew = [
    "app.get('/admin/popups', requireAdmin, async (req, res, next) => {",
    '  try {',
    '    let popups = await Popup.find().sort({ updatedAt: -1, createdAt: -1 }).lean();',
    '',
    '    if (popups.length > 1) {',
    '      const [keeper, ...duplicates] = popups;',
    '      const duplicateIds = duplicates.map(popup => popup._id);',
    '      const keeperPublicId = String(keeper.image?.publicId || "");',
    '      const stalePublicIds = [...new Set(',
    '        duplicates',
    '          .map(popup => String(popup.image?.publicId || ""))',
    '          .filter(publicId => publicId && publicId !== keeperPublicId)',
    '      )];',
    '',
    '      await Popup.deleteMany({ _id: { $in: duplicateIds } });',
    '',
    '      if (cloudinaryReady() && stalePublicIds.length) {',
    '        await Promise.allSettled(',
    '          stalePublicIds.map(publicId => cloudinary.uploader.destroy(publicId))',
    '        );',
    '      }',
    '',
    '      popups = [keeper];',
    '    }',
    '',
    "    res.render('admin/popups', { title: 'Site popup', popups });",
    '  } catch (error) { next(error); }',
    '});'
  ].join('\n');

  source = replaceRequired(source, popupListOld, popupListNew, 'popup list singleton cleanup');

  const popupCreateOld = [
    "app.post('/admin/popups', requireAdmin, popupUpload, async (req, res) => {",
    '  try {',
    '    await Popup.create(await popupPayload(req));',
    "    req.session.flash = { type: 'success', message: 'Popup created.' };",
    "    res.redirect('/admin/popups');",
    '  } catch (error) {',
    "    req.session.flash = { type: 'error', message: error.message };",
    "    res.redirect('/admin/popups/new');",
    '  }',
    '});'
  ].join('\n');

  const popupCreateNew = [
    "app.post('/admin/popups', requireAdmin, popupUpload, async (req, res) => {",
    '  try {',
    '    const payload = await popupPayload(req);',
    '    let popup = await Popup.findOne().sort({ updatedAt: -1, createdAt: -1 });',
    '    const previousPublicId = String(popup?.image?.publicId || "");',
    '',
    '    if (popup) {',
    '      Object.assign(popup, payload);',
    '      await popup.save();',
    '    } else {',
    '      popup = await Popup.create(payload);',
    '    }',
    '',
    '    const currentPublicId = String(popup.image?.publicId || "");',
    '    if (',
    '      cloudinaryReady() &&',
    '      previousPublicId &&',
    '      previousPublicId !== currentPublicId',
    '    ) {',
    '      await cloudinary.uploader.destroy(previousPublicId).catch(error =>',
    "        console.error('Old popup image cleanup failed:', error.message)",
    '      );',
    '    }',
    '',
    "    req.session.flash = { type: 'success', message: 'Popup saved.' };",
    "    res.redirect(303, '/admin/popups');",
    '  } catch (error) {',
    "    req.session.flash = { type: 'error', message: error.message };",
    "    res.redirect(303, '/admin/popups/new');",
    '  }',
    '});'
  ].join('\n');

  source = replaceRequired(source, popupCreateOld, popupCreateNew, 'popup create singleton');

  const popupEditOld = [
    "app.post('/admin/popups/:id', requireAdmin, popupUpload, async (req, res) => {",
    '  try {',
    '    const popup = await Popup.findById(req.params.id);',
    "    if (!popup) throw new Error('Popup not found.');",
    '    Object.assign(popup, await popupPayload(req, popup));',
    '    await popup.save();',
    "    req.session.flash = { type: 'success', message: 'Popup updated.' };",
    "    res.redirect('/admin/popups');",
    '  } catch (error) {',
    "    req.session.flash = { type: 'error', message: error.message };",
    '    res.redirect(`/admin/popups/${req.params.id}/edit`);',
    '  }',
    '});'
  ].join('\n');

  const popupEditNew = [
    "app.post('/admin/popups/:id', requireAdmin, popupUpload, async (req, res) => {",
    '  try {',
    '    const popup = await Popup.findById(req.params.id);',
    "    if (!popup) throw new Error('Popup not found.');",
    '    const previousPublicId = String(popup.image?.publicId || "");',
    '    Object.assign(popup, await popupPayload(req, popup));',
    '    await popup.save();',
    '    const currentPublicId = String(popup.image?.publicId || "");',
    '',
    '    if (',
    '      cloudinaryReady() &&',
    '      previousPublicId &&',
    '      previousPublicId !== currentPublicId',
    '    ) {',
    '      await cloudinary.uploader.destroy(previousPublicId).catch(error =>',
    "        console.error('Old popup image cleanup failed:', error.message)",
    '      );',
    '    }',
    '',
    "    req.session.flash = { type: 'success', message: 'Popup updated.' };",
    "    res.redirect(303, '/admin/popups');",
    '  } catch (error) {',
    "    req.session.flash = { type: 'error', message: error.message };",
    '    res.redirect(303, `/admin/popups/${req.params.id}/edit`);',
    '  }',
    '});'
  ].join('\n');

  source = replaceRequired(source, popupEditOld, popupEditNew, 'popup edit redirect and cleanup');

  const popupDeleteOld = [
    "app.post('/admin/popups/:id/delete', requireAdmin, async (req, res) => {",
    '  try {',
    '    await Popup.findByIdAndUpdate(req.params.id, { active: false });',
    "    req.session.flash = { type: 'success', message: 'Popup deactivated.' };",
    "  } catch (error) { req.session.flash = { type: 'error', message: error.message }; }",
    "  res.redirect('/admin/popups');",
    '});'
  ].join('\n');

  const popupDeleteNew = [
    "app.post('/admin/popups/:id/delete', requireAdmin, async (req, res) => {",
    '  try {',
    '    const popup = await Popup.findByIdAndDelete(req.params.id);',
    '',
    '    if (cloudinaryReady() && popup?.image?.publicId) {',
    '      await cloudinary.uploader.destroy(popup.image.publicId).catch(error =>',
    "        console.error('Popup image delete failed:', error.message)",
    '      );',
    '    }',
    '',
    "    req.session.flash = { type: 'success', message: 'Popup deleted permanently.' };",
    "  } catch (error) { req.session.flash = { type: 'error', message: error.message }; }",
    "  res.redirect(303, '/admin/popups');",
    '});'
  ].join('\n');

  return replaceRequired(source, popupDeleteOld, popupDeleteNew, 'popup permanent delete');
}

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

  patchedSource = patchPopupAdminSource(patchedSource);

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