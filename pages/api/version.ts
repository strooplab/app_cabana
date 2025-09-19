// pages/api/versions.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'midb',
  password: process.env.DB_PASSWORD || '1234',
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    jwt.verify(token, process.env.JWT_SECRET as string);
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM app_versions 
       WHERE is_active = true 
       ORDER BY created_at DESC 
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No active version found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ message: 'Internal server error sistema' });
  }
}
