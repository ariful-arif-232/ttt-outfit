const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },

  name: String,
  sku: String,
  image: String,
  size: String,
  color: String,

  quantity: {
    type: Number,
    min: 1,
    required: true
  },

  unitPrice: {
    type: Number,
    min: 0,
    required: true
  },

  lineTotal: {
    type: Number,
    min: 0,
    required: true
  }
}, {
  _id: false
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
},

  customerSnapshot: {
    name: String,
    email: String,
    phone: String
  },

  items: [itemSchema],

  /*
    Existing address fields remain supported.
    The new optional fields are added for the premium
    Bangladesh district/thana checkout.
  */
  shippingAddress: {
    address: String,
    city: String,
    postalCode: String,

    country: {
      type: String,
      default: 'Bangladesh'
    },

    area: {
      type: String,
      default: ''
    },

    deliveryType: {
      type: String,
      enum: ['Home', 'Office'],
      default: 'Home'
    }
  },

  subtotal: {
    type: Number,
    required: true,
    min: 0
  },

  deliveryFee: {
    type: Number,
    required: true,
    default: 80,
    min: 0
  },

  /*
    Existing discount field is kept unchanged.
    It may contain the final combined discount so old
    admin/order pages continue working.
  */
  discount: {
    type: Number,
    default: 0,
    min: 0
  },

  /*
    New optional coupon details.
  */
  couponCode: {
    type: String,
    trim: true,
    uppercase: true,
    default: ''
  },

  couponDiscount: {
    type: Number,
    default: 0,
    min: 0
  },

  /*
    New optional wholesale details.
    Existing orders automatically receive safe defaults.
  */
  wholesaleEligible: {
    type: Boolean,
    default: false
  },

  wholesaleDiscount: {
    type: Number,
    default: 0,
    min: 0
  },

  wholesaleItemCount: {
    type: Number,
    default: 0,
    min: 0
  },

  total: {
    type: Number,
    required: true,
    min: 0
  },

  paymentMethod: {
    type: String,
    enum: ['COD', 'bKash', 'Nagad'],
    default: 'COD'
  },

  senderNumber: {
    type: String,
    trim: true,
    default: ''
  },

  transactionId: {
    type: String,
    trim: true,
    default: ''
  },

  paymentStatus: {
    type: String,
    enum: [
      'Pending',
      'Submitted',
      'Paid',
      'Rejected',
      'Refunded'
    ],
    default: 'Pending',
    index: true
  },

  status: {
    type: String,
    enum: [
      'Pending',
      'Confirmed',
      'Processing',
      'Shipped',
      'Delivered',
      'Cancelled',
      'Returned'
    ],
    default: 'Pending',
    index: true
  },

  notes: {
    type: String,
    maxlength: 500,
    default: ''
  },

  statusHistory: [{
    status: String,

    at: {
      type: Date,
      default: Date.now
    },

    note: String
  }]
}, {
  timestamps: true
});

module.exports =
  mongoose.models.Order ||
  mongoose.model('Order', orderSchema);
