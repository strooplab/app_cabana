// src/app/api/auth/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    if (!password) {
      return NextResponse.json({ message: "Password is required" }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT password_hash FROM auth_config ORDER BY id ASC LIMIT 1`
    );

    if (!result.rows.length) {
      return NextResponse.json({ message: "No auth config found" }, { status: 500 });
    }

    const { password_hash } = result.rows[0];
    const isValid = await bcrypt.compare(password, password_hash);
    if (!isValid) {
      return NextResponse.json({ message: "Invalid password" }, { status: 401 });
    }

    const token = jwt.sign(
      { role: "admin" },
      process.env.JWT_SECRET as string,
      { expiresIn: "24h" }
    );

    return NextResponse.json({ message: "ok", token });
  } catch (err) {
    console.error("Auth error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
