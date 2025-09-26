"use client";
import React, { useEffect, useState } from "react";
import { Smartphone, Shield, Download, Zap } from "lucide-react";

const Loading: React.FC = () => {
  const [loadingText, setLoadingText] = useState("Iniciando aplicación");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const messages = [
      "Iniciando aplicación...",
      "Verificando conexión...",
      "Cargando componentes...",
      "Preparando interfaz...",
      "Casi listo..."
    ];

    let messageIndex = 0;
    let progressValue = 0;

    const interval = setInterval(() => {
      // Update progress
      progressValue += Math.random() * 30;
      if (progressValue > 95) progressValue = 95;
      setProgress(progressValue);

      // Update loading message
      if (messageIndex < messages.length - 1) {
        messageIndex++;
        setLoadingText(messages[messageIndex]);
      }
    }, 800);

    // Complete loading after a reasonable time
    const completeTimer = setTimeout(() => {
      setProgress(100);
      setLoadingText("¡Listo!");
    }, 4000);

    return () => {
      clearInterval(interval);
      clearTimeout(completeTimer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream to-yellow/20 flex items-center justify-center p-6">
      <div className="text-center max-w-md w-full mx-auto space-y-8">
        {/* Animated logo container */}
        <div className="relative mb-12">
          {/* Main logo */}
          <div className="relative w-28 h-28 bg-dark/10 rounded-3xl flex items-center justify-center mx-auto backdrop-blur-sm border-2 border-yellow/40 shadow-lg">
            <Smartphone className="h-14 w-14 text-dark animate-pulse-slow" />
            
            {/* Floating icons */}
            <div className="absolute -top-3 -right-3 w-10 h-10 bg-yellow rounded-full flex items-center justify-center animate-bounce shadow-md">
              <Shield className="h-5 w-5 text-dark" />
            </div>
            <div className="absolute -bottom-3 -left-3 w-10 h-10 bg-orange rounded-full flex items-center justify-center animate-bounce shadow-md" style={{ animationDelay: '0.5s' }}>
              <Download className="h-5 w-5 text-white" />
            </div>
            <div className="absolute top-2 right-2 w-8 h-8 bg-dark rounded-full flex items-center justify-center animate-bounce shadow-md" style={{ animationDelay: '1s' }}>
              <Zap className="h-4 w-4 text-cream" />
            </div>
          </div>
          
          {/* Animated rings */}
          <div className="absolute inset-0 flex items-center justify-center -z-10">
            <div className="w-36 h-36 border-2 border-yellow/30 rounded-full animate-spin"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center -z-10">
            <div 
              className="w-44 h-44 border-2 border-orange/20 rounded-full animate-spin" 
              style={{ 
                animationDirection: 'reverse', 
                animationDuration: '4s' 
              }}
            ></div>
          </div>
        </div>

        {/* Title Section */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-dark drop-shadow-sm">
            Sistema de Distribución
          </h1>
          <p className="text-dark/70 text-base font-medium">
            Cargando aplicación segura
          </p>
        </div>

        {/* Loading Progress Section */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-8 border-2 border-yellow/30 shadow-xl space-y-6">
          <div className="flex items-center justify-center space-x-4">
            <div className="spinner border-dark"></div>
            <span className="text-xl font-semibold text-dark">{loadingText}</span>
          </div>
          
          {/* Progress bar */}
          <div className="space-y-3">
            <div className="w-full bg-yellow/30 rounded-full h-3 overflow-hidden shadow-inner">
              <div 
                className="bg-gradient-to-r from-yellow to-orange h-full rounded-full transition-all duration-700 ease-out shadow-md"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-dark/60 text-sm font-medium">Progreso</span>
              <span className="text-dark font-bold text-lg">{Math.round(progress)}%</span>
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-3 gap-5 text-center">
          <div className="bg-yellow/30 backdrop-blur-sm rounded-xl p-4 border-2 border-yellow/40 shadow-md">
            <Shield className="h-8 w-8 text-dark mx-auto mb-3" />
            <span className="text-sm font-semibold text-dark">Seguro</span>
          </div>
          <div className="bg-orange/30 backdrop-blur-sm rounded-xl p-4 border-2 border-orange/40 shadow-md">
            <Zap className="h-8 w-8 text-dark mx-auto mb-3" />
            <span className="text-sm font-semibold text-dark">Rápido</span>
          </div>
          <div className="bg-dark/20 backdrop-blur-sm rounded-xl p-4 border-2 border-dark/30 shadow-md">
            <Download className="h-8 w-8 text-white mx-auto mb-3" />
            <span className="text-sm font-semibold text-white">Fácil</span>
          </div>
        </div>

        {/* Loading dots */}
        <div className="flex justify-center space-x-3 mt-6">
          <div className="w-3 h-3 bg-yellow rounded-full animate-bounce shadow-sm"></div>
          <div className="w-3 h-3 bg-orange rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-3 h-3 bg-dark rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.4s' }}></div>
        </div>

        {/* Version info */}
        <div className="mt-8 text-center">
          <p className="text-dark/50 text-sm font-medium">
            Versión 2.0 • Sistema de distribución segura
          </p>
        </div>
      </div>
    </div>
  );
};

export default Loading;