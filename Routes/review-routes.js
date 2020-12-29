const express = require("express");
const authController = require("../Controllers/authentication-controller");
const reviewController = require("../Controllers/review-controller");
const router = express.Router({ mergeParams: true }); //Each router only has access to params in their specific routes, but we need access to tourId on POST /tour/:tourID/reviews route

//Protect all routes after this point as have to be logged in and authenticated to post a review etc
router.use(authController.protect);

router.route("/").get(reviewController.getAllReviews).post(
  authController.restrictTo("user"), //Only allow users to create a review
  reviewController.setTourUserIds, //Middleware
  reviewController.createReview
);

router.use(authController.restrictTo("user", "admin"));
router.route('/:id').delete(reviewController.deleteReview).patch(reviewController.updateReview);

module.exports = router;
