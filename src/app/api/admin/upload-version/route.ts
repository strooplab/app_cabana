// src/app/api/admin/upload-version/route.ts
import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import ApkReader from "adbkit-apkreader";
import pool from "@/lib/db";

export const runtime = "nodejs"; // Node runtime

// Inicialización del cliente S3 para Cloudflare R2
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
  },
});

// Extrae información del APK (metadata de AndroidManifest.xml)
async function extractApkInfo(apkFile: File) {
  const buffer = Buffer.from(await apkFile.arrayBuffer());
  const reader = await ApkReader.open(buffer);
  const manifest = await reader.readManifest();

  return {
    versionName: manifest.versionName,
    versionCode: Number(manifest.versionCode),
    packageName: manifest.package,
  };
}

// Manejo de la solicitud POST para subir una nueva versión de la app
export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    // // const version_name = formData.get("version_name")?.toString();
    // const version_name = '1.0.0'; // Temporalmente fijo

    // // const version_code = formData.get("version_code")?.toString();
    // const version_code = '100'; // Temporalmente fijo

    // // const release_notes = formData.get("release_notes")?.toString() || "";
    // const release_notes = "Version inicial 1.0.0"; // Temporalmente fijo

    // Archivos
    const apkFile = formData.get("apk_file") as File | null;
    const folderFile = formData.get("folder_file") as File | null;

    if (!apkFile || !folderFile) {
      return NextResponse.json(
        { message: "Missing required fields or files" },
        { status: 400 }
      );
    }

    const apkInfo = await extractApkInfo(apkFile);
    const version_table = process.env.DB_VERSIONS_TABLE;
    const version_name = apkInfo.versionName;
    const version_code = apkInfo.versionCode;
    const release_notes =
      formData.get("release_notes")?.toString() || "Version " + version_name + ": sin notas de lanzamiento";
    
    // Extracción de nombres de columnas desde variables de entorno
    const columns = Array.from({ length: 9}, (_, i) => {
      return process.env[`DB_VERSION_COLUMN_${i + 1}`];
    });
    // Error si alguna columna no está definida
    if (columns.some(c => !c)) {
       throw new Error("Faltan columnas definidas en las variables de entorno")
    }

    // helper para subir a R2
    const uploadToR2 = async (file: File, key: string, fallbackType?: string) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const cmd = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type || fallbackType ||"application/octet-stream",
      });
      await s3.send(cmd);
      return `https://${process.env.R2_BUCKET}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${encodeURIComponent(
        key
      )}`;
    };

    const apkKey = `releases/${version_name}/${apkFile.name}`;
    const zipKey = `releases/${version_name}/${folderFile.name}`;

    await uploadToR2(apkFile, apkKey, "application/vnd.android.package-archive");
    await uploadToR2(folderFile, zipKey, "application/zip");

    // desactivar versiones previas
    await pool.query(`UPDATE ${version_table} SET ${columns[7]} = false WHERE ${columns[7]} = true`);

    // intentar insertar nueva versión
    try {
      await pool.query(
        `INSERT INTO ${version_table} 
          (${columns.join(", ")})
        VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW()) 
        RETURNING *`,
        [
          version_name,
          version_code,
          apkFile.name,
          folderFile.name,
          apkFile.size,
          folderFile.size,
          release_notes
        ]
      );

      return NextResponse.json({
        message: "Version uploaded",
        version_name,
        version_code,
        release_notes,
      });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("DB Insert error:", err);
      try{
        const lastVersion =  await pool.query(
          `SELECT * FROM ${version_table} ORDER BY ${columns[8]} DESC LIMIT 1`
        );
        if (lastVersion.rows.length > 0){
          const lastId = lastVersion.rows[0].id;
          await pool.query(
            `UPDATE ${version_table} SET ${columns[7]} = true WHERE id = $1`,
            [lastId]
          );
          console.log(`Ultima versión restaurada, id: ${lastId}`);
        }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (restoreErr: any) {
        console.error("Fallo al restaurar la última versión:", restoreErr);
      }
      return NextResponse.json(
        { message: "Error al insertar version, versión anterior restaurada.", error: err.message},
        { status: 500 }
      );
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error("Error processing request:", err);
    return NextResponse.json(
      { message: "Internal server error", error: err.message },
      { status: 500 }
    );
  }
}
