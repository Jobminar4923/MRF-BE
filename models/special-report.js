import mongoose from "mongoose";

const { Schema } = mongoose;

const specialOrderSchema = new Schema({
  date: { type: String, required: true },
  comment: { type: String, required: false },
  customerName: { type: String, required: true },
  tyreSize: { type: String, required: true },
  quantity: { type: Number, required: true },
  phoneNumber: { type: String, required: true },
  location: { type: String, required: true },
});

const SpecialOrder = mongoose.model("SpecialOrder", specialOrderSchema);

export default SpecialOrder;
