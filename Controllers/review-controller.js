const Review = require("../Models/review.model");
const factory = require("./handler-factory-for-tour-controller");

const catchAsynchronousErrors = (func) => {
  return (req, res, next) => func(req, res, next).catch((error) => next(error));
};

const getAllReviews = catchAsynchronousErrors(async (req, res, next) => {
  //If there is a tourId in the url (we are on tours/tourID/reviews route) then only search for tours with that id
  let filter = {};
  if (req.params.id) filter = { tour: req.params.tourId }; //Only get the tours with the id

  //Find all reviews
  const reviews = await Review.find(filter); //Find all reviews in database (if filter is an empty object)

  //send back in response
  res.status(200).json({
    status: "success",
    results: reviews.length,
    data: {
      reviews,
    },
  });
});

//Middleware for createAReview before creating a review
const setTourUserIds = (req, res, next) => {
  if (!req.body.tour) req.body.tour = req.params.tourId; //If tour id is not specified in the body then define it as the tour id in the url
  if (!req.body.user) req.body.user = req.user.id; //Req.user comes from the protect middleware
  next();
};

const createReview = factory.createOne(Review);

//Using generic factory function - administrator routes only
const deleteReview = factory.deleteOne(Review);
const updateReview = factory.updateOne(Review);

module.exports = {
  getAllReviews,
  createReview,
  deleteReview,
  updateReview,
  setTourUserIds
};
