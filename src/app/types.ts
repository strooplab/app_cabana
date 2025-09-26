// types.ts - Tipos compartidos para toda la aplicación

export interface AppVersion {
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

export type DownloadType = "apk" | "zip" | "folder";
export type DownloadStatus = "downloading" | "completed" | "error" | null;

export interface AuthResponse {
  token: string;
  message?: string;
}

export interface DownloadResponse {
  download_url: string;
  message?: string;
}

export interface ApiError {
  message: string;
  code?: number;
}

// Utilidades para formateo
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};