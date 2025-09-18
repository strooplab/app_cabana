// pages/api/auth.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
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

  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ message: 'Password is required' });
  }

  try {
    const result = await pool.query(
      `SELECT password_hash FROM auth_config ORDER BY id ASC LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.status(500).json({ message: 'No auth config found' });
    }

    const { password_hash } = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET as string, {
      expiresIn: '24h',
    });

    res.status(200).json({
      message: 'Authentication successful',
      token,
      authenticated: true,
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
