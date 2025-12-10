import type { IUser } from "../model/User.js";
import { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// Tell TS that any Request after auth WILL have user
export interface AuthenticatedRequest extends Request {
  user: IUser; 
}

export const isAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized! Please login" });
      return;
    }

    const token = authHeader.split(" ")[1];
    const decodedValue = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload & { user?: IUser };

    if (!decodedValue || !decodedValue.user) {
      res.status(401).json({ message: "Unauthorized! invalid token" });
      return;
    }

    req.user = decodedValue.user as IUser;
    next();
  } catch {
    res.status(401).json({ message: "Please login - JWT error" });
  }
};

// 👇 THIS IS THE KEY PART
declare module "express-serve-static-core" {
  interface Request {
    user: IUser;
  }
}
