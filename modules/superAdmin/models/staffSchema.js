const mongoose = require("mongoose");
const Financial = require("../../admin/models/financialSchema");

const staffSchema = mongoose.Schema(
    {
        storeId: {
            type: String,
            required: true,
            trim: true,
        },
        name: {
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
        password: {
            type: String,
            required: true,
            trim: true,
            select: false,
        },
        role: {
            type: String,
            enum: ["sales_personnel", "accountant", "stock_manager", "employee"],
            default: "employee",
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
        }
    },
    { timestamps: true }
);

// Middleware to create financial model after store creation

const staff = mongoose.model("staff", staffSchema);

module.exports = staff;
