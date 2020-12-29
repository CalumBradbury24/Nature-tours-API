const Tour = require("../Models/tour.model");
//const AppError = require('./')

const catchAsyncErrors = (func) => {
  return (req, res, next) => {
    func(req, res, next).catch((error) => next(error)); //catch async errors and call next with error to go straight into error handling middleware
  };
};

const getOverview = catchAsyncErrors(async (req, res, next) => {
  //1) Get all tour data from collection
  const tours = await Tour.find();

  //2) Build template
  //3 Render that template using tour data from step 1
  res.status(200).render("overview", {
    title: "All Tours",
    tours, //tours: tours
  });
});

//Get a single tour with its details when user clicks on a tour from overview page
const getATour = catchAsyncErrors(async (req, res, next) => {
  //Can't find by id as we do not know the id of the tour on this route
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    //Find a tour by its slug as this is in the url params
    path: "reviews",
    fields: "review rating user",
  });

  res
    .status(200)
    .render("tour", {
      //Render the tour page with the tour that was found
      title: tour.name, //These variables are local in the base pug file
      tour,
    });
});

const getLoginForm = (req, res) => {
  res
    .status(200)
    .set(
      "Content-Security-Policy",
      "script-src 'self' https://cdnjs.cloudflare.com/ajax/libs/axios/0.21.1/axios.min.js 'unsafe-inline' 'unsafe-eval';"
    )
    .render("login-form", {
      title: "Log into your account",
    });
};

module.exports = {
  getOverview,
  getATour,
  getLoginForm,
};
