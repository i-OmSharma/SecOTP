import TryCatch from "../config/TryCatch.js";
import { AuthenticatedRequest } from "../middleware/isAuth.js";
import { Response } from "express";
import { Transaction } from "../model/Transaction.js";
import { User } from "../model/User.js";
import mongoose from "mongoose";
import { redisClient } from "../index.js";
import { publishToQueue } from "../config/rabbitmq.js";

// Step 1: Initiate Transaction and Send OTP
export const initiateTransaction = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const { receiverId, amount, description } = req.body;
    const senderId = req.user?._id;

    if (!receiverId || !amount) {
        res.status(400).json({
            message: "Receiver and amount are required"
        });
        return;
    }

    if (amount <= 0) {
        res.status(400).json({
            message: "Amount must be greater than 0"
        });
        return;
    }

    // Check if sender and receiver are different
    if (senderId?.toString() === receiverId) {
        res.status(400).json({
            message: "Cannot send money to yourself"
        });
        return;
    }

    // Get sender
    const sender = await User.findById(senderId);
    if (!sender) {
        res.status(404).json({
            message: "Sender not found"
        });
        return;
    }

    // Check balance
    if (sender.balance < amount) {
        res.status(400).json({
            message: "Insufficient balance",
            currentBalance: sender.balance,
            requiredAmount: amount
        });
        return;
    }

    // Get receiver
    const receiver = await User.findById(receiverId);
    if (!receiver) {
        res.status(404).json({
            message: "Receiver not found"
        });
        return;
    }

    // Check OTP rate limit
    const rateLimitKey = `transaction:otp:ratelimit:${senderId}`;
    const rateLimit = await redisClient.get(rateLimitKey);
    if (rateLimit) {
        res.status(429).json({
            message: "Too many OTP requests. Please wait 1 minute"
        });
        return;
    }

    // Create pending transaction
    const transaction = await Transaction.create({
        sender: senderId,
        receiver: receiverId,
        amount,
        description: description || 'Money Transfer',
        status: 'pending'
    });

    // Generate OTP for transaction
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in Redis with transaction ID
    const otpKey = `transaction:otp:${transaction._id}`;
    await redisClient.set(otpKey, otp, {
        EX: 300, // 5 minutes
    });

    // Store transaction details temporarily
    const transactionDataKey = `transaction:data:${transaction._id}`;
    await redisClient.set(transactionDataKey, JSON.stringify({
        senderId: senderId?.toString(),
        receiverId,
        amount,
        transactionId: transaction._id.toString()
    }), {
        EX: 300, // 5 minutes
    });

    // Set rate limit
    await redisClient.set(rateLimitKey, "true", {
        EX: 60 // 1 minute
    });

    // Send OTP via email
    const message = {
        to: sender.email,
        subject: "Transaction OTP Verification",
        body: `Your OTP for transaction of ₹${amount} to ${receiver.name} (${receiver.accountNumber}) is: ${otp}. Valid for 5 minutes. Do not share this OTP with anyone.`
    };
    
    await publishToQueue("send-otp", message);

    res.status(201).json({
        message: "Transaction initiated. OTP sent to your email",
        transaction: {
            _id: transaction._id,
            transactionId: transaction.transactionId,
            amount: transaction.amount,
            receiver: {
                _id: receiver._id,
                name: receiver.name,
                email: receiver.email,
                accountNumber: receiver.accountNumber
            },
            sender: {
                _id: sender._id,
                name: sender.name,
                accountNumber: sender.accountNumber,
                currentBalance: sender.balance
            },
            status: transaction.status,
            description: transaction.description
        },
        requireOTP: true,
        requirePassword: true
    });
});

// Step 2: Verify OTP, Password and Complete Transaction
export const verifyAndCompleteTransaction = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const { transactionId, otp, password } = req.body;
    const senderId = req.user?._id;

    // Validate inputs
    if (!transactionId || !otp || !password) {
        res.status(400).json({
            message: "Transaction ID, OTP and Password are required"
        });
        return;
    }

    // Find transaction
    const transaction = await Transaction.findById(transactionId)
        .populate('sender', 'name email accountNumber balance password')
        .populate('receiver', 'name email accountNumber balance');

    if (!transaction) {
        res.status(404).json({
            message: "Transaction not found"
        });
        return;
    }

    // Check if transaction belongs to the sender
    if (transaction.sender._id.toString() !== senderId?.toString()) {
        res.status(403).json({
            message: "Unauthorized to complete this transaction"
        });
        return;
    }

    // Check if transaction is still pending
    if (transaction.status !== 'pending') {
        res.status(400).json({
            message: `Transaction already ${transaction.status}`
        });
        return;
    }

    // Verify OTP
    const otpKey = `transaction:otp:${transactionId}`;
    const storedOTP = await redisClient.get(otpKey);

    if (!storedOTP) {
        // Mark transaction as failed
        transaction.status = 'failed';
        await transaction.save();

        res.status(400).json({
            message: "OTP expired. Please initiate a new transaction"
        });
        return;
    }

    if (storedOTP !== otp) {
        res.status(400).json({
            message: "Invalid OTP"
        });
        return;
    }

    // Verify Password
    const sender = await User.findById(senderId);
    if (!sender) {
        res.status(404).json({
            message: "Sender not found"
        });
        return;
    }

    const isPasswordValid = await sender.comparePassword(password);
    if (!isPasswordValid) {
        res.status(401).json({
            message: "Invalid password"
        });
        return;
    }

    // Delete OTP from Redis (one-time use)
    await redisClient.del(otpKey);
    await redisClient.del(`transaction:data:${transactionId}`);

    // Start atomic database transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Get fresh data within transaction
        const freshSender = await User.findById(transaction.sender._id).session(session);
        const freshReceiver = await User.findById(transaction.receiver._id).session(session);

        if (!freshSender || !freshReceiver) {
            await session.abortTransaction();
            res.status(404).json({
                message: "User not found"
            });
            return;
        }

        // Final balance check
        if (freshSender.balance < transaction.amount) {
            transaction.status = 'failed';
            await transaction.save({ session });
            await session.abortTransaction();
            
            res.status(400).json({
                message: "Insufficient balance",
                currentBalance: freshSender.balance,
                requiredAmount: transaction.amount
            });
            return;
        }

        // Deduct from sender
        freshSender.balance -= transaction.amount;
        await freshSender.save({ session });

        // Add to receiver
        freshReceiver.balance += transaction.amount;
        await freshReceiver.save({ session });

        // Update transaction status
        transaction.status = 'completed';
        await transaction.save({ session });

        // Commit transaction
        await session.commitTransaction();

        // Send confirmation emails
        const senderMessage = {
            to: freshSender.email,
            subject: "Transaction Successful - Money Debited",
            body: `Dear ${freshSender.name},\n\nYour transaction of ₹${transaction.amount} to ${freshReceiver.name} (${freshReceiver.accountNumber}) was successful.\n\nTransaction ID: ${transaction.transactionId}\nNew Balance: ₹${freshSender.balance}\n\nThank you for using our service.`
        };

        const receiverMessage = {
            to: freshReceiver.email,
            subject: "Transaction Successful - Money Credited",
            body: `Dear ${freshReceiver.name},\n\nYou have received ₹${transaction.amount} from ${freshSender.name} (${freshSender.accountNumber}).\n\nTransaction ID: ${transaction.transactionId}\nNew Balance: ₹${freshReceiver.balance}\n\nThank you for using our service.`
        };

        await publishToQueue("send-otp", senderMessage);
        await publishToQueue("send-otp", receiverMessage);

        res.status(200).json({
            message: "Transaction completed successfully",
            transaction: {
                _id: transaction._id,
                transactionId: transaction.transactionId,
                amount: transaction.amount,
                status: transaction.status,
                description: transaction.description,
                sender: {
                    _id: freshSender._id,
                    name: freshSender.name,
                    accountNumber: freshSender.accountNumber,
                    previousBalance: freshSender.balance + transaction.amount,
                    newBalance: freshSender.balance
                },
                receiver: {
                    _id: freshReceiver._id,
                    name: freshReceiver.name,
                    accountNumber: freshReceiver.accountNumber,
                    previousBalance: freshReceiver.balance - transaction.amount,
                    newBalance: freshReceiver.balance
                },
                completedAt: new Date()
            }
        });

    } catch (error) {
        await session.abortTransaction();
        transaction.status = 'failed';
        await transaction.save();
        throw error;
    } finally {
        session.endSession();
    }
});

// Resend OTP for Transaction
export const resendTransactionOTP = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const { transactionId } = req.body;
    const senderId = req.user?._id;

    if (!transactionId) {
        res.status(400).json({
            message: "Transaction ID is required"
        });
        return;
    }

    // Find transaction
    const transaction = await Transaction.findById(transactionId)
        .populate('sender', 'name email')
        .populate('receiver', 'name accountNumber');

    if (!transaction) {
        res.status(404).json({
            message: "Transaction not found"
        });
        return;
    }

    // Check ownership
    if (transaction.sender._id.toString() !== senderId?.toString()) {
        res.status(403).json({
            message: "Unauthorized"
        });
        return;
    }

    // Check if transaction is still pending
    if (transaction.status !== 'pending') {
        res.status(400).json({
            message: `Cannot resend OTP. Transaction is ${transaction.status}`
        });
        return;
    }

    // Check rate limit
    const rateLimitKey = `transaction:otp:ratelimit:${senderId}`;
    const rateLimit = await redisClient.get(rateLimitKey);
    if (rateLimit) {
        res.status(429).json({
            message: "Too many OTP requests. Please wait 1 minute"
        });
        return;
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in Redis
    const otpKey = `transaction:otp:${transactionId}`;
    await redisClient.set(otpKey, otp, {
        EX: 300, // 5 minutes
    });

    // Set rate limit
    await redisClient.set(rateLimitKey, "true", {
        EX: 60 // 1 minute
    });

    // Send OTP via email
    const message = {
        to: transaction.sender.email,
        subject: "Transaction OTP Verification (Resent)",
        body: `Your OTP for transaction of ₹${transaction.amount} to ${transaction.receiver.name} (${transaction.receiver.accountNumber}) is: ${otp}. Valid for 5 minutes. Do not share this OTP with anyone.`
    };
    
    await publishToQueue("send-otp", message);

    res.status(200).json({
        message: "OTP resent successfully",
        transactionId: transaction._id
    });
});

// Get User Transactions
export const getUserTransactions = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?._id;
    const { page = 1, limit = 10, status, type } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build query
    const query: any = {
        $or: [
            { sender: userId },
            { receiver: userId }
        ]
    };

    // Add status filter
    if (status) {
        query.status = status;
    }

    // Add type filter (sent or received)
    if (type === 'sent') {
        query.$or = [{ sender: userId }];
    } else if (type === 'received') {
        query.$or = [{ receiver: userId }];
    }

    const transactions = await Transaction.find(query)
        .populate('sender', 'name accountNumber')
        .populate('receiver', 'name accountNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

    const total = await Transaction.countDocuments(query);

    res.json({
        transactions: transactions.map(txn => ({
            _id: txn._id,
            transactionId: txn.transactionId,
            amount: txn.amount,
            type: txn.sender._id.toString() === userId?.toString() ? 'debit' : 'credit',
            sender: {
                _id: txn.sender._id,
                name: txn.sender.name,
                accountNumber: txn.sender.accountNumber
            },
            receiver: {
                _id: txn.receiver._id,
                name: txn.receiver.name,
                accountNumber: txn.receiver.accountNumber
            },
            status: txn.status,
            description: txn.description,
            createdAt: txn.createdAt
        })),
        pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(total / Number(limit))
        }
    });
});

// Get Transaction by ID
export const getTransaction = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user?._id;

    const transaction = await Transaction.findById(id)
        .populate('sender', 'name email accountNumber')
        .populate('receiver', 'name email accountNumber');

    if (!transaction) {
        res.status(404).json({
            message: "Transaction not found"
        });
        return;
    }

    // Check if user is part of transaction
    if (
        transaction.sender._id.toString() !== userId?.toString() &&
        transaction.receiver._id.toString() !== userId?.toString()
    ) {
        res.status(403).json({
            message: "Unauthorized to view this transaction"
        });
        return;
    }

    res.json({
        transaction: {
            _id: transaction._id,
            transactionId: transaction.transactionId,
            amount: transaction.amount,
            type: transaction.sender._id.toString() === userId?.toString() ? 'debit' : 'credit',
            sender: {
                _id: transaction.sender._id,
                name: transaction.sender.name,
                accountNumber: transaction.sender.accountNumber
            },
            receiver: {
                _id: transaction.receiver._id,
                name: transaction.receiver.name,
                accountNumber: transaction.receiver.accountNumber
            },
            status: transaction.status,
            description: transaction.description,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt
        }
    });
});

// Cancel Transaction (only pending transactions)
export const cancelTransaction = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user?._id;

    const transaction = await Transaction.findById(id);

    if (!transaction) {
        res.status(404).json({
            message: "Transaction not found"
        });
        return;
    }

    // Check if user is sender
    if (transaction.sender.toString() !== userId?.toString()) {
        res.status(403).json({
            message: "Unauthorized to cancel this transaction"
        });
        return;
    }

    // Check if transaction is pending
    if (transaction.status !== 'pending') {
        res.status(400).json({
            message: "Only pending transactions can be cancelled"
        });
        return;
    }

    transaction.status = 'failed';
    await transaction.save();

    // Delete OTP from Redis
    const otpKey = `transaction:otp:${id}`;
    const transactionDataKey = `transaction:data:${id}`;
    await redisClient.del(otpKey);
    await redisClient.del(transactionDataKey);

    res.json({
        message: "Transaction cancelled successfully",
        transaction: {
            _id: transaction._id,
            transactionId: transaction.transactionId,
            status: transaction.status
        }
    });
});

// Get Transaction Statistics
export const getTransactionStats = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?._id;

    const stats = await Transaction.aggregate([
        {
            $match: {
                $or: [
                    { sender: new mongoose.Types.ObjectId(userId as string) },
                    { receiver: new mongoose.Types.ObjectId(userId as string) }
                ],
                status: 'completed'
            }
        },
        {
            $group: {
                _id: null,
                totalSent: {
                    $sum: {
                        $cond: [
                            { $eq: ['$sender', new mongoose.Types.ObjectId(userId as string)] },
                            '$amount',
                            0
                        ]
                    }
                },
                totalReceived: {
                    $sum: {
                        $cond: [
                            { $eq: ['$receiver', new mongoose.Types.ObjectId(userId as string)] },
                            '$amount',
                            0
                        ]
                    }
                },
                transactionCount: { $sum: 1 }
            }
        }
    ]);

    const pendingCount = await Transaction.countDocuments({
        sender: userId,
        status: 'pending'
    });

    res.json({
        stats: stats.length > 0 ? {
            totalSent: stats[0].totalSent,
            totalReceived: stats[0].totalReceived,
            totalTransactions: stats[0].transactionCount,
            pendingTransactions: pendingCount
        } : {
            totalSent: 0,
            totalReceived: 0,
            totalTransactions: 0,
            pendingTransactions: pendingCount
        }
    });
});