import { User }    from "../models/user.js";
import { Product } from "../models/products.js";
import Order        from "../models/order.js";
import { Payment }  from "../models/payment.js";
import logger        from "../utils/logger.js";

const getPeriodRange = (period) => {
    const now   = new Date();
    const start = new Date(now);

    if (period === "week") {
        start.setDate(now.getDate() - 7);
    } else if (period === "month") {
        start.setMonth(now.getMonth() - 1);
    } else {
        // year (default)
        start.setFullYear(now.getFullYear() - 1);
    }

    return { start, end: now };
};

/**
 * Returns { start, end } for the PREVIOUS equivalent window
 * (used to calculate growth %).
 */
const getPreviousPeriodRange = (period) => {
    const { start: curStart, end: curEnd } = getPeriodRange(period);
    const diff = curEnd - curStart;               // ms
    return { start: new Date(curStart - diff), end: curStart };
};

/** Calculate % growth. Returns 0 when prevValue is 0. */
const calcGrowth = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return parseFloat((((current - previous) / previous) * 100).toFixed(2));
};

// ─── 1.  MAIN ANALYTICS DASHBOARD ────────────────────────────────────────────
export const getAnalytics = async (req, res) => {
    try {
        const period = req.query.period || "month"; // week | month | year
        const { start, end }         = getPeriodRange(period);
        const { start: ps, end: pe } = getPreviousPeriodRange(period);

        // ── Counts current period ────────────────────────────────────────────
        const [
            totalUsers,
            totalProducts,
            totalOrders,
            prevUsers,
            prevOrders,
        ] = await Promise.all([
            User.countDocuments({ createdAt: { $gte: start, $lte: end } }),
            Product.countDocuments({}),
            Order.countDocuments({ createdAt: { $gte: start, $lte: end } }),
            User.countDocuments({ createdAt: { $gte: ps, $lte: pe } }),
            Order.countDocuments({ createdAt: { $gte: ps, $lte: pe } }),
        ]);

        // ── Revenue current + previous ───────────────────────────────────────
        const [revCur, revPrev] = await Promise.all([
            Order.aggregate([
                { $match: { paymentStatus: "completed", createdAt: { $gte: start, $lte: end } } },
                { $group: { _id: null, total: { $sum: "$totalAmount" } } },
            ]),
            Order.aggregate([
                { $match: { paymentStatus: "completed", createdAt: { $gte: ps, $lte: pe } } },
                { $group: { _id: null, total: { $sum: "$totalAmount" } } },
            ]),
        ]);

        const revenue     = revCur[0]?.total  ?? 0;
        const prevRevenue = revPrev[0]?.total ?? 0;

        // ── Growth rates ─────────────────────────────────────────────────────
        const userGrowth    = calcGrowth(totalUsers,  prevUsers);
        const orderGrowth   = calcGrowth(totalOrders, prevOrders);
        const revenueGrowth = calcGrowth(revenue,     prevRevenue);

        // ── All-time totals ───────────────────────────────────────────────────
        const [allTimeUsers, allTimeProducts, allTimeOrders, allTimeRevRaw] = await Promise.all([
            User.countDocuments({}),
            Product.countDocuments({}),
            Order.countDocuments({}),
            Order.aggregate([
                { $match: { paymentStatus: "completed" } },
                { $group: { _id: null, total: { $sum: "$totalAmount" } } },
            ]),
        ]);
        const allTimeRevenue = allTimeRevRaw[0]?.total ?? 0;

        logger.info(`Analytics fetched — period: ${period}`);
        return res.status(200).json({
            success: true,
            period,
            summary: {
                totalUsers,
                totalProducts,
                totalOrders,
                revenue: parseFloat(revenue.toFixed(2)),
                growth: {
                    users:   { value: userGrowth,    trend: userGrowth    >= 0 ? "up" : "down" },
                    orders:  { value: orderGrowth,   trend: orderGrowth   >= 0 ? "up" : "down" },
                    revenue: { value: revenueGrowth, trend: revenueGrowth >= 0 ? "up" : "down" },
                },
                allTime: {
                    users:    allTimeUsers,
                    products: allTimeProducts,
                    orders:   allTimeOrders,
                    revenue:  parseFloat(allTimeRevenue.toFixed(2)),
                },
            },
        });
    } catch (error) {
        logger.error("Analytics fetch failed", error);
        return res.status(500).json({ success: false, message: "Failed to fetch analytics" });
    }
};

export const getRevenueChart = async (req, res) => {
    try {
        const period = req.query.period || "month"; // week | month | year

        // daily for week/month, monthly for year
        const dateFormat = period === "year" ? "%Y-%m" : "%Y-%m-%d";
        const { start, end } = getPeriodRange(period);

        const data = await Order.aggregate([
            {
                $match: {
                    paymentStatus: "completed",
                    createdAt: { $gte: start, $lte: end },
                },
            },
            {
                $group: {
                    _id:     { $dateToString: { format: dateFormat, date: "$createdAt" } },
                    revenue: { $sum: "$totalAmount" },
                    orders:  { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    date:    "$_id",
                    revenue: { $round: ["$revenue", 2] },
                    orders:  1,
                },
            },
        ]);

        return res.status(200).json({ success: true, period, chart: data });
    } catch (error) {
        logger.error("Revenue chart fetch failed", error);
        return res.status(500).json({ success: false, message: "Failed to fetch revenue chart" });
    }
};

export const getUserChart = async (req, res) => {
    try {
        const period     = req.query.period || "month";
        const dateFormat = period === "year" ? "%Y-%m" : "%Y-%m-%d";
        const { start, end } = getPeriodRange(period);

        const data = await User.aggregate([
            { $match: { createdAt: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id:   { $dateToString: { format: dateFormat, date: "$createdAt" } },
                    users: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, date: "$_id", users: 1 } },
        ]);

        return res.status(200).json({ success: true, period, chart: data });
    } catch (error) {
        logger.error("User chart fetch failed", error);
        return res.status(500).json({ success: false, message: "Failed to fetch user chart" });
    }
};

export const getTopProducts = async (req, res) => {
    try {
        const limit  = parseInt(req.query.limit)  || 10;
        const period = req.query.period            || "month";
        const { start, end } = getPeriodRange(period);

        const data = await Order.aggregate([
            {
                $match: {
                    paymentStatus: "completed",
                    createdAt: { $gte: start, $lte: end },
                },
            },
            { $unwind: "$items" },
            {
                $group: {
                    _id:          "$items.product",
                    totalSold:    { $sum: "$items.quantity" },
                    totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
                },
            },
            { $sort: { totalSold: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from:         "products",
                    localField:   "_id",
                    foreignField: "_id",
                    as:           "product",
                },
            },
            { $unwind: "$product" },
            {
                $project: {
                    _id: 0,
                    productId:    "$_id",
                    name:         "$product.name",
                    category:     "$product.category",
                    brand:        "$product.brand",
                    price:        "$product.price",
                    totalSold:    1,
                    totalRevenue: { $round: ["$totalRevenue", 2] },
                },
            },
        ]);

        return res.status(200).json({ success: true, period, topProducts: data });
    } catch (error) {
        logger.error("Top products fetch failed", error);
        return res.status(500).json({ success: false, message: "Failed to fetch top products" });
    }
};

export const getCategoryStats = async (req, res) => {
    try {
        const period = req.query.period || "month";
        const { start, end } = getPeriodRange(period);

        const data = await Order.aggregate([
            {
                $match: {
                    paymentStatus: "completed",
                    createdAt: { $gte: start, $lte: end },
                },
            },
            { $unwind: "$items" },
            {
                $lookup: {
                    from:         "products",
                    localField:   "items.product",
                    foreignField: "_id",
                    as:           "productInfo",
                },
            },
            { $unwind: "$productInfo" },
            {
                $group: {
                    _id:          "$productInfo.category",
                    totalSold:    { $sum: "$items.quantity" },
                    totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
                    orderIds:     { $addToSet: "$_id" },
                },
            },
            {
                $project: {
                    _id: 0,
                    category:     "$_id",
                    totalSold:    1,
                    totalRevenue: { $round: ["$totalRevenue", 2] },
                    orderCount:   { $size: "$orderIds" },
                },
            },
            { $sort: { totalRevenue: -1 } },
        ]);

        return res.status(200).json({ success: true, period, categories: data });
    } catch (error) {
        logger.error("Category stats fetch failed", error);
        return res.status(500).json({ success: false, message: "Failed to fetch category stats" });
    }
};

export const getOrderStatusStats = async (req, res) => {
    try {
        const period = req.query.period || "month";
        const { start, end } = getPeriodRange(period);

        const [statusDist, paymentDist] = await Promise.all([
            Order.aggregate([
                { $match: { createdAt: { $gte: start, $lte: end } } },
                { $group: { _id: "$status", count: { $sum: 1 } } },
                { $project: { _id: 0, status: "$_id", count: 1 } },
            ]),
            Order.aggregate([
                { $match: { createdAt: { $gte: start, $lte: end } } },
                { $group: { _id: "$paymentStatus", count: { $sum: 1 } } },
                { $project: { _id: 0, paymentStatus: "$_id", count: 1 } },
            ]),
        ]);

        return res.status(200).json({
            success: true,
            period,
            orderStatus:   statusDist,
            paymentStatus: paymentDist,
        });
    } catch (error) {
        logger.error("Order status stats fetch failed", error);
        return res.status(500).json({ success: false, message: "Failed to fetch order status stats" });
    }
};

export const getLowStockProducts = async (req, res) => {
    try {
        const threshold = parseInt(req.query.threshold) || 10;

        const products = await Product.find({ stock: { $lte: threshold } })
            .select("name category brand stock price")
            .sort({ stock: 1 });

        return res.status(200).json({
            success: true,
            threshold,
            count: products.length,
            products,
        });
    } catch (error) {
        logger.error("Low stock fetch failed", error);
        return res.status(500).json({ success: false, message: "Failed to fetch low stock products" });
    }
};

export const getShippingStats = async (req, res) => {
    try {
        const period = req.query.period || "month";
        const { start, end } = getPeriodRange(period);

        const data = await Order.aggregate([
            { $match: { createdAt: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id:     "$shippingMethod",
                    count:   { $sum: 1 },
                    revenue: { $sum: "$shippingRate" },
                },
            },
            {
                $project: {
                    _id: 0,
                    method:  "$_id",
                    count:   1,
                    revenue: { $round: ["$revenue", 2] },
                },
            },
        ]);

        return res.status(200).json({ success: true, period, shipping: data });
    } catch (error) {
        logger.error("Shipping stats fetch failed", error);
        return res.status(500).json({ success: false, message: "Failed to fetch shipping stats" });
    }
};

export const getAverageOrderValue = async (req, res) => {
    try {
        const period = req.query.period || "month";
        const { start, end }         = getPeriodRange(period);
        const { start: ps, end: pe } = getPreviousPeriodRange(period);

        const [curAov, prevAov] = await Promise.all([
            Order.aggregate([
                { $match: { paymentStatus: "completed", createdAt: { $gte: start, $lte: end } } },
                { $group: { _id: null, avg: { $avg: "$totalAmount" }, count: { $sum: 1 } } },
            ]),
            Order.aggregate([
                { $match: { paymentStatus: "completed", createdAt: { $gte: ps, $lte: pe } } },
                { $group: { _id: null, avg: { $avg: "$totalAmount" }, count: { $sum: 1 } } },
            ]),
        ]);

        const current  = curAov[0]?.avg  ?? 0;
        const previous = prevAov[0]?.avg ?? 0;
        const growth   = calcGrowth(current, previous);

        return res.status(200).json({
            success: true,
            period,
            aov: {
                current:    parseFloat(current.toFixed(2)),
                previous:   parseFloat(previous.toFixed(2)),
                growth,
                trend:      growth >= 0 ? "up" : "down",
                orderCount: curAov[0]?.count ?? 0,
            },
        });
    } catch (error) {
        logger.error("AVERAGE ORDER VALUE fetch failed", error);
        return res.status(500).json({ success: false, message: "Failed to fetch average order value" });
    }
};
