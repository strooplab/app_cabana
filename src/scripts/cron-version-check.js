// src/scripts/cron-version-check.js - Script para ejecutar con cron mensualmente
import AppVersionUploader from './upload-new-version.js';
import cron from 'node-cron';

// Ejecutar el primer día de cada mes a las 2:00 AM
cron.schedule('0 2 1 * *', async () => {
  console.log('🕐 Ejecutando chequeo automático mensual...');
  const uploader = new AppVersionUploader();
  await uploader.run();
}, {
  timezone: "America/Bogota"
});

console.log('⏰ Cron job configurado para ejecutarse el primer día de cada mes a las 2:00 AM');

// Mantener el proceso activo
process.stdin.resume();