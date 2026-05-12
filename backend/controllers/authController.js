import { User } from "../models/user.js";
import { generateToken } from "../utils/generateToken.js";
import { sendWelcomeEmail } from "../utils/sendEmail.js";
import { sendRegistrationSMS } from "../utils/sendSMS.js";
import bcrypt from "bcrypt";
import logger from "../utils/logger.js";


export const registerUser = async (req, res) => {
    try {
        const { name, email, password, role, phone } = req.body;

        if (!name || !email || !password) {
            logger.error("Please provide name, email, and password");
            return res.status(400).json({
                success: false,
                message: "Please provide name, email, and password",
            });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: "User already exists",
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const otp = Math.floor(100000 + Math.random() * 900000);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            phone: phone || null,
            ...(role && { role }),
        });

        try {
            await sendWelcomeEmail(user.email, user.name, otp);
        } catch (emailErr) {
            console.error("⚠️  Email sending failed:", emailErr.message);

        }

        if (user.phone) {
            try {
                await sendRegistrationSMS(user.phone, user.name, otp);
            } catch (smsErr) {
                console.error("⚠️  SMS sending failed:", smsErr.message);
            }
        }

        const token = await generateToken(user._id);

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 3600000,
        });

        res.status(201).json({
            success: true,
            message: "Registration successful! Check your email and SMS for your OTP.",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
            },
            token,
        });

    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

export const login = async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        logger.error("Please provide email and password");
        return res.status(400).json({
            success: false,
            message: "Please provide email and password",
        });
    }

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Invalid credentials",
        });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        logger.error("Invalid credentials, password is not matching");
        return res.status(401).json({
            success: false,
            message: "Invalid credentials",
        });
    }

    const token = await generateToken(user._id);

    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 3600000,
    });

    logger.info("Login successful");
    res.status(200).json({
        success: true,
        message: "Login successful",
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
        },
        token,
    });
}

export const getAllUser = async (req, res) => {
    const user = await User.find().select("-password");
    logger.info("All users fetched successfully");
    res.status(200).json({
        message: "All users fetched successfully",
        success: true,
        user,
    });
}