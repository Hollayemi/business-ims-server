// models/DailyStock.js
const mongoose = require('mongoose');

const DailyStockSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stock',
    required: true
  },
  productName: String,
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  supplierName: String,
  storeInfo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  openedWith: {
    type: Number,
    default: 0
  },
  amountSold: {
    type: Number,
    default: 0
  },
  amountAdded: {
    type: Number,
    default: 0
  },
  closingWith: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index for upsert operations
DailyStockSchema.index({ product: 1, date: 1, storeInfo: 1 }, { unique: true });

module.exports = mongoose.model('DailyStock', DailyStockSchema);