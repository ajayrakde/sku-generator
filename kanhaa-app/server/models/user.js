const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  line1: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zip: { type: String, required: true },
});

const userSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true },
    phoneVerified: { type: Boolean, default: false },
    email: { type: String },
    addresses: [addressSchema],
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);