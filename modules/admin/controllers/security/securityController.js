

const bcrypt = require("bcrypt");
const Store = require("../../../admin/models/employeeSchema");

//change password controller
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    //validate input
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        errors: {
          common: {
            msg: "Old password and new password are required",
          },
        },
      });
    }

    console.log({ email: req.staff })
    //check valid store
    const store = await Store.findOne({ email: req.staff.email }).select(
      "+password"
    );
    if (!store) {
      return res.status(404).json({
        errors: {
          common: {
            msg: "Store not found.",
          },
        },
      });
    }

    console.log({ oldPassword, pass: store.password })
    //check hash of old password
    const isMatch = await bcrypt.compare(oldPassword, store.password);
    if (!isMatch) {
      return res.status(400).json({
        errors: {
          common: {
            msg: "Old password is incorrect",
          },
        },
      });
    }
    //set new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    store.password = hashedPassword;
    const result = await store.save();

    if (result._id) {
      res.status(200).json({
        data: result,
        msg: "Password changed successfully!",
      });
    } else {
      res.status(500).json({
        errors: {
          common: {
            msg: "Failed to change password. Please try again.",
          },
        },
      });
    }
  } catch (err) {
    console.log({ err })
    res.json({
      errors: {
        common: {
          msg: "Unknown error occured!",
        },
      },
    });
  }
};

//update store profile controller
const updateStoreProfile = async (req, res) => {
  try {
    const { ownerName, storeName, phone, website, address } = req.body;

    //check valid store
    const store = await Store.findOne({
      email: req.store.email,
      _id: req.store.storeId,
    });
    if (!store) {
      return res.status(404).json({
        errors: {
          common: {
            msg: "Store not found.",
          },
        },
      });
    }

    const result = await Store.findByIdAndUpdate(
      { _id: req.store.storeId, email: req.store.email },
      {
        ownerName,
        storeName,
        phone,
        website,
        address,
      },
      { new: true, runValidators: true }
    );

    if (result._id) {
      res.status(200).json({
        data: result,
        msg: "Store profile updated successfully!",
      });
    } else {
      res.status(500).json({
        errors: {
          common: {
            msg: "Failed to update profile. Please try again.",
          },
        },
      });
    }
  } catch (err) {
    res.json({
      errors: {
        common: {
          msg: "Unknown error occured!",
        },
      },
    });
  }
};

module.exports = {
  changePassword,
  updateStoreProfile,
};
