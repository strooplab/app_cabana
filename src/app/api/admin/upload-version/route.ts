// src/app/api/admin/upload-version/route.ts
import { NextResponse } from "next/server";
import formidable from "formidable";
import { Readable } from "node:stream";
import type { IncomingMessage } from "http";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import pool from "@/lib/db";

export const runtime = "nodejs"; // 🔹 requerido para usar formidable

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
  },
});

export async function POST(req: Request) {
  const form = formidable({
    uploadDir: "/tmp",
    keepExtensions: true,
    maxFileSize: 1024 * 1024 * 1024, // 1 GB
  });

  try {
    // convertir BodyStream (Web API) → Node.js IncomingMessage
    const incoming = Readable.fromWeb(req.body as any) as unknown as IncomingMessage;

    const { fields, files } = await new Promise<{
      fields: formidable.Fields;
      files: formidable.Files;
    }>((resolve, reject) => {
      form.parse(incoming, (err, fields, files) =>
        err ? reject(err) : resolve({ fields, files })
      );
    });

    const version_name = Array.isArray(fields.version_name)
      ? fields.version_name[0]
      : fields.version_name;
    const version_code = Array.isArray(fields.version_code)
      ? fields.version_code[0]
      : fields.version_code;
    const release_notes = Array.isArray(fields.release_notes)
      ? fields.release_notes[0]
      : fields.release_notes;

    const apkFile: formidable.File | undefined = Array.isArray(files.apk_file)
      ? (files.apk_file[0] as formidable.File | undefined)
      : (files.apk_file as formidable.File | undefined);

    const folderFile: formidable.File | undefined = Array.isArray(files.folder_file)
      ? (files.folder_file[0] as formidable.File | undefined)
      : (files.folder_file as formidable.File | undefined);

    if (!version_name || !version_code || !apkFile || !folderFile) {
      return NextResponse.json(
        { message: "Missing required fields or files" },
        { status: 400 }
      );
    }

    const uploadToR2 = async (localPath: string, key: string, contentType: string) => {
      const buffer = fs.readFileSync(localPath);
      const cmd = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType || "application/octet-stream",
      });
      await s3.send(cmd);
      return `https://${process.env.R2_BUCKET}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${encodeURIComponent(
        key
      )}`;
    };

    const apkKey = `releases/${version_name}/${apkFile.originalFilename || apkFile.newFilename}`;
    const zipKey = `releases/${version_name}/${folderFile.originalFilename || folderFile.newFilename}`;

    const apkUrl = await uploadToR2(
      apkFile.filepath ?? "",
      apkKey,
      apkFile.mimetype ?? ""
    );
    const zipUrl = await uploadToR2(
      folderFile.filepath ?? "",
      zipKey,
      folderFile.mimetype ?? ""
    );

    await pool.query(`UPDATE app_versions SET is_active = false WHERE is_active = true`);

    const insertRes = await pool.query(
      `INSERT INTO app_versions (version_name, version_code, apk_url, folder_url, apk_size, folder_size, release_notes, is_active, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW()) RETURNING *`,
      [
        version_name,
        parseInt(String(version_code), 10),
        apkUrl,
        zipUrl,
        apkFile.size,
        folderFile.size,
        release_notes || "",
      ]
    );

    // limpiar archivos temporales
    try {
      fs.unlinkSync(apkFile.filepath);
    } catch {}
    try {
      fs.unlinkSync(folderFile.filepath);
    } catch {}

    return NextResponse.json({
      message: "Version uploaded",
      version: insertRes.rows[0],
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
