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

    // Check if there is existing open stock for the current date with the same tyreSize
    const existingOpenStock = await Stock.findOne({
      date: new Date(date).toISOString().split("T")[0],
      tyreSize,
      status: "open-stock",
    });

    if (existingOpenStock) {
      return res.status(400).json({
        message:
          "Open stock already exists for this tyreSize. Please update the existing open stock.",
      });
    }

    // Check if there is existing stock with the same tyreSize and previous date
    const previousDate = new Date(date);
    previousDate.setDate(previousDate.getDate() - 1);
    let previousStock = await Stock.findOne({
      date: previousDate.toISOString().split("T")[0],
      tyreSize,
      status: "existing-stock",
    });

    if (previousStock) {
      // Update existing-stock quantity and totalAmount from previous day's open-stock
      previousStock.quantity += quantity;
      previousStock.totalAmount += totalAmount;
      await previousStock.save();
    } else {
      // If there is no existing-stock for the previous date, create one from previous day's open-stock
      const previousOpenStock = await Stock.findOne({
        date: previousDate.toISOString().split("T")[0],
        tyreSize,
        status: "open-stock",
      });

      if (previousOpenStock) {
        const newStock = new Stock({
          date: new Date(date).toISOString().split("T")[0],
          status: "open-stock",
          quantity,
          tyreSize,
          SSP,
          totalAmount,
          pricePerUnit,
          location,
        });
        await newStock.save();
      } else {
        // If there is no previous open-stock, create a new open-stock for the current date
        const newStock = new Stock({
          date: new Date(date).toISOString().split("T")[0],
          status: "open-stock",
          quantity,
          tyreSize,
          SSP,
          totalAmount,
          pricePerUnit,
          location,
        });
        await newStock.save();
      }
    }

    res.status(201).json({ message: "Stock updated successfully" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to update stock", error: err.message });
  }
};
//updating the stock__________________________________________________
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

    // Find open-stock record with the same tyreSize and date_________________
    let stock = await Stock.findOne({ date, tyreSize, status: "open-stock" });

    if (!stock) {
      return res
        .status(404)
        .json({ message: "Open stock not found for this tyreSize and date" });
    }

    // Find existing-stock record with the same tyreSize and date
    let existingStock = await Stock.findOne({
      date,
      tyreSize,
      status: "existing-stock",
    });

    if (!existingStock) {
      // Create a new existing-stock record from open-stock values
      existingStock = new Stock({
        date,
        status: "existing-stock",
        quantity: stock.quantity + quantity,
        tyreSize,
        SSP,
        totalAmount: stock.totalAmount + totalAmount,
        pricePerUnit,
        location,
      });
    } else {
      // Update existing-stock record with new quantity and totalAmount
      existingStock.quantity += quantity;
      existingStock.totalAmount += totalAmount;
    }

    // Save the existing-stock record
    await existingStock.save();

    res.status(200).json({ message: "Stock updated successfully" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to update stock", error: err.message });
  }
};
//record sale______________________________________
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

      // Check if there is existing stock with the same tyreSize and open-stock status
      const openStock = await Stock.findOne({
        date: currentDate.toISOString().split("T")[0],
        tyreSize,
        status: "open-stock",
      });

      if (openStock) {
        // Create a new record for existing-stock
        openStock.quantity -= quantity;
        openStock.totalAmount -= quantity * openStock.pricePerUnit;
        await openStock.save();
        console.log("Open Stock Updated:", openStock);

        // Create a new record for existing-stock
        stock = new Stock({
          date: currentDate,
          status: "existing-stock",
          quantity,
          tyreSize: openStock.tyreSize,
          SSP: openStock.SSP,
          totalAmount: quantity * openStock.pricePerUnit,
          pricePerUnit: openStock.pricePerUnit,
          location: openStock.location,
        });
        await stock.save();
        console.log("New Stock Record:", stock);
      } else {
        return res.status(404).json({ message: "Item not found in stock" });
      }
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

    // Subtract quantity from stock and update total amount
    stock.quantity -= quantity;
    stock.totalAmount += totalAmount;

    console.log("Updated Stock:", stock);

    // Save the updated stock
    await stock.save();

    // Send email notification
    // Send email notification with stock details
    const emailOptions = {
      from: "venkatreddyabvp2@gmail.com",
      to: "venkatreddyabvp2@gmail.com",
      subject: "Stock Update Notification",
      text: `Stock updated successfully. Details: Date: ${stock.date}, Tyre Size: ${stock.tyreSize}, Quantity: ${stock.quantity}, Total Amount: ${stock.totalAmount}`,
      html: `<p>Stock updated successfully.</p><p>Details:</p><ul><li>Date: ${stock.date}</li><li>Tyre Size: ${stock.tyreSize}</li><li>Quantity: ${stock.quantity}</li><li>Total Amount: ${stock.totalAmount}</li></ul>`,
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
    // Find all "open-stock" records for the current date
    const currentDate = new Date().toISOString().split("T")[0];
    let openStock = await Stock.find({
      date: currentDate,
      status: "open-stock",
    });

    // If there are no open-stock records for the current date, create from previous date "existing-stock"
    if (openStock.length === 0) {
      const previousDate = new Date(currentDate);
      previousDate.setDate(previousDate.getDate() - 1);
      const previousStock = await Stock.find({
        date: previousDate.toISOString().split("T")[0],
        status: "existing-stock",
      });

      if (previousStock.length > 0) {
        // Create new open-stock records from previous existing-stock records
        for (const stock of previousStock) {
          const newStock = new Stock({
            date: currentDate,
            status: "open-stock",
            quantity: stock.quantity,
            tyreSize: stock.tyreSize,
            SSP: stock.SSP,
            totalAmount: stock.totalAmount,
            pricePerUnit: stock.pricePerUnit,
            location: stock.location,
          });
          await newStock.save();
        }

        // Retrieve the newly created open-stock records
        openStock = await Stock.find({
          date: currentDate,
          status: "open-stock",
        });
      } else {
        // If there are no existing-stock records for the previous date, create from previous date "open-stock"
        const previousOpenStock = await Stock.find({
          date: previousDate.toISOString().split("T")[0],
          status: "open-stock",
        });

        if (previousOpenStock.length > 0) {
          // Create new open-stock records from previous open-stock records
          for (const stock of previousOpenStock) {
            const newStock = new Stock({
              date: currentDate,
              status: "open-stock",
              quantity: stock.quantity,
              tyreSize: stock.tyreSize,
              SSP: stock.SSP,
              totalAmount: stock.totalAmount,
              pricePerUnit: stock.pricePerUnit,
              location: stock.location,
            });
            await newStock.save();
          }

          // Retrieve the newly created open-stock records
          openStock = await Stock.find({
            date: currentDate,
            status: "open-stock",
          });
        }
      }
    }

    res.status(200).json({ openStock });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Failed to get open stock" });
  }
};

export const getExistingStock = async (req, res) => {
  try {
    // Find all "existing-stock" records for the current date
    const currentDate = new Date().toISOString().split("T")[0];
    let existingStock = await Stock.find({
      date: currentDate,
      status: "existing-stock",
    });

    // If there are no existing-stock records for the current date, find open-stock records
    if (existingStock.length === 0) {
      existingStock = await Stock.find({
        date: currentDate,
        status: "open-stock",
      });
    }

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
