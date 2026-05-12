import express from "express"
import { authenticate, authorize } from "../middlewares/authMiddleware.js"
import { createProduct, getAllProducts, getProduct, updateProduct, deleteProduct } from "../controllers/productController.js"
import upload from "../utils/multer.js"

const router = express.Router();

router.post("/create-product", authenticate, authorize("Admin"), upload.array("images", 5), createProduct);
router.get("/get-all-products", authenticate, authorize("Admin"), getAllProducts);
router.get("/get-product/:id", authenticate, authorize("Admin"), getProduct);
router.put("/update-product/:id", authenticate, authorize("Admin"), upload.array("images", 5), updateProduct);
router.delete("/delete-product/:id", authenticate, authorize("Admin"), deleteProduct);

export default router;