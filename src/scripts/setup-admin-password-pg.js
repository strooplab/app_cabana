// scripts/setup-admin-password-pg.js
import bcrypt from 'bcryptjs';
import pool from '../lib/db.ts';
import readline from 'readline';

async function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim())
    });
  });
}

async function setupAdminPassword(){
  try{
    const auth_table = process.env.DB_AUTH_TABLE;
    const column = process.env.DB_AUTH_COLUMN_1;

    const result = await pool.query(`SELECT ${column} FROM ${auth_table} LIMIT 1`);
    let allowUpdate = true;

    if (result.rows.length > 0 && result.rows[0][column]) {
      const currentHash = result.rows[0][column];
      const currentPassword = await ask(" Ya existe una contraseña, Ingresela a continuación: ");

      const match = await bcrypt.compare(currentPassword, currentHash);
      if(!match) {
        console.error(" Contraseña incorrecta. Sin coincidencias.");
        process.exit(1);
      }
    } else {
      console.log(" No hay contraseña configurada, crea una nueva.")
    }
    if(allowUpdate){
      const newPassword = await ask(" Ingresa la nueva contraseña de administrador: ");
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      await pool.query(
        `INSERT INTO ${auth_table} (${column}) 
         VALUES ($1) 
         ON CONFLICT (id) DO UPDATE 
         SET ${column} = EXCLUDED.${column}`,
        [hashedPassword]
      );

      console.log("Contraseña actualizada exitosamente");
      process.exit(0)
    }
  } catch (error) {
      console.error("❌ Error:", error.message);
      process.exit(1);
  }
}

setupAdminPassword();