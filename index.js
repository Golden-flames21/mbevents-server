require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const app = express();
const PORT = process.env.PORT || 3000;
const cors = require("cors");
const fileupload = require("express-fileupload");
const cloudinary = require("cloudinary").v2;

const userRouter = require("./routes/userRouter");
const eventRouter = require("./routes/eventRouter");

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SCERET,
});

// set up middleware
app.use(fileupload({ useTempFiles: true })); //This allows acces to req files
app.use(express.json()); //allows access to req.body
app.use(cors());

// routes that takes in request and response
app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "Mb Events Server" });
});
app.use("/api/v1", userRouter);
app.use("/api/v1/events", eventRouter);
// error routes
app.use((req, res) => {
  res.status(401).json({ success: false, message: "ROUTE NOT FOUND" });
});
// db connection
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, { dbName: "mbevents" });
    app.listen(PORT, () => {
      console.log(`server running on port: ${PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
};
startServer();
