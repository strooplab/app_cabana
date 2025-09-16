// pages/api/auth.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ message: 'Password is required' });
  }

  try {
    const { data: authConfig, error } = await supabase
      .from('auth_config')
      .select('password_hash')
      .single();

    if (error || !authConfig) {
      console.error('Error fetching auth config:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }

    const isValidPassword = await bcrypt.compare(password, authConfig.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    const token = jwt.sign({ authenticated: true }, process.env.JWT_SECRET, {
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
