import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    stock: {
        type: Number,
        required: true,
    },
    imageUrl: {
        type: Array,
        default: [],
    },
    category: {
        type: String,
        required: true,
    },
    brand: {
        type: String,
        default: "Unknown",
    },
    ratings: {
        type: Number,
        default: 0,
    },
    numReviews: {
        type: Number,
        default: 0,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
    },
}, { timestamps: true })


export const Product = mongoose.model("Products", productSchema);