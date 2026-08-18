const mongoose = require('mongoose');

const popupSchema = new mongoose.Schema({
  image: {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, trim: true, default: '' }
  },
  title: { type: String, trim: true, default: '', maxlength: 120 },
  description: { type: String, trim: true, default: '', maxlength: 300 },
  buttonText: { type: String, trim: true, default: 'Shop Now', maxlength: 40 },
  buttonLink: { type: String, trim: true, default: '/shop', maxlength: 500 },
  active: { type: Boolean, default: true, index: true }
}, { timestamps: true });

popupSchema.index({ active: 1, createdAt: -1 });

module.exports = mongoose.model('Popup', popupSchema);
