// src/scripts/upload-new-version.js
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { pathToFileURL } from "url";
import ApkReader from "adbkit-apkreader";

class AppVersionUploader {
  constructor() {
    this.apiUrl = 'http://localhost:3000';
    this.adminKey = process.env.ADMIN_KEY;
    this.sourceDirectory = process.env.SOURCE_DIRECTORY;
  }

  async uploadToR2(filePath, key) {
    const file = fs.readFileSync(filePath);
    const res = await fetch("http://localhost:3000/api/admin/get-upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: key, contentType: "application/octet-stream" }),
    }); 
    const { uploadUrl } = await res.json();

    const upload = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": "application/octet-stream" },
    });

    if (!upload.ok) throw new Error("Error subiendo a R2");
    console.log(`✅ Subida completa: ${key}`);
    return uploadUrl.split("?")[0]; // URL final sin query
  }
  

  async uploadVersion(versionData) {
    const apkKey = `releases/${versionData.versionName}/${versionData.apkFile}`;
    const zipKey = `releases/${versionData.versionName}/${versionData.folderFile}`;
    const manualKey = `releases/${versionData.versionName}/manuals/${versionData.manualFile}`;

    const apkUrl = await this.uploadToR2(versionData.apkPath, apkKey);
    const folderUrl = await this.uploadToR2(versionData.folderZipPath, zipKey);
    const manualUrl = await this.uploadToR2(versionData.manualPath, manualKey);

    const response = await fetch(`${this.apiUrl}/api/admin/upload-version`, {
      method: "POST",
      headers: {
        "X-Admin-Key": this.adminKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        versionName: versionData.versionName,
        versionCode: versionData.versionCode,
        releaseNotes: versionData.releaseNotes,
        apkFile: versionData.apkFile,
        folderFile: versionData.folderFile,
        manualFile: versionData.manualFile,
        apkSize: fs.statSync(versionData.apkPath).size,
        folderSize: fs.statSync(versionData.folderZipPath).size,
        manualSize: fs.statSync(versionData.manualPath).size,
      }),
    });

    return response.json();
  }

  async getNextVersionCode() {
    const res = await fetch(`${this.apiUrl}/api/versions`);
    const versions = await res.json();
    if (!versions || versions.length === 0) return 1;

    const maxCode = Math.max(...versions.map(v => v.version_code));
    return maxCode + 1;
  }

  async scanForNewVersion() {
    try {
      const files = fs.readdirSync(this.sourceDirectory);
      console.log(this.sourceDirectory);
      console.log("Archivos encontrados en directorio:", files);


      // Buscar APK
      const apkFiles = files.filter(file => file.endsWith('.apk'));
      if (apkFiles.length === 0) {
        console.log('No APK files found in source directory');
        return null;
      }

      // Buscar zip de la carpeta
      const folderZip = files.find(file => file.endsWith('.zip'));
      if (!folderZip) {
        console.log('No zip found');
        return null;
      }

      const manualFile = files.find(file => file.endsWith('.pdf'));
      if (!manualFile) {
        console.log('No pdf found');
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

      const folderZipPath = path.join(this.sourceDirectory, folderZip);
      const manualPath = path.join(this.sourceDirectory, manualFile)
      async function getApkVersion(apkPath) {
        const reader = await ApkReader.open(apkPath); 
        const manifest = await reader.readManifest();
        return manifest.versionName;
      }

      // Extraer versión del nombre del APK
      const versionName = await getApkVersion(latestApk.path);
      const versionCode = this.generateVersionCode(versionName);
      if (!Number.isFinite(versionCode) || versionCode <= 0) {
        versionCode = await this.getNextVersionCode(); // consulta la API al backend
      }
      console.log("Asignando versionCode:", versionCode);


      return {
        versionName,
        versionCode,
        releaseNotes: this.generateReleaseNotes(latestApk.name),
        apkPath: latestApk.path,
        folderZipPath,
        apkFile: latestApk.name,
        folderFile: folderZip,
        manualPath,
        manualFile: manualFile
      };

    } catch (error) {
      console.error('Error scanning for new version:', error);
      return null;
    }
  }

  generateVersionCode(versionName) {
    if (!versionName || typeof versionName !== 'string') return NaN;
    const parts = versionName.split('.').map(s => {
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? n : 0;
    });
    // asegurar 3 segmentos
    while (parts.length < 3) parts.push(0);
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
    return false; // Inhabilitado para simplificar
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
      console.log(`📁 Carpeta ZIP: ${newVersion.folderFile}`);
      console.log(`    Manual PDF: ${newVersion.manualFile}`);

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

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const uploader = new AppVersionUploader();
  uploader.run();
}

export default AppVersionUploader;
