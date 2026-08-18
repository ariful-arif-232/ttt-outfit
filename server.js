require('dotenv').config();

const http = require('http');
const express = require('express');
const MongoStore = require('connect-mongo');
const connectDB = require('./config/db');

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
