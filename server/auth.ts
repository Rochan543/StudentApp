import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET || "lms-secret-key-change-me";
const JWT_ACCESS_EXPIRES = "1h";
const JWT_REFRESH_EXPIRES = "7d";

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(userId: number, role: string): string {
  return jwt.sign({ userId, role, type: "access" }, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRES });
}

export function generateRefreshToken(userId: number, role: string): string {
  return jwt.sign({ userId, role, type: "refresh" }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });
}

export function generateTokens(userId: number, role: string) {
  return {
    accessToken: generateAccessToken(userId, role),
    refreshToken: generateRefreshToken(userId, role),
  };
}

export function generateToken(userId: number, role: string): string {
  return generateAccessToken(userId, role);
}

export function verifyToken(token: string): { userId: number; role: string; type?: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number; role: string; type?: string };
  } catch {
    return null;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: { userId: number; role: string };
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  req.user = decoded;
  next();
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}
