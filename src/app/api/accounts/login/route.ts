import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password)
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    await connectDB();
    const db = mongoose.connection.db!;
    const account = await db
      .collection("accounts")
      .findOne({ username: username.trim().toLowerCase() });

    if (!account)
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );

    const valid = await bcrypt.compare(password, account.passwordHash);
    if (!valid)
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );

    const { signSession } = await import("@/lib/auth");
    const token = await signSession(account.role, account.displayName);
    const res = NextResponse.json({
      role: account.role,
      displayName: account.displayName,
    });
    res.cookies.set("3s_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      domain:
        process.env.NODE_ENV === "production" ? ".3rdspace.shop" : undefined,
      maxAge: 60 * 60 * 24 * 365, // 1 year — this tablet runs 24/7 at the register;
      // a short expiry just means staff get logged out mid-shift with no warning
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
