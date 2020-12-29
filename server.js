require("dotenv").config({ path: "./config.env" }); //Get env variables before app loads
const mongoose = require("mongoose");

//HANDLE UNCAUGHT EXCEPTIONS -synchronous errors such as console.log(undefinedVariable) - at top of code so that all errors that come after are caught (otherwise errors before this will be missed/uncaught!)
//Listen to uncaughtException event
process.on("uncaughtException", (error) => {
  console.log("UNCAUGHT EXCEPTION!..server closing down.");
  console.log(error.name, error.message); //Catch and log the error name and message
  process.exit(1);
});

//console.log(x) //Uncaught exception

const app = require("./app"); //Use the app for this server

const DB = process.env.DATABASE_URI.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
); //replace password in database env

mongoose //Connect to mongodB database
  .connect(DB, {
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    useNewUrlParser: true,
  })
  .then(() => console.log("DB connection successful"));

//start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, (error) => {
  if (error) throw error;
  //console.log(process.env)//see which environment we are in
  console.log(`server listening on port ${PORT}`);
});

//HANDLE UNHANDLED PROMISE REJECTIONS/asynchronous errors - Deal with unhandled promise rejections such as a failure to connect to the database etc
//subscribe to the unhandledRejection event listener
process.on("unhandledRejection", (error) => {
  console.log("UNHANDLED REJECTION!..server closing down.");
  console.log(error.name, error.message); //Catch and log the error name and message
  server.close(() => {
    //Server.close gives the server time to finish all the requests that are still processing/pending before closing
    process.exit(1); //Kill server with error code 1(uncaught exception)
  });
});

