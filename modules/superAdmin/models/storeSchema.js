const mongoose = require("mongoose");
const Financial = require("../../admin/models/financialSchema");

const storeSchema = mongoose.Schema(
  {
    storeName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    ownerName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    website: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      trim: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["storeAdmin", "storeModerator"],
      default: "storeAdmin",
    },
    picture: String,
    picture_info: {
      public_key: String,
    },
    verifyToken: String,
    forgetToken: String,
    verifiedStore: {
      type: Boolean,
      default: false,
    },
    // ✅ Subscription Fields
    isActive: {
      type: Boolean,
      default: false, // initially inactive until payment
    },
  },
  { timestamps: true }
);

// Middleware to create financial model after store creation
storeSchema.post("save", async function (doc, next) {
  try {
    const existing = await Financial.findOne({ storeInfo: doc._id });
    if (!existing) {
      await Financial.create({ storeInfo: doc._id });
    }
    next();
  } catch (error) {
    next(error);
  }
});

const Store = mongoose.model("Store", storeSchema);

module.exports = Store;
