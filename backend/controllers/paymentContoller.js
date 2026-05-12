import crypto from "crypto";
import { sendOrderConfirmMail } from "../utils/orderConfirmMail.js";
import razorpay from "../config/razorpay.config.js";
import Order from "../models/order.js";
import { Payment } from "../models/payment.js";
import logger from "../utils/logger.js";


export const createRazorpayOrder = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        if (order.paymentStatus === "completed") {
            return res.status(400).json({ success: false, message: "Order is already paid" });
        }

        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(order.totalAmount * 100), // INR paise
            currency: "INR",
            receipt: `receipt_${order._id}`,
            notes: {
                orderId: order._id.toString(),
                userId: req.user._id.toString(),
            },
        });

        const payment = await Payment.create({
            orderId: order._id,
            userId: req.user._id,
            razorpayOrderId: razorpayOrder.id,
            status: "created",
        });

        logger.info(`Razorpay order created: ${razorpayOrder.id} for DB order: ${orderId}`);

        return res.status(201).json({
            success: true,
            message: "Razorpay order created successfully",
            razorpayOrder: {
                id: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
            },
            // Frontend needs these to initialise the Razorpay SDK
            key_id: process.env.RAZORPAY_KEY_ID,
            paymentId: payment._id,
        });
    } catch (error) {
        logger.error("Failed to create Razorpay order", error);
        return res.status(500).json({ success: false, message: "Failed to create Razorpay order" });
    }
};

export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: "razorpay_order_id, razorpay_payment_id and razorpay_signature are required",
            });
        }

        // 1. Re-compute the expected HMAC-SHA256 signature
        const generatedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (generatedSignature !== razorpay_signature) {
            // Mark payment as failed
            await Payment.findOneAndUpdate(
                { razorpayOrderId: razorpay_order_id },
                { status: "failed", razorpayPaymentId: razorpay_payment_id }
            );
            return res.status(400).json({ success: false, message: "Payment verification failed: invalid signature" });
        }

        // 2. Signature is valid — update Payment record
        const payment = await Payment.findOneAndUpdate(
            { razorpayOrderId: razorpay_order_id },
            {
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
                status: "paid",
            },
            { new: true }
        );

        if (!payment) {
            return res.status(404).json({ success: false, message: "Payment record not found" });
        }

        await Order.findByIdAndUpdate(payment.orderId, {
            paymentId: razorpay_payment_id,
            paymentStatus: "completed",
            status: "pending", // order is confirmed; fulfilment pending
        });

        logger.info(`Payment verified: ${razorpay_payment_id} for Razorpay order: ${razorpay_order_id}`);

        return res.status(200).json({
            success: true,
            message: "Payment verified successfully",
            payment,
        });
    } catch (error) {
        logger.error("Payment verification failed", error);
        return res.status(500).json({ success: false, message: "Payment verification failed" });
    }
};

export const getPaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;

        const payment = await Payment.findOne({ orderId }).populate("orderId", "totalAmount paymentStatus status");
        if (!payment) {
            return res.status(404).json({ success: false, message: "Payment record not found for this order" });
        }

        return res.status(200).json({
            success: true,
            payment,
        });
    } catch (error) {
        logger.error("Failed to fetch payment status", error);
        return res.status(500).json({ success: false, message: "Failed to fetch payment status" });
    }
};

export const handleWebhook = async (req, res) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        if (!webhookSecret) {
            logger.error("RAZORPAY_WEBHOOK_SECRET is not set");
            return res.status(500).json({ success: false, message: "Webhook secret not configured" });
        }

        // ── Signature verification ───────────────────────────────────────────
        // Razorpay sends the HMAC-SHA256 of the RAW body in the header.
        // req.body here is a Buffer (express.raw middleware is applied in the route).
        const razorpaySignature = req.headers["x-razorpay-signature"];

        if (!razorpaySignature) {
            return res.status(400).json({ success: false, message: "Missing x-razorpay-signature header" });
        }

        const generatedSignature = crypto
            .createHmac("sha256", webhookSecret)
            .update(req.body) // raw Buffer — do NOT JSON.parse first
            .digest("hex");

        if (generatedSignature !== razorpaySignature) {
            logger.warn("Razorpay webhook: invalid signature");
            return res.status(400).json({ success: false, message: "Invalid webhook signature" });
        }

        // ── Parse the verified payload ───────────────────────────────────────
        const event = JSON.parse(req.body.toString());
        const eventType = event.event;

        logger.info(`Razorpay webhook received: ${eventType}`);

        // ── Dispatch ─────────────────────────────────────────────────────────
        switch (eventType) {

            // ── payment.captured ────────────────────────────────────────────
            case "payment.captured": {
                const paymentEntity = event.payload.payment.entity;
                const razorpayOrderId = paymentEntity.order_id;
                const razorpayPaymentId = paymentEntity.id;

                // Find and update the Payment record
                const payment = await Payment.findOneAndUpdate(
                    { razorpayOrderId },
                    {
                        razorpayPaymentId,
                        status: "paid",
                    },
                    { new: true }
                );

                if (payment) {
                    // Sync the linked Order — populate for the email
                    const updatedOrder = await Order.findByIdAndUpdate(
                        payment.orderId,
                        {
                            paymentId: razorpayPaymentId,
                            paymentStatus: "completed",
                            status: "pending",
                        },
                        { new: true }
                    ).populate("userId", "email").populate("items.product", "name");

                    logger.info(`Webhook payment.captured: order ${payment.orderId} marked as paid`);

                    // Send order confirmation email (non-blocking)
                    if (updatedOrder?.userId?.email) {
                        const addr = updatedOrder.shippingAddress;
                        const emailData = {
                            orderId: updatedOrder._id.toString(),
                            full_name: addr.full_name,
                            email: updatedOrder.userId.email,
                            phone: addr.phone,
                            street: addr.street,
                            city: addr.city,
                            state: addr.state,
                            zipCode: addr.zipCode,
                            country: addr.country,
                            paymentMethod: updatedOrder.paymentMethod,
                            paymentStatus: "completed",
                            status: "pending",
                            shippingMethod: updatedOrder.shippingMethod,
                            shippingRate: updatedOrder.shippingRate,
                            taxAmount: updatedOrder.taxAmount,
                            discountAmount: updatedOrder.discountAmount,
                            totalAmount: updatedOrder.totalAmount,
                            items: updatedOrder.items.map((oi) => ({
                                productId: oi.product._id.toString(),
                                name: oi.product.name || "Product",
                                quantity: oi.quantity,
                                price: oi.price,
                            })),
                        };

                        sendOrderConfirmMail(updatedOrder.userId.email, emailData).catch((err) =>
                            logger.error("Order confirmation email failed (webhook)", err)
                        );
                    }
                } else {
                    // Edge case: payment captured but no DB record (e.g. browser crashed before
                    // create-order route was hit). Log and move on — investigate manually.
                    logger.warn(`Webhook payment.captured: no Payment record for razorpayOrderId ${razorpayOrderId}`);
                }
                break;
            }

            // ── payment.failed ───────────────────────────────────────────────
            case "payment.failed": {
                const paymentEntity = event.payload.payment.entity;
                const razorpayOrderId = paymentEntity.order_id;
                const razorpayPaymentId = paymentEntity.id;

                const payment = await Payment.findOneAndUpdate(
                    { razorpayOrderId },
                    { razorpayPaymentId, status: "failed" },
                    { new: true }
                );

                if (payment) {
                    await Order.findByIdAndUpdate(payment.orderId, { paymentStatus: "failed" });
                    logger.info(`Webhook payment.failed: order ${payment.orderId} marked as failed`);
                }
                break;
            }

            // ── refund.created ───────────────────────────────────────────────
            case "refund.created": {
                // A refund was initiated from the Razorpay dashboard or API
                const refundEntity = event.payload.refund.entity;
                const razorpayPaymentId = refundEntity.payment_id;

                const payment = await Payment.findOne({ razorpayPaymentId });
                if (payment) {
                    // Mark order as refunded so the UI can reflect it
                    await Order.findByIdAndUpdate(payment.orderId, {
                        paymentStatus: "failed",   // closest enum; extend if needed
                        status: "cancelled",
                    });
                    logger.info(`Webhook refund.created: order ${payment.orderId} marked cancelled`);
                }
                break;
            }

            // ── all other events — acknowledge and ignore ────────────────────
            default:
                logger.info(`Razorpay webhook: unhandled event type "${eventType}" — ignoring`);
        }

        // Always respond 200 quickly so Razorpay doesn't retry
        return res.status(200).json({ success: true, received: true });

    } catch (error) {
        logger.error("Razorpay webhook processing error", error);
        // Still return 200 to prevent Razorpay from spamming retries for our own bugs
        return res.status(200).json({ success: false, message: "Webhook handler error" });
    }
};
