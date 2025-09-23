// src/app/api/download/route.ts
import 'dotenv/config';
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";


// 🔹 Cliente Cloudflare R2 (S3 compatible)
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { version_id, download_type } = body;

    if (!version_id || !download_type) {
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
    // 🔹 Obtener versión y URL de archivo
    const version_table = process.env.DB_VERSIONS_TABLE;
    const column1 = process.env.DB_VERSION_COLUMN_1; 
    const column2 = process.env.DB_VERSION_COLUMN_3;
    const column3 = process.env.DB_VERSION_COLUMN_4;
    const result = await pool.query(
      `SELECT ${column2}, ${column3}, ${column1} FROM ${version_table} WHERE id = $1 LIMIT 1`,
      [version_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ message: "Version no encontrada" }, { status: 404 });
    }

    const { apk_package, zip_package } = result.rows[0];
    const fileKey = download_type === "apk" ? apk_package : zip_package;

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
    const downloads_table = process.env.DB_DOWNLOADS_TABLE;
    const columns = Array.from({ length: 4 }, (_, i) => {
      return process.env[`DB_DOWNLOAD_COLUMN_${i + 1}`];
    });
    if (columns.some(c => !c)) {
      throw new Error("Faltan columnas definidas en las variables de entorno")
    }

    await pool.query(
      `INSERT INTO ${downloads_table} (${columns.join(", ")}) 
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
