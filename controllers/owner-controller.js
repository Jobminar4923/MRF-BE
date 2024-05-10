import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Owner from "../models/owner-model.js";

export const signupOwner = async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new owner
    const newOwner = new Owner({
      phoneNumber,
      password: hashedPassword,
    });

    await newOwner.save();
    res.status(201).json({ message: "Owner registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Failed to register owner" });
  }
};

export const loginOwner = async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    // Find the owner by phoneNumber
    const owner = await Owner.findOne({ phoneNumber });
    if (!owner) {
      return res.status(404).json({ message: "Owner not found" });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, owner.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate a JWT token
    const token = jwt.sign(
      { id: owner._id, role: owner.role },
      process.env.JWT_SECRET,
    );

    res.status(200).json({ token });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Failed to login owner" });
  }
};
