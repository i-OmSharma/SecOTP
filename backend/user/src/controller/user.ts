import { publishToQueue } from "../config/rabbitmq.js";
import TryCatch from "../config/TryCatch.js";
import { redisClient } from "../index.js";
import { User } from "../model/User.js";
import { generateToken } from "./generateToken.js";
import { AuthenticatedRequest } from "../middleware/isAuth.js";
import { Response } from "express";

// Login User
export const loginUser = TryCatch(async (req, res) => {
  const { email, accountNumber, password } = req.body;

  if (!email || !accountNumber || !password) {
    res.status(400).json({
      message: "Email, account number, and password are required",
    });
    return;
  }

  // Find user by email
  const user = await User.findOne({ email });

  if (!user) {
    res.status(401).json({
      message: "Invalid credentials",
    });
    return;
  }

  // Verify account number
  if (user.accountNumber !== accountNumber) {
    res.status(401).json({
      message: "Invalid credentials",
    });
    return;
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    res.status(401).json({
      message: "Invalid credentials",
    });
    return;
  }

  const rateLimitKey = `otp:ratelimit:${email}`;
  const rateLimit = await redisClient.get(rateLimitKey); //rate Limit
  if (rateLimit) {
    res.status(429).json({
      message: "Too many requests. Please wait",
    });
    return;
  }
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); //Generating otp

  const otpKey = `otp:${email}`; // storing otp to redis
  await redisClient.set(otpKey, otp, {
    EX: 300,
  });

  await redisClient.set(rateLimitKey, "true", {
    //rate limit 1 min for re send
    EX: 60,
  });

  const message = {
    //send otp
    to: email,
    subject: "Your OTP is",
    body: `Your OTP is ${otp}, valid for 5 minutes`,
  };

  await publishToQueue("send-otp", message);

  res.status(200).json({
    message: "OTP send to your mail",
  });
});

// Register User
export const registerUser = TryCatch(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({
      message: "name, email, and password are required",
    });
    return;
  }

  let user = await User.findOne({ email });
  if (user) {
    res.status(400).json({
      message: "User with this email already exists",
    });
    return;
  }

  // Generate a unique account number
  const accountNumber = `ACC${Date.now()}${Math.floor(
    100 + Math.random() * 900
  )}`;

  user = await User.create({ name, email, password, accountNumber });

  res.status(201).json({
    message: "User registered successfully",
    user,
  });
});

// VerifyUser --> Donef

export const myProfile = TryCatch(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;

    res.json(user);
  }
);
// check balance
export const getBalance = TryCatch(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = await User.findById(req.user?._id);

    if (!user) {
      res.status(404).json({
        message: "User not found",
      });
      return;
    }

    res.json({
      balance: user.balance,
    });
  }
);

export const updateName = TryCatch(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = await User.findById(req.user?._id);

    if (!user) {
      res.status(404).json({
        message: "User not found",
      });
      return;
    }

    user.name = req.body.name;
    await user.save();

    const token = generateToken(user);

    res.json({
      message: "User updated",
      user,
      token,
    });
  }
);

// Get All User
// This should be an admin-only route in a real application.
// For now, we'll leave it as is but acknowledge the security risk.
export const getAllUsers = TryCatch(
  async (req: AuthenticatedRequest, res: Response) => {
    const users = await User.find();

    res.json(users);
  }
);

// Get a User

export const getAUser = TryCatch(
  async (req: AuthenticatedRequest, res: Response) => {
    const users = await User.findById(req.params.id).select("-password");

    res.json(users);
  }
);
