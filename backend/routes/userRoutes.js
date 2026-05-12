import express from "express";
import { registerUser, login, getAllUser } from "../controllers/authController.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";


const router = express.Router();

router.post("/register", registerUser);
router.post("/login", login);
router.get("/get-all-users", authenticate, authorize("Admin"), getAllUser)

export default router;