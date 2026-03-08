import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/profile", (req, res) => {
  res.json({ message: "User profile" });
});

export default router;
