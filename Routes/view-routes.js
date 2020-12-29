const express = require("express");
const router = express.Router();
const viewController = require('../Controllers/view-controller');
const authController = require('../Controllers/authentication-controller');
/*
router.get("/", (req, res) => {
  //Express looks for this folder in the Views folder that was specified above
  res.status(200).render("base", {
    tour: "The Forest Hiker",
    user: "Jonas",
  });
  // res.sendFile('Public/overview.html', {root: __dirname }); Serve a html file
});
*/

router.use(authController.isLoggedIn);
router.get("/", viewController.getOverview);
router.route("/tour/:slug").get(viewController.getATour); //Get details of a specific tour on url /tours/name-of-tour
router.get('/login', viewController.getLoginForm);

module.exports = router;
