const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  //1) Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
    // Activate in gmail 'less secure app' option
  });

  //2) Define the email options
  const mailOptions = {
    from: "Calum Bradbury <cs.bradbury@outlook.com>",
    to: options.email, //Options is the options argment^ in this function
    subject: options.subject, //Subject line in email
    text: options.message, //text in email
  };

  //3) Actually send the email with nodemailer
  await transporter.sendMail(mailOptions); //Could take significant time so do asynchronously
};

module.exports = sendEmail;
