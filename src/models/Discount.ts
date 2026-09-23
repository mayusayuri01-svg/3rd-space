import mongoose, { Schema, model, models } from "mongoose";

const DiscountSchema = new Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
      default: "percentage",
    },
    percentage: { type: Number, min: 1, max: 100 },
    amountOff: { type: Number, min: 1 },
  },
  { timestamps: true },
);

export const Discount = models.Discount || model("Discount", DiscountSchema);
