// app/api/inventory/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireStaffSession } from "@/lib/auth";
import { PCT, CAP } from "@/lib/inventory";

export async function GET() {
  const s = await requireStaffSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = await getDb();
  const items = await db
    .collection("ingredients")
    .find({ active: { $ne: false } })
    .sort({ name: 1 })
    .toArray();
  return NextResponse.json(
    items.map((i: any) => ({
      ...i,
      _id: String(i._id),
      capacity: CAP(i),
      pct: Math.round(PCT(i) * 10) / 10,
      low: PCT(i) <= (i.lowPct ?? 15),
    })),
  );
}

export async function POST(req: Request) {
  const s = await requireStaffSession();
  if (!s?.role || s.role !== "admin")
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const db = await getDb();
  const doc = {
    name: String(body.name || "").trim(),
    unit: body.unit || "ml",
    containerSize: Number(body.containerSize) || 0,
    containersPar: Number(body.containersPar) || 1,
    stock: Number(body.stock) || 0,
    lowPct: Number(body.lowPct) || 15,
    wastePct: Number(body.wastePct) || 0,
    cost: Number(body.cost) || 0,
    active: true,
    updatedAt: new Date().toISOString(),
  };
  if (!doc.name || !doc.containerSize)
    return NextResponse.json(
      { error: "name and containerSize required" },
      { status: 400 },
    );
  const r = await db.collection("ingredients").insertOne(doc);
  return NextResponse.json({ ...doc, _id: String(r.insertedId) });
}
