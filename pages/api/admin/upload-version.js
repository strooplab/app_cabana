// pages/api/admin/upload-version.js
import { supabase } from '@/lib/supabase';
import formidable from 'formidable';
import fs from 'fs';

// Configuración para archivos grandes
export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
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
      maxFileSize: 100 * 1024 * 1024,
    });

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const { version_name, version_code, release_notes } = fields;
    const apkFile = files.apk_file?.[0];
    const folderFile = files.folder_file?.[0];

    if (!version_name || !version_code || !apkFile || !folderFile) {
      return res
        .status(400)
        .json({ message: 'Missing required fields or files' });
    }

    const apkFileName = `apk/app-v${version_name}.apk`;
    const folderFileName = `folders/app-files-v${version_name}.zip`;

    const apkBuffer = fs.readFileSync(apkFile.filepath);
    const { error: apkError } = await supabase.storage
      .from('app-files')
      .upload(apkFileName, apkBuffer, {
        contentType: 'application/vnd.android.package-archive',
        upsert: true,
      });

    if (apkError) throw apkError;

    const folderBuffer = fs.readFileSync(folderFile.filepath);
    const { error: folderError } = await supabase.storage
      .from('app-files')
      .upload(folderFileName, folderBuffer, {
        contentType: 'application/zip',
        upsert: true,
      });

    if (folderError) throw folderError;

    const { data: apkUrl } = supabase
      .storage.from('app-files')
      .getPublicUrl(apkFileName);

    const { data: folderUrl } = supabase
      .storage.from('app-files')
      .getPublicUrl(folderFileName);

    await supabase.from('app_versions').update({ is_active: false }).eq('is_active', true);

    const { data: newVersion, error: insertError } = await supabase
      .from('app_versions')
      .insert({
        version_name,
        version_code: parseInt(version_code),
        apk_url: apkUrl.publicUrl,
        folder_url: folderUrl.publicUrl,
        apk_size: apkFile.size,
        folder_size: folderFile.size,
        release_notes: release_notes || '',
        is_active: true,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    fs.unlinkSync(apkFile.filepath);
    fs.unlinkSync(folderFile.filepath);

    res.status(200).json({
      message: 'Version uploaded successfully',
      version: newVersion,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
