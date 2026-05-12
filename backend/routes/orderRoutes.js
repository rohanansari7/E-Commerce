import express from "express"
import { authenticate, authorize } from "../middlewares/authMiddleware.js"
import { createOrder, getOrder, getOrders, updateOrder, deleteOrder } from "../controllers/orderController.js"

const router = express.Router()

// Any authenticated user can place or view their order
router.post("/create-order", authenticate, createOrder)
router.get("/get-orders", authenticate, authorize("Admin"), getOrders)
router.get("/get-order/:id", authenticate, getOrder)
router.put("/update-order/:id", authenticate, authorize("Admin"), updateOrder)
router.delete("/delete-order/:id", authenticate, authorize("Admin"), deleteOrder)

export default router