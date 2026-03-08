import { Request, Response, NextFunction } from "express";

export function roleMiddleware(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // TODO: Extract user role from token/request
    const userRole = "user"; // placeholder

    if (!roles.includes(userRole)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    next();
  };
}
