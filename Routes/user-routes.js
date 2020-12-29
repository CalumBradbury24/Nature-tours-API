const express = require("express");
const router = express.Router();
const userController = require("../Controllers/user-controller");
const authController = require("../Controllers/authentication-controller");

router.post("/signup", authController.signup); //route purely for signing up where data can only be posted
router.post("/login", authController.login); //Send login credentials in the body

//Could use router.use(authController.protect) <- This will protect every route after this middleware, instead of having to write protect in each route

router.post("/forgotPassword", authController.forgotPassword); //Route for user to enter email address to reset password
router.patch("/resetPassword/:token", authController.resetPassword); //Route for entering new password with a password reset token
router.patch(
  "/updateMyPassword",
  authController.protect,
  authController.updatePassword
); //Route for updating a users password

router.patch("/updateMe", authController.protect, userController.updateMe); //Protect the route so only the currently authenticated user can update the information of this user
router.delete("/deleteMe", authController.protect, userController.deleteMe); //Protect route to make sure user is signed in before being marked as inactive

router.use(authController.restrictTo('admin')); //All routes below are restricted to admins

router.route("/").get(userController.getAllUsers);

router
  .route("/:id")
  .get(userController.getAUser)
  .patch(userController.updateAUser)
  .delete(userController.deleteAUser)
  .post(userController.createAUser);

module.exports = router;
