import pool from './db.ts';

(async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Conexión exitosa:', result.rows[0]);
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
  } finally {
    process.exit(0);
  }
})();
