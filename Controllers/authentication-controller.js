//Authentication routes and middlewares

const crypto = require("crypto");
const { promisify } = require("util"); //Node built in function that contains the promisify method to make a method return a promise, thus can use async/await
const jwt = require("jsonwebtoken");
const User = require("../Models/user.model");
const AppError = require("../Utils/app-error");
const sendEmail = require("../Utils/email");

//Authentication with jwt
//1)User logs in with email/password with POST request
//2)If user and password are valid, server sends back to client a newly created jwt
//3)User can then access protected routes with valid jwt token in the header e.g GET /someProtectedRoute (in postman i have put the jwt that is received when signing in into the header automatically)
//4)If jwt in header of request is valid, server sends back protected data to client

//Must catch errors/rejections in promises

//Generate a json web token
const signToken = (id) => {
  //arguments- users id, Secret for encrypting the signiture, object of options
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  }); //Create a jwt out of the user id and the secret
};

//Function for creating and sending a jwt token
const createAndSendJWTToken = (user, statusCode, res) => {
  const jwToken = signToken(user._id);

  //Can see this in the cookie tab in postman
  const cookieOptions = {
    //set config options for jwt cookie
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ), //Convert to milliseconds
    //secure: true, //Send on encrypted connection (using HTTPS), - only want this when in production
    httpOnly: true, //Cookie cannot be accessed or modified in any way by the browser
  };

  //Send JWT as a cookie - A cookie is a small piece of text that a server can send to clients,
  //when the client's browser receives the cookie it will automatically be stored and sent back in all future requests to the server it came from
  if (process.env.NODE_ENV === "production") cookieOptions.secure = true; //When in production set secure=true, in dev just send expiry date and http config
  res.cookie("jwt", jwToken, cookieOptions);

  //Remove password from the response output
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    jwToken, //Give the user a new jwt so that they are allowed access to protected routes
    data: {
      user: user,
    },
  });
};

//Catch errors in async functions
const catchAsync = (func) => {
  return (req, res, next) => func(req, res, next).catch((error) => next(error));
};

//Route for authenticating and adding new users
const signup = catchAsync(async (req, res, next) => {
  const {
    name,
    email,
    password,
    passwordConfirm,
    passwordChangedAt,
    role,
  } = req.body;

  const newUser = await User.create({
    //Only send data that we need, not entire request body
    name: name,
    email: email,
    password: password,
    passwordConfirm: passwordConfirm,
    passwordChangedAt: passwordChangedAt,
    role: role,
  }); //Create new user with the data in the body of the request - can use User.save() aswell

  createAndSendJWTToken(newUser, 201, res);
});

//logging a user in consists of signing a jwt and sending it back to the client if the user actually exists and the password is correct
const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1) Check if email and password exist
  if (!email || !password) {
    //Return so that we end this function and go straight to the middleware
    return next(new AppError("Please provide email and password"), 400); //400- bad request
  }
  //2) Check if user exists && password is correct
  //Select allows for selection of specific fields in a document
  //Find the user using the email in the request body
  const user = await User.findOne({ email: email }).select("+password"); //Can be abbreviated to just 'email' since they are named the same (password is not included because of the model so need to specifically select it)

  //Call instance method from model to compare hashed userPassword in database to unhashed password in req.body (one use entered to log in)
  if (!user || !(await user.correctPassword(password, user.password))) {
    next(new AppError("Incorrect email or password"), 401); //Never specify which term was incorrect -401: unauthorised
  }

  //3) If everything is okay, send jwt back to client
  createAndSendJWTToken(user, 200, res);
});

const protect = catchAsync(async (req, res, next) => {
  // 1) Getting jwt token and check it exists

  let token;
  //If the authorization header exists in the request and it starts with 'Bearer'
  //Can use startsWith() as req.headers.authorization is a string
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1]; //Split string into array at the ' ' and get the token element. [0] = Bearer
  } else if (req.cookies.jwt) {
    //If the jwt is sent as a cookie
    token = req.cookies.jwt;
  }

  //If there is no token then the user hasn't logged in and received one
  if (!token) {
    return next(new AppError("You are not logged in.", 401)); //401 - unauthorized
  }

  //2) validate jwt token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET); //Promisify makes jwt.verify return a promise which can be awaited (rather than having to use a callback function as the third argument)

  //3) Check if user still exists
  //If user has been deleted but the jwt still exists, we don't want to log the user in!
  //Or if the user has changed his password after the jwt has been issued, the old token should no longer be valid!
  //Check user still exists
  const freshUser = await User.findById(decoded.id);

  if (!freshUser) {
    return next(
      new Error("The user belonging to this token no longer exists"),
      401
    );
  }

  //4) Check if user changed password after the jwt was issued
  if (freshUser.changedPasswordAfterJWTSent(decoded.iat)) {
    //iat = issued at
    return next(
      new AppError("User recently changed password! Please log in again", 401)
    );
  }

  //GRANT ACCESS TO PROTECTED ROUTE
  //If user has valid jwt token then go to next middleware (the desired route function to return requested data)
  req.user = freshUser; //Store current user in req.user so that we can check if user is restricted later on
  next();
});

//Only for rendered pages, no errors!
const isLoggedIn = catchAsync(async (req, res, next) => {
  if (req.cookies.jwt) {
    // 1) Verify jwt
    const decoded = await promisify(jwt.verify)(
      req.cookies.jwt,
      process.env.JWT_SECRET
    ); //Promisify makes jwt.verify return a promise which can be awaited (rather than having to use a callback function as the third argument)

    //2) Check if user still exists
    //If user has been deleted but the jwt still exists, we don't want to log the user in!
    //Or if the user has changed his password after the jwt has been issued, the old token should no longer be valid!
    //Check user still exists
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      return next();
    }

    //4) Check if user changed password after the jwt was issued
    if (currentUser.changedPasswordAfterJWTSent(decoded.iat)) {
      return next();
    }

    //There is a user logged in
    res.locals.user = currentUser; //Inside all templates there is a variable called user
    return next();
  }
  next();
});

//By the time this middleware function runs, the current user has already been put on the request object
const restrictTo = (...roles) => {
  //...roles creates an array of all roles that are specified ['admin', 'lead-guide'], comes from the function call
  return (req, res, next) => {
    //has access to ...roles

    if (!roles.includes(req.user.role)) {
      //If the role of the current user is not in the ...roles array then user doesnt have permission to access the delete route
      return next(
        new AppError("you do not have permission to perform this action", 403)
      );
    }

    next();
  };
};

//Route for user to enter email for resetting their password
const forgotPassword = catchAsync(async (req, res, next) => {
  //1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email }); //Find the user in the database that has the POSTed email
  //console.log(user);
  if (!user) {
    //If no email in database matches this email then user = null so go to error handling middleware
    return next(new AppError("There is no user with that email address", 404));
  }

  //2) Generate a random reset token
  const resetToken = user.createPasswordResetToken(); //Have to call this method defined in the model on the user object
  //Save new reset token on this users document in the database
  await user.save({ validateBeforeSave: false }); //Dont't validate before saving so that we dont have to specify all the mandatory options from the schema like name, email etc

  //3) Send it to user's email
  //req.protocol is http or https - comes from the request
  const resetURL = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

  //catch errors that may occur in the sendEmail function//when trying to send an email etc
  try {
    //sendEmail is an asychronous function and so it needs to be awaited!
    await sendEmail({
      email: user.email,
      subject: `Your password reset token (valid for 10 minutes!)`,
      message, //same as message: message
    });

    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false }); //Don't validate before saving so that we dont have to specify all the mandatory options from the schema like name, email etc when saving

    return next(
      new AppError("There was an error sending the email, try again later", 500)
    );
  }
});

const resetPassword = catchAsync(async (req, res, next) => {
  //1) Get user based on the token
  const hashedToken = crypto //Hash users unhashed token in order to compare it to the hashed token in the database
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex"); //The users reset token is in the url they were sent in the email to reset their password

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }, //Make sure that the current date is not passed the token expiry date
  });
  // console.log(user);
  //2) If token has not expired, and the user is valid, set the new password
  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }

  user.password = req.body.password; //Set the users password to the new password in the request body
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetExpires = undefined; //Delete reset token and reset token expiry date
  user.passwordResetToken = undefined;
  await user.save(); //Want validator on to make sure password and password confirm at equal

  //3) Log the user in, send JWT
  createAndSendJWTToken(user, 200, res);
});

const updatePassword = catchAsync(async (req, res, next) => {
  //1) Get user from collection
  //The current user is on the request body from the protect middleware
  const user = await User.findById(req.user.id).select("+password"); //Password is not included because of schema and so has to be explicitly asked for to get in the user object

  //2) Check if POSTed password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError("Your current password is wrong", 401));
  }

  //3) Update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save(); //Validation is done by the validation function on the schema

  //4) Log user in
  createAndSendJWTToken(user, 200, res);
});

module.exports = {
  signup,
  login,
  protect,
  restrictTo,
  forgotPassword,
  resetPassword,
  updatePassword,
  isLoggedIn
};
