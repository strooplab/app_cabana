// pages/api/admin/upload-version.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import r2 from '../../../lib/r2';

export const config = {
  api: { bodyParser: false },
};

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'midb',
  password: process.env.DB_PASS || '1234',
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (req.headers['x-admin-key'] !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const form = formidable({
      uploadDir: '/tmp',
      keepExtensions: true,
      maxFileSize: 1024 * 1024 * 1024, // 1GB
    });

    const { fields, files } = await new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const { version_name, version_code, release_notes } = fields;
    const apkFile = files.apk_file?.[0];
    const folderFile = files.folder_file?.[0];

    if (!version_name || !version_code || !apkFile || !folderFile) {
      return res.status(400).json({ message: 'Missing required fields or files' });
    }

    // Guardar en carpeta pública
    const apkDir = path.join(process.cwd(), 'public', 'uploads', 'apk');
    const folderDir = path.join(process.cwd(), 'public', 'uploads', 'folders');
    fs.mkdirSync(apkDir, { recursive: true });
    fs.mkdirSync(folderDir, { recursive: true });

    const apkFileStream = fs.createReadStream(apkFile.filepath);
    const apkKey = `apk/app-v${version_name}.apk`;
    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: apkKey,
      Body: apkFileStream,
      ContentType: "application/vnd.android.package-archive",
    }));

    // Subir ZIP
    const folderFileStream = fs.createReadStream(folderFile.filepath);
    const folderKey = `folders/app-files-v${version_name}.zip`;
    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: folderKey,
      Body: folderFileStream,
      ContentType: "application/zip",
    }));

    // URLs públicas
    const apkUrl = `https://${process.env.R2_PUBLIC_DOMAIN}/${apkKey}`;
    const folderUrl = `https://${process.env.R2_PUBLIC_DOMAIN}/${folderKey}`;

    // Desactivar versiones previas
    await pool.query(`UPDATE app_versions SET is_active = false WHERE is_active = true`);

    // Insertar nueva versión
    const result = await pool.query(
      `INSERT INTO app_versions 
        (version_name, version_code, apk_url, folder_url, apk_size, folder_size, release_notes, is_active, created_at) 
       VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW())
       RETURNING *`,
      [
        version_name,
        version_code,
        apkUrl,
        folderUrl,
        apkFile.size,
        folderFile.size,
        release_notes || '',
      ]
    );

    res.status(200).json({
      message: 'Version uploaded successfully',
      version: result.rows[0],
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
