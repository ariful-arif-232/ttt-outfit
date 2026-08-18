const mongoose = require('mongoose');

const productViewSchema =
  new mongoose.Schema(
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
      },

      sessionId: {
        type: String,
        required: true
      },

      viewedAt: {
        type: Date,
        default: Date.now
      }
    }
  );

productViewSchema.index({
  product: 1,
  sessionId: 1,
  viewedAt: -1
});

productViewSchema.index({
  product: 1,
  viewedAt: -1,
  sessionId: 1
});

// Product-page live viewer counts only use a short recent window.
// Expire old analytics rows so this collection stays small over time.
productViewSchema.index(
  { viewedAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 }
);

module.exports =
  mongoose.models.ProductView ||
  mongoose.model(
    'ProductView',
    productViewSchema
  );
