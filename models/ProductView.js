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
  sessionId: 1
});

module.exports =
  mongoose.models.ProductView ||
  mongoose.model(
    'ProductView',
    productViewSchema
  );
