// pages/api/download.ts
import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// 🔹 Conexión a PostgreSQL en Render
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "midb",
  password: process.env.DB_PASSWORD || "1234",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  ssl: { rejectUnauthorized: false }, // Render requiere SSL
});

// 🔹 Cliente para Cloudflare R2 (S3 compatible)
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { password, version_id, download_type } = req.body;

  if (!version_id || !download_type || !password) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // 🔹 Validar token JWT
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET as string);
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }

  try {
    // 🔹 Validar contraseña contra tabla auth_config
    const authResult = await pool.query(
      `SELECT password_hash FROM auth_config WHERE id = 1 LIMIT 1`
    );

    if (authResult.rows.length === 0) {
      return res.status(500).json({ message: "No auth config found" });
    }

    const isValidPassword = await bcrypt.compare(password, authResult.rows[0].password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // 🔹 Obtener versión y URL de archivo
    const column = download_type === "apk" ? "apk_url" : "folder_url";
    const result = await pool.query(
      `SELECT ${column} as file_key FROM app_versions WHERE id = $1 LIMIT 1`,
      [version_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Version not found" });
    }

    const fileKey = result.rows[0].file_key; // ej: "app_v1.apk" o "folder_v1.zip"

    // 🔹 Generar URL firmada en Cloudflare R2
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: fileKey,
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 10 }); // 10 minutos

    // 🔹 Registrar descarga
    const user_ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress;
    const user_agent = req.headers["user-agent"];

    await pool.query(
      `INSERT INTO downloads (version_id, download_type, user_ip, user_agent) 
       VALUES ($1, $2, $3, $4)`,
      [version_id, download_type, user_ip, user_agent]
    );

    return res.status(200).json({
      message: "Download registered successfully",
      download_url: signedUrl,
    });
  } catch (error) {
    console.error("Download API error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
