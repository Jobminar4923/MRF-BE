import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import router from "./routes/index.js";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json({ limit: "30mb" }));

app.use("/", router);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDb connected successfully"))
  .catch((error) => console.log("Failed to connect mongoDB", error));

app.listen(PORT, console.log(`server running ${PORT}`));
