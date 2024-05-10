import mongoose from "mongoose";

const salesSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  quantity: { type: Number, default: 0 },
  pricePerUnit: { type: Number, default: 0 },
  tyreSize: String,
  customerName: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: "Worker" },
  comments: String,
});

const Sales = mongoose.model("Sales", salesSchema);

export default Sales;
