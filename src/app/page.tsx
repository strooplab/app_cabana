import React, { useState, useEffect, FormEvent } from 'react';
import { Download, Shield, Smartphone, FolderOpen, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface AppVersion {
  id: number;
  version_name: string;
  version_code: number;
  apk_url: string;
  folder_url: string;
  apk_size: number;
  folder_size: number;
  release_notes: string;
  created_at: string;
}

type DownloadType = 'apk' | 'folder';
type DownloadStatus = 'downloading' | 'completed' | 'error' | null;

const AppDistributionPage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [appVersion, setAppVersion] = useState<AppVersion | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<Record<DownloadType, DownloadStatus>>({
    apk: null,
    folder: null,
  });

  // Simular datos de la versión actual (en producción vendrían de Supabase)
  const mockAppVersion: AppVersion = {
    id: 1,
    version_name: '1.2.3',
    version_code: 123,
    apk_url: 'https://example.com/app-v1.2.3.apk',
    folder_url: 'https://example.com/app-files-v1.2.3.zip',
    apk_size: 15728640, // 15MB
    folder_size: 5242880, // 5MB
    release_notes:
      '• Corrección de errores críticos\n• Mejoras de rendimiento\n• Nueva funcionalidad de sincronización\n• Actualización de dependencias de seguridad',
    created_at: '2024-03-15T10:30:00Z',
  };

  useEffect(() => {
    const authStatus = localStorage.getItem('app_authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
      setAppVersion(mockAppVersion);
    }
  }, []);

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (password === 'demo123') {
        setIsAuthenticated(true);
        localStorage.setItem('app_authenticated', 'true');
        setAppVersion(mockAppVersion);
      } else {
        setError('Contraseña incorrecta');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (type: DownloadType) => {
    if (!appVersion) return;

    setDownloadStatus((prev) => ({ ...prev, [type]: 'downloading' }));

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const downloadUrl = type === 'apk' ? appVersion.apk_url : appVersion.folder_url;

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download =
        type === 'apk'
          ? `app-v${appVersion.version_name}.apk`
          : `app-files-v${appVersion.version_name}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadStatus((prev) => ({ ...prev, [type]: 'completed' }));

      await registerDownload(type);

      setTimeout(() => {
        setDownloadStatus((prev) => ({ ...prev, [type]: null }));
      }, 3000);
    } catch (err) {
      setDownloadStatus((prev) => ({ ...prev, [type]: 'error' }));
      setTimeout(() => {
        setDownloadStatus((prev) => ({ ...prev, [type]: null }));
      }, 3000);
    }
  };

  const registerDownload = async (type: DownloadType) => {
    if (!appVersion) return;
    console.log(`Registrando descarga de ${type} para la versión ${appVersion.version_name}`);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getButtonContent = (type: DownloadType) => {
    const status = downloadStatus[type];
    const isApk = type === 'apk';

    switch (status) {
      case 'downloading':
        return (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            Descargando...
          </>
        );
      case 'completed':
        return (
          <>
            <CheckCircle className="h-4 w-4" />
            Descargado
          </>
        );
      case 'error':
        return (
          <>
            <AlertCircle className="h-4 w-4" />
            Error
          </>
        );
      default:
        return (
          <>
            {isApk ? <Smartphone className="h-4 w-4" /> : <FolderOpen className="h-4 w-4" />}
            Descargar {isApk ? 'APK' : 'Archivos'}
          </>
        );
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
              <div className="flex items-center justify-center">
                <Shield className="h-8 w-8 text-white mr-3" />
                <h1 className="text-2xl font-bold text-white">Acceso Seguro</h1>
              </div>
              <p className="text-blue-100 text-center mt-2">Distribución Interna de Aplicaciones</p>
            </div>

            <div className="px-8 py-6">
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Contraseña de Acceso
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Ingresa tu contraseña"
                      onKeyDown={(e) => e.key === 'Enter' && handleAuth(e)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleAuth}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <span>Acceder</span>
                  )}
                </button>
              </div>

              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">
                  Demo: usa la contraseña <code className="bg-gray-100 px-1 rounded">demo123</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 🔽 Si está autenticado, render normal
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* ... resto del código sin cambios, ya tipado ... */}W
    </div>
  );
};

export default AppDistributionPage;
