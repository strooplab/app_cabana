// middleware.ts
import { NextResponse, NextRequest } from "next/server";

/** @type {Map<string, { count: number, last: number }>} */
const rateLimitMap = new Map();
const WINDOW = 15 * 60 * 1000; // 15 minutos
const MAX_REQUESTS = 5;

export function middleware(req) {
  const ip = req.ip ?? "unknown"; // En vercel usa x-forwarded-for

  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry) {
    rateLimitMap.set(ip, { count: 1, last: now });
  } else {
    if (now - entry.last > WINDOW) {
      // se resetea la ventana
      rateLimitMap.set(ip, { count: 1, last: now });
    } else {
      entry.count++;
      entry.last = now;
      if (entry.count > MAX_REQUESTS) {
        return NextResponse.json(
          { message: "Demasiados intentos, inténtalo más tarde." },
          { status: 429 }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/auth", "/api/admin/upload-version"],
};
