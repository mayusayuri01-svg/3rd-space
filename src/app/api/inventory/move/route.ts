// app/api/inventory/move/route.ts — restock / waste / calibration / adjust
import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { applyMoves } from "@/lib/inventory";

export async function POST(req: Request) {
  const s = await requireStaffSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { ingredientId, type, qty, note } = await req.json();

  if (!["restock", "waste", "calibration", "adjust"].includes(type))
    return NextResponse.json({ error: "bad type" }, { status: 400 });
  const n = Number(qty);
  if (!n || n <= 0)
    return NextResponse.json({ error: "qty required" }, { status: 400 });
  if (type !== "restock" && !String(note || "").trim())
    return NextResponse.json({ error: "note required" }, { status: 400 });

  const signed = type === "restock" ? n : -n;
  const crossed = await applyMoves([
    { ingredientId, type, qty: signed, note, staffName: s.displayName },
  ]);
  return NextResponse.json({ ok: true, crossed });
}
