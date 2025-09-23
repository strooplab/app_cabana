import 'dotenv/config';
import pool from "@/lib/db";
import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ message: "Sin token registrado" }, { status: 401 });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET as string);
  } catch {
    return NextResponse.json({ message: "Token inválido" }, { status: 401 });
  }

  try {
    const version_table = process.env.DB_VERSIONS_TABLE;
    const column_active = process.env.DB_VERSION_COLUMN_8;
    const column_date = process.env.DB_VERSION_COLUMN_9;
    const result = await pool.query(
      `SELECT * FROM ${version_table}
       WHERE ${column_active} = true
       ORDER BY ${column_date} DESC
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ message: "No active version found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ message: "Internal server error sistema" }, { status: 500 });
  }
}
