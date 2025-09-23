// src/app/api/auth/route.ts
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const auth_table = process.env.DB_AUTH_TABLE;
    const column_1 = process.env.DB_AUTH_COLUMN_1;
    const { password } = await req.json();
    if (!password) {
      return NextResponse.json({ message: "Password is required" }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT ${column_1} FROM ${auth_table} ORDER BY id ASC LIMIT 1`
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
      { expiresIn: "1h" }
    );

    return NextResponse.json({ message: "ok", token });
  } catch (err) {
    console.error("Auth error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
