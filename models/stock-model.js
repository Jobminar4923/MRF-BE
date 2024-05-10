import mongoose from "mongoose";

const stockSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  comment: String,
  tyreSize: String,
  quantity: { type: Number, default: 0 },
  SSP: String,
  totalAmount: { type: Number, default: 0 },
  pricePerUnit: { type: Number, default: 0 },
  location: String,
  status: {
    type: String,
    enum: ["open-stock", "existing-stock", "open-stock-day"],
    default: "open-stock",
  },
});

const Stock = mongoose.model("Stock", stockSchema);

export default Stock;
