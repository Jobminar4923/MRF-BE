import SpecialOrder from "../models/special-report.js";

export const createSpecialOrder = async (req, res) => {
  try {
    const specialOrder = new SpecialOrder(req.body);
    await specialOrder.save();
    res
      .status(201)
      .json({ message: "Special order created successfully", specialOrder });
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to create special order", error: err.message });
  }
};

export const getSpecialOrders = async (req, res) => {
  try {
    const specialOrders = await SpecialOrder.find({});
    res.status(200).json(specialOrders);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to get special orders", error: err.message });
  }
};
