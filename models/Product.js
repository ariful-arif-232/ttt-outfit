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
    },

    alt: {
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

    /*
      Existing field kept unchanged for backward compatibility.

      Current shop/product/cart code can continue using:
      variant.images[0] = main image
      variant.images[1] = hover image
      variant.images[2+] = gallery images
    */
    images: [imageSchema],

    /*
      New optional fields.

      These allow the admin form to manage Main, Hover and
      Gallery images separately without deleting or breaking
      the old variant.images array.
    */
    mainImage: {
      type: imageSchema,
      default: undefined
    },

    hoverImage: {
      type: imageSchema,
      default: undefined
    },

    galleryImages: {
      type: [imageSchema],
      default: undefined
    }
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
      Optional pricing fields added for the easier premium
      admin product form. Existing products do not need them.
    */
    costPrice: {
      type: Number,
      min: 0,
      default: 0
    },

    wholesalePrice: {
      type: Number,
      min: 0,
      default: 0
    },

    wholesaleMinimumQuantity: {
      type: Number,
      min: 1,
      default: 10
    },

    /*
      These legacy fields remain unchanged for compatibility
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
      Existing professional color variants.
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

    /*
      Optional product labels. All default to false, so they
      do not change how existing products currently behave.
    */
    isNewArrival: {
      type: Boolean,
      default: false,
      index: true
    },

    isBestSeller: {
      type: Boolean,
      default: false,
      index: true
    },

    isOnSale: {
      type: Boolean,
      default: false,
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
