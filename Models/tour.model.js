const mongoose = require("mongoose");
const slugify = require("slugify");
const User = require("./user.model");
//const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "error! name field missing"], //Syntax for specifying an error if name is missing
      unique: true, //Dont allow duplicate names for tours
      trim: true, //Only works for strings, removes whitespace at beginning and end of strings
      maxlength: [40, "A tour name must have less than 41 characters"], //max length a string can have
      minlength: [10, "A tour name must have more than 9 characters"],
      // validate: [validator.isAlpha, 'Tour name must only contain characters'] //check character are alphanumeric
    },
    slug: String, //a given name becomes a-given-name
    duration: {
      //in days
      type: Number,
      required: [true, "error! tour duration field missing"], //Syntax for specifying an error if name is missing
    },
    maxGroupSize: {
      type: Number,
      required: [true, "A tour must have a max group size"], //Syntax for specifying an error that is returned in response if name is missing
    },
    difficulty: {
      type: String,
      required: [true, "error! A tour must have a difficulty"],
      enum: {
        values: ["easy", "medium", "difficult"], //An array of the values that are allowed for this string
        message: "Difficulty must be either: easy, medium or difficult",
      },
    },
    ratingAverage: {
      type: Number,
      default: 4.5,
      min: [1, "Minimum rating must be 1.0 or above"], //Minimum value a number can be
      max: [5, "Ratings cannot be greater than 5.0"],
      set: (value) => Math.round(value * 10) / 10, //Round up average ratings
    },
    ratingQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: true,
    },
    priceDiscount: {
      type: Number,
      validate: {
        message: "Discount price ({VALUE}) should be lower than current price", //VALUE is value that was inputted (same as inputPriceValue in validator function)
        validator: function (inputPriceValue) {
          //'this' Only points to/works on new document, doesn't work when updating a currently existing document
          //custom validation function
          return inputPriceValue < this.price; //Returns true if the discount is lower than the current price of this tour (otherwise returns a validation error)
        },
      },
    },
    summary: {
      type: String,
      trim: true, //Only works for strings, removes whitespace at beggining and end of strings
      required: [true, "A tour must have a description"],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      //Name of the image is stored in the database (images themselves are better left in the filesystem)
      type: String,
      required: true,
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false, //Don't send this field to the client
    },
    startDates: [Date], //Array of dates that a given tour starts (i.e in Jan, March and June)
    secretTour: {
      //Tours reserved to only be shown to VIPs
      type: Boolean,
      default: false,
    },
    startLocation: {
      //Start location of a tour
      //GeoJSON is used to specify geo-spatial data
      type: {
        type: String,
        default: "Point", //Default geometry is point
        enum: ["Point"], // type field can only be Point
      },
      coordinates: [Number], //An array of numbers representing coordinates of the point with longitude, lattitude;
      address: String,
      description: String,
    },
    locations: [
      // This is an embedded document
      {
        type: {
          type: String,
          default: "Point",
          enum: ["Point"],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    //guides: Array, //Embed user document into this tour document - when new tour document is created user adds array of user ids
    guides: [
      //Referencing the User collection in the Tour model - guides is an array of user IDs
      {
        type: mongoose.Schema.ObjectId, //The type of element in the guides arrary is a mongodB ID
        ref: "User",
      },
    ],
  },
  {
    toJSON: { virtuals: true }, //Whenever the data is outputted in JSON format include the virtual fields in the output
    toObject: { virtuals: true },
  }
);

tourSchema.index({ startLocation: '2dsphere' }); //Tell mongodB that the start location for geospatial data should be indexed to a 2D sphere

//Virtual properties are fields that can be defined on the schema but won't be saved in the database in order to save space there
//These properties can't be used in query's because these properties are not stored in the database
//Can do this conversion in the controller after recieving the data, but this is not best practice
tourSchema.virtual("durationWeeks").get(function () {
  //Needs to be a regular function as arrow functions dont get access to 'this' keyword ('this' is the current document being worked on)
  return this.duration / 7; //duration in days / 7 to get in weeks
});

//Virtual populate this document with a reviews field of relevant reviews
tourSchema.virtual("reviews", {
  ref: "Review", //Name of model
  foreignField: "tour", //Name of field in review model were the reference to the current model is stored
  localField: "_id", //Where id is stored in this current tour model
});

//DOCUMENT MIDDLEWARE - runs before the .save() and .create() commands (also known as a pre-save hook)
//Can have document middleware that runs before or after a certain event (e.g save(), create() etc)
tourSchema.pre("save", function (next) {
  //'this' points to document currently being saved
  this.slug = slugify(this.name, { lower: true }); // add a slugified name property to the newly saved document
  next(); //Call next middleware in the stack
});

/*
//Retrieve user documents based on user ids from user collection - embedding user info into this tour model
tourSchema.pre("save", async function (next) {
  const guidesPromise = this.guides.map(async (id) => await User.findById(id)); //guidesPromise is an array of promises from the map function
  this.guides = await Promise.all(guidesPromise); //Get the resolved promises
  next();
});

/* dont need these
tourSchema.pre("save", (next) => {
  console.log("will save document");
  next(); //without calling the next middleware function we will get stuck in this middleware
});

//Callback function called after document finishes saving
tourSchema.post("save", (newlySavedDocument, next) => {
  console.log("saved document is: ", newlySavedDocument);
  next();
});
*/

//QUERY MIDDLEWARE - allows us to run functions (find(), sort() etc) before or after a given query is executed
//tourSchema.pre("find", function(next) { //Before find() function runs on a query
tourSchema.pre(/^find/, function (next) {
  //Using regex to execute this middleware before all query functions that begin with 'find' (this covers find(), findOne(), findByID() etc) - stops any secretTours being sent to client
  this.find({ secretTour: { $ne: true } }); //filter out all tours that have a secretTour property that is set to true (not equal to true)
  this.start = Date.now();
  next();
});

//.this always points to current query
tourSchema.pre(/^find/, function (next) {
  this.populate({ path: "guides", select: "-__v -passwordChangedAt" }); //don't select/show these fields in response
  next();
});

//After all documents have been returned from a find query
// /^find/ = all queries that start with 'find'
tourSchema.post(/^find/, (thisDocument, next) => {
  console.log(`${Date.now() - this.start} milliseconds`); //time how long a find query took to finish executing
  // console.log(thisDocument);
  next();
});

// AGGREGATION MIDDLEWARE - Could be done in the aggregate functions but this would cause repeated code in each function
//Remove all secret tours before aggregating results
/* - caused an error as geoNear is only valid as the first stage in the pipeline, but with this middleware using a function, it became the second stage
tourSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } }); //unshift() adds element to start of the pipeline array
  next();
}); //using aggregate hook
*/
const Tour = mongoose.model("Tour", tourSchema); //Name of model, model schema
module.exports = Tour;
