import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  generateSessionToken,
  verifyAdminCredentials,
} from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username = "admin", password } = body;

    if (!verifyAdminCredentials(username, password)) {
      return NextResponse.json(
        { error: "Invalid Admin Username or Password! Access Denied by Censor Board." },
        { status: 401 }
      );
    }

    const token = generateSessionToken();
    const response = NextResponse.json({
      success: true,
      message: "CBFC Officer Credentials Verified.",
    });

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Admin login error:", err);
    return NextResponse.json({ error: "Authentication system error" }, { status: 500 });
  }
}
