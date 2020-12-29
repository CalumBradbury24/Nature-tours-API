/* eslint-disable */
//Need module bundler like webpack or parcel 
import axios from 'axios';

export const login = async (email, password) => {
  try {
    const result = await axios({
      method: "POST",
      url: "http://localhost:3000/api/v1/users/login",
      data: {
        email: email,
        password: password,
      },
    });

 
      //if the response status from the http request is a sucess
      showAlert("success", "Logged in successfully!");
      window.setTimeout(() => {
        //After 1.5 seconds load the home page
        location.assign("/");
      }, 1500);
      console.log(result)
    
    
  } catch (error) {
    console.log(error.result.data.message); //Message property of response
  }
};

