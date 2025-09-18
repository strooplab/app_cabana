"use client";
import React, { useState, useEffect } from "react";
import {
  Download,
  Shield,
  Smartphone,
  FolderOpen,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

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

type DownloadType = "apk" | "zip" | "folder";
type DownloadStatus = "downloading" | "completed" | "error" | null;

const AppDistributionPage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [appVersion, setAppVersion] = useState<AppVersion | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<
    Record<DownloadType, DownloadStatus>
  >({ apk: null, folder: null, zip: null });

  // Traer versión más reciente desde el backend
  const fetchLatestVersion = async () => {
    try {
      const token = localStorage.getItem("app_token");
      const res = await fetch("/api/version", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Error obteniendo la versión");
      const data = await res.json();
      setAppVersion(data);
    } catch {
      setError("No se pudo obtener la versión actual");
    }
  };

  useEffect(() => {
    const authStatus = localStorage.getItem("app_authenticated");
    if (authStatus === "true") {
      setIsAuthenticated(true);
      fetchLatestVersion();
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError("Contraseña incorrecta");
      } else {
        const data = await res.json();
        setIsAuthenticated(true);
        localStorage.setItem("app_authenticated", "true");
        localStorage.setItem("app_token", data.token); // 👈 guarda el JWT
        fetchLatestVersion();
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (type: DownloadType) => {
    if (!appVersion) return;

    setDownloadStatus((prev) => ({ ...prev, [type]: "downloading" }));

    try {
      const token = localStorage.getItem("app_token");
      const res = await fetch("/api/download", {
        method: "POST",
        headers: {
           "Content-Type": "application/json" 
          , Authorization: `Bearer ${token}`,
          },
        body: JSON.stringify({
          password,
          version_id: appVersion.id,
          download_type: type,
        }),
      });

      if (!res.ok) throw new Error("Error en descarga");

      const { download_url } = await res.json();

      // Lanzar descarga real
      const link = document.createElement("a");
      link.href = download_url;
      link.download =
        type === "apk"
          ? `app-v${appVersion.version_name}.apk`
          : `app-files-v${appVersion.version_name}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadStatus((prev) => ({ ...prev, [type]: "completed" }));
      setTimeout(() => {
        setDownloadStatus((prev) => ({ ...prev, [type]: null }));
      }, 3000);
    } catch {
      setDownloadStatus((prev) => ({ ...prev, [type]: "error" }));
      setTimeout(() => {
        setDownloadStatus((prev) => ({ ...prev, [type]: null }));
      }, 3000);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getButtonContent = (type: DownloadType) => {
    const status = downloadStatus[type];
    const isApk = type === "apk";

    switch (status) {
      case "downloading":
        return (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            Descargando...
          </>
        );
      case "completed":
        return (
          <>
            <CheckCircle className="h-4 w-4" />
            Descargado
          </>
        );
      case "error":
        return (
          <>
            <AlertCircle className="h-4 w-4" />
            Error
          </>
        );
      default:
        return (
          <>
            {isApk ? (
              <Smartphone className="h-4 w-4" />
            ) : (
              <FolderOpen className="h-4 w-4" />
            )}
            Descargar {isApk ? "APK" : "Archivos"}
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
              <p className="text-blue-100 text-center mt-2">
                Distribución Interna de Aplicaciones
              </p>
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
                      type={showPassword ? "text" : "password"}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Ingresa tu contraseña"
                      onKeyDown={(e) =>
                        e.key === "Enter" ? handleAuth(e as never) : null
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
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
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!appVersion) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Smartphone className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">
              Distribución de App
            </h1>
          </div>
          <button
            onClick={() => {
              setIsAuthenticated(false);
              localStorage.removeItem("app_authenticated");
              localStorage.removeItem("app_token"); // 👈 limpiar token
              setAppVersion(null);
            }}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Información de la versión */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-4">
            <h2 className="text-xl font-bold text-white">Versión Actual</h2>
          </div>

          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Versión
                    </span>
                    <p className="text-2xl font-bold text-gray-900">
                      {appVersion.version_name}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Fecha de publicación
                    </span>
                    <p className="text-gray-700">
                      {formatDate(appVersion.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-500">
                  Notas de la versión
                </span>
                <div className="mt-2 bg-gray-50 rounded-lg p-4">
                  <pre className="text-sm text-gray-700 whitespace-pre-line">
                    {appVersion.release_notes}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de descarga */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Descarga APK */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-4">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Smartphone className="h-5 w-5 mr-2" />
                Aplicación APK
              </h3>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-600 text-sm mb-2">
                  Archivo de instalación de la aplicación para Android
                </p>
                <p className="text-xs text-gray-500">
                  Tamaño: {formatFileSize(appVersion.apk_size)}
                </p>
              </div>

              <button
                onClick={() => handleDownload("apk")}
                disabled={downloadStatus.apk === "downloading"}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                  downloadStatus.apk === "completed"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : downloadStatus.apk === "error"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                }`}
              >
                {getButtonContent("apk")}
              </button>
            </div>
          </div>

          {/* Descarga Carpeta */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
              <h3 className="text-lg font-bold text-white flex items-center">
                <FolderOpen className="h-5 w-5 mr-2" />
                Archivos Adicionales
              </h3>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-600 text-sm mb-2">
                  Carpeta con archivos de configuración y recursos
                </p>
                <p className="text-xs text-gray-500">
                  Tamaño: {formatFileSize(appVersion.folder_size)}
                </p>
              </div>

              <button
                onClick={() => handleDownload("folder")}
                disabled={downloadStatus.folder === "downloading"}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                  downloadStatus.folder === "completed"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : downloadStatus.folder === "error"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                }`}
              >
                {getButtonContent("folder")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppDistributionPage;
