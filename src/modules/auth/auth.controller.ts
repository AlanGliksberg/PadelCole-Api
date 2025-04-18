import { Request, Response } from 'express';
import * as authService from './auth.service';

export const register = async (req: Request, res: Response) => {
  const user = await authService.register(req.body);
  res.status(201).json(user);
};

export const login = async (req: Request, res: Response) => {
  const token = await authService.login(req.body);
  res.json({ token });
};

export const loginWithGoogle = async (req: Request, res: Response) => {
  const token = await authService.loginWithGoogle(req.body.idToken);
  res.json({ token });
};
