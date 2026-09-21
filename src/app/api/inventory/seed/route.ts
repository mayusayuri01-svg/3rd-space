// app/api/inventory/seed/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireStaffSession } from "@/lib/auth";

// containerSize is in the ingredient's BASE unit. wastePct is the
// calibration allowance silently added to every deduction — beans lose the
// most (grind retention + purge shots), pumped bottles lose a little to
// line drip, and countables like tea bags / cups lose nothing.
const SEED = [
  // name,                            unit,   size, waste%
  ["Coffee Beans", "g", 1000, 5],
  ["Oatside", "ml", 1000, 2],

  ["DaVinci Sauce — Salted Caramel", "ml", 2000, 2],
  ["DaVinci Sauce — White Chocolate", "ml", 2000, 2],
  ["DaVinci Sauce — Chocolate", "ml", 2000, 2],

  ["DaVinci Syrup — Roasted Almond", "ml", 700, 2],
  ["DaVinci Syrup — Vanilla", "ml", 700, 2],
  ["DaVinci Syrup — Caramel", "ml", 700, 2],
  ["DaVinci Syrup — French Vanilla", "ml", 700, 2],

  ["Sweetener", "ml", 1000, 2],
  ["Chocolate Powder", "g", 1000, 3],
  ["Honey", "g", 250, 3],
  ["Biscoff Cream", "g", 400, 3],
  ["Matcha Powder", "g", 100, 3], // ← confirm tin size
  ["Orange Syrup", "ml", 1000, 2],
  ["Strawberry Syrup", "ml", 1000, 2],
  ["Tea Bags", "tbag", 100, 0], // ← confirm box count
  ["Banana Puree", "ml", 1000, 2],
  ["Lemon Syrup", "ml", 2000, 2],
  ["Blueberry", "ml", 2000, 2],
  ["Peach", "ml", 2000, 2],
  ["Green Apple", "ml", 2000, 2],
  ["All Purpose Cream", "ml", 250, 2],
  ["Cups", "pcs", 50, 0],
] as const;

export async function POST() {
  const s = await requireStaffSession();
  if (s?.role !== "admin")
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = await getDb();
  const at = new Date().toISOString();
  let created = 0;

  for (const [name, unit, containerSize, wastePct] of SEED) {
    const existing = await db.collection("ingredients").findOne({ name });
    if (existing) {
      // Update the spec fields only — never overwrite a live stock count.
      await db
        .collection("ingredients")
        .updateOne(
          { _id: existing._id },
          {
            $set: {
              unit,
              containerSize,
              wastePct,
              active: true,
              updatedAt: at,
            },
          },
        );
      continue;
    }
    await db.collection("ingredients").insertOne({
      name,
      unit,
      containerSize,
      containersPar: 1,
      stock: 0, // staff set the real count via Recount/Restock
      lowPct: 15,
      wastePct,
      cost: 0,
      active: true,
      updatedAt: at,
    });
    created++;
  }

  return NextResponse.json({ ok: true, created, total: SEED.length });
}
