// src/app/api/menu/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { MenuItem } from "@/models/MenuItem";
import mongoose from "mongoose";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
    }

    await connectDB();
    const body = await req.json();
    const allowed = [
      "name",
      "description",
      "price",
      "cost",
      "category",
      "image",
      "available",
      "variants",
      "options",
      "recipe", // ← was missing: recipe edits were silently dropped
      "optionRecipe",
    ];
    const update: Record<string, any> = {};
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    const item = await MenuItem.findByIdAndUpdate(id, update, { new: true });
    if (!item)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Menu PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
    }

    await connectDB();
    const item = await MenuItem.findByIdAndDelete(id);
    if (!item)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Menu DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 },
    );
  }
}