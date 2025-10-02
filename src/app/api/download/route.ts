// src/app/api/download/route.ts
import 'dotenv/config';
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

export const runtime = "nodejs";

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
    const version_table = process.env.DB_VERSIONS_TABLE!;
    const col_version_name = process.env.DB_VERSION_COLUMN_1!;
    const col_apk = process.env.DB_VERSION_COLUMN_3!;
    const col_folder = process.env.DB_VERSION_COLUMN_4!;
    const col_manual = process.env.DB_VERSION_COLUMN_10!;

    // SELECT bien formado y con alias
    const q = `SELECT ${col_version_name} AS version_name,
                      ${col_apk}   AS apk_column,
                      ${col_folder} AS folder_column,
                      ${col_manual} AS manual_column
               FROM ${version_table} WHERE id = $1 LIMIT 1`;
    const result = await pool.query(q, [version_id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ message: "Version no encontrada" }, { status: 404 });
    }

    const row = result.rows[0];
    const versionName: string = row.version_name;
    const apk_column: string | null = row.apk_column;
    const folder_column: string | null = row.folder_column;
    const manual_column: string | null = row.manual_column;

    const getBasename = (v: string) => {
      try {
        if (v.includes("://")) return path.basename(new URL(v).pathname);
      } catch {}
      return path.basename(v);
    };

    let fileKey: string | null = null;
    if (download_type === "apk") {
      if (!apk_column) return NextResponse.json({ message: "APK no disponible" }, { status: 404 });
      const base = getBasename(apk_column);
      fileKey = apk_column.startsWith("releases/") ? apk_column : `releases/${versionName}/${base}`;
    } else if (download_type === "zip" || download_type === "folder") {
      if (!folder_column) return NextResponse.json({ message: "ZIP no disponible" }, { status: 404 });
      const base = getBasename(folder_column);
      fileKey = folder_column.startsWith("releases/") ? folder_column : `releases/${versionName}/${base}`;
    } else if (download_type === "manual") {
      if (!manual_column) return NextResponse.json({ message: "Manual no disponible" }, { status: 404 });
      const base = getBasename(manual_column);
      fileKey = manual_column.startsWith("releases/") ? manual_column : `releases/${versionName}/manuals/${base}`;
    } else {
      return NextResponse.json({ message: "Tipo de descarga inválido" }, { status: 400 });
    }

    if (!fileKey) {
      throw new Error(`Archivo no encontrado. version_id=${version_id}, tipo=${download_type}`);
    }


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
      return process.env[`DB_DOWNLOADS_COLUMN_${i + 1}`];
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