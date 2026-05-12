import Order from "../models/order.js"
import { Product } from "../models/products.js"
import { User } from "../models/user.js"
import logger from "../utils/logger.js"

// ─── CREATE ORDER ─────────────────────────────────────────────────────────────
export const createOrder = async (req, res, next) => {
    try {
        const {
            items,           // [{ productId, quantity }]
            shippingAddress, // { full_name, street, city, state, zipCode, country, phone }
            shippingMethod,  // "standard" | "express"
            shippingRate,
            paymentId,
            paymentMethod,   // "upi" | "card" | "netbanking"
            discountAmount,
        } = req.body;

        // 1. Basic validation
        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: "No order items provided" });
        }
        if (!shippingAddress || !paymentId || !paymentMethod) {
            return res.status(400).json({ success: false, message: "Please provide shipping address, paymentId, and payment method" });
        }

        // 2. Validate & build items with live prices from DB
        let orderItems = [];
        let subtotal = 0;

        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({ success: false, message: `Product not found: ${item.productId}` });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({ success: false, message: `Insufficient stock for: ${product.name}` });
            }

            orderItems.push({
                product:  product._id,
                quantity: item.quantity,
                price:    product.price,
            });
            subtotal += product.price * item.quantity;

            // Deduct stock
            product.stock -= item.quantity;
            await product.save();
        }

        // 3. Compute amounts
        const TAX_RATE      = 3.5;                             // %
        const taxAmount     = parseFloat(((subtotal * TAX_RATE) / 100).toFixed(2));
        const discount      = Number(discountAmount) || 0;
        const shipping      = Number(shippingRate) || 0;
        const totalAmount   = parseFloat((subtotal + taxAmount + shipping - discount).toFixed(2));

        // 4. Create order in DB
        const order = await Order.create({
            userId:          req.user._id,
            items:           orderItems,
            shippingAddress,
            shippingMethod:  shippingMethod || "standard",
            shippingRate:    shipping,
            paymentId,
            paymentMethod,
            paymentStatus:   "completed",
            taxRate:         TAX_RATE,
            taxAmount,
            discountAmount:  discount,
            totalAmount,
            status:          "pending",
        });

        // 5. Fetch user email (kept for future use — confirmation email is now sent by webhook)
        // const user = await User.findById(req.user._id).select("email");

        logger.info(`Order created successfully: ${order._id}`);
        res.status(201).json({
            success: true,
            message: "Order placed successfully",
            order,
        });

    } catch (error) {
        logger.error("Order creation failed", error);
        res.status(500).json({ success: false, message: "Order creation failed" });
    }
};

export const getOrders = async (req, res, next) => {
    try {
        const orders = await Order.find({}).populate("userId", "name email").populate("items.product", "name price");
        logger.info("All orders fetched");
        res.status(200).json({ success: true, count: orders.length, orders });
    } catch (error) {
        logger.error("Failed to fetch orders", error);
        res.status(500).json({ success: false, message: "Failed to fetch orders" });
    }
};

export const getOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate("userId", "name email")
            .populate("items.product", "name price imageUrl");
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        logger.info(`Order fetched: ${req.params.id}`);
        res.status(200).json({ success: true, order });
    } catch (error) {
        logger.error("Failed to fetch order", error);
        res.status(500).json({ success: false, message: "Failed to fetch order" });
    }
};

export const updateOrder = async (req, res, next) => {
    try {
        const { status, paymentStatus } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        if (status)        order.status        = status;
        if (paymentStatus) order.paymentStatus = paymentStatus;

        await order.save();
        logger.info(`Order updated: ${req.params.id}`);
        res.status(200).json({ success: true, message: "Order updated successfully", order });
    } catch (error) {
        logger.error("Failed to update order", error);
        res.status(500).json({ success: false, message: "Failed to update order" });
    }
};

export const deleteOrder = async (req, res, next) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        logger.info(`Order deleted: ${req.params.id}`);
        res.status(200).json({ success: true, message: "Order deleted successfully" });
    } catch (error) {
        logger.error("Failed to delete order", error);
        res.status(500).json({ success: false, message: "Failed to delete order" });
    }
};
