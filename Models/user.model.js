const crypto = require("crypto"); //Built in node module
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name required!"],
    unique: true, //Dont allow duplicate names for tours
    trim: true, //Only works for strings, removes whitespace at beggining and end of strings
  },
  email: {
    type: String,
    required: [true, "Email required!"],
    unique: true,
    lowercase: true, //transform email into lowercase
    validate: [validator.isEmail, "Please provide a valid email"], //Makes sure domains etc are valid
  },
  photo: String, //Path to photo in filesystem
  role: {
    type: String,
    enum: ["user", "guide", "lead-guide", "admin"], //Only allow specific roles using enum
    default: "user",
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: 8,
    select: false, //Don't send the password to the client in response body (for example in a get request for all users)!
  },
  passwordConfirm: {
    //For confirming the entered password is the same (when sigining up)
    type: String,
    required: [true, "Please provide a password"],
    minlength: 8,
    validate: {
      //THIS ONLY WORKS ON CREATE OR SAVE - need to use save() instead of something like findOneAndUpdate() when updating a password
      validator: function (element) {
        //validator function returns true or false
        return element === this.password; //Return true if the passwordConfirm value is equal to this objects password
      },
      message: "Passwords are not the same.",
    },
  },
  passwordChangedAt: Date, //Tracks when the users password was changed
  passwordResetToken: String,
  passwordResetExpires: Date, //Limit the time that a token can be used to reset a password
  active: {
    //Has user deactivated their account?
    type: Boolean,
    default: true,
    select: false, //Don't send this in response body
  },
});

//Runs between getting the data in the request and saving it to the database
//'this' is the current document
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    //isModified is a mongoose method
    return next(); //If the password hasn't been modified then move to the next middleware function in the stack
  }
  //If password was modified
  //This hashing function is asyncronous and so returns a promise, thus need to use await to get resolved promise
  this.password = await bcrypt.hash(this.password, 12); //The number is a cost parameter indicating how intensive the encryption process will be, the higher the value the more intensive/powerful the hashing is
  this.passwordConfirm = undefined; //Wipe confirmed password once it has been used as we no longer need it and it is a security risk if stored un-hased in the database
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next(); //isNew is a boolean flag specifying if the document is new

  this.passwordChangedAt = Date.now() - 1000; //Set the time the password was changed at to now (put it one second in the past to make sure the token isnt created first)
  next();
});

//Instance method - a method that is available on all documents of this User collection
//Returns true if passwords are the same, false if not
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  //Password user passes in the body when logging in and the user password in the database
  //this.password is not available because the password is not available in the output because of select:false^
  return await bcrypt.compare(candidatePassword, userPassword); //Compares the hashed userPassword in the database with the unhashed candidate password in the request body when a user tries to log in
};

//Check whether the user has changed their password after being sent a valid jwt
userSchema.methods.changedPasswordAfterJWTSent = function (JWTTimestamp) {
  //let changedTimeStamp;
  if (this.passwordChangedAt) {
    //If passwordChangedAt exists then the user has changed their password
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimeStamp; //If password changed after token sent return true
  }

  return false; //Not changed
};

//Instance method to create a random token for password reset
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex"); //token is a random 32-bit hexadecimal string
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex"); //Hash the reset token with sha256 encryption algorithm to store in database

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; //Reset token expiry time is current time + 10 minutes

  return resetToken; //Send the unencrypted email to the user
};

//QUERY MIDDLEWARE
//Run before all 'find' functions to only find documents that have the active property = true, so don't send inactive users back in response
//Using regex to execute this middleware before all query functions that begin with 'find' (this covers find(), findOne(), findByID() etc)
userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } }); //Return all documents that aren't equal to false. Thus any find() functions will not find inactive users/documents
  next();
});

const User = mongoose.model("User", userSchema);
module.exports = User;
