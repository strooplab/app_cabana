// pages/api/auth.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '@/../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const { password } = req.body;
  if (!password) return res.status(400).json({ message: 'Password is required' });

  try {
    const result = await pool.query(`SELECT password_hash FROM auth_config ORDER BY id ASC LIMIT 1`);
    if (!result.rows.length) return res.status(500).json({ message: 'No auth config found' });

    const { password_hash } = result.rows[0];
    const isValid = await bcrypt.compare(password, password_hash);
    if (!isValid) return res.status(401).json({ message: 'Invalid password' });

    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET as string, { expiresIn: '24h' });
    return res.status(200).json({ message: 'ok', token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}