import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Discount } from "@/models/Discount";
import { verifySession } from "@/lib/auth";

async function requireStaffSession(req: NextRequest) {
  const token = req.cookies.get("3s_session")?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  await connectDB();
  const discounts = await Discount.find().sort({ createdAt: 1 });
  return NextResponse.json(discounts);
}

export async function POST(req: NextRequest) {
  const authError = await requireStaffSession(req);
  if (authError) return authError;

  await connectDB();
  const { name, type, percentage, amountOff } = await req.json();
  const discountType = type === "fixed" ? "fixed" : "percentage";
  if (!name)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (discountType === "percentage" && !percentage)
    return NextResponse.json({ error: "Missing percentage" }, { status: 400 });
  if (discountType === "fixed" && !amountOff)
    return NextResponse.json({ error: "Missing amount" }, { status: 400 });
  const discount = await Discount.create({
    name,
    type: discountType,
    ...(discountType === "percentage" ? { percentage } : { amountOff }),
  });
  return NextResponse.json(discount, { status: 201 });
}
