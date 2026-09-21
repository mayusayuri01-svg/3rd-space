import { cookies } from "next/headers";

const encoder = new TextEncoder();

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.AUTH_SECRET || "3rdspace-change-this-secret";
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(
  role: string,
  displayName: string,
): Promise<string> {
  const payload = btoa(`${role}:${displayName}`);
  const key = await getKey();
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );
  return `${payload}.${bufferToHex(sigBuffer)}`;
}

export async function verifySession(
  token: string,
): Promise<{ role: string; displayName: string } | null> {
  try {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;
    const key = await getKey();
    const sigBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload),
    );
    if (sig !== bufferToHex(sigBuffer)) return null;
    const decoded = atob(payload);
    const [role, ...rest] = decoded.split(":");
    const displayName = rest.join(":");
    if (!role || !displayName) return null;
    return { role, displayName };
  } catch {
    return null;
  }
}

export async function requireStaffSession(): Promise<{
  role: string;
  displayName: string;
} | null> {
  const store = await cookies();
  const token = store.get("3s_session")?.value;
  if (!token) return null;
  return verifySession(token);
}
