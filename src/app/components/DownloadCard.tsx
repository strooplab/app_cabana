"use client";
import React from "react";
import {
  Download,
  Smartphone,
  FolderOpen,
  CheckCircle,
  AlertCircle,
  FileText,
  HardDrive,
  Shield,
  Zap,
} from "lucide-react";

type DownloadType = "apk" | "zip" | "folder";
type DownloadStatus = "downloading" | "completed" | "error" | null;

interface DownloadCardProps {
  type: DownloadType;
  title: string;
  description: string;
  fileSize: number;
  status: DownloadStatus;
  onDownload: () => void;
  icon?: React.ReactNode;
  headerGradient?: string;
  buttonStyle?: string;
}

const DownloadCard: React.FC<DownloadCardProps> = ({
  type,
  title,
  description,
  fileSize,
  status,
  onDownload,
  icon,
  headerGradient = "from-yellow to-orange",
  buttonStyle = "btn-primary",
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getButtonContent = () => {
    switch (status) {
      case "downloading":
        return (
          <>
            <div className="spinner border-dark"></div>
            <span>Descargando...</span>
          </>
        );
      case "completed":
        return (
          <>
            <CheckCircle className="h-5 w-5" />
            <span>Completado</span>
          </>
        );
      case "error":
        return (
          <>
            <AlertCircle className="h-5 w-5" />
            <span>Reintentar</span>
          </>
        );
      default:
        return (
          <>
            <Download className="h-5 w-5" />
            <span>Descargar</span>
          </>
        );
    }
  };

  const getButtonClass = () => {
    switch (status) {
      case "completed":
        return "bg-gradient-to-r from-green-500 to-emerald-500 text-white";
      case "error":
        return "bg-gradient-to-r from-red-500 to-pink-500 text-white";
      default:
        return buttonStyle;
    }
  };

  const getCardFeatures = () => {
    if (type === "apk") {
      return [
        { icon: Shield, text: "Archivo seguro", color: "text-yellow" },
        { icon: Zap, text: "Instalación rápida", color: "text-orange" },
      ];
    }
    return [
      { icon: FileText, text: "Documentación incluida", color: "text-dark" },
      { icon: FolderOpen, text: "Archivos organizados", color: "text-dark" },
    ];
  };

  const defaultIcon = type === "apk" ? <Smartphone className="h-6 w-6 text-dark" /> : <FolderOpen className="h-6 w-6 text-dark" />;

  return (
    <div className="card hover-lift animate-slideInRight">
      {/* Header */}
      <div className={`bg-gradient-to-r ${headerGradient} px-6 py-6 relative overflow-hidden`}>
        <div className="absolute inset-0 bg-dark/10"></div>
        <div className="relative flex items-center justify-between text-dark">
          <div className="flex items-center">
            <div className="p-3 bg-white/30 rounded-2xl mr-4 backdrop-blur-sm border border-white/20">
              {icon || defaultIcon}
            </div>
            <div>
              <h3 className="text-xl font-bold">{title}</h3>
              <div className="flex items-center mt-2 space-x-4">
                <div className="flex items-center">
                  <HardDrive className="h-3 w-3 mr-1 opacity-90" />
                  <span className="text-xs opacity-90 font-medium">
                    {formatFileSize(fileSize)}
                  </span>
                </div>
                <div className="w-1 h-1 bg-dark/50 rounded-full"></div>
                <span className="text-xs opacity-80 uppercase tracking-wide font-medium bg-dark/20 px-2 py-1 rounded-full">
                  {type.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 bg-cream/20">
        {/* Description */}
        <div className="mb-6">
          <div className="flex items-start">
            <FileText className="h-4 w-4 text-dark/60 mr-3 mt-1 flex-shrink-0" />
            <p className="text-dark/80 text-sm leading-relaxed font-medium">{description}</p>
          </div>
        </div>

        {/* Features */}
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-3">
            {getCardFeatures().map((feature, index) => (
              <div key={index} className="flex items-center text-xs font-medium">
                <feature.icon className={`h-3 w-3 mr-2 ${feature.color}`} />
                <span className="text-dark/70">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar for downloading */}
        {status === "downloading" && (
          <div className="mb-6">
            <div className="bg-yellow/30 rounded-full h-2 overflow-hidden">
              <div className="bg-gradient-to-r from-yellow to-orange h-full rounded-full animate-pulse-slow"></div>
            </div>
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-dark/60 font-medium">
                Preparando descarga...
              </p>
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-yellow rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-orange rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1 h-1 bg-dark rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Success message */}
        {status === "completed" && (
          <div className="mb-6 p-4 bg-green-100 border-l-4 border-green-600 rounded-r-lg">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-700 mr-3" />
              <div>
                <p className="text-green-800 text-sm font-semibold">
                  Descarga completada
                </p>
                <p className="text-green-700 text-xs mt-1">
                  El archivo se ha descargado correctamente
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {status === "error" && (
          <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-600 rounded-r-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-700 mr-3" />
              <div>
                <p className="text-red-800 text-sm font-semibold">
                  Error en la descarga
                </p>
                <p className="text-red-700 text-xs mt-1">
                  No se pudo descargar el archivo. Intenta nuevamente.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Download Button */}
        <button
          onClick={onDownload}
          disabled={status === "downloading"}
          className={`w-full ${getButtonClass()} flex items-center justify-center space-x-3 py-4 text-base font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:transform-none disabled:opacity-50`}
        >
          {getButtonContent()}
        </button>

        {/* Additional info */}
        {status === null && (
          <div className="mt-4 pt-4 border-t border-yellow/30">
            <div className="flex justify-between items-center text-xs text-dark/50 font-medium">
              <span>Descarga directa</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadCard;