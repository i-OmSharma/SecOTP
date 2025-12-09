import type { IUser } from "../model/User.js";
import { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;


export interface AuthenticatedRequest extends Request {
    user?: IUser | null;
}

export const isAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) : Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ message: "Unauthorized! Please login " });
            return;
        }

        const token = authHeader.split(" ")[1];
        const decodedValue = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload & {user?: IUser}

        //decoded

        if (!decodedValue || !decodedValue.user) {
            res.status(401).json({ message: "Unauthorized! invalid token" })
            return;
        }

        req.user = decodedValue.user;
        next();

    } catch (
        error
    ) {
        res.status(401).json({
            message: "Please Login - JWT error"
        })
    }
}  