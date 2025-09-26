// utils.ts - Utilidades y configuración de la aplicación

import { DownloadType, AppVersion } from './types';

// Configuración de la aplicación
export const APP_CONFIG = {
  name: "Sistema de Distribución",
  version: "2.0",
  description: "Distribución Interna de Aplicaciones",
  storage: {
    AUTH_KEY: "app_authenticated",
    TOKEN_KEY: "app_token"
  },
  api: {
    endpoints: {
      AUTH: "/api/auth",
      VERSIONS: "/api/versions",
      DOWNLOAD: "/api/download"
    }
  },
  download: {
    timeout: 3000, // tiempo para resetear estado de descarga
  }
};

// Utilidades de localStorage
export const storage = {
  setAuth: (token: string) => {
    localStorage.setItem(APP_CONFIG.storage.AUTH_KEY, "true");
    localStorage.setItem(APP_CONFIG.storage.TOKEN_KEY, token);
  },
  
  clearAuth: () => {
    localStorage.removeItem(APP_CONFIG.storage.AUTH_KEY);
    localStorage.removeItem(APP_CONFIG.storage.TOKEN_KEY);
  },
  
  getToken: (): string | null => {
    return localStorage.getItem(APP_CONFIG.storage.TOKEN_KEY);
  },
  
  isAuthenticated: (): boolean => {
    return localStorage.getItem(APP_CONFIG.storage.AUTH_KEY) === "true";
  }
};

// Utilidades de API
export const api = {
  createAuthHeaders: (includeAuth = false) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    
    if (includeAuth) {
      const token = storage.getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }
    
    return headers;
  },

  handleResponse: async (response: Response) => {
    if (response.status === 401) {
      storage.clearAuth();
      throw new Error("Unauthorized - sesión expirada");
    }
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Error en la petición");
    }
    
    return response.json();
  }
};

// Utilidades de descarga
export const download = {
  triggerDownload: (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  getFilename: (type: DownloadType, version: AppVersion): string => {
    return type === "apk"
      ? `app-v${version.version_name}.apk`
      : `app-files-v${version.version_name}.zip`;
  }
};

// Utilidades de validación
export const validation = {
  isValidPassword: (password: string): boolean => {
    return password.trim().length > 0;
  },

  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
};

// Utilidades de tema y estilos
export const theme = {
  gradients: {
    primary: "from-blue-600 to-indigo-600",
    secondary: "from-purple-600 to-pink-600",
    success: "from-green-500 to-emerald-500",
    error: "from-red-500 to-pink-500",
    background: "from-blue-50 via-white to-indigo-50"
  },
  
  animations: {
    fadeIn: "animate-fadeInUp",
    slideIn: "animate-slideInRight",
    pulse: "animate-pulse-slow"
  }
};

// Utilidades de debugging (solo en desarrollo)
export const debug = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[App Debug] ${message}`, data);
    }
  },
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: (message: string, error?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[App Error] ${message}`, error);
    }
  }
};