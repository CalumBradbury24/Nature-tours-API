const express = require("express");
const router = express.Router(); //New express router for tours
const tourController = require("../Controllers/tour-controller");
const authController = require("../Controllers/authentication-controller");
const reviewRouter = require("./review-routes");

//Param middleware - only runs for certain parameters (i.e when there is an id in the url) - automatically validate the id before running the id route and sending a response
//router.param("id", tourController.checkID); //Only runs for tour routes with id's in the parameter

//Middleware to direct nested route
router.use("/:tourId/reviews", reviewRouter); //If this route is ever encountered, use the reviewRouter

//Allows for chaining end-points that use the same url
router
  .route("/top-5-cheap")
  .get(tourController.aliasTopTours, tourController.getAllTours); //aliasTopTours is middleware to modify req object/string before this route

router.route("/tour-stats").get(tourController.getTourStats);
router
  .route("/monthly-plan/:year")
  .get(
    authController.protect,
    authController.restrictTo("admin", "lead-guide", "guide"),
    tourController.getMonthlyPlan
  );

//Chain methods on the same route
router
  .route("/")
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo("admin", "lead-guide"),
    tourController.createNewTour
  );

//Route for getting all tours within a certain distance from a given location
//Could do it as either:
// /tours-distance?distance=233,center=-40,45,unit=mi - Query string
// /tours-distance/233/center/-40,45/unit/mi - params in the url
router.route('/tours-within/:distance/center/:latlong/unit/:unit').get(tourController.getToursWithin);
//Calculate the distance from a given point to all tours in the collection
router.route('/distances/:latlong/unit/:unit').get(tourController.getDistances);

//these end-points use the same url
router
  .route("/:id") //already at /api/v1/tours thanks to tourRouter
  .get(tourController.getATour)
  .patch(
    authController.protect,
    authController.restrictTo("admin", "lead-guide"),
    tourController.updateATour
  )
  .delete(
    //Two middleware work first before a tour is deleted
    authController.protect,
    authController.restrictTo("admin", "lead-guide"), //Only admins and lead-guides can delete tours
    tourController.deleteATour
  );

/*
//Nested routes to post reviews on the tour route
router
  .route("/:tourId/reviews")
  .post(
    authController.protect,
    authController.restrictTo("user"),
    reviewController.createReview
  );
*/
module.exports = router; //export the router
