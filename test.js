//File for testing concepts

//passing functions through another function to catch errors
//Returns a resolved promise
const resolvePromise = () => {
  return new Promise((resolve) => resolve('I am a resolved promise!'));//Return resolved error after 1 second
};
//Returns a rejected promise (an error)
const rejectPromise = () => {
  return new Promise((resolve, reject) => reject('I am a rejected promise!'), 1000);//Reject the promise after 1 second
};
//This function checks for errors/rejected promises in the passed in function and catches them. It returns the normal function the promise was resolved/no errors occurred
const passThrough = (passedFunction) => { //passedFunction is an async function which receives a promise and so can have .then() and .catch used on it
  return () => {
    passedFunction().catch((error) => console.log("error caught!! ->", error));//Returns either the function that was passed in or an error (promise rejection)
  };
};
const resolvedFunc = passThrough(async () => {
  //only use async here if this is an async function that uses await
  await resolvePromise().then((res) => console.log(res)); //Can use .then() as await receives a promise
});

const rejectedFunc = passThrough(async () => {
  //only use async here if this is an async function that uses await
  await rejectPromise().then(() => console.log('this statement never happens'));//This never fires because the passThrough fuction catches the error on line 14 and never returns this anonymous function
});

resolvedFunc(); //When this function is called the anonymous function is passed to passThrough which then returns it to firstFunc()
rejectedFunc();
