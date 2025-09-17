// pages/api/download.js
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { password } = req.body;

  // Leer la contraseña hasheada desde la BD
  const { data, error } = await supabase
    .from('auth_config')
    .select('password_hash')
    .eq('id', 1)
    .single();

  if (error || !data) {
    return res.status(500).json({ message: 'Error leyendo configuración' });
  }

  const isValid = await bcrypt.compare(password, data.password_hash);

  if (!isValid) {
    return res.status(401).json({ message: 'Invalid password' });
  }
  
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }

  const { version_id, download_type } = req.body;
  const user_ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const user_agent = req.headers['user-agent'];

  if (!version_id || !download_type) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const { error: insertError } = await supabase.from('downloads').insert({
      version_id,
      download_type,
      user_ip,
      user_agent,
    });

    if (insertError) {
      console.error('Error registering download:', insertError);
      return res.status(500).json({ message: 'Error registering download' });
    }

    const { data: version, error } = await supabase
      .from('app_versions')
      .select(download_type === 'apk' ? 'apk_url' : 'folder_url')
      .eq('id', version_id)
      .single();

    if (error || !version) {
      return res.status(404).json({ message: 'Version not found' });
    }

    const download_url =
      download_type === 'apk' ? version.apk_url : version.folder_url;

    res.status(200).json({
      message: 'Download registered successfully',
      download_url,
    });
  } catch (error) {
    console.error('Download API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
