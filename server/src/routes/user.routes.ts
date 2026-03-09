import { Router } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth.middleware";
import User from "../models/User";

const router = Router();

router.use(authMiddleware);

router.get("/profile", async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const user = await User.findById(authReq.user?.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user });
  } catch {
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

export default router;
