import { Router } from "express";
import {
  createEmergency,
  getEmergency,
  updateEmergency,
  resolveEmergency,
} from "../controllers/emergency.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);
router.post("/", createEmergency);
router.get("/:id", getEmergency);
router.put("/:id", updateEmergency);
router.patch("/:id/resolve", resolveEmergency);

export default router;
