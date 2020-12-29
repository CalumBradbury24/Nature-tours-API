const AppError = require("../Utils/app-error");

const sendErrorToDev = (error, res) => {
  //In development we want as many error details as possible
  res.status(error.statusCode).json({
    status: error.status,
    message: error.message,
    stack: error.stack,
    error: error,
  });
};

const sendErrorToClient = (error, res) => {
  //In production we only want to send the client a little bit of error info

  if (error.isOperational) {
    //If the error is one created in the code
    res.status(error.statusCode).json({
      status: error.status,
      message: error.message,
    });
  } else {
    //Other unforeseen/unknown errors, don't leak error details
    res.status(error.statusCode).json({
      status: "error",
      message: "Something went wrong!",
    });
  }
};

//Convert wierd mongoose error into an operational error with readable error message
const handleCastErrorDB = (error) => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return new AppError(message, 400); //400 is bad request
};

const handleDuplicateFieldsDB = (error) => {
  const message = `Duplicate field value: ${error.keyValue.name}. Please use another value.`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (error) => {
  const errors = Object.values(error.errors).map((element) => element.message); //Iterate over errors object and return the error message
  const message = `Invalid input data. ${errors.join(". ")}`; //Join all messages in errors array into a string seperated by '.'
  return new AppError(message, 400);
};

//Logging in again will provide a new valid jwt to client
const handleJWTError = () => new AppError("Invalid token. Please log in again", 401);

const handleJWTExpiredError = () => new AppError('Your token has expired, please log in again!', 401);

//with these four arguments express automatically registers this middleware as an error handling middleware
const globalErrorHandler = (error, req, res, next) => {
  error.statusCode = error.statusCode || 500; //Default error code is 500 if error code is not given or undefined
  error.status = error.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorToDev(error, res);
  } else if (process.env.NODE_ENV === "production") {
    let err = { ...error };
    if (err.name === "CastError") {
      err = handleCastErrorDB(err); //Send this type of error and make it operational
    }
    if (err.code === 11000) err = handleDuplicateFieldsDB(err);
    if (err.name === "ValidationError") err = handleValidationErrorDB(err);
    if (err.name === "JsonWebTokenError") err = handleJWTError();
    if (err.name === 'TokenExpiredError') err = handleJWTExpiredError();

    sendErrorToClient(err, res);
  }

  next();
};

module.exports = globalErrorHandler;
