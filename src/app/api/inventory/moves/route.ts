// app/api/inventory/moves/route.ts — history for one ingredient
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireStaffSession } from "@/lib/auth";

export async function GET(req: Request) {
  const s = await requireStaffSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("ingredientId");
  const db = await getDb();
  const moves = await db
    .collection("stock_moves")
    .find(id ? { ingredientId: id } : {})
    .sort({ at: -1 })
    .limit(200)
    .toArray();
  return NextResponse.json(
    moves.map((m: any) => ({ ...m, _id: String(m._id) })),
  );
}
