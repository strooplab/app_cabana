// src/app/api/admin/upload-version/route.ts
import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import pool from "../../../../lib/db";

export const runtime = "nodejs"; // aseguramos Node runtime

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
  },
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const version_name = formData.get("version_name")?.toString();
    const version_code = formData.get("version_code")?.toString();
    const release_notes = formData.get("release_notes")?.toString() || "";

    const apkFile = formData.get("apk_file") as File | null;
    const folderFile = formData.get("folder_file") as File | null;

    if (!version_name || !version_code || !apkFile || !folderFile) {
      return NextResponse.json(
        { message: "Missing required fields or files" },
        { status: 400 }
      );
    }

    // helper para subir a R2
    const uploadToR2 = async (file: File, key: string) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const cmd = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      });
      await s3.send(cmd);
      return `https://${process.env.R2_BUCKET}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${encodeURIComponent(
        key
      )}`;
    };

    const apkKey = `releases/${version_name}/${apkFile.name}`;
    const zipKey = `releases/${version_name}/${folderFile.name}`;

    const apkUrl = await uploadToR2(apkFile, apkKey);
    const zipUrl = await uploadToR2(folderFile, zipKey);

    // desactivar versiones previas
    await pool.query(`UPDATE app_versions SET is_active = false WHERE is_active = true`);

    // insertar nueva versión
    const insertRes = await pool.query(
      `INSERT INTO app_versions 
        (version_name, version_code, apk_url, folder_url, apk_size, folder_size, release_notes, is_active, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW()) 
       RETURNING *`,
      [
        version_name,
        parseInt(version_code, 10),
        apkUrl,
        zipUrl,
        apkFile.size,
        folderFile.size,
        release_notes,
      ]
    );

    return NextResponse.json({
      message: "Version uploaded",
      version: insertRes.rows[0],
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { message: "Internal server error", error: err.message },
      { status: 500 }
    );
  }
}
