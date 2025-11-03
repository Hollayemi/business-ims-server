
const { check, validationResult } = require("express-validator");
const createError = require("http-errors");
const Staff = require("../../models/staffSchema");

const createStaffValidators = [
  check("name")
    .notEmpty()
    .withMessage("Staff name is required")
    .isLength({ min: 3 })
    .withMessage("Name must be more than 3 chars")
    .trim(),
  check("phone")
    .notEmpty()
    .withMessage("Phone number is required")
    .isLength({ min: 10 })
    .withMessage("Phone number must be more than 10 chars")
    .trim()
    .custom(async (value) => {
      try {
        const user = await Staff.findOne({ phone: value });
        if (user) {
          throw createError("Phone number already in use!");
        }
      } catch (err) {
        throw createError(err.message);
      }
    }),
  check("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address")
    .trim()
    .custom(async (value) => {
      try {
        const user = await Staff.findOne({ email: value });
        if (user) {
          throw createError("Email already in use!");
        }
      } catch (err) {
        throw createError(err.message);
      }
    }),
  check("role")
    .notEmpty()
    .withMessage("Role is required")
    .isIn(["sales_personnel", "accountant", "stock_manager", "employee"])
    .withMessage("Invalid role"),
  check("password")
    .notEmpty()
    .withMessage("Password is required!")
    .isStrongPassword()
    .withMessage(
      "Password must be at least 8 characters long & should contain at least 1 lowercase, 1 uppercase, 1 number & 1 symbol"
    )
    .trim(),
];

const createStaffValidationHandler = (req, res, next) => {
  const errors = validationResult(req);
  const mappedErrors = errors.mapped();
  if (Object.keys(mappedErrors).length === 0) {
    next();
  } else {
    res.status(400).json({
      errors: mappedErrors,
    });
  }
};

module.exports = {
  createStaffValidators,
  createStaffValidationHandler,
};
