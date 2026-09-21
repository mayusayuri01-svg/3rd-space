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

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const s = await requireStaffSession();
  if (s?.role !== "admin")
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const $set: any = { updatedAt: new Date().toISOString() };
  for (const f of FIELDS) if (body[f] !== undefined) $set[f] = body[f];
  const db = await getDb();
  const r = await db
    .collection("ingredients")
    .findOneAndUpdate(
      { _id: new ObjectId(params.id) },
      { $set },
      { returnDocument: "after" },
    );
  const doc = (r?.value ?? r) as any;
  if (!doc) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ ...doc, _id: String(doc._id) });
}

export async function DELETE(
  _: Request,
  { params }: { params: { id: string } },
) {
  const s = await requireStaffSession();
  if (s?.role !== "admin")
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = await getDb();
  await db
    .collection("ingredients")
    .updateOne({ _id: new ObjectId(params.id) }, { $set: { active: false } });
  return NextResponse.json({ ok: true });
}
