import { Router } from "express";
import * as authController from "./auth.controller";

const router = Router();
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/google", authController.loginWithGoogle);
router.post("/refresh", authController.refreshToken);

export default router;
