"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const User_1 = __importDefault(require("../models/User"));
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
router.get("/profile", async (req, res) => {
    try {
        const authReq = req;
        const user = await User_1.default.findById(authReq.user?.id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ user });
    }
    catch {
        res.status(500).json({ message: "Failed to fetch profile" });
    }
});
exports.default = router;
