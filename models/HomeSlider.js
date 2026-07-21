const mongoose = require('mongoose');

const sliderImageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true
    },
    publicId: {
      type: String,
      trim: true,
      default: ''
    },
    alt: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    _id: false
  }
);

const homeSliderSchema = new mongoose.Schema(
  {
    desktopImage: {
      type: sliderImageSchema,
      required: true
    },

    mobileImage: {
      type: sliderImageSchema,
      default: undefined
    },

    eyebrow: {
      type: String,
      trim: true,
      maxlength: 80,
      default: ''
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },

    buttonText: {
      type: String,
      trim: true,
      maxlength: 40,
      default: 'Shop Now'
    },

    buttonLink: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '/shop'
    },

    textPosition: {
      type: String,
      enum: [
        'left-top',
        'left-center',
        'left-bottom',
        'center-top',
        'center',
        'center-bottom',
        'right-top',
        'right-center',
        'right-bottom'
      ],
      default: 'left-center'
    },

    displayOrder: {
      type: Number,
      min: 0,
      default: 0,
      index: true
    },

    active: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

homeSliderSchema.index({
  active: 1,
  displayOrder: 1,
  createdAt: 1
});

module.exports =
  mongoose.models.HomeSlider ||
  mongoose.model('HomeSlider', homeSliderSchema);
