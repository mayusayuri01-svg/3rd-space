// lib/inventory.ts
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const CAP = (i: any) => (i.containerSize || 1) * (i.containersPar || 1);
export const PCT = (i: any) => (CAP(i) > 0 ? (i.stock / CAP(i)) * 100 : 0);

export async function applyMoves(
  moves: {
    ingredientId: string;
    type: string;
    qty: number;
    note?: string;
    orderId?: string;
    staffName?: string;
  }[],
) {
  if (!moves.length) return [];
  const db = await getDb();
  const at = new Date().toISOString();
  const crossed: any[] = [];

  for (const m of moves) {
    const _id = new ObjectId(m.ingredientId);
    const before = await db.collection("ingredients").findOne({ _id });
    if (!before) continue;

    const after = await db
      .collection("ingredients")
      .findOneAndUpdate(
        { _id },
        { $inc: { stock: m.qty }, $set: { updatedAt: at } },
        { returnDocument: "after" },
      );

    await db.collection("stock_moves").insertOne({ ...m, at });

    const doc = (after as any)?.value ?? after;
    const low = doc.lowPct ?? 15;
    // only fire when it CROSSES the threshold downward — not every sale after
    if (PCT(before) > low && PCT(doc) <= low) crossed.push(doc);
  }
  return crossed;
}

// Resolve a completed order's items -> ingredient deductions
export async function movesForOrder(order: any) {
  const db = await getDb();
  // Mongoose model "MenuItem" is stored in the "menuitems" collection
  // (was "menu", which is a different/empty collection → no deductions).
  const menu = await db.collection("menuitems").find({}).toArray();
  const ings = await db.collection("ingredients").find({}).toArray();
  const byId = new Map(ings.map((i: any) => [String(i._id), i]));
  const acc = new Map<string, number>();

  const add = (id: string, qty: number) => {
    const ing = byId.get(id);
    if (!ing) {
      console.log(
        "[inventory] recipe ingredientId not found in ingredients:",
        id,
      );
      return;
    }
    const waste = 1 + (ing.wastePct || 0) / 100; // calibration allowance
    acc.set(id, (acc.get(id) || 0) + qty * waste);
  };

  for (const it of order.items || []) {
    // item names carry customizations in parens — match on the base name
    const base = it.name
      .replace(/\s*\(.*\)\s*$/, "")
      .trim()
      .toLowerCase();
    const mi = menu.find(
      (m: any) =>
        m.name.toLowerCase() === base || base.startsWith(m.name.toLowerCase()),
    );
    if (!mi) {
      console.log(
        "[inventory] no menu match for order item:",
        it.name,
        "| menu items loaded:",
        menu.length,
      );
      continue;
    }
    if (!(mi.recipe || []).length)
      console.log("[inventory] menu item has NO recipe:", mi.name);

    for (const r of mi.recipe || [])
      add(String(r.ingredientId), r.qty * it.quantity);

    for (const c of it.customizations || []) {
      const key = `${c.type}:${c.label}`;
      for (const r of mi.optionRecipe?.[key] || [])
        add(String(r.ingredientId), r.qty * it.quantity);
    }
  }

  console.log(
    "[inventory] moves for order",
    String(order._id),
    "=>",
    acc.size,
    "ingredient(s)",
  );
  return Array.from(acc.entries()).map(([ingredientId, qty]) => ({
    ingredientId,
    type: "sale" as const,
    qty: -Math.round(qty * 100) / 100,
    orderId: String(order._id),
  }));
}
