// scripts/setup-admin-password-pg.js
import bcrypt from 'bcryptjs';
import pool from '../lib/db';
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
      const auth_table = process.env.DB_AUTH_TABLE;
      const column = process.env.DB_AUTH_COLUMN_1;

      await pool.query(
        `INSERT INTO ${auth_table} (${column}) 
         VALUES ($1) 
         ON CONFLICT (id) DO UPDATE 
         SET ${column} = EXCLUDED.${column}`,
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