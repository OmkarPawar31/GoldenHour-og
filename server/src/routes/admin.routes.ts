import { Router } from "express";
import { getDashboard, getAllUsers, getAllSessions } from "../controllers/admin.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { roleMiddleware } from "../middleware/role.middleware";

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware("admin"));

router.get("/dashboard", getDashboard);
router.get("/users", getAllUsers);
router.get("/sessions", getAllSessions);

export default router;
