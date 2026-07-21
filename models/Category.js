const mongoose = require('mongoose');

const DEFAULT_GROUPS = [
  'T-Shirts',
  'Polo Shirts',
  'Bottom Wear',
  'Winter Wear',
  'Other'
];

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true, maxlength: 80 },
  slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
  group: {
  type: String,
  required: true,
  trim: true,
  default: 'Other',
  index: true
},
  image: { url: { type: String, trim: true, default: '' }, publicId: { type: String, trim: true, default: '' }, alt: { type: String, trim: true, default: '' } },
  buttonText: { type: String, trim: true, default: 'Shop Now', maxlength: 40 },
  offerText: { type: String, trim: true, default: 'GET 20% OFF', maxlength: 80 },
  showInMenu: { type: Boolean, default: true, index: true },
  showInShowcase: { type: Boolean, default: true, index: true },
  showOnHomepage: { type: Boolean, default: true, index: true },
  displayOrder: { type: Number, default: 0, index: true },
  active: { type: Boolean, default: true, index: true }
}, { timestamps: true });

categorySchema.index({ group: 1, displayOrder: 1, name: 1 });

module.exports = mongoose.model('Category', categorySchema);
module.exports.DEFAULT_GROUPS = DEFAULT_GROUPS;
