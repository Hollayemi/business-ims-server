
const { validationResult, check } = require("express-validator");
const createError = require("http-errors");

const Employee = require("../../../admin/models/employeeSchema");

const staffLoginValidators = [
  check("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address")
    .trim()
    .custom(async (value) => {
      try {
        console.log({ value })
        const user = await Employee.findOne({ email: value });
        console.log({ user })
        if (!user) {
          throw createError("Invalid credential");
        }

        if (!user.isActive) {
          throw createError("Invalid credential");
        }
      } catch (err) {
        throw createError(err.message);
      }
    }),
  check("password")
    .notEmpty()
    .withMessage("Password is required")
    // .isStrongPassword()
    // .withMessage("Invalid password")
    .trim(),
];

const staffLoginValidationHandler = (req, res, next) => {
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
  staffLoginValidators,
  staffLoginValidationHandler,
};
