const mongoose = require('mongoose');

const CATEGORY_ALIASES = new Map([
  ['t-shirts', 'T-Shirt'],
  ['tshirt', 'T-Shirt'],
  ['tshirts', 'T-Shirt'],
  ['polo shirts', 'Polo Shirt'],
  ['joggers', 'Joggers'],
  ['jackets', 'Jacket'],
  ['drop shoulder t-shirt', 'Drop Shoulder'],
  ['drop shoulder t-shirts', 'Drop Shoulder'],
  ['old money polo shirt', 'Old Money Polo'],
  ['old money polo shirts', 'Old Money Polo']
]);

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

    images: [imageSchema],

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

productSchema.index({ active: 1, createdAt: -1 });
productSchema.index({ active: 1, featured: -1, createdAt: -1 });
productSchema.index({ active: 1, category: 1, featured: -1, soldCount: -1, createdAt: -1 });
productSchema.index({ active: 1, price: 1 });
productSchema.index({ active: 1, soldCount: -1 });

productSchema.pre(/^find/, function normalizeLegacyCategoryLinks() {
  const filter = this.getFilter();

  if (typeof filter.category !== 'string') return;

  const key = filter.category.trim().toLowerCase();
  const canonicalCategory = CATEGORY_ALIASES.get(key);

  if (canonicalCategory) {
    filter.category = canonicalCategory;
  }
});

module.exports =
  mongoose.models.Product ||
  mongoose.model('Product', productSchema);
