import Stock from "../models/stock-model.js";
import Sales from "../models/sales-model.js";
import { sendEmail } from "../utils/mailer.js";

export const addStock = async (req, res) => {
  try {
    const {
      date,
      quantity,
      tyreSize,
      SSP,
      totalAmount,
      pricePerUnit,
      location,
    } = req.body;
    const { role } = req.user;

    if (!["owner", "worker"].includes(role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Check if there is existing stock with the same tyreSize in the previous date
    const previousDate = new Date(date);
    previousDate.setDate(previousDate.getDate() - 1);
    const existingStock = await Stock.findOne({
      date: previousDate.toISOString().split("T")[0],
      tyreSize,
    });

    if (existingStock) {
      // Update existing-stock quantity
      existingStock.quantity += quantity;
      await existingStock.save();

      // Create a new record for open-stock for the current date
      const newStock = new Stock({
        date,
        status: "open-stock",
        quantity,
        tyreSize,
        SSP,
        totalAmount,
        pricePerUnit,
        location,
      });
      await newStock.save();

      // Create a new record with the same values but the current date
      const newExistingStock = new Stock({
        date: new Date().toISOString().split("T")[0],
        status: "existing-stock",
        quantity: existingStock.quantity,
        tyreSize: existingStock.tyreSize,
        SSP: existingStock.SSP,
        totalAmount: existingStock.totalAmount,
        pricePerUnit: existingStock.pricePerUnit,
        location: existingStock.location,
      });
      await newExistingStock.save();
    } else {
      // Create a new record for open-stock-day
      const newStock = new Stock({
        date,
        status: "open-stock-day",
        quantity,
        tyreSize,
        SSP,
        totalAmount,
        pricePerUnit,
        location,
      });
      await newStock.save();
    }

    // Decrease total amount in sales record based on sale quantity
    const salesRecords = await Sales.find({ date, tyreSize });
    for (const record of salesRecords) {
      record.totalAmount -= quantity * pricePerUnit;
      await record.save();
    }

    // Calculate profit and add it to the sales record
    const profit = quantity * (SSP - pricePerUnit);

    const newSale = new Sales({
      date,
      quantity,
      totalAmount: quantity * pricePerUnit,
      profit,
      tyreSize,
    });
    await newSale.save();

    res.status(201).json({ message: "Stock updated successfully" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to update stock", error: err.message });
  }
};

export const updateOpenStock = async (req, res) => {
  try {
    const {
      date,
      quantity,
      tyreSize,
      SSP,
      totalAmount,
      pricePerUnit,
      location,
    } = req.body;
    const { role } = req.user;

    if (!["owner", "worker"].includes(role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Find open-stock record with the same tyreSize and date
    let stock = await Stock.findOne({ date, tyreSize, status: "open-stock" });

    if (!stock) {
      // If open-stock not found, try to update existing-stock
      stock = await Stock.findOne({ date, tyreSize, status: "existing-stock" });
    }

    if (!stock) {
      return res.status(404).json({ message: "Stock not found" });
    }

    stock.quantity = quantity;
    stock.SSP = SSP;
    stock.totalAmount = totalAmount;
    stock.pricePerUnit = pricePerUnit;
    stock.location = location;

    await stock.save();

    res.status(200).json({ message: "Stock updated successfully" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to update stock", error: err.message });
  }
};

export const recordSale = async (req, res) => {
  try {
    const {
      date,
      quantity,
      customerName,
      phoneNumber,
      comment,
      tyreSize,
      pricePerUnit,
    } = req.body;
    const { role, id: userId } = req.user;

    console.log("Request Body:", req.body);
    console.log("User Role:", role);

    // Check if the user has the owner or worker role
    if (!["owner", "worker"].includes(role)) {
      console.log("Forbidden: User role is not owner or worker");
      return res.status(403).json({ message: "Forbidden" });
    }

    // Parse the date or use the current date if not provided
    const currentDate = date ? new Date(date) : new Date();
    console.log("Current Date:", currentDate);

    // Check if the item exists in the stock for the given tyreSize
    let stock = await Stock.findOne({
      date: currentDate.toISOString().split("T")[0],
      tyreSize,
    });

    console.log("Stock:", stock);

    if (!stock) {
      console.log("Item not found in stock");
      return res.status(404).json({ message: "Item not found in stock" });
    }

    // Calculate the total amount based on quantity and price per unit
    const totalAmount = quantity * pricePerUnit;

    console.log("Total Amount:", totalAmount);

    // Check if the requested quantity is available in existing stock
    if (stock.status === "existing-stock" && stock.quantity < quantity) {
      console.log("Insufficient stock quantity");
      return res.status(400).json({ message: "Insufficient stock quantity" });
    }

    // Update the existing-stock record if it exists
    const existingStock = await Stock.findOne({
      date: currentDate.toISOString().split("T")[0],
      status: "existing-stock",
      tyreSize,
    });
    if (existingStock) {
      existingStock.quantity -= quantity;
      existingStock.totalAmount -= totalAmount;
      await existingStock.save();
      console.log("Existing Stock Updated:", existingStock);
    }

    // Create a new sales record
    const newSale = new Sales({
      date: currentDate,
      quantity,
      totalAmount,
      customerName,
      phoneNumber,
      comment,
      tyreSize,
      user: userId,
    });

    console.log("New Sale Record:", newSale);

    // Save the sales record
    await newSale.save();

    // Update the stock with the sales data
    if (stock.status === "open-stock") {
      // Update the open-stock record to existing-stock if it exists
      const existingOpenStock = await Stock.findOne({
        date: currentDate.toISOString().split("T")[0],
        status: "open-stock",
        tyreSize,
      });

      if (existingOpenStock) {
        existingOpenStock.status = "existing-stock";
        await existingOpenStock.save();
        console.log("Existing Open Stock Updated:", existingOpenStock);
      }

      // If an openStockDay record already exists for the same date, do not create a new record
      const existingOpenStockDay = await Stock.findOne({
        date: stock.date,
        status: "open-stock-day",
        tyreSize: stock.tyreSize,
      });

      if (!existingOpenStockDay) {
        const openStockDay = new Stock({
          date: stock.date,
          status: "open-stock-day",
          quantity: stock.quantity,
          tyreSize: stock.tyreSize,
          SSP: stock.SSP,
          totalAmount: stock.totalAmount,
          pricePerUnit: stock.pricePerUnit,
          location: stock.location,
        });
        await openStockDay.save();
        console.log("New Open Stock Day Record:", openStockDay);
      }
    }

    // Subtract quantity from stock and update total amount
    stock.quantity -= quantity;
    stock.totalAmount += totalAmount;

    console.log("Updated Stock:", stock);

    // Save the updated stock
    await stock.save();

    // Send email notification
    const emailOptions = {
      from: "venkatreddyabvp2@gmail.com",
      to: "venkatreddyabvp2@gmail.com", // Replace with the recipient's email
      subject: "Stock Update Notification",
      text: "Stock updated successfully",
      html: "<p>Stock updated successfully</p>", // You can use HTML content here
    };
    await sendEmail(emailOptions);

    // Respond with success message
    res.status(201).json({ message: "Stock updated successfully" });
  } catch (err) {
    console.error(err);
    res
      .status(400)
      .json({ message: "Failed to record sales", error: err.message });
  }
};

//get OpenStock_____
export const getOpenStock = async (req, res) => {
  try {
    // Find all "open-stock" records
    const openStock = await Stock.find({ status: "open-stock" });

    res.status(200).json({ openStock });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Failed to get open stock" });
  }
};

export const getExistingStock = async (req, res) => {
  try {
    // Find all "existing-stock" records
    const existingStock = await Stock.find({ status: "existing-stock" });

    res.status(200).json({ existingStock });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Failed to get existing stock" });
  }
};

export const getOpenStockDays = async (req, res) => {
  try {
    // Find all "open-stock-day" records
    const openStockDays = await Stock.find({ status: "open-stock-day" });

    res.status(200).json({ openStockDays });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Failed to get open stock days" });
  }
};

export const getSalesRecords = async (req, res) => {
  try {
    // Find all sales records
    const salesRecords = await Sales.find();

    res.status(200).json({ salesRecords });
  } catch (err) {
    console.error(err);
    res
      .status(400)
      .json({ message: "Failed to get sales records", error: err.message });
  }
};
