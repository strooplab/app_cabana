const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function setupAdminPassword() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!supabaseUrl || !supabaseKey || !adminPassword) {
    console.error("❌ ERROR: Variables de entorno no definidas. Revisa tu archivo .env");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Generar hash con bcrypt
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Guardar en la BD
    const { error } = await supabase
      .from('auth_config')
      .update({ password_hash: hashedPassword })
      .eq('id', 1);

    if (error) {
      console.error("❌ Error actualizando contraseña:", error.message);
    } else {
      console.log("✅ Contraseña de administrador actualizada exitosamente");
    }
  } catch (err) {
    console.error("❌ Error en el proceso:", err);
  }
}

setupAdminPassword();
