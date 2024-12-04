const USER = require("../models/user");
const {
  sendWelcomeEmail,
  sendResetPasswordEmail,
} = require("../emails/sendMail");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const generateToken = ({ userId, email }) => {
  const token = jwt.sign({ userId, email }, process.env.JWT_SECRET, {
    expiresIn: 15 * 60 *60,
  });
  return token;
};

// REGISTER USER
const registerUser = async (req, res) => {
  const { email, fullName, password } = req.body;
  try {
    const existingUser = await USER.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const user = await USER.create({
      fullName,
      email,
      password,
    });

    const clientUrl = `${process.env.FRONTEND_URL}/login`;
    try {
      await sendWelcomeEmail({
        email: user.email,
        fullName: user.fullName,
        clientUrl,
      });
    } catch (error) {
      console.log("error sending email", error);
    }

    res
      .status(201)
      .json({ success: true, message: "User registered successfully", user });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Email and Password is required" });
  }
  try {
    // find user
    const user = await USER.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    // compare pasword
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid Credentials" });
    }
    // generate token. this is done using JWT (JSON WEB TOKEN) and this is used to validate claims or requests. It has three different parts.
    const token = generateToken({ userId: user._id, email: user.email });
    res.status(200).json({
      success: true,
      token,
      user: {
        email: user.email,
        fullName: user.fullName,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide email" });
  }
  // check if user exists
  const user = await USER.findOne({ email });
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // generate resetToken
  const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: 15 * 60 * 60,
  });

  // save the reset token and its expiry in the db
  try {
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() +4 *60 * 60 * 1000; //4 hours. the extra 60 was added to multiply   by 60 minutes, by 60 seconds by 1000
    await user.save();

    // create reset link for the frontend
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    // send email to user
    try {
      await sendResetPasswordEmail({
        email: user.email,
        fullName: user.fullName,
        resetUrl,
      });
    } catch (error) {
      console.log("error sending email", error);
    }
    res.status(200).json({
      success: true,
      resetToken,
      message: "Password reset link sent to your email",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const resetPassword = async (req, res) => {
  const { newPassword, token } = req.body;
  if (!token || !newPassword) {
    return res
      .status(400)
      .json({ success: false, message: "Provide token and new password" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // find the user with the token
    const user = await USER.findOne({
      _id: decoded.id,
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });
    if (!user) {
      return res
        .status(404)
        .jsonb({ success: false, message: "Invalid or expired token" });
    }
    // update the user's password
    user.password = newPassword;
    // clear reset token fields
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();
    res
      .status(200)
      .json({ success: true, message: "Password has been reset successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
};
