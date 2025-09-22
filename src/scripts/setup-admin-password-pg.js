// scripts/setup-admin-password-pg.js
import bcrypt from 'bcryptjs';
import pool from '@/lib/db.ts';
import readline from 'readline';

async function setupAdminPassword() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Ingresa la nueva contraseña de administrador: ", async (password) => {
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      await pool.query(
        `INSERT INTO auth_config (password_hash) 
         VALUES ($1) 
         ON CONFLICT (id) DO UPDATE 
         SET password_hash = EXCLUDED.password_hash`,
        [hashedPassword]
      );

      console.log("Contraseña actualizada exitosamente");
    } catch (error) {
      console.error("❌ Error:", error.message);
    } finally {
      rl.close();
      process.exit(0);
    }
  });
}

setupAdminPassword();