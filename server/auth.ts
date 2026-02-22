import { Request, Response, NextFunction } from "express";
import { decode } from "next-auth/jwt";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const cookieName = process.env.NODE_ENV === "production"
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

    const token = req.cookies?.[cookieName]
      || req.cookies?.["next-auth.session-token"]
      || req.cookies?.["__Secure-next-auth.session-token"];

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        const bearerToken = authHeader.substring(7);
        const decoded = await decode({
          token: bearerToken,
          secret: process.env.NEXTAUTH_SECRET!,
        });

        if (decoded) {
          req.user = {
            id: decoded.id as string,
            email: decoded.email as string,
            name: decoded.name as string,
            role: decoded.role as string,
          };
          return next();
        }
      }

      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = await decode({
      token,
      secret: process.env.NEXTAUTH_SECRET!,
    });

    if (!decoded) {
      return res.status(401).json({ error: "Invalid session" });
    }

    req.user = {
      id: decoded.id as string,
      email: decoded.email as string,
      name: decoded.name as string,
      role: decoded.role as string,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ error: "Authentication failed" });
  }
}

export function adminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || !["admin", "educator", "mentor"].includes(req.user.role)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
