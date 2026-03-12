import { Router } from "express";
import {
  createEmergency,
  getEmergency,
  getActiveEmergencies,
  updateEmergency,
  resolveEmergency,
  create102CallEmergency,
  assignAmbulanceToEmergency,
} from "../controllers/emergency.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);
router.post("/", createEmergency);
router.post("/102-call", create102CallEmergency);
router.post("/:id/assign-ambulance", assignAmbulanceToEmergency);
router.get("/active", getActiveEmergencies);
router.get("/:id", getEmergency);
router.put("/:id", updateEmergency);
router.patch("/:id/resolve", resolveEmergency);

export default router;
