"use client";
import React, { useState, useEffect } from "react";
import { Smartphone, FolderOpen } from "lucide-react";

// Components
import AuthForm from "./components/AuthForm";
import Header from "./components/Header";
import VersionInfo from "./components/VersionInfo";
import DownloadCard from "./components/DownloadCard";
import Loading from "./components/Loading";

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
  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [appVersion, setAppVersion] = useState<AppVersion | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<
    Record<DownloadType, DownloadStatus>
  >({ apk: null, folder: null, zip: null });

  // Fetch latest version from backend
  const fetchLatestVersion = async () => {
    try {
      const token = localStorage.getItem("app_token");
      const res = await fetch("/api/versions", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        localStorage.removeItem("app_token");
        localStorage.removeItem("app_authenticated");
        setIsAuthenticated(false);
        setAppVersion(null);
        setError("Unauthorized - sesión expirada");
        return;
      }

      if (!res.ok) throw new Error("Error obteniendo la versión");
      const data = await res.json();
      setAppVersion(data);
    } catch {
      setError("No se pudo obtener la versión actual");
    }
  };

  useEffect(() => {
    const checkAuthStatus = async () => {
      const authStatus = localStorage.getItem("app_authenticated");
      if (authStatus === "true") {
        setIsAuthenticated(true);
        await fetchLatestVersion();
      }
      setInitialLoading(false);
    };

    checkAuthStatus();
  }, []);

  const handleAuth = async (password: string) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const error = await res.text();
        setError(error);
      } else {
        const data = await res.json();
        setIsAuthenticated(true);
        localStorage.setItem("app_authenticated", "true");
        localStorage.setItem("app_token", data.token);
        await fetchLatestVersion();
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("app_authenticated");
    localStorage.removeItem("app_token");
    setAppVersion(null);
    setError("");
  };

  const handleDownload = async (type: DownloadType) => {
    if (!appVersion) return;

    setDownloadStatus((prev) => ({ ...prev, [type]: "downloading" }));

    try {
      const token = localStorage.getItem("app_token");
      const res = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          version_id: appVersion.id,
          download_type: type,
        }),
      });

      if (!res.ok) throw new Error("Error en descarga");

      const { download_url } = await res.json();

      // Descarga real
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

  // Mostrar carga al inicio
  if (initialLoading) {
    return <Loading />;
  }

  // Mostrar autenticación si no se ha autenticado o si el token expiró
  if (!isAuthenticated) {
    return (
      <AuthForm
        onAuth={handleAuth}
        loading={loading}
        error={error}
      />
    );
  }

  // Cargando
  if (!appVersion) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen gradient-bg">
      <Header onLogout={handleLogout} />

      <main className="gradient-bg max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Información  de la versión */}
        <VersionInfo appVersion={appVersion} />

        {/* Sección de descarga */}
        <div className="grid lg:grid-cols-2 gap-8">
          <DownloadCard
            type="apk"
            title="Aplicación APK"
            description="Archivo de instalación de la aplicación para Android. 
            IMPORTANTE: este archivo solo se descarga e instala una vez, la actualización se hace a través de los archivos adicionales"
            fileSize={appVersion.apk_size}
            status={downloadStatus.apk}
            onDownload={() => handleDownload("apk")}
            icon={<Smartphone className="h-6 w-6" />}
            headerGradient="from-yellow-200 to-amber-500"
            buttonStyle="btn-primary"
          />

          <DownloadCard
            type="zip"
            title="Archivos Adicionales"
            description="Carpeta con archivos de actualización, ubicación de las suertes y madurantes."
            fileSize={appVersion.folder_size}
            status={downloadStatus.folder}
            onDownload={() => handleDownload("folder")}
            icon={<FolderOpen className="h-6 w-6" />}
            headerGradient="from-yellow-200 to-amber-600"
            buttonStyle="btn-primary"
          />
        </div>

        {/* Footer */}
        <footer className="text-center py-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-yellow/30 shadow-sm">
            <p className="text-dark/80 text-sm font-medium">
              Distribución de app de campo y archivos de actualización • Versión 2.0
            </p>
            <div className="flex justify-center items-center mt-3 space-x-4 text-xs text-dark/60 font-medium">
              <span>🔒 Conexión segura</span>
              <span>•</span>
              <span>📱 Compatible con Android</span>
              <span>•</span>
              <span>⚡ Descarga rápida</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default AppDistributionPage;