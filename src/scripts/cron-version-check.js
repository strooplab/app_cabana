// scripts/setup-admin-password-pg.js
import bcrypt from 'bcryptjs';
import pool from '../lib/db';
import readline from 'readline';

async function ask(question, hidden = false) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  if (hidden) {
    // Ocultar lo que escribe el usuario (no siempre soportado en todas consolas)
    rl.stdoutMuted = true;
    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (rl.stdoutMuted) rl.output.write("*");
      else rl.output.write(stringToWrite);
    };
  }

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function setupAdminPassword() {
  try {
    const auth_table = process.env.DB_AUTH_TABLE;
    const column = process.env.DB_AUTH_COLUMN_1;

    // Verificar si ya existe contraseña en la tabla
    const result = await pool.query(
      `SELECT ${column} FROM ${auth_table} LIMIT 1`
    );

    if (result.rows.length > 0 && result.rows[0][column]) {
      // Ya existe contraseña, pedir la actual
      const currentHash = result.rows[0][column];
      const currentPassword = await ask("🔑 Ingresa la contraseña actual: ", true);

      const match = await bcrypt.compare(currentPassword, currentHash);
      if (!match) {
        console.error("\n❌ Contraseña actual incorrecta. Abortando.");
        process.exit(1);
      }
    } else {
      console.log("⚠️ No hay contraseña configurada. Se establecerá una nueva.");
    }

    // Pedir nueva contraseña dos veces
    const newPassword = await ask("\n👉 Ingresa la nueva contraseña de administrador: ", true);
    const confirmPassword = await ask("\n👉 Confirma la nueva contraseña: ", true);

    if (newPassword !== confirmPassword) {
      console.error("\n❌ Las contraseñas no coinciden. Intenta de nuevo.");
      process.exit(1);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query(
      `INSERT INTO ${auth_table} (id, ${column}) 
       VALUES (1, $1) 
       ON CONFLICT (id) DO UPDATE 
       SET ${column} = EXCLUDED.${column}`,
      [hashedPassword]
    );

    console.log("\n✅ Contraseña actualizada exitosamente");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

setupAdminPassword();
