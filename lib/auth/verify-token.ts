import { NextRequest } from "next/server";
import { getAdminAuth } from "./firebase-admin";

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  name?: string;
}

export async function verifyAuthToken(req: NextRequest): Promise<AuthenticatedUser> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("UNAUTHORIZED: Missing or malformed Authorization header with Bearer token");
  }

  const token = authHeader.split("Bearer ")[1]?.trim();
  if (!token) {
    throw new Error("UNAUTHORIZED: Bearer token is empty");
  }

  // Allow mock token in TEST mode or DEMO mode if enabled
  if (
    (process.env.NODE_ENV === "test" || process.env.ENABLE_TEST_AUTH === "true") &&
    token.startsWith("test-token-")
  ) {
    return {
      uid: token.replace("test-token-", "user-"),
      email: `${token.replace("test-token-", "")}@vitto.money`,
      name: "Test Officer",
    };
  }

  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    throw new Error("UNAUTHORIZED: Firebase Admin SDK is not initialized on server");
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
    };
  } catch (error: any) {
    throw new Error(`UNAUTHORIZED: Invalid or expired token (${error.message})`);
  }
}
