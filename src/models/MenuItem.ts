import mongoose, { Schema, model, models } from "mongoose";

const OptionChoiceSchema = new Schema(
  {
    label: { type: String, required: true },
    price: { type: Number, default: 0 },
  },
  { _id: false },
);

const OptionGroupSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ["single", "multi"], default: "single" },
    required: { type: Boolean, default: false },
    max: { type: Number },
    choices: { type: [OptionChoiceSchema], default: [] },
  },
  { _id: false },
);

const RecipeLineSchema = new Schema(
  {
    ingredientId: { type: String, required: true },
    qty: { type: Number, required: true },
  },
  { _id: false },
);

const MenuItemSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    image: { type: String, default: "" },
    available: { type: Boolean, default: true },
    variants: { type: [String], default: [] },
    options: { type: [OptionGroupSchema], default: [] },
    cost: { type: Number, default: null },
    recipe: { type: [RecipeLineSchema], default: [] },
    optionRecipe: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export const MenuItem = models.MenuItem || model("MenuItem", MenuItemSchema);
