import mongoose, {Document, Schema } from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
    phoneNumber: string;
    accountNumber: string;
    password: string;
    balance?: number;
}

const UserSchema: Schema<IUser> = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    accountNumber: {
        type: String,
        required: true, 
        unique: true
    },
    password: {
        type: String,
        unique: true,
        required: true,
    },
    balance: {
        type: Number,
        default: () => Math.floor(Math.random() * 1000),
    }
}, {
    timestamps: true
});

export const User = mongoose.model<IUser>("User", UserSchema);

