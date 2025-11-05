
const mongoose = require("mongoose");

const supplierSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    shopName: {
      type: String,
      lowercase: true,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      lowercase: true,
      required: false,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: false,
      trim: true,
    },
    website: {
      type: String,
      lowercase: true,
      trim: true,
    },
    address: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
    },
    picture: {
      type: String,
    },
    picture_info: {
      public_key: String,
    },
    storeInfo: {
      type: mongoose.Types.ObjectId,
      ref: "Store",
      required: false,
    },
  },
  { timestamps: true }
);

const Supplier = mongoose.model("Supplier", supplierSchema);

module.exports = Supplier;
