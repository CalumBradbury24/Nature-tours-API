/* eslint-disable */

//This file is for getting data from the interface
import "@babel/polyfill"; //for older browser compatibility
import { displayMap } from "./mapbox";
import { login } from "./login";

// DOM elements
const mapBox = document.getElementById("map");
const loginForm = document.querySelector(".form");

// DELEGATION
if (mapBox) {
  //If mapBox exists based on an existend element with id = map
  const locations = JSON.parse(
    document.getElementById("map").dataset.locations
  ); //Grab the section element with id=map from tour.pug
  displayMap(locations);
}

//If the login for exists
if (loginForm) {
  document.querySelector(".form").addEventListener("submit", (event) => {
    //QuerySelector allows selecting elements based on its class
    event.preventDefault(); //Prevent the form from loading any other page

    //Get data from input fields
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    login(email, password);
  });
}
