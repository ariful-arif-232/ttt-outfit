const mongoose = require('mongoose');

const homeSliderSchema = new mongoose.Schema({
  desktopImage: { url: { type: String, required: true, trim: true }, publicId: { type: String, trim: true, default: '' } },
  mobileImage: { url: { type: String, trim: true, default: '' }, publicId: { type: String, trim: true, default: '' } },
  subtitle: { type: String, trim: true, default: '', maxlength: 120 },
  title: { type: String, trim: true, required: true, maxlength: 180 },
  description: { type: String, trim: true, default: '', maxlength: 500 },
  descriptionPosition: {
  type: String,
  enum: ['left', 'right'],
  default: 'left'
},
  buttonText: { type: String, trim: true, default: 'Shop Now', maxlength: 40 },
  buttonLink: { type: String, trim: true, default: '/shop', maxlength: 500 },
  textPosition: { type: String, enum: ['left-top','left-center','left-bottom','center-top','center-center','center-bottom','right-top','right-center','right-bottom'], default: 'left-center' },
  displayOrder: { type: Number, default: 0, index: true },
  active: { type: Boolean, default: true, index: true }
}, { timestamps: true });

homeSliderSchema.index({ active: 1, displayOrder: 1 });
module.exports = mongoose.model('HomeSlider', homeSliderSchema);
