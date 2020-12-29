const mongoose = require("mongoose");
const Tour = require("./tour.model");

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, "Review missing!"],
      maxlength: [200, "Exceeded character limit!"],
    },
    rating: {
      type: Number,
      required: [true, "Rating missing!"],
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      //References to the tour and user that is related to this review
      type: mongoose.Schema.ObjectId, //The type of element in the tour arrary is a mongodB ID (this is where the id of the tour is being stored)
      ref: "Tour",
      required: [true, "Review must belong to a tour"],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      user: "User",
      required: [true, "Review must belong to a user"],
    },
  },
  {
    toJSON: { virtuals: true }, //Whenever the data is outputted in JSON format include the virtual fields in the output
    toObject: { virtuals: true },
  }
);

//A tour can only be reviewed once by a user
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

//Populate all queries that begin with find() with tour and user information
reviewSchema.pre(/^find/, function (next) {
  this
    //.populate({ //Commented because it created an inefficient chain of populated arrays on this document
    //  path: "tour",
    //  select: "name",
    //})
    .populate({
      path: "user",
      select: "name photo",
    });
  next();
});

//Static method for tour statistics because we need to call aggregate function on the model
//Aggregation pipeline to get average ratings of a tour - this function is available on the model
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    //Aggregate() is always called on the model
    {
      $match: { tour: tourId }, //Select all reviews that match current tourId
    },
    {
      $group: {
        //Group all tours together by tour id
        _id: "$tour",
        nRating: { $sum: 1 }, //Add up total number of ratings on this tour
        avgRating: { $avg: "$rating" },
      },
    },
  ]);
  //console.log(stats);
  if (stats.length > 0) { //If there are some reviews
    await Tour.findByIdAndUpdate(tourId, {
      //Save the calculated statistics to the current tour (adds them to the document in the database)
      ratingQuantity: stats[0].nRating,
      ratingAverage: stats[0].avgRating,
    });
  } else { //If there are no reviews reset average and quantity back to default values
    await Tour.findByIdAndUpdate(tourId, {
      //Save the calculated statistics to the current tour (adds them to the document in the database)
      ratingQuantity: 0,
      ratingAverage: 4.5,
    });
  }
};

//Post middleware doesn't get access to next (only pre does)
reviewSchema.post("save", function () {
  //this is document currently being saved
  this.constructor.calcAverageRatings(this.tour); //Need to use this.constructor as the Review object is not yet built until after this functions execution
});

//Calculating review stats after a review has been updated or deleted
//pre middleware for findOneAndUpdate and findOneAndUpdate hooks
//needs to be pre so we can get access to the ^queries, if it was post then the queries would have already been executed
reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.rev = await this.findOne(); //Get this document from the database and store it on this object
  next(); //go to the post middleware
});

reviewSchema.post(/^findOneAnd/, async function () {
  // await this.findOne(); //Does not work here - the query has already been executed!
  await this.r.constructor.calcAverageRatings(this.rev.tour);
});

const Review = mongoose.model("Review", reviewSchema);
module.exports = Review;

//POST /tour/:tourid/reviews
//GET /tour/:tourid/reviews
//GET /tour/:tourid/reviews/reviewid
