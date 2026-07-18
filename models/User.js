const mongoose = require('mongoose');


/* =========================================
   ADDRESS SCHEMA
========================================= */

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


/* =========================================
   USER SCHEMA
========================================= */

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

      /*
        Phone is required for normal registration,
        but optional for Google accounts.
      */

      phone: {
        type: String,
        trim: true,
        default: undefined
      },

      /*
        Password is required for local login,
        but optional for Google accounts.
      */

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

      addresses: [
        addressSchema
      ],

      wishlist: [
        {
          type:
            mongoose.Schema.Types.ObjectId,

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


/* =========================================
   OPTIONAL UNIQUE INDEXES
========================================= */

userSchema.index(
  {
    phone: 1
  },
  {
    unique: true,
    sparse: true
  }
);

userSchema.index(
  {
    googleId: 1
  },
  {
    unique: true,
    sparse: true
  }
);


/* =========================================
   EXPORT MODEL
========================================= */

module.exports =
  mongoose.models.User ||
  mongoose.model(
    'User',
    userSchema
  );
