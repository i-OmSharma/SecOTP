import { publishToQueue } from "../config/rabbitmq.js";
import TryCatch from "../config/TryCatch.js";
import { redisClient } from "../index.js";
import { User } from "../model/User.js";
import { generateToken } from "./generateToken.js";
import { AuthenticatedRequest } from "../middleware/isAuth.js";
import { Response } from "express";


// Login User
export const loginUser = TryCatch(async(req, res) => {
    const {email} = req.body

    const rateLimitKey =`otp:ratelimit:${email}`
    const rateLimit = await redisClient.get(rateLimitKey)    //rate Limit
    if (rateLimit) {
        res.status(429).json({
            message:"Too manu request. Please wait"
        })
        return;
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString() //Generating otp

    const otpKey = `otp:${email}`  // storing otp to redis 
    await redisClient.set(otpKey, otp, {
        EX: 300,
    })

    await redisClient.set(rateLimitKey,"true", { //rate limit 1 min for re send
        EX: 60
    })

    const message = { //send otp
        to: email,
        subject: "Your OTP is",
        body: `Your OTP is ${otp}, valid for 5 minutes`
    }
    
    await publishToQueue("send-otp", message)

    res.status(200).json({
        message: "OTP send to your mail"
    })
})


// VerifyUser --> Donef

export const myProfile = TryCatch(async (req:AuthenticatedRequest, res:Response) => {
    const user = req.user;

    res.json(user)

}) 

export const updateName = TryCatch(async (req:AuthenticatedRequest, res:Response) => {
    const user = await User.findById(req.user?._id)    

    if(!user){
        res.status(404).json({
            message: "User not found"
        })
        return;
    }

    user.name = req.body.name
    await user.save()

    const token = generateToken(user)

    res.json({
        messgae: "User updated",
        user,
        token
    })

})

// Get All User
export const getAllUsers = TryCatch(async (req:AuthenticatedRequest, res:Response) => {
    const users = await User.find()

    res.json(users)
})

// Get a User

export const getAUser = TryCatch(async (req:AuthenticatedRequest, res:Response) => {
    const users = await User.findById(req.params.id)

    res.json(users)
})