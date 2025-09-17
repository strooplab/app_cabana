const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function setupAdminPassword() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const adminPassword = process.env.ADMIN_PASSWORD;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ ERROR: Variables de entorno no definidas. Revisa tu archivo .env");
    process.exit(1);
  }

  // Pedir contraseña al usuario
function askPassword() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question("Introduce la nueva contraseña de administrador: ", (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

(async () => {
  try {
    // Si existe ADMIN_PASSWORD en el entorno, úsala
    const password = adminPassword;

    if (!password) {
      console.error("❌ No se proporcionó ninguna contraseña.");
      process.exit(1);
    }

    const hashed = await bcrypt.hash(password, 10);

    console.log("✅ Contraseña hasheada lista para insertar en la BD:");
    console.log(hashed);

      const { error } = await supabase
        .from('auth_config')
        .update({
          password_hash: hashedPassword,
          salt: salt
        })
        .eq('id', 1);

      if (error) {
        console.error('Error actualizando contraseña:', error.message);
      } else {
        console.log('✅ Contraseña actualizada exitosamente');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      readline.close();
      process.exit(0);
    }
  });
}

setupAdminPassword();