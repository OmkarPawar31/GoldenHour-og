import { Router } from "express";
import { updateLocation, getTrackingInfo } from "../controllers/tracking.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);
router.post("/location", updateLocation);
router.get("/session/:sessionId", getTrackingInfo);

export default router;
