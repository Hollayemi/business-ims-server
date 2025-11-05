
const { validationResult, check } = require("express-validator");
const createError = require("http-errors");

const Category = require("../../models/categorySchema");

const supplierValidators = [
  check("name")
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 3 })
    .withMessage("Name must-be 3 characters")
    .trim(),
  check("shopName")
    .notEmpty()
    .withMessage("Shop name is required")
    .isLength({ min: 2 })
    .withMessage("Description must-be 2 characters")
    .trim(),
  check("description")
    .optional({ checkFalsy: true })
    .isLength({ min: 10 })
    .withMessage("Description must-be 10 characters")
    .trim(),
  check("email")
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage("Email must-be a valid email address")
    .trim(),
  check("phone")
    .optional({ checkFalsy: true })
    .isMobilePhone()
    .withMessage("Phone number must-be a valid number")
    .trim(),
  check("website")
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage("URL must-be a valid url")
    .trim(),
  check("address")
    .optional({ checkFalsy: true })
    .isLength({ min: 10 })
    .withMessage("Address must-be 10 characters")
    .trim(),
];

const supplierValidationHandler = (req, res, next) => {
  const errors = validationResult(req);
  const mappedErrors = errors.mapped();
  if (Object.keys(mappedErrors).length === 0) {
    next();
  } else {
    res.status(500).json({
      errors: mappedErrors,
    });
  }
};

module.exports = {
  supplierValidators,
  supplierValidationHandler,
};
