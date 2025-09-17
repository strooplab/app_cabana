const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');
const archiver = require('archiver'); // Para comprimir la carpeta
require('dotenv').config();

class AppVersionUploader {
  constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    this.adminKey = process.env.ADMIN_API_KEY;
    this.sourceDirectory = process.env.SOURCE_DIRECTORY;
  }

  async zipFolder(folderPath, outputZip) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputZip);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve(outputZip));
      archive.on('error', reject);

      archive.pipe(output);
      archive.directory(folderPath, false);
      archive.finalize();
    });
  }

  async uploadVersion(versionData) {
    const { versionName, versionCode, releaseNotes, apkPath, folderZipPath } = versionData;

    if (!fs.existsSync(apkPath)) {
      throw new Error(`APK file not found: ${apkPath}`);
    }

    if (!fs.existsSync(folderZipPath)) {
      throw new Error(`Zip file not found: ${folderZipPath}`);
    }

    const form = new FormData();
    form.append('version_name', versionName);
    form.append('version_code', versionCode);
    form.append('release_notes', releaseNotes);
    form.append('apk_file', fs.createReadStream(apkPath));
    form.append('folder_file', fs.createReadStream(folderZipPath));

    const response = await fetch(`${this.apiUrl}/api/admin/upload-version`, {
      method: 'POST',
      headers: {
        'X-Admin-Key': this.adminKey,
        ...form.getHeaders()
      },
      body: form
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Upload failed: ${response.status} ${error}`);
    }

    return await response.json();
  }

  async scanForNewVersion() {
    try {
      const files = fs.readdirSync(this.sourceDirectory);

      // Buscar .apk
      const apkFiles = files.filter(file => file.endsWith('.apk'));
      if (apkFiles.length === 0) {
        console.log('No APK files found in source directory');
        return null;
      }

      // Buscar carpeta ingenio_la_cabana
      const folderPath = path.join(this.sourceDirectory, 'ingenio_la_cabana');
      if (!fs.existsSync(folderPath) || !fs.lstatSync(folderPath).isDirectory()) {
        console.log('No folder "ingenio_la_cabana" found');
        return null;
      }

      // Último APK por fecha
      const latestApk = apkFiles
        .map(file => ({
          name: file,
          path: path.join(this.sourceDirectory, file),
          mtime: fs.statSync(path.join(this.sourceDirectory, file)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime)[0];

      // Comprimir carpeta
      const folderZipPath = path.join(this.sourceDirectory, 'ingenio_la_cabana.zip');
      await this.zipFolder(folderPath, folderZipPath);

      // Extraer versión del nombre
      const versionMatch = latestApk.name.match(/v?(\d+\.\d+\.\d+)/);
      const versionName = versionMatch ? versionMatch[1] : '1.0.0';
      const versionCode = this.generateVersionCode(versionName);

      return {
        versionName,
        versionCode,
        releaseNotes: this.generateReleaseNotes(latestApk.name),
        apkPath: latestApk.path,
        folderZipPath,
        apkFile: latestApk.name,
        folderFile: 'ingenio_la_cabana.zip'
      };

    } catch (error) {
      console.error('Error scanning for new version:', error);
      return null;
    }
  }

  generateVersionCode(versionName) {
    const parts = versionName.split('.').map(Number);
    return parts[0] * 10000 + parts[1] * 100 + parts[2];
  }

  generateReleaseNotes(fileName) {
    const date = new Date().toLocaleDateString('es-ES');
    return `• Actualización automática del ${date}
• Versión generada desde: ${fileName}
• Correcciones y mejoras generales
• Sincronización con archivos del servidor`;
  }

  async checkIfVersionExists(versionName) {
    return false; // de momento no verificamos
  }

  async run() {
    try {
      console.log('🔍 Escaneando directorio fuente para nuevas versiones...');
      const newVersion = await this.scanForNewVersion();

      if (!newVersion) {
        console.log('✅ No se encontraron nuevos archivos para procesar');
        return;
      }

      console.log(`📱 Nueva versión encontrada: ${newVersion.versionName}`);
      console.log(`📦 APK: ${newVersion.apkFile}`);
      console.log(`📁 Carpeta: ${newVersion.folderFile}`);

      const exists = await this.checkIfVersionExists(newVersion.versionName);
      if (exists) {
        console.log(`⚠️  La versión ${newVersion.versionName} ya existe, saltando...`);
        return;
      }

      console.log('⬆️  Subiendo nueva versión...');
      const result = await this.uploadVersion(newVersion);

      console.log('✅ Versión subida exitosamente!');
      console.log(`🎉 Nueva versión ${result.version.version_name} disponible`);

    } catch (error) {
      console.error('❌ Error en el proceso de actualización:', error.message);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  const uploader = new AppVersionUploader();
  uploader.run();
}

module.exports = AppVersionUploader;
