//Script to read tours data from file and put it into the database
//process.argv is an array of command-line arguments that are passed in when node is launched.
//The first element process.argv[0] = path to node executable
//Second element process.argv[1] = path to the JavaScript file being executed
//Reemaining elements are any additional command line arguments
//So to execute deleteAllData function in this script do -> node dev-data/data/import-dev-data --delete
require("dotenv").config({ path: "./config.env" }); //Get env variables before app
const mongoose = require("mongoose");
const fs = require("fs");
const Tour = require("../../Models/tour.model");
const Review = require("../../Models/review.model");
const User = require("../../Models/user.model");

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
  .then(() => console.log("DB connection succesful"));

//READ JSON file
const tours = JSON.parse(
  //Parse JSON object into javascript object
  fs.readFileSync(`${__dirname}/tours.json`, "utf-8")
);
const users = JSON.parse(
  //Parse JSON object into javascript object
  fs.readFileSync(`${__dirname}/users.json`, "utf-8")
);
const reviews = JSON.parse(
  //Parse JSON object into javascript object
  fs.readFileSync(`${__dirname}/reviews.json`, "utf-8")
);

//IMPORT DATA INTO DB
const importData = async () => {
  try {
    await Tour.create(tours); //mongodB creates a new document for each element in the array
    await User.create(users, { validateBeforeSave: false }); //Turn off validation so dont need to confirm password for each new user
    await Review.create(reviews); //mongodB creates a new document for each element in the array
    console.log("data sucessfully loaded");
  } catch (error) {
    console.log(error);
  }
  process.exit();//Kill the application
};

//DELETE ALL DATA FROM COLLECTION
const deleteAllData = async () => {
  try {
    await Tour.deleteMany(); //Delete all documents in the collection
    await Review.deleteMany(); //Delete all documents in the collection
    await User.deleteMany(); //Delete all documents in the collection
    console.log("All data in collection deleted");
  } catch (error) {
    console.log(error);
  }
  process.exit();//Kill the application
};

if (process.argv[2] === "--import") {
  importData();
}
if (process.argv[2] === "--delete") {
  deleteAllData();
}

console.log(process.argv);
