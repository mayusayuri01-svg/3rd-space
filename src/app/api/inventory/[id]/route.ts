// app/api/inventory/[id]/route.ts  — edit fields (admin)
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireStaffSession } from "@/lib/auth";

const FIELDS = [
  "name",
  "unit",
  "containerSize",
  "containersPar",
  "lowPct",
  "wastePct",
  "cost",
  "active",
];

// Next.js 15: `params` is a Promise and must be awaited.
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const s = await requireStaffSession();
  if (s?.role !== "admin")
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!ObjectId.isValid(id))
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  const body = await req.json();
  const $set: any = { updatedAt: new Date().toISOString() };
  for (const f of FIELDS) if (body[f] !== undefined) $set[f] = body[f];
  const db = await getDb();
  const r = await db
    .collection("ingredients")
    .findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set },
      { returnDocument: "after" },
    );
  const doc = (r?.value ?? r) as any;
  if (!doc) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ ...doc, _id: String(doc._id) });
}

export async function DELETE(_: Request, { params }: Ctx) {
  const s = await requireStaffSession();
  if (s?.role !== "admin")
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!ObjectId.isValid(id))
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  const db = await getDb();
  await db
    .collection("ingredients")
    .updateOne({ _id: new ObjectId(id) }, { $set: { active: false } });
  return NextResponse.json({ ok: true });
}
