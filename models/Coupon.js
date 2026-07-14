const mongoose = require('mongoose');

const couponSchema =
  new mongoose.Schema(
    {
      code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
      },

      type: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true
      },

      value: {
        type: Number,
        required: true,
        min: 0
      },

      minimumOrder: {
        type: Number,
        default: 0
      },

      active: {
        type: Boolean,
        default: true
      },

      expiresAt: {
        type: Date,
        default: null
      }
    },
    {
      timestamps: true
    }
  );

module.exports =
  mongoose.models.Coupon ||
  mongoose.model('Coupon', couponSchema);
