import express from "express"
import {
    getAnalytics,
    getRevenueChart,
    getUserChart,
    getTopProducts,
    getCategoryStats,
    getOrderStatusStats,
    getLowStockProducts,
    getShippingStats,
    getAverageOrderValue,
} from "../controllers/analyticsController.js"
import { authenticate, authorize } from "../middlewares/authMiddleware.js"

const router = express.Router()

const adminOnly = [authenticate, authorize("Admin")]

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Admin analytics & reporting
 */

/**
 * @swagger
 * /api/v1/analytics/analytic:
 *   get:
 *     summary: Main dashboard — totals, growth rates, all-time stats
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *         description: Time window (default month)
 *     responses:
 *       200:
 *         description: Analytics data fetched successfully
 */
router.get("/analytic", ...adminOnly, getAnalytics)

/**
 * @swagger
 * /api/v1/analytics/revenue-chart:
 *   get:
 *     summary: Revenue & order count time-series for charts
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 */
router.get("/revenue-chart", ...adminOnly, getRevenueChart)

/**
 * @swagger
 * /api/v1/analytics/user-chart:
 *   get:
 *     summary: User registration time-series for charts
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 */
router.get("/user-chart", ...adminOnly, getUserChart)

/**
 * @swagger
 * /api/v1/analytics/top-products:
 *   get:
 *     summary: Top N selling products by quantity
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of products to return (default 10)
 */
router.get("/top-products", ...adminOnly, getTopProducts)

/**
 * @swagger
 * /api/v1/analytics/category-stats:
 *   get:
 *     summary: Revenue & units sold broken down by product category
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 */
router.get("/category-stats", ...adminOnly, getCategoryStats)

/**
 * @swagger
 * /api/v1/analytics/order-status:
 *   get:
 *     summary: Order fulfilment & payment status distribution
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 */
router.get("/order-status", ...adminOnly, getOrderStatusStats)

/**
 * @swagger
 * /api/v1/analytics/low-stock:
 *   get:
 *     summary: Products with stock at or below the threshold
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: integer
 *         description: Stock level threshold (default 10)
 */
router.get("/low-stock", ...adminOnly, getLowStockProducts)

/**
 * @swagger
 * /api/v1/analytics/shipping-stats:
 *   get:
 *     summary: Order count & revenue split by shipping method
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 */
router.get("/shipping-stats", ...adminOnly, getShippingStats)

/**
 * @swagger
 * /api/v1/analytics/aov:
 *   get:
 *     summary: Average order value with growth vs previous period
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 */
router.get("/aov", ...adminOnly, getAverageOrderValue)

export default router