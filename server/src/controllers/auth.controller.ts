import { Request, Response } from "express";

export async function register(req: Request, res: Response) {
  // TODO: Implement registration
  res.status(201).json({ message: "User registered" });
}

export async function login(req: Request, res: Response) {
  // TODO: Implement login
  res.json({ message: "Login successful" });
}
