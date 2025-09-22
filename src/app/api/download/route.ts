// src/app/api/download/route.ts
import 'dotenv/config';
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// 🔹 Cliente Cloudflare R2 (S3 compatible)
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password, version_id, download_type } = body;

    if (!version_id || !download_type || !password) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // 🔹 Validar token JWT
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ message: "No token provided" }, { status: 401 });
    }
    try {
      jwt.verify(token, process.env.JWT_SECRET as string);
    } catch {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    // 🔹 Validar contraseña contra tabla auth_config
    const authResult = await pool.query(
      `SELECT password_hash FROM auth_config WHERE id = 1 LIMIT 1`
    );

    if (authResult.rows.length === 0) {
      return NextResponse.json({ message: "No auth config found" }, { status: 500 });
    }

    const isValidPassword = await bcrypt.compare(password, authResult.rows[0].password_hash);
    if (!isValidPassword) {
      return NextResponse.json({ message: "Invalid password" }, { status: 401 });
    }

    // 🔹 Obtener versión y URL de archivo
    const column = download_type === "apk" ? "apk_url" : "folder_url";
    const result = await pool.query(
      `SELECT ${column} as file_key FROM app_versions WHERE id = $1 LIMIT 1`,
      [version_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ message: "Version not found" }, { status: 404 });
    }

    const fileKey = result.rows[0].file_key;

    // 🔹 Generar URL firmada en Cloudflare R2
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: fileKey,
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 10 }); // 10 min

    // 🔹 Registrar descarga
    const user_ip =
      req.headers.get("x-forwarded-for") || "unknown";
    const user_agent = req.headers.get("user-agent") || "unknown";

    await pool.query(
      `INSERT INTO downloads (version_id, download_type, user_ip, user_agent) 
       VALUES ($1, $2, $3, $4)`,
      [version_id, download_type, user_ip, user_agent]
    );

    return NextResponse.json({
      message: "Download registered successfully",
      download_url: signedUrl,
    });
  } catch (error) {
    console.error("Download API error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
