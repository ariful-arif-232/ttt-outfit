const mongoose = require('mongoose');

const addressSchema =
  new mongoose.Schema(
    {
      label: {
        type: String,
        default: 'Home',
        trim: true
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

const userSchema =
  new mongoose.Schema(
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
        default: undefined
      },

      passwordHash: {
        type: String,
        default: null
      },

      googleId: {
        type: String,
        trim: true,
        default: undefined
      },

      provider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
      },

      avatar: {
        type: String,
        trim: true,
        default: ''
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

      lastLoginAt: {
        type: Date,
        default: null
      },

      resetPasswordToken: {
        type: String,
        default: null
      },

      resetPasswordExpires: {
        type: Date,
        default: null
      }
    },
    {
      timestamps: true
    }
  );

userSchema.index(
  { phone: 1 },
  {
    unique: true,
    sparse: true
  }
);

userSchema.index(
  { googleId: 1 },
  {
    unique: true,
    sparse: true
  }
);

userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ resetPasswordToken: 1, resetPasswordExpires: 1 });

module.exports =
  mongoose.models.User ||
  mongoose.model(
    'User',
    userSchema
  );
