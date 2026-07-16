const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      default: 'Home'
    },

    address: {
      type: String,
      required: true,
      trim: true
    },

    city: {
      type: String,
      required: true,
      trim: true
    },

    postalCode: {
      type: String,
      trim: true,
      default: ''
    },

    isDefault: {
      type: Boolean,
      default: true
    }
  },
  {
    _id: true
  }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },

    phone: {
      type: String,
      trim: true,
      default: null,
      unique: true,
      sparse: true,
      index: true
    },

    passwordHash: {
      type: String,
      default: null
    },

    googleId: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
      index: true
    },

    avatar: {
      type: String,
      default: ''
    },

    provider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local'
    },

    emailVerified: {
      type: Boolean,
      default: false
    },

    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
      index: true
    },

    addresses: [addressSchema],

    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      }
    ],

    isActive: {
      type: Boolean,
      default: true
    },

    lastLoginAt: Date
  },
  {
    timestamps: true
  }
);

module.exports =
  mongoose.models.User ||
  mongoose.model('User', userSchema);
