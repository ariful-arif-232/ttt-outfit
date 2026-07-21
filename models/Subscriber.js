const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254, match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address.'] },
  status: { type: String, enum: ['active', 'unsubscribed'], default: 'active', index: true },
  source: { type: String, trim: true, default: 'homepage', maxlength: 80 },
  subscribedAt: { type: Date, default: Date.now },
  unsubscribedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Subscriber', subscriberSchema);
