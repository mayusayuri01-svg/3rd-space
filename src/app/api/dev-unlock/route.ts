// Place at: src/app/api/dev-unlock/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  const secret = process.env.DEV_PASSWORD;
  if (!secret || typeof password !== "string" || password !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
