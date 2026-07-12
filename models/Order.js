const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: String,
  sku: String,
  image: String,
  size: String,
  color: String,
  quantity: { type: Number, min: 1, required: true },
  unitPrice: { type: Number, min: 0, required: true },
  lineTotal: { type: Number, min: 0, required: true }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  customerSnapshot: { name: String, email: String, phone: String },
  items: [itemSchema],
  shippingAddress: { address: String, city: String, postalCode: String },
  subtotal: { type: Number, required: true },
  deliveryFee: { type: Number, required: true, default: 80 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
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
  enum: ['Pending', 'Submitted', 'Paid', 'Rejected', 'Refunded'],
  default: 'Pending',
  index: true
},
  status: { type: String, enum: ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'], default: 'Pending', index: true },
  notes: { type: String, maxlength: 500, default: '' },
  statusHistory: [{ status: String, at: { type: Date, default: Date.now }, note: String }]
}, { timestamps: true });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
