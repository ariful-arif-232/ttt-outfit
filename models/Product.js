const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true
    },
    publicId: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    _id: false
  }
);

const variantSchema = new mongoose.Schema(
  {
    color: {
      type: String,
      required: true,
      trim: true
    },

    colorHex: {
      type: String,
      trim: true,
      default: '#cccccc'
    },

    stock: {
      type: Number,
      min: 0,
      default: 0
    },

    sizes: [
      {
        type: String,
        trim: true
      }
    ],

    images: [imageSchema]
  },
  {
    _id: false
  }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },

    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },

    description: {
      type: String,
      required: true,
      maxlength: 3000
    },

    category: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    gender: {
      type: String,
      enum: ['Men', 'Women', 'Unisex', 'Kids'],
      default: 'Unisex'
    },

    material: {
      type: String,
      trim: true,
      default: ''
    },

    price: {
      type: Number,
      required: true,
      min: 0
    },

    compareAtPrice: {
      type: Number,
      min: 0,
      default: 0
    },

    /*
      These legacy fields remain for compatibility
      with the existing shop, cart and older products.
    */
    stock: {
      type: Number,
      min: 0,
      default: 0
    },

    sizes: [
      {
        type: String,
        trim: true
      }
    ],

    colors: [
      {
        type: String,
        trim: true
      }
    ],

    images: [imageSchema],

    /*
      New professional color variants.
    */
    variants: [variantSchema],

    featured: {
      type: Boolean,
      default: false,
      index: true
    },

    active: {
      type: Boolean,
      default: true,
      index: true
    },

    soldCount: {
      type: Number,
      default: 0
    },

    ratingAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    }
  },
  {
    timestamps: true
  }
);

productSchema.index({
  name: 'text',
  description: 'text',
  category: 'text'
});

module.exports =
  mongoose.models.Product ||
  mongoose.model('Product', productSchema);
