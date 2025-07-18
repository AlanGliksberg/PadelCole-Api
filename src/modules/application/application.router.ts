import { Router } from "express";
import * as applicationController from "./application.controller";

const router = Router();
router.post("/", applicationController.applyToMatch);
router.put("/accept/:id", applicationController.acceptApplication);
router.put("/reject/:id", applicationController.rejectApplication);

export default router;
