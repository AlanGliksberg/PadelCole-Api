import { Response } from "express";
import * as authService from "./auth.service";
import { ErrorResponse, OkResponse } from "../../types/response";
import { Request } from "../../types/common";
import { RefreshTokenDTO, RegisterDTO, ChangePasswordDTO } from "../../types/auth";

export const register = async (req: Request<RegisterDTO>, res: Response) => {
  try {
    const user = await authService.register(req.body);
    res.status(200).json(new OkResponse(user));
  } catch (e: any) {
    console.log(e);
    res.status(500).json(new ErrorResponse("Register error", e));
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const token = await authService.login(req.body);
    res.status(200).json(new OkResponse({ token }));
  } catch (e: any) {
    console.log(e);
    res.status(500).json(new ErrorResponse("Login error", e));
  }
};

export const loginWithGoogle = async (req: Request, res: Response) => {
  try {
    const token = await authService.loginWithGoogle(req.body.idToken);
    res.status(200).json(new OkResponse({ token }));
  } catch (e: any) {
    console.log(e);
    res.status(500).json(new ErrorResponse("Google error", e));
  }
};

export const refreshToken = async (req: Request<RefreshTokenDTO>, res: Response) => {
  try {
    const token = await authService.refreshToken(req.body.token);
    res.status(200).json(new OkResponse({ token }));
  } catch (e: any) {
    console.log(e);
    res.status(500).json(new ErrorResponse("Refresh error", e));
  }
};

export const changePassword = async (req: Request<ChangePasswordDTO>, res: Response) => {
  try {
    await authService.changePassword(req.user.id, req.body);
    res.status(200).json(new OkResponse());
  } catch (e: any) {
    console.log(e);
    res.status(500).json(new ErrorResponse("Error al cambiar contraseña", e));
  }
};
