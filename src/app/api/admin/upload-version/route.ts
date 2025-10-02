// src/app/api/admin/upload-version/route.ts
import { NextResponse } from "next/server";
import {
  S3Client,
  DeleteObjectCommand
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import ApkReader from "adbkit-apkreader";
import pool from "@/lib/db";
import path from "path";

export const runtime = "nodejs";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
  },
});

async function extractApkInfoFromFilepath(filePath: string) {
  const reader = await ApkReader.open(filePath); 
  const manifest = await reader.readManifest();
  return {
    versionName: manifest.versionName || "1.0.0",
    versionCode: Number(manifest.versionCode) || 1,
    packageName: manifest.package || "unknown",
  };
}

async function deleteExistingZip(zipKey: string) {
  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: zipKey,
      })
    );
    console.log(`✅ Archivo ${zipKey} eliminado exitosamente.`);
  } catch (err) {
    console.error(`❌ Error al eliminar el archivo ${zipKey}:`, err);
  }
}

async function uploadToR2(file: File, key: string) {
  const arr = await file.arrayBuffer();
  const body = Buffer.from(arr);
  

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      Body: body,
      ContentType: file.type || "application/zip",
    },
    leavePartsOnError: false,
  });

  upload.on("httpUploadProgress", (progress) => {
    console.log("Progreso de subida:", progress);
  });

  await upload.done();

  // construir URL final en formato path-style
  return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${encodeURIComponent(key)}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Request body:", body);
    const {
      versionName: clientVersionName,
      releaseNotes,
      apkFile,
      folderFile,
      manualFile,
      apkUrl,
      folderUrl,
      manualUrl,
      apkSize,
      folderSize,
      manualSize
    } = body;

    const apkName = apkFile || (apkUrl ? path.basename(apkUrl) : null);
    const folderName = folderFile || (folderUrl ? path.basename(folderUrl) : null);
    const manualName = manualFile || (manualUrl ? path.basename(manualUrl) : null);
    if (!apkName || !folderName) {
      console.error("Faltan apkName o folderName:", { apkName, folderName });
      return NextResponse.json({ error: "Missing apk or folder filename" }, { status: 400 });
    }

    const version_table = process.env.DB_VERSIONS_TABLE!;
    const columns = Array.from({ length: 11 }, (_, i) =>
      process.env[`DB_VERSION_COLUMN_${i + 1}`] || ""
    ) as string[];

    const finalVersionName = clientVersionName || "1.0.0";

    let versionCode: number;
    const lastActive = await pool.query(
      `SELECT ${columns[1]} FROM ${version_table} ORDER BY ${columns[8]} DESC LIMIT 1`
    );
    if (lastActive.rows.length > 0) {
      // columns[1] es version_code, columns[7] es is_active, columns[8] es created_at (según tus env)
      versionCode = Number(lastActive.rows[0][columns[1]]) + 1;
    } else {
      // fallback: usar MAX(version_code)
      const maxRes = await pool.query(
        `SELECT MAX(${columns[1]}) AS max_code FROM ${version_table}`
      );
      versionCode = (Number(maxRes.rows[0].max_code) || 0) + 1;
    }

    console.log("Servidor: versionName=", finalVersionName, "versionCode=", versionCode);

    // Desactivar versiones anteriores
    await pool.query(
      `UPDATE ${version_table} SET ${columns[7]} = false WHERE ${columns[7]} = true`
    );

    // Insertar nueva versión
    const result = await pool.query(
      `INSERT INTO ${version_table} (${columns.join(", ")})
       VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW(),$8,$9)
       RETURNING *`,
      [
        finalVersionName,
        versionCode,
        apkName,
        folderName,
        apkSize ?? null,
        folderSize ?? null,
        releaseNotes ?? "",
        manualName ?? null,
        manualSize ?? null,
      ]
    );

    
    if (result.rows.length === 0) {
      console.error("No se insertó ninguna fila");
      return NextResponse.json({ error: "Insertion failed" }, { status: 500 });
    }

    console.log("Fila insertada", result.rows[0]); 

    return NextResponse.json({ message: "Versión registrada", version: result.rows[0] });
    
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error("Error en upload-version:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

