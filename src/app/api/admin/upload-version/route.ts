// src/app/api/admin/upload-version/route.ts
import { NextResponse } from "next/server";
import {
  S3Client,
  DeleteObjectCommand
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import ApkReader from "adbkit-apkreader";
import fs from "fs";
import path from "path";
import os from "os";
import pool from "@/lib/db";

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

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const folderFile = formData.get("folder_file") as File | null;
    const replaceZipFlag = formData.get("replace_zip")?.toString() === "true";
    const apkFile = formData.get("apk_file") as File | null;

    if (replaceZipFlag && !folderFile) {
      return NextResponse.json(
        { message: "Missing zip file when replace_zip = true" },
        { status: 400 }
      );
    }

    const version_table = process.env.DB_VERSIONS_TABLE!;
    const columns = Array.from({ length: 9 }, (_, i) =>
      process.env[`DB_VERSION_COLUMN_${i + 1}`]
    );
    if (columns.some((c) => !c)) {
      throw new Error("Faltan columnas definidas");
    }

    let versionName: string;
    let versionCode: number;

    if (apkFile) {
      const arr = await apkFile.arrayBuffer();
      const buf = Buffer.from(arr);
      const tmpDir = os.tmpdir();
      const tmpFileName = `${Date.now()}-${apkFile.name}`;
      const tmpFilePath = path.join(tmpDir, tmpFileName);
      fs.writeFileSync(tmpFilePath, buf);
      const info = await extractApkInfoFromFilepath(tmpFilePath);
      versionName = info.versionName;
      versionCode = info.versionCode;
      fs.unlinkSync(tmpFilePath);
    } else {
      const res = await pool.query(
        `SELECT ${columns[0]}, ${columns[1]} FROM ${version_table} WHERE ${columns[7]} = true LIMIT 1`
      );
      if (res.rows.length === 0) {
        return NextResponse.json(
          { message: "No active version found" },
          { status: 404 }
        );
      }
      versionName = res.rows[0][columns[0]];
      versionCode = res.rows[0][columns[1]];
    }

    let newZipUrl: string | null = null;
    let newZipName: string | null = null;
    let folderSize: number | null = null;

    if (replaceZipFlag && folderFile) {
      if (!folderFile.name){
        console.warn("folderFile.name no definido")
      }
      newZipName = folderFile.name;
      folderSize = folderFile.size;
      const zipKey = `releases/${versionName}/${newZipName}`;

      // eliminar viejo
      await deleteExistingZip(zipKey);

      // Usa Upload multipart
      const upload = new Upload({
        client: s3,
        params: {
          Bucket: process.env.R2_BUCKET!,
          Key: zipKey,
          Body: folderFile,  // File es soportado por Upload según librería :contentReference[oaicite:1]{index=1}
          ContentType: folderFile.type || "application/zip",
        },
        leavePartsOnError: false,
      });

      upload.on("httpUploadProgress", (progress) => {
        console.log("Progress:", progress);
      });

      await upload.done();

      newZipUrl = `https://${process.env.R2_BUCKET}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${encodeURIComponent(
        zipKey
      )}`;
    }else{
      console.log("No se reemplazará ZIP - replaceZipFlag:", replaceZipFlag, "folderFile:", folderFile);
    }

    // Desactivar versiones anteriores
    await pool.query(
      `UPDATE ${version_table} SET ${columns[7]} = false WHERE ${columns[7]} = true`
    );

    // Obtener datos APK previos si no cambió
    let apkName = "";
    let apkSize: number | null = null;
    if (!apkFile) {
      const prev = await pool.query(
        `SELECT ${columns[2]}, ${columns[4]} FROM ${version_table} WHERE ${columns[7]} = false ORDER BY ${columns[8]} DESC LIMIT 1`
      );
      if (prev.rows.length > 0) {
        const prevUrl = prev.rows[0][columns[2]];
        apkName = prevUrl ? path.basename(prevUrl) : "";
        apkSize = prev.rows[0][columns[4]];
      }
    } else {
      apkName = apkFile.name;
      apkSize = apkFile.size;
    }

    const result = await pool.query(
      `INSERT INTO ${version_table} (${columns.join(", ")})
       VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW())
       RETURNING *`,
      [
        versionName,
        versionCode,
        apkName,
        newZipName ?? "ingenio_la_cabana.zip",
        apkSize,
        folderSize ?? 587181348,
        formData.get("release_notes")?.toString() || "",
      ]
    );

    return NextResponse.json({
      message: "Zip reemplazado con éxito (multipart)",
      version: result.rows[0],
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error("Error en upload-version:", err);
    return NextResponse.json(
      { message: "Internal server error", error: err.message },
      { status: 500 }
    );
  }
}
