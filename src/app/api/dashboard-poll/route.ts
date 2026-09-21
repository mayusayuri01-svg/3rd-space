import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { MenuItem } from "@/models/MenuItem";
import { Setting } from "@/lib/models/Setting";
import { verifySession } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getDb } from "@/lib/mongodb";
import { PCT } from "@/lib/inventory";

// Combined poll endpoint for the admin dashboard's recurring refresh loop.
// Previously each poll tick fired 4 separate serverless invocations
// (/api/orders, /api/shop-status, /api/menu, /api/shop-status/cash-log).
// On Vercel's Fluid Active CPU billing, invocation count and per-request
// init overhead matter even when the DB connection itself is cached —
// so folding all 4 queries into one request/one invocation cuts both
// invocation count and total CPU time roughly 4x for this loop, without
// changing what data the dashboard actually sees.
//
// This intentionally mirrors the "isUnfilteredPoll" branch in
// /api/orders (GET, no query params) — active orders unbounded, terminal
// orders limited to the last 24h — and the paidIn/paidOut total logic
// from /api/shop-status/cash-log. If either of those routes' logic
// changes, update this copy too.

export async function GET(req: NextRequest) {
  const token = req.cookies.get("3s_session")?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Rolling refresh: every successful poll re-issues the cookie with a
  // fresh maxAge, so an actively-used tablet's session effectively never
  // expires — only a device that goes untouched for the full maxAge
  // window (e.g. powered off for months) would need to re-login.

  await connectDB();

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const includeMenu = req.nextUrl.searchParams.get("menu") !== "0";

  const db = await getDb();

  const [orders, shopDoc, menuItems, ingredients] = await Promise.all([
    Order.find({
      archived: { $ne: true },
      $or: [
        { status: { $nin: ["completed", "cancelled"] } },
        { createdAt: { $gte: cutoff } },
      ],
    })
      .sort({ createdAt: -1 })
      .lean(),
    Setting.findOne({ key: "shopStatus" }).lean(),
    // Skip this query entirely when the polling tab (Orders, Analytics,
    // etc.) doesn't need menu data — e.g. a kitchen tablet parked on
    // Orders all shift was pulling the full menu every 25s for nothing.
    includeMenu
      ? MenuItem.find().sort({ category: 1, createdAt: 1 }).lean()
      : Promise.resolve(null),
    db
      .collection("ingredients")
      .find({ active: { $ne: false } })
      .toArray(),
  ]);

  const lowStock = ingredients
    .filter((i: any) => PCT(i) <= (i.lowPct ?? 15))
    .map((i: any) => ({
      _id: String(i._id),
      name: i.name,
      unit: i.unit,
      stock: Math.round(i.stock * 10) / 10,
      pct: Math.round(PCT(i) * 10) / 10,
      out: i.stock <= 0,
    }));

  const doc = shopDoc as any;
  const paidIn = doc?.paidIn ?? [];
  const paidOut = doc?.paidOut ?? [];
  const paidInTotal = paidIn.reduce(
    (s: number, e: any) => s + (e.amount || 0),
    0,
  );
  const paidOutTotal = paidOut.reduce(
    (s: number, e: any) => s + (e.amount || 0),
    0,
  );

  return NextResponse.json({
    orders,
    menuItems: menuItems ?? undefined,
    shopStatus: {
      open: doc?.open ?? false,
      openedAt: doc?.openedAt ?? null,
      shiftDate: doc?.shiftDate ?? null,
      shiftLabel: doc?.shiftLabel ?? "Shift 1",
      startingCash: doc?.startingCash ?? null,
    },
    cashLog: { paidInTotal, paidOutTotal },
    lowStock,
  });
}
