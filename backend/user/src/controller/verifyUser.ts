import { redisClient } from "../index.js";
import { User } from "../model/User.js";
import { generateToken } from "./generateToken.js";
import TryCatch from "../config/TryCatch.js";


export const verifyUser = TryCatch(async(req, res) => {
    const {email, otp:enteredOTP }= req.body

    if (!email || !enteredOTP) {
        res.status(400).json({
            message: "Email and OTP required "
        })
        return;
    }

    const otpKey = `otp:${email}`
    const storedOTP = await redisClient.get(otpKey)

    if (!storedOTP || storedOTP !== enteredOTP) {
        res.status(400).json({
            message: "Invalid OTP or extired OTP"
        })
        return;
    }

    await redisClient.del(otpKey)

    let user = await User.findOne({email})

    if (!user) {
        const name = email.slice(0,8)

        user = await User.create({name, email})
    }

    const token = generateToken(user);

    res.json({
        messagae: "User Verified",
        user,
        token
    })
});
