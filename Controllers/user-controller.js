const User = require("../Models/user.model");
const AppError = require("../Utils/app-error");
const factory = require("./handler-factory-for-tour-controller");

const catchAsyncErrors = (func) => {
  return (req, res, next) => {
    func(req, res, next).catch((error) => next(error)); //catch async errors and call next with error to go straight into error handling middleware
  };
};

const getAllUsers = catchAsyncErrors(async (req, res, next) => {
  //Async because doing database manipulation
  const users = await User.find(); //find finds all documents in User collection

  res.status(200).json({
    status: "success",
    data: {
      users,
    },
  });
});

//...allowed Fields is all the properties specified in the argument 'name', 'email' etc
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((element) => {
    //Loop through each key in the object
    if (allowedFields.includes(element)) newObj[element] = obj[element]; //If the current property is in the allowedFields array, then overwrite it in the newObj
  });
  return newObj;
};

//Update a users account details
const updateMe = catchAsyncErrors(async (req, res, next) => {
  //1) Create error if user POSTs password data - updating passwords is done in the authentication routes
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use /updateMyPassword",
        400
      )
    );
  }

  //2) Filter out unwanted object properties/field names that aren't allowed to be updated
  const filteredReqBody = filterObj(req.body, "name", "email");

  //3) Update user document - cant update using just req.body because that would allow the user to update fields such as role and jwtToken expiry date etc
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    filteredReqBody,
    {
      new: true, //return new updated object
      runValidators: true, //Make sure new email etc is not invalid
    }
  );

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

const getAUser = (req, res) => {
  res.status(500).json({
    status: "error",
    message: "route undefined",
  });
};

//Uses factory function to update a user (factory functions are only for logged in administrators)
const updateAUser = factory.updateOne(User);
const createAUser = factory.createOne(User);
const deleteAUser = factory.deleteOne(User);

const deleteMe = catchAsyncErrors(async (req, res, next) => {
  //User is already logged in so the user has already been saved on the request body
  await User.findByIdAndUpdate(req.user.id, { active: false }); //Set active property for user in database to false

  res.status(204).json({
    status: "success",
    data: null,
  });
});

module.exports = {
  getAllUsers,
  getAUser,
  deleteMe,
  deleteAUser,
  updateMe,
  updateAUser,
  createAUser,
};
