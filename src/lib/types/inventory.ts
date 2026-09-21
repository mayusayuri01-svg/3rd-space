// lib/types/inventory.ts
export type Unit = "ml" | "g" | "tbag" | "pcs";

export type Ingredient = {
  _id: string;
  name: string; // "Coffee Beans", "Oatside", "DaVinci Vanilla Syrup"
  unit: Unit;
  containerSize: number; // 1000 (g), 1000 (ml), 2000 (ml), 700 (ml)
  containersPar: number; // how many full containers = 100% (default 1)
  stock: number; // CURRENT qty in base unit
  lowPct: number; // default 15
  wastePct: number; // calibration shrinkage, e.g. 4 = 4% extra consumed
  cost?: number; // ₱ per container, for COGS later
  active: boolean;
  updatedAt: string;
};

export type StockMove = {
  _id: string;
  ingredientId: string;
  type: "sale" | "waste" | "calibration" | "restock" | "adjust";
  qty: number; // signed, base unit (negative = out)
  note?: string;
  orderId?: string;
  staffName?: string;
  at: string;
};
