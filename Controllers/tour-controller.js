//Contains functions that control tour req and res
const Tour = require("../Models/tour.model"); //import Tour model
const APIFeatures = require("../Utils/api-features");
const AppError = require("../Utils/app-error");
const factory = require("./handler-factory-for-tour-controller");

//Middleware to handle getting top 5 cheapest tours (cheapest of top 5 so ratingAverage,price)
//pre-fills/modifies url request string so that the client doesnt have to specifiy them in the request
const aliasTopTours = (req, res, next) => {
  req.query.limit = "5"; //Needs to be a string, show 1(default) page of 5 documents
  req.query.sort = "-ratingsAverage,price"; //sort by lowest rating to highest and then price
  req.query.fields = "name,price,ratingAverage,summary,difficulty"; //fields to return
  next();
};

//catch asynchronous errors in async functions, otherwise return the function - means we catch the error here and dont need to use try/catch blocks in every async function
const catchAsync = (fn) => {
  //Return the function or catch an error in it
  return (req, res, next) => {
    //fn is an async function/ so returns a promise/ so errors/promise rejections can be caught using .catch()
    fn(req, res, next).catch((err) => next(err)); //fn is an async function and thus returns a promise, so any error can be caught and passed into next(err), immediately firing the globalErrorHandler
  };
};

//ALL OF THESE FUNCTIONS ARE ASYNC BECAUSE WE ARE DOING DATABASE OPERATIONS WHICH CAN TAKE SIGNIFICANT TIME TO COMPLETE

//req.params contains route parameters (in the path portion of the URL like tours/:id etc), and req.query contains the URL query parameters (after the ? in the URL).
const getAllTours = catchAsync(async (req, res, next) => {
  //console.log("Requested at:", req.requestTime); //get the time the request was made (this property is added to the req object by the middleware in app.js)
  // console.log("req.query: ", req.query); //logs the full query string on this request

  //EXECUTE QUERY
  const features = new APIFeatures(Tour.find(), req.query) //Create new object of APIFeatures class and pass in query object and query string(req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const tours = await features.query; //await result of the query

  //MondoDB find function to return all documents in the Tour collection (returns a promise(an object inferring that data will be received at some point in the future) so needs to be async to wait for it to resolve)
  /*  const tours = await Tour.find()//Another way to filter tours
      .where("duration")
      .equals(5)
      .where("difficulty")
      .equals("easy");*/

  //SEND RESPONSE
  res.status(200).json({
    //send in Jsend data specification/format
    status: "success",
    requestedAt: req.requestTime,
    results: tours.length, //Send number of tours that there are (since tours is an array)
    data: {
      tours: tours, //if key and value have the same name you can just put it as tours once
    },
  });
});

//Url variables are stored in req.params (id etc)
const getATour = catchAsync(async (req, res, next) => {
  //findById is equal to the mongo command Tour.findOne({_id: req.params.id})
  const tour = await Tour.findById(req.params.id, (error) => {
    //await recieves resolved or rejected promise so needs to be async so that it doesn't block
    if (error) {
      //if the id is wrong then the promise resolves but returns an empty array so need this extra level of error checking
      //If no tour with a given id is found, return function immediately so we don't move onto the next line and send both an error and a success response
      return next(new AppError("No tour found with that ID", 404)); //Calling next() with an error immediately calls the error handling middleware
    }
  }).populate("reviews"); //Populate the tour object with its related reviews

  res.status(200).json({
    status: "success",
    data: {
      tour,
    },
  });
});

//if no errors are caught then fn(req, res, next) is called (in this case async(req,res,next in the create new tour function)) and thus the response is sent
//Request object holds all information about the request (i.e info sent from client to be posted to database)
//body is available on the request because of the express.json() middleware
//Async function so it is non-blocking.-These functions are callbacks from when the route is originally hit in the app.js file- DONT BLOCK THE EVENT LOOP!
const createNewTour = catchAsync(async (req, res, next) => {
  //catchAsync takes this entire function and returns it if there are no errors
  const newTour = await Tour.create(req.body); //new tour data comes from the request body (create() is similar to save())

  res.status(201).json({
    status: "success",
    data: {
      tour: newTour,
    },
  });
});

//factory functions are only for logged in administrators
//patch
const updateATour = factory.updateOne(Tour);

//This route now uses the generic factory function
const deleteATour = factory.deleteOne(Tour);
/*
const deleteATour = catchAsync(async (req, res, next) => {
  await Tour.findByIdAndDelete(req.params.id, req.body, (error) => {
    if (error) {
      return next(new AppError("No tour found with that ID", 404)); //Calling next() with an error immediately calls the error handling middleware
    }
  });

  res.status(204).json({
    //204 means "no content" - because no data is sent back to client
    status: "success",
    data: null,
  });
});*/

// /tours-distance/:distance/center/:latlong/unit/:unit
// /tours-distance/233/center/-40,45/unit/mi - params in the url
const getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlong, unit } = req.params;
  const [latitude, longitude] = latlong.split(","); //Split lat and long at the comma and store each value in lattitude and longitude

  //get radius of the earth for miles and kilometers
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!latitude || !longitude) {
    next(
      new AppError(
        "Please provide lattitude and longitude in the format lat,lng"
      )
    );
  }

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[longitude, latitude], radius] } },
  });

  res.status(200).json({
    status: "success",
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

//mongodB data aggregation - a pipeline all documents from a collection go through to be processed in order to transform them into aggregated results (for example to calculate averages, min/max values etc)

//Calculate the distance from a given point to all tours in the collection using aggregation
const getDistances = catchAsync(async (req, res, next) => {
  const { latlong, unit } = req.params;
  const [latitude, longitude] = latlong.split(","); //Split lat and long at the comma and store each value in lattitude and longitude

  const mulitplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!latitude || !longitude) {
    next(
      new AppError(
        "Please provide lattitude and longitude in the format lat,lng"
      )
    );
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: { //Point to calculate distance to a tour from
          type: 'Point',
          coordinates: [longitude * 1, latitude * 1]
        },
        distanceField: 'distance', //Field that is created where all calculated distances are stored
        distanceMultiplier: mulitplier //Convert between miles and km
      }
    },
    {
      $project: {
        distance: 1,
        name: 1
      }
    }
  ]);

  res.status(200).json({
    status: "success",
    data: {
      data: distances,
    },
  });
});

const getTourStats = catchAsync(async (req, res, next) => {
  //each element in the array is a stage each document goes through in sequence
  //using tour model to access tour collection, await resolved promise/results
  const stats = await Tour.aggregate([
    //without await the response is sent before the data is ready
    {
      $match: { ratingAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        //calculate averages of the tours
        _id: "$difficulty", //gets individual stats for tours based on difficulty level
        //_id: "$ratingAverage", //get stats based on average rating
        num: { $sum: 1 }, //Count num of tours (add 1 to num counter for each document that goes through this pipeline)
        numRatings: { $sum: "$ratingsQuantity" },
        avgRating: { $avg: "$ratingAverage" },
        avgPrice: { $avg: "$price" },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" },
      },
    },
    {
      $sort: { avgPrice: 1 }, //sort by average price
    },
    //{ //Can re-use methods after data has been formatted/grouped as above^
    //  $match: { _id: { $ne: 'easy' } }//All documents that arent easy
    //}
  ]);

  res.status(200).json({
    status: "success",
    data: { stats },
  });
});

//mongodB data aggregation to get monthly data
const getMonthlyPlan = catchAsync(async (req, res, next) => {
  const { year } = req.params;
  const yearParam = year * 1; //*1 to turn string to number
  const plan = await Tour.aggregate([
    {
      $unwind: "$startDates", //Output one document for each element of the array (one tour for each date in the array)
    },
    {
      $match: {
        startDates: {
          //Make sure tours that are send have start dates that are only in 2021
          $gte: new Date(`${yearParam}-01-01`), //Date should be greater than or equal to jan 1st 2021
          $lte: new Date(`${yearParam}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: "$startDates" }, //group by the month
        numTourStarts: { $sum: 1 }, //number of times the tour starts in 2021
        tours: { $push: "$name" }, //push name of tour into an array
      },
    },
    {
      $addFields: { month: "$_id" }, //
    },
    {
      $sort: { numTourStarts: 1 }, //sort by number of times a tour starts in a year in ascending order
    },
    {
      $limit: 6, //Only allow 6 documents in response
    },
  ]);

  res.status(200).json({
    message: "success",
    data: plan,
  });
});

module.exports = {
  getAllTours,
  getATour,
  createNewTour,
  updateATour,
  deleteATour,
  aliasTopTours,
  getTourStats,
  getMonthlyPlan,
  getToursWithin,
  getDistances
};

//Old way of doing async function error catching with try/catch blocks
/*
//patch
const updateATour = async (req, res) => {
  try {
    const tour = await Tour.findOneAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true, //Re-run validators in schema to check all new data fits with the schema
    }); //true returns updated document rather than original one

    res.status(200).json({
      status: "success",
      data: {
        tour: tour,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "failed",
      message: "Invalid data sent!",
    });
  }
};

const deleteATour = async (req, res) => {
  try {
    await Tour.findByIdAndDelete(req.params.id, req.body);

    res.status(204).json({
      //204 means "no content" - because no data is sent back to client
      status: "success",
      data: null,
    });
  } catch (error) {
    res.status(400).json({
      status: "failed",
      message: "Invalid data sent!",
    });
  }
};*/
