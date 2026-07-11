const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String, required: true, maxlength: 3000 },
  category: { type: String, required: true, trim: true, index: true },
  gender: { type: String, enum: ['Men', 'Women', 'Unisex', 'Kids'], default: 'Unisex' },
  material: { type: String, trim: true, default: '' },
  price: { type: Number, required: true, min: 0 },
  compareAtPrice: { type: Number, min: 0, default: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  sizes: [{ type: String, trim: true }],
  colors: [{ type: String, trim: true }],
  images: [{ url: String, publicId: String }],
  featured: { type: Boolean, default: false, index: true },
  active: { type: Boolean, default: true, index: true },
  soldCount: { type: Number, default: 0 },
  ratingAverage: { type: Number, default: 0, min: 0, max: 5 }
}, { timestamps: true });

productSchema.index({ name: 'text', description: 'text', category: 'text' });
module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
