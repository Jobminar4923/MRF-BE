import mongoose from "mongoose";

const workerSchema = new mongoose.Schema({
  workerName: { type: String, required: true },
  phoneNumber: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "worker" },
});

const Worker = mongoose.model("Worker", workerSchema);

export default Worker;
