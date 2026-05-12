import express from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import {
    createRazorpayOrder,
    verifyPayment,
    getPaymentStatus,
    handleWebhook,
} from "../controllers/paymentContoller.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Payment
 *   description: Razorpay payment integration
 */


/**
 * @swagger
 * /api/v1/payment/webhook:
 *   post:
 *     summary: Razorpay webhook endpoint (raw body required — no auth)
 *     tags: [Payment]
 *     description: |
 *       Called directly by Razorpay for events like payment.captured, payment.failed, refund.created.
 *       This route must receive the RAW body — do NOT pass it through express.json().
 *     responses:
 *       200:
 *         description: Webhook processed
 *       400:
 *         description: Invalid signature
 */
router.post(
    "/webhook",
    express.raw({ type: "application/json" }),
    handleWebhook
);

// ─── 1. CREATE RAZORPAY ORDER ─────────────────────────────────────────────────
/**
 * @swagger
 * /api/v1/payment/create-order/{orderId}:
 *   post:
 *     summary: Create a Razorpay order for an existing DB order
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB Order _id
 *     responses:
 *       201:
 *         description: Razorpay order created successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.post("/create-order/:orderId", authenticate, createRazorpayOrder);


/**
 * @swagger
 * /api/v1/payment/verify:
 *   post:
 *     summary: Verify Razorpay payment signature and mark order as paid
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - razorpay_order_id
 *               - razorpay_payment_id
 *               - razorpay_signature
 *             properties:
 *               razorpay_order_id:
 *                 type: string
 *               razorpay_payment_id:
 *                 type: string
 *               razorpay_signature:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment verified successfully
 *       400:
 *         description: Invalid signature
 *       404:
 *         description: Payment record not found
 *       500:
 *         description: Server error
 */
router.post("/verify", authenticate, verifyPayment);


/**
 * @swagger
 * /api/v1/payment/status/{orderId}:
 *   get:
 *     summary: Get payment status for a given DB order
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB Order _id
 *     responses:
 *       200:
 *         description: Payment status fetched
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Server error
 */
router.get("/status/:orderId", authenticate, getPaymentStatus);

export default router;
