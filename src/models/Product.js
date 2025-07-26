const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true,
  },
  originalProductUrl: {
    type: String,
    required: true,
    unique: true,
  },
  priceCNY: Number,
  priceUSD: Number,
  images: [String],
  seller: String,
  qcImages: [String],
  scrapedAt: {
    type: Date,
    default: Date.now,
  },
});

const product = mongoose.model('Product', productSchema);

module.exports = product;
