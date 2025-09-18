// pages/api/download.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

// 📌 Conexión a PostgreSQL (usa tus credenciales locales)
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'mi_base',
  password: process.env.DB_PASSWORD || '1234',
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { version_id, download_type } = req.body;

  if (!version_id || !download_type) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // ✅ Validar token JWT
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET as string);
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }

  const user_ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const user_agent = req.headers['user-agent'];

  try {
    // Registrar descarga
    await pool.query(
      `INSERT INTO downloads (version_id, download_type, user_ip, user_agent) 
       VALUES ($1, $2, $3, $4)`,
      [version_id, download_type, user_ip, user_agent]
    );

    // Buscar la versión
    const column = download_type === 'apk' ? 'apk_url' : 'folder_url';
    const result = await pool.query(
      `SELECT ${column} as url FROM app_versions WHERE id = $1 LIMIT 1`,
      [version_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Version not found' });
    }

    return res.status(200).json({
      message: 'Download registered successfully',
      download_url: result.rows[0].url,
    });
  } catch (error) {
    console.error('Download API error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
