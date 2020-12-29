//Handler factory for creating a function that returns a function for every model in the application (I have only written it for deleteOne so i can keep other route handlers in the old format for reference)
//factory functions are only for logged in administrators
const AppError = require("../Utils/app-error");

const catchAsync = (func) => {
  return (req, res, next) => func(req, res, next).catch((error) => next(error));
};

//Generic function that takes a model and returns a generic handler function
//Using a closure means that the inner function gets access to the variables of the outer function
//This can be used for deleting one tour, one review, one user etc
exports.deleteOne = (Model) => catchAsync(async (req, res, next) => {
  await Model.findByIdAndDelete(req.params.id, req.body, (error) => {
    if (error) {
      return next(new AppError("No document found with that ID", 404)); //Calling next() with an error immediately calls the error handling middleware
    }
  });

  res.status(204).json({
    //204 means "no content" - because no data is sent back to client
    status: "success",
    data: null,
  });
});

exports.updateOne = (Model) => catchAsync(async (req, res, next) => {
  const document = await Model.findOneAndUpdate(req.params.id, req.body,
    {
      new: true, //true returns updated document rather than original one
      runValidators: true, //Re-run validators in schema to check all new data fits with the schema
    },
    (error) => {
    //If the promise resolves but data is an empty array from bad id
      if (error) {
        //If no tour with a given id is found, return function immediately so we don't move onto the next line and send both an error and a success response
        return next(new AppError("No document found with that ID", 404)); //Calling next() with an error immediately calls the error handling middleware
      }
    });

  res.status(200).json({
    status: "success",
    data: {
      data: document,
    },
  });
});

exports.createOne = (Model) => catchAsync(async (req, res, next) => {
  const newDocument = await Model.create(req.body);
  //res.json sets the response content type to application/json. res.send sets it to text/html
  //201 = new resource created
  res.status(201).json({
    status: "success",
    data: {
      data: newDocument,
    },
  });
});
