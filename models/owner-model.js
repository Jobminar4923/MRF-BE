import mongoose from "mongoose";

const ownerSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "owner" },
});

const Owner = mongoose.model("Owner", ownerSchema);

export default Owner;
