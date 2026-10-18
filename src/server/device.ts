import "server-only";
import { cookies } from "next/headers";
import { newDeviceToken } from "@/server/huddles";

// One unguessable token per browser, shared across huddles. httpOnly so page
// scripts can't read it; the server only ever stores its hash.
const COOKIE = "huddle_device";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function readDeviceToken(): Promise<string | null> {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

/** Only callable from a Server Function or Route Handler, where cookies can be set. */
export async function ensureDeviceToken(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing) return existing;
  const token = newDeviceToken();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });
  return token;
}
