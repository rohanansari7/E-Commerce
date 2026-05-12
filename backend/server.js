import "dotenv/config"
import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { connectDB } from "./config/db.js"
import swaggerUi from "swagger-ui-express"
import swaggerJsDocs from "swagger-jsdoc"
import userRoutes from "./routes/userRoutes.js"
import productRoutes from "./routes/productRoutes.js"
import orderRoutes from "./routes/orderRoutes.js"
import paymentRoutes from "./routes/paymentRoutes.js"
import analyticsRoutes from "./routes/analyticsRoutes.js"
connectDB()
const app = express()
const PORT = process.env.PORT || 4000

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    // allowedHeaders: ["Content-Type", "Authorization"],
    // exposedHeaders: ["Content-Length", "Date"],
    // maxAge: 600,
    // preflightContinue: false,
    // optionsSuccessStatus: 200,

}))

// User routes
app.use("/api/v1/user", userRoutes)
app.use("/api/v1/product", productRoutes)
app.use("/api/v1/order", orderRoutes)
app.use("/api/v1/payment", paymentRoutes)
app.use("/api/v1/analytics", analyticsRoutes)

app.get("/", (req, res) => {
    res.send("Hello World!")
})

// Swagger configration here
const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "E-Commerce API",
            version: "1.0.0",
            description: "API documentation for E-Commerce application",
        },

        servers: [{ url: "http://localhost:4000" }], // Swagger UI will use this as the base URL for API requests        
    },
    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerAuthFormat: "JWT",
            },
        },
    },
    security: [
        {
            bearerAuth: [], // Apply bearerAuth globally to all endpoints
        }
    ],
    apis: ["./routes/*.js", "./controllers/*.js"], // Ensure this points to the correct route files

};

const swaggerSpecs = swaggerJsDocs(options)
// Swagger UI route
app.get("/api-docs/json", (req, res) => {
    console.log(swaggerSpecs)
    res.json(swaggerSpecs)
})
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs))

app.listen(PORT, () => {
    console.log(`Server is running on port ${process.env.PORT || 4000}`)
})