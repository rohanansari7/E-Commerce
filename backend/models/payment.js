import mongoose from "mongoose";


const paymentSchema = new mongoose.Schema({
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Orders",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    razorpaySignature: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created",
    },
}, { timestamps: true })


export const Payment = mongoose.model("Payment", paymentSchema)