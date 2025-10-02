"use client";
import React from "react";
import { Calendar, Info, Tag, Code, Clock, FileText } from "lucide-react"; // Iconos VersionInfo

interface AppVersion { // Parámetros establecidos desde la página principal
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

interface VersionInfoProps { // Inicialización de las variables
  appVersion: AppVersion;
}

const VersionInfo: React.FC<VersionInfoProps> = ({ appVersion }) => {
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("es-ES", { // Formato de fecha
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeAgo = (dateString: string): string => { 
  // Aquí se define como se muestra cuando fue la ultima actualización en función del tiempo
    const now = new Date();
    const releaseDate = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60)); // Conversión de tiempo a horas
    
    if (diffInHours < 1) return "Hace menos de una hora";
    if (diffInHours < 24) return `Hace ${diffInHours} horas`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "Hace 1 día";
    if (diffInDays < 30) return `Hace ${diffInDays} días`;
    
    return "Hace más de un mes"; // en caso de que la diferencia sea de más de 30 dias
  };

  return (
    <div className="card hover-lift animate-fadeInUp mb-4">
      {/* Header */}
      <div className="card-header-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow to-orange"></div>
        <div className="absolute inset-0 bg-dark/10"></div>
        
        <div className="h-30 relative flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-3 bg-white/20 rounded-2xl mr-4 backdrop-blur-sm ml-6">
              <Tag className="h-7 w-7 text-dark" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-dark">Versión Actual</h2>
              <p className="text-dark/80 flex items-center mt-1">
                <Clock className="h-4 w-4 mr-2 text-dark" />
                {getTimeAgo(appVersion.created_at)}
              </p>
            </div>
          </div>
          
          <div className="text-right flex items-center justify-center">
            <div className="gradient-bg backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20 mr-6">
              <div className="text-dark font-bold text-lg">
                v{appVersion.version_name}
              </div>
              <div className="text-dark/70 text-xs font-medium">
                Build #{appVersion.version_code}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 bg-cream/30">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Version Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Version Badge */}
            <div className="text-center lg:text-left">
              <div className="gradient-bg relative inline-flex items-center justify-center w-24 h-24 rounded-3xl mb-4 shadow-lg border-2 border-yellow/50">
                <span className="text-3xl font-bold text-dark">
                  v{appVersion.version_name}
                </span>
                <div className="absolute -bottom-2 -right-2 bg-dark rounded-full p-2 shadow-lg border-2 border-cream">
                  <Code className="h-4 w-4 text-cream" />
                </div>
              </div>
              
              <h3 className="text-4xl font-bold text-dark mb-1">
                v{appVersion.version_name.charAt(0)}
              </h3>
              
              <div className="flex items-center justify-center lg:justify-start text-dark/70 mb-4">
                <Calendar className="h-4 w-4 mr-2 text-orange" />
                <span className="text-sm font-medium">
                  {formatDate(appVersion.created_at)}
                </span>
              </div>
            </div>

            {/* Build Info */}
            <div className="bg-gradient-to-br from-yellow-200 to-orange-400 mb-7 rounded-2xl p-7 border-1 border-amber-700 shadow-sm">
              <div className="text-center">
                <div className="text-3xl font-bold text-dark ">
                  #{appVersion.version_code}
                </div>
                <div className="text-sm text-dark/70 font-semibold uppercase tracking-wider">
                  Número de Build
                </div>
                <div className="mt-3 pt-3 border-t border-yellow/30">
                  <div className="text-xs text-dark/50 font-medium">
                    ID: {appVersion.id}
                  </div>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="bg-gradient-to-br from-yellow/30 to-orange/30 rounded-2xl p-6 border-2 border-white/40 shadow-sm">
              <div className="flex items-center justify-center">
                <div className="w-3 h-3 bg-green-600 rounded-full mr-2 animate-pulse"></div>
                <span className="text-dark font-semibold text-sm">
                  Versión Estable
                </span>
              </div>
            </div>
          </div>

          {/* Release Notes */}
          <div className="lg:col-span-2">
            <div className="flex items-center mb-3">
              <div className="p-2 bg-yellow-50 rounded-lg mr-3 border-2 border-yellow-30">
                <FileText className="h-7 w-7 text-dark flex items-center justify-center" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-dark">
                  Notas de la versión
                </h4>
                <p className="text-sm text-dark-200">
                  Cambios y mejoras en esta actualización
                </p>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-200 to-orange-400 rounded-2xl p-12 border-1 border-yellow/30 shadow-inner">
              <div className="prose prose-sm max-w-none">
                <div className="bg-gradient-to-br from-yellow-200 to-amber-500 rounded-xl p-11 shadow-sm">
                  <pre className="text-dark whitespace-pre-line font-sans leading-relaxed text-base font-medium">
                    {appVersion.release_notes}
                  </pre>
                </div>
              </div>
            </div>

            {/* Additional info */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 border-1 border-white shadow-sm">
                <div className="flex items-center">
                  <Info className="h-4 w-4 text-orange mr-2" />
                  <span className="text-sm font-medium text-dark">
                    Última actualización
                  </span>
                </div>
                <p className="text-xs text-dark/60 mt-1 font-medium">
                  {getTimeAgo(appVersion.created_at)}
                </p>
              </div>
              
              <div className="bg-white rounded-xl p-4 border-1 border-white shadow-sm">
                <div className="flex items-center">
                  <Code className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-dark">
                    Estado
                  </span>
                </div>
                <p className="text-xs text-green-700 mt-1 font-semibold">
                  Disponible para descarga
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VersionInfo;