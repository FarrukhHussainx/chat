import express from "express";
import { checkAuth, getAllUsersExceptMe, Logout, sendOtp, updateProfile, varifyOtp } from "../controllers/authController.js";
import { multerMiddleware } from "../config/cloudinaryConfig.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", varifyOtp);
router.put("/update-profile", auth, multerMiddleware, updateProfile);
router.post("/logout", auth, Logout);
router.get("/check-auth", auth, checkAuth);
router.get("/users", auth, getAllUsersExceptMe);

export default router;
