import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "venkatreddyabvp2@gmail.com",
    pass: "ackb iflz twef pjrp", // App-specific password
  },
});

export const sendEmail = async (emailOptions) => {
  try {
    await transporter.sendMail(emailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
  }
};
