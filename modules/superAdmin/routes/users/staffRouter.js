
const express = require("express");
const { createStaffValidationHandler, createStaffValidators } = require("../../validators/users/staffValidators");
const { createStaff, loginStaff } = require("../../controllers/users/staffController");
const { staffLoginValidators, staffLoginValidationHandler } = require("../../validators/users/staffLoginValidators");



const router = express.Router();

// create Staff
router.post(
  "/create-staff",
  createStaffValidators,
  createStaffValidationHandler,
  createStaff
);

//login Staff
router.post(
  "/login",
  staffLoginValidators,
  staffLoginValidationHandler,
  loginStaff
);

module.exports = router;
