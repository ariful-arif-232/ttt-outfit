const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      index: true,
      validate: {
        validator(value) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
        message: 'Please enter a valid email address.'
      }
    },

    status: {
      type: String,
      enum: ['active', 'unsubscribed'],
      default: 'active',
      index: true
    },

    source: {
      type: String,
      trim: true,
      maxlength: 80,
      default: 'homepage'
    },

    subscribedAt: {
      type: Date,
      default: Date.now,
      index: true
    },

    unsubscribedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

subscriberSchema.pre('validate', function normalizeEmail(next) {
  if (typeof this.email === 'string') {
    this.email = this.email.trim().toLowerCase();
  }
  next();
});

subscriberSchema.index({
  status: 1,
  subscribedAt: -1
});

module.exports =
  mongoose.models.Subscriber ||
  mongoose.model('Subscriber', subscriberSchema);
