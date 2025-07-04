import express from "express";
import {
    checkAuth,
    login,
    signup,
    updateProfile,
    getAllUsers, // ✅ add this import
} from "../controllers/userController.js";

import { protectRoute } from "../middleware/auth.js";

const userRouter = express.Router();

userRouter.post("/signup", signup);
userRouter.post("/login", login);
userRouter.put("/update-profile", protectRoute, updateProfile);
userRouter.get("/check", protectRoute, checkAuth);
userRouter.get("/users", protectRoute, getAllUsers); // ✅ NEW route

export default userRouter;