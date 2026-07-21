const mongoose = require('mongoose');

const CATEGORY_GROUPS = [
  'T-Shirts',
  'Polo Shirts',
  'Bottom Wear',
  'Winter Wear',
  'Other'
];

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 120,
      index: true
    },

    group: {
      type: String,
      enum: CATEGORY_GROUPS,
      default: 'Other',
      index: true
    },

    image: {
      url: {
        type: String,
        trim: true,
        default: ''
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

    buttonText: {
      type: String,
      trim: true,
      maxlength: 40,
      default: 'Shop Now'
    },

    offerText: {
      type: String,
      trim: true,
      maxlength: 80,
      default: ''
    },

    showInMenu: {
      type: Boolean,
      default: true,
      index: true
    },

    showInShowcase: {
      type: Boolean,
      default: false,
      index: true
    },

    showOnHomepage: {
      type: Boolean,
      default: false,
      index: true
    },

    displayOrder: {
      type: Number,
      min: 0,
      default: 0,
      index: true
    },

    active: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

categorySchema.index({
  active: 1,
  group: 1,
  displayOrder: 1,
  name: 1
});

categorySchema.index({
  active: 1,
  showInMenu: 1,
  displayOrder: 1
});

categorySchema.index({
  active: 1,
  showInShowcase: 1,
  displayOrder: 1
});

categorySchema.index({
  active: 1,
  showOnHomepage: 1,
  displayOrder: 1
});

categorySchema.statics.groups = CATEGORY_GROUPS;

module.exports =
  mongoose.models.Category ||
  mongoose.model('Category', categorySchema);
