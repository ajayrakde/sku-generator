const mongoose = require('mongoose');

// SKU model representing a specific variant of a product (e.g., size or flavour).
const skuSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variant: { type: String },
    price: { type: Number, required: true },
    inventory: { type: Number, required: true },
    // Additional attributes such as weight, flavour, etc., can be added here.
  },
  { timestamps: true }
);

module.exports = mongoose.model('Sku', skuSchema);