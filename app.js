const express = require("express");
const app = express(); //express methods added to app
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const path = require("path"); //Built innode module for mnipulating path names
const cors = require('cors');
const cookieParser = require('cookie-parser');

const tourRouter = require("./Routes/tour-routes");
const userRouter = require("./Routes/user-routes");
const reviewRouter = require("./Routes/review-routes");
const viewRouter = require('./Routes/view-routes');
const AppError = require("./Utils/app-error");
const globalErrorHandler = require("./Controllers/error-controller");

app.set("view engine", "pug"); //pug is automatically contained in node, doesn't need to be installed
app.set("views", path.join(__dirname, "Views")); //Path received from somewhere might have a / but might not so using this allows node to create the correct path

//1 GLOBAL MIDDLEWARES
//Always put middleware near the top so that it is on the stack before functions that need it are used (otherwise it wont be used by those functions)
//middleware sits in between (or in the middle of) the request coming in and the response being sent (acts on the data before sending it in the response)
console.log("Current environment is:", process.env.NODE_ENV); //- log environment

//Allows serving the static html in Public folder, all static assets are always served from the Public folder (i.e css in pug templates etc)
app.use(express.static(path.join(__dirname, "Public"))); // localhost:3000/overview.html for example

// Set some security HTTP headers
app.use(helmet());

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
})); //Allow cross origin resource sharing

//Development logging
if (process.env.NODE_ENV === "development") {
  //USE THESE MIDDLEWARES DURING PRODUCTION ONLY
  app.use(morgan("dev")); //Logs the incoming request method and route, response code, time it took to send back the response and size of the response in bytes
}

//Rate-limiting middleware to count number of requests from an IP address and block these requests when too many have been received
//Helps protect against DOS and brute force attacks
const limiter = rateLimit({
  max: 100, //Max number of requests allowed from an IP address in a given time window
  windowMs: 60 * 60 * 1000, //1 hour
  message: "Too many requests from this IP, please try again in an hour!",
});
//The rate-limit and rate-limit-remaining are sent in respoonse headers
app.use("/api", limiter); //Apply this rate-limit to all routes on the /api/ route

// Body-parser, reading data from body into req.body
app.use(express.json({ limit: "10kb" })); //Middleware that allows for parsing json, only allow parsing req bodies of 10kb size or smaller - helps against Dos attacks
app.use(cookieParser()); //Parses data from cookies

//Data sanitisation against NOSQL query injection
app.use(mongoSanitize()); //Prevent NOSQL query injection attacks by removing $ in querys

//Data sanitisation against cross-site scripting attacks(XSS)
app.use(xss());

//Prevent parameter pollution - clears up query string with duplicate properties, for example: {{URL}}api/v1/tours?sort=price&sort=duration (will select the last sort and ignore the first one)
app.use(
  hpp({
    whitelist: [
      //Array of properties that are allowed to be duplicated in the query string
      "duration",
      "ratingsQuantity",
      "ratingsAverage",
      "maxGroupSize",
      "difficulty",
      "price",
    ],
  })
);

//This middleware allows the event handler to see exactly when a request happens!
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString(); //At the request time to the request
  console.log(req.cookies);
  // console.log(req.headers); //Get headers in the request
  next(); //Call next middleware in the stack
});

//2) ROUTES
//RENDERING PUG TEMPLATES
app.use("/", viewRouter);

//API ROUTES
//Including a version (v1) allows you to make changes to the api without causing issues for others still using the old version
app.use("/api/v1/tours", tourRouter); //Mounting tourRouter middleware for this specific route
app.use("/api/v1/users", userRouter); //Apply userRouter middleware to this route
app.use("/api/v1/reviews", reviewRouter);

//Middleware to catch all routes that aren't handled by above routers, app.all() is all methods (get, post, patch, delete etc)
//This middleware is at the bottom so that it is only loaded if no other valid route has been found/matched
app.all("*", (req, res, next) => {
  /* const error = new Error(`Can't find ${req.originalUrl} on this server!`); //req.originalUrl is the url that was sent in the request
  error.status = 'failed';
  error.statusCode = 404;*/
  //creates an error object and then goes straight to error handling middleware
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404)); //If next() has an argument, express knows/assumes it is an error (any next arguments are errors). Then all other middleware is skipped and the error is sent to the global error middleware which will be executed
}); //* means all routes

//Use error handling middleware - this is where next(Error) goes to!
app.use(globalErrorHandler);

module.exports = app; //export to server file
