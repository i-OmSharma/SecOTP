import mongoose, {Document, Schema } from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
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
    },
    balance: {
        type: Number,
        default: () => Math.floor(Math.random() * 1000),
    }
}, {
    timestamps: true
});

export const User = mongoose.model<IUser>("User", UserSchema);

