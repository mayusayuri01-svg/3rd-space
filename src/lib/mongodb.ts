import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) throw new Error("MONGODB_URI is not defined");

let cached = (global as any).mongoose || { conn: null, promise: null };
(global as any).mongoose = cached;

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// Native MongoDB driver access, for code that talks to collections directly
// (e.g. lib/inventory.ts) instead of through Mongoose models.
export async function getDb() {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) throw new Error("Mongoose connection has no db instance");
  return db;
}
