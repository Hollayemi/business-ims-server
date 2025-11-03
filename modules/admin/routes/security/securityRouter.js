

const express = require("express");
const checkIsSubscribed = require("../../../../middleware/common/admin/checkIsSubscribed");
const checkIsAdmin = require("../../../../middleware/common/admin/checkIsAdmin");
const {
  changePassword,
  updateStoreProfile,
} = require("../../controllers/security/securityController");
const {
  securityValidators,
  securityValidationHandler,
} = require("../../validators/security/securityValidators");
const {
  updateStoreProfileValidators,
  updateStoreProfileValidationHandler,
} = require("../../validators/security/updateStoreProfileValidators");

const router = express.Router();

//change password
router.post(
  "/change-password",
  checkIsAdmin,
  checkIsSubscribed,
  securityValidators,
  securityValidationHandler,
  changePassword
);

//update store profile
router.patch(
  "/profile",
  checkIsAdmin,
  checkIsSubscribed,
  updateStoreProfileValidators,
  updateStoreProfileValidationHandler,
  updateStoreProfile
);

module.exports = router;
