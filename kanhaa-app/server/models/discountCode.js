const mongoose = require('mongoose');

const discountCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    type: { type: String, enum: ['percent', 'fixed'], required: true },
    amount: { type: Number, required: true },
    minimumSpend: { type: Number, default: 0 },
    expiryDate: { type: Date },
    usageLimit: { type: Number },
    usageCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DiscountCode', discountCodeSchema);